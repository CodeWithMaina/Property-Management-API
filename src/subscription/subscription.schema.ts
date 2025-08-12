import { z } from "zod";

export const subscriptionUpdateSchema = z.object({
  userId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional().nullable(),
  isActive: z.boolean().optional(),
}).partial();

export type TSubscriptionUpdateSchema = z.infer<typeof subscriptionUpdateSchema>;