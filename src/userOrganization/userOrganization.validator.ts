// user-organization.validator.ts
import { z } from "zod";
import { userRoleEnum } from "../drizzle/schema";

const PermissionsSchema = z.object({
  canManageProperties: z.boolean().optional(),
  canManageUnits: z.boolean().optional(),
  canManageLeases: z.boolean().optional(),
  canManageTenants: z.boolean().optional(),
  canManageInvoices: z.boolean().optional(),
  canManagePayments: z.boolean().optional(),
  canManageMaintenance: z.boolean().optional(),
  canManageUsers: z.boolean().optional(),
  canViewReports: z.boolean().optional(),
}).default({});

export const UserOrganizationSchema = z.object({
  userId: z.string().uuid("Valid user ID is required"),
  organizationId: z.string().uuid("Valid organization ID is required"),
  role: z.enum(userRoleEnum.enumValues).default("tenant"),
  isPrimary: z.boolean().default(false),
  permissions: PermissionsSchema.optional(),
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