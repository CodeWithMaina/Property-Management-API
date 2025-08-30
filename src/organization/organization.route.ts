// organization.route.ts
import { Router } from "express";
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationUsers,
  addUserToOrganization,
  updateUserRole,
  setPrimaryOrganization,
  removeUserFromOrganization,
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

/**
 * @route GET /organizations/:id/users
 * @description List users in an organization
 * @access Private (Organization members or Admin)
 */
organizationRouter.get("/organizations/:id/users", getOrganizationUsers);

/**
 * @route POST /organizations/:id/users
 * @description Add a user to an organization
 * @access Private (Admin/SuperAdmin)
 */
organizationRouter.post("/organizations/:id/users", addUserToOrganization);

/**
 * @route PATCH /user-organizations/:id/role
 * @description Change a user's role within a specific organization
 * @access Private (Admin/SuperAdmin)
 */
organizationRouter.patch("/user-organizations/:id/role", updateUserRole);

/**
 * @route PATCH /user-organizations/:id/primary
 * @description Set a user's primary organization
 * @access Private (User can only set their own primary organization)
 */
organizationRouter.patch("/user-organizations/:id/primary", setPrimaryOrganization);

/**
 * @route DELETE /user-organizations/:id
 * @description Remove a user from an organization
 * @access Private (Admin/SuperAdmin)
 */
organizationRouter.delete("/user-organizations/:id", removeUserFromOrganization);

export default organizationRouter;