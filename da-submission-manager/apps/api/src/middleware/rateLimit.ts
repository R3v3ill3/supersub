import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiting middleware configurations for different route types
 * Prevents abuse and protects against DoS attacks
 */

/**
 * Standard rate limiter for general API routes
 * 100 requests per 15 minutes per IP
 */
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting in development
  skip: (req: Request) => process.env.NODE_ENV === 'development',
  handler: (req: Request, res: Response) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 900 // 15 minutes in seconds
    });
  }
});

/**
 * Strict limiter for submission creation (public-facing)
 * 5 requests per 15 minutes per IP
 * Prevents spam and abuse of AI generation
 */
export const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 submissions per 15 minutes
  message: {
    error: 'Submission limit exceeded. Please wait before creating another submission.',
    code: 'SUBMISSION_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => process.env.NODE_ENV === 'development',
  keyGenerator: (req: Request) => {
    // Use IP address as the key
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    console.warn(`Submission rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'You have created too many submissions. Please wait 15 minutes before trying again.',
      code: 'SUBMISSION_RATE_LIMIT_EXCEEDED',
      retryAfter: 900
    });
  }
});

/**
 * AI generation limiter (per submission ID)
 * 3 requests per hour per submission
 * Prevents excessive AI API costs
 */
export const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each submission to 3 generation attempts per hour
  message: {
    error: 'AI generation limit exceeded for this submission. Please wait before regenerating.',
    code: 'AI_GENERATION_RATE_LIMIT_EXCEEDED',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => process.env.NODE_ENV === 'development',
  validate: { trustProxy: false }, // Disable validation warnings - we handle proxy correctly
  keyGenerator: (req: Request) => {
    // Use submission ID from params as the key
    const submissionId = req.params.submissionId || req.body.submissionId;
    return `ai_gen_${submissionId}`;
  },
  handler: (req: Request, res: Response) => {
    const submissionId = req.params.submissionId || req.body.submissionId;
    console.warn(`AI generation rate limit exceeded for submission: ${submissionId} from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many generation attempts for this submission. Please wait before trying again.',
      code: 'AI_GENERATION_RATE_LIMIT_EXCEEDED',
      retryAfter: 3600,
      hint: 'You can review your existing draft while waiting'
    });
  }
});

/**
 * Survey response limiter
 * 10 requests per hour per IP
 * Prevents abuse of survey endpoint
 */
export const surveyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 survey responses per hour
  message: {
    error: 'Survey submission limit exceeded. Please wait before submitting again.',
    code: 'SURVEY_RATE_LIMIT_EXCEEDED',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => process.env.NODE_ENV === 'development',
  handler: (req: Request, res: Response) => {
    console.warn(`Survey rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many survey submissions. Please wait before trying again.',
      code: 'SURVEY_RATE_LIMIT_EXCEEDED',
      retryAfter: 3600
    });
  }
});

/**
 * Admin route limiter (less strict, authenticated users)
 * 300 requests per 15 minutes per user
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Higher limit for authenticated admin users
  message: {
    error: 'Admin rate limit exceeded. Please slow down your requests.',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => process.env.NODE_ENV === 'development',
  keyGenerator: (req: Request) => {
    // Use authenticated user ID if available, otherwise IP
    const userId = req.auth?.user_id;
    return userId ? `admin_${userId}` : `admin_ip_${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    console.warn(`Admin rate limit exceeded for user: ${req.auth?.user_id || req.ip}`);
    res.status(429).json({
      error: 'Too many admin requests. Please slow down.',
      code: 'ADMIN_RATE_LIMIT_EXCEEDED',
      retryAfter: 900
    });
  }
});

/**
 * Authentication attempt limiter
 * 5 attempts per 15 minutes per IP
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: {
    error: 'Too many login attempts. Please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req: Request, res: Response) => {
    console.warn(`Authentication rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many login attempts. Your account may be locked for security. Please try again in 15 minutes.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: 900
    });
  }
});