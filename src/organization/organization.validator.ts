// organization.validator.ts
import { z } from "zod";
import { userRoleEnum } from "../drizzle/schema";

// Base organization schema
export const OrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(256),
  legalName: z.string().max(256).optional().nullable(),
  taxId: z.string().max(64).optional().nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

// Partial organization schema for updates
export const PartialOrganizationSchema = OrganizationSchema.partial();

// User organization assignment schema
export const UserOrganizationSchema = z.object({
  userId: z.string().uuid("Valid user ID is required"),
  organizationId: z.string().uuid("Valid organization ID is required"),
  role: z.enum(userRoleEnum.enumValues).default("tenant"),
  isPrimary: z.boolean().default(false),
});

// Partial user organization schema for updates
export const PartialUserOrganizationSchema = UserOrganizationSchema.partial();

// Role update schema
export const RoleUpdateSchema = z.object({
  role: z.enum(userRoleEnum.enumValues),
});

// Primary organization update schema
export const PrimaryOrganizationSchema = z.object({
  isPrimary: z.boolean(),
});

// Query parameters schema
export const OrganizationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

// Type exports
export type OrganizationInput = z.infer<typeof OrganizationSchema>;
export type PartialOrganizationInput = z.infer<typeof PartialOrganizationSchema>;
export type UserOrganizationInput = z.infer<typeof UserOrganizationSchema>;
export type PartialUserOrganizationInput = z.infer<typeof PartialUserOrganizationSchema>;
export type RoleUpdateInput = z.infer<typeof RoleUpdateSchema>;
export type PrimaryOrganizationInput = z.infer<typeof PrimaryOrganizationSchema>;
export type OrganizationQueryParams = z.infer<typeof OrganizationQuerySchema>;

