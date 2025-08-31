// user.controller.ts
import { Request, Response } from "express";
import {
  getUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  deleteUserService,
  deactivateUserService,
  activateUserService,
  getUserOrganizationsService,
  searchUsersService,
  inviteUserService,
  acceptInviteService,
} from "./user.service";
import {
  createSuccessResponse,
  createPaginatedResponse,
  createUserResponse,
  createUsersResponse,
  createUserOrganizationsResponse,
} from "../utils/apiResponse/apiResponse.helper";
import { asyncHandler, ValidationError } from "../utils/errorHandler";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserFiltersSchema,
  SearchUsersSchema,
  InviteUserSchema,
  AcceptInviteSchema,
} from "./user.validator";

/**
 * @route GET /users
 * @description Get all users with optional filtering and pagination
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager)
 */
export const getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validatedQuery = UserFiltersSchema.parse(req.query);
  
  const result = await getUsersService(validatedQuery);
  
  const response = createPaginatedResponse(
    result.data,
    result.pagination,
    "Users retrieved successfully"
  );

  res.status(200).json(response);
});

/**
 * @route GET /users/:id
 * @description Get specific user details
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager)
 */
export const getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id;

  if (!userId) {
    throw new ValidationError("User ID is required");
  }

  const user = await getUserByIdService(userId);

  const response = createUserResponse(user, "User retrieved successfully");

  res.status(200).json(response);
});

/**
 * @route POST /users
 * @description Create a new user
 * @access Private (Admin/SuperAdmin)
 */
export const createUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validatedData = CreateUserSchema.parse(req.body);
  const actorUserId = (req as any).user?.id;

  const newUser = await createUserService(validatedData, actorUserId);

  const response = createUserResponse(newUser, "User created successfully");

  res.status(201).json(response);
});

/**
 * @route PUT /users/:id
 * @description Update user information
 * @access Private (Admin/SuperAdmin)
 */
export const updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id;

  if (!userId) {
    throw new ValidationError("User ID is required");
  }

  const validatedData = UpdateUserSchema.parse(req.body);
  const actorUserId = (req as any).user?.id;

  const updatedUser = await updateUserService(userId, validatedData, actorUserId);

  const response = createUserResponse(updatedUser, "User updated successfully");

  res.status(200).json(response);
});

/**
 * @route DELETE /users/:id
 * @description Delete a user
 * @access Private (Admin/SuperAdmin)
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id;

  if (!userId) {
    throw new ValidationError("User ID is required");
  }

  const actorUserId = (req as any).user?.id;

  await deleteUserService(userId, actorUserId);

  const response = createSuccessResponse(null, "User deleted successfully");

  res.status(200).json(response);
});

/**
 * @route PATCH /users/:id/deactivate
 * @description Deactivate a user
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager)
 */
export const deactivateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id;

  if (!userId) {
    throw new ValidationError("User ID is required");
  }

  const actorUserId = (req as any).user?.id;

  const updatedUser = await deactivateUserService(userId, actorUserId);

  const response = createUserResponse(updatedUser, "User deactivated successfully");

  res.status(200).json(response);
});

/**
 * @route PATCH /users/:id/activate
 * @description Activate a user
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager)
 */
export const activateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id;

  if (!userId) {
    throw new ValidationError("User ID is required");
  }

  const actorUserId = (req as any).user?.id;

  const updatedUser = await activateUserService(userId, actorUserId);

  const response = createUserResponse(updatedUser, "User activated successfully");

  res.status(200).json(response);
});

/**
 * @route GET /users/:id/organizations
 * @description List organizations a user belongs to
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager)
 */
export const getUserOrganizations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id;

  if (!userId) {
    throw new ValidationError("User ID is required");
  }

  const organizations = await getUserOrganizationsService(userId);

  const response = createUserOrganizationsResponse(
    organizations,
    undefined,
    "User organizations retrieved successfully"
  );

  res.status(200).json(response);
});

/**
 * @route GET /users/search
 * @description Search users by email or phone
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager)
 */
export const searchUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validatedQuery = SearchUsersSchema.parse(req.query);

  const users = await searchUsersService(validatedQuery);

  const response = createUsersResponse(users, undefined, "Users found successfully");

  res.status(200).json(response);
});

/**
 * @route POST /users/invite
 * @description Invite a new user to join an organization
 * @access Private (Admin/SuperAdmin/PropertyOwner/Manager)
 */
export const inviteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const validatedData = InviteUserSchema.parse(req.body);
  const actorUserId = (req as any).user?.id;

  const invite = await inviteUserService(validatedData, actorUserId);

  const response = createSuccessResponse(
    invite,
    "User invited successfully. Invitation email sent."
  );

  res.status(201).json(response);
});

/**
 * @route POST /invites/:token/accept
 * @description Finalize user registration from an invite link
 * @access Public
 */
export const acceptInvite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = req.params.token;
  const validatedData = AcceptInviteSchema.parse(req.body);

  if (!token) {
    throw new ValidationError("Invitation token is required");
  }

  const user = await acceptInviteService(token, validatedData);

  const response = createUserResponse(user, "Invitation accepted successfully. User account created.");

  res.status(200).json(response);
});