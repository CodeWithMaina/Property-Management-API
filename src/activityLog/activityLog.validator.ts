import { z } from "zod";
import { activityActionEnum } from "../drizzle/schema";

// Extract the enum values
const activityActionValues = activityActionEnum.enumValues;

//IP validation regex
const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipRegex.test(ip);
};

//Metadata schema
export const ActivityMetadataSchema = z.object({
  ipAddress: z.string().refine(isValidIP, {
    message: "Invalid IP address format",
  }).optional(),
  userAgent: z.string().optional(),
  previousValues: z.record(z.any(), z.any()).optional(),
  newValues: z.record(z.any(), z.any()).optional(),
  reason: z.string().optional(),
  location: z.object({
    country: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
  }).optional(),
});

/**
 * Validation schema for creating a new activity log
 */
export const NewActivityLogSchema = z.object({
  id: z.uuid().optional(), // normally auto-generated
  organizationId: z.uuid(),
  actorUserId: z.uuid(),
  action: z.enum(activityActionValues),
  targetTable: z.string().min(1, "Target table is required"),
  targetId: z.string().min(1, "Target ID is required"),
  metadata: ActivityMetadataSchema.optional(),
  createdAt: z.date().optional(), // defaults at DB-level
});

/**
 * Validation schema for query filters on GET /activity-logs
 */
export const ActivityLogFilterSchema = z.object({
  organizationId: z.uuid().optional(),
  actorUserId: z.uuid().optional(),
  action: z.enum(activityActionValues).optional(),
  targetTable: z.string().optional(),
  targetId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(), // Free-text search
  ipAddress: z.string().refine(isValidIP, {
    message: "Invalid IP address format",
  }).optional(),
  status: z.string().optional(), // Add this line for status filtering
});

/**
 * Validation schema for organization logs params
 */
export const OrgParamsSchema = z.object({
  orgId: z.uuid(),
});

/**
 * Validation schema for user logs params
 */
export const UserParamsSchema = z.object({
  userId: z.uuid(),
});

/**
 * Validation schema for target logs params
 */
export const TargetParamsSchema = z.object({
  table: z.string().min(1),
  id: z.string().min(1),
});

/**
 * Validation schema for stats query (organizationId optional)
 */
export const StatsQuerySchema = z.object({
  organizationId: z.uuid().optional(),
});

//Batch validation schema
export const BatchActivityLogSchema = z.array(NewActivityLogSchema);

// Types inferred from Zod
export type NewActivityLogInput = z.infer<typeof NewActivityLogSchema>;
export type ActivityLogFilterInput = z.infer<typeof ActivityLogFilterSchema>;