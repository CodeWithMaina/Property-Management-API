// middleware/auth/AdvancedAuthMiddleware.ts
import { Request, Response, NextFunction, RequestHandler } from "express";
import { TokenService } from "../auth/TokenService";
import { UserRole } from "../drizzle/schema";
import db from "../drizzle/db";
import { users, userAuth, userOrganizations } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { UserContext } from "../auth/auth.types";

export interface AuthOptions {
  requireEmailVerification?: boolean;
  requireMFA?: boolean;
  allowedDevices?: string[];
  requireActiveUser?: boolean;
}

export class AdvancedAuthMiddleware {
  private static tokenService: TokenService = new TokenService();

  static requireAuth(options: AuthOptions = {}): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).json({
            success: false,
            error: {
              code: "AUTHENTICATION_REQUIRED",
              message: "Authentication token is required",
            },
          });
        }

        const token = authHeader.substring(7);

        try {
          // Verify token signature and expiration
          const payload = this.tokenService.verifyAccessToken(token);

          // Verify user exists and is active in database
          const user = await db.query.users.findFirst({
            where: eq(users.id, payload.userId),
            with: {
              userAuth: true,
              userOrganizations: {
                with: {
                  organization: true,
                },
              },
            },
          });

          if (!user) {
            return res.status(401).json({
              success: false,
              error: {
                code: "USER_NOT_FOUND",
                message: "User account not found",
              },
            });
          }

          // Check if user is active
          if (options.requireActiveUser !== false && !user.isActive) {
            return res.status(403).json({
              success: false,
              error: {
                code: "ACCOUNT_DEACTIVATED",
                message: "User account is deactivated",
              },
            });
          }

          // Check email verification if required
          if (options.requireEmailVerification) {
            const userAuthRecord = user.userAuth?.[0];
            if (!userAuthRecord?.isEmailVerified) {
              return res.status(403).json({
                success: false,
                error: {
                  code: "EMAIL_NOT_VERIFIED",
                  message: "Email verification required",
                },
              });
            }
          }

          // Get user roles and permissions from all organizations
          const userOrgs = user.userOrganizations || [];
          const primaryOrg = userOrgs.find((org) => org.isPrimary);

          const userContext: UserContext = {
            userId: user.id,
            email: user.email,
            roles: userOrgs.map((org) => org.role),
            permissions: primaryOrg?.permissions || {},
            organizationId: primaryOrg?.organizationId,
            deviceId: payload.deviceId,
          };

          (req as any).user = userContext;
          next();
        } catch (tokenError) {
          console.error("Token verification error:", tokenError);
          return res.status(401).json({
            success: false,
            error: {
              code: "INVALID_TOKEN",
              message: "Invalid or expired authentication token",
            },
          });
        }
      } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(500).json({
          success: false,
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "Authentication failed",
          },
        });
      }
    };
  }

  static requireRole(roles: UserRole | UserRole[]): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const userContext = (req as any).user as UserContext;

      if (!userContext) {
        return res.status(401).json({
          success: false,
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Authentication required",
          },
        });
      }

      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      const hasRequiredRole = requiredRoles.some((role) =>
        userContext.roles.includes(role)
      );

      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: `Required role: ${requiredRoles.join(", ")}`,
          },
        });
      }

      next();
    };
  }

  static requirePermission(permission: string | string[]): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const userContext = (req as any).user as UserContext;

      if (!userContext) {
        return res.status(401).json({
          success: false,
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Authentication required",
          },
        });
      }

      const requiredPermissions = Array.isArray(permission)
        ? permission
        : [permission];
      const hasPermission = requiredPermissions.every((perm) => {
        const permValue = userContext.permissions?.[perm];
        // For boolean permissions, check if true
        // For numeric permissions, check if > 0 or specific logic
        return (
          permValue === true || (typeof permValue === "number" && permValue > 0)
        );
      });

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: `Required permission: ${requiredPermissions.join(", ")}`,
          },
        });
      }

      next();
    };
  }

  static requireOrganization(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const userContext = (req as any).user as UserContext;

      if (!userContext) {
        return res.status(401).json({
          success: false,
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Authentication required",
          },
        });
      }

      if (!userContext.organizationId) {
        return res.status(403).json({
          success: false,
          error: {
            code: "ORGANIZATION_REQUIRED",
            message: "Organization context is required to access this resource",
          },
        });
      }

      next();
    };
  }

  static requireEmailVerified(): RequestHandler {
    return AdvancedAuthMiddleware.requireAuth({
      requireEmailVerification: true,
      requireActiveUser: true,
    });
  }

  static scopeToOrganization(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const userContext = (req as any).user as UserContext;

      if (userContext?.organizationId) {
        // Add organization scope to request for database queries
        (req as any).organizationScope = userContext.organizationId;
      }

      next();
    };
  }

  // New: Check if user has higher role than target
  static requireHigherRole(targetRole: UserRole): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const userContext = (req as any).user as UserContext;

      if (!userContext) {
        return res.status(401).json({
          success: false,
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Authentication required",
          },
        });
      }

      const ROLE_HIERARCHY: Record<UserRole, number> = {
        superAdmin: 100,
        admin: 90,
        propertyOwner: 80,
        manager: 70,
        caretaker: 60,
        tenant: 50,
      };

      const userHighestRole = Math.max(
        ...userContext.roles.map((role) => ROLE_HIERARCHY[role])
      );
      const targetRoleLevel = ROLE_HIERARCHY[targetRole];

      if (userHighestRole <= targetRoleLevel) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: `Higher role required to modify ${targetRole} users`,
          },
        });
      }

      next();
    };
  }
}
