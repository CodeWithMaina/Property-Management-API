import { Router } from "express";
import {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyManagers,
  assignPropertyManager,
  removePropertyManager,
} from "./property.controller";

export const propertyRouter = Router();

/**
 * @route GET /properties
 * @description Get all properties (filterable by organization)
 * @access Private
 */
propertyRouter.get("/properties", getProperties);

/**
 * @route POST /properties
 * @description Create a new property
 * @access Private (Admin/Organization Owner)
 */
propertyRouter.post("/properties", createProperty);

/**
 * @route GET /properties/:id
 * @description Get specific property details
 * @access Private
 */
propertyRouter.get("/properties/:id", getPropertyById);

/**
 * @route PUT /properties/:id
 * @description Update property information
 * @access Private (Admin/Organization Owner/Property Manager)
 */
propertyRouter.put("/properties/:id", updateProperty);

/**
 * @route DELETE /properties/:id
 * @description Delete a property (soft delete)
 * @access Private (Admin/Organization Owner)
 */
propertyRouter.delete("/properties/:id", deleteProperty);

/**
 * @route GET /properties/:id/users
 * @description List managers/users associated with a property
 * @access Private
 */
propertyRouter.get("/properties/:id/users", getPropertyManagers);

/**
 * @route POST /properties/:id/managers
 * @description Assign a manager to a property
 * @access Private (Admin/Organization Owner)
 */
propertyRouter.post("/properties/:id/managers", assignPropertyManager);

/**
 * @route DELETE /properties/:id/managers/:userId
 * @description Remove a manager from a property
 * @access Private (Admin/Organization Owner)
 */
propertyRouter.delete("/properties/:id/managers/:userId", removePropertyManager);

export default propertyRouter;