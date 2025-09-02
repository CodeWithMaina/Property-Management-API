// maintenance.routes.ts
import express from "express";
import {
  getMaintenanceRequestById,
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  assignMaintenanceRequest,
  unassignMaintenanceRequest,
  changeMaintenanceRequestStatus,
  closeMaintenanceRequest,
  addMaintenanceRequestEstimate,
  addMaintenanceRequestComment,
  addMaintenanceRequestAttachment,
  getMaintenanceRequestsByProperty,
  getMaintenanceRequestsByAssignedUser,
} from "./maintenance.controlle";

const router = express.Router();

// GET /maintenance-requests - List all requests (filterable by status, priority, property)
router.get("/", getMaintenanceRequests);

// POST /maintenance-requests - Create a new maintenance request
router.post("/", createMaintenanceRequest);

// GET /maintenance-requests/:id - Get specific request details
router.get("/:id", getMaintenanceRequestById);

// PUT /maintenance-requests/:id - Update request information
router.put("/:id", updateMaintenanceRequest);

// POST /maintenance-requests/:id/assign - Assign a request to a staff member
router.post("/:id/assign", assignMaintenanceRequest);

// POST /maintenance-requests/:id/unassign - Unassign the current staff member
router.post("/:id/unassign", unassignMaintenanceRequest);

// POST /maintenance-requests/:id/change-status - Update the status (e.g., open -> inProgress)
router.post("/:id/change-status", changeMaintenanceRequestStatus);

// POST /maintenance-requests/:id/close - Transition a resolved request to 'closed'
router.post("/:id/close", closeMaintenanceRequest);

// POST /maintenance-requests/:id/add-estimate - Attach a cost estimate to the request
router.post("/:id/add-estimate", addMaintenanceRequestEstimate);

// GET /maintenance-requests/property/:propertyId - Get requests for a property
router.get("/property/:propertyId", getMaintenanceRequestsByProperty);

// GET /maintenance-requests/assigned-to/:userId - Get requests assigned to a user
router.get("/assigned-to/:userId", getMaintenanceRequestsByAssignedUser);

// POST /maintenance-requests/:id/comments - Add a comment to a request
router.post("/:id/comments", addMaintenanceRequestComment);

// POST /maintenance-requests/:id/attachments - Add an attachment to a request
router.post("/:id/attachments", addMaintenanceRequestAttachment);

export default router;
