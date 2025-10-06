// organization.controller.ts
import { Request, Response } from "express";
import {
  getOrganizationsServices,
  getOrganizationByIdServices,
  createOrganizationServices,
  updateOrganizationServices,
  deleteOrganizationServices,
} from "./organization.service";
import {
  OrganizationSchema,
  PartialOrganizationSchema,
  OrganizationQuerySchema,
} from "./organization.validator";
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "../utils/errorHandler";
import {
  createSuccessResponse,
  createPaginatedResponse,
} from "../utils/apiResponse/apiResponse.helper";
import { TEnhancedUserSession } from "../middleware/authorization/authorization.types";

// Helper function to get user session with proper typing
const getUserSession = (req: Request): TEnhancedUserSession => {
  const userSession = (req as any).user as TEnhancedUserSession;
  if (!userSession) {
    throw new AuthorizationError("Authentication required");
  }
  return userSession;
};

// Helper to check if user has organization access
const hasOrganizationAccess = (userSession: TEnhancedUserSession, organizationId: string): boolean => {
  // Admins have access to all organizations
  if (userSession.role === 'admin' || userSession.role === 'superAdmin') {
    return true;
  }
  
  // Check if user is a member of the organization
  return userSession.organizations.some(org => 
    org.organizationId === organizationId
  );
};

// Helper to check if user has admin role
const isAdmin = (userSession: TEnhancedUserSession): boolean => {
  return userSession.role === 'admin' || userSession.role === 'superAdmin';
};

export const getOrganizations = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const queryParams = OrganizationQuerySchema.parse(req.query);
    const userSession = getUserSession(req);
    
    console.log("Get Organizations - User session:", {
      userId: userSession.userId,
      role: userSession.role,
      organizations: userSession.organizations.map(org => ({
        id: org.organizationId,
        role: org.role
      }))
    });
    
    // For non-admin users, only show organizations they belong to
    const userId = isAdmin(userSession) ? undefined : userSession.userId;
    
    const result = await getOrganizationsServices(queryParams, userId);

    const pagination = {
      total: result.total,
      count: result.organizations.length,
      perPage: queryParams.limit,
      currentPage: queryParams.page,
      totalPages: Math.ceil(result.total / queryParams.limit),
      links: {
        first: null,
        last: null,
        prev: null,
        next: null,
      },
    };

    const response = createPaginatedResponse(
      result.organizations,
      pagination,
      "Organizations retrieved successfully"
    );

    res.status(200).json(response);
  }
);

export const getOrganizationById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id;

    if (!organizationId) {
      throw new ValidationError("Organization ID is required");
    }

    const userSession = getUserSession(req);
    
    console.log("Get Organization By ID - User session:", {
      userId: userSession.userId,
      role: userSession.role,
      organizationId: organizationId,
      userOrganizations: userSession.organizations.map(org => org.organizationId)
    });
    
    // Check if user has access to this organization
    if (!hasOrganizationAccess(userSession, organizationId)) {
      console.warn("Access denied - User does not have access to organization:", {
        userId: userSession.userId,
        organizationId: organizationId
      });
      throw new AuthorizationError("You don't have access to this organization");
    }

    const organization = await getOrganizationByIdServices(organizationId);

    if (!organization) {
      throw new NotFoundError("Organization not found");
    }

    const response = createSuccessResponse(
      organization,
      "Organization retrieved successfully"
    );

    res.status(200).json(response);
  }
);

export const createOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userSession = getUserSession(req);
    
    // Check if current user has permission to create organizations
    if (!isAdmin(userSession)) {
      throw new AuthorizationError("Only admins can create organizations");
    }

    const validatedData = OrganizationSchema.parse(req.body);
    const newOrganization = await createOrganizationServices(validatedData);

    const response = createSuccessResponse(
      newOrganization,
      "Organization created successfully"
    );

    res.status(201).json(response);
  }
);

export const updateOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id;

    if (!organizationId) {
      throw new ValidationError("Organization ID is required");
    }

    const userSession = getUserSession(req);
    
    // Check if user has permission to update this organization
    if (!isAdmin(userSession)) {
      // For non-admins, check if they have manager role in this organization
      const userOrg = userSession.organizations.find(org => 
        org.organizationId === organizationId && 
        (org.role === 'admin' || org.role === 'manager' || org.role === 'propertyOwner')
      );
      
      if (!userOrg) {
        throw new AuthorizationError("You don't have permission to update this organization");
      }
    }

    const validatedData = PartialOrganizationSchema.parse(req.body);
    const updatedOrganization = await updateOrganizationServices(
      organizationId,
      validatedData
    );

    if (!updatedOrganization) {
      throw new NotFoundError("Organization not found");
    }

    const response = createSuccessResponse(
      updatedOrganization,
      "Organization updated successfully"
    );

    res.status(200).json(response);
  }
);

export const deleteOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id;

    if (!organizationId) {
      throw new ValidationError("Organization ID is required");
    }

    const userSession = getUserSession(req);
    
    // Check if current user has permission to delete organizations
    if (!isAdmin(userSession)) {
      throw new AuthorizationError("Only admins can delete organizations");
    }

    const deletedOrganization = await deleteOrganizationServices(organizationId);

    if (!deletedOrganization) {
      throw new NotFoundError("Organization not found");
    }

    const response = createSuccessResponse(
      deletedOrganization,
      "Organization deleted successfully"
    );

    res.status(200).json(response);
  }
);