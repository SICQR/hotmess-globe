-- world_venue_events upsert
-- Generated: 2026-04-17
-- Source: HOTMESS venue ingestion pipeline v1.0


INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-heaven-london-1', 'heaven-london', 'Heaven', 'London',
  'G-A-Y Saturday', '2026-04-18T23:00:00Z', '2026-04-19T05:00:00Z',
  'https://heavennightclub-london.com/events', 'https://heavennightclub-london.com/events',
  'G-A-Y', 'Weekly Saturday pop night at Heaven, London''s iconic gay superclub.',
  ARRAY['pop', 'mainstream', 'dancefloor'],
  'https://heavennightclub-london.com/events', '2026-04-17T00:00:00Z', 85
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-rvt-1', 'royal-vauxhall-tavern', 'Royal Vauxhall Tavern', 'London',
  'Duckie Monthly Party', '2026-04-25T20:00:00Z', '2026-04-26T01:00:00Z',
  'https://www.rvt.community/whats-on', NULL,
  'Duckie', 'Long-running cabaret and drag night at the historic Royal Vauxhall Tavern.',
  ARRAY['cabaret', 'drag', 'performance', 'queer-mixed'],
  'https://www.rvt.community/whats-on', '2026-04-17T00:00:00Z', 82
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-fire-london-1', 'fire-london', 'Fire', 'London',
  'Horse Meat Disco', '2026-04-19T22:00:00Z', '2026-04-20T07:00:00Z',
  'https://firelondon.net/events', 'https://firelondon.net/events',
  'Horse Meat Disco', 'Monthly Sunday disco and dance party at Fire, Vauxhall''s late-night anchor venue.',
  ARRAY['disco', 'techno', 'dancefloor', 'afterhours'],
  'https://firelondon.net/events', '2026-04-17T00:00:00Z', 88
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-glory-london-1', 'the-glory-london', 'The Glory', 'London',
  'Sink The Pink: Glow Up', '2026-05-02T20:00:00Z', '2026-05-03T02:00:00Z',
  'https://theglory.co/events', 'https://theglory.co/events',
  'Sink The Pink', 'Sink The Pink''s signature performance night at The Glory in Haggerston.',
  ARRAY['drag', 'performance', 'queer', 'cabaret'],
  'https://theglory.co/events', '2026-04-17T00:00:00Z', 83
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-superstore-1', 'dalston-superstore', 'Dalston Superstore', 'London',
  'Queer Nation', '2026-04-24T22:00:00Z', '2026-04-25T02:00:00Z',
  'https://dalstonsuperstore.com/events', NULL,
  'Queer Nation', 'Weekly queer club night at Dalston Superstore.',
  ARRAY['dancefloor', 'queer', 'indie', 'underground'],
  'https://dalstonsuperstore.com/events', '2026-04-17T00:00:00Z', 80
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-hoy-1', 'house-of-yes-nyc', 'House of Yes', 'New York',
  'BKLYN BOIHOOD', '2026-04-18T22:00:00Z', '2026-04-19T04:00:00Z',
  'https://www.houseofyes.org/events', 'https://www.houseofyes.org/events',
  'House of Yes', 'Brooklyn''s most creative queer performance party at House of Yes.',
  ARRAY['performance', 'queer', 'dancefloor', 'immersive'],
  'https://www.houseofyes.org/events', '2026-04-17T00:00:00Z', 87
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-industry-1', 'industry-bar-nyc', 'Industry Bar', 'New York',
  'Industry Fridays', '2026-04-17T16:00:00Z', '2026-04-18T04:00:00Z',
  'https://www.industry-bar.com/events', NULL,
  'Industry Bar', 'Weekly Friday night party at NYC''s most popular Hell''s Kitchen gay bar.',
  ARRAY['pop', 'mainstream', 'dancefloor', 'high-energy'],
  'https://www.industry-bar.com/events', '2026-04-17T00:00:00Z', 84
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-eagle-nyc-1', 'eagle-nyc', 'The Eagle NYC', 'New York',
  'Sunday Beer Blast', '2026-04-19T14:00:00Z', '2026-04-19T22:00:00Z',
  'https://www.eaglenyc.com/events', NULL,
  'Eagle NYC', 'The Eagle''s famous weekly Sunday afternoon rooftop party.',
  ARRAY['leather', 'bear', 'casual', 'rooftop'],
  'https://www.eaglenyc.com/events', '2026-04-17T00:00:00Z', 89
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-stonewall-1', 'stonewall-inn', 'Stonewall Inn', 'New York',
  'Pride Month Kickoff Party', '2026-05-29T20:00:00Z', '2026-05-30T02:00:00Z',
  'https://thestonewallinnnyc.com/events', NULL,
  'Stonewall Inn', 'Annual Pride Month kickoff celebration at the historic Stonewall Inn.',
  ARRAY['queer-mixed', 'historic', 'celebration'],
  'https://thestonewallinnnyc.com/events', '2026-04-17T00:00:00Z', 85
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-nowadays-1', 'output-nyc-rph', 'Nowadays', 'New York',
  'NOWADAYS: Heels & High Ceilings', '2026-04-25T21:00:00Z', '2026-04-26T06:00:00Z',
  'https://nowadays.nyc/events', 'https://nowadays.nyc/events',
  'Nowadays', 'Weekly queer-friendly outdoor and indoor party in Ridgewood, Queens.',
  ARRAY['techno', 'queer-friendly', 'dancefloor', 'outdoor'],
  'https://nowadays.nyc/events', '2026-04-17T00:00:00Z', 86
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-berghain-1', 'berghain-berlin', 'Berghain', 'Berlin',
  'Berghain Klubnacht', '2026-04-17T23:59:00Z', '2026-04-20T06:00:00Z',
  'https://www.berghain.berlin/veranstaltungen', NULL,
  'Berghain', 'The legendary continuous weekend Klubnacht spanning Friday night through Monday morning.',
  ARRAY['techno', 'afterhours', 'dancefloor', 'underground'],
  'https://www.berghain.berlin/veranstaltungen', '2026-04-17T00:00:00Z', 95
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-schwuz-1', 'schwuz-berlin', 'SchwuZ', 'Berlin',
  'SchwuZ: Pop is Dead', '2026-04-18T22:00:00Z', '2026-04-19T05:00:00Z',
  'https://www.schwuz.de/veranstaltungen', 'https://www.schwuz.de/veranstaltungen',
  'SchwuZ', 'Monthly pop-themed night at Berlin''s most inclusive queer club.',
  ARRAY['pop', 'drag', 'queer', 'dancefloor'],
  'https://www.schwuz.de/veranstaltungen', '2026-04-17T00:00:00Z', 88
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-kitkat-1', 'kitkatclub-berlin', 'KitKatClub', 'Berlin',
  'KitKat CareBerlin', '2026-04-25T23:00:00Z', '2026-04-26T12:00:00Z',
  'https://www.kitkatclub.de/events', 'https://www.kitkatclub.de/events',
  'KitKatClub', 'KitKat''s signature party with an open-minded dresscode and extended hours.',
  ARRAY['techno', 'dancefloor', 'afterhours', 'underground'],
  'https://www.kitkatclub.de/events', '2026-04-17T00:00:00Z', 88
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-tresor-1', 'tresor-berlin', 'Tresor', 'Berlin',
  'Tresor: Live Set', '2026-05-02T00:00:00Z', '2026-05-02T10:00:00Z',
  'https://www.tresorberlin.com/events', 'https://www.tresorberlin.com/events',
  'Tresor', 'Weekend techno session at Tresor, one of Berlin''s most celebrated clubs.',
  ARRAY['techno', 'underground', 'dancefloor'],
  'https://www.tresorberlin.com/events', '2026-04-17T00:00:00Z', 90
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-schwuz-2', 'schwuz-berlin', 'SchwuZ', 'Berlin',
  'SchwuZ: Madonna Tribute', '2026-05-09T22:00:00Z', '2026-05-10T05:00:00Z',
  'https://www.schwuz.de/veranstaltungen', 'https://www.schwuz.de/veranstaltungen',
  'SchwuZ', 'Annual Madonna tribute night at SchwuZ — full costumes encouraged.',
  ARRAY['pop', 'drag', 'mainstream', 'themed'],
  'https://www.schwuz.de/veranstaltungen', '2026-04-17T00:00:00Z', 83
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-fabrik-1', 'fabrik-madrid', 'Fabrik', 'Madrid',
  'WE Party — Open Air', '2026-05-02T22:00:00Z', '2026-05-03T10:00:00Z',
  'https://www.weparty.com/events', 'https://www.weparty.com/events',
  'WE Party', 'WE Party''s flagship Open Air event at Fabrik, with international DJ lineup.',
  ARRAY['circuit', 'massive', 'techno', 'dancefloor'],
  'https://www.weparty.com/events', '2026-04-17T00:00:00Z', 90
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-ohm-1', 'ohm-club-madrid', 'Ohm Club', 'Madrid',
  'Ohm Sábado Night', '2026-04-18T00:00:00Z', '2026-04-18T06:00:00Z',
  NULL, NULL,
  'Ohm Club', 'Regular Saturday night at Ohm Club in Gran Via area.',
  ARRAY['circuit', 'pop', 'dancefloor', 'mainstream'],
  'https://www.timeout.com/madrid/nightlife/ohm', '2026-04-17T00:00:00Z', 72
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-fabrik-2', 'fabrik-madrid', 'Fabrik', 'Madrid',
  'WE Party — Fiesta Blanca', '2026-06-06T22:00:00Z', '2026-06-07T10:00:00Z',
  'https://www.weparty.com/events', 'https://www.weparty.com/events',
  'WE Party', 'WE Party''s all-white dress code circuit party at Fabrik ahead of Madrid Pride.',
  ARRAY['circuit', 'massive', 'high-energy', 'themed'],
  'https://www.weparty.com/events', '2026-04-17T00:00:00Z', 88
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-whynot-1', 'why-not-madrid', 'Why Not?', 'Madrid',
  'Why Not Friday Fever', '2026-04-17T22:30:00Z', '2026-04-18T05:30:00Z',
  'https://www.whynotmadrid.com/events', NULL,
  'Why Not?', 'Weekly Friday pop night at Why Not?, Chueca''s busiest gay club.',
  ARRAY['pop', 'mainstream', 'high-energy', 'dancefloor'],
  'https://www.whynotmadrid.com/events', '2026-04-17T00:00:00Z', 80
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-nyx-1', 'club-nyx-amsterdam', 'Club NYX', 'Amsterdam',
  'NYX Pride Pre-Party', '2026-05-02T22:00:00Z', '2026-05-03T04:00:00Z',
  'https://www.clubnyx.nl/events', 'https://www.clubnyx.nl/events',
  'Club NYX', 'Pre-pride warm-up party at Amsterdam''s NYX on Reguliersdwarsstraat.',
  ARRAY['pop', 'mainstream', 'high-energy', 'dancefloor'],
  'https://www.clubnyx.nl/events', '2026-04-17T00:00:00Z', 82
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-church-1', 'club-church-amsterdam', 'Club Church', 'Amsterdam',
  'CHURCH: Darklands Preview', '2026-04-25T23:00:00Z', '2026-04-26T06:00:00Z',
  'https://www.clubchurch.nl/events', 'https://www.clubchurch.nl/events',
  'Club Church', 'Club Church preview party ahead of Darklands festival with fetish-themed programming.',
  ARRAY['leather', 'dancefloor', 'afterhours', 'underground'],
  'https://www.clubchurch.nl/events', '2026-04-17T00:00:00Z', 84
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-prik-1', 'prik-amsterdam', 'Prik', 'Amsterdam',
  'PRIK Queer Fridays', '2026-04-17T17:00:00Z', '2026-04-18T01:00:00Z',
  'https://www.prikamsterdam.nl', NULL,
  'Prik Amsterdam', 'Weekly Friday night bar session at Prik, one of Amsterdam''s most beloved queer bars.',
  ARRAY['casual', 'queer-mixed', 'cocktail', 'local-favorite'],
  'https://www.prikamsterdam.nl', '2026-04-17T00:00:00Z', 78
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-djstation-1', 'dj-station-bangkok', 'DJ Station', 'Bangkok',
  'DJ Station Drag Spectacular', '2026-04-18T22:00:00Z', '2026-04-19T03:00:00Z',
  'https://www.djstation.net/events', NULL,
  'DJ Station', 'Nightly drag show at DJ Station, Bangkok''s most famous gay club on Silom Soi 2.',
  ARRAY['drag', 'pop', 'dancefloor', 'tourist-heavy'],
  'https://www.djstation.net/events', '2026-04-17T00:00:00Z', 86
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-gbangkok-1', 'g-bangkok', 'G Bangkok', 'Bangkok',
  'G Bangkok White Party', '2026-04-26T22:00:00Z', '2026-04-27T03:00:00Z',
  'https://www.gbangkok.com/events', 'https://www.gbangkok.com/events',
  'G Bangkok', 'G Bangkok''s White Party circuit event on Silom.',
  ARRAY['circuit', 'EDM', 'dancefloor', 'shirtless'],
  'https://www.gbangkok.com/events', '2026-04-17T00:00:00Z', 82
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-babylon-1', 'babylon-bangkok', 'Babylon Bangkok', 'Bangkok',
  'Babylon Summer Pool Party', '2026-05-09T15:00:00Z', '2026-05-09T22:00:00Z',
  'https://www.babylon-bangkok.com/events', 'https://www.babylon-bangkok.com/events',
  'Babylon Bangkok', 'Summer outdoor pool party at Babylon Bangkok''s sauna and resort complex.',
  ARRAY['sauna', 'casual', 'bear', 'outdoor'],
  'https://www.babylon-bangkok.com/events', '2026-04-17T00:00:00Z', 80
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-djstation-2', 'dj-station-bangkok', 'DJ Station', 'Bangkok',
  'Songkran Special Night', '2026-04-13T22:00:00Z', '2026-04-14T03:00:00Z',
  'https://www.djstation.net/events', NULL,
  'DJ Station', 'DJ Station''s annual Songkran celebration night with special performers.',
  ARRAY['drag', 'pop', 'high-energy', 'seasonal'],
  'https://www.djstation.net/events', '2026-04-17T00:00:00Z', 84
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-arq-1', 'arq-sydney', 'ARQ Sydney', 'Sydney',
  'ARQ Sundays: Super Gay', '2026-04-19T21:00:00Z', '2026-04-20T03:00:00Z',
  'https://www.arqsydney.com.au/events', 'https://www.arqsydney.com.au/events',
  'ARQ Sydney', 'ARQ''s flagship Sunday party — pop and circuit programming across three levels.',
  ARRAY['pop', 'circuit', 'dancefloor', 'high-energy'],
  'https://www.arqsydney.com.au/events', '2026-04-17T00:00:00Z', 87
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-stonewall-syd-1', 'stonewall-sydney', 'Stonewall Hotel', 'Sydney',
  'Stonewall Drag Saturdays', '2026-04-18T20:00:00Z', '2026-04-19T02:00:00Z',
  'https://www.stonewallhotel.com.au/events', NULL,
  'Stonewall Hotel', 'Regular Saturday drag show night at the Stonewall Hotel on Oxford Street.',
  ARRAY['drag', 'pop', 'casual', 'neighborhood'],
  'https://www.stonewallhotel.com.au/events', '2026-04-17T00:00:00Z', 82
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-arq-2', 'arq-sydney', 'ARQ Sydney', 'Sydney',
  'ARQ Mardi Gras Afterparty Preview', '2026-05-23T22:00:00Z', '2026-05-24T06:00:00Z',
  'https://www.arqsydney.com.au/events', 'https://www.arqsydney.com.au/events',
  'ARQ Sydney', 'ARQ preview event for Mardi Gras season with circuit DJ lineup.',
  ARRAY['circuit', 'pop', 'dancefloor', 'high-energy'],
  'https://www.arqsydney.com.au/events', '2026-04-17T00:00:00Z', 80
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-theweek-1', 'the-week-sao-paulo', 'The Week São Paulo', 'São Paulo',
  'The Week: XXXL', '2026-04-18T23:00:00Z', '2026-04-19T10:00:00Z',
  'https://www.theweek.com.br/events', 'https://www.theweek.com.br/events',
  'The Week', 'The Week''s signature XXXL circuit party with international DJ headliners.',
  ARRAY['circuit', 'massive', 'dancefloor', 'techno'],
  'https://www.theweek.com.br/events', '2026-04-17T00:00:00Z', 91
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-bluespace-1', 'blue-space-sao-paulo', 'Blue Space', 'São Paulo',
  'Blue Space Sábado', '2026-04-18T23:00:00Z', '2026-04-19T06:00:00Z',
  'https://www.bluespaceclub.com.br/eventos', 'https://www.bluespaceclub.com.br/eventos',
  'Blue Space', 'Weekly Saturday club night at Blue Space featuring drag shows and pop programming.',
  ARRAY['circuit', 'drag', 'mainstream', 'dancefloor'],
  'https://www.bluespaceclub.com.br/eventos', '2026-04-17T00:00:00Z', 88
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-leboy-1', 'le-boy-sao-paulo', 'Le Boy', 'São Paulo',
  'Le Boy Pride Preview', '2026-05-30T23:00:00Z', '2026-05-31T06:00:00Z',
  'https://www.leboy.com.br/eventos', 'https://www.leboy.com.br/eventos',
  'Le Boy', 'Le Boy''s annual Pride preview party in the Jardins neighbourhood.',
  ARRAY['circuit', 'pop', 'dancefloor', 'pride'],
  'https://www.leboy.com.br/eventos', '2026-04-17T00:00:00Z', 83
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-theweek-2', 'the-week-sao-paulo', 'The Week São Paulo', 'São Paulo',
  'The Week: Carnival Warm-Up', '2026-06-06T23:00:00Z', '2026-06-07T10:00:00Z',
  'https://www.theweek.com.br/events', 'https://www.theweek.com.br/events',
  'The Week', 'The Week''s mid-year massive circuit event, São Paulo''s biggest gay party weekend.',
  ARRAY['circuit', 'massive', 'international', 'dancefloor'],
  'https://www.theweek.com.br/events', '2026-04-17T00:00:00Z', 89
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-boybar-1', 'boy-bar-cdmx', 'Boy Bar', 'Mexico City',
  'Boy Bar Drag Spectacular', '2026-04-17T21:00:00Z', '2026-04-18T03:00:00Z',
  'https://www.boybardmx.com/events', NULL,
  'Boy Bar', 'Nightly drag performances at Boy Bar, Zona Rosa''s most popular gay destination.',
  ARRAY['drag', 'pop', 'dancefloor', 'tourist-heavy'],
  'https://www.boybardmx.com/events', '2026-04-17T00:00:00Z', 83
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-kinky-1', 'kinky-bar-cdmx', 'Kinky Bar', 'Mexico City',
  'Kinky Fridays', '2026-04-17T21:00:00Z', '2026-04-18T04:00:00Z',
  'https://www.kinkybar.com.mx/eventos', NULL,
  'Kinky Bar', 'Weekly Friday night pop and drag party at Kinky Bar in Zona Rosa.',
  ARRAY['pop', 'drag', 'dancefloor', 'high-energy'],
  'https://www.kinkybar.com.mx/eventos', '2026-04-17T00:00:00Z', 82
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-patmiller-1', 'patrick-miller-cdmx', 'Patrick Miller', 'Mexico City',
  'Patrick Miller: 80s Night', '2026-04-18T22:00:00Z', '2026-04-19T04:00:00Z',
  NULL, NULL,
  'Patrick Miller', 'Weekly Saturday 80s pop night at the cult-favourite Mexico City disco.',
  ARRAY['80s', 'retro', 'dancefloor', 'queer-friendly'],
  'https://www.timeout.com/mexico-city/nightlife/patrick-miller', '2026-04-17T00:00:00Z', 80
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-marrakech-1', 'marrakech-salon-cdmx', 'Marrakech Salón', 'Mexico City',
  'Marrakech: Noches del Salón', '2026-04-22T22:00:00Z', '2026-04-23T03:00:00Z',
  NULL, NULL,
  'Marrakech Salón', 'Regular drag cabaret night at Marrakech Salón in the Centro Histórico.',
  ARRAY['drag', 'cabaret', 'local-favorite', 'underground'],
  'https://www.instagram.com/marrakechsalon', '2026-04-17T00:00:00Z', 76
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-lipstick-1', 'lipstick-cdmx', 'Lipstick', 'Mexico City',
  'Lipstick Pride Month Launch', '2026-05-29T21:00:00Z', '2026-05-30T04:00:00Z',
  'https://www.lipstickmexico.com', NULL,
  'Lipstick', 'Lipstick''s Pride Month opening party in Zona Rosa.',
  ARRAY['pop', 'mainstream', 'dancefloor', 'pride'],
  'https://www.lipstickmexico.com', '2026-04-17T00:00:00Z', 78
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-eagle-sf-1', 'sf-eagle', 'SF Eagle', 'San Francisco',
  'SF Eagle Sunday Beer Bust', '2026-04-19T13:00:00Z', '2026-04-19T18:00:00Z',
  'https://www.sfeagle.com/events', NULL,
  'SF Eagle', 'The SF Eagle''s legendary weekly Sunday afternoon patio party — $10 all-you-can-drink.',
  ARRAY['leather', 'bear', 'casual', 'outdoor'],
  'https://www.sfeagle.com/events', '2026-04-17T00:00:00Z', 91
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-oasis-sf-1', 'oasis-sf', 'Oasis', 'San Francisco',
  'MOTHER: Season Finale', '2026-05-16T21:00:00Z', '2026-05-17T02:00:00Z',
  'https://www.sfoasis.com/events', 'https://www.sfoasis.com/events',
  'D''Arcy Drollinger', 'The season finale of Mother, SF''s most beloved weekly drag cabaret.',
  ARRAY['drag', 'cabaret', 'performance', 'upscale'],
  'https://www.sfoasis.com/events', '2026-04-17T00:00:00Z', 89
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-lookout-sf-1', 'the-lookout-sf', 'The Lookout', 'San Francisco',
  'Castro Block Party Preview', '2026-05-23T14:00:00Z', '2026-05-23T20:00:00Z',
  'https://www.lookoutsf.com/events', NULL,
  'The Lookout', 'The Lookout''s terrace party ahead of the Castro Street Fair season.',
  ARRAY['casual', 'neighborhood', 'queer-mixed', 'outdoor'],
  'https://www.lookoutsf.com/events', '2026-04-17T00:00:00Z', 77
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-oasis-sf-2', 'oasis-sf', 'Oasis', 'San Francisco',
  'DIVAS Live: Drag Cabaret', '2026-04-18T21:00:00Z', '2026-04-18T23:30:00Z',
  'https://www.sfoasis.com/events', 'https://www.sfoasis.com/events',
  'Oasis', 'Live drag cabaret show at Oasis, SoMa''s premier queer performance venue.',
  ARRAY['drag', 'cabaret', 'performance'],
  'https://www.sfoasis.com/events', '2026-04-17T00:00:00Z', 86
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;

INSERT INTO public.world_venue_events (id, venue_id, venue_name, city, title, start_datetime, end_datetime, event_url, ticket_url, promoter, description, tags, source_url, last_verified_at, confidence_score)
VALUES (
  'evt-eagle-sf-2', 'sf-eagle', 'SF Eagle', 'San Francisco',
  'Folsom Street Fair Warm-Up', '2026-05-30T17:00:00Z', '2026-05-31T02:00:00Z',
  'https://www.sfeagle.com/events', NULL,
  'SF Eagle', 'Annual SF Eagle warm-up party in advance of the Folsom Street Fair season.',
  ARRAY['leather', 'bear', 'masculine', 'seasonal'],
  'https://www.sfeagle.com/events', '2026-04-17T00:00:00Z', 84
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, start_datetime = EXCLUDED.start_datetime,
  confidence_score = EXCLUDED.confidence_score, last_verified_at = EXCLUDED.last_verified_at;
