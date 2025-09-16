import { Router } from "express";
import { propertyController } from "./property.controller";

export const propertyRouter = Router();

/**
 * @route GET /properties
 * @description Get all properties (filterable by organization)
 * @access Private
 */
propertyRouter.get("/properties", propertyController.getProperties);

/**
 * @route POST /properties
 * @description Create a new property
 * @access Private (Admin/Organization Owner)
 */
propertyRouter.post("/properties", propertyController.createProperty);

/**
 * @route GET /properties/:id
 * @description Get specific property details
 * @access Private
 */
propertyRouter.get("/properties/:id", propertyController.getPropertyById);

/**
 * @route PUT /properties/:id
 * @description Update property information
 * @access Private (Admin/Organization Owner/Property Manager)
 */
propertyRouter.put("/properties/:id", propertyController.updateProperty);

/**
 * @route DELETE /properties/:id
 * @description Delete a property. Use ?hardDelete=true for permanent deletion.
 * @access Private (Admin/Organization Owner)
 */
propertyRouter.delete("/properties/:id", propertyController.deleteProperty);

/**
 * @route PATCH /properties/:id/restore
 * @description Restore a soft-deleted property
 * @access Private (Admin/Organization Owner)
 */
propertyRouter.patch("/properties/:id/restore", propertyController.restoreProperty);