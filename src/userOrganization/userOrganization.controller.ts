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
import { userOrganizations } from "../drizzle/schema";
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
    const users = await getOrganizationUsersServices(organizationId);
    const isMember = users.some((user) => user.user.id === currentUserId);
    const isAdmin =
      (req as any).user?.role === "admin" ||
      (req as any).user?.role === "superAdmin";

    if (!isMember && !isAdmin) {
      throw new AuthorizationError(
        "You don't have access to this organization"
      );
    }

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
      with: {
        user: {
          columns: { id: true },
        },
      },
    });

    if (!userOrg) {
      throw new NotFoundError("User organization membership not found");
    }

    if (userOrg.user.id !== currentUserId) {
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
