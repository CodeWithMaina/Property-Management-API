// user.validator.ts
import { z } from "zod";
import { userRoleEnum } from "../drizzle/schema";

export const CreateUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(256),
  email: z.string().email("Invalid email format").max(320),
  phone: z.string().max(64).optional().nullable().transform(val => val ?? undefined),
  isActive: z.boolean().default(true),
  avatarUrl: z.string().url("Invalid URL format").max(1024).optional().nullable().transform(val => val ?? undefined),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const UpdateUserSchema = CreateUserSchema.partial();

export const UserFiltersSchema = z.object({
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  search: z.string().optional(),
   role: z.enum(userRoleEnum.enumValues).optional(),
  organizationId: z.string().uuid("Invalid organization ID").optional(), 
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const SearchUsersSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().optional(),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone must be provided",
});

export const InviteUserSchema = z.object({
  email: z.string().email("Invalid email format").max(320),
  organizationId: z.string().uuid("Invalid organization ID"),
  role: z.enum(userRoleEnum.enumValues),
  invitedBy: z.string().uuid("Invalid user ID").optional().nullable().transform(val => val ?? undefined),
});

export const AcceptInviteSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(256),
  email: z.string().email("Invalid email format").max(320),
  phone: z.string().max(64).optional().nullable().transform(val => val ?? undefined),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserFilters = z.infer<typeof UserFiltersSchema>;
export type SearchUsersInput = z.infer<typeof SearchUsersSchema>;
export type InviteUserInput = z.infer<typeof InviteUserSchema>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;