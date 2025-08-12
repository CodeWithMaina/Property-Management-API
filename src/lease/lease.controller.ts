import { Request, Response } from "express";
import {
  getLeasesService,
  getLeaseByIdService,
  createLeaseService,
  updateLeaseService,
  deleteLeaseService,
  getLeasesByTenantService,
  getLeasesByUnitService,
} from "./lease.service";
import { NewLease } from "../drizzle/schema";

export const getLeasesController = async (req: Request, res: Response) => {
  try {
    const leases = await getLeasesService();
    if (leases.length === 0) {
      res.status(404).json({ message: "No leases found" });
      return;
    }
    res.status(200).json(leases);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch leases",
      error: error.message,
    });
  }
};

export const getLeaseByIdController = async (req: Request, res: Response) => {
  try {
    const leaseId = req.params.id;
    if (!leaseId) {
      res.status(400).json({ message: "Invalid lease ID" });
      return;
    }

    const lease = await getLeaseByIdService(leaseId);
    if (!lease) {
      res.status(404).json({ message: "Lease not found" });
      return;
    }
    res.status(200).json(lease);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch lease",
      error: error.message,
    });
  }
};

export const createLeaseController = async (req: Request, res: Response) => {
  try {
    const leaseData: NewLease = req.body;
    if (
      !leaseData.tenantId ||
      !leaseData.unitId ||
      !leaseData.startDate ||
      !leaseData.endDate ||
      !leaseData.rentAmount
    ) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const newLease = await createLeaseService(leaseData);
    res.status(201).json(newLease);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to create lease",
      error: error.message,
    });
  }
};

export const updateLeaseController = async (req: Request, res: Response) => {
  try {
    const leaseId = req.params.id;
    if (!leaseId) {
      res.status(400).json({ message: "Invalid lease ID" });
      return;
    }

    const leaseData: Partial<NewLease> = req.body;
    if (Object.keys(leaseData).length === 0) {
      res.status(400).json({ message: "No data provided for update" });
      return;
    }

    const updatedLease = await updateLeaseService(leaseId, leaseData);
    if (!updatedLease) {
      res.status(404).json({ message: "Lease not found" });
      return;
    }
    res.status(200).json(updatedLease);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to update lease",
      error: error.message,
    });
  }
};

export const deleteLeaseController = async (req: Request, res: Response) => {
  try {
    const leaseId = req.params.id;
    if (!leaseId) {
      res.status(400).json({ message: "Invalid lease ID" });
      return;
    }

    const deletedLease = await deleteLeaseService(leaseId);
    if (!deletedLease) {
      res.status(404).json({ message: "Lease not found" });
      return;
    }
    res.status(200).json({ message: "Lease deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to delete lease",
      error: error.message,
    });
  }
};

export const getLeasesByTenantController = async (
  req: Request,
  res: Response
) => {
  try {
    const tenantId = req.params.tenantId;
    if (!tenantId) {
      res.status(400).json({ message: "Invalid tenant ID" });
      return;
    }

    const leases = await getLeasesByTenantService(tenantId);
    if (leases.length === 0) {
      res.status(404).json({ message: "No leases found for this tenant" });
      return;
    }
    res.status(200).json(leases);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch leases by tenant",
      error: error.message,
    });
  }
};

export const getLeasesByUnitController = async (req: Request, res: Response) => {
  try {
    const unitId = req.params.unitId;
    if (!unitId) {
      res.status(400).json({ message: "Invalid unit ID" });
      return;
    }

    const leases = await getLeasesByUnitService(unitId);
    if (leases.length === 0) {
      res.status(404).json({ message: "No leases found for this unit" });
      return;
    }
    res.status(200).json(leases);
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch leases by unit",
      error: error.message,
    });
  }
};