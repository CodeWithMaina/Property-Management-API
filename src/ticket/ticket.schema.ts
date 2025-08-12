import { z } from "zod";

export const ticketUpdateSchema = z.object({
  createdById: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, "Title is required").max(150).optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
}).partial();

export type TTicketUpdateSchema = z.infer<typeof ticketUpdateSchema>;