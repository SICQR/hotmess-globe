-- Profile views tracking
CREATE TABLE IF NOT EXISTS public.profile_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_view CHECK (viewer_id != viewed_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_id ON profile_views(viewed_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id ON profile_views(viewer_id);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- You can see views on your own profile
CREATE POLICY "own_profile_views_select" ON public.profile_views
  FOR SELECT USING (auth.uid() = viewed_id);

-- Anyone authenticated can insert a view (but viewer_id must match their auth uid)
CREATE POLICY "insert_profile_view" ON public.profile_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- Dedupe: only store 1 view per viewer per viewed per 24h
CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_views_daily
  ON profile_views(viewer_id, viewed_id, (viewed_at::date));
