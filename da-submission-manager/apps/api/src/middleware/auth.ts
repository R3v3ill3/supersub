import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthPayload } from '../services/auth';

// Extend Express Request type to include auth
declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/**
 * Extract JWT token from request headers or cookies
 */
function extractToken(req: Request): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie as fallback
  if (req.cookies && req.cookies.auth_token) {
    return req.cookies.auth_token;
  }

  return null;
}

/**
 * Authentication middleware - verifies JWT token
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_TOKEN'
    });
  }

  const payload = AuthService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }

  // Attach auth payload to request
  req.auth = payload;
  next();
}

/**
 * Role-based authorization middleware
 */
export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
        required: roles,
        current: req.auth.role
      });
    }

    next();
  };
}

/**
 * Super admin only middleware
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  return requireRole('super_admin')(req, res, next);
}

/**
 * Optional authentication middleware - adds auth info if token is present
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (token) {
    const payload = AuthService.verifyToken(token);
    if (payload) {
      req.auth = payload;
    }
  }

  next();
}

/**
 * User can only access their own resources
 */
export function requireOwnership(userIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_AUTH'
      });
    }

    const requestedUserId = req.params[userIdParam];
    const currentUserId = req.auth.user_id;

    // Super admins can access any resource
    if (req.auth.role === 'super_admin') {
      return next();
    }

    // Regular users can only access their own resources
    if (requestedUserId !== currentUserId) {
      return res.status(403).json({ 
        error: 'Can only access your own resources',
        code: 'OWNERSHIP_REQUIRED'
      });
    }

    next();
  };
}

/**
 * Rate limiting middleware (simple implementation)
 */
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const LOGIN_ATTEMPTS_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  const clientId = req.ip || 'unknown';
  const now = Date.now();

  const attempts = loginAttempts.get(clientId);
  
  if (attempts) {
    // Reset if window has passed
    if (now - attempts.lastAttempt > LOGIN_WINDOW_MS) {
      loginAttempts.delete(clientId);
    } else if (attempts.count >= LOGIN_ATTEMPTS_LIMIT) {
      return res.status(429).json({
        error: 'Too many login attempts',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((LOGIN_WINDOW_MS - (now - attempts.lastAttempt)) / 1000)
      });
    }
  }

  // Track this attempt
  const currentAttempts = loginAttempts.get(clientId) || { count: 0, lastAttempt: now };
  currentAttempts.count++;
  currentAttempts.lastAttempt = now;
  loginAttempts.set(clientId, currentAttempts);

  next();
}

/**
 * Clear rate limiting for successful login
 */
export function clearLoginRateLimit(req: Request) {
  const clientId = req.ip || 'unknown';
  loginAttempts.delete(clientId);
}

/**
 * Session cleanup middleware (run periodically)
 */
export function cleanupSessions(req: Request, res: Response, next: NextFunction) {
  // Run cleanup asynchronously without blocking the request
  AuthService.cleanupExpiredSessions().catch(console.error);
  next();
}
