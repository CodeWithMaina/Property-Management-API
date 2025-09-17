// organization.route.ts
import { Router } from "express";
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from "./organization.controller";

export const organizationRouter = Router();

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
organizationRouter.get("/organizations/:id", getOrganizationById);

/**
 * @route PUT /organizations/:id
 * @description Update organization information
 * @access Private (Admin/SuperAdmin)
 */
organizationRouter.put("/organizations/:id", updateOrganization);

/**
 * @route DELETE /organizations/:id
 * @description Delete an organization (soft delete)
 * @access Private (Admin/SuperAdmin)
 */
organizationRouter.delete("/organizations/:id", deleteOrganization);