import { Request, Response } from "express";
import {
  getPropertyAmenitiesService,
  getPropertyAmenityByIdService,
  createPropertyAmenityService,
  deletePropertyAmenityService,
} from "./propertyAmenity.service";
import { NewPropertyAmenity } from "../drizzle/schema";

export const getPropertyAmenitiesController = async (req: Request, res: Response) => {
  try {
    const propertyAmenities = await getPropertyAmenitiesService();
    if (propertyAmenities == null || propertyAmenities.length === 0) {
      res.status(404).json({ message: "No property amenities found" });
      return;
    }
    res.status(200).json(propertyAmenities);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch property amenities",
      error: error.message,
    });
  }
};

export const getPropertyAmenityByIdController = async (req: Request, res: Response) => {
  try {
    const { propertyId, amenityId } = req.params;
    if (!propertyId || !amenityId) {
      res.status(400).json({ message: "Invalid property or amenity ID" });
      return;
    }

    const propertyAmenity = await getPropertyAmenityByIdService(propertyId, amenityId);
    if (!propertyAmenity) {
      res.status(404).json({ message: "Property amenity not found" });
      return;
    }
    res.status(200).json(propertyAmenity);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch property amenity",
      error: error.message,
    });
  }
};

export const createPropertyAmenityController = async (req: Request, res: Response) => {
  try {
    const propertyAmenityData: NewPropertyAmenity = req.body;
    if (!propertyAmenityData.propertyId || !propertyAmenityData.amenityId) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const newPropertyAmenity = await createPropertyAmenityService(propertyAmenityData);
    res.status(201).json(newPropertyAmenity);
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({
        message: "This amenity is already assigned to the property",
        error: "already_assigned",
      });
      return;
    }
    res.status(500).json({
      message: "Failed to create property amenity",
      error: error.message,
    });
  }
};

export const deletePropertyAmenityController = async (req: Request, res: Response) => {
  try {
    const { propertyId, amenityId } = req.params;
    if (!propertyId || !amenityId) {
      res.status(400).json({ message: "Invalid property or amenity ID" });
      return;
    }

    const deletedPropertyAmenity = await deletePropertyAmenityService(propertyId, amenityId);
    if (!deletedPropertyAmenity) {
      res.status(404).json({ message: "Property amenity not found" });
      return;
    }
    res.status(200).json({ message: "Property amenity deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete property amenity",
      error: error.message,
    });
  }
};