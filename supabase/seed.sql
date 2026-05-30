-- HOTMESS Globe — Local test seed data
-- Applied automatically by: npx supabase db reset
-- Do NOT run against production.

-- Test profiles (2 users)
INSERT INTO profiles (id, email, display_name, age, city, avatar_url, community_attested_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'test1@hotmess.app', 'Test User One', 28, 'London', null, now()),
  ('00000000-0000-0000-0000-000000000002', 'test2@hotmess.app', 'Test User Two', 32, 'London', null, now())
ON CONFLICT (id) DO NOTHING;

-- Right now status (canonical TABLE — not profiles.right_now_status JSONB)
INSERT INTO right_now_status (user_email, status, active, updated_at)
VALUES ('test1@hotmess.app', 'Hookup', true, now())
ON CONFLICT (user_email) DO UPDATE SET status = EXCLUDED.status, active = EXCLUDED.active;

-- Preloved listings
INSERT INTO preloved_listings (id, title, price, category, condition, status, seller_id, images)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Vintage Jacket', 45.00, 'Clothing', 'Good', 'active', '00000000-0000-0000-0000-000000000001', ARRAY['https://placehold.co/400x400']),
  ('10000000-0000-0000-0000-000000000002', 'Chain Belt', 12.00, 'Accessories', 'Like New', 'active', '00000000-0000-0000-0000-000000000002', ARRAY['https://placehold.co/400x400'])
ON CONFLICT (id) DO NOTHING;

-- Radio shows
INSERT INTO radio_shows (id, title, host_name, start_time, description, is_active)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Wake the Mess', 'DJ Chaos', 'Mon-Fri 9am', 'Morning energy', true),
  ('20000000-0000-0000-0000-000000000002', 'Dial-a-Daddy', 'Papa Bear', 'Mon/Wed/Fri 7pm', 'Evening vibes', false)
ON CONFLICT (id) DO NOTHING;

-- Taps
INSERT INTO taps (tapper_email, tapped_email, tap_type, created_at)
VALUES ('test1@hotmess.app', 'test2@hotmess.app', 'tap', now())
ON CONFLICT DO NOTHING;
