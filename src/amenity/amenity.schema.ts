import { z } from "zod";

export const amenityUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  isPropertyAmenity: z.boolean().optional(),
  isUnitAmenity: z.boolean().optional(),
}).partial();

export type TAmenityUpdateSchema = z.infer<typeof amenityUpdateSchema>;