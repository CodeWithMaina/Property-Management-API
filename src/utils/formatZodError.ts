import z from "zod";

/**
 * 🎯 Helper function to format Zod errors
 */
export const formatZodError = (error: z.ZodError): { field: string; message: string }[] => {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message
  }));
};
