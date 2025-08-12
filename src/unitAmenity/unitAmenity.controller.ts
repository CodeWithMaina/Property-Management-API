import { Request, Response } from "express";
import {
  getUnitAmenitiesService,
  getUnitAmenityByIdService,
  createUnitAmenityService,
  deleteUnitAmenityService,
} from "./unitAmenity.service";
import { NewUnitAmenity } from "../drizzle/schema";

export const getUnitAmenitiesController = async (req: Request, res: Response) => {
  try {
    const unitAmenities = await getUnitAmenitiesService();
    if (unitAmenities == null || unitAmenities.length === 0) {
      res.status(404).json({ message: "No unit amenities found" });
      return;
    }
    res.status(200).json(unitAmenities);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch unit amenities",
      error: error.message,
    });
  }
};

export const getUnitAmenityByIdController = async (req: Request, res: Response) => {
  try {
    const { unitId, amenityId } = req.params;
    if (!unitId || !amenityId) {
      res.status(400).json({ message: "Invalid unit or amenity ID" });
      return;
    }

    const unitAmenity = await getUnitAmenityByIdService(unitId, amenityId);
    if (!unitAmenity) {
      res.status(404).json({ message: "Unit amenity not found" });
      return;
    }
    res.status(200).json(unitAmenity);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch unit amenity",
      error: error.message,
    });
  }
};

export const createUnitAmenityController = async (req: Request, res: Response) => {
  try {
    const unitAmenityData: NewUnitAmenity = req.body;
    if (!unitAmenityData.unitId || !unitAmenityData.amenityId) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const newUnitAmenity = await createUnitAmenityService(unitAmenityData);
    res.status(201).json(newUnitAmenity);
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({
        message: "This amenity is already assigned to the unit",
        error: "already_assigned",
      });
      return;
    }
    res.status(500).json({
      message: "Failed to create unit amenity",
      error: error.message,
    });
  }
};

export const deleteUnitAmenityController = async (req: Request, res: Response) => {
  try {
    const { unitId, amenityId } = req.params;
    if (!unitId || !amenityId) {
      res.status(400).json({ message: "Invalid unit or amenity ID" });
      return;
    }

    const deletedUnitAmenity = await deleteUnitAmenityService(unitId, amenityId);
    if (!deletedUnitAmenity) {
      res.status(404).json({ message: "Unit amenity not found" });
      return;
    }
    res.status(200).json({ message: "Unit amenity deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete unit amenity",
      error: error.message,
    });
  }
};