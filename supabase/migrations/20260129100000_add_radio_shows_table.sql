-- Radio Shows Table
-- Stores radio show schedule and metadata

CREATE TABLE IF NOT EXISTS public.radio_shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Show info
  title text NOT NULL,
  description text,
  host text,
  genre text,
  
  -- Schedule
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  is_recurring boolean DEFAULT false,
  recurrence_rule text, -- iCal RRULE format
  
  -- Media
  artwork_url text,
  stream_url text,
  archive_url text, -- Link to recording after show ends
  
  -- Metadata
  tags text[] DEFAULT '{}',
  featured boolean DEFAULT false,
  
  -- Stats
  listener_count integer DEFAULT 0,
  peak_listeners integer DEFAULT 0,
  
  -- Status
  status text DEFAULT 'scheduled', -- scheduled, live, completed, cancelled
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE INDEX IF NOT EXISTS idx_radio_shows_start_time ON public.radio_shows (start_time);
CREATE INDEX IF NOT EXISTS idx_radio_shows_status ON public.radio_shows (status);
CREATE INDEX IF NOT EXISTS idx_radio_shows_host ON public.radio_shows (host);

-- RLS
ALTER TABLE public.radio_shows ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS radio_shows_select_public ON public.radio_shows;
CREATE POLICY radio_shows_select_public
ON public.radio_shows
FOR SELECT
TO anon, authenticated
USING (true);

-- Admin write access
DROP POLICY IF EXISTS radio_shows_write_admin ON public.radio_shows;
CREATE POLICY radio_shows_write_admin
ON public.radio_shows
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
)
WITH CHECK (
  (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

-- Label Catalog Table
-- Stores label releases and catalog

CREATE TABLE IF NOT EXISTS public.label_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Release info
  title text NOT NULL,
  artist text NOT NULL,
  description text,
  
  -- Type
  release_type text DEFAULT 'single', -- single, ep, album, compilation
  
  -- Media
  artwork_url text,
  soundcloud_url text,
  spotify_url text,
  bandcamp_url text,
  beatport_url text,
  
  -- Tracks
  tracks jsonb DEFAULT '[]'::jsonb, -- Array of {title, duration, soundcloud_urn}
  
  -- Metadata
  genre text,
  tags text[] DEFAULT '{}',
  bpm integer,
  key text,
  
  -- Release date
  release_date date,
  pre_release boolean DEFAULT false,
  
  -- Stats
  play_count integer DEFAULT 0,
  
  -- Status
  featured boolean DEFAULT false,
  status text DEFAULT 'published', -- draft, scheduled, published
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

CREATE INDEX IF NOT EXISTS idx_label_releases_release_date ON public.label_releases (release_date);
CREATE INDEX IF NOT EXISTS idx_label_releases_artist ON public.label_releases (artist);
CREATE INDEX IF NOT EXISTS idx_label_releases_status ON public.label_releases (status);

-- RLS
ALTER TABLE public.label_releases ENABLE ROW LEVEL SECURITY;

-- Public read access (published only)
DROP POLICY IF EXISTS label_releases_select_public ON public.label_releases;
CREATE POLICY label_releases_select_public
ON public.label_releases
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- Admin can see all
DROP POLICY IF EXISTS label_releases_select_admin ON public.label_releases;
CREATE POLICY label_releases_select_admin
ON public.label_releases
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);

-- Admin write access
DROP POLICY IF EXISTS label_releases_write_admin ON public.label_releases;
CREATE POLICY label_releases_write_admin
ON public.label_releases
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
)
WITH CHECK (
  (auth.jwt() ->> 'email') IN ('admin@hotmess.london', 'scanme@hotmess.london')
);
