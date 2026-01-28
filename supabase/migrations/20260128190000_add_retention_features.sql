-- Migration: Add Retention Features
-- Date: 2026-01-28
-- Description: Add tables and indexes for high retention plan

-- Create daily_checkins table
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  streak_day INTEGER NOT NULL DEFAULT 1,
  xp_earned INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_checkins_user_date_unique UNIQUE (user_email, checked_in_at)
);

CREATE INDEX idx_daily_checkins_user_email ON public.daily_checkins(user_email);
CREATE INDEX idx_daily_checkins_checked_in_at ON public.daily_checkins(checked_in_at DESC);
CREATE INDEX idx_daily_checkins_user_recent ON public.daily_checkins(user_email, checked_in_at DESC);

COMMENT ON TABLE public.daily_checkins IS 'Daily check-in records for gamification and streak tracking';

-- Create level_unlocks table
CREATE TABLE IF NOT EXISTS public.level_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER NOT NULL UNIQUE,
  unlock_type TEXT NOT NULL,
  unlock_name TEXT NOT NULL,
  unlock_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_level_unlocks_level ON public.level_unlocks(level);

COMMENT ON TABLE public.level_unlocks IS 'Level-based unlocks for gamification progression';

-- Insert default level unlocks
INSERT INTO public.level_unlocks (level, unlock_type, unlock_name, unlock_description) VALUES
  (3, 'persona', 'Secondary Persona', 'Create a second persona to express different sides of yourself'),
  (5, 'profile', 'Profile Views', 'See who viewed your profile (Chrome feature)'),
  (7, 'discovery', 'Priority Discovery', 'Get priority placement in discovery grid'),
  (10, 'profile', 'Custom Badge Color', 'Customize your profile badge color'),
  (15, 'events', 'Private Events', 'Create and host private events'),
  (20, 'badge', 'Legend Badge', 'Earn the exclusive Legend badge')
ON CONFLICT (level) DO NOTHING;

-- Create user_level_unlocks tracking table
CREATE TABLE IF NOT EXISTS public.user_level_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  level INTEGER NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  CONSTRAINT user_level_unlocks_unique UNIQUE (user_email, level)
);

CREATE INDEX idx_user_level_unlocks_user ON public.user_level_unlocks(user_email);
CREATE INDEX idx_user_level_unlocks_user_unclaimed ON public.user_level_unlocks(user_email) WHERE claimed = false;

COMMENT ON TABLE public.user_level_unlocks IS 'Tracks which level unlocks each user has achieved';

-- Add engagement_updates column to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS engagement_updates BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.notification_preferences.engagement_updates IS 'Enable notifications for follows, likes, profile views, etc.';

-- Create function to calculate user level from XP
CREATE OR REPLACE FUNCTION public.calculate_user_level(xp_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN GREATEST(1, (xp_amount / 1000) + 1);
END;
$$;

COMMENT ON FUNCTION public.calculate_user_level IS 'Calculate user level from XP (1 level per 1000 XP)';

-- Create function to check level unlocks
CREATE OR REPLACE FUNCTION public.check_and_grant_level_unlocks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_level INTEGER;
  unlock_record RECORD;
BEGIN
  -- Calculate current level from new XP
  current_level := public.calculate_user_level(NEW.xp);
  
  -- Check for any unlocks at this level or below that haven't been granted
  FOR unlock_record IN 
    SELECT level 
    FROM public.level_unlocks 
    WHERE level <= current_level
    AND level NOT IN (
      SELECT level 
      FROM public.user_level_unlocks 
      WHERE user_email = NEW.email
    )
  LOOP
    -- Grant the unlock
    INSERT INTO public.user_level_unlocks (user_email, level)
    VALUES (NEW.email, unlock_record.level)
    ON CONFLICT (user_email, level) DO NOTHING;
    
    -- Queue notification
    INSERT INTO public.notification_outbox (
      user_email,
      notification_type,
      title,
      message,
      metadata,
      status,
      created_at,
      created_date
    )
    SELECT
      NEW.email,
      'level_unlock',
      'Level ' || unlock_record.level || ' Unlocked!',
      'Congrats! You unlocked: ' || lu.unlock_name,
      jsonb_build_object(
        'link', '/',
        'level', unlock_record.level,
        'unlock_type', lu.unlock_type,
        'unlock_name', lu.unlock_name
      ),
      'queued',
      now(),
      now()
    FROM public.level_unlocks lu
    WHERE lu.level = unlock_record.level;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-grant level unlocks when XP increases
DROP TRIGGER IF EXISTS trigger_check_level_unlocks ON public."User";
CREATE TRIGGER trigger_check_level_unlocks
  AFTER UPDATE OF xp ON public."User"
  FOR EACH ROW
  WHEN (NEW.xp > OLD.xp)
  EXECUTE FUNCTION public.check_and_grant_level_unlocks();

COMMENT ON TRIGGER trigger_check_level_unlocks ON public."User" IS 'Automatically grant level unlocks when user gains XP';

-- Row Level Security for daily_checkins
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own checkins" ON public.daily_checkins;
CREATE POLICY "Users can view own checkins" 
  ON public.daily_checkins FOR SELECT 
  USING (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
  );

DROP POLICY IF EXISTS "Users can insert own checkins" ON public.daily_checkins;
CREATE POLICY "Users can insert own checkins" 
  ON public.daily_checkins FOR INSERT 
  WITH CHECK (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Row Level Security for level_unlocks (read-only for all authenticated users)
ALTER TABLE public.level_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view level unlocks" ON public.level_unlocks;
CREATE POLICY "Anyone can view level unlocks" 
  ON public.level_unlocks FOR SELECT 
  USING (true);

-- Row Level Security for user_level_unlocks
ALTER TABLE public.user_level_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own unlocks" ON public.user_level_unlocks;
CREATE POLICY "Users can view own unlocks" 
  ON public.user_level_unlocks FOR SELECT 
  USING (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'admin'
  );

DROP POLICY IF EXISTS "Service can manage unlocks" ON public.user_level_unlocks;
CREATE POLICY "Service can manage unlocks" 
  ON public.user_level_unlocks FOR ALL 
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
