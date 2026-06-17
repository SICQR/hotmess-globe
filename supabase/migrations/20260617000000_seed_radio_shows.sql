-- Seed radio_shows with the 5 HOTMESS shows
-- Matches the actual DB schema: id, title, host, schedule, description, slug
-- Safe to re-run (ON CONFLICT DO UPDATE)

INSERT INTO radio_shows (id, title, host, schedule, description, slug)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Wake the Mess',              'DJ Chaos',        'Mon–Fri 7–10am',  'Start your morning with the hottest beats and queer wellness.',           'wake-the-mess'),
  ('20000000-0000-0000-0000-000000000002', 'Dial-a-Daddy / Dial-a-Darling', 'Papa Bear',    'Mon–Fri 3–5pm',   'Afternoon advice, confessions and community call-ins.',                   'dial-a-daddy'),
  ('20000000-0000-0000-0000-000000000003', 'Drive Time Mess',            'The Collective',  'Mon–Fri 5–7pm',   'Rush hour bangers to get you home safe.',                                 'drive-time-mess'),
  ('20000000-0000-0000-0000-000000000004', 'HOTMESS Nights',             'SMASH DADDYS',    'Fri–Sat 7–11pm', 'Weekend club sets, live DJs and pre-party energy.',                       'hotmess-nights'),
  ('20000000-0000-0000-0000-000000000005', 'Hand-in-Hand',               'HNH Collective',  'Sun 6–8pm',           'Sunday wind-down. Deep house, mental health check-ins and chill.',        'hand-in-hand')
ON CONFLICT (id) DO UPDATE SET
  title       = EXCLUDED.title,
  host        = EXCLUDED.host,
  schedule    = EXCLUDED.schedule,
  description = EXCLUDED.description,
  slug        = EXCLUDED.slug;
