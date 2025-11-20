-- Development Test User Migration
-- This migration creates a test user for development mode
-- Run this AFTER migrations 001 and 002

-- Create a test user in auth.users for development
-- This allows the dev mode test user ID to satisfy foreign key constraints

-- Note: This uses internal Supabase functions and should only be run in development
-- For production, users will be created through the normal signup flow

-- Insert test user directly into auth.users (if not exists)
-- UUID: 00000000-0000-0000-0000-000000000000
-- This matches the test user ID used in lib/api/auth.ts

DO $$
BEGIN
  -- Check if test user already exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000000'
  ) THEN
    -- Insert test user
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
      is_super_admin,
      confirmation_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'dev@localhost',
      -- This is a hashed version of "devpassword123" - not secure, only for dev
      crypt('devpassword123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Dev User"}',
      false,
      ''
    );

    RAISE NOTICE 'Test user created successfully';
  ELSE
    RAISE NOTICE 'Test user already exists';
  END IF;
END $$;

-- Also create an entry in auth.identities if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = '00000000-0000-0000-0000-000000000000'
  ) THEN
    INSERT INTO auth.identities (
      provider_id,
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000000',
      '{"sub":"00000000-0000-0000-0000-000000000000","email":"dev@localhost"}',
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Test user identity created successfully';
  ELSE
    RAISE NOTICE 'Test user identity already exists';
  END IF;
END $$;

-- Verify the test user was created
SELECT
  id,
  email,
  created_at,
  'Test user ready for development' as status
FROM auth.users
WHERE id = '00000000-0000-0000-0000-000000000000';
