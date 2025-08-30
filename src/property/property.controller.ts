import { Request, Response } from "express";
import {
  getPropertiesServices,
  getPropertyByIdServices,
  createPropertyServices,
  updatePropertyServices,
  deletePropertyServices,
  getPropertyManagersServices,
  assignPropertyManagerServices,
  removePropertyManagerServices,
} from "./property.service";
import {
  PartialPropertySchema,
  PropertyManagerSchema,
  PropertyQuerySchema,
  PropertySchema,
} from "./property.validator";
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../utils/errorHandler";
import {
  createPaginatedResponse,
  createSuccessResponse,
  createErrorResponse,
  createPropertiesResponse,
  createPropertyResponse,
} from "../utils/apiResponse/apiResponse.helper";

/**
 * Get all properties with optional filtering
 */
export const getProperties = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate query parameters
    const queryParams = PropertyQuerySchema.parse(req.query);

    const result = await getPropertiesServices(queryParams);

    // Create pagination object in the expected format
    const pagination = {
      total: result.total,
      count: result.properties.length,
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
      result.properties,
      pagination,
      "Properties retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * Get specific property details
 */
export const getPropertyById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.params.id;

    if (!propertyId) {
      throw new ValidationError("Property ID is required");
    }

    const property = await getPropertyByIdServices(propertyId);

    if (!property) {
      throw new NotFoundError("Property");
    }

    const response = createPropertyResponse(
      property,
      "Property retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * Create a new property
 */
export const createProperty = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate request body
    const validatedData = PropertySchema.parse(req.body);

    const newProperty = await createPropertyServices(validatedData);

    const response = createSuccessResponse(
      newProperty,
      "Property created successfully"
    );

    res.status(201).json(response);
  }
);

/**
 * Update property information
 */
export const updateProperty = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.params.id;

    if (!propertyId) {
      throw new ValidationError("Property ID is required");
    }

    // Validate request body
    const validatedData = PartialPropertySchema.parse(req.body);

    const updatedProperty = await updatePropertyServices(
      propertyId,
      validatedData
    );

    if (!updatedProperty) {
      throw new NotFoundError("Property");
    }

    const response = createSuccessResponse(
      updatedProperty,
      "Property updated successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * Delete a property (soft delete)
 */
export const deleteProperty = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.params.id;

    if (!propertyId) {
      throw new ValidationError("Property ID is required");
    }

    const deletedProperty = await deletePropertyServices(propertyId);

    if (!deletedProperty) {
      throw new NotFoundError("Property");
    }

    const response = createSuccessResponse(
      deletedProperty,
      "Property deleted successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * List managers/users associated with a property
 */
export const getPropertyManagers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.params.id;

    if (!propertyId) {
      throw new ValidationError("Property ID is required");
    }

    const managers = await getPropertyManagersServices(propertyId);

    const response = createSuccessResponse(
      managers,
      "Property managers retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * Assign a manager to a property
 */
export const assignPropertyManager = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.params.id;

    if (!propertyId) {
      throw new ValidationError("Property ID is required");
    }

    // Validate request body
    const validatedData = PropertyManagerSchema.parse(req.body);

    try {
      const assignment = await assignPropertyManagerServices(
        propertyId,
        validatedData
      );

      const response = createSuccessResponse(
        assignment,
        "Manager assigned successfully"
      );

      res.status(201).json(response);
    } catch (error: any) {
      if (
        error.message === "User not found" ||
        error.message === "Property not found"
      ) {
        throw new NotFoundError(error.message);
      }

      if (error.message === "Manager is already assigned to this property") {
        throw new ConflictError(error.message);
      }

      throw error;
    }
  }
);

/**
 * Remove a manager from a property
 */
export const removePropertyManager = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const propertyId = req.params.id;
    const userId = req.params.userId;

    if (!propertyId || !userId) {
      throw new ValidationError("Property ID and User ID are required");
    }

    try {
      const result = await removePropertyManagerServices(propertyId, userId);

      const response = createSuccessResponse(
        result,
        "Manager removed successfully"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error.message === "Manager assignment not found") {
        throw new NotFoundError(error.message);
      }

      throw error;
    }
  }
);
