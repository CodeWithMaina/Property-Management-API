import { z } from "zod";

export const CreateUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(256),
  email: z.string().email("Invalid email format").max(320),
  phone: z.string().max(64).optional().nullable(),
  isActive: z.boolean().default(true),
  avatarUrl: z.string().url("Invalid URL format").max(1024).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const UpdateUserSchema = CreateUserSchema.partial();

export const UserFiltersSchema = z.object({
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserFilters = z.infer<typeof UserFiltersSchema>;