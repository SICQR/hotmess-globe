-- Create taps table (woof/tap feature for Ghosted grid)
CREATE TABLE IF NOT EXISTS taps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tapper_email TEXT NOT NULL,
  tapped_email TEXT NOT NULL,
  tap_type TEXT NOT NULL DEFAULT 'tap',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tapper_email, tapped_email, tap_type)
);

ALTER TABLE taps ENABLE ROW LEVEL SECURITY;

CREATE POLICY taps_select ON taps FOR SELECT USING (
  tapper_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR tapped_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
CREATE POLICY taps_insert ON taps FOR INSERT WITH CHECK (
  tapper_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
CREATE POLICY taps_delete ON taps FOR DELETE USING (
  tapper_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

ALTER PUBLICATION supabase_realtime ADD TABLE taps;

-- Create personas table (multi-persona switching)
CREATE TABLE IF NOT EXISTS personas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_type TEXT NOT NULL DEFAULT 'MAIN',
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  photos JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY personas_select ON personas FOR SELECT USING (user_id = auth.uid());
CREATE POLICY personas_insert ON personas FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY personas_update ON personas FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY personas_delete ON personas FOR DELETE USING (user_id = auth.uid());

-- switch_persona RPC
CREATE OR REPLACE FUNCTION switch_persona(p_persona_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE personas SET is_active = false WHERE user_id = auth.uid();
  UPDATE personas SET is_active = true WHERE id = p_persona_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
