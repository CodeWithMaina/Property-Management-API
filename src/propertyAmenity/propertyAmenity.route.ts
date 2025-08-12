import { Router } from "express";
import {
  createPropertyAmenityController,
  deletePropertyAmenityController,
  getPropertyAmenitiesController,
  getPropertyAmenityByIdController,
} from "./propertyAmenity.controller";

export const propertyAmenityRouter = Router();

propertyAmenityRouter.get("/property-amenities", getPropertyAmenitiesController);
propertyAmenityRouter.get("/property-amenity/:propertyId/:amenityId", getPropertyAmenityByIdController);
propertyAmenityRouter.post("/property-amenity", createPropertyAmenityController);
propertyAmenityRouter.delete("/property-amenity/:propertyId/:amenityId", deletePropertyAmenityController);