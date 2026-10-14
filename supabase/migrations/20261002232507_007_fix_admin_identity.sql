/*
# Fix Admin User Identity Record

## Overview
Adds the missing auth.identities record for the admin user.
GoTrue requires this record to authenticate users.
The email column is generated, so we don't insert into it.

## Changes
1. Insert identity record with provider_id = user's email address
*/

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'Joao.americo@tlmmoz.org';

  IF admin_user_id IS NOT NULL THEN
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      'Joao.americo@tlmmoz.org',
      admin_user_id,
      jsonb_build_object(
        'sub', admin_user_id::text,
        'email', 'Joao.americo@tlmmoz.org',
        'email_verified', true
      ),
      'email',
      NULL,
      now(),
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
