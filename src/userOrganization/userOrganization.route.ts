// user-organization.route.ts
import { Router } from "express";
import {
  setPrimaryOrganization,
  getOrganizationUsers,
  addUserToOrganization,
  updateUserRole,
  removeUserFromOrganization,
} from "./userOrganization.controller";

export const userOrganizationRouter = Router();

/**
 * @route GET /organizations/:id/users
 * @description List users in an organization
 * @access Private (Organization members or Admin)
 */
userOrganizationRouter.get("/organizations/:id/users", getOrganizationUsers);

/**
 * @route POST /organizations/:id/users
 * @description Add a user to an organization
 * @access Private (Admin/SuperAdmin)
 */
userOrganizationRouter.post("/organizations/:id/users", addUserToOrganization);

/**
 * @route PATCH /user-organizations/:id/role
 * @description Change a user's role within a specific organization
 * @access Private (Admin/SuperAdmin)
 */
userOrganizationRouter.patch("/user-organizations/:id/role", updateUserRole);

/**
 * @route PATCH /user-organizations/:id/primary
 * @description Set a user's primary organization
 * @access Private (User can only set their own primary organization)
 */
userOrganizationRouter.patch(
  "/user-organizations/:id/primary",
  setPrimaryOrganization
);

/**
 * @route DELETE /user-organizations/:id
 * @description Remove a user from an organization
 * @access Private (Admin/SuperAdmin)
 */
userOrganizationRouter.delete(
  "/user-organizations/:id",
  removeUserFromOrganization
);
