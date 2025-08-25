// auth.route.ts
import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
} from "./auth.controller";
import { authenticateToken } from "../middleware/auth.middleware";

export const authRouter = Router();

// Public routes
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh-token", refreshToken);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);

// Protected routes
authRouter.post("/logout", authenticateToken, logout);
authRouter.get("/me", authenticateToken, getCurrentUser);
authRouter.post("/change-password", authenticateToken, changePassword);

export default authRouter;