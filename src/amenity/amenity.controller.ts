// amenities.controller.ts
import { Request, Response } from "express";
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../utils/errorHandler";
import {
  createPaginatedResponse,
  createSuccessResponse,
  createAmenityResponse,
  createAmenitiesResponse,
} from "../utils/apiResponse/apiResponse.helper";
import {
  AmenitySchema,
  PartialAmenitySchema,
  AmenityQuerySchema,
} from "./amenity.validator";
import {
  updateAmenityServices,
  getAmenitiesServices,
  getAmenityByIdServices,
  getAmenitiesByOrganizationServices,
  createAmenityServices,
  deleteAmenityServices,
} from "./amenity.service";

/**
 * Get all amenities with optional filtering
 */
export const getAmenities = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate query parameters
    const queryParams = AmenityQuerySchema.parse(req.query);

    const result = await getAmenitiesServices(queryParams);

    // Create pagination object
    const pagination = {
      total: result.total,
      count: result.amenities.length,
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
      result.amenities,
      pagination,
      "Amenities retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * Get amenities for a specific organization
 */
export const getAmenitiesByOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.orgId;

    if (!organizationId) {
      throw new ValidationError("Organization ID is required");
    }

    const amenities = await getAmenitiesByOrganizationServices(organizationId);

    const response = createAmenitiesResponse(
      amenities,
      undefined,
      "Organization amenities retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * Get specific amenity details
 */
export const getAmenityById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const amenityId = req.params.id;

    if (!amenityId) {
      throw new ValidationError("Amenity ID is required");
    }

    const amenity = await getAmenityByIdServices(amenityId);

    if (!amenity) {
      throw new NotFoundError("Amenity");
    }

    const response = createAmenityResponse(
      amenity,
      "Amenity retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * Create a new amenity
 */
export const createAmenity = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const validatedData = AmenitySchema.parse(req.body);

    try {
      const newAmenity = await createAmenityServices(validatedData);

      const response = createSuccessResponse(
        newAmenity,
        "Amenity created successfully"
      );

      res.status(201).json(response);
    } catch (error: any) {
      if (error.message === "Organization not found") {
        throw new NotFoundError(error.message);
      }

      if (
        error.message ===
        "Amenity with this name already exists in this organization"
      ) {
        throw new ConflictError(error.message);
      }

      throw error;
    }
  }
);

/**
 * Update amenity information
 */
export const updateAmenity = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const amenityId = req.params.id;

    if (!amenityId) {
      throw new ValidationError("Amenity ID is required");
    }

    // Validate request body
    const validatedData = PartialAmenitySchema.parse(req.body);

    try {
      const updatedAmenity = await updateAmenityServices(
        amenityId,
        validatedData
      );

      const response = createSuccessResponse(
        updatedAmenity,
        "Amenity updated successfully"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (
        error.message === "Amenity not found" ||
        error.message === "Organization not found"
      ) {
        throw new NotFoundError(error.message);
      }

      if (
        error.message ===
        "Amenity with this name already exists in this organization"
      ) {
        throw new ConflictError(error.message);
      }

      throw error;
    }
  }
);

/**
 * Delete an amenity
 */
export const deleteAmenity = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const amenityId = req.params.id;

    if (!amenityId) {
      throw new ValidationError("Amenity ID is required");
    }

    try {
      const deletedAmenity = await deleteAmenityServices(amenityId);

      const response = createSuccessResponse(
        deletedAmenity,
        "Amenity deleted successfully"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error.message === "Amenity not found") {
        throw new NotFoundError(error.message);
      }

      if (
        error.message ===
        "Cannot delete amenity: it is currently assigned to units"
      ) {
        throw new ConflictError(error.message);
      }

      throw error;
    }
  }
);
