// src/middleware/validate.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { createErrorResponse } from '../utils/apiResponse/apiResponse.helper';

export type Source = 'body' | 'query' | 'params';

export interface ValidateOptions {
  /**
   * When true, will run schema.parseAsync instead of safeParseAsync.
   * Default: false (safeParseAsync) — we prefer safeParseAsync to avoid throwing.
   */
  throwOnError?: boolean;
}

/**
 * A robust validation middleware factory that works for body, query and params.
 *
 * - Uses ZodSchema (avoids deprecated ZodTypeAny).
 * - Uses safeParseAsync so validation doesn't throw; we format error response consistently.
 * - Assigns validated values back to req.* (cast to any because Express Request generics
 *   cannot be altered at runtime).
 *
 * Usage:
 *   router.post('/x', validate(createUserSchema, 'body'), handler)
 */
export const validate =
  <T extends ZodSchema<any>>(
    schema: T,
    source: Source = 'body',
    opts: ValidateOptions = {}
  ): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    // pick raw input from the chosen source
    const raw = source === 'body' ? req.body : source === 'query' ? req.query : req.params;

    try {
      if (opts.throwOnError) {
        // If consumer explicitly wants throwing behavior (rare)
        const validated = await schema.parseAsync(raw);
        if (source === 'body') req.body = validated as any;
        else if (source === 'query') req.query = validated as any;
        else req.params = validated as any;
        return next();
      }

      // safe parse (returns an object with success: boolean)
      const result = await schema.safeParseAsync(raw);

      if (!result.success) {
        // Convert Zod issues into your API error format
        const validationErrors = result.error.issues.map((issue) => ({
          field: issue.path.length ? issue.path.join('.') : '(root)',
          message: issue.message,
          code: 'VALIDATION_ERROR',
        }));

        return res.status(400).json(
          createErrorResponse('Validation failed', 'VALIDATION_ERROR', validationErrors)
        );
      }

      // Assign validated value back to request. We cast to `any` because
      // Express Request generic types are static and can't be changed at runtime.
      const validatedData = result.data;
      if (source === 'body') req.body = validatedData as any;
      else if (source === 'query') req.query = validatedData as any;
      else req.params = validatedData as any;

      return next();
    } catch (error) {
      // If it's a ZodError (rare here because we used safeParseAsync) handle it
      if (error instanceof ZodError) {
        const validationErrors = error.issues.map((issue) => ({
          field: issue.path.length ? issue.path.join('.') : '(root)',
          message: issue.message,
          code: 'VALIDATION_ERROR',
        }));

        return res.status(400).json(
          createErrorResponse('Validation failed', 'VALIDATION_ERROR', validationErrors)
        );
      }

      // Unknown error -> 500
      console.error('Validation middleware unexpected error:', error);
      return res.status(500).json(createErrorResponse('Internal server error', 'INTERNAL_SERVER_ERROR'));
    }
  };
