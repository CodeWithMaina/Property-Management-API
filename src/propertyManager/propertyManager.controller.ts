import { Request, Response } from "express";
import { propertyManagerService } from "./propertyManager.service";
import { createPropertyManagersResponse, createSuccessResponse } from "../utils/apiResponse/apiResponse.helper";
import { PropertyManagerSchema } from "./propertyManager.validator";
import {
  NotFoundError,
  asyncHandler,
  ValidationError,
  ConflictError,
} from "../utils/errorHandler";

/**
 * Controller for property manager-related HTTP operations
 */
export class PropertyManagerController {
  /**
   * List managers/users associated with a property
   */
  getPropertyManagers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const propertyId = req.params.id;

      if (!propertyId) {
        throw new ValidationError("Property ID is required");
      }

      const managers = await propertyManagerService.getPropertyManagers(
        propertyId
      );

      // Use the specific property managers response helper
      const response = createPropertyManagersResponse(
        managers,
        undefined, // no pagination
        "Property managers retrieved successfully",
        "No property managers found for this property"
      );

      res.status(200).json(response);
    }
  );

  /**
   * Assign a manager to a property
   */
  assignPropertyManager = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const propertyId = req.params.id;

      if (!propertyId) {
        throw new ValidationError("Property ID is required");
      }

      // Validate request body
      const validatedData = PropertyManagerSchema.parse(req.body);

      try {
        const assignment = await propertyManagerService.assignPropertyManager(
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
  removePropertyManager = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const propertyId = req.params.id;
      const userId = req.params.userId;

      if (!propertyId || !userId) {
        throw new ValidationError("Property ID and User ID are required");
      }

      try {
        const result = await propertyManagerService.removePropertyManager(
          propertyId,
          userId
        );

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
}

// Export singleton instance
export const propertyManagerController = new PropertyManagerController();