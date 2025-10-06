// organization.middleware.ts
import { Request, Response, NextFunction } from "express";
import { createErrorResponse } from "../utils/apiResponse/apiResponse.helper";
import { TEnhancedUserSession } from "../middleware/authorization/authorization.types";

export const requireOrganizationAccess = (requiredRole?: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const organizationId = req.params.id;
    const userSession = (req as any).user as TEnhancedUserSession;
    
    if (!userSession) {
      return res.status(401).json(
        createErrorResponse("Authentication required", "AUTHENTICATION_ERROR")
      );
    }

    console.log("Organization Middleware - Checking access:", {
      userId: userSession.userId,
      organizationId: organizationId,
      userRole: userSession.role,
      requiredRole: requiredRole,
      userOrganizations: userSession.organizations.map(org => ({
        organizationId: org.organizationId,
        role: org.role
      }))
    });

    // Admins have full access
    if (userSession.role === 'admin' || userSession.role === 'superAdmin') {
      console.log("Organization Middleware - Admin access granted");
      return next();
    }

    // Check if user has access to the organization
    const userOrg = userSession.organizations.find(
      org => org.organizationId === organizationId
    );

    if (!userOrg) {
      console.warn("Organization Middleware - No access to organization:", {
        userId: userSession.userId,
        organizationId: organizationId
      });
      return res.status(403).json(
        createErrorResponse("No access to this organization", "AUTHORIZATION_ERROR")
      );
    }

    // Check role requirement if specified
    if (requiredRole && userOrg.role !== requiredRole) {
      console.warn("Organization Middleware - Insufficient role:", {
        userId: userSession.userId,
        userRole: userOrg.role,
        requiredRole: requiredRole
      });
      return res.status(403).json(
        createErrorResponse(`Required role: ${requiredRole}`, "AUTHORIZATION_ERROR")
      );
    }

    console.log("Organization Middleware - Access granted");
    next();
  };
};