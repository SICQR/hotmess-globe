-- Moderation queue and user strikes tables
-- Created: 2026-02-27

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type text NOT NULL,
  content_id uuid,
  content_preview text,
  media_urls text[],
  reported_by uuid,
  report_reason text,
  priority text DEFAULT 'standard',
  status text DEFAULT 'pending',
  action_taken text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_strikes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  reason text NOT NULL,
  moderation_queue_id uuid REFERENCES public.moderation_queue(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_strikes ENABLE ROW LEVEL SECURITY;

-- Admin-only access: users with is_admin = true on the "User" table
CREATE POLICY "admin_select_moderation_queue" ON public.moderation_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public."User" u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

CREATE POLICY "admin_update_moderation_queue" ON public.moderation_queue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public."User" u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

CREATE POLICY "admin_insert_moderation_queue" ON public.moderation_queue
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."User" u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

CREATE POLICY "admin_select_user_strikes" ON public.user_strikes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public."User" u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

CREATE POLICY "admin_insert_user_strikes" ON public.user_strikes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."User" u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON public.moderation_queue(priority);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_created ON public.moderation_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_strikes_user_id ON public.user_strikes(user_id);
