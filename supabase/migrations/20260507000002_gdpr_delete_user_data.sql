-- MEGA-3 §3.1: GDPR right-to-be-forgotten cascade RPC + audit log
-- Verified end-to-end on production with synthetic user (purges all uuid-keyed
-- user-data tables, anonymises messages/chat_messages, deletes email-keyed
-- legacy rows, writes audit log, then cascades auth.users -> profiles).
--
-- Storage object cleanup is NOT done here (Supabase guards direct deletion of
-- storage.objects); the calling API route must purge via the Storage API.
-- Stripe subscription cancellation is also handled out-of-band by the API
-- route that initiates the deletion request.

CREATE TABLE IF NOT EXISTS public.gdpr_deletion_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_hash  text NOT NULL,
  deleted_at    timestamptz NOT NULL DEFAULT now(),
  requested_by  text,
  table_counts  jsonb
);

ALTER TABLE public.gdpr_deletion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gdpr_log_admin_only" ON public.gdpr_deletion_log;
CREATE POLICY "gdpr_log_admin_only"
  ON public.gdpr_deletion_log FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_gdpr_log_deleted_at
  ON public.gdpr_deletion_log (deleted_at DESC);

COMMENT ON TABLE public.gdpr_deletion_log IS
  'Audit trail for GDPR deletions. user_id_hash is sha256(user_id::text). Admin-only RLS.';


CREATE OR REPLACE FUNCTION public.delete_user_data(
  p_user_id      uuid,
  p_requested_by text DEFAULT 'self'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  rec            record;
  cnt            bigint;
  total_counts   jsonb := '{}'::jsonb;
  v_user_id_hash text;
  v_user_email   text;
  delete_cols    text[] := ARRAY[
    'user_id','owner_id','seller_id','buyer_id',
    'from_user_id','to_user_id','tapper_id','tapped_id',
    'auth_user_id','blocker_id','blocked_id',
    'creator_id','host_id','organizer_id',
    'referrer_id','referred_id','recipient_id'
  ];
  null_cols      text[] := ARRAY[
    'sender_id','reviewer_id','responder_user_id',
    'reviewed_by','created_by','requested_by',
    'triggered_by','escalator_id','invited_by'
  ];
  is_privileged  boolean;
BEGIN
  is_privileged := session_user IN ('service_role','postgres','supabase_admin');
  IF NOT is_privileged THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'delete_user_data: caller not authenticated';
    END IF;
    IF auth.uid() <> p_user_id
       AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    THEN
      RAISE EXCEPTION 'delete_user_data: not authorized';
    END IF;
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  v_user_id_hash := encode(extensions.digest(p_user_id::text, 'sha256'), 'hex');

  -- Anonymise uuid-keyed canonical chat
  UPDATE public.messages
     SET sender_id   = NULL,
         content     = '[deleted]',
         attachments = '[]'::jsonb,
         metadata    = '{}'::jsonb
   WHERE sender_id = p_user_id;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  total_counts := total_counts || jsonb_build_object('messages.anonymized', cnt);

  -- Anonymise email-keyed legacy chat
  IF v_user_email IS NOT NULL THEN
    UPDATE public.chat_messages
       SET sender_email = '[deleted]',
           content      = '[deleted]',
           media_urls   = NULL,
           metadata     = '{}'::jsonb
     WHERE sender_email = v_user_email;
    GET DIAGNOSTICS cnt = ROW_COUNT;
    total_counts := total_counts || jsonb_build_object('chat_messages.anonymized', cnt);
  END IF;

  -- SET NULL pass: preserve referenced rows but strip user identity. uuid-typed only.
  FOR rec IN
    SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables  t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE c.table_schema = 'public'
       AND t.table_type   = 'BASE TABLE'
       AND c.data_type    = 'uuid'
       AND c.column_name  = ANY(null_cols)
       AND c.table_name NOT IN (
         'messages','chat_messages','gdpr_deletion_log','audit_logs','isolation_audit_log',
         'aa_escalation_log','operator_audit_log','feature_flag_audit_log'
       )
  LOOP
    BEGIN
      EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I = $1',
                     rec.table_name, rec.column_name, rec.column_name)
        USING p_user_id;
      GET DIAGNOSTICS cnt = ROW_COUNT;
      IF cnt > 0 THEN
        total_counts := total_counts ||
          jsonb_build_object('null.' || rec.table_name || '.' || rec.column_name, cnt);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      total_counts := total_counts ||
        jsonb_build_object('err_null.' || rec.table_name || '.' || rec.column_name, SQLERRM);
    END;
  END LOOP;

  -- DELETE pass: rows that ARE this user's data. uuid-typed only.
  FOR rec IN
    SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables  t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE c.table_schema = 'public'
       AND t.table_type   = 'BASE TABLE'
       AND c.data_type    = 'uuid'
       AND c.column_name  = ANY(delete_cols)
       AND c.table_name NOT IN (
         'messages','chat_messages','gdpr_deletion_log',
         'audit_logs','isolation_audit_log','aa_escalation_log',
         'operator_audit_log','feature_flag_audit_log',
         'profiles' -- handled at end via auth.users CASCADE
       )
  LOOP
    BEGIN
      EXECUTE format('DELETE FROM public.%I WHERE %I = $1',
                     rec.table_name, rec.column_name)
        USING p_user_id;
      GET DIAGNOSTICS cnt = ROW_COUNT;
      IF cnt > 0 THEN
        total_counts := total_counts ||
          jsonb_build_object(rec.table_name || '.' || rec.column_name, cnt);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      total_counts := total_counts ||
        jsonb_build_object('err.' || rec.table_name || '.' || rec.column_name, SQLERRM);
    END;
  END LOOP;

  -- Email-keyed legacy tables (no user_id column to enumerate)
  IF v_user_email IS NOT NULL THEN
    DELETE FROM public.chat_threads WHERE v_user_email = ANY(participant_emails);
    GET DIAGNOSTICS cnt = ROW_COUNT;
    total_counts := total_counts || jsonb_build_object('chat_threads', cnt);

    DELETE FROM public.taps
     WHERE tapper_email = v_user_email OR tapped_email = v_user_email;
    GET DIAGNOSTICS cnt = ROW_COUNT;
    total_counts := total_counts || jsonb_build_object('taps.email', cnt);

    DELETE FROM public.trusted_contacts WHERE contact_email = v_user_email;
    GET DIAGNOSTICS cnt = ROW_COUNT;
    total_counts := total_counts || jsonb_build_object('trusted_contacts.contact_email', cnt);
  END IF;

  total_counts := total_counts || jsonb_build_object(
    'storage.objects', 'caller-must-purge-via-storage-api'
  );

  INSERT INTO public.gdpr_deletion_log (user_id_hash, deleted_at, requested_by, table_counts)
  VALUES (v_user_id_hash, now(), p_requested_by, total_counts);

  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'user_id_hash', v_user_id_hash,
    'deleted_at',   now(),
    'counts',       total_counts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_data(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid, text) TO service_role;

COMMENT ON FUNCTION public.delete_user_data(uuid, text) IS
  'GDPR cascade. service_role + admin + self only. Storage cleanup and Stripe cancel handled by /api/account/delete.';
