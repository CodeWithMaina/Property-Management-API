// auth/auth.route.ts
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
import { validate } from "../middleware/validate";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./auth.validator";

export const authRouter = Router();

// Public routes
authRouter.post("/auth/register", validate(registerSchema, 'body'), register);
authRouter.post("/auth/login", validate(loginSchema, 'body'), login);
authRouter.post("/auth/refresh-token", validate(refreshTokenSchema, 'body'), refreshToken);
authRouter.post("/auth/forgot-password", validate(forgotPasswordSchema, 'body'), forgotPassword);
authRouter.post("/auth/reset-password", validate(resetPasswordSchema, 'body'), resetPassword);

// Protected routes
authRouter.post("/auth/logout", authenticateToken, logout);
authRouter.get("/auth/me", authenticateToken, getCurrentUser);
authRouter.post("/auth/change-password", authenticateToken, validate(changePasswordSchema, 'body'), changePassword);