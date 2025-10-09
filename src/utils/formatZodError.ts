import z from "zod";
import { ValidationError } from "./apiResponse/apiResponse.types";

/**
 * 🎯 Helper function to format Zod errors (quick fix version)
 */
export const formatZodError = (error: z.ZodError): ValidationError[] => {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: `VALIDATION_${err.code.toUpperCase()}` // Convert Zod code to your format
  }));
};