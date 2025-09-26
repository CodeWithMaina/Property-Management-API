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

    // Admins have full access
    if (userSession.role === 'admin' || userSession.role === 'superAdmin') {
      return next();
    }

    // Check if user has access to the organization
    const userOrg = userSession.organizations.find(
      org => org.organizationId === organizationId
    );

    if (!userOrg) {
      return res.status(403).json(
        createErrorResponse("No access to this organization", "AUTHORIZATION_ERROR")
      );
    }

    // Check role requirement if specified
    if (requiredRole && userOrg.role !== requiredRole) {
      return res.status(403).json(
        createErrorResponse(`Required role: ${requiredRole}`, "AUTHORIZATION_ERROR")
      );
    }

    next();
  };
};