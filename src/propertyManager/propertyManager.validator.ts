import { z } from "zod";
import { userRoleEnum } from "../drizzle/schema";

// Property manager assignment schema
export const PropertyManagerSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID"),
  role: z.enum(userRoleEnum.enumValues).default("manager"),
});

// Types
export type PropertyManagerInput = z.infer<typeof PropertyManagerSchema>;