// user-organization.controller.ts
import { Request, Response } from "express";
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  AuthorizationError,
  ConflictError,
} from "../utils/errorHandler";
import { createSuccessResponse } from "../utils/apiResponse/apiResponse.helper";
import db from "../drizzle/db";
import { eq } from "drizzle-orm";
import { userOrganizations, users } from "../drizzle/schema";
import {
  PrimaryOrganizationSchema,
  UserOrganizationSchema,
  RoleUpdateSchema,
} from "./userOrganization.validator";
import {
  setPrimaryOrganizationServices,
  getOrganizationUsersServices,
  addUserToOrganizationServices,
  updateUserRoleServices,
  removeUserFromOrganizationServices,
} from "./userOrganization.service";

export const getOrganizationUsers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id;

    if (!organizationId) {
      throw new ValidationError("Organization ID is required");
    }

    const currentUserId = (req as any).user?.id;
    const currentUserRole = (req as any).user?.role;
    
    // Check if user has access to this organization
    const userAccess = await db.query.userOrganizations.findFirst({
      where: eq(userOrganizations.userId, currentUserId),
    });

    const isAdmin = currentUserRole === "admin" || currentUserRole === "superAdmin";
    const isMember = userAccess?.organizationId === organizationId;

    if (!isMember && !isAdmin) {
      throw new AuthorizationError(
        "You don't have access to this organization"
      );
    }

    const users = await getOrganizationUsersServices(organizationId);

    const response = createSuccessResponse(
      users,
      "Organization users retrieved successfully"
    );

    res.status(200).json(response);
  }
);

export const addUserToOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params.id;

    if (!organizationId) {
      throw new ValidationError("Organization ID is required");
    }

    // Check if current user has permission to add users
    const currentUserRole = (req as any).user?.role;
    const isAdmin = currentUserRole === "admin" || currentUserRole === "superAdmin";
    
    if (!isAdmin) {
      throw new AuthorizationError(
        "Only admins can add users to organizations"
      );
    }

    const validatedData = UserOrganizationSchema.parse({
      ...req.body,
      organizationId,
    });

    try {
      const assignment = await addUserToOrganizationServices(validatedData);

      const response = createSuccessResponse(
        assignment,
        "User added to organization successfully"
      );

      res.status(201).json(response);
    } catch (error: any) {
      if (
        error.message === "User not found" ||
        error.message === "Organization not found"
      ) {
        throw new NotFoundError(error.message);
      }

      if (error.message === "User is already a member of this organization") {
        throw new ConflictError(error.message);
      }

      throw error;
    }
  }
);

export const updateUserRole = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userOrganizationId = req.params.id;

    if (!userOrganizationId) {
      throw new ValidationError("User organization ID is required");
    }

    // Check if current user has permission to update roles
    const currentUserRole = (req as any).user?.role;
    const isAdmin = currentUserRole === "admin" || currentUserRole === "superAdmin";
    
    if (!isAdmin) {
      throw new AuthorizationError(
        "Only admins can update user roles"
      );
    }

    const validatedData = RoleUpdateSchema.parse(req.body);

    try {
      const updatedMembership = await updateUserRoleServices(
        userOrganizationId,
        validatedData
      );

      const response = createSuccessResponse(
        updatedMembership,
        "User role updated successfully"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error.message === "User organization membership not found") {
        throw new NotFoundError(error.message);
      }

      throw error;
    }
  }
);

export const setPrimaryOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userOrganizationId = req.params.id;

    if (!userOrganizationId) {
      throw new ValidationError("User organization ID is required");
    }

    const currentUserId = (req as any).user?.id;

    const userOrg = await db.query.userOrganizations.findFirst({
      where: eq(userOrganizations.id, userOrganizationId),
    });

    if (!userOrg) {
      throw new NotFoundError("User organization membership not found");
    }

    if (userOrg.userId !== currentUserId) {
      throw new AuthorizationError(
        "You can only set your own primary organization"
      );
    }

    const validatedData = PrimaryOrganizationSchema.parse(req.body);

    try {
      const updatedMembership = await setPrimaryOrganizationServices(
        userOrganizationId,
        validatedData
      );

      const response = createSuccessResponse(
        updatedMembership,
        "Primary organization updated successfully"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error.message === "User organization membership not found") {
        throw new NotFoundError(error.message);
      }

      throw error;
    }
  }
);

export const removeUserFromOrganization = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userOrganizationId = req.params.id;

    if (!userOrganizationId) {
      throw new ValidationError("User organization ID is required");
    }

    // Check if current user has permission to remove users
    const currentUserRole = (req as any).user?.role;
    const isAdmin = currentUserRole === "admin" || currentUserRole === "superAdmin";
    
    if (!isAdmin) {
      throw new AuthorizationError(
        "Only admins can remove users from organizations"
      );
    }

    try {
      const result = await removeUserFromOrganizationServices(
        userOrganizationId
      );

      const response = createSuccessResponse(
        result,
        "User removed from organization successfully"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error.message === "User organization membership not found") {
        throw new NotFoundError(error.message);
      }

      throw error;
    }
  }
);