// lease.validator.ts - Alternative for older Zod versions
import { z } from "zod";
import { 
  LeaseStatusEnum
} from "../drizzle/schema";

// Base lease schema
export const LeaseSchema = z.object({
  organizationId: z.string().uuid("Organization ID must be a valid UUID"),
  propertyId: z.string().uuid("Property ID must be a valid UUID"),
  unitId: z.string().uuid("Unit ID must be a valid UUID"),
  tenantUserId: z.string().uuid("Tenant user ID must be a valid UUID"),
  startDate: z.coerce.date("Start date must be a valid date"),
  endDate: z.coerce.date("End date must be a valid date")
    .refine((date) => date > new Date(), "End date must be in the future"),
  rentAmount: z.coerce.number("Rent amount must be a number")
    .positive("Rent amount must be positive"),
  depositAmount: z.coerce.number("Deposit amount must be a number")
    .nonnegative("Deposit amount must be non-negative").default(0),
  dueDayOfMonth: z.coerce.number("Due day must be a number")
    .min(1, "Due day must be at least 1")
    .max(28, "Due day must be at most 28").default(1),
  billingCurrency: z.string()
    .min(3, "Currency must be at least 3 characters")
    .max(3, "Currency must be at most 3 characters").default("KES"),
  lateFeePercent: z.coerce.number("Late fee percent must be a number")
    .min(0, "Late fee percent must be non-negative")
    .max(100, "Late fee percent cannot exceed 100").default(0),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

// Partial update schema
export const PartialLeaseSchema = LeaseSchema.partial();

// Query parameters schema
export const LeaseQuerySchema = z.object({
  organizationId: z.string().uuid("Organization ID must be a valid UUID").optional(),
  propertyId: z.string().uuid("Property ID must be a valid UUID").optional(),
  tenantUserId: z.string().uuid("Tenant user ID must be a valid UUID").optional(),
  status: z.enum(["draft", "active", "pendingMoveIn", "ended", "terminated", "cancelled"] as const).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive("Page must be a positive integer").default(1),
  limit: z.coerce.number().int().positive("Limit must be a positive integer").max(100, "Limit cannot exceed 100").default(20),
});

// Status change schema
export const LeaseStatusChangeSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(255, "Reason cannot exceed 255 characters"),
  notes: z.string().optional(),
  effectiveDate: z.coerce.date().optional().default(new Date()),
});

// Renew lease schema
export const LeaseRenewalSchema = z.object({
  startDate: z.coerce.date("Start date must be a valid date"),
  endDate: z.coerce.date("End date must be a valid date"),
  rentAmount: z.coerce.number("Rent amount must be a number")
    .positive("Rent amount must be positive"),
  notes: z.string().optional(),
});

// Type inference
export type LeaseInput = z.infer<typeof LeaseSchema>;
export type PartialLeaseInput = z.infer<typeof PartialLeaseSchema>;
export type LeaseQueryParams = z.infer<typeof LeaseQuerySchema>;
export type LeaseStatusChangeInput = z.infer<typeof LeaseStatusChangeSchema>;
export type LeaseRenewalInput = z.infer<typeof LeaseRenewalSchema>;