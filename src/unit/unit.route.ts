import { Router } from "express";
import {
  createUnitController,
  deleteUnitController,
  getUnitByIdController,
  getUnitsController,
  updateUnitController,
  getUnitsByPropertyController,
} from "./unit.controller";

export const unitRouter = Router();

unitRouter.get("/units", getUnitsController);
unitRouter.get("/unit/:id", getUnitByIdController);
unitRouter.get("/units/property/:propertyId", getUnitsByPropertyController);
unitRouter.post("/unit", createUnitController);
unitRouter.put("/unit/:id", updateUnitController);
unitRouter.delete("/unit/:id", deleteUnitController);