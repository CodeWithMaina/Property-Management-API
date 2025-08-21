// auth.route.ts
import { Router } from "express";
import { createUser, loginUser, passwordReset, updatePassword } from "./auth.controller";
import { validateRequest } from "./auth.schema";
import { createUserSchema, loginSchema, passwordResetRequestSchema, passwordResetConfirmSchema } from "./auth.schema";

export const authRouter = Router();

authRouter.post("/register", validateRequest(createUserSchema), createUser);
authRouter.post("/login", validateRequest(loginSchema), loginUser);
authRouter.post("/forgot-password", validateRequest(passwordResetRequestSchema), passwordReset);
authRouter.put("/password-reset/:token", validateRequest(passwordResetConfirmSchema), updatePassword);