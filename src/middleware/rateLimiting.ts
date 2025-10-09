// middleware/rateLimiting.ts
import rateLimit from 'express-rate-limit';
import { RateLimitOptions } from '../auth/auth.types';

export const createRateLimiter = (options: RateLimitOptions) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
      },
    },
    statusCode: options.statusCode || 429,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP + endpoint as key
      return `${req.ip}-${req.route?.path || req.path}`;
    },
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
        },
      });
    },
  });
};

// Pre-configured rate limiters
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again in 15 minutes.',
});

export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: 'Too many password reset requests, please try again in an hour.',
});

export const invitationRateLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // 50 invitations per day
  message: 'Invitation limit exceeded, please try again tomorrow.',
});

export const generalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});