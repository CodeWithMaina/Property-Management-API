// user.route.ts
import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  deactivateUser,
  activateUser,
  getUserOrganizations,
  searchUsers,
  inviteUser,
  acceptInvite,
} from "./user.controller";
import { validate } from "../middleware/validate";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserFiltersSchema,
  SearchUsersSchema,
  InviteUserSchema,
  AcceptInviteSchema,
} from "./user.validator";

export const userRouter = Router();

// Search users
userRouter.get(
  "/users/search",
  validate(SearchUsersSchema, "query"),
  searchUsers
);

// Get all users (with optional filtering)
userRouter.get(
  "/users",
  validate(UserFiltersSchema, "query"),
  getUsers
);

// Get user by ID
userRouter.get(
  "/users/:id",
  getUserById
);

// Create a new user
userRouter.post(
  "/users",
  validate(CreateUserSchema),
  createUser
);

// Update an existing user
userRouter.put(
  "/users/:id",
  validate(UpdateUserSchema),
  updateUser
);

// Delete a user
userRouter.delete(
  "/users/:id",
  deleteUser
);

// Deactivate a user
userRouter.patch(
  "/users/:id/deactivate",
  deactivateUser
);

// Activate a user
userRouter.patch(
  "/users/:id/activate",
  activateUser
);

// Get user organizations
userRouter.get(
  "/users/:id/organizations",
  getUserOrganizations
);


// Invite user
userRouter.post(
  "/users/invite",
  validate(InviteUserSchema),
  inviteUser
);

// Accept invite (public route - no authentication required)
userRouter.post(
  "/invites/:token/accept",
  validate(AcceptInviteSchema),
  acceptInvite
);

export default userRouter;