/*
# Recreate Admin User with Proper Auth

## Overview
The manually-created admin user may have auth issues due to GoTrue internal state.
This migration deletes the old user and recreates with a standard bcrypt cost factor (10),
matching what GoTrue normally uses.

## Changes
1. Delete existing admin user from auth.users (cascades to profiles)
2. Recreate with bcrypt cost factor 10
3. Re-assign Admin role in profiles
*/

DO $$
DECLARE
  admin_role_id uuid;
  new_user_id uuid;
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'Admin';

  -- Delete existing user if present
  DELETE FROM auth.users WHERE email = 'Joao.americo@tlmmoz.org';

  -- Recreate with bcrypt cost 10 (GoTrue standard)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'Joao.americo@tlmmoz.org',
    crypt('admin123', gen_salt('bf', 10)),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Joao Americo"}',
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- Create profile with Admin role
  INSERT INTO profiles (id, full_name, role_id)
  VALUES (new_user_id, 'Joao Americo', admin_role_id)
  ON CONFLICT (id) DO UPDATE SET
    full_name = 'Joao Americo',
    role_id = admin_role_id;
END $$;
