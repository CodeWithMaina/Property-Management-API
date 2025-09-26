// utils/errorHelpers.ts
import { ZodError } from "zod";
import jwt from "jsonwebtoken";


/**
 * Safely format Zod errors with proper typing
 */
export const formatZodError = (error: ZodError) => {
  return {
    error: "Validation failed",
    details: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
};

/**
 * Safe JWT token generation with environment variable validation
 */
export const generateJwtToken = (payload: object, options?: { expiresIn?: string }): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  return jwt.sign(payload, secret, {
    expiresIn: options?.expiresIn || "1h",
  });
};

/**
 * Safe JWT token verification
 */
export const verifyJwtToken = <T>(token: string): T => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  return jwt.verify(token, secret) as T;
};

/**
 * Generic error handler for controllers
 */
export const handleControllerError = (error: unknown) => {
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: formatZodError(error),
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      body: { error: error.message },
    };
  }

  return {
    status: 500,
    body: { error: "An unexpected error occurred" },
  };
};