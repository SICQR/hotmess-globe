-- HOTMESS Pulse cultural anchor seed + HOTMESS curated layer
-- Approximate centroid/marker coordinates for globe seeding
-- 17 cities · 18 zones · 6 clubs · 10 curated

create table if not exists public.pulse_places (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  type text not null check (type in ('city','zone','club','curated')),
  country text,
  lat double precision not null,
  lng double precision not null,
  priority int not null default 3 check (priority between 1 and 5),
  parent_slug text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- Index for globe queries (type + active filter)
create index if not exists idx_pulse_places_type_active on public.pulse_places (type, is_active);

-- RLS: pulse_places is public read, admin write
alter table public.pulse_places enable row level security;

create policy "pulse_places_read" on public.pulse_places
  for select using (true);

create policy "pulse_places_admin_write" on public.pulse_places
  for all using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- LAYER 1: GLOBAL CITY ANCHORS (17 cities, priority 5)
-- ═══════════════════════════════════════════════════════════════════════

insert into public.pulse_places (slug, name, type, country, lat, lng, priority, parent_slug, is_active, notes)
values
-- Europe
('london',        'London',        'city', 'GB', 51.5074,  -0.1278,   5, null, true, 'Global anchor'),
('berlin',        'Berlin',        'city', 'DE', 52.52,     13.405,   5, null, true, 'Global anchor'),
('madrid',        'Madrid',        'city', 'ES', 40.4168,  -3.7038,   5, null, true, 'Global anchor'),
('barcelona',     'Barcelona',     'city', 'ES', 41.3874,   2.1686,   5, null, true, 'Global anchor'),
('paris',         'Paris',         'city', 'FR', 48.8566,   2.3522,   5, null, true, 'Global anchor'),
('amsterdam',     'Amsterdam',     'city', 'NL', 52.3676,   4.9041,   5, null, true, 'Global anchor'),
-- USA
('new-york',      'New York',      'city', 'US', 40.7128, -74.006,    5, null, true, 'Global anchor'),
('los-angeles',   'Los Angeles',   'city', 'US', 34.0522, -118.2437,  5, null, true, 'Global anchor'),
('san-francisco', 'San Francisco', 'city', 'US', 37.7749, -122.4194,  5, null, true, 'Global anchor'),
('miami',         'Miami',         'city', 'US', 25.7617, -80.1918,   5, null, true, 'Global anchor'),
('chicago',       'Chicago',       'city', 'US', 41.8781, -87.6298,   5, null, true, 'Global anchor'),
-- Global
('sao-paulo',     'São Paulo',     'city', 'BR', -23.5505, -46.6333,  5, null, true, 'Global anchor'),
('mexico-city',   'Mexico City',   'city', 'MX', 19.4326,  -99.1332,  5, null, true, 'Global anchor'),
('tel-aviv',      'Tel Aviv',      'city', 'IL', 32.0853,   34.7818,  5, null, true, 'Global anchor'),
('bangkok',       'Bangkok',       'city', 'TH', 13.7563,  100.5018,  5, null, true, 'Global anchor'),
('sydney',        'Sydney',        'city', 'AU', -33.8688, 151.2093,  5, null, true, 'Global anchor'),
('toronto',       'Toronto',       'city', 'CA', 43.6532,  -79.3832,  5, null, true, 'Global anchor'),

-- ═══════════════════════════════════════════════════════════════════════
-- LAYER 2: QUEER ZONES (18 zones, priority 4)
-- ═══════════════════════════════════════════════════════════════════════

('soho-london',           'Soho',                   'zone', 'GB', 51.5136, -0.1365,   4, 'london',        true, 'LGBTQ+ core'),
('vauxhall',              'Vauxhall',               'zone', 'GB', 51.4867, -0.123,    4, 'london',        true, 'After-hours cluster'),
('kreuzberg',             'Kreuzberg',              'zone', 'DE', 52.4986,  13.4037,  4, 'berlin',        true, 'Berlin queer/nightlife zone'),
('friedrichshain',        'Friedrichshain',         'zone', 'DE', 52.5155,  13.454,   4, 'berlin',        true, 'Berlin nightlife zone'),
('chueca',                'Chueca',                 'zone', 'ES', 40.4237, -3.6978,   4, 'madrid',        true, 'LGBTQ+ hub'),
('gaixample',             'Eixample (Gaixample)',   'zone', 'ES', 41.387,   2.1585,   4, 'barcelona',     true, 'Barcelona LGBTQ+ zone'),
('le-marais',             'Le Marais',              'zone', 'FR', 48.8578,  2.3622,   4, 'paris',         true, 'Paris LGBTQ+ zone'),
('reguliersdwarsstraat',  'Reguliersdwarsstraat',   'zone', 'NL', 52.3644,  4.8948,   4, 'amsterdam',     true, 'Amsterdam nightlife strip'),
('hells-kitchen',         'Hell''s Kitchen',        'zone', 'US', 40.7638, -73.9918,  4, 'new-york',      true, 'NYC queer nightlife'),
('chelsea',               'Chelsea',                'zone', 'US', 40.7465, -74.0014,  4, 'new-york',      true, 'Historic LGBTQ+ zone'),
('west-hollywood',        'West Hollywood',         'zone', 'US', 34.09,   -118.3617, 4, 'los-angeles',   true, 'LA LGBTQ+ hub'),
('castro',                'Castro',                 'zone', 'US', 37.7609, -122.435,  4, 'san-francisco', true, 'SF LGBTQ+ hub'),
('south-beach',           'South Beach',            'zone', 'US', 25.7826, -80.1341,  4, 'miami',         true, 'Miami queer nightlife'),
('boystown',              'Boystown / Northalsted', 'zone', 'US', 41.9438, -87.6545,  4, 'chicago',       true, 'Chicago LGBTQ+ district'),
('zona-rosa',             'Zona Rosa',              'zone', 'MX', 19.4241, -99.1667,  4, 'mexico-city',   true, 'Mexico City LGBTQ+ hub'),
('silom',                 'Silom',                  'zone', 'TH', 13.7279, 100.5319,  4, 'bangkok',       true, 'Bangkok nightlife hub'),
('oxford-street-sydney',  'Oxford Street',          'zone', 'AU', -33.8787, 151.2205, 4, 'sydney',        true, 'Sydney LGBTQ+ nightlife'),
('church-wellesley',      'Church-Wellesley',       'zone', 'CA', 43.6656, -79.3817,  4, 'toronto',       true, 'Toronto LGBTQ+ village'),

-- ═══════════════════════════════════════════════════════════════════════
-- LAYER 3: ICONIC CLUBS (6 clubs, priority 3)
-- ═══════════════════════════════════════════════════════════════════════

('heaven-london',     'Heaven',         'club', 'GB', 51.5077,  -0.1234,  3, 'london',       true, 'Iconic London venue'),
('kings-arms-london', 'The Kings Arms', 'club', 'GB', 51.5139,  -0.1328,  3, 'soho-london',  true, 'Soho LGBTQ+ institution'),
('berghain',          'Berghain',       'club', 'DE', 52.5106,   13.443,  3, 'berlin',       true, 'Berlin flagship club'),
('hot-madrid',        'Hot',            'club', 'ES', 40.4226,  -3.6993,  3, 'chueca',       true, 'Chueca bear bar/venue'),
('industry-nyc',      'Industry',       'club', 'US', 40.7647, -73.9914,  3, 'hells-kitchen', true, 'Hell''s Kitchen venue'),
('posh-nyc',          'Posh',           'club', 'US', 40.7629, -73.9921,  3, 'hells-kitchen', true, 'Hell''s Kitchen gay bar'),

-- ═══════════════════════════════════════════════════════════════════════
-- LAYER 4: HOTMESS CURATED (10 places, priority 5 — gold, strong glow)
-- Masculine energy · underground · music-first · after-hours · raw
-- ═══════════════════════════════════════════════════════════════════════

-- London: the after-dark circuit
('the-eagle-london',  'The Eagle',      'curated', 'GB', 51.4862, -0.1190, 5, 'vauxhall',      true, 'Leather/fetish institution. After-hours. Raw energy.'),
('union-vauxhall',    'Union',          'curated', 'GB', 51.4870, -0.1215, 5, 'vauxhall',      true, 'Underground club. Music-first. Dark rooms.'),
-- Berlin: techno + freedom
('lab-oratory',       'Lab.Oratory',    'curated', 'DE', 52.5098,  13.4425, 5, 'berlin',       true, 'Below Berghain. Sexual freedom. No phones.'),
('kitkat-club',       'KitKat Club',    'curated', 'DE', 52.5065,  13.3835, 5, 'kreuzberg',    true, 'Techno + dress code. Legendary Berlin nights.'),
-- NYC: heat
('the-cock-nyc',      'The Cock',       'curated', 'US', 40.7262, -73.9895, 5, 'new-york',     true, 'Dive bar energy. Raw. No pretense.'),
('the-eagle-nyc',     'The Eagle NYC',  'curated', 'US', 40.7465, -74.0060, 5, 'chelsea',      true, 'Rooftop + dark rooms. NYC institution.'),
-- SF: liberation
('the-eagle-sf',      'The Eagle SF',   'curated', 'US', 37.7704, -122.4114, 5, 'san-francisco', true, 'South of Market. Leather. Sunday beer bust.'),
-- Madrid: raw heat
('strong-madrid',     'Strong',         'curated', 'ES', 40.4218, -3.6985,  5, 'chueca',       true, 'Bear/muscle bar. After-hours energy.'),
-- Amsterdam: liberation
('church-amsterdam',  'Club Church',    'curated', 'NL', 52.3628,  4.8998,  5, 'amsterdam',    true, 'Fetish + themed nights. Underground.'),
-- Sydney: raw
('arq-sydney',        'ARQ',            'curated', 'AU', -33.8783, 151.2154, 5, 'oxford-street-sydney', true, 'Flagship club. Big room. Circuit energy.')

on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  country = excluded.country,
  lat = excluded.lat,
  lng = excluded.lng,
  priority = excluded.priority,
  parent_slug = excluded.parent_slug,
  is_active = excluded.is_active,
  notes = excluded.notes;

comment on table public.pulse_places is 'Cultural anchor layer for Pulse globe. Cities, queer zones, iconic clubs, and HOTMESS curated locations. Always-on foundation under live signals.';
