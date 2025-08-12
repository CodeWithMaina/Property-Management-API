import { Router } from "express";
import {
  createAmenityController,
  deleteAmenityController,
  getAmenitiesController,
  getAmenityByIdController,
  updateAmenityController,
} from "./amenity.controller";

export const amenityRouter = Router();

amenityRouter.get("/amenities", getAmenitiesController);
amenityRouter.get("/amenity/:id", getAmenityByIdController);
amenityRouter.post("/amenity", createAmenityController);
amenityRouter.put("/amenity/:id", updateAmenityController);
amenityRouter.delete("/amenity/:id", deleteAmenityController);