import { z } from "zod";
import { userRoleEnum } from "../drizzle/schema";

// Base property validation schema
export const PropertySchema = z.object({
  organizationId: z.string().uuid("Organization ID must be a valid UUID"),
  name: z.string().min(1, "Property name is required").max(256, "Property name too long"),
  description: z.string().optional().nullable(),
  addressLine1: z.string().max(256, "Address line 1 too long").optional().nullable(),
  addressLine2: z.string().max(256, "Address line 2 too long").optional().nullable(),
  city: z.string().max(128, "City name too long").optional().nullable(),
  state: z.string().max(128, "State name too long").optional().nullable(),
  postalCode: z.string().max(32, "Postal code too long").optional().nullable(),
  country: z.string().max(128, "Country name too long").optional().nullable(),
  timezone: z.string().max(64, "Timezone too long").optional().nullable(),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional().nullable().default({}),
});

// Partial update schema
export const PartialPropertySchema = PropertySchema.partial();

// Property manager assignment schema
export const PropertyManagerSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID"),
  role: z.enum(userRoleEnum.enumValues).default("manager"),
});

// Query parameters schema for filtering properties - FIXED
export const PropertyQuerySchema = z.object({
  organizationId: z.string().uuid("Organization ID must be a valid UUID").optional().nullable(),
  isActive: z.string().optional().nullable().transform((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined; // Return undefined if not specified
  }),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Types
export type PropertyInput = z.infer<typeof PropertySchema>;
export type PartialPropertyInput = z.infer<typeof PartialPropertySchema>;
export type PropertyManagerInput = z.infer<typeof PropertyManagerSchema>;
export type PropertyQueryParams = z.infer<typeof PropertyQuerySchema>;