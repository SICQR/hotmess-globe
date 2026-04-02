-- Fix column name mismatch in user_active_boosts (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_active_boosts' AND column_name='boost_type_key'
  ) THEN
    ALTER TABLE public.user_active_boosts RENAME COLUMN boost_type_key TO boost_key;
  END IF;
END $$;

-- Generate referral codes for all users
UPDATE public.profiles
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text,'-',''),1,8))
WHERE referral_code IS NULL OR referral_code = '';

-- Trigger: auto-generate for new users
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code='' THEN
    NEW.referral_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text,'-',''),1,8));
  END IF; RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();
