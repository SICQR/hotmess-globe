-- ============================================================
-- FRONTEND CONTRACT MIGRATION
-- ============================================================
-- Rule: Every table/function here is referenced by frontend code.
-- Source: grep of .from() and .rpc() calls across src/ and api/.
-- No table is added unless the frontend touches it at runtime.
-- ============================================================

-- ── stories ─────────────────────────────────────────────────
-- Referenced by: src/components/social/Stories.jsx
-- Columns: user_id, media_url, media_type, caption, expires_at,
--          viewed_by (uuid[]), view_count, + FK join to profiles
CREATE TABLE IF NOT EXISTS public.stories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url     TEXT NOT NULL,
  media_type    TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption       TEXT,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  viewed_by     UUID[] NOT NULL DEFAULT '{}',
  view_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stories_user      ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires   ON public.stories(expires_at);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read non-expired stories"
  ON public.stories FOR SELECT TO authenticated
  USING (expires_at > now());

CREATE POLICY "Users can create their own stories"
  ON public.stories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
  ON public.stories FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON public.stories FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Allow viewing viewed_by updates from any authenticated user
-- (Stories.jsx calls .update({ viewed_by, view_count }) on any story)
CREATE POLICY "Any authenticated user can mark story viewed"
  ON public.stories FOR UPDATE TO authenticated
  USING (expires_at > now())
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;


-- ── marketplace_order ────────────────────────────────────────
-- Referenced by: src/pages/DataExport.jsx (.select('*').eq('buyer_email'))
-- This is a GDPR data-export query — needs a simple buyer-scoped table.
-- Intentionally minimal: order records link buyers to products.
CREATE TABLE IF NOT EXISTS public.marketplace_order (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_email    TEXT NOT NULL,
  buyer_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id     UUID,
  product_title  TEXT,
  amount         NUMERIC(10,2),
  currency       TEXT DEFAULT 'GBP',
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','shipped','completed','cancelled','refunded')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_order_buyer ON public.marketplace_order(buyer_email);
CREATE INDEX IF NOT EXISTS idx_marketplace_order_buyer_id ON public.marketplace_order(buyer_id);

ALTER TABLE public.marketplace_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read own orders"
  ON public.marketplace_order FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR buyer_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Sellers can read orders for their products"
  ON public.marketplace_order FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);

CREATE POLICY "Authenticated users can create orders"
  ON public.marketplace_order FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);


-- ── moderation_appeals ───────────────────────────────────────
-- Referenced by: src/components/moderation/AppealForm.jsx
-- Columns: user_email, content_id, content_type, moderation_action_id,
--          appeal_reason, explanation, status, created_at
CREATE TABLE IF NOT EXISTS public.moderation_appeals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email            TEXT NOT NULL,
  content_id            TEXT,
  content_type          TEXT,
  moderation_action_id  UUID,
  appeal_reason         TEXT NOT NULL,
  explanation           TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','under_review','upheld','overturned','dismissed')),
  reviewer_notes        TEXT,
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_appeals_user  ON public.moderation_appeals(user_email);
CREATE INDEX IF NOT EXISTS idx_moderation_appeals_status ON public.moderation_appeals(status);

ALTER TABLE public.moderation_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit and view own appeals"
  ON public.moderation_appeals FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_email = (auth.jwt() ->> 'email'))
  WITH CHECK (auth.uid() = user_id OR user_email = (auth.jwt() ->> 'email'));


-- ── business_amplifications ──────────────────────────────────
-- Referenced by: src/pages/business/BusinessAmplify.jsx (insert)
--                src/pages/business/BusinessInsights.jsx (select)
-- Columns: business_id, signal_type, city, starts_at, duration_hours,
--          budget, title, description, status
CREATE TABLE IF NOT EXISTS public.business_amplifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  signal_type     TEXT NOT NULL,
  city            TEXT NOT NULL DEFAULT 'london',
  starts_at       TIMESTAMPTZ,
  duration_hours  INTEGER NOT NULL DEFAULT 24,
  budget          NUMERIC(10,2) NOT NULL DEFAULT 0,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('draft','scheduled','active','paused','completed','cancelled')),
  impressions     INTEGER NOT NULL DEFAULT 0,
  clicks          INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_biz_amps_business  ON public.business_amplifications(business_id);
CREATE INDEX IF NOT EXISTS idx_biz_amps_status    ON public.business_amplifications(status);
CREATE INDEX IF NOT EXISTS idx_biz_amps_city      ON public.business_amplifications(city);

ALTER TABLE public.business_amplifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage own amplifications"
  ON public.business_amplifications FOR ALL TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_id = auth.uid()
    )
  );


-- ── user_activity ────────────────────────────────────────────
-- Referenced by: src/pages/AccountDeletion.jsx (.delete().eq('user_email'))
-- GDPR: stores activity log entries, deleted as part of account erasure.
CREATE TABLE IF NOT EXISTS public.user_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email  TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_email ON public.user_activity(user_email);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id    ON public.user_activity(user_id);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON public.user_activity FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR user_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Users can delete own activity (GDPR)"
  ON public.user_activity FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR user_email = (auth.jwt() ->> 'email'));


-- ── search_analytics ─────────────────────────────────────────
-- Referenced by: src/hooks/useRevenue.js (.insert({ user_email, search_type, ... }))
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email       TEXT,
  search_type      TEXT NOT NULL,
  query            TEXT,
  results_count    INTEGER DEFAULT 0,
  clicked_result_id TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_user  ON public.search_analytics(user_email);
CREATE INDEX IF NOT EXISTS idx_search_analytics_type  ON public.search_analytics(search_type);
CREATE INDEX IF NOT EXISTS idx_search_analytics_time  ON public.search_analytics(created_at);

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Insert-only for authenticated users (analytics write path)
CREATE POLICY "Authenticated users can log searches"
  ON public.search_analytics FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can read their own search history
CREATE POLICY "Users can read own search history"
  ON public.search_analytics FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR user_email = (auth.jwt() ->> 'email'));


-- ============================================================
-- RPCs REFERENCED BY FRONTEND BUT MISSING
-- ============================================================

-- ── increment_product_views ──────────────────────────────────
-- Referenced by: src/hooks/useProducts.js
-- rpc('increment_product_views', { p_id: productId })
CREATE OR REPLACE FUNCTION public.increment_product_views(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update view_count if the column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'view_count') THEN
    UPDATE products SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_id;
  END IF;
END;
$$;

-- ── increment_product_saves ──────────────────────────────────
-- Referenced by: src/hooks/useProducts.js
-- rpc('increment_product_saves', { p_id: productId })
CREATE OR REPLACE FUNCTION public.increment_product_saves(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'save_count') THEN
    UPDATE products SET save_count = COALESCE(save_count, 0) + 1 WHERE id = p_id;
  END IF;
END;
$$;

-- Ensure products has view_count/save_count columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE public.products ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'save_count'
  ) THEN
    ALTER TABLE public.products ADD COLUMN save_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
