import { z } from "zod";

export const billingPlanUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  price: z.number().min(0, "Price must be positive").optional(),
  interval: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  maxProperties: z.number().int().min(1, "Must have at least 1 property").optional(),
}).partial();

export type TBillingPlanUpdateSchema = z.infer<typeof billingPlanUpdateSchema>;