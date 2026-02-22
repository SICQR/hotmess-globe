-- HOTMESS Demo Events Seed
-- Run this in Supabase SQL Editor to create sample events

-- ============================================
-- UPCOMING EVENTS - London Scene
-- ============================================

INSERT INTO beacons (
  type, title, description, 
  geo_lat, geo_lng, 
  starts_at, ends_at, expires_at,
  visibility, is_featured,
  metadata
) VALUES
-- VAUXHALL EVENTS
(
  'event', 'ORANGE - Saturday Sessions', 
  'The legendary Orange Nation returns! Marathon techno sessions in the Fire main room. Expect pounding beats until Monday morning.',
  51.4825, -0.1246,
  NOW() + INTERVAL '2 days' + TIME '23:00:00',
  NOW() + INTERVAL '3 days' + TIME '10:00:00',
  NOW() + INTERVAL '3 days' + TIME '12:00:00',
  'public', true,
  '{"venue": "Fire", "address": "39 Parry Street, SW8 1RT", "price": "£20-30", "dress_code": "sporty/clubwear", "music": ["techno", "house"]}'
),
(
  'event', 'Horse Meat Disco', 
  'Sunday institution at the Eagle. Disco, soul, and good vibes. Dress: anything goes. Rooftop open (weather permitting).',
  51.4857, -0.1140,
  NOW() + INTERVAL '8 days' + TIME '20:00:00',
  NOW() + INTERVAL '9 days' + TIME '03:00:00',
  NOW() + INTERVAL '9 days' + TIME '05:00:00',
  'public', true,
  '{"venue": "Eagle London", "address": "349 Kennington Lane, SE11 5QY", "price": "£10-15", "music": ["disco", "soul", "house"]}'
),

-- SOHO EVENTS
(
  'event', 'Duckie @ RVT',
  'Saturday night cabaret and post-punk performance at the legendary Royal Vauxhall Tavern. Irreverent, political, fun.',
  51.4856, -0.1140,
  NOW() + INTERVAL '9 days' + TIME '21:00:00',
  NOW() + INTERVAL '10 days' + TIME '02:00:00',
  NOW() + INTERVAL '10 days' + TIME '04:00:00',
  'public', true,
  '{"venue": "Royal Vauxhall Tavern", "address": "372 Kennington Lane, SE11 5HY", "price": "£8-12", "dress_code": "express yourself"}'
),
(
  'event', 'G-A-Y Late',
  'Pop music til the early hours. Perfect after Heaven or just starting late. Young crowd, cheap drinks.',
  51.5142, -0.1304,
  NOW() + INTERVAL '3 days' + TIME '23:00:00',
  NOW() + INTERVAL '4 days' + TIME '04:00:00',
  NOW() + INTERVAL '4 days' + TIME '06:00:00',
  'public', false,
  '{"venue": "G-A-Y Late", "address": "5 Goslett Yard, WC2H 0EA", "price": "Free-£5", "music": ["pop", "chart"]}'
),

-- EAST LONDON EVENTS
(
  'event', 'Lipsync1000 @ The Glory',
  'Legendary drag lip sync competition. Fierce queens, celebrity judges, life-changing prize money. Get there early!',
  51.5313, -0.0743,
  NOW() + INTERVAL '5 days' + TIME '20:00:00',
  NOW() + INTERVAL '5 days' + TIME '23:30:00',
  NOW() + INTERVAL '6 days' + TIME '01:00:00',
  'public', true,
  '{"venue": "The Glory", "address": "281 Kingsland Road, E2 8AS", "price": "£10", "type": "competition", "dress_code": "serve a look"}'
),
(
  'event', 'BODY MOVEMENTS @ Dalston Superstore',
  'Underground techno and house in the basement. Queer DJs, inclusive vibes, rooftop for air.',
  51.5497, -0.0754,
  NOW() + INTERVAL '10 days' + TIME '22:00:00',
  NOW() + INTERVAL '11 days' + TIME '05:00:00',
  NOW() + INTERVAL '11 days' + TIME '07:00:00',
  'public', false,
  '{"venue": "Dalston Superstore", "address": "117 Kingsland High Street, E8 2PB", "price": "£12-15", "music": ["techno", "house"]}'
),

-- SPECIAL EVENTS
(
  'event', 'PRIDE Warm-Up Party',
  'Official Pride in London warm-up. Multiple DJs, rainbow vibes, community celebration.',
  51.4825, -0.1246,
  NOW() + INTERVAL '30 days' + TIME '21:00:00',
  NOW() + INTERVAL '31 days' + TIME '06:00:00',
  NOW() + INTERVAL '31 days' + TIME '08:00:00',
  'public', true,
  '{"venue": "Fire", "address": "39 Parry Street, SW8 1RT", "price": "£25", "special": "Pride"}'
),
(
  'event', 'BEARSCAPE - Bear Week London',
  'Bear community celebration weekend. Pool party, club night, brunches. All welcome.',
  51.4825, -0.1246,
  NOW() + INTERVAL '45 days' + TIME '14:00:00',
  NOW() + INTERVAL '47 days' + TIME '04:00:00',
  NOW() + INTERVAL '47 days' + TIME '06:00:00',
  'public', true,
  '{"venue": "Multiple venues", "price": "£50 weekend pass", "type": "festival", "tribes": ["bear", "cub", "otter", "chub"]}'
)
ON CONFLICT DO NOTHING;

-- Create some event RSVPs for visibility
INSERT INTO event_rsvps (beacon_id, user_id, status, created_at)
SELECT b.id, p.id, 'going', NOW()
FROM beacons b
CROSS JOIN (SELECT id FROM profiles ORDER BY RANDOM() LIMIT 5) p
WHERE b.type = 'event' AND b.is_featured = true
ON CONFLICT DO NOTHING;

-- Verify
SELECT title, starts_at, metadata->>'venue' as venue, is_featured 
FROM beacons 
WHERE type = 'event' 
ORDER BY starts_at;
