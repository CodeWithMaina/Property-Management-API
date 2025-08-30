// organization.controller.ts
import { Request, Response } from "express";
import {
  getOrganizationsServices,
  getOrganizationByIdServices,
  createOrganizationServices,
  updateOrganizationServices,
  deleteOrganizationServices,
  getOrganizationUsersServices,
  addUserToOrganizationServices,
  updateUserRoleServices,
  setPrimaryOrganizationServices,
  removeUserFromOrganizationServices,
} from "./organization.service";
import {
  OrganizationSchema,
  PartialOrganizationSchema,
  UserOrganizationSchema,
  RoleUpdateSchema,
  PrimaryOrganizationSchema,
  OrganizationQuerySchema,
} from "./organization.validator";
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError,
} from "../utils/errorHandler";
import {
  createPaginatedResponse,
  createSuccessResponse,
  createOrganizationsResponse,
  createOrganizationResponse,
} from "../utils/apiResponse/apiResponse.helper";
import db from "../drizzle/db";
import { eq } from "drizzle-orm";
import { userOrganizations } from "../drizzle/schema";

/**
 * Get all organizations with optional filtering
 */
export const getOrganizations = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate query parameters
    const queryParams = OrganizationQuerySchema.parse(req.query);
    
    // Get current user ID from auth middleware
    const currentUserId = (req as any).user?.id;
    
    // If user is not admin, only return their organizations
    const isAdmin = (req as any).user?.role === 'admin' || (req as any).user?.role === 'superAdmin';
    
    const result = await getOrganizationsServices(
      queryParams, 
      isAdmin ? undefined : currentUserId
    );

    // Create pagination object
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

/**
 * Get specific organization details
 */
export const getOrganizationById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id;

    if (!organizationId) {
      throw new ValidationError("Organization ID is required");
    }

    const organization = await getOrganizationByIdServices(organizationId);

    if (!organization) {
      throw new NotFoundError("Organization");
    }

    // Authorization check - user must be a member of the organization
    // const currentUserId = (req as any).user?.id;
    // const users = await getOrganizationUsersServices(organizationId);
    // const isMember = users.some((user: { id: string }) => user.id === currentUserId);
    // const isAdmin = (req as any).user?.role === 'admin' || (req as any).user?.role === 'superAdmin';

    // if (!isMember && !isAdmin) {
    //   throw new AuthorizationError("You don't have access to this organization");
    // }

    const response = createOrganizationResponse(
      organization,
      "Organization retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * Create a new organization
 */
export const createOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const validatedData = OrganizationSchema.parse(req.body);

    const newOrganization = await createOrganizationServices(validatedData);

    const response = createSuccessResponse(
      newOrganization,
      "Organization created successfully"
    );

    res.status(201).json(response);
  }
);

/**
 * Update organization information
 */
export const updateOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id;

    if (!organizationId) {
      throw new ValidationError("Organization ID is required");
    }

    // Authorization check - only admin or organization owner can update
    // const currentUserRole = (req as any).user?.role;
    // if (currentUserRole !== 'admin' && currentUserRole !== 'superAdmin') {
    //   throw new AuthorizationError("Only administrators can update organizations");
    // }

    // Validate request body
    const validatedData = PartialOrganizationSchema.parse(req.body);

    const updatedOrganization = await updateOrganizationServices(
      organizationId,
      validatedData
    );

    if (!updatedOrganization) {
      throw new NotFoundError("Organization");
    }

    const response = createSuccessResponse(
      updatedOrganization,
      "Organization updated successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * Delete an organization (soft delete)
 */
export const deleteOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id;

    if (!organizationId) {
      throw new ValidationError("Organization ID is required");
    }

    // Authorization check - only admin can delete
    // const currentUserRole = (req as any).user?.role;
    // if (currentUserRole !== 'admin' && currentUserRole !== 'superAdmin') {
    //   throw new AuthorizationError("Only administrators can delete organizations");
    // }

    const deletedOrganization = await deleteOrganizationServices(organizationId);

    if (!deletedOrganization) {
      throw new NotFoundError("Organization");
    }

    const response = createSuccessResponse(
      deletedOrganization,
      "Organization deleted successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * List users in an organization
 */
export const getOrganizationUsers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id;

    if (!organizationId) {
      throw new ValidationError("Organization ID is required");
    }

    // Authorization check - user must be a member of the organization
    // const organization = await getOrganizationByIdServices(organizationId);
    // if (!organization) {
    //   throw new NotFoundError("Organization");
    // }

    const currentUserId = (req as any).user?.id;
    const users = await getOrganizationUsersServices(organizationId);
    const isMember = users.some((user: { id: string }) => user.id === currentUserId);
    const isAdmin = (req as any).user?.role === 'admin' || (req as any).user?.role === 'superAdmin';

    if (!isMember && !isAdmin) {
      throw new AuthorizationError("You don't have access to this organization");
    }

    const response = createSuccessResponse(
      users,
      "Organization users retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * Add a user to an organization
 */
export const addUserToOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id;

    if (!organizationId) {
      throw new ValidationError("Organization ID is required");
    }

    // Authorization check - only admin can add users to organizations
    // const currentUserRole = (req as any).user?.role;
    // if (currentUserRole !== 'admin' && currentUserRole !== 'superAdmin') {
    //   throw new AuthorizationError("Only administrators can add users to organizations");
    // }

    // Validate request body
    const validatedData = UserOrganizationSchema.parse({
      ...req.body,
      organizationId,
    });

    try {
      const assignment = await addUserToOrganizationServices(validatedData);

      const response = createSuccessResponse(
        assignment,
        "User added to organization successfully"
      );

      res.status(201).json(response);
    } catch (error: any) {
      if (
        error.message === "User not found" ||
        error.message === "Organization not found"
      ) {
        throw new NotFoundError(error.message);
      }

      if (error.message === "User is already a member of this organization") {
        throw new ConflictError(error.message);
      }

      throw error;
    }
  }
);

/**
 * Change a user's role within a specific organization
 */
export const updateUserRole = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userOrganizationId = req.params.id;

    if (!userOrganizationId) {
      throw new ValidationError("User organization ID is required");
    }

    // Authorization check - only admin can change roles
    // const currentUserRole = (req as any).user?.role;
    // if (currentUserRole !== 'admin' && currentUserRole !== 'superAdmin') {
    //   throw new AuthorizationError("Only administrators can change user roles");
    // }

    // Validate request body
    const validatedData = RoleUpdateSchema.parse(req.body);

    try {
      const updatedMembership = await updateUserRoleServices(
        userOrganizationId,
        validatedData
      );

      const response = createSuccessResponse(
        updatedMembership,
        "User role updated successfully"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error.message === "User organization membership not found") {
        throw new NotFoundError(error.message);
      }

      throw error;
    }
  }
);

/**
 * Set a user's primary organization
 */
export const setPrimaryOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userOrganizationId = req.params.id;

    if (!userOrganizationId) {
      throw new ValidationError("User organization ID is required");
    }

    // Authorization check - user can only set their own primary organization
    const currentUserId = (req as any).user?.id;
    
    // Get the user organization to check ownership
    const userOrg = await db.query.userOrganizations.findFirst({
      where: eq(userOrganizations.id, userOrganizationId),
      with: {
        user: {
          columns: { id: true }
        }
      }
    });

    if (!userOrg) {
      throw new NotFoundError("User organization membership not found");
    }

    if (userOrg.user.id !== currentUserId) {
      throw new AuthorizationError("You can only set your own primary organization");
    }

    // Validate request body
    const validatedData = PrimaryOrganizationSchema.parse(req.body);

    try {
      const updatedMembership = await setPrimaryOrganizationServices(
        userOrganizationId,
        validatedData
      );

      const response = createSuccessResponse(
        updatedMembership,
        "Primary organization updated successfully"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error.message === "User organization membership not found") {
        throw new NotFoundError(error.message);
      }

      throw error;
    }
  }
);

/**
 * Remove a user from an organization
 */
export const removeUserFromOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userOrganizationId = req.params.id;

    if (!userOrganizationId) {
      throw new ValidationError("User organization ID is required");
    }

    // Authorization check - only admin can remove users from organizations
    // const currentUserRole = (req as any).user?.role;
    // if (currentUserRole !== 'admin' && currentUserRole !== 'superAdmin') {
    //   throw new AuthorizationError("Only administrators can remove users from organizations");
    // }

    try {
      const result = await removeUserFromOrganizationServices(userOrganizationId);

      const response = createSuccessResponse(
        result,
        "User removed from organization successfully"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error.message === "User organization membership not found") {
        throw new NotFoundError(error.message);
      }

      throw error;
    }
  }
);