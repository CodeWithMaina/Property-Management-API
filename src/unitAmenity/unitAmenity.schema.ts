import { z } from "zod";

export const unitAmenitySchema = z.object({
  unitId: z.string().uuid(),
  amenityId: z.string().uuid(),
});

export type TUnitAmenitySchema = z.infer<typeof unitAmenitySchema>;