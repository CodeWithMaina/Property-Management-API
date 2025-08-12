import { Router } from "express";
import {
  createUnitAmenityController,
  deleteUnitAmenityController,
  getUnitAmenitiesController,
  getUnitAmenityByIdController,
} from "./unitAmenity.controller";

export const unitAmenityRouter = Router();

unitAmenityRouter.get("/unit-amenities", getUnitAmenitiesController);
unitAmenityRouter.get("/unit-amenity/:unitId/:amenityId", getUnitAmenityByIdController);
unitAmenityRouter.post("/unit-amenity", createUnitAmenityController);
unitAmenityRouter.delete("/unit-amenity/:unitId/:amenityId", deleteUnitAmenityController);