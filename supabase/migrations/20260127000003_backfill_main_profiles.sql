-- Multi-Profile Personas: Backfill MAIN profiles for existing users
-- Creates one MAIN profile per existing User row

-- Backfill MAIN profiles for all existing users who have a valid auth_user_id
-- Only insert for users that exist in auth.users to avoid FK violations
INSERT INTO public.profiles (account_id, kind, type_key, type_label, active, inherit_mode)
SELECT 
  u.auth_user_id,
  'MAIN',
  'MAIN',
  'Main Profile',
  true,
  'FULL_INHERIT'
FROM public."User" u
INNER JOIN auth.users au ON au.id = u.auth_user_id
WHERE u.auth_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Also create default visibility rule (PUBLIC) for all MAIN profiles
INSERT INTO public.profile_visibility_rules (profile_id, rule_type, rule_config, priority, enabled)
SELECT 
  p.id,
  'PUBLIC',
  '{}'::jsonb,
  100,
  true
FROM public.profiles p
WHERE p.kind = 'MAIN'
AND NOT EXISTS (
  SELECT 1 FROM public.profile_visibility_rules pvr
  WHERE pvr.profile_id = p.id
  AND pvr.rule_type = 'PUBLIC'
);

-- Backfill existing messages with sender_profile_id
-- Match sender_email to User email to get auth_user_id, then find their MAIN profile
UPDATE public.messages m
SET sender_profile_id = p.id
FROM public."User" u
INNER JOIN public.profiles p ON p.account_id = u.auth_user_id AND p.kind = 'MAIN'
WHERE m.sender_email = u.email
AND m.sender_profile_id IS NULL;

-- Backfill conversation_participants from existing chat_threads
-- For each participant email, find their auth user and MAIN profile
INSERT INTO public.conversation_participants (conversation_id, account_id, profile_id)
SELECT DISTINCT ON (ct.id, u.auth_user_id)
  ct.id,
  u.auth_user_id,
  p.id
FROM public.chat_threads ct
CROSS JOIN LATERAL unnest(ct.participant_emails) AS participant_email
INNER JOIN public."User" u ON u.email = participant_email
INNER JOIN public.profiles p ON p.account_id = u.auth_user_id AND p.kind = 'MAIN'
WHERE u.auth_user_id IS NOT NULL
ON CONFLICT (conversation_id, account_id) DO NOTHING;
