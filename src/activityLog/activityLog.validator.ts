// activityLog.validator.ts
import { z } from "zod";
import { activityActionEnum } from "../drizzle/schema";
import { ActivityAction, TargetTables } from "./activity.helper";

// Extract the enum values
const activityActionValues = activityActionEnum.enumValues;

// IP validation regex
const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipRegex.test(ip);
};

// Common target tables validation
const targetTableValues = Object.values(TargetTables) as [string, ...string[]];

// Metadata schema
export const ActivityMetadataSchema = z.object({
  ipAddress: z.string().refine(isValidIP, {
    message: "Invalid IP address format",
  }).optional(),
  userAgent: z.string().max(512).optional(),
  previousValues: z.record(z.string(), z.any()).optional(),
  newValues: z.record(z.string(), z.any()).optional(),
  reason: z.string().max(500).optional(),
  location: z.object({
    country: z.string().max(128).optional(),
    city: z.string().max(128).optional(),
    region: z.string().max(128).optional(),
  }).optional(),
  status: z.string().max(50).optional(),
}).strict();

/**
 * Validation schema for creating a new activity log
 */
export const NewActivityLogSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid("Organization ID must be a valid UUID"),
  actorUserId: z.string().uuid("Actor user ID must be a valid UUID"),
  action: z.enum(activityActionValues, {
    message: `Action must be one of: ${activityActionValues.join(", ")}`
  }),
  targetTable: z.enum(targetTableValues, {
    message: `Target table must be one of: ${targetTableValues.join(", ")}`
  }),
  targetId: z.string().min(1, "Target ID is required").max(64, "Target ID too long"),
  description: z.string().max(512).optional(),
  changes: z.record(z.string(), z.any()).optional(),
  ipAddress: z.string().refine(isValidIP, {
    message: "Invalid IP address format",
  }).optional().nullable(),
  userAgent: z.string().max(256).optional().nullable(),
  metadata: ActivityMetadataSchema.optional(),
  createdAt: z.coerce.date().optional(),
}).strict();

/**
 * Validation schema for query filters on GET /activity-logs
 */
export const ActivityLogFilterSchema = z.object({
  organizationId: z.string().uuid().optional(),
  actorUserId: z.string().uuid().optional(),
  action: z.enum(activityActionValues).optional(),
  targetTable: z.enum(targetTableValues).optional(),
  targetId: z.string().optional(),
  startDate: z.coerce.date()
    .refine(date => date <= new Date(), { message: "Start date cannot be in the future" })
    .optional(),
  endDate: z.coerce.date()
    .refine(date => date <= new Date(), { message: "End date cannot be in the future" })
    .optional(),
  page: z.coerce.number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1)
    .optional(),
  limit: z.coerce.number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(20)
    .optional(),
  search: z.string().max(100, "Search query too long").optional(),
  ipAddress: z.string().refine(isValidIP, {
    message: "Invalid IP address format",
  }).optional(),
  status: z.string().max(50).optional(),
}).strict();

/**
 * Validation schema for organization logs params
 */
export const OrgParamsSchema = z.object({
  orgId: z.string().uuid("Organization ID must be a valid UUID"),
}).strict();

/**
 * Validation schema for user logs params
 */
export const UserParamsSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID"),
}).strict();

/**
 * Validation schema for target logs params
 */
export const TargetParamsSchema = z.object({
  table: z.enum(targetTableValues),
  id: z.string().min(1, "Target ID is required"),
}).strict();

/**
 * Validation schema for stats query (organizationId optional)
 */
export const StatsQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
  timeframe: z.enum(['1h', '24h', '7d', '30d', '90d', 'all']).default('7d'),
}).strict();

/**
 * Batch validation schema with size limits
 */
export const BatchActivityLogSchema = z.array(NewActivityLogSchema)
  .min(1, "Batch must contain at least one log")
  .max(100, "Batch cannot exceed 100 logs");

// Types inferred from Zod
export type NewActivityLogInput = z.infer<typeof NewActivityLogSchema>;
export type ActivityLogFilterInput = z.infer<typeof ActivityLogFilterSchema>;
export type ActivityMetadata = z.infer<typeof ActivityMetadataSchema>;