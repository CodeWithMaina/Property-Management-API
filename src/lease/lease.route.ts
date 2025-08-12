import { Router } from "express";
import {
  createLeaseController,
  deleteLeaseController,
  getLeaseByIdController,
  getLeasesController,
  updateLeaseController,
  getLeasesByTenantController,
  getLeasesByUnitController,
} from "./lease.controller";

export const leaseRouter = Router();

leaseRouter.get("/leases", getLeasesController);
leaseRouter.get("/lease/:id", getLeaseByIdController);
leaseRouter.get("/leases/tenant/:tenantId", getLeasesByTenantController);
leaseRouter.get("/leases/unit/:unitId", getLeasesByUnitController);
leaseRouter.post("/lease", createLeaseController);
leaseRouter.put("/lease/:id", updateLeaseController);
leaseRouter.delete("/lease/:id", deleteLeaseController);