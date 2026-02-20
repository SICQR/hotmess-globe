# HOTMESS Live Supabase Schema

**Project:** `rfoftonnlwudilafhfkl`  
**Generated:** 2026-02-20

## Tables (Public Schema)

| Table | Columns |
|-------|---------|
| `affiliate_relations` | created_at, id, referred_id, referrer_id |
| `analytics_events` | category, created_at, event_name, id, ip, label, path, properties, referrer, session_id, url, user_agent |
| `audit_logs` | action, actor_id, created_at, id, metadata, target |
| `beacon_nonces_a670c824` | beacon_id, created_at, expires_at, id, nonce, used_at |
| `beacon_scans` | beacon_id, city_slug, device_hash, geo_lat, geo_lng, id, ip_hash, reason_code, result, scanned_at, user_id |
| `beacons` | active, chat_room_id, city, city_slug, code, created_at, description, ends_at, geo_lat, geo_lng, id, latitude, longitude, max_scans_per_user_per_day, max_scans_total, owner_id, redirect_fallback, redirect_url, sponsor_id, starts_at, status, title, type, updated_at, utm_json, xp_amount |
| `beacons_a670c824` | code, created_at, geo, geo_mode, id, label, owner_id, payload, scan_count, status, subtype, type, updated_at |
| `beacons_view` | created_at, expires_at, id, location, metadata, owner_id, type, updated_at |
| `cities` | country_code, created_at, id, latitude, longitude, name, population |
| `club_events` | address, age_restriction, capacity, etc. |
| `club_tickets` | buyer_id, created_at, etc. |
| `clubs` | banner_url, city_slug, created_at, etc. |
| `consent_logs` | action, category, id, metadata, occurred_at, user_id |
| `consents` | granted, granted_at, id, type, user_id |
| `conversation_members` | conversation_id, joined_at, role, user_id |
| `conversations` | created_at, created_by, id, is_group, last_message_at, title, updated_at |
| `events` | created_at, creator_id, id, payload, type, user_id |
| `heat_bins_city_summary` | beacons_active, city, last_updated, scans_24h |
| `lastfm_sessions` | authenticated_at, key, session_key, updated_at, username |
| `market_listing_media` | alt, created_at, id, listing_id, sort, storage_path |
| `market_listings` | category, created_at, description, id, price_pence, quantity_available, seller_id, slug, status, title, updated_at |
| `market_sellers` | created_at, display_name, id, owner_id, status, stripe_account_id, stripe_onboarding_complete, updated_at |
| `membership_tiers` | benefits, created_at, id, name, price |
| `memberships` | ends_at, id, metadata, started_at, status, tier, user_id |
| `messages` | attachments, content, conversation_id, created_at, id, metadata, sender_id, updated_at |
| `night_pulse_realtime` | active_beacons, city_id, city_name, country_code, heat_intensity, last_activity_at, latitude, longitude |
| `notifications` | created_at, id, payload, read, type, user_id |
| `payouts` | amount, created_at, id, method, status, user_id |
| `personas` | bio, created_at, display_name, expires_at, id, etc. |
| `profiles` | active_persona_id, avatar_type, avatar_url, consent_accepted, cookie_preferences, created_at, display_name, email, full_name, id, location_consent_granted_at, location_consent_mode, location_last_updated_at, onboarding_completed, onboarding_completed_at, persona_type, phone, role, tags, telegram_id, telegram_username, updated_at, username |
| `purchases` | amount_cents, created_at, currency, id, metadata, provider, provider_ref, status, user_id |
| `qr_codes` | created_at, id, owner_id, scans, target_url |
| `qr_scans` | created_at, id, qr_id, scanner_id |
| `radio_sessions` | duration_seconds, ended_at, id, metadata, started_at, user_id |
| `radio_shows` | created_at, description, host, id, schedule, slug, sponsor, stream_url, title |
| `reports` | created_at, id, notes, reason, reporter_id, status, target_id, target_type |
| `right_now_posts` | allow_anon_signals, city, country, created_at, crowd_count, deleted_at, expires_at, heat_bin_id, host_id, id, kind, latitude, longitude, metadata, name, status, style, updated_at, venue_id, vibe_tag, visibility |
| `sellers` | branding_agreement, created_at, email, id, name, product_category, product_description, shop_name |
| `shared_venue_scans` | code, created_at, created_by, expires_at, id, metadata, venue_id |
| `timed_checkins` | beacon_id, ended_at, expires_at, id, metadata, started_at, user_id, venue_id |
| `typing_indicators` | conversation_id, last_typed_at, user_id |
| `user_consents` | accepted, created_at, details, updated_at, user_id |
| `user_presence` | last_seen_at, location, metadata, status, user_id |
| `users` | created_at, email, id, membership_tier, username |
| `venue_checkins` | checked_in_at, id, location, metadata, source, user_id, venue_id |
| `venues` | address, city_slug, created_at, description, id, location, metadata, name, owner_id, slug, updated_at |
| `xp_ledger` | amount, beacon_id, created_at, id, kind, metadata, ref_id, user_id |
| `xp_log` | affiliate_id, created_at, id, reason, user_id, xp_amount |
| `xp_summary` | affiliate_xp, connect_xp, purchase_xp, radio_xp, scan_xp, total_xp, user_id, username |

## Key Table Details

### beacons
```sql
id              uuid PRIMARY KEY
title           text
description     text
code            text
type            text -- "event", "scan", "promo" etc.
status          text -- "draft", "published", "expired"
active          boolean
owner_id        uuid
city            text
city_slug       text
latitude        numeric
longitude       numeric
geo_lat         numeric
geo_lng         numeric
starts_at       timestamptz
ends_at         timestamptz
created_at      timestamptz
updated_at      timestamptz
xp_amount       integer
-- NOTE: No `kind` or `mode` columns exist!
```

### users
```sql
id              uuid PRIMARY KEY
email           text
username        text
membership_tier text
created_at      timestamptz
-- NOTE: No `created_date` column!
```

### cities
```sql
id              text PRIMARY KEY
name            text
country_code    text
latitude        numeric
longitude       numeric
population      integer
created_at      timestamptz
-- NOTE: No `created_date` column!
```

### profiles
```sql
id                          uuid PRIMARY KEY
email                       text
username                    text
display_name                text
full_name                   text
avatar_url                  text
avatar_type                 text
role                        text
tags                        text[]
persona_type                text
active_persona_id           text
consent_accepted            boolean
cookie_preferences          jsonb
onboarding_completed        boolean
onboarding_completed_at     timestamptz
location_consent_mode       text
location_consent_granted_at timestamptz
location_last_updated_at    timestamptz
telegram_id                 text
telegram_username           text
phone                       text
created_at                  timestamptz
updated_at                  timestamptz
```

## Missing Tables (Code Expects)

| Expected Table | Error | Status |
|----------------|-------|--------|
| `user_activities` | 404 Not Found | **MISSING** |
| `user_intents` | 404 Not Found | **MISSING** |
| `right_now_status` | 404 Not Found | Use `right_now_posts` instead |
| `presence` | 404 Not Found | Use `user_presence` instead |
| `beacon_checkins` | 404 Not Found | Use `beacon_scans` or `timed_checkins` |
| `Beacon` (PascalCase) | 404 Not Found | Use `beacons` (lowercase) |
| `User` (PascalCase) | 404 Not Found | Use `users` (lowercase) |
| `City` (PascalCase) | 404 Not Found | Use `cities` (lowercase) |

## Missing Columns (Code Expects)

| Table | Expected Column | Actual Column | Fix |
|-------|-----------------|---------------|-----|
| `beacons` | `kind` | ❌ missing | Add column or use `type` |
| `beacons` | `mode` | ❌ missing | Add column or alias |
| `users` | `created_date` | `created_at` | Add view alias |
| `cities` | `created_date` | `created_at` | Add view alias |
| `events` | `starts_at` | ❌ missing | Add columns |
| `events` | `ends_at` | ❌ missing | Add columns |
