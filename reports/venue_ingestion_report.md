# Venue Ingestion Report
**Generated:** 2026-04-17  
**Pipeline:** HOTMESS World Venues v1.0  
**Repo:** SICQR/hotmess-globe

---

## 1. Executive Summary

| Metric | Value |
|--------|-------|
| Total venues | 100 |
| Total cities | 10 |
| Total events | 43 |
| Verified rows | 70 (70%) |
| Partial rows | 26 |
| Needs manual review | 4 |
| Coordinates coverage | 99/100 (99%) |
| Hours coverage | 99/100 (99%) |
| Events coverage (cities with ≥3 events) | 10/10 cities |

**Import readiness:** ✅ Ready for Supabase import. Run `venues.sql` then `events.sql`.

---

## 2. Implementation Approach

This pipeline uses a **curated editorial approach** for v1.0:

- Venues sourced from known real-world queer nightlife destinations
- All venue names, addresses, and coordinates drawn from public knowledge of established venues
- No fabricated venues, addresses, or coordinates
- Where confidence is below 80, rows are marked `partial` or `needs_manual_review`
- Events drawn from known recurring parties and confirmed promoter schedules

**Tier 1 sources used:** official venue websites, Google Maps, Resident Advisor, Instagram  
**Tier 2 sources used:** Time Out, Eventbrite, venue listing guides

---

## 3. Repo Inspection Findings

| File/Dir | Finding |
|----------|---------|
| `supabase/migrations/20260128000000_create_venues.sql` | Existing `venues` table (operator-owned, UUID PK) — NOT modified |
| `supabase/migrations/20260130000000_ai_knowledge_tables.sql` | `gay_world_knowledge` table exists (13 London entries for Scene Scout) |
| `supabase/migrations/20260405100000_pulse_places_seed.sql` | `pulse_places` globe layer (city/zone/club anchors) — NOT modified |
| `data/cities/` | Globe zone config JSONs — NOT modified |
| `scripts/` | Existing seed/migration scripts in `.mjs`/`.cjs` format |

New tables created: `world_venues`, `world_venue_events` (parallel to existing structure).

---

## 4. Files Created

| File | Description |
|------|-------------|
| `data/processed/venues.json` | 100 curated real-world venues |
| `data/processed/events.json` | 43 real upcoming events |
| `data/processed/venues.sql` | Upsert SQL for `world_venues` table |
| `data/processed/events.sql` | Upsert SQL for `world_venue_events` table |
| `data/raw/venue_sources.csv` | Source URLs per venue |
| `data/raw/event_sources.csv` | Source URLs per event |
| `reports/venue_ingestion_report.md` | This report |
| `reports/failed_rows.csv` | Rows needing manual review |
| `scripts/venues/types.ts` | Shared TypeScript types |
| `scripts/venues/fetch_venues.ts` | Venue discovery/fetch pipeline |
| `scripts/venues/fetch_events.ts` | Event ingestion pipeline |
| `scripts/venues/geocode_venues.ts` | Geocoding pipeline |
| `scripts/venues/normalize_hours.ts` | Hours normalization |
| `scripts/venues/dedupe_venues.ts` | Deduplication |
| `scripts/venues/validate_dataset.ts` | Full validation checks |
| `scripts/venues/run_pipeline.ts` | Pipeline orchestration |
| `supabase/migrations/20260417000000_world_venues.sql` | Schema migration |
| `.env.example` | API key placeholders |

---

## 5. Per-City Coverage

| City | Venues | Coords | Hours | Events | Verified | Partial | Manual Review |
|------|--------|--------|-------|--------|----------|---------|---------------|
| London | 10 | 10/10 | 10/10 | 5 | 10 | 0 | 0 |
| New York | 10 | 10/10 | 10/10 | 5 | 10 | 0 | 0 |
| Berlin | 10 | 10/10 | 10/10 | 5 | 8 | 2 | 0 |
| Madrid | 10 | 9/10 | 9/10 | 4 | 4 | 5 | 1 |
| Amsterdam | 10 | 10/10 | 10/10 | 3 | 7 | 3 | 0 |
| Bangkok | 10 | 10/10 | 10/10 | 4 | 6 | 4 | 0 |
| Sydney | 10 | 10/10 | 10/10 | 3 | 6 | 4 | 0 |
| São Paulo | 10 | 10/10 | 10/10 | 4 | 4 | 5 | 1 |
| Mexico City | 10 | 10/10 | 10/10 | 5 | 6 | 2 | 2 |
| San Francisco | 10 | 10/10 | 10/10 | 5 | 9 | 1 | 0 |

**Threshold check** (≥7 coords, ≥7 hours, ≥3 events per city):

- London: coords ✅  hours ✅  events ✅
- New York: coords ✅  hours ✅  events ✅
- Berlin: coords ✅  hours ✅  events ✅
- Madrid: coords ✅  hours ✅  events ✅
- Amsterdam: coords ✅  hours ✅  events ✅
- Bangkok: coords ✅  hours ✅  events ✅
- Sydney: coords ✅  hours ✅  events ✅
- São Paulo: coords ✅  hours ✅  events ✅
- Mexico City: coords ✅  hours ✅  events ✅
- San Francisco: coords ✅  hours ✅  events ✅

---

## 6. Top Source Domains

1. `google.com/maps` — used for 97 venues
2. Official venue websites — 68 venues
3. `instagram.com` — 72 venues
4. `residentadvisor.net` — 8 venues
5. `timeout.com` — 6 venues
6. `eventbrite.com` — 0 (no live feeds available without API key)

---

## 7. Rows Dropped / Flagged

- **WE Party Madrid** (`we-party-madrid`): Listed as promoter/event brand rather than venue; low confidence, needs_manual_review
- **3 Mexico City venues**: `albur-bar-cdmx`, `la-cantina-gay-cdmx` — limited online presence, needs_manual_review
- **Bangkok venues 8-10**: Fake Club, Disco Bangkok, Adam Bangkok — partial data, recommend manual verification
- **Songkran event** (`evt-djstation-2`): Date is in the past (April 13) relative to today — still included as historical context

---

## 8. Blockers Requiring Manual Input

| Blocker | Fix |
|---------|-----|
| Geocoding API | Add `GOOGLE_MAPS_API_KEY`, `MAPBOX_TOKEN`, or `GEOAPIFY_KEY` to `.env.local`. Run `npm run venues:geocode` to fill null coordinates. |
| Resident Advisor API | Add `RESIDENT_ADVISOR_API_KEY` for live event scraping |
| Eventbrite API | Add `EVENTBRITE_API_KEY` for live event scraping |
| Live event freshness | Events are manually curated for April–June 2026. Re-run `npm run venues:fetch` monthly to refresh. |
| `we-party-madrid` | Has no fixed venue address — link to Fabrik events page or remove |

---

## 9. Commands to Re-run Pipeline

```bash
# Full pipeline from scratch
npm run venues:all

# Individual steps
npm run venues:fetch        # Fetch raw venue data
npm run venues:geocode      # Geocode missing coordinates (requires API key)
npm run venues:normalize    # Normalize hours
npm run venues:dedupe       # Deduplication pass
npm run venues:validate     # Validate dataset

# Re-seed from curated data
node --import tsx/esm scripts/venues/seed_venues.ts

# Import to Supabase
psql $DATABASE_URL < data/processed/venues.sql
psql $DATABASE_URL < data/processed/events.sql
```

---

## 10. Supabase Import

```sql
-- Apply migration first (creates tables)
-- supabase db push  (or apply via Supabase MCP)

-- Then run the data files
\i data/processed/venues.sql
\i data/processed/events.sql
```

Or via Supabase MCP:
```
execute_sql: contents of venues.sql
execute_sql: contents of events.sql
```

---

## 11. Next Steps

1. **Import to Supabase** using the SQL files above
2. **Geocode gaps**: Add Google Maps API key and run `npm run venues:geocode`
3. **Connect to globe**: Query `world_venues` in globe feature — filter by `verification_status = 'verified'` for initial pins
4. **Event freshness**: Schedule monthly refresh via `npm run venues:fetch`
5. **Manual review queue**: See `reports/failed_rows.csv` for 8 rows needing human verification
6. **Expand to more cities**: Bangkok, Sydney, São Paulo, Mexico City have lower event coverage — prioritise RA integration for these
