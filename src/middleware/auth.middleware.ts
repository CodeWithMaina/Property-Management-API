// middleware/auth.middleware.ts
import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
import db from "../drizzle/db";
import { organizations, organizationSettings } from "../drizzle/schema";
import {
  getUserByIdService,
  verifyRefreshTokenService,
} from "../auth/auth.service";
import { TUserWithAuth, TAuthRequest, TJWTPayload } from "../auth/auth.types";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TUserWithAuth;
      orgId?: string;
      permissions?: Record<string, boolean | number | string>;
      deviceId?: string;
    }
  }
}

// Error classes for better error handling
export class AuthenticationError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = "Insufficient permissions") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class TokenExpiredError extends Error {
  constructor(message: string = "Token expired") {
    super(message);
    this.name = "TokenExpiredError";
  }
}

/**
 * 🎯 Type definitions for permissions
 */
export type TPermissionKey = 
  | 'canManageProperties'
  | 'canCreateProperties'
  | 'canDeleteProperties'
  | 'maxProperties'
  | 'canManageUnits'
  | 'canCreateUnits'
  | 'canDeleteUnits'
  | 'maxUnits'
  | 'canManageTenants'
  | 'canCreateTenants'
  | 'canDeleteTenants'
  | 'maxTenants'
  | 'canManageLeases'
  | 'canCreateLeases'
  | 'canDeleteLeases'
  | 'maxLeases'
  | 'canManageMaintenance'
  | 'canCreateMaintenance'
  | 'canDeleteMaintenance'
  | 'maxMaintenance'
  | 'canManageFinances'
  | 'canViewFinancialReports'
  | 'canProcessPayments'
  | 'canManageRentCollection'
  | 'canManageUsers'
  | 'canInviteUsers'
  | 'canRemoveUsers'
  | 'canChangeUserRoles'
  | 'maxUsers'
  | 'canManageOrganizationSettings';

export type TPermissions = Partial<Record<TPermissionKey, boolean | number | string>>;

/**
 * 🎯 Type guard to check if a string is a valid permission key
 */
const isValidPermission = (permission: string): permission is TPermissionKey => {
  // Create a runtime array from the type for better maintainability
  const permissionKeys: TPermissionKey[] = [
    'canManageProperties', 'canCreateProperties', 'canDeleteProperties', 'maxProperties',
    'canManageUnits', 'canCreateUnits', 'canDeleteUnits', 'maxUnits',
    'canManageTenants', 'canCreateTenants', 'canDeleteTenants', 'maxTenants',
    'canManageLeases', 'canCreateLeases', 'canDeleteLeases', 'maxLeases',
    'canManageMaintenance', 'canCreateMaintenance', 'canDeleteMaintenance', 'maxMaintenance',
    'canManageFinances', 'canViewFinancialReports', 'canProcessPayments', 'canManageRentCollection',
    'canManageUsers', 'canInviteUsers', 'canRemoveUsers', 'canChangeUserRoles', 'maxUsers',
    'canManageOrganizationSettings'
  ];
  return permissionKeys.includes(permission as TPermissionKey);
};

/**
 * 🎯 Helper function to safely check permissions
 */
const hasPermission = (
  permissions: Record<string, boolean | number | string> | null | undefined, 
  permission: TPermissionKey
): boolean => {
  if (!permissions) return false;
  return permissions[permission] === true;
};

/**
 * 🔐 Core Authentication Middleware
 * Validates JWT token and attaches user to request
 */
export const requireAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractTokenFromHeader(req);
    if (!token) {
      throw new AuthenticationError("No token provided");
    }

    // Verify JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET not configured");
    }

    const payload = jwt.verify(token, secret) as TJWTPayload;

    // Check if user exists and is active
    const user = await getUserByIdService(payload.userId);
    if (!user) {
      throw new AuthenticationError("User not found");
    }

    if (!user.isActive) {
      throw new AuthenticationError("Account deactivated");
    }

    // Check email verification if required by organization
    if (user.userAuth && !user.userAuth.isEmailVerified) {
      const orgSettings = await getOrganizationSettings(user);
      if (orgSettings?.mfaRequired) {
        throw new AuthenticationError("Email verification required");
      }
    }

    // Attach user and context to request
    req.user = user;
    req.deviceId = payload.deviceId;

    // Set organization context if provided
    if (payload.orgId) {
      const userOrg = user.userOrganizations?.find(
        (uo) => uo.organizationId === payload.orgId
      );
      if (userOrg) {
        req.orgId = payload.orgId;
        req.permissions = userOrg.permissions || {};
      }
    }

    next();
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    return res.status(401).json({ error: error.message });
  }
};

/**
 * 🛂 Organization Context Middleware
 * Ensures user is acting within a valid organization
 */
export const requireOrgContext: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AuthenticationError("Authentication required");
    }

    const orgId = (req.headers["x-org-id"] as string) || req.orgId;
    if (!orgId) {
      throw new AuthorizationError("Organization context required");
    }

    const userOrg = req.user.userOrganizations?.find(
      (uo) => uo.organizationId === orgId
    );

    if (!userOrg) {
      throw new AuthorizationError("Not a member of this organization");
    }

    // Update request context
    req.orgId = orgId;
    req.permissions = userOrg.permissions || {};

    next();
  } catch (error: any) {
    return res.status(403).json({ error: error.message });
  }
};

/**
 * 👥 Role-Based Access Control Middleware
 */
export const requireRole = (allowedRoles: string[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.orgId) {
        throw new AuthenticationError(
          "Authentication and organization context required"
        );
      }

      const userOrg = req.user.userOrganizations?.find(
        (uo) => uo.organizationId === req.orgId
      );

      if (!userOrg) {
        throw new AuthorizationError("Not a member of this organization");
      }

      // Super admin bypass
      if (userOrg.role === "superAdmin") {
        return next();
      }

      if (!allowedRoles.includes(userOrg.role)) {
        throw new AuthorizationError(
          `Required roles: ${allowedRoles.join(", ")}`
        );
      }

      next();
    } catch (error: any) {
      return res.status(403).json({ error: error.message });
    }
  };
};

/**
 * 🛡 Permission-Based Access Control Middleware
 */
export const requirePermission = (permission: TPermissionKey): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.orgId) {
        throw new AuthenticationError(
          "Authentication and organization context required"
        );
      }

      const userOrg = req.user.userOrganizations?.find(
        (uo) => uo.organizationId === req.orgId
      );

      if (!userOrg) {
        throw new AuthorizationError("Not a member of this organization");
      }

      // Super admin bypass
      if (userOrg.role === "superAdmin") {
        return next();
      }

      // Type-safe permission check - no need for validation since we're using TPermissionKey
      const hasRequiredPermission = (userOrg.permissions as TPermissions)?.[permission] === true;
      if (!hasRequiredPermission) {
        throw new AuthorizationError(`Permission denied: ${permission}`);
      }

      next();
    } catch (error: any) {
      return res.status(403).json({ error: error.message });
    }
  };
};

/**
 * 🛡 Safe Permission-Based Access Control Middleware (Alternative)
 * This version uses the helper function for additional safety
 */
export const requireSafePermission = (permission: TPermissionKey): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.orgId) {
        throw new AuthenticationError(
          "Authentication and organization context required"
        );
      }

      const userOrg = req.user.userOrganizations?.find(
        (uo) => uo.organizationId === req.orgId
      );

      if (!userOrg) {
        throw new AuthorizationError("Not a member of this organization");
      }

      // Super admin bypass
      if (userOrg.role === "superAdmin") {
        return next();
      }

      // Use helper function for type-safe permission check
      if (!hasPermission(userOrg.permissions as TPermissions, permission)) {
        throw new AuthorizationError(`Permission denied: ${permission}`);
      }

      next();
    } catch (error: any) {
      return res.status(403).json({ error: error.message });
    }
  };
};

/**
 * 🔄 Refresh Token Validation Middleware
 */
export const validateRefreshToken: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken, deviceId } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError("Refresh token required");
    }

    const { isValid, userId } = await verifyRefreshTokenService(
      refreshToken,
      deviceId
    );
    if (!isValid || !userId) {
      throw new AuthenticationError("Invalid or expired refresh token");
    }

    const user = await getUserByIdService(userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError("User not found or inactive");
    }

    req.user = user;
    req.deviceId = deviceId;

    next();
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
};

/**
 * 📱 MFA Enforcement Middleware
 */
export const requireMFA: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AuthenticationError("Authentication required");
    }

    const orgSettings = await getOrganizationSettings(req.user);
    const requiresMFA =
      orgSettings?.mfaRequired || req.user.userAuth?.mfaEnabled;

    if (requiresMFA && !req.user.userAuth?.mfaEnabled) {
      throw new AuthenticationError("MFA setup required");
    }

    // In a real implementation, you'd verify MFA token here
    const mfaToken = req.headers["x-mfa-token"] as string;
    if (requiresMFA && !mfaToken) {
      throw new AuthenticationError("MFA token required");
    }

    next();
  } catch (error: any) {
    return res.status(403).json({ error: error.message });
  }
};

/**
 * 🎣 Utility Functions
 */
const extractTokenFromHeader = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [bearer, token] = authHeader.split(" ");
  return bearer === "Bearer" ? token : null;
};

const getOrganizationSettings = async (user: TUserWithAuth) => {
  if (!user.userOrganizations?.length) return null;

  const primaryOrg = user.userOrganizations.find((uo) => uo.isPrimary);
  if (!primaryOrg) return null;

  // Query organization settings directly from the organizationSettings table
  const orgSettings = await db.query.organizationSettings.findFirst({
    where: eq(organizationSettings.organizationId, primaryOrg.organizationId),
  });

  return orgSettings || null;
};

/**
 * 🔧 Composable Middleware Factory
 */
export const createAuthMiddleware = (options: {
  requireAuth?: boolean;
  requireOrg?: boolean;
  roles?: string[];
  permissions?: TPermissionKey[];
  requireMFA?: boolean;
}): RequestHandler[] => {
  const middlewares: RequestHandler[] = [];

  if (options.requireAuth !== false) {
    middlewares.push(requireAuth);
  }

  if (options.requireOrg) {
    middlewares.push(requireOrgContext);
  }

  if (options.requireMFA) {
    middlewares.push(requireMFA);
  }

  if (options.roles?.length) {
    middlewares.push(requireRole(options.roles));
  }

  if (options.permissions?.length) {
    for (const permission of options.permissions) {
      middlewares.push(requirePermission(permission));
    }
  }

  return middlewares;
};

// Export the permission types for use in other files
export { TPermissionKey as PermissionKey, TPermissions as Permissions };