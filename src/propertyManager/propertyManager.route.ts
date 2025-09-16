import { Router } from "express";
import { propertyManagerController } from "./propertyManager.controller";

export const propertyManagerRouter = Router();

/**
 * @route GET /properties/:id/managers
 * @description List managers/users associated with a property
 * @access Private
 */
propertyManagerRouter.get("/property/:id/managers", propertyManagerController.getPropertyManagers);

/**
 * @route POST /properties/:id/managers
 * @description Assign a manager to a property
 * @access Private (Admin/Organization Owner)
 */
propertyManagerRouter.post("/property/:id/managers", propertyManagerController.assignPropertyManager);

/**
 * @route DELETE /properties/:id/managers/:userId
 * @description Remove a manager from a property
 * @access Private (Admin/Organization Owner)
 */
propertyManagerRouter.delete("/property/:id/managers/:userId", propertyManagerController.removePropertyManager);
