/**
 * Validation Middleware
 * Provides a clean way to validate requests using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validates request body against a Zod schema
 * Returns 400 with detailed error messages on validation failure
 */
export function validateBody(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((e) =>
          `${e.path.join('.')}: ${e.message}`
        ).join(', ');

        return res.status(400).json({
          error: 'Validation failed',
          message: errorMessages,
          details: error.errors
        });
      }

      // Unexpected error during validation
      console.error('[validate] Unexpected validation error:', error);
      return res.status(500).json({
        error: 'Internal server error during validation'
      });
    }
  };
}

/**
 * Validates request query parameters against a Zod schema
 * Returns 400 with detailed error messages on validation failure
 */
export function validateQuery(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((e) =>
          `${e.path.join('.')}: ${e.message}`
        ).join(', ');

        return res.status(400).json({
          error: 'Invalid query parameters',
          message: errorMessages,
          details: error.errors
        });
      }

      console.error('[validate] Unexpected validation error:', error);
      return res.status(500).json({
        error: 'Internal server error during validation'
      });
    }
  };
}

/**
 * Validates request path parameters against a Zod schema
 * Returns 400 with detailed error messages on validation failure
 */
export function validateParams(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((e) =>
          `${e.path.join('.')}: ${e.message}`
        ).join(', ');

        return res.status(400).json({
          error: 'Invalid path parameters',
          message: errorMessages,
          details: error.errors
        });
      }

      console.error('[validate] Unexpected validation error:', error);
      return res.status(500).json({
        error: 'Internal server error during validation'
      });
    }
  };
}

/**
 * Generic validation function for custom validation logic
 * Useful when you need to validate across multiple request parts
 */
export function validate(
  validationFn: (req: Request) => Promise<void> | void
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await validationFn(req);
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((e) =>
          `${e.path.join('.')}: ${e.message}`
        ).join(', ');

        return res.status(400).json({
          error: 'Validation failed',
          message: errorMessages,
          details: error.errors
        });
      }

      // If error has a status code, use it
      const statusCode = error.statusCode || error.status || 400;
      return res.status(statusCode).json({
        error: error.message || 'Validation failed'
      });
    }
  };
}