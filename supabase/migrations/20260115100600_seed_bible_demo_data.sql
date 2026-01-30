-- hotmess-globe: seed minimal demo data for Bible routes (non-Shopify)
-- Idempotent: uses fixed UUIDs and ON CONFLICT safeguards.

create extension if not exists pgcrypto;

-- Demo users (public."User")
insert into public."User" (id, email, full_name, avatar_url, city, xp, consent_accepted, has_agreed_terms, has_consented_data, has_consented_gps, membership_tier, role)
values
  ('11111111-1111-1111-1111-111111111111', 'demo1@hotmess.london', 'Demo One', null, 'London', 2200, true, true, true, true, 'basic', 'member'),
  ('22222222-2222-2222-2222-222222222222', 'demo2@hotmess.london', 'Demo Two', null, 'London', 1450, true, true, true, true, 'plus', 'member'),
  ('33333333-3333-3333-3333-333333333333', 'demo3@hotmess.london', 'Demo Three', null, 'London', 900, true, true, true, false, 'basic', 'member')
on conflict (email)
do update set
  full_name = excluded.full_name,
  city = excluded.city,
  membership_tier = excluded.membership_tier,
  role = public."User".role,
  updated_date = now();

-- Cities
insert into public.cities (name, lat, lng, country_code, tier)
values
  ('London', 51.5074, -0.1278, 'GB', 'core'),
  ('Manchester', 53.4808, -2.2426, 'GB', 'core'),
  ('Brighton', 50.8225, -0.1372, 'GB', 'edge')
on conflict (name) do nothing;

-- Demo beacons (published + non-shadow so they appear publicly)
insert into public."Beacon" (id, active, status, kind, title, description, venue_name, city, mode, event_date, owner_email, lat, lng, intensity, xp_scan, sponsored, image_url, video_url, capacity, ticket_url, is_shadow, is_verified)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', true, 'published', 'event', 'HOTMESS Friday', 'A loud, sweaty, consent-first night.', 'Somewhere East', 'London', 'crowd', now() + interval '2 days', 'demo1@hotmess.london', 51.515, -0.09, 0.85, 150, false, null, null, 400, null, false, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', true, 'published', 'venue', 'Late Bar', 'Open late. Dark room rules.', 'Late Bar', 'London', 'venue', null, 'demo2@hotmess.london', 51.508, -0.12, 0.55, 75, false, null, null, null, null, false, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', true, 'published', 'drop', 'Limited Drop', 'Limited run merch drop.', null, 'London', 'drop', null, 'demo1@hotmess.london', 51.505, -0.11, 0.30, 100, true, null, null, null, null, false, true)
on conflict (id) do nothing;

-- Right Now status samples
insert into public.right_now_status (id, user_email, intent, timeframe, location, active, expires_at)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'demo1@hotmess.london', 'explore', 'tonight', jsonb_build_object('city','London'), true, now() + interval '2 hours'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'demo2@hotmess.london', 'host', 'now', jsonb_build_object('city','London'), true, now() + interval '90 minutes')
on conflict (id) do nothing;

-- User tags (taxonomy selections)
insert into public.user_tags (user_email, tag_id, tag_label, category_id, is_essential, is_dealbreaker, visibility)
values
  ('demo1@hotmess.london', 'techno', 'Techno', 'music', true, false, 'public'),
  ('demo1@hotmess.london', 'aftercare', 'Aftercare-first', 'care', true, false, 'matches'),
  ('demo2@hotmess.london', 'house', 'House', 'music', true, false, 'public'),
  ('demo3@hotmess.london', 'new_in_town', 'New in town', 'social', false, false, 'public')
on conflict (user_email, tag_id) do update set
  tag_label = excluded.tag_label,
  category_id = excluded.category_id,
  visibility = excluded.visibility;

-- User tribes
insert into public.user_tribes (user_email, tribe_id, tribe_label)
values
  ('demo1@hotmess.london', 'ravers', 'Ravers'),
  ('demo2@hotmess.london', 'daddies', 'Daddies'),
  ('demo3@hotmess.london', 'explorers', 'Explorers')
on conflict (user_email, tribe_id) do update set tribe_label = excluded.tribe_label;

-- Activity feed (public)
insert into public.activity_feed (id, user_email, activity_type, visibility, xp_earned, activity_data, location)
values
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'demo1@hotmess.london', 'beacon_create', 'public', 80, jsonb_build_object('beacon_title','HOTMESS Friday'), jsonb_build_object('city','London')),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'demo2@hotmess.london', 'follow', 'public', 10, jsonb_build_object('target_name','Demo One'), jsonb_build_object('city','London')),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'demo2@hotmess.london', 'purchase', 'public', 120, jsonb_build_object('product_name','Limited Drop'), jsonb_build_object('city','London'))
on conflict (id) do nothing;

-- Interactions
insert into public.user_interactions (id, user_email, interaction_type, beacon_id, beacon_kind, beacon_mode)
values
  ('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'demo1@hotmess.london', 'scan', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'event', 'crowd'),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'demo2@hotmess.london', 'scan', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'event', 'crowd'),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd3', 'demo2@hotmess.london', 'like', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'venue', 'venue')
on conflict (id) do nothing;

-- Notifications (in-app)
insert into public.notifications (id, user_email, type, title, message, link, metadata, read)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'demo1@hotmess.london', 'welcome', 'Welcome to HOTMESS', 'Ask first. Confirm yes. Respect no.', 'Home', '{}'::jsonb, false),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 'demo1@hotmess.london', 'event', 'Tonight: HOTMESS Friday', 'Two days out. Tap to view.', 'Events', jsonb_build_object('beacon_id','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'), false)
on conflict (id) do nothing;

-- One demo chat thread + messages
insert into public.chat_threads (id, participant_emails, thread_type, active, last_message, last_message_at)
values
  ('ffffffff-ffff-ffff-ffff-fffffffffff1', array['demo1@hotmess.london','demo2@hotmess.london'], 'dm', true, 'See you at HOTMESS Friday?', now() - interval '10 minutes')
on conflict (id) do nothing;

insert into public.messages (id, thread_id, sender_email, sender_name, content, message_type, read_by)
values
  ('abababab-abab-abab-abab-ababababab01', 'ffffffff-ffff-ffff-ffff-fffffffffff1', 'demo1@hotmess.london', 'Demo One', 'See you at HOTMESS Friday?', 'text', array['demo1@hotmess.london']),
  ('abababab-abab-abab-abab-ababababab02', 'ffffffff-ffff-ffff-ffff-fffffffffff1', 'demo2@hotmess.london', 'Demo Two', 'Yes. Ask first 😉', 'text', array['demo2@hotmess.london'])
on conflict (id) do nothing;

-- Preferences defaults
insert into public.notification_preferences (user_email, push_enabled, email_enabled)
values
  ('demo1@hotmess.london', false, false),
  ('demo2@hotmess.london', false, false)
on conflict (user_email) do nothing;
