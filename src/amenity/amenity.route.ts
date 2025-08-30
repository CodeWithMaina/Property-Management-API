// amenities.route.ts
import { Router } from "express";
import {
  updateAmenity,
  getAmenities,
  getAmenityById,
  createAmenity,
  deleteAmenity,
  getAmenitiesByOrganization,
} from "./amenity.controller";

export const amenitiesRouter = Router();

/**
 * @route GET /amenities
 * @description Get all amenities (filterable by organization)
 * @access Private
 */
amenitiesRouter.get("/amenities", getAmenities);

/**
 * @route POST /amenities
 * @description Create a new amenity
 * @access Private (Admin/Organization Owner/Manager)
 */
amenitiesRouter.post("/amenities", createAmenity);

/**
 * @route GET /amenities/:id
 * @description Get specific amenity details
 * @access Private
 */
amenitiesRouter.get("/amenities/:id", getAmenityById);

/**
 * @route PUT /amenities/:id
 * @description Update amenity information
 * @access Private (Admin/Organization Owner/Manager)
 */
amenitiesRouter.put("/amenities/:id", updateAmenity);

/**
 * @route DELETE /amenities/:id
 * @description Delete an amenity
 * @access Private (Admin/Organization Owner/Manager)
 */
amenitiesRouter.delete("/amenities/:id", deleteAmenity);

/**
 * @route GET /amenities/organization/:orgId
 * @description Get amenities for a specific organization
 * @access Private
 */
amenitiesRouter.get(
  "/amenities/organization/:orgId",
  getAmenitiesByOrganization
);

export default amenitiesRouter;
