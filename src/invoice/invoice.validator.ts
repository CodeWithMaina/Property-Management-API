// src/modules/invoice/invoice.validator.ts
import { z } from "zod";

export const InvoiceStatusEnum = z.enum([
  "draft",
  "issued",
  "partiallyPaid",
  "paid",
  "void",
  "overdue",
]);

export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

// Base invoice schema
export const InvoiceSchema = z.object({
  leaseId: z.string().uuid("Lease ID must be a valid UUID"),
  invoiceNumber: z.string().min(1, "Invoice number is required").max(64),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().min(new Date(), "Due date must be in the future"),
  currency: z.string().length(3, "Currency must be 3 characters").default("KES"),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Partial update schema
export const PartialInvoiceSchema = InvoiceSchema.partial();

// Invoice status change schema
export const InvoiceStatusChangeSchema = z.object({
  status: InvoiceStatusEnum,
  reason: z.string().optional(),
  notes: z.string().optional(),
});

// Invoice item schema
export const InvoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(256),
  quantity: z.number().positive("Quantity must be positive").default(1),
  unitPrice: z.number().nonnegative("Unit price must be non-negative").default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Invoice query parameters schema
export const InvoiceQuerySchema = z.object({
  status: InvoiceStatusEnum.optional(),
  leaseId: z.string().uuid("Lease ID must be a valid UUID").optional(),
  organizationId: z.string().uuid("Organization ID must be a valid UUID").optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// Batch generation schema
export const BatchGenerateInvoicesSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  dueDay: z.number().int().min(1).max(28).default(1),
});

// Void invoice schema
export const VoidInvoiceSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

// Reminder schema
export const InvoiceReminderSchema = z.object({
  method: z.enum(["email", "sms", "both"]).default("email"),
  message: z.string().optional(),
});

// Type inference
export type InvoiceInput = z.infer<typeof InvoiceSchema>;
export type PartialInvoiceInput = z.infer<typeof PartialInvoiceSchema>;
export type InvoiceStatusChangeInput = z.infer<typeof InvoiceStatusChangeSchema>;
export type InvoiceItemInput = z.infer<typeof InvoiceItemSchema>;
export type InvoiceQueryParams = z.infer<typeof InvoiceQuerySchema>;
export type BatchGenerateInvoicesInput = z.infer<typeof BatchGenerateInvoicesSchema>;
export type VoidInvoiceInput = z.infer<typeof VoidInvoiceSchema>;
export type InvoiceReminderInput = z.infer<typeof InvoiceReminderSchema>;