-- E2E test users for CI Playwright smoke tests
-- Fixed UUIDs so migration is idempotent
DO $$
DECLARE
  uid_a uuid := '10000000-0000-0000-0000-000000000001';
  uid_b uuid := '10000000-0000-0000-0000-000000000002';
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at,
    phone, phone_confirmed_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', uid_a, 'authenticated', 'authenticated',
    'test-red@hotmessldn.com', crypt('***REMOVED_PASSWORD***', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Test Red"}',
    FALSE, NOW(), NOW(), NULL, NULL, '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (uid_a, 'test-red@hotmessldn.com', uid_a,
    jsonb_build_object('sub', uid_a::text, 'email', 'test-red@hotmessldn.com'),
    'email', NOW(), NOW(), NOW())
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO public.profiles (id, email, display_name, is_visible, community_attested_at, onboarding_complete)
  VALUES (uid_a, 'test-red@hotmessldn.com', 'Test Red', true, NOW(), true)
  ON CONFLICT (id) DO UPDATE SET
    display_name = 'Test Red', is_visible = true,
    community_attested_at = NOW(), onboarding_complete = true;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at,
    phone, phone_confirmed_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', uid_b, 'authenticated', 'authenticated',
    'test-blue@hotmessldn.com', crypt('***REMOVED_PASSWORD***', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Test Blue"}',
    FALSE, NOW(), NOW(), NULL, NULL, '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (uid_b, 'test-blue@hotmessldn.com', uid_b,
    jsonb_build_object('sub', uid_b::text, 'email', 'test-blue@hotmessldn.com'),
    'email', NOW(), NOW(), NOW())
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO public.profiles (id, email, display_name, is_visible, community_attested_at, onboarding_complete)
  VALUES (uid_b, 'test-blue@hotmessldn.com', 'Test Blue', true, NOW(), true)
  ON CONFLICT (id) DO UPDATE SET
    display_name = 'Test Blue', is_visible = true,
    community_attested_at = NOW(), onboarding_complete = true;
END $$;
