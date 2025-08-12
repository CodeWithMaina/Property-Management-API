import { Router } from "express";
import {
  createPropertyController,
  deletePropertyController,
  getPropertyByIdController,
  getPropertiesController,
  updatePropertyController,
} from "./property.controller";

export const propertyRouter = Router();

propertyRouter.get("/properties", getPropertiesController);
propertyRouter.get("/property/:id", getPropertyByIdController);
propertyRouter.post("/property", createPropertyController);
propertyRouter.put("/property/:id", updatePropertyController);
propertyRouter.delete("/property/:id", deletePropertyController);