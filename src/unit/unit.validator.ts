import { z } from "zod";
import { UnitStatusEnum } from "../drizzle/schema";

// Base Unit Schema
export const UnitSchema = z.object({
  propertyId: z.string().uuid("Property ID must be a valid UUID"),
  code: z.string().min(1, "Unit code is required").max(64, "Unit code must be 64 characters or less"),
  floor: z.number().int("Floor must be an integer").nullable().optional(),
  bedrooms: z.number().int("Bedrooms must be an integer").min(0, "Bedrooms cannot be negative").default(0),
  bathrooms: z.number().int("Bathrooms must be an integer").min(0, "Bathrooms cannot be negative").default(0),
  sizeSqm: z.number().min(0, "Size must be positive").nullable().optional(),
  baseRent: z.number().min(0, "Base rent cannot be negative").default(0),
  status: z.enum(["vacant", "reserved", "occupied", "unavailable"] as const).default("vacant"),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

// Partial Unit Schema for updates
export const PartialUnitSchema = UnitSchema.partial();

// Query parameters for listing units
export const UnitQuerySchema = z.object({
  propertyId: z.string().uuid("Property ID must be a valid UUID").optional(),
  organizationId: z.string().uuid("Organization ID must be a valid UUID").optional(),
  status: z.enum(["vacant", "reserved", "occupied", "unavailable"] as const).optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(20),
});

// Amenity assignment schema
export const UnitAmenitySchema = z.object({
  amenityId: z.string().uuid("Amenity ID must be a valid UUID"),
});

// Status change schema
export const UnitStatusChangeSchema = z.object({
  reason: z.string().optional(),
  notes: z.string().optional(),
});

// Inferred types
export type UnitInput = z.infer<typeof UnitSchema>;
export type PartialUnitInput = z.infer<typeof PartialUnitSchema>;
export type UnitQueryParams = z.infer<typeof UnitQuerySchema>;
export type UnitAmenityInput = z.infer<typeof UnitAmenitySchema>;
export type UnitStatusChangeInput = z.infer<typeof UnitStatusChangeSchema>;