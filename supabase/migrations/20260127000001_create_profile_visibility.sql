-- Multi-Profile Personas: Profile overrides and visibility rules

-- Profile overrides table (stores JSON overrides for secondary profiles)
CREATE TABLE IF NOT EXISTS public.profile_overrides (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  overrides_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  photos_mode TEXT NOT NULL DEFAULT 'INHERIT' CHECK (photos_mode IN ('INHERIT', 'REPLACE', 'ADD')),
  photos_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_overrides_profile_id ON public.profile_overrides(profile_id);

-- Updated at trigger for profile_overrides
DROP TRIGGER IF EXISTS trg_profile_overrides_set_updated_at ON public.profile_overrides;
CREATE TRIGGER trg_profile_overrides_set_updated_at
BEFORE UPDATE ON public.profile_overrides
FOR EACH ROW EXECUTE FUNCTION public.profiles_set_updated_at();

-- Profile visibility rules table
CREATE TABLE IF NOT EXISTS public.profile_visibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('PUBLIC', 'ALLOWLIST_USERS', 'BLOCKLIST_USERS', 'FILTER_VIEWER_ATTRIBUTES')),
  rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_visibility_rules_profile_id ON public.profile_visibility_rules(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_visibility_rules_enabled ON public.profile_visibility_rules(profile_id, enabled, priority);

-- Updated at trigger for visibility rules
DROP TRIGGER IF EXISTS trg_profile_visibility_rules_set_updated_at ON public.profile_visibility_rules;
CREATE TRIGGER trg_profile_visibility_rules_set_updated_at
BEFORE UPDATE ON public.profile_visibility_rules
FOR EACH ROW EXECUTE FUNCTION public.profiles_set_updated_at();

-- Profile allowlist users table
CREATE TABLE IF NOT EXISTS public.profile_allowlist_users (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, viewer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_allowlist_profile ON public.profile_allowlist_users(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_allowlist_viewer ON public.profile_allowlist_users(viewer_user_id);

-- Profile blocklist users table
CREATE TABLE IF NOT EXISTS public.profile_blocklist_users (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, viewer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_blocklist_profile ON public.profile_blocklist_users(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_blocklist_viewer ON public.profile_blocklist_users(viewer_user_id);

-- Profile viewer filters (normalized alternative to JSON filters)
CREATE TABLE IF NOT EXISTS public.profile_viewer_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attribute TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('IN', 'NOT_IN', 'EQ', 'NE', 'GTE', 'LTE', 'RADIUS_KM')),
  value_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_viewer_filters_profile ON public.profile_viewer_filters(profile_id);

-- Updated at trigger for viewer filters
DROP TRIGGER IF EXISTS trg_profile_viewer_filters_set_updated_at ON public.profile_viewer_filters;
CREATE TRIGGER trg_profile_viewer_filters_set_updated_at
BEFORE UPDATE ON public.profile_viewer_filters
FOR EACH ROW EXECUTE FUNCTION public.profiles_set_updated_at();

-- RLS Policies for profile_overrides
ALTER TABLE public.profile_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_overrides_select_owner ON public.profile_overrides;
CREATE POLICY profile_overrides_select_owner
  ON public.profile_overrides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_overrides.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_overrides_insert_owner ON public.profile_overrides;
CREATE POLICY profile_overrides_insert_owner
  ON public.profile_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_overrides.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_overrides_update_owner ON public.profile_overrides;
CREATE POLICY profile_overrides_update_owner
  ON public.profile_overrides
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_overrides.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_overrides_delete_owner ON public.profile_overrides;
CREATE POLICY profile_overrides_delete_owner
  ON public.profile_overrides
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_overrides.profile_id 
      AND p.account_id = auth.uid()
    )
  );

-- RLS Policies for profile_visibility_rules
ALTER TABLE public.profile_visibility_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_visibility_rules_select_owner ON public.profile_visibility_rules;
CREATE POLICY profile_visibility_rules_select_owner
  ON public.profile_visibility_rules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_visibility_rules.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_visibility_rules_insert_owner ON public.profile_visibility_rules;
CREATE POLICY profile_visibility_rules_insert_owner
  ON public.profile_visibility_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_visibility_rules.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_visibility_rules_update_owner ON public.profile_visibility_rules;
CREATE POLICY profile_visibility_rules_update_owner
  ON public.profile_visibility_rules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_visibility_rules.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_visibility_rules_delete_owner ON public.profile_visibility_rules;
CREATE POLICY profile_visibility_rules_delete_owner
  ON public.profile_visibility_rules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_visibility_rules.profile_id 
      AND p.account_id = auth.uid()
    )
  );

-- RLS Policies for profile_allowlist_users
ALTER TABLE public.profile_allowlist_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_allowlist_users_select_owner ON public.profile_allowlist_users;
CREATE POLICY profile_allowlist_users_select_owner
  ON public.profile_allowlist_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_allowlist_users.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_allowlist_users_insert_owner ON public.profile_allowlist_users;
CREATE POLICY profile_allowlist_users_insert_owner
  ON public.profile_allowlist_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_allowlist_users.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_allowlist_users_delete_owner ON public.profile_allowlist_users;
CREATE POLICY profile_allowlist_users_delete_owner
  ON public.profile_allowlist_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_allowlist_users.profile_id 
      AND p.account_id = auth.uid()
    )
  );

-- RLS Policies for profile_blocklist_users
ALTER TABLE public.profile_blocklist_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_blocklist_users_select_owner ON public.profile_blocklist_users;
CREATE POLICY profile_blocklist_users_select_owner
  ON public.profile_blocklist_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_blocklist_users.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_blocklist_users_insert_owner ON public.profile_blocklist_users;
CREATE POLICY profile_blocklist_users_insert_owner
  ON public.profile_blocklist_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_blocklist_users.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_blocklist_users_delete_owner ON public.profile_blocklist_users;
CREATE POLICY profile_blocklist_users_delete_owner
  ON public.profile_blocklist_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_blocklist_users.profile_id 
      AND p.account_id = auth.uid()
    )
  );

-- RLS Policies for profile_viewer_filters
ALTER TABLE public.profile_viewer_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_viewer_filters_select_owner ON public.profile_viewer_filters;
CREATE POLICY profile_viewer_filters_select_owner
  ON public.profile_viewer_filters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_viewer_filters.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_viewer_filters_insert_owner ON public.profile_viewer_filters;
CREATE POLICY profile_viewer_filters_insert_owner
  ON public.profile_viewer_filters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_viewer_filters.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_viewer_filters_update_owner ON public.profile_viewer_filters;
CREATE POLICY profile_viewer_filters_update_owner
  ON public.profile_viewer_filters
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_viewer_filters.profile_id 
      AND p.account_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS profile_viewer_filters_delete_owner ON public.profile_viewer_filters;
CREATE POLICY profile_viewer_filters_delete_owner
  ON public.profile_viewer_filters
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = profile_viewer_filters.profile_id 
      AND p.account_id = auth.uid()
    )
  );
