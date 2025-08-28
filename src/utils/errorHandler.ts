// src/utils/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

// Custom Error Types
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: any,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = "AppError";

    // Capture stack trace (excluding constructor call)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, 429);
    this.name = "RateLimitError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed") {
    super(message, 500);
    this.name = "DatabaseError";
    this.isOperational = false;
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

// Logging utility (can be integrated with your logging service)
const logError = (error: Error, req?: Request): void => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: req?.originalUrl,
    method: req?.method,
    ip: req?.ip,
    userAgent: req?.get("User-Agent"),
    userId: (req as any)?.user?.id, // Adjust based on your auth setup
  };

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("🚨 ERROR:", errorLog);
  }

  // TODO: Integrate with your logging service (Sentry, Datadog, etc.)
  // loggingService.captureException(error, { extra: errorLog });
};

// Global error handler middleware
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logError(error, req);

  let statusCode = 500;
  let message = "Internal server error";
  let code = "INTERNAL_ERROR";
  let details: any = undefined;
  let isOperational = false;

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.name;
    details = error.details;
    isOperational = error.isOperational;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    code = "VALIDATION_ERROR";
    details = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    isOperational = true;
  } else if (error instanceof JsonWebTokenError) {
    statusCode = 401;
    message = "Invalid token";
    code = "INVALID_TOKEN";
    isOperational = true;
  } else if (error instanceof TokenExpiredError) {
    statusCode = 401;
    message = "Token expired";
    code = "TOKEN_EXPIRED";
    isOperational = true;
  } else if (
    error.name === "MongoError" ||
    error.name === "PrismaClientKnownRequestError"
  ) {
    statusCode = 400;
    message = "Database operation failed";
    code = "DATABASE_ERROR";
    isOperational = true;

    // Handle specific database errors
    if ((error as any).code === 11000) {
      statusCode = 409;
      message = "Duplicate entry";
      code = "DUPLICATE_ENTRY";
    }
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message,
      code,
      details,
      timestamp: new Date().toISOString(),
      requestId: (req as any).id, // If you're using request ID middleware
    },
  };

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === "production" && !isOperational) {
    errorResponse.error.message = "Internal server error";
    errorResponse.error.details = undefined;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper for controllers
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler middleware
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Utility function to create standardized error responses
export const createError = (options: {
  message: string;
  statusCode?: number;
  details?: any;
  isOperational?: boolean;
}): AppError => {
  return new AppError(
    options.message,
    options.statusCode,
    options.details,
    options.isOperational
  );
};

// Error codes enum for consistent error handling
export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
  CONFLICT_ERROR: "CONFLICT_ERROR",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
} as const;
