import { z } from "zod";

export const propertyAmenitySchema = z.object({
  propertyId: z.string().uuid(),
  amenityId: z.string().uuid(),
});

export type TPropertyAmenitySchema = z.infer<typeof propertyAmenitySchema>;