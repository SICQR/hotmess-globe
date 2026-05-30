-- Fix globe_events check constraint to allow 'message' type events
-- This allows the chat ripple effect to appear on the 3D globe

DO $$ 
BEGIN
  -- 1. Remove the old constraint
  ALTER TABLE public.globe_events DROP CONSTRAINT IF EXISTS globe_events_event_type_check;
  
  -- 2. Clear existing transient events to avoid "violation by some row" error
  -- Since these are just visual pulses, it is safe to clear them.
  DELETE FROM public.globe_events;

  -- 3. Add the expanded constraint
  ALTER TABLE public.globe_events 
    ADD CONSTRAINT globe_events_event_type_check 
    CHECK (event_type IN ('tap', 'boo', 'nudge', 'purchase', 'venue_checkin', 'message', 'alert'));

EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

COMMENT ON TABLE public.globe_events IS 'Transient events rendered as visual effects on the 3D Pulse Globe.';
