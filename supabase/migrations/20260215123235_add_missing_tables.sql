CREATE TABLE IF NOT EXISTS public.gay_world_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  city TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  category TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gay_world_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY IF NOT EXISTS "Public read gay_world_knowledge" ON public.gay_world_knowledge FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY IF NOT EXISTS "Public read events" ON public.events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.gay_world_knowledge (category, title, content, city, tags) VALUES
('venue', 'Heaven', 'Iconic LGBTQ+ nightclub under Charing Cross station.', 'London', ARRAY['nightclub', 'historic']),
('venue', 'The Glory', 'East London cabaret bar.', 'London', ARRAY['cabaret', 'drag'])
ON CONFLICT DO NOTHING;

INSERT INTO public.events (title, description, city, category, tags) VALUES
('Pride Night', 'Weekly pride celebration', 'London', 'party', ARRAY['pride'])
ON CONFLICT DO NOTHING;
