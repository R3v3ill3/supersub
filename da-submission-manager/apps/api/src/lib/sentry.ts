/**
 * Sentry Configuration
 * Provides error tracking and performance monitoring for production
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration, httpIntegration, expressIntegration } from '@sentry/node';
import type { Express } from 'express';

/**
 * Initialize Sentry with environment-based configuration
 * Only enables in production or when SENTRY_DSN is explicitly set
 */
export function initSentry(app: Express) {
  const sentryDsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  // Skip initialization if no DSN provided (development/staging)
  if (!sentryDsn) {
    console.log('[sentry] Skipping initialization (no SENTRY_DSN set)');
    return;
  }

  // Initialize Sentry
  Sentry.init({
    dsn: sentryDsn,
    environment,

    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Profiling
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

    integrations: [
      // Express integration for request tracking
      httpIntegration({ tracing: true }),
      expressIntegration({ app }),

      // Profiling integration
      nodeProfilingIntegration(),
    ],

    // Filter out sensitive data
    beforeSend(event) {
      // Remove Authorization headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      // Remove sensitive body data
      if (event.request?.data) {
        const data = event.request.data as any;
        if (data.password) data.password = '[FILTERED]';
        if (data.token) data.token = '[FILTERED]';
        if (data.api_key) data.api_key = '[FILTERED]';
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      'Not allowed by CORS',
      'ECONNREFUSED',
      'ENOTFOUND',
    ],
  });

  console.log(`[sentry] Initialized for environment: ${environment}`);
}

/**
 * Get Sentry request handler middleware
 * Must be used before all other middleware
 * Returns a no-op middleware if Sentry is not configured
 */
export function getSentryRequestHandler() {
  if (!process.env.SENTRY_DSN) {
    return (_req: any, _res: any, next: any) => next();
  }
  return Sentry.requestDataHandler();
}

/**
 * Get Sentry tracing middleware
 * Should be used after request handler but before routes
 * Returns a no-op middleware if Sentry is not configured
 */
export function getSentryTracingHandler() {
  if (!process.env.SENTRY_DSN) {
    return (_req: any, _res: any, next: any) => next();
  }
  return Sentry.tracingHandler();
}

/**
 * Get Sentry error handler middleware
 * Must be used after all routes but before other error handlers
 * Returns a no-op middleware if Sentry is not configured
 */
export function getSentryErrorHandler() {
  if (!process.env.SENTRY_DSN) {
    return (_err: any, _req: any, _res: any, next: any) => next(_err);
  }
  return Sentry.expressErrorHandler();
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

/**
 * Manually capture a message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(user);
  }
}

/**
 * Clear user context
 */
export function clearUser() {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  }
}