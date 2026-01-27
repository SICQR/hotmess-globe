-- Level-based feature unlocks system
-- Creates the level_unlocks table and seeds default unlock tiers

-- Create the level_unlocks table
CREATE TABLE IF NOT EXISTS public.level_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INT NOT NULL,
  feature_key TEXT NOT NULL,
  feature_label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(level, feature_key)
);

-- Create index for level lookups
CREATE INDEX IF NOT EXISTS idx_level_unlocks_level ON public.level_unlocks(level);

-- Enable RLS
ALTER TABLE public.level_unlocks ENABLE ROW LEVEL SECURITY;

-- Everyone can read unlock definitions
CREATE POLICY level_unlocks_select ON public.level_unlocks
  FOR SELECT TO authenticated
  USING (true);

-- Seed default unlock tiers
INSERT INTO public.level_unlocks (level, feature_key, feature_label, description, icon) VALUES
  -- Level 3: First unlock
  (3, 'create_persona', 'Create Secondary Persona', 'Create an additional profile persona for different situations', '🎭'),
  (3, 'custom_status', 'Custom Status', 'Set a custom status message on your profile', '💬'),
  
  -- Level 5: Chrome tier
  (5, 'profile_viewers', 'See Profile Viewers', 'See who has viewed your profile', '👁️'),
  (5, 'read_receipts', 'Read Receipts', 'See when your messages have been read', '✓'),
  
  -- Level 7: Discovery priority
  (7, 'discovery_priority', 'Discovery Priority', 'Appear higher in the discovery grid', '⬆️'),
  (7, 'advanced_filters', 'Advanced Filters', 'Access advanced discovery filters', '🔍'),
  
  -- Level 10: Customization
  (10, 'custom_badge_color', 'Custom Badge Color', 'Choose a custom color for your profile badge', '🎨'),
  (10, 'profile_themes', 'Profile Themes', 'Apply custom themes to your profile', '🖼️'),
  
  -- Level 15: Events
  (15, 'create_private_events', 'Create Private Events', 'Host invite-only events', '🎉'),
  (15, 'event_co_host', 'Event Co-Hosting', 'Co-host events with other organizers', '🤝'),
  
  -- Level 20: Legend status
  (20, 'legend_badge', 'Legend Badge', 'Exclusive Legend badge on your profile', '👑'),
  (20, 'unlimited_personas', 'Unlimited Personas', 'Create unlimited secondary personas', '♾️')
ON CONFLICT (level, feature_key) DO NOTHING;

-- Create user_unlocked_features table to track manually granted unlocks
CREATE TABLE IF NOT EXISTS public.user_unlocked_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlocked_by TEXT, -- Admin who granted it, or 'system' for level-based
  reason TEXT,
  
  UNIQUE(user_email, feature_key)
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_unlocked_features_email ON public.user_unlocked_features(user_email);

-- Enable RLS
ALTER TABLE public.user_unlocked_features ENABLE ROW LEVEL SECURITY;

-- Users can see their own unlocks
CREATE POLICY user_unlocked_features_select ON public.user_unlocked_features
  FOR SELECT TO authenticated
  USING (user_email = auth.email());

-- Grant trigger function for updating unlock notification
CREATE OR REPLACE FUNCTION notify_feature_unlock()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for the user
  INSERT INTO public.notifications (user_email, type, title, message, link, metadata, read, created_at, created_date)
  VALUES (
    NEW.user_email,
    'feature_unlocked',
    'New Feature Unlocked!',
    'You''ve unlocked a new feature: ' || COALESCE(NEW.feature_key, 'Unknown'),
    'Settings',
    jsonb_build_object('feature_key', NEW.feature_key),
    false,
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for manual unlock notifications
DROP TRIGGER IF EXISTS trigger_notify_feature_unlock ON public.user_unlocked_features;
CREATE TRIGGER trigger_notify_feature_unlock
  AFTER INSERT ON public.user_unlocked_features
  FOR EACH ROW
  EXECUTE FUNCTION notify_feature_unlock();

COMMENT ON TABLE public.level_unlocks IS 'Defines features that unlock at specific levels';
COMMENT ON TABLE public.user_unlocked_features IS 'Tracks manually granted feature unlocks for users';
