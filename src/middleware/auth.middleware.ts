// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import db from "../drizzle/db";
import { users, userOrganizations, propertyManagers } from "../drizzle/schema";
import { createErrorResponse } from "../utils/apiResponse/apiResponse.helper";
import { TEnhancedUserSession } from "./authorization/authorization.types";

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : req.query.token as string;

  if (!token) {
    return res.status(401).json(
      createErrorResponse("Access token required", "AUTHENTICATION_ERROR")
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    
    // Validate JWT structure
    if (!decoded.userId || !decoded.email || !decoded.role) {
      return res.status(401).json(
        createErrorResponse("Invalid token structure", "AUTHENTICATION_ERROR")
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
      with: {
        userOrganizations: {
          with: {
            organization: true,
          },
        },
        propertyManagers: {
          with: {
            property: {
              with: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json(
        createErrorResponse("User not found or deactivated", "AUTHENTICATION_ERROR")
      );
    }

    // Find primary organization
    const primaryOrg = user.userOrganizations.find(org => org.isPrimary) || user.userOrganizations[0];
    
    // Fix: Create properly structured enhanced session
    const enhancedSession: TEnhancedUserSession = {
      // JWT payload
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp,
      
      // Enhanced user data
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || null,
        isActive: user.isActive,
        avatarUrl: user.avatarUrl || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      organizations: user.userOrganizations.map(org => ({
        id: org.id,
        organizationId: org.organizationId,
        organizationName: org.organization.name,
        role: org.role,
        isPrimary: org.isPrimary,
        permissions: org.permissions || {},
      })),
      managedProperties: user.propertyManagers.map(pm => ({
        id: pm.id,
        propertyId: pm.propertyId,
        propertyName: pm.property.name,
        organizationId: pm.property.organizationId,
        role: pm.role,
        permissions: pm.permissions || {},
      })),
      primaryOrganization: primaryOrg ? {
        id: primaryOrg.id,
        organizationId: primaryOrg.organizationId,
        organizationName: primaryOrg.organization.name,
        role: primaryOrg.role,
      } : undefined,
    };

    (req as any).user = enhancedSession;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json(
        createErrorResponse("Invalid token", "AUTHENTICATION_ERROR")
      );
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(403).json(
        createErrorResponse("Token expired", "AUTHENTICATION_ERROR")
      );
    }

    console.error("Authentication error:", error);
    return res.status(500).json(
      createErrorResponse("Authentication failed", "AUTHENTICATION_ERROR")
    );
  };
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : req.query.token as string;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      
      if (!decoded.userId) {
        return next();
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.userId),
        with: {
          userOrganizations: {
            with: {
              organization: true,
            },
          },
          propertyManagers: {
            with: {
              property: {
                with: {
                  organization: true,
                },
              },
            },
          },
        },
      });

      if (user && user.isActive) {
        const primaryOrg = user.userOrganizations.find(org => org.isPrimary) || user.userOrganizations[0];
        
        const enhancedSession: TEnhancedUserSession = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          iat: decoded.iat,
          exp: decoded.exp,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone || null,
            isActive: user.isActive,
            avatarUrl: user.avatarUrl || null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          organizations: user.userOrganizations.map(org => ({
            id: org.id,
            organizationId: org.organizationId,
            organizationName: org.organization.name,
            role: org.role,
            isPrimary: org.isPrimary,
            permissions: org.permissions || {},
          })),
          managedProperties: user.propertyManagers.map(pm => ({
            id: pm.id,
            propertyId: pm.propertyId,
            propertyName: pm.property.name,
            organizationId: pm.property.organizationId,
            role: pm.role,
            permissions: pm.permissions || {},
          })),
          primaryOrganization: primaryOrg ? {
            id: primaryOrg.id,
            organizationId: primaryOrg.organizationId,
            organizationName: primaryOrg.organization.name,
            role: primaryOrg.role,
          } : undefined,
        };

        (req as any).user = enhancedSession;
      }
    } catch (error) {
      // Silently fail for optional auth
      console.debug("Optional authentication failed:", error);
    }
  }
  
  next();
};

export const requireRole = (roles: string | string[]) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    const userSession = (req as any).user as TEnhancedUserSession;
    
    if (!userSession) {
      return res.status(401).json(
        createErrorResponse("Authentication required", "AUTHENTICATION_ERROR")
      );
    }

    const hasRequiredRole = userSession.organizations.some(org =>
      roleArray.includes(org.role)
    );

    const hasPropertyRole = userSession.managedProperties.some(property =>
      roleArray.includes(property.role)
    );

    if (!hasRequiredRole && !hasPropertyRole) {
      return res.status(403).json(
        createErrorResponse("Insufficient permissions", "AUTHORIZATION_ERROR")
      );
    }

    next();
  };
};