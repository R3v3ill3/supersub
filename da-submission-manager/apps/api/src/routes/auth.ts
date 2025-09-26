import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth';
import { 
  requireAuth, 
  requireSuperAdmin, 
  rateLimitLogin, 
  clearLoginRateLimit,
  cleanupSessions 
} from '../middleware/auth';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required')
});

const createUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'super_admin']).default('admin')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

/**
 * POST /api/auth/login
 * Admin user login
 */
router.post('/api/auth/login', rateLimitLogin, async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip;

    const result = await AuthService.login(email, password, userAgent, ipAddress);

    if (!result.success) {
      return res.status(401).json({
        error: result.error,
        code: 'LOGIN_FAILED'
      });
    }

    // Clear rate limiting on successful login
    clearLoginRateLimit(req);

    // Set secure HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res.cookie('auth_token', result.token, cookieOptions);

    res.json({
      success: true,
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role,
        last_login_at: result.user!.last_login_at
      },
      token: result.token // Also send in response for Bearer auth
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'LOGIN_ERROR'
    });
  }
});

/**
 * POST /api/auth/logout
 * Admin user logout
 */
router.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    const token = req.get('Authorization')?.substring(7) || req.cookies?.auth_token;
    
    if (token) {
      await AuthService.logout(token);
    }

    // Clear cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current admin user info
 */
router.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await AuthService.getUserById(req.auth!.user_id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        last_login_at: user.last_login_at,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user info',
      code: 'USER_INFO_ERROR'
    });
  }
});

/**
 * POST /api/auth/users
 * Create new admin user (super_admin only)
 */
router.post('/api/auth/users', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { email, name, password, role } = createUserSchema.parse(req.body);

    const result = await AuthService.createAdminUser(email, name, password, role);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: 'CREATE_USER_FAILED'
      });
    }

    res.status(201).json({
      success: true,
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role,
        created_at: result.user!.created_at
      }
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      code: 'CREATE_USER_ERROR'
    });
  }
});

/**
 * GET /api/auth/users
 * List admin users (super_admin only)
 */
router.get('/api/auth/users', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { getSupabase } = await import('../lib/supabase');
    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, email, name, role, is_active, last_login_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      users: users || []
    });

  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      error: 'Failed to list users',
      code: 'LIST_USERS_ERROR'
    });
  }
});

/**
 * PUT /api/auth/users/:userId/status
 * Activate/deactivate admin user (super_admin only)
 */
router.put('/api/auth/users/:userId/status', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = z.object({
      is_active: z.boolean()
    }).parse(req.body);

    // Prevent deactivating yourself
    if (userId === req.auth!.user_id && !is_active) {
      return res.status(400).json({
        error: 'Cannot deactivate your own account',
        code: 'SELF_DEACTIVATION'
      });
    }

    const { getSupabase } = await import('../lib/supabase');
    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: user, error } = await supabase
      .from('admin_users')
      .update({ 
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, email, name, role, is_active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      user
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Update user status error:', error);
    res.status(500).json({
      error: 'Failed to update user status',
      code: 'UPDATE_STATUS_ERROR'
    });
  }
});

/**
 * PUT /api/auth/password
 * Change current user password
 */
router.put('/api/auth/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    // Verify current password
    const currentUser = await AuthService.getUserById(req.auth!.user_id);
    if (!currentUser) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Re-authenticate with current password
    const loginResult = await AuthService.login(
      currentUser.email, 
      currentPassword,
      req.get('User-Agent'),
      req.ip
    );

    if (!loginResult.success) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Update password
    const hashedPassword = await AuthService.hashPassword(newPassword);
    
    const { getSupabase } = await import('../lib/supabase');
    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { error } = await supabase
      .from('admin_users')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.auth!.user_id);

    if (error) {
      throw error;
    }

    // Invalidate all existing sessions for this user (force re-login)
    await supabase
      .from('admin_sessions')
      .update({ is_active: false })
      .eq('admin_user_id', req.auth!.user_id);

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.'
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      code: 'CHANGE_PASSWORD_ERROR'
    });
  }
});

/**
 * GET /api/auth/health
 * Check authentication system health
 */
router.get('/api/auth/health', cleanupSessions, (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      jwt_auth: true,
      session_management: true,
      rate_limiting: true,
      role_based_access: true
    }
  });
});

export default router;
