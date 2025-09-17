// organization.validator.ts
import { z } from "zod";

export const OrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(256),
  legalName: z.string().max(256).optional().nullable(),
  taxId: z.string().max(64).optional().nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const PartialOrganizationSchema = OrganizationSchema.partial();

export const OrganizationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
}).refine((data) => data.page > 0, {
  message: "Page must be positive",
  path: ["page"],
});

export type OrganizationInput = z.infer<typeof OrganizationSchema>;
export type PartialOrganizationInput = z.infer<typeof PartialOrganizationSchema>;
export type OrganizationQueryParams = z.infer<typeof OrganizationQuerySchema>;