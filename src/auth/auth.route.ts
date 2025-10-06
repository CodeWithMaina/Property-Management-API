// auth.route.ts
import { Router } from "express";
import {
  createUser,
  loginUser,
  refreshToken,
  passwordReset,
  updatePassword,
  logout,
} from "./auth.controller";
import {
  validateRefreshToken,
  createAuthMiddleware,
  PermissionKey,
} from "../middleware/auth.middleware";

export const authRouter = Router();

// Public routes
authRouter.post("/auth/register", createUser);
authRouter.post("/auth/login", loginUser);
authRouter.post("/auth/refresh-token", validateRefreshToken, refreshToken);
authRouter.post("/auth/forgot-password", passwordReset);
authRouter.post("/auth/reset-password", updatePassword);

// Protected routes
authRouter.post(
  "/auth/logout",
  createAuthMiddleware({ requireAuth: true }),
  logout
);

// Example of protected routes with different access levels
authRouter.get(
  "/auth/profile",
  ...createAuthMiddleware({ requireAuth: true }),
  (req, res) => {
    res.json({ user: req.user });
  }
);

// Using typed permissions
const adminPermissions: PermissionKey[] = [
  'canManageUsers',
  'canInviteUsers',
  'canManageOrganizationSettings'
];

authRouter.get(
  "/auth/admin",
  ...createAuthMiddleware({ 
    requireAuth: true,
    requireOrg: true,
    roles: ["admin", "superAdmin"],
    permissions: adminPermissions
  }),
  (req, res) => {
    res.json({ 
      message: "Admin access granted",
      user: req.user,
      orgId: req.orgId,
      permissions: req.permissions
    });
  }
);