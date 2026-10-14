/*
# Create Admin User: Joao Americo

## Overview
Creates the admin user account with email Joao.americo@tlmmoz.org and password admin123.
Assigns the Admin role to this user's profile.

## Changes
1. Insert into auth.users with bcrypt-hashed password
2. Insert into profiles with full_name and Admin role_id
*/

DO $$
DECLARE
  admin_role_id uuid := 'a359b514-a3fb-432c-9ba7-49668145259f';
  new_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'Joao.americo@tlmmoz.org';
  
  IF new_user_id IS NULL THEN
    -- Create the auth user with bcrypt-encrypted password
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
      raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'Joao.americo@tlmmoz.org',
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Joao Americo"}'
    )
    RETURNING id INTO new_user_id;
  END IF;

  -- Create or update the profile with Admin role
  INSERT INTO profiles (id, full_name, role_id)
  VALUES (new_user_id, 'Joao Americo', admin_role_id)
  ON CONFLICT (id) DO UPDATE SET
    full_name = 'Joao Americo',
    role_id = admin_role_id;
END $$;
