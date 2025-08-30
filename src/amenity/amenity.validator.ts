// amenities.validator.ts
import { z } from "zod";

// Base amenity validation schema
export const AmenitySchema = z.object({
  organizationId: z.string().uuid("Organization ID must be a valid UUID"),
  name: z.string().min(1, "Amenity name is required").max(128, "Amenity name too long"),
  description: z.string().optional().nullable(),
});

// Partial update schema
export const PartialAmenitySchema = AmenitySchema.partial();

// Query parameters schema for filtering amenities
export const AmenityQuerySchema = z.object({
  organizationId: z.string().uuid("Organization ID must be a valid UUID").optional().nullable(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Types
export type AmenityInput = z.infer<typeof AmenitySchema>;
export type PartialAmenityInput = z.infer<typeof PartialAmenitySchema>;
export type AmenityQueryParams = z.infer<typeof AmenityQuerySchema>;