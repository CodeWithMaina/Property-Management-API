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

export const getOrganizations = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const queryParams = OrganizationQuerySchema.parse(req.query);
    const currentUserId = (req as any).user?.id;
    const isAdmin = (req as any).user?.role === 'admin' || (req as any).user?.role === 'superAdmin';
    
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

    const organization = await getOrganizationByIdServices(organizationId);

    if (!organization) {
      throw new NotFoundError("Organization");
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

export const deleteOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id;

    if (!organizationId) {
      throw new ValidationError("Organization ID is required");
    }

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