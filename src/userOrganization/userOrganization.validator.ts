// user-organization.validator.ts
import { z } from "zod";
import { userRoleEnum } from "../drizzle/schema";

export const UserOrganizationSchema = z.object({
  userId: z.string().uuid("Valid user ID is required"),
  organizationId: z.string().uuid("Valid organization ID is required"),
  role: z.enum(userRoleEnum.enumValues).default("tenant"),
  isPrimary: z.boolean().default(false),
});

export const RoleUpdateSchema = z.object({
  role: z.enum(userRoleEnum.enumValues),
});

export const PrimaryOrganizationSchema = z.object({
  isPrimary: z.boolean(),
});

export type UserOrganizationInput = z.infer<typeof UserOrganizationSchema>;
export type RoleUpdateInput = z.infer<typeof RoleUpdateSchema>;
export type PrimaryOrganizationInput = z.infer<typeof PrimaryOrganizationSchema>;