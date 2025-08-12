import { z } from "zod";
import { userRoleEnum } from "../drizzle/schema";

export const userUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  email: z.string().email("Invalid email format").max(150).optional(),
  passwordHash: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(userRoleEnum.enumValues).optional(),
  phone: z.string().max(20).optional().nullable(),
}).partial();

export type TUserUpdateSchema = z.infer<typeof userUpdateSchema>;