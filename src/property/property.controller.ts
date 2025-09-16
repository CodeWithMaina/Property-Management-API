import { Request, Response } from "express";
import { propertyService } from "./property.service";
import {
  PartialPropertySchema,
  PropertyQuerySchema,
  PropertySchema,
  PropertyDeleteQuerySchema,
} from "./property.validator";
import {
  NotFoundError,
  asyncHandler,
  ValidationError,
} from "../utils/errorHandler";
import {
  createSuccessResponse,
  createPaginatedResponse,
  createPropertyResponse,
} from "../utils/apiResponse/apiResponse.helper";

/**
 * Controller for property-related HTTP operations
 */
export class PropertyController {
  /**
   * Get all properties with optional filtering
   */
  getProperties = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // Validate query parameters
      const queryParams = PropertyQuerySchema.parse(req.query);

      const result = await propertyService.getProperties(queryParams);

      // Create pagination object
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
  getPropertyById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const propertyId = req.params.id;

      if (!propertyId) {
        throw new ValidationError("Property ID is required");
      }

      const property = await propertyService.getPropertyById(propertyId);

      if (!property) {
        throw new NotFoundError("Property does not exist");
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
  createProperty = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // Validate request body
      const validatedData = PropertySchema.parse(req.body);

      const newProperty = await propertyService.createProperty(validatedData);

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
  updateProperty = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const propertyId = req.params.id;

      if (!propertyId) {
        throw new ValidationError("Property ID is required");
      }

      // Validate request body
      const validatedData = PartialPropertySchema.parse(req.body);

      const updatedProperty = await propertyService.updateProperty(
        propertyId,
        validatedData
      );

      if (!updatedProperty) {
        throw new NotFoundError("Property not updated");
      }

      const response = createSuccessResponse(
        updatedProperty,
        "Property updated successfully"
      );

      res.status(200).json(response);
    }
  );

  /**
   * Delete a property with option for hard or soft delete
   * @param hardDelete - If true, permanently removes the property from database
   * @param softDelete - If true (default), sets isActive to false (soft delete)
   * @returns Deleted property object or undefined if hard delete was performed
   */
  deleteProperty = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const propertyId = req.params.id;

      if (!propertyId) {
        throw new ValidationError("Property ID is required");
      }

      // Validate query parameters for delete operation
      const deleteQuery = PropertyDeleteQuerySchema.parse(req.query);
      const hardDelete = deleteQuery.hardDelete || false;

      const result = await propertyService.deleteProperty(propertyId, hardDelete);

      if (!result) {
        throw new NotFoundError("Property not found or already deleted");
      }

      const response = createSuccessResponse(
        hardDelete ? { id: propertyId, deleted: true } : result,
        hardDelete 
          ? "Property permanently deleted successfully" 
          : "Property deactivated successfully"
      );

      res.status(200).json(response);
    }
  );

  /**
   * Restore a soft-deleted property (set isActive back to true)
   */
  restoreProperty = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const propertyId = req.params.id;

      if (!propertyId) {
        throw new ValidationError("Property ID is required");
      }

      const restoredProperty = await propertyService.restoreProperty(propertyId);

      if (!restoredProperty) {
        throw new NotFoundError("Property not found or not deleted");
      }

      const response = createSuccessResponse(
        restoredProperty,
        "Property restored successfully"
      );

      res.status(200).json(response);
    }
  );
}

// Export singleton instance
export const propertyController = new PropertyController();