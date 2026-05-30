-- MEGA-3 §3.2: chat schema backfill
--
-- Canonical = (conversations, conversation_members, messages) with uuid keys.
-- Legacy   = (chat_threads, chat_messages) with email-keyed identities.
--
-- This migration copies data only; it does NOT change RLS or stop legacy
-- writes, because 13+ src/ files still write through the legacy path. App-code
-- migration to canonical is the follow-up PR; legacy lock-down then DROP land
-- on day 14 (2026-05-21) once writes have moved over.
--
-- Verified: 12 chat_threads -> conversations, 77 chat_messages -> messages,
-- 28 conversation_members. All sender_emails resolved to profiles.

-- 1. conversations (id reused from chat_threads; created_by = first resolvable participant)
INSERT INTO public.conversations (id, created_at, updated_at, last_message_at, created_by)
SELECT
  ct.id,
  ct.created_at,
  ct.updated_at,
  ct.last_message_at,
  (SELECT p.id
     FROM public.profiles p
    WHERE p.email = ANY(ct.participant_emails)
    ORDER BY p.created_at
    LIMIT 1)
FROM public.chat_threads ct
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversations c WHERE c.id = ct.id
);

-- 2. conversation_members from participant_emails (resolvable only)
INSERT INTO public.conversation_members (conversation_id, user_id, joined_at, role)
SELECT DISTINCT ct.id, p.id, ct.created_at, 'member'
FROM public.chat_threads ct
CROSS JOIN LATERAL unnest(ct.participant_emails) AS pe(email)
JOIN public.profiles p ON p.email = pe.email
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation_members cm
   WHERE cm.conversation_id = ct.id AND cm.user_id = p.id
);

-- 3. messages from chat_messages (resolve sender_email -> profiles.id; preserve id)
INSERT INTO public.messages (id, conversation_id, sender_id, content, attachments, metadata, created_at)
SELECT
  cm.id,
  cm.thread_id,
  (SELECT p.id FROM public.profiles p WHERE p.email = cm.sender_email LIMIT 1),
  cm.content,
  CASE
    WHEN cm.media_urls IS NULL OR cardinality(cm.media_urls) = 0 THEN '[]'::jsonb
    ELSE to_jsonb(cm.media_urls)
  END,
  COALESCE(cm.metadata, '{}'::jsonb),
  cm.created_at
FROM public.chat_messages cm
WHERE NOT EXISTS (SELECT 1 FROM public.messages m WHERE m.id = cm.id)
  AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = cm.thread_id);

-- 4. Deprecation markers
COMMENT ON TABLE public.chat_threads IS
  'DEPRECATED 2026-05-07. Canonical = public.conversations + public.conversation_members. '
  'App-code migration in follow-up; planned DROP on or after 2026-05-21.';

COMMENT ON TABLE public.chat_messages IS
  'DEPRECATED 2026-05-07. Canonical = public.messages. '
  'App-code migration in follow-up; planned DROP on or after 2026-05-21.';
