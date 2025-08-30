import { Router } from "express";
import {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  getUnitAmenities,
  addUnitAmenity,
  removeUnitAmenity,
  markUnitOccupied,
  markUnitVacant,
  markUnitUnavailable,
} from "./unit.controller";

export const unitRouter = Router();

/**
 * @route GET /units
 * @description Get all units (filterable by property, organization, or status)
 * @access Private
 */
unitRouter.get("/units", getUnits);

/**
 * @route POST /units
 * @description Create a new unit
 * @access Private (Admin/Organization Owner/Property Manager)
 */
unitRouter.post("/units", createUnit);

/**
 * @route GET /units/:id
 * @description Get specific unit details
 * @access Private
 */
unitRouter.get("/units/:id", getUnitById);

/**
 * @route PUT /units/:id
 * @description Update unit information
 * @access Private (Admin/Organization Owner/Property Manager)
 */
unitRouter.put("/units/:id", updateUnit);

/**
 * @route DELETE /units/:id
 * @description Delete a unit (soft delete)
 * @access Private (Admin/Organization Owner)
 */
unitRouter.delete("/units/:id", deleteUnit);

/**
 * @route GET /units/:id/amenities
 * @description List amenities for a unit
 * @access Private
 */
unitRouter.get("/units/:id/amenities", getUnitAmenities);

/**
 * @route POST /units/:id/amenities
 * @description Add an amenity to a unit
 * @access Private (Admin/Organization Owner/Property Manager)
 */
unitRouter.post("/units/:id/amenities", addUnitAmenity);

/**
 * @route DELETE /units/:id/amenities/:amenityId
 * @description Remove an amenity from a unit
 * @access Private (Admin/Organization Owner/Property Manager)
 */
unitRouter.delete("/units/:id/amenities/:amenityId", removeUnitAmenity);

/**
 * @route POST /units/:id/mark-occupied
 * @description Update a unit's status to occupied
 * @access Private (Admin/Organization Owner/Property Manager)
 */
unitRouter.post("/units/:id/mark-occupied", markUnitOccupied);

/**
 * @route POST /units/:id/mark-vacant
 * @description Update a unit's status to vacant
 * @access Private (Admin/Organization Owner/Property Manager)
 */
unitRouter.post("/units/:id/mark-vacant", markUnitVacant);

/**
 * @route POST /units/:id/mark-unavailable
 * @description Mark a unit as unavailable
 * @access Private (Admin/Organization Owner/Property Manager)
 */
unitRouter.post("/units/:id/mark-unavailable", markUnitUnavailable);

export default unitRouter;