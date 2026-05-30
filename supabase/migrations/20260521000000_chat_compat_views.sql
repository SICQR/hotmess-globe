-- =====================================================================
-- DEFENSIVE COMPAT LAYER — chat_threads / chat_messages → canonical
-- Migration: 20260521000000_chat_compat_views
-- =====================================================================
-- STATUS: PRE-WRITTEN, NOT YET APPLIED.
--
-- The deprecated tables chat_threads + chat_messages are planned for DROP
-- on/after 2026-05-21. App-code migration to canonical (conversations /
-- conversation_members / messages) is the preferred long-term fix, but
-- 13 React files write to the deprecated tables and a full refactor is
-- a multi-PR effort.
--
-- This migration is the safety net: it backfills missing canonical rows
-- from the deprecated tables, then replaces the deprecated tables with
-- VIEWS over canonical. App code continues to work unchanged.
--
-- DATA AS OF 2026-05-20:
--   chat_threads        17 rows
--   chat_messages       98 rows
--   conversations       15 rows
--   conversation_members 28 rows
--   messages            43 rows
--   orphan messages (thread_id IS NULL): 0
--
-- Apply this immediately before — or AS — the deprecation drop happens.
-- Reversible: keep a backup of the deprecated tables before applying.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Backfill conversations from chat_threads (only those not yet mirrored)
-- ---------------------------------------------------------------------
INSERT INTO public.conversations (id, created_at, updated_at, title, is_group, created_by, last_message_at)
SELECT
  ct.id,
  ct.created_at,
  ct.updated_at,
  COALESCE(ct.metadata->>'title', NULL),
  COALESCE(ct.thread_type <> 'direct', false),
  -- created_by: resolve from first participant email
  (SELECT p.id FROM public.profiles p WHERE p.email = ct.participant_emails[1] LIMIT 1),
  ct.last_message_at
FROM public.chat_threads ct
WHERE NOT EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = ct.id)
  AND ct.participant_emails IS NOT NULL
  AND array_length(ct.participant_emails, 1) > 0
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.email = ct.participant_emails[1]);

-- ---------------------------------------------------------------------
-- 2. Backfill conversation_members from chat_threads.participant_emails
-- ---------------------------------------------------------------------
INSERT INTO public.conversation_members (conversation_id, user_id, role, joined_at)
SELECT DISTINCT
  ct.id,
  p.id,
  'member',
  ct.created_at
FROM public.chat_threads ct
CROSS JOIN LATERAL unnest(ct.participant_emails) AS pemail
JOIN public.profiles p ON p.email = pemail
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation_members cm
  WHERE cm.conversation_id = ct.id AND cm.user_id = p.id
);

-- ---------------------------------------------------------------------
-- 3. Backfill messages from chat_messages
-- ---------------------------------------------------------------------
INSERT INTO public.messages (id, conversation_id, sender_id, content, attachments, metadata, created_at, updated_at)
SELECT
  cm.id,
  cm.thread_id,
  p.id,
  cm.content,
  COALESCE(to_jsonb(cm.media_urls), '[]'::jsonb),
  jsonb_build_object('message_type', cm.message_type, 'read_by', COALESCE(to_jsonb(cm.read_by), '[]'::jsonb))
    || COALESCE(cm.metadata, '{}'::jsonb),
  cm.created_at,
  cm.created_at
FROM public.chat_messages cm
JOIN public.profiles p ON p.email = cm.sender_email
WHERE cm.thread_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = cm.thread_id)
  AND NOT EXISTS (SELECT 1 FROM public.messages m WHERE m.id = cm.id);

-- ---------------------------------------------------------------------
-- 4. Drop the deprecated tables (their RLS was already on canonical)
-- ---------------------------------------------------------------------
DROP TABLE public.chat_messages CASCADE;
DROP TABLE public.chat_threads  CASCADE;

-- ---------------------------------------------------------------------
-- 5. Create VIEWS with the same names, backed by canonical
-- ---------------------------------------------------------------------
-- chat_threads view — synthesises participant_emails from conversation_members
CREATE VIEW public.chat_threads AS
SELECT
  c.id,
  ARRAY(
    SELECT p.email
    FROM public.conversation_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.conversation_id = c.id
    ORDER BY cm.joined_at
  ) AS participant_emails,
  CASE WHEN c.is_group THEN 'group' ELSE 'direct' END AS thread_type,
  true AS active,
  '{}'::jsonb AS metadata,
  '{}'::jsonb AS unread_count,
  (
    SELECT m.content FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC LIMIT 1
  ) AS last_message,
  c.last_message_at,
  c.created_at,
  c.updated_at,
  ARRAY[]::text[] AS muted_by
FROM public.conversations c;

-- chat_messages view — flattens canonical messages back to legacy shape
CREATE VIEW public.chat_messages AS
SELECT
  m.id,
  m.conversation_id AS thread_id,
  (SELECT p.email FROM public.profiles p WHERE p.id = m.sender_id LIMIT 1) AS sender_email,
  m.content,
  COALESCE(m.metadata->>'message_type', 'text') AS message_type,
  CASE
    WHEN jsonb_typeof(m.metadata->'read_by') = 'array'
    THEN (SELECT ARRAY(SELECT jsonb_array_elements_text(m.metadata->'read_by')))
    ELSE ARRAY[]::text[]
  END AS read_by,
  CASE
    WHEN jsonb_typeof(m.attachments) = 'array'
    THEN (SELECT ARRAY(SELECT jsonb_array_elements_text(m.attachments)))
    ELSE ARRAY[]::text[]
  END AS media_urls,
  m.created_at,
  m.created_at AS created_date,
  m.metadata
FROM public.messages m;

-- ---------------------------------------------------------------------
-- 6. INSTEAD OF triggers so legacy INSERT/UPDATE still works
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_threads_legacy_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  new_conv_id uuid;
  uid uuid;
  email_val text;
BEGIN
  new_conv_id := COALESCE(NEW.id, gen_random_uuid());
  -- Sanity: caller must be an authenticated user in the participant list
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'chat_threads insert requires authenticated user';
  END IF;

  INSERT INTO public.conversations (id, created_at, updated_at, is_group, created_by, last_message_at)
  VALUES (
    new_conv_id,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now()),
    COALESCE(NEW.thread_type, 'direct') <> 'direct',
    auth.uid(),
    NEW.last_message_at
  );

  -- Resolve participant emails → user_ids and insert members
  FOR email_val IN SELECT unnest(NEW.participant_emails) LOOP
    SELECT p.id INTO uid FROM public.profiles p WHERE p.email = email_val LIMIT 1;
    IF uid IS NOT NULL THEN
      INSERT INTO public.conversation_members (conversation_id, user_id)
        VALUES (new_conv_id, uid)
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  NEW.id := new_conv_id;
  RETURN NEW;
END$$;

CREATE TRIGGER chat_threads_legacy_insert_trg
INSTEAD OF INSERT ON public.chat_threads
FOR EACH ROW EXECUTE FUNCTION public.chat_threads_legacy_insert();

CREATE OR REPLACE FUNCTION public.chat_threads_legacy_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.conversations
     SET last_message_at = COALESCE(NEW.last_message_at, last_message_at),
         updated_at      = now()
   WHERE id = OLD.id;
  RETURN NEW;
END$$;

CREATE TRIGGER chat_threads_legacy_update_trg
INSTEAD OF UPDATE ON public.chat_threads
FOR EACH ROW EXECUTE FUNCTION public.chat_threads_legacy_update();

CREATE OR REPLACE FUNCTION public.chat_messages_legacy_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  sender_uuid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'chat_messages insert requires authenticated user';
  END IF;
  IF NEW.sender_email IS NOT NULL THEN
    SELECT p.id INTO sender_uuid FROM public.profiles p WHERE p.email = NEW.sender_email LIMIT 1;
  END IF;
  IF sender_uuid IS NULL THEN sender_uuid := auth.uid(); END IF;

  INSERT INTO public.messages (id, conversation_id, sender_id, content, attachments, metadata, created_at)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.thread_id,
    sender_uuid,
    NEW.content,
    CASE WHEN NEW.media_urls IS NOT NULL AND array_length(NEW.media_urls, 1) > 0
         THEN to_jsonb(NEW.media_urls) ELSE '[]'::jsonb END,
    jsonb_build_object('message_type', COALESCE(NEW.message_type,'text'))
      || jsonb_build_object('read_by', COALESCE(to_jsonb(NEW.read_by), '[]'::jsonb))
      || COALESCE(NEW.metadata, '{}'::jsonb),
    COALESCE(NEW.created_at, COALESCE(NEW.created_date, now()))
  );

  RETURN NEW;
END$$;

CREATE TRIGGER chat_messages_legacy_insert_trg
INSTEAD OF INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.chat_messages_legacy_insert();

COMMENT ON VIEW public.chat_threads IS 'COMPAT VIEW backed by conversations + conversation_members. Plan to drop entirely once app code migrates to canonical.';
COMMENT ON VIEW public.chat_messages IS 'COMPAT VIEW backed by messages. Plan to drop entirely once app code migrates to canonical.';

COMMIT;
