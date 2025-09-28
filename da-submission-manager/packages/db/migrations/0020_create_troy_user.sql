-- Create Troy's admin user account
-- This migration adds the requested user account for Troy Burton

-- Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert Troy's user account (using the create_admin_user function if available, or direct insert)
DO $$
BEGIN
    -- Try to use the function if it exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_admin_user') THEN
        PERFORM create_admin_user(
            'troyburton@gmail.com',
            'Troy Burton', 
            '0Rganiser!',
            'super_admin'
        );
    ELSE
        -- Fallback to direct insert if function doesn't exist
        INSERT INTO admin_users (email, name, password_hash, role) 
        VALUES (
            'troyburton@gmail.com', 
            'Troy Burton', 
            crypt('0Rganiser!', gen_salt('bf')), 
            'super_admin'
        ) ON CONFLICT (email) DO NOTHING;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If user already exists or any other error, just log it
        RAISE NOTICE 'User creation skipped: %', SQLERRM;
END
$$;
