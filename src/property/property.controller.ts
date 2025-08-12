import { Request, Response } from "express";
import {
  getPropertiesService,
  getPropertyByIdService,
  createPropertyService,
  updatePropertyService,
  deletePropertyService,
} from "./property.service";
import { NewProperty } from "../drizzle/schema";

export const getPropertiesController = async (req: Request, res: Response) => {
  try {
    const properties = await getPropertiesService();
    if (properties == null || properties.length === 0) {
      res.status(404).json({ message: "No properties found" });
      return;
    } else {
      res.status(200).json(properties);
      return;
    }
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch properties",
      error: error.message,
    });
  }
};

export const getPropertyByIdController = async (req: Request, res: Response) => {
  try {
    const propertyId = req.params.id;
    if (!propertyId) {
      res.status(400).json({ message: "Invalid property ID" });
      return;
    }

    const property = await getPropertyByIdService(propertyId);
    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    } else {
      res.status(200).json(property);
      return;
    }
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch property",
      error: error.message,
    });
  }
};

export const createPropertyController = async (req: Request, res: Response) => {
  try {
    const propertyData: NewProperty = req.body;
    if (!propertyData.name || !propertyData.address || !propertyData.ownerId) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const newProperty = await createPropertyService(propertyData);
    res.status(201).json(newProperty);
    return;
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create property",
      error: error.message,
    });
  }
};

export const updatePropertyController = async (req: Request, res: Response) => {
  try {
    const propertyId = req.params.id;
    if (!propertyId) {
      res.status(400).json({ message: "Invalid property ID" });
      return;
    }

    const propertyData: Partial<NewProperty> = req.body;
    if (Object.keys(propertyData).length === 0) {
      res.status(400).json({ message: "No data provided for update" });
      return;
    }

    const updatedProperty = await updatePropertyService(propertyId, propertyData);
    if (!updatedProperty) {
      res.status(404).json({ message: "Property not found" });
      return;
    } else {
      res.status(200).json(updatedProperty);
    }
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update property",
      error: error.message,
    });
  }
};

export const deletePropertyController = async (req: Request, res: Response) => {
  try {
    const propertyId = req.params.id;
    if (!propertyId) {
      res.status(400).json({ message: "Invalid property ID" });
      return;
    }

    const deletedProperty = await deletePropertyService(propertyId);
    if (!deletedProperty) {
      res.status(404).json({ message: "Property not found" });
      return;
    } else {
      res.status(200).json({ message: "Property deleted successfully" });
    }
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete property",
      error: error.message,
    });
  }
};