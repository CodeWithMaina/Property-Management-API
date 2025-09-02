// maintenance.validator.ts
import { z } from "zod";
import { maintenanceStatusEnum, priorityEnum } from "../drizzle/schema";

export const CreateMaintenanceRequestSchema = z.object({
  propertyId: z.string().uuid("Invalid property ID"),
  unitId: z.string().uuid("Invalid unit ID").optional().nullable().transform(val => val ?? undefined),
  title: z.string().min(1, "Title is required").max(256),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(priorityEnum.enumValues).default("medium"),
  scheduledAt: z.coerce.date().optional().nullable().transform(val => val ?? undefined),
});

export const UpdateMaintenanceRequestSchema = z.object({
  title: z.string().max(256).optional(),
  description: z.string().optional(),
  priority: z.enum(priorityEnum.enumValues).optional(),
  scheduledAt: z.coerce.date().optional().nullable().transform(val => val ?? undefined),
  costAmount: z.number().nonnegative("Cost amount must be non-negative").optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).partial();

export const MaintenanceRequestFiltersSchema = z.object({
  status: z.enum(maintenanceStatusEnum.enumValues).optional(),
  priority: z.enum(priorityEnum.enumValues).optional(),
  propertyId: z.string().uuid("Invalid property ID").optional(),
  assignedToUserId: z.string().uuid("Invalid user ID").optional(),
  createdByUserId: z.string().uuid("Invalid user ID").optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const AddCommentSchema = z.object({
  body: z.string().min(1, "Comment body is required"),
});

export const AddAttachmentSchema = z.object({
  fileUrl: z.string().url("Invalid URL format").max(1024),
  fileName: z.string().min(1, "File name is required").max(256),
  contentType: z.string().max(128).optional().nullable().transform(val => val ?? undefined),
  sizeBytes: z.number().int().nonnegative("File size must be non-negative").optional().nullable().transform(val => val ?? undefined),
});

export const ChangeStatusSchema = z.object({
  status: z.enum(maintenanceStatusEnum.enumValues),
  notes: z.string().optional().nullable().transform(val => val ?? undefined),
});

export const AssignRequestSchema = z.object({
  assignedToUserId: z.string().uuid("Invalid user ID"),
});

export const AddEstimateSchema = z.object({
  costAmount: z.number().nonnegative("Cost amount must be non-negative"),
  notes: z.string().optional().nullable().transform(val => val ?? undefined),
});

export type CreateMaintenanceRequestInput = z.infer<typeof CreateMaintenanceRequestSchema>;
export type UpdateMaintenanceRequestInput = z.infer<typeof UpdateMaintenanceRequestSchema>;
export type MaintenanceRequestFilters = z.infer<typeof MaintenanceRequestFiltersSchema>;
export type AddCommentInput = z.infer<typeof AddCommentSchema>;
export type AddAttachmentInput = z.infer<typeof AddAttachmentSchema>;
export type ChangeStatusInput = z.infer<typeof ChangeStatusSchema>;
export type AssignRequestInput = z.infer<typeof AssignRequestSchema>;
export type AddEstimateInput = z.infer<typeof AddEstimateSchema>;