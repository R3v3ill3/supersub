import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../lib/supabase';

// Extend Express Request type to include auth
declare global {
  namespace Express {
    interface Request {
      auth?: {
        user_id: string;
        email?: string;
        role: string;
        user_metadata?: any;
      };
    }
  }
}

/**
 * Extract Supabase auth token from request headers
 */
function extractToken(req: Request): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Authentication middleware - verifies Supabase auth token
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_TOKEN'
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Attach auth payload to request
    req.auth = {
      user_id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'admin',
      user_metadata: user.user_metadata
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
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
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (token) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          req.auth = {
            user_id: user.id,
            email: user.email,
            role: user.user_metadata?.role || 'admin',
            user_metadata: user.user_metadata
          };
        }
      } catch (error) {
        // Ignore errors in optional auth
      }
    }
  }

  next();
}
