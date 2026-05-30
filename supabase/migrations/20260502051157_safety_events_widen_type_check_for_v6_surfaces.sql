-- Widen safety_events.type to cover v6 Care surfaces per CareAsKink spec
-- Pre-existing values: 'sos', 'window_alert' (from initial migration)
-- Adding: 'get_out' (Care Get Out), 'land_time_miss' (Land Time expired),
--        'check_in_miss' (check-in alert escalation), 'movement_alert' (movement window failure)
ALTER TABLE safety_events DROP CONSTRAINT IF EXISTS safety_events_type_check;
ALTER TABLE safety_events ADD CONSTRAINT safety_events_type_check
  CHECK (type = ANY (ARRAY[
    'sos'::text,
    'get_out'::text,
    'land_time_miss'::text,
    'check_in_miss'::text,
    'movement_alert'::text,
    'window_alert'::text
  ]));
