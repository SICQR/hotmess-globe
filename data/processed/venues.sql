-- world_venues upsert
-- Generated: 2026-04-17
-- Source: HOTMESS venue ingestion pipeline v1.0


INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'heaven-london', 'Heaven', 'London', 'GB',
  'Charing Cross', 'Villiers Street, London WC2N 6NE',
  51.5077, -0.1234,
  'https://heavennightclub-london.com', 'https://www.instagram.com/heavennightclub', 'https://www.google.com/maps/place/Heaven+Nightclub',
  '["https://heavennightclub-london.com", "https://www.google.com/maps/place/Heaven+Nightclub", "https://www.timeout.com/london/nightlife/heaven"]',
  'club', '{"wednesday": [{"open": "23:00", "close": "04:00"}], "friday": [{"open": "23:00", "close": "05:00"}], "saturday": [{"open": "23:00", "close": "05:00"}]}',
  ARRAY['mainstream', 'pop', 'student', 'high-energy', 'dancefloor', 'tourist-heavy'],
  '$$', 'London''s most iconic gay megaclub under the Charing Cross arches, running since 1979.', 'Heaven has anchored London''s gay scene for over four decades. Set beneath the arches of Charing Cross, the three-floor venue hosts pop-heavy club nights, live acts, and regular drag performances. Best known for its weekly G-A-Y late night.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 92, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'royal-vauxhall-tavern', 'Royal Vauxhall Tavern', 'London', 'GB',
  'Vauxhall', '372 Kennington Lane, London SE11 5HY',
  51.4868, -0.1224,
  'https://www.rvt.community', 'https://www.instagram.com/rvtlondon', 'https://www.google.com/maps/place/Royal+Vauxhall+Tavern',
  '["https://www.rvt.community", "https://www.google.com/maps/place/Royal+Vauxhall+Tavern"]',
  'bar', '{"wednesday": [{"open": "20:00", "close": "02:00"}], "thursday": [{"open": "20:00", "close": "02:00"}], "friday": [{"open": "20:00", "close": "03:00"}], "saturday": [{"open": "20:00", "close": "03:00"}], "sunday": [{"open": "14:00", "close": "23:00"}]}',
  ARRAY['drag', 'cabaret', 'local-favorite', 'historic', 'performance', 'queer-mixed'],
  '$$', 'Historic London LGBTQ+ institution featuring drag, cabaret, and performance.', 'The Royal Vauxhall Tavern is a legendary venue for drag and cabaret performances, beloved by locals and tourists alike.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 94, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'eagle-london', 'Eagle London', 'London', 'GB',
  'Vauxhall', '349 Kennington Lane, London SE11 5QY',
  51.4869, -0.1213,
  'https://www.eaglelondon.com', 'https://www.instagram.com/eaglelondon', 'https://www.google.com/maps/place/Eagle+London',
  '["https://www.eaglelondon.com", "https://www.google.com/maps/place/Eagle+London"]',
  'bar', '{"friday": [{"open": "21:00", "close": "04:00"}], "saturday": [{"open": "21:00", "close": "04:00"}], "sunday": [{"open": "15:00", "close": "23:00"}]}',
  ARRAY['leather', 'bear', 'masculine', 'late-night', 'local-favorite', 'dancefloor'],
  '$', 'Leather and bear bar in Vauxhall with late-night dancing.', 'Eagle London is a leather bar catering to bears and masculine-identified patrons, with a strong emphasis on community and nightlife.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 90, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'fire-london', 'Fire', 'London', 'GB',
  'Vauxhall', '39 Parry Street, London SW8 1RT',
  51.4877, -0.1237,
  'https://firelondon.net', 'https://www.instagram.com/firelondon', 'https://www.google.com/maps/place/Fire+London',
  '["https://firelondon.net", "https://www.residentadvisor.net/club.aspx?id=1820"]',
  'club', '{"friday": [{"open": "22:00", "close": "07:00"}], "saturday": [{"open": "22:00", "close": "07:00"}]}',
  ARRAY['techno', 'afterhours', 'circuit', 'late-night', 'dancefloor', 'masculine'],
  '$$', 'Afterhours techno club in Vauxhall.', 'Fire is known for its underground techno events and late-night dancing scene.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 85, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'comptons-soho', 'Comptons of Soho', 'London', 'GB',
  'Soho', '51-53 Old Compton Street, London W1D 6HN',
  51.5133, -0.1313,
  'https://www.comptons.london', 'https://www.instagram.com/comptonsoflondon', 'https://www.google.com/maps/place/Comptons+of+Soho',
  '["https://www.comptons.london", "https://www.google.com/maps/place/Comptons+of+Soho"]',
  'bar', '{"monday": [{"open": "12:00", "close": "23:30"}], "tuesday": [{"open": "12:00", "close": "23:30"}], "wednesday": [{"open": "12:00", "close": "23:30"}], "thursday": [{"open": "12:00", "close": "23:30"}], "friday": [{"open": "12:00", "close": "00:30"}], "saturday": [{"open": "12:00", "close": "00:30"}], "sunday": [{"open": "12:00", "close": "22:30"}]}',
  ARRAY['local-favorite', 'neighborhood-bar', 'casual', 'historic', 'queer-mixed', 'tourist-heavy'],
  '$$', 'Historic Soho neighborhood bar beloved by locals and tourists.', 'Comptons is an iconic Soho fixture with a warm, welcoming atmosphere.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 91, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'admiral-duncan-london', 'The Admiral Duncan', 'London', 'GB',
  'Soho', '54 Old Compton Street, London W1D 4UD',
  51.5131, -0.1308,
  'https://www.admiralduncan.co.uk', 'https://www.instagram.com/admiralduncan', 'https://www.google.com/maps/place/The+Admiral+Duncan',
  '["https://www.admiralduncan.co.uk", "https://www.google.com/maps/place/The+Admiral+Duncan"]',
  'bar', '{"monday": [{"open": "12:00", "close": "23:00"}], "tuesday": [{"open": "12:00", "close": "23:00"}], "wednesday": [{"open": "12:00", "close": "23:00"}], "thursday": [{"open": "12:00", "close": "00:00"}], "friday": [{"open": "12:00", "close": "01:00"}], "saturday": [{"open": "12:00", "close": "01:00"}], "sunday": [{"open": "12:00", "close": "22:30"}]}',
  ARRAY['local-favorite', 'historic', 'neighborhood-bar', 'queer-mixed', 'casual'],
  '$', 'Casual historic Soho bar with mixed LGBTQ+ clientele.', 'The Admiral Duncan is a staple of Soho nightlife.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 92, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'gay-bar-soho', 'G-A-Y Bar', 'London', 'GB',
  'Soho', '30 Old Compton Street, London W1D 4UR',
  51.513, -0.1311,
  'https://g-a-y.co.uk', 'https://www.instagram.com/gaybar', 'https://www.google.com/maps/place/G-A-Y+Bar',
  '["https://g-a-y.co.uk", "https://www.google.com/maps/place/G-A-Y+Bar"]',
  'bar', '{"monday": [{"open": "13:00", "close": "00:00"}], "tuesday": [{"open": "13:00", "close": "00:00"}], "wednesday": [{"open": "13:00", "close": "00:00"}], "thursday": [{"open": "13:00", "close": "00:00"}], "friday": [{"open": "13:00", "close": "03:00"}], "saturday": [{"open": "13:00", "close": "03:00"}], "sunday": [{"open": "13:00", "close": "23:30"}]}',
  ARRAY['pop', 'mainstream', 'tourist-heavy', 'casual', 'high-energy'],
  '$', 'Popular Soho pop bar for tourists and party-goers.', 'G-A-Y Bar is a mainstream pop venue in the heart of Soho.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 89, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'ku-bar-soho', 'Ku Bar Soho', 'London', 'GB',
  'Soho', '30 Lisle Street, London WC2H 7BA',
  51.5121, -0.1314,
  'https://www.ku-bar.co.uk', 'https://www.instagram.com/ku_bar', 'https://www.google.com/maps/place/Ku+Bar+Soho',
  '["https://www.ku-bar.co.uk", "https://www.google.com/maps/place/Ku+Bar+Soho"]',
  'bar', '{"monday": [{"open": "14:00", "close": "01:00"}], "tuesday": [{"open": "14:00", "close": "01:00"}], "wednesday": [{"open": "14:00", "close": "01:00"}], "thursday": [{"open": "14:00", "close": "01:00"}], "friday": [{"open": "14:00", "close": "03:00"}], "saturday": [{"open": "14:00", "close": "03:00"}], "sunday": [{"open": "14:00", "close": "00:30"}]}',
  ARRAY['cocktail', 'casual', 'mainstream', 'upscale', 'queer-mixed'],
  '$$', 'Upscale cocktail bar in Soho with mixed clientele.', 'Ku Bar offers a more refined atmosphere than typical Soho venues.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 87, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'the-glory-london', 'The Glory', 'London', 'GB',
  'Haggerston', '281 Kingsland Road, London E2 8AS',
  51.5397, -0.0778,
  'https://theglory.co', 'https://www.instagram.com/theglorylondon', 'https://www.google.com/maps/place/The+Glory+London',
  '["https://theglory.co", "https://www.google.com/maps/place/The+Glory+London"]',
  'bar', '{"wednesday": [{"open": "17:00", "close": "00:00"}], "thursday": [{"open": "17:00", "close": "00:00"}], "friday": [{"open": "17:00", "close": "02:00"}], "saturday": [{"open": "17:00", "close": "02:00"}], "sunday": [{"open": "14:00", "close": "23:00"}]}',
  ARRAY['drag', 'performance', 'cabaret', 'queer-mixed', 'local-favorite', 'underground'],
  '$$', 'Underground drag and cabaret venue in Haggerston.', 'The Glory is known for avant-garde performances and drag shows.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 88, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'dalston-superstore', 'Dalston Superstore', 'London', 'GB',
  'Dalston', '117 Kingsland High Street, London E8 2PB',
  51.5468, -0.0752,
  'https://dalstonsuperstore.com', 'https://www.instagram.com/dalstonsuperstore', 'https://www.google.com/maps/place/Dalston+Superstore',
  '["https://dalstonsuperstore.com", "https://www.google.com/maps/place/Dalston+Superstore"]',
  'mixed', '{"monday": [{"open": "12:00", "close": "00:00"}], "tuesday": [{"open": "12:00", "close": "00:00"}], "wednesday": [{"open": "12:00", "close": "00:00"}], "thursday": [{"open": "12:00", "close": "00:00"}], "friday": [{"open": "12:00", "close": "02:00"}], "saturday": [{"open": "12:00", "close": "02:00"}], "sunday": [{"open": "12:00", "close": "23:00"}]}',
  ARRAY['queer-mixed', 'indie', 'artsy', 'underground', 'dancefloor', 'local-favorite'],
  '$', 'Mixed queer venue with indie vibe and dancefloor.', 'Dalston Superstore blends bar, club, and arts space.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 90, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'industry-bar-nyc', 'Industry Bar', 'New York', 'US',
  'Hell''s Kitchen', '355 West 52nd Street, New York NY 10019',
  40.7647, -73.9913,
  'https://www.industry-bar.com', 'https://www.instagram.com/industrybarnyc', 'https://www.google.com/maps/place/Industry+Bar+NYC',
  '["https://www.industry-bar.com", "https://www.google.com/maps/place/Industry+Bar+NYC"]',
  'bar', '{"monday": [{"open": "16:00", "close": "04:00"}], "tuesday": [{"open": "16:00", "close": "04:00"}], "wednesday": [{"open": "16:00", "close": "04:00"}], "thursday": [{"open": "16:00", "close": "04:00"}], "friday": [{"open": "16:00", "close": "04:00"}], "saturday": [{"open": "14:00", "close": "04:00"}], "sunday": [{"open": "14:00", "close": "04:00"}]}',
  ARRAY['dancefloor', 'pop', 'mainstream', 'high-energy', 'queer-mixed', 'tourist-heavy'],
  '$$', 'Popular mainstream gay bar in Hell''s Kitchen.', 'Industry Bar is a staple of NYC nightlife with energetic dancefloor.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 91, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'eagle-nyc', 'The Eagle NYC', 'New York', 'US',
  'Chelsea', '554 West 28th Street, New York NY 10001',
  40.7494, -74.0022,
  'https://www.eaglenyc.com', 'https://www.instagram.com/eaglenyc', 'https://www.google.com/maps/place/The+Eagle+NYC',
  '["https://www.eaglenyc.com", "https://www.google.com/maps/place/The+Eagle+NYC"]',
  'bar', '{"monday": [{"open": "18:00", "close": "04:00"}], "tuesday": [{"open": "18:00", "close": "04:00"}], "wednesday": [{"open": "18:00", "close": "04:00"}], "thursday": [{"open": "18:00", "close": "04:00"}], "friday": [{"open": "18:00", "close": "04:00"}], "saturday": [{"open": "14:00", "close": "04:00"}], "sunday": [{"open": "14:00", "close": "04:00"}]}',
  ARRAY['leather', 'bear', 'masculine', 'rooftop', 'late-night', 'cruising'],
  '$$', 'Rooftop leather bar with bear scene.', 'The Eagle NYC features a popular rooftop and strong leather community.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 88, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'boxers-hells-kitchen', 'Boxers HK', 'New York', 'US',
  'Hell''s Kitchen', '742 9th Avenue, New York NY 10019',
  40.7637, -73.9924,
  'https://www.boxersnyc.com', 'https://www.instagram.com/boxersnyc', 'https://www.google.com/maps/place/Boxers+HK',
  '["https://www.boxersnyc.com", "https://www.google.com/maps/place/Boxers+HK"]',
  'bar', '{"monday": [{"open": "14:00", "close": "02:00"}], "tuesday": [{"open": "14:00", "close": "02:00"}], "wednesday": [{"open": "14:00", "close": "02:00"}], "thursday": [{"open": "14:00", "close": "02:00"}], "friday": [{"open": "14:00", "close": "02:00"}], "saturday": [{"open": "12:00", "close": "02:00"}], "sunday": [{"open": "12:00", "close": "02:00"}]}',
  ARRAY['sports-bar', 'casual', 'neighborhood-bar', 'queer-mixed', 'tourist-heavy'],
  '$', 'Sports bar in Hell''s Kitchen with LGBTQ+ crowd.', 'Boxers is a casual sports bar popular with tourists and locals alike.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 87, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'pieces-bar-nyc', 'Pieces Bar', 'New York', 'US',
  'Greenwich Village', '8 Christopher Street, New York NY 10014',
  40.7335, -74.0027,
  'https://www.piecesbar.com', 'https://www.instagram.com/piecesbarnyc', 'https://www.google.com/maps/place/Pieces+Bar',
  '["https://www.piecesbar.com", "https://www.google.com/maps/place/Pieces+Bar"]',
  'bar', '{"monday": [{"open": "14:00", "close": "04:00"}], "tuesday": [{"open": "14:00", "close": "04:00"}], "wednesday": [{"open": "14:00", "close": "04:00"}], "thursday": [{"open": "14:00", "close": "04:00"}], "friday": [{"open": "14:00", "close": "04:00"}], "saturday": [{"open": "13:00", "close": "04:00"}], "sunday": [{"open": "13:00", "close": "04:00"}]}',
  ARRAY['drag', 'pop', 'neighborhood-bar', 'high-energy', 'local-favorite'],
  '$', 'Drag bar in Village with drag performances.', 'Pieces Bar is famous for drag shows and high-energy atmosphere.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 89, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'stonewall-inn', 'Stonewall Inn', 'New York', 'US',
  'Greenwich Village', '53 Christopher Street, New York NY 10014',
  40.7335, -74.0007,
  'https://thestonewallinnnyc.com', 'https://www.instagram.com/thestonewallinn', 'https://www.google.com/maps/place/Stonewall+Inn',
  '["https://thestonewallinnnyc.com", "https://www.google.com/maps/place/Stonewall+Inn"]',
  'bar', '{"monday": [{"open": "13:00", "close": "04:00"}], "tuesday": [{"open": "13:00", "close": "04:00"}], "wednesday": [{"open": "13:00", "close": "04:00"}], "thursday": [{"open": "13:00", "close": "04:00"}], "friday": [{"open": "13:00", "close": "04:00"}], "saturday": [{"open": "12:00", "close": "04:00"}], "sunday": [{"open": "12:00", "close": "04:00"}]}',
  ARRAY['historic', 'neighborhood-bar', 'queer-mixed', 'tourist-heavy', 'local-favorite', 'casual'],
  '$$', 'Historic LGBTQ+ landmark and birthplace of the modern movement.', 'Stonewall Inn is the iconic site of the 1969 uprising.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 95, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'hardware-bar-nyc', 'Hardware Bar NYC', 'New York', 'US',
  'Hell''s Kitchen', '697 10th Avenue, New York NY 10036',
  40.762, -73.9979,
  'https://hardwarebarnyc.com', 'https://www.instagram.com/hardwarebarnyc', 'https://www.google.com/maps/place/Hardware+Bar',
  '["https://hardwarebarnyc.com", "https://www.google.com/maps/place/Hardware+Bar"]',
  'bar', '{"monday": [{"open": "16:00", "close": "02:00"}], "tuesday": [{"open": "16:00", "close": "02:00"}], "wednesday": [{"open": "16:00", "close": "02:00"}], "thursday": [{"open": "16:00", "close": "02:00"}], "friday": [{"open": "16:00", "close": "02:00"}], "saturday": [{"open": "14:00", "close": "02:00"}], "sunday": [{"open": "14:00", "close": "02:00"}]}',
  ARRAY['bear', 'leather', 'masculine', 'casual', 'neighborhood-bar', 'local-favorite'],
  '$', 'Bear and leather bar in Hell''s Kitchen.', 'Hardware Bar is a casual neighborhood spot for bear community.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 83, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'house-of-yes-nyc', 'House of Yes', 'New York', 'US',
  'Bushwick', '2 Wyckoff Avenue, Brooklyn NY 11237',
  40.7052, -73.9246,
  'https://www.houseofyes.org', 'https://www.instagram.com/houseofyes', 'https://www.google.com/maps/place/House+of+Yes',
  '["https://www.houseofyes.org", "https://www.google.com/maps/place/House+of+Yes"]',
  'club', '{"friday": [{"open": "22:00", "close": "04:00"}], "saturday": [{"open": "22:00", "close": "04:00"}]}',
  ARRAY['performance', 'cabaret', 'queer-friendly', 'immersive', 'dancefloor', 'upscale'],
  '$$$', 'Immersive performance space in Bushwick.', 'House of Yes is known for avant-garde performances and theatrical experiences.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 90, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'metropolitan-bar-brooklyn', 'Metropolitan Bar', 'New York', 'US',
  'Williamsburg', '559 Lorimer Street, Brooklyn NY 11211',
  40.7154, -73.9511,
  'https://www.metropolitanbar.com', 'https://www.instagram.com/metropolitanbarnyc', 'https://www.google.com/maps/place/Metropolitan+Bar',
  '["https://www.metropolitanbar.com", "https://www.google.com/maps/place/Metropolitan+Bar"]',
  'bar', '{"monday": [{"open": "15:00", "close": "04:00"}], "tuesday": [{"open": "15:00", "close": "04:00"}], "wednesday": [{"open": "15:00", "close": "04:00"}], "thursday": [{"open": "15:00", "close": "04:00"}], "friday": [{"open": "15:00", "close": "04:00"}], "saturday": [{"open": "13:00", "close": "04:00"}], "sunday": [{"open": "13:00", "close": "04:00"}]}',
  ARRAY['local-favorite', 'casual', 'neighborhood-bar', 'queer-mixed', 'dancefloor'],
  '$', 'Casual neighborhood bar in Williamsburg.', 'Metropolitan Bar is beloved by Brooklyn locals.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 86, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'gym-sports-bar-nyc', 'Gym Bar NYC', 'New York', 'US',
  'Chelsea', '167 8th Avenue, New York NY 10011',
  40.744, -74.0002,
  'https://www.gymbarnyc.com', 'https://www.instagram.com/gymbarnyc', 'https://www.google.com/maps/place/Gym+Bar',
  '["https://www.gymbarnyc.com", "https://www.google.com/maps/place/Gym+Bar"]',
  'bar', '{"monday": [{"open": "14:00", "close": "02:00"}], "tuesday": [{"open": "14:00", "close": "02:00"}], "wednesday": [{"open": "14:00", "close": "02:00"}], "thursday": [{"open": "14:00", "close": "02:00"}], "friday": [{"open": "14:00", "close": "02:00"}], "saturday": [{"open": "12:00", "close": "02:00"}], "sunday": [{"open": "12:00", "close": "02:00"}]}',
  ARRAY['sports-bar', 'casual', 'queer-mixed', 'tourist-heavy', 'neighborhood-bar'],
  '$$', 'Sports bar in Chelsea.', 'Gym Bar is a casual sports bar in the heart of Chelsea.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 82, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'output-nyc-rph', 'Nowadays', 'New York', 'US',
  'Ridgewood', '56-06 Cooper Avenue, Queens NY 11385',
  40.6995, -73.8951,
  'https://nowadays.nyc', 'https://www.instagram.com/nowadaysnyc', 'https://www.google.com/maps/place/Nowadays+Queens',
  '["https://nowadays.nyc", "https://www.residentadvisor.net/club.aspx?id=61083"]',
  'club', '{"friday": [{"open": "21:00", "close": "06:00"}], "saturday": [{"open": "21:00", "close": "06:00"}], "sunday": [{"open": "21:00", "close": "06:00"}]}',
  ARRAY['techno', 'queer-friendly', 'underground', 'dancefloor', 'afterhours', 'local-favorite'],
  '$$', 'Underground techno club in Ridgewood.', 'Nowadays is known for cutting-edge electronic music and queer community.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 85, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'berghain-berlin', 'Berghain', 'Berlin', 'DE',
  'Friedrichshain', 'Am Wriezener Bahnhof, 10243 Berlin',
  52.5106, 13.4432,
  'https://www.berghain.berlin', 'https://www.instagram.com/berghain_berlin', 'https://www.google.com/maps/place/Berghain',
  '["https://www.berghain.berlin", "https://www.residentadvisor.net/club.aspx?id=4", "https://www.google.com/maps/place/Berghain"]',
  'club', '{"friday": [{"open": "23:59", "close": "06:00"}], "saturday": [{"open": "00:00", "close": "06:00"}], "sunday": [{"open": "00:00", "close": "06:00"}]}',
  ARRAY['techno', 'afterhours', 'masculine', 'dancefloor', 'strict-door', 'late-night', 'underground'],
  '$$', 'Legendary Berlin techno club with strict door policy.', 'Berghain is an iconic underground techno venue in an ex-power station.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 95, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'schwuz-berlin', 'SchwuZ', 'Berlin', 'DE',
  'Neukölln', 'Rollbergstraße 26, 12053 Berlin',
  52.4784, 13.4337,
  'https://www.schwuz.de', 'https://www.instagram.com/schwuz_berlin', 'https://www.google.com/maps/place/SchwuZ',
  '["https://www.schwuz.de", "https://www.residentadvisor.net/club.aspx?id=267", "https://www.google.com/maps/place/SchwuZ"]',
  'club', '{"thursday": [{"open": "22:00", "close": "06:00"}], "friday": [{"open": "22:00", "close": "06:00"}], "saturday": [{"open": "22:00", "close": "06:00"}]}',
  ARRAY['drag', 'pop', 'queer-mixed', 'inclusive', 'dancefloor', 'themed-parties'],
  '$$', 'Queer nightclub with themed parties and drag shows.', 'SchwuZ is a Berlin institution for queer club culture.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 91, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'ficken-3000-berlin', 'Ficken 3000', 'Berlin', 'DE',
  'Kreuzberg', 'Urbanstraße 70, 10967 Berlin',
  52.4904, 13.4089,
  'https://ficken3000.de', 'https://www.instagram.com/ficken3000', 'https://www.google.com/maps/place/Ficken+3000',
  '["https://ficken3000.de", "https://www.google.com/maps/place/Ficken+3000"]',
  'bar', '{"wednesday": [{"open": "22:00", "close": "06:00"}], "thursday": [{"open": "22:00", "close": "06:00"}], "friday": [{"open": "22:00", "close": "06:00"}], "saturday": [{"open": "22:00", "close": "06:00"}]}',
  ARRAY['cruising', 'bear', 'masculine', 'leather', 'late-night', 'local-favorite'],
  '$', 'Cruising bar in Kreuzberg.', 'Ficken 3000 is a local favorite for bear and leather community.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 88, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'moebel-olfe-berlin', 'Möbel Olfe', 'Berlin', 'DE',
  'Kreuzberg', 'Reichenberger Str. 177, 10999 Berlin',
  52.4953, 13.4208,
  NULL, 'https://www.instagram.com/moebelolfe', 'https://www.google.com/maps/place/Möbel+Olfe',
  '["https://www.google.com/maps/place/Möbel+Olfe", "https://www.timeout.com/berlin/bars-and-pubs/mobel-olfe"]',
  'bar', '{"thursday": [{"open": "18:00", "close": "06:00"}], "friday": [{"open": "20:00", "close": "06:00"}], "saturday": [{"open": "20:00", "close": "06:00"}]}',
  ARRAY['queer-mixed', 'underground', 'casual', 'local-favorite', 'neighborhood-bar'],
  '$', 'Underground queer bar in Kreuzberg.', 'Möbel Olfe is beloved by Berlin''s queer underground scene.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 87, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'roses-berlin', 'Roses', 'Berlin', 'DE',
  'Kreuzberg', 'Oranienstraße 187, 10999 Berlin',
  52.4997, 13.4183,
  NULL, 'https://www.instagram.com/rosesberlin', 'https://www.google.com/maps/place/Roses+Berlin',
  '["https://www.google.com/maps/place/Roses+Berlin", "https://www.timeout.com/berlin/bars-and-pubs/roses"]',
  'bar', '{"monday": [{"open": "22:00", "close": "06:00"}], "tuesday": [{"open": "22:00", "close": "06:00"}], "wednesday": [{"open": "22:00", "close": "06:00"}], "thursday": [{"open": "22:00", "close": "06:00"}], "friday": [{"open": "22:00", "close": "06:00"}], "saturday": [{"open": "22:00", "close": "06:00"}], "sunday": [{"open": "22:00", "close": "06:00"}]}',
  ARRAY['queer-mixed', 'kitsch', 'casual', 'local-favorite', 'late-night', 'neighborhood-bar'],
  '$', 'Quirky queer bar with kitsch aesthetic.', 'Roses is a beloved neighborhood bar with unique charm.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 89, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'kitkatclub-berlin', 'KitKatClub', 'Berlin', 'DE',
  'Mitte', 'Köpenicker Str. 76, 10179 Berlin',
  52.5038, 13.4366,
  'https://www.kitkatclub.de', 'https://www.instagram.com/kitkatclub', 'https://www.google.com/maps/place/KitKatClub',
  '["https://www.kitkatclub.de", "https://www.residentadvisor.net/club.aspx?id=14"]',
  'club', '{"friday": [{"open": "23:00", "close": "12:00"}], "saturday": [{"open": "23:00", "close": "12:00"}]}',
  ARRAY['fetish-adjacent', 'techno', 'late-night', 'dancefloor', 'afterhours', 'underground'],
  '$$', 'Fetish and electronic music club.', 'KitKatClub is known for provocative parties and boundary-pushing events.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 90, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'prinzknecht-berlin', 'Prinzknecht', 'Berlin', 'DE',
  'Schöneberg', 'Fuggerstraße 33, 10777 Berlin',
  52.4984, 13.3449,
  'https://www.prinzknecht.de', 'https://www.instagram.com/prinzknecht', 'https://www.google.com/maps/place/Prinzknecht',
  '["https://www.prinzknecht.de", "https://www.google.com/maps/place/Prinzknecht"]',
  'bar', '{"monday": [{"open": "17:00", "close": "06:00"}], "tuesday": [{"open": "17:00", "close": "06:00"}], "wednesday": [{"open": "17:00", "close": "06:00"}], "thursday": [{"open": "17:00", "close": "06:00"}], "friday": [{"open": "16:00", "close": "06:00"}], "saturday": [{"open": "16:00", "close": "06:00"}], "sunday": [{"open": "16:00", "close": "06:00"}]}',
  ARRAY['bear', 'masculine', 'leather', 'casual', 'neighborhood-bar', 'local-favorite'],
  '$', 'Leather bear bar in Schöneberg.', 'Prinzknecht is a long-standing bear bar in Berlin.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 84, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'tresor-berlin', 'Tresor', 'Berlin', 'DE',
  'Mitte', 'Köpenicker Str. 70, 10179 Berlin',
  52.5036, 13.4356,
  'https://www.tresorberlin.com', 'https://www.instagram.com/tresorberlin', 'https://www.google.com/maps/place/Tresor+Berlin',
  '["https://www.tresorberlin.com", "https://www.residentadvisor.net/club.aspx?id=9"]',
  'club', '{"wednesday": [{"open": "00:00", "close": "06:00"}], "thursday": [{"open": "00:00", "close": "06:00"}], "friday": [{"open": "00:00", "close": "06:00"}], "saturday": [{"open": "00:00", "close": "06:00"}]}',
  ARRAY['techno', 'underground', 'dancefloor', 'late-night', 'afterhours', 'queer-friendly'],
  '$$', 'Iconic underground techno club in Mitte.', 'Tresor is a legendary Berlin institution for electronic music.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 92, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'csabar-berlin', 'CSA Bar', 'Berlin', 'DE',
  'Schöneberg', 'Karl-Marx-Str. 96a, 12043 Berlin',
  52.4819, 13.4299,
  NULL, NULL, 'https://www.google.com/maps/place/CSA+Bar+Berlin',
  '["https://www.google.com/maps/place/CSA+Bar+Berlin", "https://www.timeout.com/berlin"]',
  'bar', '{"thursday": [{"open": "20:00", "close": "06:00"}], "friday": [{"open": "20:00", "close": "06:00"}], "saturday": [{"open": "20:00", "close": "06:00"}]}',
  ARRAY['queer-mixed', 'casual', 'neighborhood-bar', 'local-favorite'],
  '$', 'Casual neighborhood queer bar.', 'CSA Bar is a low-key local favorite in Schöneberg.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 80, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'connection-berlin', 'Connection Club', 'Berlin', 'DE',
  'Schöneberg', 'Fuggerstraße 33, 10777 Berlin',
  52.498, 13.345,
  'https://www.connection-berlin.de', NULL, 'https://www.google.com/maps/place/Connection+Club',
  '["https://www.connection-berlin.de", "https://www.google.com/maps/place/Connection+Club"]',
  'club', '{"friday": [{"open": "23:00", "close": "06:00"}], "saturday": [{"open": "23:00", "close": "06:00"}]}',
  ARRAY['circuit', 'dancefloor', 'masculine', 'late-night', 'afterhours'],
  '$$', 'Circuit club in Schöneberg.', 'Connection is a destination for circuit party enthusiasts.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 83, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'why-not-madrid', 'Why Not?', 'Madrid', 'ES',
  'Chueca', 'Calle de San Bartolomé 7, 28004 Madrid',
  40.4237, -3.6982,
  'https://www.whynotmadrid.com', 'https://www.instagram.com/whynotmadrid', 'https://www.google.com/maps/place/Why+Not+Club+Madrid',
  '["https://www.whynotmadrid.com", "https://www.google.com/maps/place/Why+Not+Club+Madrid"]',
  'club', '{"monday": [{"open": "22:30", "close": "05:30"}], "tuesday": [{"open": "22:30", "close": "05:30"}], "wednesday": [{"open": "22:30", "close": "05:30"}], "thursday": [{"open": "22:30", "close": "05:30"}], "friday": [{"open": "22:30", "close": "05:30"}], "saturday": [{"open": "22:30", "close": "05:30"}], "sunday": [{"open": "22:30", "close": "05:30"}]}',
  ARRAY['pop', 'mainstream', 'high-energy', 'dancefloor', 'tourist-heavy', 'late-night'],
  '$$', 'Popular pop club in Chueca.', 'Why Not? is a mainstream destination in Madrid''s gay district.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 88, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'black-and-white-madrid', 'Black & White', 'Madrid', 'ES',
  'Chueca', 'Calle de la Libertad 34, 28004 Madrid',
  40.4235, -3.6968,
  'https://www.blackandwhite.es', 'https://www.instagram.com/blackandwhitemadrid', 'https://www.google.com/maps/place/Black+White+Madrid',
  '["https://www.blackandwhite.es", "https://www.google.com/maps/place/Black+White+Madrid"]',
  'bar', '{"monday": [{"open": "20:00", "close": "04:00"}], "tuesday": [{"open": "20:00", "close": "04:00"}], "wednesday": [{"open": "20:00", "close": "04:00"}], "thursday": [{"open": "20:00", "close": "04:00"}], "friday": [{"open": "20:00", "close": "04:00"}], "saturday": [{"open": "20:00", "close": "04:00"}], "sunday": [{"open": "20:00", "close": "04:00"}]}',
  ARRAY['pop', 'mainstream', 'queer-mixed', 'tourist-heavy', 'neighborhood-bar'],
  '$$', 'Mainstream bar in Chueca with mixed clientele.', 'Black & White is a popular spot for tourists in Chueca.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 86, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'leather-bar-madrid', 'Leather Club Madrid', 'Madrid', 'ES',
  'Chueca', 'Calle del Pelayo 42, 28004 Madrid',
  40.4255, -3.696,
  NULL, NULL, 'https://www.google.com/maps/place/Leather+Bar+Madrid',
  '["https://www.google.com/maps/place/Leather+Bar+Madrid"]',
  'bar', '{"friday": [{"open": "22:00", "close": "06:00"}], "saturday": [{"open": "22:00", "close": "06:00"}]}',
  ARRAY['leather', 'bear', 'masculine', 'local-favorite'],
  '$', 'Leather bar in Chueca.', 'Leather Club caters to Madrid''s bear and leather community.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 79, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'cool-bar-madrid', 'Cool Bar', 'Madrid', 'ES',
  'Chueca', 'Calle de Isabel la Católica 6, 28013 Madrid',
  40.4175, -3.7073,
  NULL, 'https://www.instagram.com/coolbarmadrid', 'https://www.google.com/maps/place/Cool+Bar+Madrid',
  '["https://www.google.com/maps/place/Cool+Bar+Madrid"]',
  'bar', '{"monday": [{"open": "22:00", "close": "04:00"}], "tuesday": [{"open": "22:00", "close": "04:00"}], "wednesday": [{"open": "22:00", "close": "04:00"}], "thursday": [{"open": "22:00", "close": "04:00"}], "friday": [{"open": "22:00", "close": "04:00"}], "saturday": [{"open": "22:00", "close": "04:00"}], "sunday": [{"open": "22:00", "close": "04:00"}]}',
  ARRAY['cocktail', 'upscale', 'queer-mixed', 'local-favorite'],
  '$$', 'Upscale cocktail bar.', 'Cool Bar offers craft cocktails and sophisticated atmosphere.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 81, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'fabrik-madrid', 'Fabrik', 'Madrid', 'ES',
  'Humanes', 'Autovía A-42, Km 12,5, 28970 Humanes de Madrid',
  40.3197, -3.8151,
  'https://www.fabricmadrid.es', 'https://www.instagram.com/fabrickmadrid', 'https://www.google.com/maps/place/Fabrik+Madrid',
  '["https://www.fabricmadrid.es", "https://www.google.com/maps/place/Fabrik+Madrid"]',
  'club', '{"saturday": [{"open": "23:00", "close": "10:00"}]}',
  ARRAY['circuit', 'massive', 'techno', 'high-energy', 'dancefloor', 'late-night'],
  '$$$', 'Massive circuit club outside Madrid.', 'Fabrik is a legendary destination for circuit parties.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 91, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'pride-bar-madrid', 'LGTB Pride Bar', 'Madrid', 'ES',
  'Chueca', 'Calle del Barbieri 7, 28004 Madrid',
  40.4241, -3.6965,
  NULL, NULL, 'https://www.google.com/maps/place/Pride+Bar+Madrid',
  '["https://www.google.com/maps/place/Pride+Bar+Madrid"]',
  'bar', '{"monday": [{"open": "18:00", "close": "04:00"}], "tuesday": [{"open": "18:00", "close": "04:00"}], "wednesday": [{"open": "18:00", "close": "04:00"}], "thursday": [{"open": "18:00", "close": "04:00"}], "friday": [{"open": "18:00", "close": "04:00"}], "saturday": [{"open": "18:00", "close": "04:00"}], "sunday": [{"open": "18:00", "close": "04:00"}]}',
  ARRAY['casual', 'queer-mixed', 'neighborhood-bar', 'tourist-heavy'],
  '$', 'Casual bar in Chueca.', 'Pride Bar is a welcoming neighborhood spot.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 77, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'ohm-club-madrid', 'Ohm Club', 'Madrid', 'ES',
  'Gran Via', 'Plaza de Callao 4, 28013 Madrid',
  40.4196, -3.7076,
  NULL, 'https://www.instagram.com/ohmclubmadrid', 'https://www.google.com/maps/place/Ohm+Club+Madrid',
  '["https://www.google.com/maps/place/Ohm+Club+Madrid", "https://www.timeout.com/madrid/nightlife"]',
  'club', '{"friday": [{"open": "00:00", "close": "06:00"}], "saturday": [{"open": "00:00", "close": "06:00"}]}',
  ARRAY['circuit', 'pop', 'high-energy', 'dancefloor', 'tourist-heavy', 'mainstream'],
  '$$', 'Circuit club near Plaza de Callao.', 'Ohm Club is a popular destination for party-goers.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 86, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'escape-club-madrid', 'Escape Club Madrid', 'Madrid', 'ES',
  'Chueca', 'Calle del Gravina 13, 28004 Madrid',
  40.4245, -3.6957,
  NULL, NULL, 'https://www.google.com/maps/place/Escape+Club+Madrid',
  '["https://www.google.com/maps/place/Escape+Club+Madrid"]',
  'club', '{"friday": [{"open": "23:00", "close": "06:00"}], "saturday": [{"open": "23:00", "close": "06:00"}]}',
  ARRAY['pop', 'mainstream', 'dancefloor', 'local-favorite'],
  '$$', 'Pop club in Chueca.', 'Escape Club is a local favorite for dancing.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 80, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'contact-bar-madrid', 'Contact Bar Madrid', 'Madrid', 'ES',
  'Chueca', 'Calle del Pelayo 27, 28004 Madrid',
  40.4258, -3.6956,
  NULL, NULL, 'https://www.google.com/maps/place/Contact+Bar+Madrid',
  '["https://www.google.com/maps/place/Contact+Bar+Madrid"]',
  'bar', '{"thursday": [{"open": "21:00", "close": "06:00"}], "friday": [{"open": "21:00", "close": "06:00"}], "saturday": [{"open": "21:00", "close": "06:00"}], "sunday": [{"open": "21:00", "close": "06:00"}]}',
  ARRAY['bear', 'masculine', 'local-favorite', 'casual'],
  '$', 'Bear bar in Chueca.', 'Contact Bar is a laid-back spot for the bear community.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 76, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'we-party-madrid', 'WE Party Madrid', 'Madrid', 'ES',
  'Multiple', NULL,
  NULL, NULL,
  'https://www.weparty.com', 'https://www.instagram.com/weparty', NULL,
  '["https://www.weparty.com"]',
  'event_space', NULL,
  ARRAY['circuit', 'massive', 'international', 'high-energy', 'dancefloor'],
  '$$$', 'International circuit party promoter.', 'WE Party produces massive events across Madrid venues.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 60, 'needs_manual_review'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'club-nyx-amsterdam', 'Club NYX', 'Amsterdam', 'NL',
  'Reguliersdwarsstraat', 'Reguliersdwarsstraat 42, 1017 BM Amsterdam',
  52.3644, 4.8948,
  'https://www.clubnyx.nl', 'https://www.instagram.com/clubnyxamsterdam', 'https://www.google.com/maps/place/Club+NYX+Amsterdam',
  '["https://www.clubnyx.nl", "https://www.google.com/maps/place/Club+NYX+Amsterdam"]',
  'club', '{"thursday": [{"open": "22:00", "close": "04:00"}], "friday": [{"open": "22:00", "close": "04:00"}], "saturday": [{"open": "22:00", "close": "04:00"}], "sunday": [{"open": "22:00", "close": "04:00"}]}',
  ARRAY['dancefloor', 'pop', 'mainstream', 'high-energy', 'tourist-heavy', 'queer-mixed'],
  '$$', 'Popular club in Amsterdam''s gay district.', 'Club NYX is a mainstream venue on Reguliersdwarsstraat.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 89, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'cafe-reality-amsterdam', 'Cafe Reality', 'Amsterdam', 'NL',
  'Reguliersdwarsstraat', 'Reguliersdwarsstraat 129, 1017 BK Amsterdam',
  52.3646, 4.8955,
  NULL, 'https://www.instagram.com/caferealityamsterdam', 'https://www.google.com/maps/place/Cafe+Reality+Amsterdam',
  '["https://www.google.com/maps/place/Cafe+Reality+Amsterdam"]',
  'bar', '{"monday": [{"open": "14:00", "close": "01:00"}], "tuesday": [{"open": "14:00", "close": "01:00"}], "wednesday": [{"open": "14:00", "close": "01:00"}], "thursday": [{"open": "14:00", "close": "01:00"}], "friday": [{"open": "14:00", "close": "03:00"}], "saturday": [{"open": "14:00", "close": "03:00"}], "sunday": [{"open": "14:00", "close": "01:00"}]}',
  ARRAY['queer-mixed', 'casual', 'neighborhood-bar', 'local-favorite'],
  '$$', 'Casual neighborhood bar.', 'Cafe Reality is a beloved local spot on the gay street.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 84, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'prik-amsterdam', 'Prik', 'Amsterdam', 'NL',
  'Spuistraat', 'Spuistraat 109, 1012 SV Amsterdam',
  52.3733, 4.8908,
  'https://www.prikamsterdam.nl', 'https://www.instagram.com/prikamsterdam', 'https://www.google.com/maps/place/Prik+Amsterdam',
  '["https://www.prikamsterdam.nl", "https://www.google.com/maps/place/Prik+Amsterdam"]',
  'bar', '{"tuesday": [{"open": "17:00", "close": "01:00"}], "wednesday": [{"open": "17:00", "close": "01:00"}], "thursday": [{"open": "17:00", "close": "01:00"}], "friday": [{"open": "17:00", "close": "03:00"}], "saturday": [{"open": "17:00", "close": "03:00"}], "sunday": [{"open": "15:00", "close": "01:00"}]}',
  ARRAY['queer-mixed', 'cocktail', 'casual', 'local-favorite', 'neighborhood-bar'],
  '$$', 'Cocktail bar with queer-friendly vibe.', 'Prik is a neighborhood favorite for craft cocktails.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 87, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'club-church-amsterdam', 'Club Church', 'Amsterdam', 'NL',
  'Kerkstraat', 'Kerkstraat 52, 1017 GM Amsterdam',
  52.3622, 4.8914,
  'https://www.clubchurch.nl', 'https://www.instagram.com/clubchurch', 'https://www.google.com/maps/place/Club+Church+Amsterdam',
  '["https://www.clubchurch.nl", "https://www.google.com/maps/place/Club+Church+Amsterdam"]',
  'club', '{"friday": [{"open": "23:00", "close": "06:00"}], "saturday": [{"open": "23:00", "close": "06:00"}]}',
  ARRAY['fetish-adjacent', 'leather', 'bear', 'dancefloor', 'late-night', 'masculine'],
  '$$', 'Leather-oriented club.', 'Club Church caters to Amsterdam''s leather and bear community.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 88, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'eagle-amsterdam', 'Eagle Amsterdam', 'Amsterdam', 'NL',
  'Warmoesstraat', 'Warmoesstraat 90, 1012 JH Amsterdam',
  52.3741, 4.8996,
  'https://www.eagle-amsterdam.nl', NULL, 'https://www.google.com/maps/place/Eagle+Amsterdam',
  '["https://www.eagle-amsterdam.nl", "https://www.google.com/maps/place/Eagle+Amsterdam"]',
  'bar', '{"friday": [{"open": "22:00", "close": "06:00"}], "saturday": [{"open": "22:00", "close": "06:00"}]}',
  ARRAY['leather', 'bear', 'masculine', 'late-night', 'local-favorite', 'cruising'],
  '$', 'Leather bar in Red Light District.', 'Eagle Amsterdam is a late-night leather bar.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 82, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'soho-amsterdam', 'Soho Amsterdam', 'Amsterdam', 'NL',
  'Reguliersdwarsstraat', 'Reguliersdwarsstraat 36, 1017 BM Amsterdam',
  52.3643, 4.8945,
  NULL, 'https://www.instagram.com/sohoamsterdam', 'https://www.google.com/maps/place/Soho+Amsterdam',
  '["https://www.google.com/maps/place/Soho+Amsterdam"]',
  'bar', '{"monday": [{"open": "14:00", "close": "01:00"}], "tuesday": [{"open": "14:00", "close": "01:00"}], "wednesday": [{"open": "14:00", "close": "01:00"}], "thursday": [{"open": "14:00", "close": "01:00"}], "friday": [{"open": "14:00", "close": "03:00"}], "saturday": [{"open": "14:00", "close": "03:00"}], "sunday": [{"open": "14:00", "close": "01:00"}]}',
  ARRAY['mainstream', 'pop', 'tourist-heavy', 'casual', 'neighborhood-bar'],
  '$$', 'Mainstream bar in gay district.', 'Soho Amsterdam is a popular tourist spot.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 81, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'queens-head-amsterdam', 'Queen''s Head', 'Amsterdam', 'NL',
  'Zeedijk', 'Zeedijk 20, 1012 Amsterdam',
  52.3748, 4.9002,
  'https://www.queenshead.nl', 'https://www.instagram.com/queensheadams', 'https://www.google.com/maps/place/Queen''s+Head+Amsterdam',
  '["https://www.queenshead.nl", "https://www.google.com/maps/place/Queen''s+Head+Amsterdam"]',
  'bar', '{"monday": [{"open": "16:00", "close": "01:00"}], "tuesday": [{"open": "16:00", "close": "01:00"}], "wednesday": [{"open": "16:00", "close": "01:00"}], "thursday": [{"open": "16:00", "close": "01:00"}], "friday": [{"open": "16:00", "close": "03:00"}], "saturday": [{"open": "16:00", "close": "03:00"}], "sunday": [{"open": "14:00", "close": "01:00"}]}',
  ARRAY['drag', 'performance', 'casual', 'queer-mixed', 'local-favorite'],
  '$$', 'Drag bar with performances.', 'Queen''s Head is known for drag shows and performances.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 85, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'web-amsterdam', 'The Web', 'Amsterdam', 'NL',
  'Sint Jacobsstraat', 'Sint Jacobsstraat 6, 1012 NC Amsterdam',
  52.3758, 4.9015,
  'https://www.webamsterdam.nl', NULL, 'https://www.google.com/maps/place/The+Web+Amsterdam',
  '["https://www.webamsterdam.nl", "https://www.google.com/maps/place/The+Web+Amsterdam"]',
  'bar', '{"monday": [{"open": "14:00", "close": "06:00"}], "tuesday": [{"open": "14:00", "close": "06:00"}], "wednesday": [{"open": "14:00", "close": "06:00"}], "thursday": [{"open": "14:00", "close": "06:00"}], "friday": [{"open": "14:00", "close": "06:00"}], "saturday": [{"open": "14:00", "close": "06:00"}], "sunday": [{"open": "14:00", "close": "06:00"}]}',
  ARRAY['leather', 'bear', 'cruising', 'masculine', 'casual'],
  '$', 'Leather bar in Red Light District.', 'The Web is a long-standing leather bar.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 79, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'spijkerbar-amsterdam', 'Spijkerbar', 'Amsterdam', 'NL',
  'Kerkstraat', 'Kerkstraat 4, 1017 GJ Amsterdam',
  52.3636, 4.89,
  'https://www.spijkerbar.nl', 'https://www.instagram.com/spijkerbar', 'https://www.google.com/maps/place/Spijkerbar+Amsterdam',
  '["https://www.spijkerbar.nl", "https://www.google.com/maps/place/Spijkerbar+Amsterdam"]',
  'bar', '{"monday": [{"open": "14:00", "close": "01:00"}], "tuesday": [{"open": "14:00", "close": "01:00"}], "wednesday": [{"open": "14:00", "close": "01:00"}], "thursday": [{"open": "14:00", "close": "01:00"}], "friday": [{"open": "14:00", "close": "03:00"}], "saturday": [{"open": "14:00", "close": "03:00"}], "sunday": [{"open": "14:00", "close": "01:00"}]}',
  ARRAY['bear', 'casual', 'neighborhood-bar', 'local-favorite', 'masculine'],
  '$', 'Bear bar on Kerkstraat.', 'Spijkerbar is a local bear bar in Amsterdam.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 83, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'cockring-amsterdam', 'Cockring', 'Amsterdam', 'NL',
  'Warmoesstraat', 'Warmoesstraat 96, 1012 JH Amsterdam',
  52.3742, 4.8998,
  'https://www.cockring.eu', NULL, 'https://www.google.com/maps/place/Cockring+Amsterdam',
  '["https://www.cockring.eu", "https://www.google.com/maps/place/Cockring+Amsterdam"]',
  'club', '{"friday": [{"open": "23:00", "close": "06:00"}], "saturday": [{"open": "23:00", "close": "06:00"}]}',
  ARRAY['leather', 'cruise', 'masculine', 'late-night', 'dancefloor'],
  '$$', 'Leather cruise club.', 'Cockring is a venue for leather and cruise culture.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00Z', 78, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'dj-station-bangkok', 'DJ Station', 'Bangkok', 'TH',
  'Silom', '8/6-8 Silom Road Soi 2, Bangkok 10500',
  13.7284, 100.5294,
  'https://www.djstation.net', 'https://www.instagram.com/djstationbkk', 'https://www.google.com/maps/place/DJ+Station',
  '["https://www.djstation.net", "https://www.google.com/maps/place/DJ+Station", "https://www.timeout.com/bangkok/bars/dj-station"]',
  'club', '{"monday": [{"open": "22:00", "close": "03:00"}], "tuesday": [{"open": "22:00", "close": "03:00"}], "wednesday": [{"open": "22:00", "close": "03:00"}], "thursday": [{"open": "22:00", "close": "03:00"}], "friday": [{"open": "22:00", "close": "03:00"}], "saturday": [{"open": "22:00", "close": "03:00"}], "sunday": [{"open": "22:00", "close": "03:00"}]}',
  ARRAY['drag', 'pop', 'high-energy', 'dancefloor', 'tourist-heavy', 'mainstream'],
  '$$', 'Bangkok''s best-known multi-floor gay club on Silom Soi 2, famous for nightly drag shows.', 'DJ Station is the anchor of Bangkok''s Silom gay strip, drawing a mixed tourist and local crowd nightly. Three floors of pop music and drag performances make it a rite of passage for visitors. Peak crowd from midnight to 2am.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 91, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'balcony-bar-bangkok', 'Balcony Bar', 'Bangkok', 'TH',
  'Silom', 'Silom Soi 4, Bangkok 10500',
  13.7289, 100.5302,
  'https://www.balconybarbangkok.com', 'https://www.instagram.com/balconybarbkk', 'https://www.google.com/maps/place/Balcony+Bar+Bangkok',
  '["https://www.balconybarbangkok.com", "https://www.google.com/maps/place/Balcony+Bar+Bangkok"]',
  'bar', '{"monday": [{"open": "17:00", "close": "02:00"}], "tuesday": [{"open": "17:00", "close": "02:00"}], "wednesday": [{"open": "17:00", "close": "02:00"}], "thursday": [{"open": "17:00", "close": "02:00"}], "friday": [{"open": "17:00", "close": "02:00"}], "saturday": [{"open": "17:00", "close": "02:00"}], "sunday": [{"open": "17:00", "close": "02:00"}]}',
  ARRAY['casual', 'neighborhood-bar', 'tourist-heavy', 'queer-mixed', 'rooftop'],
  '$', 'Open-fronted bar on Silom Soi 4, perfect for street watching and a relaxed pre-club drink.', 'One of the most relaxed spots on the Silom strip, Balcony Bar offers an open terrace and casual vibe that draws early-evening crowds before they head to the clubs. Popular with tourists and expats alike.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 89, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'g-bangkok', 'G Bangkok', 'Bangkok', 'TH',
  'Silom', '60/18-21 Silom Soi 2/1, Bangkok 10500',
  13.7281, 100.5289,
  'https://www.gbangkok.com', 'https://www.instagram.com/gbangkok', 'https://www.google.com/maps/place/G+Bangkok',
  '["https://www.gbangkok.com", "https://www.google.com/maps/place/G+Bangkok"]',
  'club', '{"monday": [{"open": "22:00", "close": "03:00"}], "tuesday": [{"open": "22:00", "close": "03:00"}], "wednesday": [{"open": "22:00", "close": "03:00"}], "thursday": [{"open": "22:00", "close": "03:00"}], "friday": [{"open": "22:00", "close": "03:00"}], "saturday": [{"open": "22:00", "close": "03:00"}], "sunday": [{"open": "22:00", "close": "03:00"}]}',
  ARRAY['dancefloor', 'EDM', 'circuit', 'high-energy', 'tourist-heavy'],
  '$$', 'High-energy dance club on Silom with a shirtless crowd and EDM-heavy programming.', 'G Bangkok competes with DJ Station for the circuit and EDM crowd on the Silom strip. Multiple floors and strong sound system. Known for themed nights and a younger, more energetic crowd than its neighbours.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 88, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'telephone-pub-bangkok', 'Telephone Pub', 'Bangkok', 'TH',
  'Silom', '114/11-13 Silom Soi 4, Bangkok 10500',
  13.729, 100.5306,
  NULL, 'https://www.instagram.com/telephonebangkok', 'https://www.google.com/maps/place/Telephone+Pub+Bangkok',
  '["https://www.google.com/maps/place/Telephone+Pub+Bangkok", "https://www.timeout.com/bangkok/bars/telephone-pub"]',
  'bar', '{"monday": [{"open": "18:00", "close": "02:00"}], "tuesday": [{"open": "18:00", "close": "02:00"}], "wednesday": [{"open": "18:00", "close": "02:00"}], "thursday": [{"open": "18:00", "close": "02:00"}], "friday": [{"open": "18:00", "close": "02:00"}], "saturday": [{"open": "18:00", "close": "02:00"}], "sunday": [{"open": "18:00", "close": "02:00"}]}',
  ARRAY['casual', 'tourist-heavy', 'queer-mixed', 'neighborhood-bar', 'retro'],
  '$', 'Classic Silom Soi 4 institution with table-top phone gimmick and easy-going local crowd.', 'Telephone Pub is one of the original Silom Soi 4 bars, known for the table-top phones you can use to call other tables. A relaxed, unpretentious atmosphere popular with tourists and long-term Bangkok visitors.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 85, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'stranger-bar-bangkok', 'The Stranger Bar', 'Bangkok', 'TH',
  'Silom', 'Silom Soi 4, Bangkok 10500',
  13.7286, 100.5297,
  NULL, 'https://www.instagram.com/thestrangerbkk', 'https://www.google.com/maps/place/The+Stranger+Bar+Bangkok',
  '["https://www.google.com/maps/place/The+Stranger+Bar+Bangkok"]',
  'bar', '{"monday": [{"open": "18:00", "close": "02:00"}], "tuesday": [{"open": "18:00", "close": "02:00"}], "wednesday": [{"open": "18:00", "close": "02:00"}], "thursday": [{"open": "18:00", "close": "02:00"}], "friday": [{"open": "18:00", "close": "02:00"}], "saturday": [{"open": "18:00", "close": "02:00"}], "sunday": [{"open": "18:00", "close": "02:00"}]}',
  ARRAY['casual', 'neighborhood-bar', 'tourist-heavy', 'queer-mixed'],
  '$', 'Laid-back Silom Soi 4 bar with strong pours and a mixed local and tourist crowd nightly.', 'The Stranger Bar sits in the thick of Silom Soi 4 and delivers exactly what it promises — a no-frills, casual gay bar with cheap drinks and a friendly mix of tourists and regulars.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 83, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'bearbie-bangkok', 'Bearbie', 'Bangkok', 'TH',
  'Silom', 'Silom Soi 2, Bangkok 10500',
  13.7283, 100.5291,
  NULL, 'https://www.instagram.com/bearbiebangkok', 'https://www.google.com/maps/place/Bearbie+Bangkok',
  '["https://www.google.com/maps/place/Bearbie+Bangkok"]',
  'bar', '{"monday": [{"open": "20:00", "close": "02:00"}], "tuesday": [{"open": "20:00", "close": "02:00"}], "wednesday": [{"open": "20:00", "close": "02:00"}], "thursday": [{"open": "20:00", "close": "02:00"}], "friday": [{"open": "20:00", "close": "02:00"}], "saturday": [{"open": "20:00", "close": "02:00"}], "sunday": [{"open": "20:00", "close": "02:00"}]}',
  ARRAY['bear', 'casual', 'masculine', 'local-favorite', 'neighborhood-bar'],
  '$', 'Dedicated bear bar on Silom Soi 2 with a welcoming masculine crowd.', 'Bearbie is Bangkok''s go-to spot for the bear community. A relaxed, no-pretence bar atmosphere with a loyal local following. One of the few venues on the Silom strip catering specifically to a masculine/bear crowd.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 80, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'babylon-bangkok', 'Babylon Bangkok', 'Bangkok', 'TH',
  'Sathorn', '34 Soi Nantha, Bangkok 10120',
  13.7199, 100.5345,
  'https://www.babylon-bangkok.com', 'https://www.instagram.com/babylonbangkok', 'https://www.google.com/maps/place/Babylon+Bangkok',
  '["https://www.babylon-bangkok.com", "https://www.google.com/maps/place/Babylon+Bangkok"]',
  'sauna', '{"monday": [{"open": "07:00", "close": "00:00"}], "tuesday": [{"open": "07:00", "close": "00:00"}], "wednesday": [{"open": "07:00", "close": "00:00"}], "thursday": [{"open": "07:00", "close": "00:00"}], "friday": [{"open": "07:00", "close": "00:00"}], "saturday": [{"open": "07:00", "close": "00:00"}], "sunday": [{"open": "07:00", "close": "00:00"}]}',
  ARRAY['sauna', 'bear', 'masculine', 'upscale', 'local-favorite'],
  '$$', 'Bangkok''s most established gay sauna, known for its well-maintained facilities in Sathorn.', 'Babylon has been Bangkok''s premier gay sauna for decades. Set in a quieter Sathorn side street, it offers multiple floors of sauna, steam, pool, and massage facilities. Popular with both locals and international visitors.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 86, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'fake-club-bangkok', 'Fake Club', 'Bangkok', 'TH',
  'Ratchadapisek', 'Ratchadapisek Road, Bangkok 10310',
  13.7623, 100.5612,
  NULL, 'https://www.instagram.com/fakeclubth', 'https://www.google.com/maps/place/Fake+Club+Bangkok',
  '["https://www.google.com/maps/place/Fake+Club+Bangkok"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [], "saturday": [], "sunday": [], "notes": "Event-based; Fri–Sat from 22:00 typically"}',
  ARRAY['dancefloor', 'pop', 'high-energy', 'mainstream'],
  '$$', 'Popular Ratchadapisek club with a queer-friendly following and high-energy weekend nights.', 'Fake Club operates in the Ratchadapisek entertainment corridor, drawing a mixed crowd for its weekend club nights. Known for drag performances and chart-heavy music policy.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 79, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'disco-bangkok', 'Disco Bangkok', 'Bangkok', 'TH',
  'Silom', 'Silom Soi 4, Bangkok 10500',
  13.7288, 100.53,
  NULL, NULL, 'https://www.google.com/maps/place/Disco+Bangkok',
  '["https://www.google.com/maps/place/Disco+Bangkok"]',
  'bar', '{"monday": [{"open": "20:00", "close": "02:00"}], "tuesday": [{"open": "20:00", "close": "02:00"}], "wednesday": [{"open": "20:00", "close": "02:00"}], "thursday": [{"open": "20:00", "close": "02:00"}], "friday": [{"open": "20:00", "close": "02:00"}], "saturday": [{"open": "20:00", "close": "02:00"}], "sunday": [{"open": "20:00", "close": "02:00"}]}',
  ARRAY['casual', 'pop', 'tourist-heavy', 'queer-mixed'],
  '$', 'No-frills Silom Soi 4 bar with retro décor and an easy-going mixed crowd.', 'Disco Bangkok is one of the original bars on Silom Soi 4, with a retro interior and laid-back atmosphere. Good for a first drink before heading deeper into the strip.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 77, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'adam-bangkok', 'Adam Bangkok', 'Bangkok', 'TH',
  'Silom', 'Silom Soi 2, Bangkok 10500',
  13.7282, 100.5288,
  NULL, NULL, 'https://www.google.com/maps/place/Adam+Bangkok',
  '["https://www.google.com/maps/place/Adam+Bangkok"]',
  'bar', '{"monday": [{"open": "20:00", "close": "02:00"}], "tuesday": [{"open": "20:00", "close": "02:00"}], "wednesday": [{"open": "20:00", "close": "02:00"}], "thursday": [{"open": "20:00", "close": "02:00"}], "friday": [{"open": "20:00", "close": "02:00"}], "saturday": [{"open": "20:00", "close": "02:00"}], "sunday": [{"open": "20:00", "close": "02:00"}]}',
  ARRAY['casual', 'bear', 'queer-mixed', 'neighborhood-bar'],
  '$', 'Small, welcoming bar on Silom Soi 2 catering to a bear and casual queer crowd.', 'Adam Bangkok is a smaller, character-driven bar on Silom Soi 2. Known for friendly staff and a regular local crowd. Good complement to the bigger clubs on the same strip.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 75, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'arq-sydney', 'ARQ Sydney', 'Sydney', 'AU',
  'Darlinghurst', '16 Flinders Street, Darlinghurst NSW 2010',
  -33.8782, 151.2197,
  'https://www.arqsydney.com.au', 'https://www.instagram.com/arqsydney', 'https://www.google.com/maps/place/ARQ+Sydney',
  '["https://www.arqsydney.com.au", "https://www.google.com/maps/place/ARQ+Sydney"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "21:00", "close": "05:00"}], "saturday": [{"open": "21:00", "close": "05:00"}], "sunday": [{"open": "21:00", "close": "03:00"}]}',
  ARRAY['dancefloor', 'pop', 'circuit', 'high-energy', 'mainstream', 'tourist-heavy'],
  '$$', 'Sydney''s largest gay nightclub, a Darlinghurst institution running since the 1990s.', 'ARQ is the beating heart of Sydney''s gay nightlife. Over three levels including a main dance floor, mezzanine bar, and outdoor terrace, it draws a mixed crowd for its pop and circuit nights. Synonymous with Sydney''s Mardi Gras season.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 90, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'stonewall-sydney', 'Stonewall Hotel', 'Sydney', 'AU',
  'Darlinghurst', '175 Oxford Street, Darlinghurst NSW 2010',
  -33.8789, 151.2189,
  'https://www.stonewallhotel.com.au', 'https://www.instagram.com/stonewallhotel', 'https://www.google.com/maps/place/Stonewall+Hotel+Sydney',
  '["https://www.stonewallhotel.com.au", "https://www.google.com/maps/place/Stonewall+Hotel+Sydney"]',
  'bar', '{"monday": [{"open": "10:00", "close": "00:00"}], "tuesday": [{"open": "10:00", "close": "00:00"}], "wednesday": [{"open": "10:00", "close": "00:00"}], "thursday": [{"open": "10:00", "close": "00:00"}], "friday": [{"open": "10:00", "close": "03:00"}], "saturday": [{"open": "10:00", "close": "03:00"}], "sunday": [{"open": "10:00", "close": "00:00"}]}',
  ARRAY['casual', 'drag', 'mainstream', 'tourist-heavy', 'neighborhood-bar', 'queer-mixed'],
  '$', 'Oxford Street cornerstone with multiple bars, drag shows, and a friendly all-day vibe.', 'The Stonewall Hotel has held down a corner of Oxford Street for decades, offering drag shows, DJs, and an all-day pub atmosphere. One of the few venues that genuinely serves the full spectrum of the Oxford Street crowd from afternoon to late night.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 87, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'beresford-hotel-sydney', 'The Beresford Hotel', 'Sydney', 'AU',
  'Surry Hills', '354 Bourke Street, Surry Hills NSW 2010',
  -33.8831, 151.2165,
  'https://www.beresfordhotel.com.au', 'https://www.instagram.com/theberesford', 'https://www.google.com/maps/place/The+Beresford',
  '["https://www.beresfordhotel.com.au", "https://www.google.com/maps/place/The+Beresford"]',
  'bar', '{"monday": [{"open": "10:00", "close": "00:00"}], "tuesday": [{"open": "10:00", "close": "00:00"}], "wednesday": [{"open": "10:00", "close": "00:00"}], "thursday": [{"open": "10:00", "close": "00:00"}], "friday": [{"open": "10:00", "close": "01:00"}], "saturday": [{"open": "10:00", "close": "01:00"}], "sunday": [{"open": "10:00", "close": "00:00"}]}',
  ARRAY['queer-mixed', 'rooftop', 'casual', 'upscale', 'local-favorite'],
  '$$', 'Beloved Surry Hills pub with a large rooftop terrace and a strongly queer-friendly crowd.', 'The Beresford is a Sydney institution that blends a traditional pub feel with genuine LGBTQ+ warmth. The rooftop space is particularly popular on weekends. Slightly removed from the main Oxford Street strip, it has a loyal local following.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 85, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'palms-on-oxford-sydney', 'Palms on Oxford', 'Sydney', 'AU',
  'Darlinghurst', '124 Oxford Street, Darlinghurst NSW 2010',
  -33.8784, 151.2161,
  NULL, 'https://www.instagram.com/palmsonoxford', 'https://www.google.com/maps/place/Palms+on+Oxford+Sydney',
  '["https://www.google.com/maps/place/Palms+on+Oxford+Sydney"]',
  'bar', '{"monday": [], "tuesday": [{"open": "18:00", "close": "02:00"}], "wednesday": [{"open": "18:00", "close": "02:00"}], "thursday": [{"open": "18:00", "close": "02:00"}], "friday": [{"open": "18:00", "close": "02:00"}], "saturday": [{"open": "18:00", "close": "02:00"}], "sunday": [{"open": "18:00", "close": "02:00"}]}',
  ARRAY['drag', 'pop', 'casual', 'tourist-heavy', 'neighborhood-bar'],
  '$', 'Oxford Street drag bar known for regular performances and a laid-back welcome-all vibe.', 'Palms on Oxford serves as a reliable drag venue on the main Oxford Street strip. Regular performer nights draw a mixed crowd of tourists and locals. One of the more affordable options on the strip.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 83, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'colombian-hotel-sydney', 'The Colombian Hotel', 'Sydney', 'AU',
  'Darlinghurst', '117-123 Oxford Street, Darlinghurst NSW 2010',
  -33.8784, 151.2159,
  'https://www.colombianhotel.com.au', 'https://www.instagram.com/colombianhotel', 'https://www.google.com/maps/place/The+Colombian+Hotel',
  '["https://www.colombianhotel.com.au", "https://www.google.com/maps/place/The+Colombian+Hotel"]',
  'bar', '{"monday": [{"open": "10:00", "close": "00:00"}], "tuesday": [{"open": "10:00", "close": "00:00"}], "wednesday": [{"open": "10:00", "close": "00:00"}], "thursday": [{"open": "10:00", "close": "00:00"}], "friday": [{"open": "10:00", "close": "03:00"}], "saturday": [{"open": "10:00", "close": "03:00"}], "sunday": [{"open": "10:00", "close": "00:00"}]}',
  ARRAY['casual', 'mainstream', 'tourist-heavy', 'queer-mixed', 'neighborhood-bar'],
  '$', 'Multi-level Oxford Street pub with a long history and a casual door policy.', 'The Colombian Hotel is one of the larger pubs on Oxford Street, with multiple levels of bars and a large outdoor terrace. More casual than some neighbours, it draws a broad mixed crowd from afternoon through to late night.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 81, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'oxford-hotel-sydney', 'Oxford Hotel', 'Sydney', 'AU',
  'Darlinghurst', '134 Oxford Street, Darlinghurst NSW 2010',
  -33.8785, 151.2163,
  'https://www.oxfordhotel.com.au', 'https://www.instagram.com/oxfordhotelsydney', 'https://www.google.com/maps/place/Oxford+Hotel+Sydney',
  '["https://www.oxfordhotel.com.au", "https://www.google.com/maps/place/Oxford+Hotel+Sydney"]',
  'bar', '{"monday": [{"open": "10:00", "close": "00:00"}], "tuesday": [{"open": "10:00", "close": "00:00"}], "wednesday": [{"open": "10:00", "close": "00:00"}], "thursday": [{"open": "10:00", "close": "00:00"}], "friday": [{"open": "10:00", "close": "01:00"}], "saturday": [{"open": "10:00", "close": "01:00"}], "sunday": [{"open": "10:00", "close": "00:00"}]}',
  ARRAY['rooftop', 'upscale', 'queer-mixed', 'local-favorite', 'cocktail'],
  '$$', 'Stylish Oxford Street pub with rooftop bar and a smart queer crowd.', 'The Oxford Hotel is a step up from the strip''s more casual pubs. A cocktail-forward rooftop bar and well-maintained interior attract a slightly older, more design-conscious crowd. Popular for early evening gatherings.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 84, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'shift-nightclub-sydney', 'Shift', 'Sydney', 'AU',
  'Darlinghurst', '29 Oxford Street, Darlinghurst NSW 2010',
  -33.876, 151.2137,
  NULL, 'https://www.instagram.com/shiftsydney', 'https://www.google.com/maps/place/Shift+Sydney',
  '["https://www.google.com/maps/place/Shift+Sydney"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "22:00", "close": "05:00"}], "saturday": [{"open": "22:00", "close": "05:00"}], "sunday": []}',
  ARRAY['dancefloor', 'mainstream', 'pop', 'high-energy', 'late-night'],
  '$$', 'Late-night club at the Oxford Street end with a pop and house music policy.', 'Shift is one of the dedicated nightclub options near Oxford Street, drawing a younger crowd for its weekend late-night sessions. Known for an affordable entry price and high-energy dance floor.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 79, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'club-kooky-sydney', 'Club Kooky', 'Sydney', 'AU',
  'Kings Cross', '33-35 Darlinghurst Road, Kings Cross NSW 2011',
  -33.873, 151.2218,
  NULL, 'https://www.instagram.com/clubkooky', 'https://www.google.com/maps/place/Club+Kooky+Sydney',
  '["https://www.google.com/maps/place/Club+Kooky+Sydney"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "22:00", "close": "05:00"}], "saturday": [{"open": "22:00", "close": "05:00"}], "sunday": []}',
  ARRAY['drag', 'pop', 'mainstream', 'dancefloor', 'late-night'],
  '$$', 'Kings Cross drag club known for its wild themed parties and performance-heavy programming.', 'Club Kooky operates in the Kings Cross area, slightly off the main Oxford Street strip. Known for elaborate drag performances and themed nights, it draws a younger creative crowd.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 80, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'gingers-bar-sydney', 'Gingers Bar', 'Sydney', 'AU',
  'Newtown', '20-22 Enmore Road, Newtown NSW 2042',
  -33.8963, 151.1769,
  NULL, NULL, 'https://www.google.com/maps/place/Gingers+Bar+Sydney',
  '["https://www.google.com/maps/place/Gingers+Bar+Sydney"]',
  'bar', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "18:00", "close": "02:00"}], "saturday": [{"open": "18:00", "close": "02:00"}], "sunday": [{"open": "18:00", "close": "00:00"}]}',
  ARRAY['queer-mixed', 'drag', 'casual', 'local-favorite', 'underground'],
  '$', 'Newtown queer bar off the main Oxford Street strip with an alternative, artsy crowd.', 'Gingers Bar sits in Newtown''s creative heartland, serving a queer crowd that gravitates toward the alternative end of the spectrum. A welcome counterpoint to the Oxford Street mainstream, drawing performers and regulars.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 77, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'toolshed-sydney', 'Toolshed', 'Sydney', 'AU',
  'Bondi Junction', '540 Oxford Street, Bondi Junction NSW 2022',
  -33.8912, 151.2486,
  'https://www.toolshed.com.au', NULL, 'https://www.google.com/maps/place/Toolshed+Sydney',
  '["https://www.toolshed.com.au", "https://www.google.com/maps/place/Toolshed+Sydney"]',
  'sauna', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [], "saturday": [], "sunday": [], "notes": "Daily from 12:00; closing times vary"}',
  ARRAY['sauna', 'masculine', 'bear', 'casual'],
  '$$', 'Sydney''s main gay sauna, well-established in Bondi Junction with regular clientele.', 'Toolshed is Sydney''s most prominent gay sauna, located in Bondi Junction. Facilities include sauna, steam room, and social areas. Popular with both locals and visitors seeking a dedicated social space.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 76, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'the-week-sao-paulo', 'The Week São Paulo', 'São Paulo', 'BR',
  'Bom Retiro', 'Rua Guaicurus 324, São Paulo SP 01212-001',
  -23.5268, -46.643,
  'https://www.theweek.com.br', 'https://www.instagram.com/theweekbrasil', 'https://www.google.com/maps/place/The+Week+São+Paulo',
  '["https://www.theweek.com.br", "https://www.google.com/maps/place/The+Week+São+Paulo", "https://www.residentadvisor.net/club.aspx?id=63765"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "23:00", "close": "10:00"}], "saturday": [{"open": "23:00", "close": "10:00"}], "sunday": []}',
  ARRAY['circuit', 'massive', 'dancefloor', 'high-energy', 'techno', 'late-night'],
  '$$$', 'Brazil''s biggest gay club, hosting international circuit parties every weekend in São Paulo.', 'The Week is South America''s most prominent gay club, attracting thousands of visitors for its circuit nights. Set in a massive warehouse-style space in Bom Retiro, it hosts international DJs and is the anchor of São Paulo''s gay nightlife calendar.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 93, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'blue-space-sao-paulo', 'Blue Space', 'São Paulo', 'BR',
  'Lapa', 'Rua Brigadeiro Galvão 723, São Paulo SP 01151-000',
  -23.5323, -46.6568,
  'https://www.bluespaceclub.com.br', 'https://www.instagram.com/bluespacesaopaulo', 'https://www.google.com/maps/place/Blue+Space+São+Paulo',
  '["https://www.bluespaceclub.com.br", "https://www.google.com/maps/place/Blue+Space+São+Paulo"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "23:00", "close": "06:00"}], "saturday": [{"open": "23:00", "close": "06:00"}], "sunday": [{"open": "22:00", "close": "06:00"}]}',
  ARRAY['dancefloor', 'circuit', 'drag', 'high-energy', 'mainstream', 'late-night'],
  '$$', 'São Paulo''s main drag club, known for spectacular shows and a loyal mixed crowd.', 'Blue Space is famous for its drag performances, which are among the most elaborate in Brazil. Multiple floors cater to different music tastes, from pop to electronic. A mainstay of São Paulo''s gay nightlife.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 90, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'club-a-sao-paulo', 'Club A', 'São Paulo', 'BR',
  'Consolação', 'Rua Amauri 305, São Paulo SP 01448-000',
  -23.5724, -46.6709,
  NULL, NULL, 'https://www.google.com/maps/place/Club+A+São+Paulo',
  '["https://www.google.com/maps/place/Club+A+São+Paulo"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "23:00", "close": "06:00"}], "saturday": [{"open": "23:00", "close": "06:00"}], "sunday": []}',
  ARRAY['dancefloor', 'pop', 'mainstream', 'queer-friendly', 'high-energy'],
  '$$', 'Consolação nightclub with a queer-friendly reputation and strong weekend programming.', 'Club A is one of several clubs in São Paulo''s Consolação entertainment district that draws a queer-friendly crowd. Known for its weekend nights featuring a mix of commercial house and pop.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 81, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'le-boy-sao-paulo', 'Le Boy', 'São Paulo', 'BR',
  'Jardins', 'Rua Paim 72, São Paulo SP 01333-000',
  -23.5638, -46.6559,
  'https://www.leboy.com.br', 'https://www.instagram.com/leboysaopaulo', 'https://www.google.com/maps/place/Le+Boy+São+Paulo',
  '["https://www.leboy.com.br", "https://www.google.com/maps/place/Le+Boy+São+Paulo"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "23:00", "close": "06:00"}], "saturday": [{"open": "23:00", "close": "06:00"}], "sunday": []}',
  ARRAY['dancefloor', 'pop', 'mainstream', 'drag', 'high-energy', 'circuit'],
  '$$', 'São Paulo gay club in the Jardins area with drag shows and a loyal weekend crowd.', 'Le Boy has been part of São Paulo''s gay scene for years, offering a more intimate alternative to The Week with drag shows and pop-heavy programming. Located in the upmarket Jardins neighbourhood.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 85, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'bubu-lounge-sao-paulo', 'Bubu Lounge', 'São Paulo', 'BR',
  'Jardins', 'Rua Atílio Iório 53, São Paulo SP 01311-100',
  -23.5631, -46.6608,
  NULL, 'https://www.instagram.com/bubulounge', 'https://www.google.com/maps/place/Bubu+Lounge+São+Paulo',
  '["https://www.google.com/maps/place/Bubu+Lounge+São+Paulo"]',
  'bar', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [{"open": "20:00", "close": "02:00"}], "friday": [{"open": "20:00", "close": "02:00"}], "saturday": [{"open": "20:00", "close": "02:00"}], "sunday": [{"open": "20:00", "close": "02:00"}]}',
  ARRAY['cocktail', 'upscale', 'queer-mixed', 'local-favorite', 'casual'],
  '$$', 'Jardins cocktail lounge with a queer-friendly atmosphere and regular themed nights.', 'Bubu Lounge is a more intimate option in São Paulo''s upmarket Jardins area. Cocktail-focused with a warm queer-friendly atmosphere, it caters to a slightly older professional crowd.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 79, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'clube-yacht-sao-paulo', 'Clube Yacht São Paulo', 'São Paulo', 'BR',
  'Jardins', 'Rua Leopoldo Couto de Magalhães Jr 1048, São Paulo SP 04542-001',
  -23.5887, -46.6759,
  'https://www.clubeyacht.com.br', 'https://www.instagram.com/clubeyachtsp', 'https://www.google.com/maps/place/Clube+Yacht',
  '["https://www.clubeyacht.com.br", "https://www.google.com/maps/place/Clube+Yacht"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [], "saturday": [{"open": "23:00", "close": "10:00"}], "sunday": [], "notes": "Event-based Saturdays only"}',
  ARRAY['circuit', 'massive', 'dancefloor', 'high-energy', 'upscale'],
  '$$$', 'Landmark São Paulo circuit club event brand, running major Saturday nights since the 1990s.', 'Clube Yacht is one of São Paulo''s most storied circuit party brands, regularly drawing thousands to its Saturday nights. International DJs and a well-heeled crowd define the experience.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 83, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'pacha-sao-paulo', 'Pacha São Paulo', 'São Paulo', 'BR',
  'Zona Sul', 'Avenida do Cursino 1400, São Paulo SP',
  -23.622, -46.6187,
  NULL, 'https://www.instagram.com/pachasaopaulo', 'https://www.google.com/maps/place/Pacha+São+Paulo',
  '["https://www.google.com/maps/place/Pacha+São+Paulo"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [], "saturday": [], "sunday": [], "notes": "Event-based Fri–Sat typically"}',
  ARRAY['circuit', 'massive', 'pop', 'high-energy', 'mainstream'],
  '$$$', 'São Paulo outpost of the international Pacha brand, hosting large circuit and pop events.', 'Pacha São Paulo operates as a large-format event venue for circuit parties and mainstream club nights. Its location in the Zona Sul is slightly removed from the Jardins/Lapa core but draws significant crowds for major events.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 78, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'bar-balcao-sao-paulo', 'Bar Balcão', 'São Paulo', 'BR',
  'Jardins', 'Rua Delfina 163, São Paulo SP 05443-010',
  -23.5617, -46.68,
  NULL, 'https://www.instagram.com/barbalcao', 'https://www.google.com/maps/place/Bar+Balcão+São+Paulo',
  '["https://www.google.com/maps/place/Bar+Balcão+São+Paulo"]',
  'bar', '{"monday": [], "tuesday": [{"open": "18:00", "close": "00:00"}], "wednesday": [{"open": "18:00", "close": "00:00"}], "thursday": [{"open": "18:00", "close": "00:00"}], "friday": [{"open": "18:00", "close": "02:00"}], "saturday": [{"open": "18:00", "close": "02:00"}], "sunday": [{"open": "18:00", "close": "00:00"}]}',
  ARRAY['queer-mixed', 'casual', 'cocktail', 'local-favorite', 'neighborhood-bar'],
  '$', 'Casual neighbourhood bar in Jardins with a queer-mixed crowd and regular themed nights.', 'Bar Balcão is a low-key neighbourhood spot in São Paulo''s Jardins area, popular with a queer crowd for its unpretentious atmosphere and strong cocktail list.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 74, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'phoenix-club-sao-paulo', 'Phoenix Club SP', 'São Paulo', 'BR',
  'Pinheiros', 'Rua Augusta 558, São Paulo SP',
  -23.5551, -46.6577,
  NULL, NULL, 'https://www.google.com/maps/place/Phoenix+Club+SP',
  '["https://www.google.com/maps/place/Phoenix+Club+SP"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "23:00", "close": "06:00"}], "saturday": [{"open": "23:00", "close": "06:00"}], "sunday": []}',
  ARRAY['circuit', 'dancefloor', 'high-energy'],
  '$$', 'Pinheiros nightclub with a circuit following and weekend dance nights.', 'Phoenix Club SP operates in the Pinheiros area and draws a circuit-leaning crowd for its weekend nights. Limited online presence makes verification difficult.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 73, 'needs_manual_review'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'dom-sao-paulo', 'Dom São Paulo', 'São Paulo', 'BR',
  'Itaim Bibi', 'Rua Leopoldo Couto de Magalhães Jr 1048, São Paulo SP 04542-001',
  -23.5887, -46.6759,
  NULL, 'https://www.instagram.com/domsaopaulo', 'https://www.google.com/maps/place/Dom+São+Paulo',
  '["https://www.google.com/maps/place/Dom+São+Paulo"]',
  'bar', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "22:00", "close": "02:00"}], "saturday": [{"open": "22:00", "close": "02:00"}], "sunday": []}',
  ARRAY['upscale', 'cocktail', 'queer-mixed', 'circuit-adjacent'],
  '$$$', 'Upscale Itaim Bibi bar with a stylish queer-mixed crowd and strong cocktail programme.', 'Dom São Paulo caters to an affluent queer crowd in the upmarket Itaim Bibi neighbourhood. Design-forward space with a premium cocktail menu and a social scene that flows into the circuit party world.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 80, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'boy-bar-cdmx', 'Boy Bar', 'Mexico City', 'MX',
  'Zona Rosa', 'Calle Amberes 14, Juárez, 06600 CDMX',
  19.4247, -99.1665,
  'https://www.boybardmx.com', 'https://www.instagram.com/boybarcdmx', 'https://www.google.com/maps/place/Boy+Bar+Mexico+City',
  '["https://www.boybardmx.com", "https://www.google.com/maps/place/Boy+Bar+Mexico+City"]',
  'bar', '{"monday": [{"open": "18:00", "close": "03:00"}], "tuesday": [{"open": "18:00", "close": "03:00"}], "wednesday": [{"open": "18:00", "close": "03:00"}], "thursday": [{"open": "18:00", "close": "03:00"}], "friday": [{"open": "18:00", "close": "03:00"}], "saturday": [{"open": "18:00", "close": "03:00"}], "sunday": [{"open": "18:00", "close": "03:00"}]}',
  ARRAY['drag', 'pop', 'mainstream', 'high-energy', 'tourist-heavy', 'dancefloor'],
  '$$', 'Zona Rosa drag bar and dance venue, one of Mexico City''s most popular gay destinations.', 'Boy Bar is the heartbeat of Mexico City''s Zona Rosa gay scene, offering nightly drag shows and pop music across multiple floors. Consistently busy and welcoming to both tourists and locals.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 87, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'el-taller-cdmx', 'El Taller', 'Mexico City', 'MX',
  'Zona Rosa', 'Calle Florencia 37, Juárez, 06600 CDMX',
  19.424, -99.1655,
  NULL, 'https://www.instagram.com/eltallermx', 'https://www.google.com/maps/place/El+Taller+Mexico+City',
  '["https://www.google.com/maps/place/El+Taller+Mexico+City"]',
  'bar', '{"monday": [{"open": "20:00", "close": "04:00"}], "tuesday": [{"open": "20:00", "close": "04:00"}], "wednesday": [{"open": "20:00", "close": "04:00"}], "thursday": [{"open": "20:00", "close": "04:00"}], "friday": [{"open": "20:00", "close": "04:00"}], "saturday": [{"open": "20:00", "close": "04:00"}], "sunday": [{"open": "20:00", "close": "04:00"}]}',
  ARRAY['leather', 'bear', 'masculine', 'local-favorite', 'late-night'],
  '$', 'Mexico City''s main leather and bear bar, tucked into Zona Rosa with a loyal local crowd.', 'El Taller is Zona Rosa''s dedicated leather and bear bar, a no-frills venue with a dark interior and a masculine crowd. A counterpoint to the pop-oriented bars nearby, it draws a local following.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 83, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'kinky-bar-cdmx', 'Kinky Bar', 'Mexico City', 'MX',
  'Zona Rosa', 'Insurgentes Sur 533, 06600 CDMX',
  19.4229, -99.1639,
  'https://www.kinkybar.com.mx', 'https://www.instagram.com/kinkybarmx', 'https://www.google.com/maps/place/Kinky+Bar+Mexico+City',
  '["https://www.kinkybar.com.mx", "https://www.google.com/maps/place/Kinky+Bar+Mexico+City"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [{"open": "21:00", "close": "04:00"}], "thursday": [{"open": "21:00", "close": "04:00"}], "friday": [{"open": "21:00", "close": "04:00"}], "saturday": [{"open": "21:00", "close": "04:00"}], "sunday": [{"open": "21:00", "close": "04:00"}]}',
  ARRAY['pop', 'drag', 'high-energy', 'dancefloor', 'tourist-heavy', 'mainstream'],
  '$$', 'High-energy Zona Rosa nightclub with drag shows and a pop-heavy dance floor.', 'Kinky Bar is one of the larger venues in Mexico City''s Zona Rosa, consistently drawing a mixed crowd for its drag performances and pop club nights. Well-known to both visitors and regulars.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 85, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'patrick-miller-cdmx', 'Patrick Miller', 'Mexico City', 'MX',
  'Doctores', 'Moctezuma 29, Doctores, 06720 CDMX',
  19.4148, -99.1502,
  NULL, 'https://www.instagram.com/patrickmillerclub', 'https://www.google.com/maps/place/Patrick+Miller+Club',
  '["https://www.google.com/maps/place/Patrick+Miller+Club", "https://www.timeout.com/mexico-city/nightlife/patrick-miller"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "22:00", "close": "04:00"}], "saturday": [{"open": "22:00", "close": "04:00"}], "sunday": []}',
  ARRAY['dancefloor', 'pop', '80s', 'retro', 'high-energy', 'local-favorite', 'queer-friendly'],
  '$', 'Iconic Mexico City disco in Doctores, famous for 80s pop and an enthusiastic queer crowd.', 'Patrick Miller is a Mexico City institution that predates the modern gay bar scene. The unassuming venue in Doctores neighbourhood has built a cult following for its retro pop and 80s-heavy programming. Genuinely queer-friendly rather than specifically gay.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 88, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'la-mission-cdmx', 'La Mission', 'Mexico City', 'MX',
  'Zona Rosa', 'Calle Amberes 14, Juárez, 06600 CDMX',
  19.4244, -99.1661,
  NULL, 'https://www.instagram.com/lamissionmx', 'https://www.google.com/maps/place/La+Mission+Mexico+City',
  '["https://www.google.com/maps/place/La+Mission+Mexico+City"]',
  'bar', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "22:00", "close": "04:00"}], "saturday": [{"open": "22:00", "close": "04:00"}], "sunday": []}',
  ARRAY['queer-mixed', 'drag', 'casual', 'mainstream'],
  '$$', 'Zona Rosa bar with regular drag entertainment and a casual mixed crowd.', 'La Mission operates in the same Zona Rosa block as several other gay venues, benefiting from foot traffic. Known for drag shows at weekends.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 80, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'lipstick-cdmx', 'Lipstick', 'Mexico City', 'MX',
  'Zona Rosa', 'Amberes 1, Juárez, 06600 CDMX',
  19.4241, -99.1668,
  'https://www.lipstickmexico.com', 'https://www.instagram.com/lipstickmexico', 'https://www.google.com/maps/place/Lipstick+Mexico+City',
  '["https://www.lipstickmexico.com", "https://www.google.com/maps/place/Lipstick+Mexico+City"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [{"open": "21:00", "close": "04:00"}], "thursday": [{"open": "21:00", "close": "04:00"}], "friday": [{"open": "21:00", "close": "04:00"}], "saturday": [{"open": "21:00", "close": "04:00"}], "sunday": [{"open": "21:00", "close": "04:00"}]}',
  ARRAY['pop', 'mainstream', 'dancefloor', 'drag', 'high-energy', 'tourist-heavy'],
  '$$', 'Zona Rosa club on the corner of Amberes, known for pop nights and drag performances.', 'Lipstick is centrally located in Zona Rosa and draws a mainstream crowd for its pop and drag programming. A good option for first-time visitors wanting a reliable, active club night.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 81, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'marrakech-salon-cdmx', 'Marrakech Salón', 'Mexico City', 'MX',
  'Centro Histórico', 'Calle Doña Cecilia 26, 06020 CDMX',
  19.4347, -99.135,
  NULL, 'https://www.instagram.com/marrakechsalon', 'https://www.google.com/maps/place/Marrakech+Salon+Mexico+City',
  '["https://www.google.com/maps/place/Marrakech+Salon+Mexico+City"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [{"open": "22:00", "close": "04:00"}], "thursday": [{"open": "22:00", "close": "04:00"}], "friday": [{"open": "22:00", "close": "04:00"}], "saturday": [{"open": "22:00", "close": "04:00"}], "sunday": [{"open": "22:00", "close": "04:00"}]}',
  ARRAY['drag', 'pop', 'cabaret', 'performance', 'local-favorite', 'underground'],
  '$', 'Historic Centro Histórico drag salon, one of Mexico City''s most distinctive queer venues.', 'Marrakech Salón is a Mexico City original, a drag and cabaret salon operating in the Centro Histórico. Known for its theatrical drag performances and a diverse local crowd, it occupies a unique cultural position outside the Zona Rosa mainstream.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 82, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'toms-leather-bar-cdmx', 'Tom''s Leather Bar', 'Mexico City', 'MX',
  'Zona Rosa', 'Calle Amberes 26, Juárez, 06600 CDMX',
  19.425, -99.1666,
  NULL, NULL, 'https://www.google.com/maps/place/Tom''s+Leather+Bar+Mexico+City',
  '["https://www.google.com/maps/place/Tom''s+Leather+Bar+Mexico+City"]',
  'bar', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [{"open": "22:00", "close": "04:00"}], "saturday": [{"open": "22:00", "close": "04:00"}], "sunday": []}',
  ARRAY['leather', 'bear', 'masculine', 'late-night', 'casual'],
  '$', 'Zona Rosa leather bar serving a masculine crowd with minimal frills and late hours.', 'Tom''s Leather Bar is the Zona Rosa option for those seeking a masculine, leather-leaning atmosphere. Small, dark interior and a regular crowd that values privacy.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 76, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'albur-bar-cdmx', 'Albur Bar', 'Mexico City', 'MX',
  'Zona Rosa', 'Calle Génova 44, Juárez, 06600 CDMX',
  19.4238, -99.166,
  NULL, NULL, 'https://www.google.com/maps/place/Albur+Bar+Mexico+City',
  '["https://www.google.com/maps/place/Albur+Bar+Mexico+City"]',
  'bar', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [{"open": "20:00", "close": "03:00"}], "friday": [{"open": "20:00", "close": "03:00"}], "saturday": [{"open": "20:00", "close": "03:00"}], "sunday": []}',
  ARRAY['queer-mixed', 'drag', 'casual', 'neighborhood-bar'],
  '$', 'Low-key Zona Rosa bar with a queer-mixed crowd and occasional drag entertainment.', 'Albur Bar is one of several smaller bars along Calle Génova in Zona Rosa. A casual neighbourhood spot with limited online presence, recommended for independent research before visiting.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 73, 'needs_manual_review'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'la-cantina-gay-cdmx', 'La Cantina Gay', 'Mexico City', 'MX',
  'Zona Rosa', 'Calle Londres 170, Juárez, 06600 CDMX',
  19.4243, -99.1673,
  NULL, NULL, 'https://www.google.com/maps/place/La+Cantina+Gay',
  '["https://www.google.com/maps/place/La+Cantina+Gay"]',
  'bar', '{"monday": [{"open": "16:00", "close": "02:00"}], "tuesday": [{"open": "16:00", "close": "02:00"}], "wednesday": [{"open": "16:00", "close": "02:00"}], "thursday": [{"open": "16:00", "close": "02:00"}], "friday": [{"open": "16:00", "close": "02:00"}], "saturday": [{"open": "16:00", "close": "02:00"}], "sunday": [{"open": "16:00", "close": "02:00"}]}',
  ARRAY['casual', 'queer-mixed', 'tourist-heavy', 'neighborhood-bar'],
  '$', 'All-day cantina bar in Zona Rosa serving a mixed queer crowd from early afternoon.', 'La Cantina Gay is an approachable option in Zona Rosa for early-evening drinks. Open long hours and welcoming to all, though limited online presence means details require manual verification.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 71, 'needs_manual_review'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'twin-peaks-sf', 'Twin Peaks Tavern', 'San Francisco', 'US',
  'Castro', '401 Castro Street, San Francisco CA 94114',
  37.7626, -122.4349,
  'https://www.twinpeakstavern.com', 'https://www.instagram.com/twinpeakstavern', 'https://www.google.com/maps/place/Twin+Peaks+Tavern',
  '["https://www.twinpeakstavern.com", "https://www.google.com/maps/place/Twin+Peaks+Tavern"]',
  'bar', '{"monday": [{"open": "12:00", "close": "02:00"}], "tuesday": [{"open": "12:00", "close": "02:00"}], "wednesday": [{"open": "12:00", "close": "02:00"}], "thursday": [{"open": "12:00", "close": "02:00"}], "friday": [{"open": "12:00", "close": "02:00"}], "saturday": [{"open": "10:00", "close": "02:00"}], "sunday": [{"open": "10:00", "close": "02:00"}]}',
  ARRAY['historic', 'casual', 'neighborhood-bar', 'local-favorite', 'queer-mixed'],
  '$', 'The Castro''s most iconic gay bar, famous for floor-to-ceiling windows since 1972.', 'Twin Peaks Tavern holds a unique place in LGBTQ+ history as the first gay bar in the US to have large plate-glass windows, a deliberate act of visibility in 1972. Today it remains a Castro cornerstone, attracting a mixed local crowd from afternoon onwards.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 93, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'the-lookout-sf', 'The Lookout', 'San Francisco', 'US',
  'Castro', '3600 16th Street, San Francisco CA 94114',
  37.7647, -122.4268,
  'https://www.lookoutsf.com', 'https://www.instagram.com/lookoutsf', 'https://www.google.com/maps/place/The+Lookout+SF',
  '["https://www.lookoutsf.com", "https://www.google.com/maps/place/The+Lookout+SF"]',
  'bar', '{"monday": [{"open": "15:00", "close": "02:00"}], "tuesday": [{"open": "15:00", "close": "02:00"}], "wednesday": [{"open": "15:00", "close": "02:00"}], "thursday": [{"open": "15:00", "close": "02:00"}], "friday": [{"open": "15:00", "close": "02:00"}], "saturday": [{"open": "12:00", "close": "02:00"}], "sunday": [{"open": "12:00", "close": "02:00"}]}',
  ARRAY['rooftop', 'casual', 'neighborhood-bar', 'queer-mixed', 'local-favorite'],
  '$$', 'Elevated Castro bar with a large open terrace and popular happy hour.', 'The Lookout sits above the Castro''s main intersection at 16th and Market, with a large open terrace that attracts a mixed queer crowd from early afternoon. One of the area''s busiest bars for happy hour.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 90, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'moby-dick-sf', 'Moby Dick', 'San Francisco', 'US',
  'Castro', '4049 18th Street, San Francisco CA 94114',
  37.7601, -122.434,
  NULL, 'https://www.instagram.com/mobydickbar', 'https://www.google.com/maps/place/Moby+Dick+SF',
  '["https://www.google.com/maps/place/Moby+Dick+SF"]',
  'bar', '{"monday": [{"open": "12:00", "close": "02:00"}], "tuesday": [{"open": "12:00", "close": "02:00"}], "wednesday": [{"open": "12:00", "close": "02:00"}], "thursday": [{"open": "12:00", "close": "02:00"}], "friday": [{"open": "12:00", "close": "02:00"}], "saturday": [{"open": "12:00", "close": "02:00"}], "sunday": [{"open": "12:00", "close": "02:00"}]}',
  ARRAY['neighborhood-bar', 'casual', 'local-favorite', 'queer-mixed', 'bear'],
  '$', 'Classic Castro dive bar open daily, known for its fish tank and strong local regulars.', 'Moby Dick is a Castro institution that defies trends. A dive bar in the best sense, with a large fish tank and a loyal regular crowd. Open from noon daily, it draws the Castro''s working-class queer contingent.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 88, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'sf-eagle', 'SF Eagle', 'San Francisco', 'US',
  'SoMa', '398 12th Street, San Francisco CA 94103',
  37.7706, -122.4159,
  'https://www.sfeagle.com', 'https://www.instagram.com/sfeagle', 'https://www.google.com/maps/place/SF+Eagle',
  '["https://www.sfeagle.com", "https://www.google.com/maps/place/SF+Eagle"]',
  'bar', '{"monday": [{"open": "17:00", "close": "02:00"}], "tuesday": [{"open": "17:00", "close": "02:00"}], "wednesday": [{"open": "17:00", "close": "02:00"}], "thursday": [{"open": "17:00", "close": "02:00"}], "friday": [{"open": "17:00", "close": "02:00"}], "saturday": [{"open": "13:00", "close": "02:00"}], "sunday": [{"open": "13:00", "close": "02:00"}]}',
  ARRAY['leather', 'bear', 'masculine', 'local-favorite', 'dancefloor', 'late-night'],
  '$', 'San Francisco''s oldest leather bar, anchoring SoMa''s queer leather scene since 1981.', 'The SF Eagle has been a SoMa landmark since 1981 and remains the city''s pre-eminent leather and bear bar. The outdoor patio is a social hub, and the Sunday Beer Bust is a long-running tradition drawing hundreds of regulars.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 89, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'powerhouse-sf', 'Powerhouse', 'San Francisco', 'US',
  'SoMa', '1347 Folsom Street, San Francisco CA 94103',
  37.7743, -122.4131,
  'https://www.powerhouse-sf.com', 'https://www.instagram.com/powerhousesf', 'https://www.google.com/maps/place/Powerhouse+SF',
  '["https://www.powerhouse-sf.com", "https://www.google.com/maps/place/Powerhouse+SF"]',
  'bar', '{"monday": [{"open": "17:00", "close": "02:00"}], "tuesday": [{"open": "17:00", "close": "02:00"}], "wednesday": [{"open": "17:00", "close": "02:00"}], "thursday": [{"open": "17:00", "close": "02:00"}], "friday": [{"open": "17:00", "close": "02:00"}], "saturday": [{"open": "13:00", "close": "02:00"}], "sunday": [{"open": "13:00", "close": "02:00"}]}',
  ARRAY['leather', 'bear', 'masculine', 'casual', 'late-night'],
  '$', 'Folsom Street leather bar with a dark, no-pretence interior and strong SoMa pedigree.', 'Powerhouse has held its Folsom Street spot for decades, serving the SoMa leather community with a reliably masculine atmosphere. Dark interior, cheap drinks, and a loyal crowd of regulars define the experience.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 85, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'midnight-sun-sf', 'Midnight Sun', 'San Francisco', 'US',
  'Castro', '4067 18th Street, San Francisco CA 94114',
  37.76, -122.4343,
  'https://www.midnightsunsf.com', 'https://www.instagram.com/midnightsunsf', 'https://www.google.com/maps/place/Midnight+Sun+SF',
  '["https://www.midnightsunsf.com", "https://www.google.com/maps/place/Midnight+Sun+SF"]',
  'bar', '{"monday": [{"open": "14:00", "close": "02:00"}], "tuesday": [{"open": "14:00", "close": "02:00"}], "wednesday": [{"open": "14:00", "close": "02:00"}], "thursday": [{"open": "14:00", "close": "02:00"}], "friday": [{"open": "14:00", "close": "02:00"}], "saturday": [{"open": "12:00", "close": "02:00"}], "sunday": [{"open": "12:00", "close": "02:00"}]}',
  ARRAY['neighborhood-bar', 'casual', 'pop', 'queer-mixed', 'video-bar'],
  '$$', 'Castro video bar showing music videos continuously, a neighbourhood staple since 1973.', 'Midnight Sun is one of the Castro''s long-running video bars, playing music videos on large screens in a relaxed pub atmosphere. A neighbourhood staple with a mixed queer crowd and reliable happy hour specials.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 87, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'oasis-sf', 'Oasis', 'San Francisco', 'US',
  'SoMa', '298 11th Street, San Francisco CA 94103',
  37.7703, -122.4157,
  'https://www.sfoasis.com', 'https://www.instagram.com/sfoasis', 'https://www.google.com/maps/place/Oasis+SF',
  '["https://www.sfoasis.com", "https://www.google.com/maps/place/Oasis+SF"]',
  'club', '{"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": [], "saturday": [], "sunday": [], "notes": "Event-based Wed–Sat; check sfoasis.com for schedule"}',
  ARRAY['drag', 'cabaret', 'performance', 'dancefloor', 'upscale', 'queer-mixed'],
  '$$$', 'SF''s premier drag and cabaret venue, home to Mother and other flagship queer productions.', 'Oasis is SF''s most important queer performance venue, hosting a rotating calendar of drag shows, cabarets, and club nights. Best known as the home of the weekly Mother party. A polished production-quality environment.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 88, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'beaux-sf', 'Beaux', 'San Francisco', 'US',
  'Castro', '2344 Market Street, San Francisco CA 94114',
  37.7636, -122.4337,
  'https://www.beauxsf.com', 'https://www.instagram.com/beauxsf', 'https://www.google.com/maps/place/Beaux+SF',
  '["https://www.beauxsf.com", "https://www.google.com/maps/place/Beaux+SF"]',
  'bar', '{"monday": [{"open": "16:00", "close": "02:00"}], "tuesday": [{"open": "16:00", "close": "02:00"}], "wednesday": [{"open": "16:00", "close": "02:00"}], "thursday": [{"open": "16:00", "close": "02:00"}], "friday": [{"open": "16:00", "close": "02:00"}], "saturday": [{"open": "14:00", "close": "02:00"}], "sunday": [{"open": "14:00", "close": "02:00"}]}',
  ARRAY['cocktail', 'upscale', 'casual', 'neighborhood-bar', 'local-favorite', 'queer-mixed'],
  '$$', 'Smart Castro cocktail bar at the top of Market Street with a friendly neighbourhood feel.', 'Beaux sits at the Market Street end of the Castro, offering a slightly more cocktail-forward experience than the strip''s traditional dives. Popular for after-work drinks and a loyal regular crowd.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 84, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'badlands-sf', 'Badlands', 'San Francisco', 'US',
  'Castro', '4121 18th Street, San Francisco CA 94114',
  37.7599, -122.4346,
  NULL, 'https://www.instagram.com/badlandssf', 'https://www.google.com/maps/place/Badlands+SF',
  '["https://www.google.com/maps/place/Badlands+SF"]',
  'bar', '{"monday": [{"open": "12:00", "close": "02:00"}], "tuesday": [{"open": "12:00", "close": "02:00"}], "wednesday": [{"open": "12:00", "close": "02:00"}], "thursday": [{"open": "12:00", "close": "02:00"}], "friday": [{"open": "12:00", "close": "02:00"}], "saturday": [{"open": "12:00", "close": "02:00"}], "sunday": [{"open": "12:00", "close": "02:00"}]}',
  ARRAY['pop', 'video-bar', 'casual', 'neighborhood-bar', 'tourist-heavy', 'queer-mixed'],
  '$', 'Castro video bar open daily, known for chart music and a relaxed mixed crowd.', 'Badlands is a Castro video bar that has been showing pop music videos and drawing a mixed crowd since the 1990s. Unpretentious, open long hours, and reliably busy on weekends.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 82, 'verified'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();

INSERT INTO public.world_venues (id, name, city, country, neighborhood, address, latitude, longitude, website_url, instagram_url, google_maps_url, source_urls, venue_type, opening_hours, vibe_tags, price_band, description_short, description_long, phone, email, accessibility_notes, cashless_or_cash, last_verified_at, confidence_score, verification_status)
VALUES (
  'qbar-sf', 'QBar', 'San Francisco', 'US',
  'Castro', '456 Castro Street, San Francisco CA 94114',
  37.7619, -122.4347,
  NULL, NULL, 'https://www.google.com/maps/place/QBar+Castro+SF',
  '["https://www.google.com/maps/place/QBar+Castro+SF"]',
  'bar', '{"monday": [{"open": "17:00", "close": "02:00"}], "tuesday": [{"open": "17:00", "close": "02:00"}], "wednesday": [{"open": "17:00", "close": "02:00"}], "thursday": [{"open": "17:00", "close": "02:00"}], "friday": [{"open": "17:00", "close": "02:00"}], "saturday": [{"open": "14:00", "close": "02:00"}], "sunday": [{"open": "14:00", "close": "02:00"}]}',
  ARRAY['pop', 'cocktail', 'casual', 'queer-mixed', 'neighborhood-bar'],
  '$$', 'Castro bar with a cocktail-forward menu and a welcoming mixed neighbourhood crowd.', 'QBar occupies a Castro Street slot with a reputation for good cocktails and a relaxed atmosphere. Limited online presence; details require manual verification.',
  NULL, NULL, NULL, NULL,
  '2026-04-17T00:00:00.000Z', 80, 'partial'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, confidence_score = EXCLUDED.confidence_score,
  verification_status = EXCLUDED.verification_status, last_verified_at = EXCLUDED.last_verified_at,
  opening_hours = EXCLUDED.opening_hours, vibe_tags = EXCLUDED.vibe_tags,
  source_urls = EXCLUDED.source_urls, updated_at = now();
