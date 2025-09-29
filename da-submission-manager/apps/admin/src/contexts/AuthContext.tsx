import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  last_login_at?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface AuthContextValue {
  user: AdminUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const mapSupabaseUser = (user: User): AdminUser => {
  const role = user.user_metadata?.role === 'super_admin' ? 'super_admin' : 'admin';
  const nameFromMetadata =
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
    user.email ||
    'Admin User';

  return {
    id: user.id,
    email: user.email ?? '',
    name: nameFromMetadata,
    role,
    last_login_at: user.last_sign_in_at ?? undefined,
    created_at: user.created_at,
    metadata: user.user_metadata ?? undefined,
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const isAuthenticated = Boolean(user);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    const supabaseUser = nextSession?.user;
    setUser(supabaseUser ? mapSupabaseUser(supabaseUser) : null);
  }, []);

  const checkAuth = useCallback(async () => {
    if (isLoading && hasCheckedAuth) {
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      applySession(data.session ?? null);
    } catch (error) {
      console.error('Auth check failed:', error);
      applySession(null);
    } finally {
      setIsLoading(false);
      setHasCheckedAuth(true);
    }
  }, [applySession, hasCheckedAuth, isLoading]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        applySession(data.session ?? null);
        setHasCheckedAuth(true);
        return { success: true };
      } catch (error: any) {
        console.error('Login error:', error);
        const fallbackMessage =
          error?.message ||
          (typeof error === 'string' ? error : 'Login failed');
        return { success: false, error: fallbackMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      applySession(null);
      setHasCheckedAuth(false);
      localStorage.removeItem('auth_token');
      setIsLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    if (!hasCheckedAuth) {
      checkAuth();
    }
  }, [checkAuth, hasCheckedAuth]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
      setIsLoading(false);
      setHasCheckedAuth(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated,
      login,
      logout,
      checkAuth,
    }),
    [checkAuth, isAuthenticated, isLoading, login, logout, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


