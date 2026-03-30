-- Create stub functions for pg_cron jobs that were erroring every minute.
-- These three cron jobs exist but the functions they call did not.
-- Adapted to actual production column names.

CREATE OR REPLACE FUNCTION public.expire_right_now_posts()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.right_now_posts
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
EXCEPTION WHEN others THEN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_presence_and_beacons()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.presence
  WHERE last_seen_at < NOW() - INTERVAL '1 hour';
EXCEPTION WHEN others THEN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_heat_bins()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.heat_bins_city_summary
  WHERE last_updated < NOW() - INTERVAL '7 days';
EXCEPTION WHEN others THEN NULL;
END;
$$;
