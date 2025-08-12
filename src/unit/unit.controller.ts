import { Request, Response } from "express";
import {
  getUnitsService,
  getUnitByIdService,
  createUnitService,
  updateUnitService,
  deleteUnitService,
  getUnitsByPropertyService,
} from "./unit.service";
import { NewUnit } from "../drizzle/schema";

export const getUnitsController = async (req: Request, res: Response) => {
  try {
    const units = await getUnitsService();
    if (units.length === 0) {
      res.status(404).json({ message: "No units found" });
      return;
    }
    res.status(200).json(units);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch units",
      error: error.message,
    });
  }
};

export const getUnitByIdController = async (req: Request, res: Response) => {
  try {
    const unitId = req.params.id;
    if (!unitId) {
      res.status(400).json({ message: "Invalid unit ID" });
      return;
    }

    const unit = await getUnitByIdService(unitId);
    if (!unit) {
      res.status(404).json({ message: "Unit not found" });
      return;
    }
    res.status(200).json(unit);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch unit",
      error: error.message,
    });
  }
};

export const createUnitController = async (req: Request, res: Response) => {
  try {
    const unitData: NewUnit = req.body;
    if (!unitData.name || !unitData.propertyId || !unitData.rentAmount) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const newUnit = await createUnitService(unitData);
    res.status(201).json(newUnit);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create unit",
      error: error.message,
    });
  }
};

export const updateUnitController = async (req: Request, res: Response) => {
  try {
    const unitId = req.params.id;
    if (!unitId) {
      res.status(400).json({ message: "Invalid unit ID" });
      return;
    }

    const unitData: Partial<NewUnit> = req.body;
    if (Object.keys(unitData).length === 0) {
      res.status(400).json({ message: "No data provided for update" });
      return;
    }

    const updatedUnit = await updateUnitService(unitId, unitData);
    if (!updatedUnit) {
      res.status(404).json({ message: "Unit not found" });
      return;
    }
    res.status(200).json(updatedUnit);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update unit",
      error: error.message,
    });
  }
};

export const deleteUnitController = async (req: Request, res: Response) => {
  try {
    const unitId = req.params.id;
    if (!unitId) {
      res.status(400).json({ message: "Invalid unit ID" });
      return;
    }

    const deletedUnit = await deleteUnitService(unitId);
    if (!deletedUnit) {
      res.status(404).json({ message: "Unit not found" });
      return;
    }
    res.status(200).json({ message: "Unit deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete unit",
      error: error.message,
    });
  }
};

export const getUnitsByPropertyController = async (
  req: Request,
  res: Response
) => {
  try {
    const propertyId = req.params.propertyId;
    if (!propertyId) {
      res.status(400).json({ message: "Invalid property ID" });
      return;
    }

    const units = await getUnitsByPropertyService(propertyId);
    if (units.length === 0) {
      res.status(404).json({ message: "No units found for this property" });
      return;
    }
    res.status(200).json(units);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch units by property",
      error: error.message,
    });
  }
};