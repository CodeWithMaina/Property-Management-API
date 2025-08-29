import { Request, Response } from "express";
import {
  getUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  deleteUserService,
  deactivateUserService,
  activateUserService,
} from "./user.service";
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createUserResponse,
  createUsersResponse,
} from "../utils/apiResponse/apiResponse.helper";
import { asyncHandler } from "../utils/errorHandler";
import { UserFilters } from "./user.types";

// In your getUsers controller
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  // Use validatedQuery instead of req.query for validated data
  const validatedQuery = (req as any).validatedQuery || {};
  
  const filters: UserFilters = {
    isActive: validatedQuery.isActive,
    search: validatedQuery.search,
    page: validatedQuery.page,
    limit: validatedQuery.limit,
  };

  const result = await getUsersService(filters);
  
  if (result.pagination) {
    return res.status(200).json(
      createPaginatedResponse(result.data, result.pagination, "Users retrieved successfully")
    );
  }
  
  return res.status(200).json(
    createUsersResponse(result.data, result.pagination, "Users retrieved successfully")
  );
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const user = await getUserByIdService(id);
  
  return res.status(200).json(
    createUserResponse(user, "User retrieved successfully")
  );
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const userData = req.body;
  const actorUserId = (req as any).user?.id; // Assuming user is attached to request by auth middleware
  
  const newUser = await createUserService(userData, actorUserId);
  
  return res.status(201).json(
    createUserResponse(newUser, "User created successfully")
  );
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userData = req.body;
  const actorUserId = (req as any).user?.id;
  
  const updatedUser = await updateUserService(id, userData, actorUserId);
  
  return res.status(200).json(
    createUserResponse(updatedUser, "User updated successfully")
  );
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorUserId = (req as any).user?.id;
  
  const deletedUser = await deleteUserService(id, actorUserId);
  
  return res.status(200).json(
    createSuccessResponse(null, "User deleted successfully")
  );
});

export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorUserId = (req as any).user?.id;
  
  const updatedUser = await deactivateUserService(id, actorUserId);
  
  return res.status(200).json(
    createUserResponse(updatedUser, "User deactivated successfully")
  );
});

export const activateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorUserId = (req as any).user?.id;
  
  const updatedUser = await activateUserService(id, actorUserId);
  
  return res.status(200).json(
    createUserResponse(updatedUser, "User activated successfully")
  );
});