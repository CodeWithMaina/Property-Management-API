import z from "zod";

// Validation Schemas
export const createUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  deviceId: z.string().optional(),
  userAgent: z.string().optional(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const passwordResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
  deviceId: z.string().optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;