import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getSupabase } from '../lib/supabase';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthPayload {
  user_id: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

export interface LoginResult {
  success: boolean;
  user?: AdminUser;
  token?: string;
  error?: string;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly BCRYPT_ROUNDS = 12;

  /**
   * Generate JWT token for admin user
   */
  static generateToken(user: AdminUser): string {
    const payload = {
      user_id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'da-submission-manager',
      audience: 'admin-interface'
    });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): AuthPayload | null {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'da-submission-manager',
        audience: 'admin-interface'
      }) as AuthPayload;
      
      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Verify password
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Login admin user
   */
  static async login(email: string, password: string, userAgent?: string, ipAddress?: string): Promise<LoginResult> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // Find admin user by email
      const { data: user, error: userError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (userError || !user) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Verify password using bcrypt directly (simpler approach)
      const isPasswordValid = await this.verifyPassword(password, user.password_hash);
      
      if (!isPasswordValid) {
        return { success: false, error: 'Invalid email or password' };
      }

      const adminUser: AdminUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      // Generate JWT token
      const token = this.generateToken(adminUser);

      // Create session record
      const tokenHash = await bcrypt.hash(token, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const { error: sessionError } = await supabase
        .from('admin_sessions')
        .insert({
          admin_user_id: adminUser.id,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          user_agent: userAgent?.substring(0, 500) || null,
          ip_address: ipAddress || null
        });

      if (sessionError) {
        console.warn('Failed to create session record:', sessionError);
        // Continue with login even if session creation fails
      }

      // Update last login timestamp
      await supabase
        .from('admin_users')
        .update({ 
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', adminUser.id);

      return {
        success: true,
        user: adminUser,
        token
      };

    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Get admin user by ID
   */
  static async getUserById(userId: string): Promise<AdminUser | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data: user, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (error || !user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Create admin user (super_admin only)
   */
  static async createAdminUser(
    email: string,
    name: string,
    password: string,
    role: 'admin' | 'super_admin' = 'admin'
  ): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user directly
      const { data: user, error: createError } = await supabase
        .from('admin_users')
        .insert({
          email,
          name,
          password_hash: passwordHash,
          role
        })
        .select('*')
        .single();

      if (createError) {
        if (createError.code === '23505') { // Unique violation
          return { success: false, error: 'Email already exists' };
        }
        return { success: false, error: createError.message };
      }

      if (!user) {
        return { success: false, error: 'Failed to create user' };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_active: user.is_active,
          last_login_at: user.last_login_at,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      };

    } catch (error: any) {
      console.error('Create user error:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  /**
   * Logout (invalidate session)
   */
  static async logout(token: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const tokenHash = await bcrypt.hash(token, 10);
      
      // Mark session as inactive
      const { error } = await supabase
        .from('admin_sessions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('token_hash', tokenHash);

      return !error;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Validate session exists and is active
   */
  static async validateSession(token: string, userId: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const tokenHash = await bcrypt.hash(token, 10);

      const { data: session, error } = await supabase
        .from('admin_sessions')
        .select('*')
        .eq('admin_user_id', userId)
        .eq('token_hash', tokenHash)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .single();

      return !error && !!session;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      await supabase
        .from('admin_sessions')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }
}
