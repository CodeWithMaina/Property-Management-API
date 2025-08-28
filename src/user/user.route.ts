import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  deactivateUser,
  activateUser,
} from "./user.controller";
import { validate } from "../middleware/validate";
import { CreateUserSchema, UpdateUserSchema, UserFiltersSchema } from "./user.validator";

export const userRouter = Router();

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

export default userRouter;

// import { Router } from "express";
// import {
//   getUsers,
//   getUserById,
//   createUser,
//   updateUser,
//   deleteUser,
//   deactivateUser,
//   activateUser,
// } from "./user.controller";
// import { validate } from "../middleware/validate";
// import { CreateUserSchema, UpdateUserSchema, UserFiltersSchema } from "./user.validator";
// import { authenticate } from "../middleware/authorization/authenticate";
// import authorize from "../middleware/authorization/authorize";

// export const userRouter = Router();

// // Apply authentication to all routes
// userRouter.use(authenticate);

// // Get all users (with optional filtering)
// userRouter.get(
//   "/users",
//   authorize(["admin", "superAdmin", "propertyOwner", "manager"]),
//   validate(UserFiltersSchema, "query"),
//   getUsers
// );

// // Get user by ID
// userRouter.get(
//   "/users/:id",
//   authorize(["admin", "superAdmin", "propertyOwner", "manager"]),
//   getUserById
// );

// // Create a new user
// userRouter.post(
//   "/users",
//   authorize(["admin", "superAdmin"]),
//   validate(CreateUserSchema),
//   createUser
// );

// // Update an existing user
// userRouter.put(
//   "/users/:id",
//   authorize(["admin", "superAdmin"]),
//   validate(UpdateUserSchema),
//   updateUser
// );

// // Delete a user
// userRouter.delete(
//   "/users/:id",
//   authorize(["admin", "superAdmin"]),
//   deleteUser
// );

// // Deactivate a user
// userRouter.patch(
//   "/users/:id/deactivate",
//   authorize(["admin", "superAdmin", "propertyOwner", "manager"]),
//   deactivateUser
// );

// // Activate a user
// userRouter.patch(
//   "/users/:id/activate",
//   authorize(["admin", "superAdmin", "propertyOwner", "manager"]),
//   activateUser
// );

// export default userRouter;