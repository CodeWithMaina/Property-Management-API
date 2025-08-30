// lease.routes.ts - Updated to use your validate middleware
import { Router } from "express";
import { validate } from "../middleware/validate"; // Your validate middleware
import {
  getLeases,
  createLease,
  getLeaseById,
  updateLease,
  deleteLease,
  activateLease,
  terminateLease,
  renewLease,
  cancelLease,
  updateLeaseStatus,
  getLeasesByTenant,
  getLeasesByProperty,
  getLeaseBalance,
} from "./lease.controller";
import {
  LeaseSchema,
  PartialLeaseSchema,
  LeaseQuerySchema,
  LeaseStatusChangeSchema,
  LeaseRenewalSchema,
} from "./lease.validator";

const leaseRouter = Router();

// Apply authentication to all routes
// leaseRouter.use(authenticateToken);

// GET /leases - List all leases (filterable by tenant, property, status)
leaseRouter.get("/leases", validate(LeaseQuerySchema, 'query'), getLeases);

// POST /leases - Create a new lease (typically in 'draft' status)
leaseRouter.post(
  "/leases",
  validate(LeaseSchema, 'body'),
  createLease
);

// GET /leases/:id - Get specific lease details
leaseRouter.get("/leases/:id", getLeaseById);

// PUT /leases/:id - Update lease information
leaseRouter.put(
  "/leases/:id",
  validate(PartialLeaseSchema, 'body'),
  updateLease
);

// DELETE /leases/:id - Delete a lease
leaseRouter.delete(
  "/leases/:id",
  deleteLease
);

// POST /leases/:id/activate - Transition a lease to 'active'
leaseRouter.post(
  "/leases/:id/activate",
  validate(LeaseStatusChangeSchema, 'body'),
  activateLease
);

// POST /leases/:id/terminate - Terminate a lease early
leaseRouter.post(
  "/leases/:id/terminate",
  validate(LeaseStatusChangeSchema, 'body'),
  terminateLease
);

// POST /leases/:id/renew - Create a new lease based on an expiring one
leaseRouter.post(
  "/leases/:id/renew",
  validate(LeaseRenewalSchema, 'body'),
  renewLease
);

// POST /leases/:id/cancel - Cancel a draft or pending lease
leaseRouter.post(
  "/leases/:id/cancel",
  validate(LeaseStatusChangeSchema, 'body'),
  cancelLease
);

// PATCH /leases/:id/status - Directly update lease status
leaseRouter.patch(
  "/leases/:id/status",
  validate(LeaseStatusChangeSchema, 'body'),
  updateLeaseStatus
);

// GET /leases/tenant/:userId - Get leases for a specific tenant
leaseRouter.get("/leases/tenant/:userId", getLeasesByTenant);

// GET /leases/property/:propertyId - Get leases for a property
leaseRouter.get("/leases/property/:propertyId", getLeasesByProperty);

// GET /leases/:id/balance - Calculate the real-time outstanding balance for the lease
leaseRouter.get("/leases/:id/balance", getLeaseBalance);

export default leaseRouter;