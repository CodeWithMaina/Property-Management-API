// organization.route.ts - Fix route definitions
import { Router } from "express";
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from "./organization.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireOrganizationAccess } from "./organization.middleware";

export const organizationRouter = Router();

// Apply authentication to all organization routes
organizationRouter.use(requireAuth);

/**
 * @route GET /organizations
 * @description List all organizations (scoped to user's access)
 * @access Private
 */
organizationRouter.get("/organizations", getOrganizations);

/**
 * @route POST /organizations
 * @description Create a new organization
 * @access Private (Admin/SuperAdmin)
 */
organizationRouter.post("/organizations", createOrganization);

/**
 * @route GET /organizations/:id
 * @description Get specific organization details
 * @access Private (Organization members or Admin)
 */
organizationRouter.get("/organizations/:id", requireOrganizationAccess(), getOrganizationById);

/**
 * @route PUT /organizations/:id
 * @description Update organization information
 * @access Private (Admin/SuperAdmin or Organization Manager/Owner)
 */
organizationRouter.put("/organizations/:id", requireOrganizationAccess(), updateOrganization);

/**
 * @route DELETE /organizations/:id
 * @description Delete an organization (soft delete)
 * @access Private (Admin/SuperAdmin)
 */
organizationRouter.delete("/organizations/:id", deleteOrganization);