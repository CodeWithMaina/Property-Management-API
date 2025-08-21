// auth.schema.ts
import { z } from "zod";
import { userRoleEnum } from "../drizzle/schema";
import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";
import { users, properties, leases, activityLogs } from "../drizzle/schema";
import { InferSelectModel } from "drizzle-orm";

export const validateRequest = (schema: ZodObject<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      }
      return res.status(500).json({ error: "Validation failed" });
    }
  };
};

const userBaseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 characters").optional().or(z.literal("")),
});

export const createUserSchema = userBaseSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(userRoleEnum.enumValues).default("tenant"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const passwordResetConfirmSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const userResponseSchema = userBaseSchema.extend({
  id: z.string().uuid(),
  role: z.enum(userRoleEnum.enumValues),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginUserInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;


export type TUserWithRelations = InferSelectModel<typeof users> & {
  properties?: InferSelectModel<typeof properties>[];
  leases?: InferSelectModel<typeof leases>[];
  activityLogs?: InferSelectModel<typeof activityLogs>[];
};