-- Admin Authentication System
-- Creates tables for admin users and session management

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin sessions table for JWT token management
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  ip_address INET,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash);

-- Row Level Security (RLS) policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users can only read their own data (except super_admins)
CREATE POLICY admin_users_select_own ON admin_users
  FOR SELECT
  USING (
    auth.jwt() ->> 'user_id' = id::text OR 
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- Policy: Only super_admins can insert new admin users
CREATE POLICY admin_users_insert_super_admin ON admin_users
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'super_admin');

-- Policy: Admin users can update their own data (super admins can change roles)
CREATE POLICY admin_users_update_own ON admin_users
  FOR UPDATE
  USING (
    auth.jwt() ->> 'user_id' = id::text OR 
    auth.jwt() ->> 'role' = 'super_admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'user_id' = id::text OR 
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- Policy: Only super_admins can delete admin users
CREATE POLICY admin_users_delete_super_admin ON admin_users
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'super_admin');

-- Policy: Admin users can manage their own sessions
CREATE POLICY admin_sessions_own ON admin_sessions
  FOR ALL
  USING (auth.jwt() ->> 'user_id' = admin_user_id::text);

-- Function to hash passwords (using pgcrypto extension)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to create admin user with hashed password
CREATE OR REPLACE FUNCTION create_admin_user(
  p_email TEXT,
  p_name TEXT,
  p_password TEXT,
  p_role TEXT DEFAULT 'admin'
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Validate role
  IF p_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Insert new admin user
  INSERT INTO admin_users (email, name, password_hash, role)
  VALUES (p_email, p_name, crypt(p_password, gen_salt('bf')), p_role)
  RETURNING id INTO new_user_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify admin password
CREATE OR REPLACE FUNCTION verify_admin_password(
  p_email TEXT,
  p_password TEXT
) RETURNS TABLE(user_id UUID, name TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.name, au.role
  FROM admin_users au
  WHERE au.email = p_email 
    AND au.is_active = TRUE
    AND au.password_hash = crypt(p_password, au.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last login timestamp
CREATE OR REPLACE FUNCTION update_admin_last_login(p_user_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE admin_users 
  SET last_login_at = now(), updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default super admin user (password: 'admin123' - CHANGE IN PRODUCTION!)
-- This is only for initial setup, should be changed immediately
INSERT INTO admin_users (email, name, password_hash, role) 
VALUES (
  'admin@localhost', 
  'System Administrator', 
  crypt('admin123', gen_salt('bf')), 
  'super_admin'
) ON CONFLICT (email) DO NOTHING;
