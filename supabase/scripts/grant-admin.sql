-- Grant Admin Access
-- Run this in Supabase SQL Editor with your email address

-- Method 1: Using profiles table (role_flags)
UPDATE profiles
SET role_flags = COALESCE(role_flags, '{}'::jsonb) || '{"admin": true}'::jsonb
WHERE email = 'YOUR_EMAIL_HERE';

-- Method 2: Using User table (is_admin)
UPDATE "User"
SET is_admin = true, role = 'admin'
WHERE email = 'YOUR_EMAIL_HERE';

-- Method 3: Using user_roles table
INSERT INTO user_roles (user_id, role, granted_by, created_at)
SELECT id, 'admin', id, NOW()
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify:
SELECT id, email, role_flags, role
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE';
