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
import db from "../drizzle/db";
import { eq } from "drizzle-orm";
import { userOrganizations } from "../drizzle/schema";

export const getOrganizations = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const queryParams = OrganizationQuerySchema.parse(req.query);
    const currentUserId = (req as any).user?.id;
    const currentUserRole = (req as any).user?.role;
    
    const isAdmin = currentUserRole === 'admin' || currentUserRole === 'superAdmin';
    
    const result = await getOrganizationsServices(
      queryParams, 
      isAdmin ? undefined : currentUserId
    );

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

    const currentUserId = (req as any).user?.id;
    const currentUserRole = (req as any).user?.role;
    
    // Check if user has access to this organization
    const userAccess = await db.query.userOrganizations.findFirst({
      where: eq(userOrganizations.userId, currentUserId),
    });

    const isAdmin = currentUserRole === "admin" || currentUserRole === "superAdmin";
    const isMember = userAccess?.organizationId === organizationId;

    if (!isMember && !isAdmin) {
      throw new AuthorizationError(
        "You don't have access to this organization"
      );
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
    // Check if current user has permission to create organizations
    const currentUserRole = (req as any).user?.role;
    const isAdmin = currentUserRole === "admin" || currentUserRole === "superAdmin";
    
    if (!isAdmin) {
      throw new AuthorizationError(
        "Only admins can create organizations"
      );
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

    // Check if current user has permission to update organizations
    const currentUserRole = (req as any).user?.role;
    const isAdmin = currentUserRole === "admin" || currentUserRole === "superAdmin";
    
    if (!isAdmin) {
      throw new AuthorizationError(
        "Only admins can update organizations"
      );
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

    // Check if current user has permission to delete organizations
    const currentUserRole = (req as any).user?.role;
    const isAdmin = currentUserRole === "admin" || currentUserRole === "superAdmin";
    
    if (!isAdmin) {
      throw new AuthorizationError(
        "Only admins can delete organizations"
      );
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