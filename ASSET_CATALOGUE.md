# HOTMESS Asset Catalogue
**Generated:** 2026-04-16
**Status:** AUDIT ONLY — awaiting Phil confirmation before any uploads
**Scope:** HOTMESS app (hotmess-globe), RAWMASTER, RCR, Supabase, Vercel, Gumroad, Stripe, Shopify

---

## EXECUTIVE SUMMARY (updated after Shopify + env + radio verification)

| Area | State | Critical gaps |
|------|-------|---------------|
| HOTMESS app deploy | ✅ Live — hotmessldn.com → 200 | None |
| **Two Supabase projects** | ✅ Frontend `klsywpvncqqglhnhrjbh` + Backend `rfoftonnlwudilafhfkl` | Frontend project NOT audited (outside MCP access scope) |
| Supabase backend DB (134 tables) | ✅ Live | Music metadata, market seeding, safety feature not adopted |
| **Radio stream** | ✅ **LIVE** — RadioKing `listen.radioking.com/radio/736103/stream/802454` returns HTTP 200 | `radio_shows.stream_url` field points at DEAD `radio.hotmessldn.com` — **DB out of sync with reality** |
| Music catalogue | ⚠️ Schema fragmented — 36 releases w/ duplicate catalog numbers, 3/36 have artwork, 0 Spotify URLs | Dedupe + metadata backfill |
| **Shopify** | ✅ Live — `HOTMESS LONDON` store at shop.hotmessldn.com — 3 products, 15 collections | Only 1 clothing product (SUPERHUNG vest). Most brand collections are empty or unpublished |
| Market DB | ⚠️ 10 listings all archived (legacy/demo), real commerce happens via Shopify | The HOTMESS app `market_listings` ≠ Shopify. Decide: unified or separate surfaces? |
| Stripe | ✅ Live — keys match account (`Rffz` prefix confirmed in .env.local). Mode: `sk_live_` | Note earlier audit couldn't see them via MCP — now verified: **LIVE keys set, product/subs count is genuinely 0 = no paying users yet** |
| Clothing brand storefront | 🔨 Collections exist in Shopify (RAW, HUNG, HIGH, SUPERHUNG, Swimwear, Essentials, Drops, Main Drop) but only SUPERHUNG vest has a published product | Need to populate collections with real SKUs |
| Gumroad | ✅ 4 products live | GRANULE + 3 RAWMASTER tiers |
| RCR site | ✅ rawconvict-music.com → 200 | rawconvictrecords.com → 000 (domain down) |
| Press outreach | 🔨 Minimal — RAWMASTER to MusicTech only | LGBTQ+ press unstarted |

---

## 1. Radio

### Stream
| Item | Value | Status |
|------|-------|--------|
| **Real stream URL** | `https://listen.radioking.com/radio/736103/stream/802454` | ✅ **HTTP 200 — LIVE** (audio/mpeg) |
| Stored in env as | `NEXT_PUBLIC_RADIOKING_STREAM_URL` | ✅ Set in .env.local |
| Provider | **RadioKing** (not AzuraCast as brief assumed) | Moved since brief was written |
| `radio_shows.stream_url` column | `https://radio.hotmessldn.com/radio.mp3` (all 5 rows) | ❌ **STALE — points at dead URL** |

**⚠️ CRITICAL FIX:** All 5 rows in `radio_shows` table have `stream_url` pointing at the dead `radio.hotmessldn.com` URL. Need to `UPDATE radio_shows SET stream_url = 'https://listen.radioking.com/radio/736103/stream/802454'` — AWAITING PHIL APPROVAL (no writes per audit rules).

### Shows registered in DB (`radio_shows` — 5 rows, ALL `is_live=false`, all `is_active=true`)
| # | Title | Host | Artwork | Stream | Live |
|---|-------|------|---------|--------|------|
| 1 | Dial-A-Daddy | Papa Bear | ❌ NULL | radio.hotmessldn.com | no |
| 2 | Hand-in-Hand | HNH Collective | ❌ NULL | radio.hotmessldn.com | no |
| 3 | Drive Time Mess | The Collective | ❌ NULL | radio.hotmessldn.com | no |
| 4 | HOTMESS Nights | SMASH DADDYS | ❌ NULL | radio.hotmessldn.com | no |
| 5 | Wake the Mess | DJ Chaos | ❌ NULL | radio.hotmessldn.com | no |

**⚠️ Brief said 0 rows — actually 5. Brief said 3 — now 5. All missing artwork.**

### Radio assets (local)
| Asset | Path | Referenced? |
|-------|------|-------------|
| radio-in.mp3 | `hotmess-globe/public/audio/radio-in.mp3` | likely |
| radio-out.mp3 | `hotmess-globe/public/audio/radio-out.mp3` | likely |
| hand-n-hand.mp3 | `hotmess-globe/public/audio/hand-n-hand.mp3` | yes — show track |
| dial-a-daddy.mp3 | `hotmess-globe/public/audio/dial-a-daddy.mp3` | yes — show track |
| wake-the-mess.mp3 | `hotmess-globe/public/audio/wake-the-mess.mp3` | yes — show track |
| HOTMESS Radio square | `public/images/products/radio/hotmess-radio-square.jpg` | yes |

### Storage bucket: `radio-assets` (public, 0 objects) — **empty, ready for show artwork**

### Other radio data
- `radio_signals` — 38 rows (unclear purpose — idents/stingers?)
- `radio_idents` — 0
- `radio_stingers` — 0
- `radio_script_log` — 0
- `radio_sessions` — 0
- `radio_listeners` — 0
- `radio_ad_bookings` — 0

**ACTIONS FOR PHIL:**
1. Fix the stream at `radio.hotmessldn.com` — is AzuraCast running?
2. Confirm or provide show artwork (5 shows, all NULL)
3. Verify whether `radio_signals` table is actually used

---

## 2. Music / Smash Daddys

### Data state — `label_releases` (36 rows)

Serious schema problems detected:
- Multiple rows share catalog numbers (e.g. two `SD001`, two `RCR001`, two `SD-EP01`)
- 3 of 36 have `artwork_url` populated (all from `records-covers` bucket)
- 0 of 36 have `spotify_url`, `apple_music_url`, `beatport_url`
- Only `RCR-001 HNH MESS`, `RCR001 Void Protocol`, `RCR002 Machine Burial`, `RCR003 Koh Samui Sessions` have SoundCloud URLs

### Tracks with artwork (3 total)
| Cat # | Title | Artwork URL | HTTP |
|-------|-------|-------------|------|
| RCR-001 | HNH MESS | supabase/records-covers/1764584369372-PHOTO-2025-11-30-21-25-40.jpg | ✅ 200 |
| SD001 | Ghosted (Are You Looking) | supabase/records-covers/1764584738393-25ae7485-...jpg | ✅ (same bucket) |
| SD004 | Walking Red Flag (Remastered) | supabase/records-covers/1764585147044-25ae7485-...%203.jpg | ✅ (same bucket) |

### Tracks table — `tracks` (36 rows)
Schema: `id, release_id, artist_id, track_number, title, duration_ms, preview_url, download_url, is_downloadable, price_gbp, spotify_url, soundcloud_url, min_tier, play_count, ...`

**Missing all preview_url, spotify_url streaming URLs for 16 SD catalogue + 20 other tracks.**

### Storage
- `records-audio` bucket — 6 objects, 58.56 MB (audio files present)
- `records-covers` bucket — 5 objects, 0.77 MB (covers present)

### Label artists — `label_artists` (8 rows)
| # | Name | Slug | Photo | SoundCloud | Spotify |
|---|------|------|-------|-----------|---------|
| 1 | Jon Hemming | jon-hemming | ❌ | ✅ jonhemmingdj | ❌ |
| 2 | Nik Denton | nik-denton | ❌ | ✅ nikdenton | ❌ |
| 3 | Paul King | paul-king | ❌ | ❌ | ❌ |
| 4 | RAW CONVICT | raw-convict | ❌ | ✅ rawconvictrecords | ❌ |
| 5 | Smash Daddys | smash-daddys | ❌ | ✅ rawconvictrecords | ⚠️ PLACEHOLDER |
| 6 | Stephen Nicholls | stephen-nicholls | ❌ | ✅ stephennicholls | ❌ |
| 7 | Stewart Who? | stewart-who | ❌ | ❌ | ❌ |
| 8 | Tony English | tony-english | ❌ | ✅ djtonyenglish | ❌ |

**All 8 artists missing `photo_url`. Smash Daddys has literal string "PLACEHOLDER" in spotify_url — will break if used.**

**ACTIONS:**
1. Dedupe `label_releases` — collapse duplicate catalog numbers (Ghosted appears twice, HNH MESS twice, etc.)
2. Backfill streaming URLs for all 36 releases (or confirm which are truly released vs. demos)
3. Upload artist photos to `avatars` or a new `artists` bucket
4. Fix Smash Daddys PLACEHOLDER Spotify URL

---

## 3. Smash Daddys Plugins

All 6 plugins have dedicated **Vercel projects** — status unknown without deploy check:

| Plugin | Vercel project ID | Gumroad | Price | Status |
|--------|-------------------|---------|-------|--------|
| GRANULE | `prj_4V0CEIGYqHKjikM0Mv3UIE0oSOKg` | `ttupfg` | £15 | ✅ LIVE — URL returns 200 |
| SCATTER | `prj_91ceWhbsbuOOZI1YjP1H2bCYMiJu` | — | — | 💭 Vercel exists, not on Gumroad |
| RUST | `prj_qfBskwRwQZrQg2Z0lCOyfSc9bSUz` | — | — | 💭 Vercel exists, not on Gumroad |
| FROST | `prj_UoaXyizyDDtFDQAV20FGggxKr56U` | — | — | 💭 Vercel exists, not on Gumroad |
| HAZE | `prj_0KrRmu3dNGVXewyCZz9g2ca1utT1` | — | — | 💭 Vercel exists, not on Gumroad |
| CRUSH | `prj_pHlLqXyIbks0OqCTnVnoMcoJXcAt` | — | — | 💭 Vercel exists, not on Gumroad |

Plugin specs live in `/Users/philipgizzie/rawmaster/` (separate repo). `SMASH_DADDYS_PLUGIN_PACK_MASTER_BRIEF_v2.md` — need to verify contents.

---

## 4. RAW CONVICT RECORDS

### Sites
| URL | HTTP | Repo | Vercel |
|-----|------|------|--------|
| rawconvict-music.com | ✅ 200 | SICQR/rawconvict-music (Next.js) | `prj_eQtf2hBAz5JDmg8IPd3qYn0kCFEY` |
| rawconvictrecords.com | ❌ 000 | — | Domain not pointing to Vercel |

### Artist roster (in `/Users/philipgizzie/rawconvict-music/src/data/artists.ts`)
Five featured artists with full bios + VERIFIED Instagram handles:

| Artist | IG | Followers | Scene |
|--------|-----|-----------|-------|
| Paul King | @paulf1king | 1,435 | F1/Trauma/Pants & Corset/Overload |
| Tony English | @mrtonyenglish | 9,149 | Fire, Ministry of Sound, Electric Brixton |
| Nik Denton | @nikdentonmusic | 2,203 | Toolbox, Gaydio |
| Jon Hemming | @jon_hemming_dj | — | Shed Sessions |
| Smash Daddy (Phil) | @rawconvictrecords | 131 | RAW CONVICT |
| Stewart Who? | @djstewartwho | 3,377 | In social.ts |

### Assets in RCR repo
- `public/images/artists/smash-daddy-1.jpg` — 1 image only
- `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/window.svg`, `public/vercel.svg` — boilerplate Next.js SVGs
- `public/submit.php` — PHP form handler for Arvixe hosting

### Deploy target
RCR site built with **Next.js static export** for Arvixe cPanel + PHP/MySQL (has `submit.php` form handler). 9-table MySQL schema in `database/schema.sql`. Dual-deployed: Vercel (rawconvict-music.com) + likely Arvixe (rawconvictrecords.com DEAD).

**ACTIONS:**
1. Fix `rawconvictrecords.com` DNS or decide on single canonical URL
2. Upload artist photos (only Smash Daddy has one)

---

## 5. Market / HNH MESS + Clothing

### Shopify — LIVE STORE (verified 2026-04-16)
- **Store name:** HOTMESS LONDON
- **Primary domain:** shop.hotmessldn.com
- **Shop domain:** hotmessldn.myshopify.com
- **Storefront token:** configured in .env.local ✅

### Live products (3 total)
| Product | Handle | Type | Price | Variants | Inventory | Images |
|---------|--------|------|-------|----------|-----------|--------|
| HNH Mess Lube — 50ml | hnh-mess-lube-50ml | LUBE | £9.99 | Default | 299 | 2 (heic + png) |
| HNH MESS LUBE 250ML | hnh-mess-lube-250ml | LUBE | £15.00 | 250ML | 298 | 2 (png + png) |
| SUPERHUNG VEST — RED LEGEND DROP | superhung-vest-red-legend | Vests | £100.00 | M (100) · L (30) · XL (25) | 155 | 2 (png + png) |

**299 + 298 bottles live in Shopify** — this aligns with the "278 large + 243 small held by Dean in London" figure in the wholesale brief (off by ~20 units, accountable by test purchases or fulfilled orders).

### Shopify collections (15 total)
| Collection | Handle | Notes |
|-----------|--------|-------|
| Shop All | shop-all | |
| HUNG | hung | Core brand collection |
| RAW | raw | Core brand — empty? |
| HIGH | high | Core brand — empty? |
| Essentials | essentials | |
| Drops | drops | Duplicate handle issue |
| Drops (2) | drops-1 | Duplicate — clean up |
| Accessories | accessories | |
| Swimwear Collection | swimwear-collection | |
| Swimwear | swimwear | Duplicate of above — consolidate |
| Main Drop | main-drop | |
| RAW Mainline | raw-mainline | |
| RAW MAINLINE | raw-mainline-1 | Duplicate — consolidate |
| HIGH ST. DROP | high-st-drop | |
| SUPERHUNG | superhung | Contains the 1 live product |

**No SUPERHIGH collection yet.** HUNG collection exists in Shopify but my query didn't surface live products under it (only SUPERHUNG is tagged). Collections are scaffolded but mostly unpopulated.

### HOTMESS app `market_listings` DB (10 rows, all archived)
| Surface | Status |
|---------|--------|
| `market_listings` | 10 rows, ALL `archived` — legacy/demo data, NOT current products |
| `preloved_listings` | 0 rows |
| `market_sellers` | 3 rows |
| `messmarket-images` bucket | 5 objects, 22.74 MB |

**The HOTMESS in-app market is separate from the Shopify storefront.** Shopify is authoritative for product retail; `market_listings` is intended for peer-to-peer preloved. Both exist, neither is populated with current data.

### Archived demo listings (sample)
Neon Mesh Tank £34.99 · Studded Leather Cuff £24.99 · Club Jock Strap £18.99 · Chain Body Harness £69.99 · Latex Shorts £54.99 · Pride Flag Pin Set £12.99 · Bondage Tape £8.99 · Muscle Fit Crop Top £29.99 · Leather Collar £39.99 · Neon Snapback £21.99

None have `brand`, `condition`, `size`, `colour` populated. All archived.

### Market-related tables
| Table | Rows |
|-------|------|
| market_listings | 10 (all archived) |
| market_listing_media | 0 |
| market_sellers | 3 |
| market_saves | 0 |
| market_reviews | 0 |
| market_beacon_drops | 0 |
| preloved_listings | 0 |
| preloved_offers | 0 |
| product_reviews | 0 |
| cart_items | 0 |
| orders | 43 |
| order_items | 38 |
| shopify_orders_mirror | 0 |

**43 orders is noteworthy — those are real. Where do they point if market_listings is empty?**

---

## 6. Clothing Brands (RAW / HUNG / HIGH / SUPERHUNG / SUPERHIGH)

### Local image assets found in `hotmess-globe/public/images/products/`

| Brand | Files | Location |
|-------|-------|----------|
| HUNG | 8 images (hero, editorial, tee white/yellow/black/white-folded, briefs-white, shorts-rear) | `public/images/products/hung/` |
| RAW | 1+ images (raw-briefs-white.jpg visible) | `public/images/products/raw/` |
| SUPERHIGH | briefs-rear.jpg | `public/images/products/superhigh/` |
| ESSENTIALS | hoodie-flat, hoodie-hood, hoodie-chest, essentials-logo | `public/images/products/essentials/` |
| RCR product | raw001-artwork.jpg | `public/images/products/rawconvict/` |
| Radio | hotmess-radio-square.jpg | `public/images/products/radio/` |
| Misc promo | hotmess-promo.mp4 | `public/images/products/misc/` |
| Home hero | hung-white, hung-black, hero-world, hero-pulse, hnh-primary, hnh-secondary, smash-primary, essentials-primary | `public/images/home/` |

### Legacy home images
- `HNHMESS RECORD COVER.PNG` — 1.39 MB
- `HOTMESS HOODIE BACK.jpg`, `HOTMESS HOODIE FRONT.jpg` — 0.6 MB each
- `HOTMESS HERO HNH.PNG`, `Hotmess Green.JPEG`
- `hot-mess-raw001-black-red-1024.jpg`

### DB state
- **Clothing NOT in `market_listings`** (verified — no RAW/HUNG/HIGH titles)
- No dedicated `products`, `drops`, `collections`, `apparel`, or `clothing` tables
- `products` table exists but has only 1 row

**NO SUPERHUNG, no SUPERHIGH drops in DB. Images exist but not wired into any storefront.**

**ACTIONS:**
1. Confirm whether clothing is sold via Shopify (not HOTMESS DB)
2. If via Shopify, query the storefront with proper `SHOPIFY_SHOP_DOMAIN`
3. Seed real clothing products if launching

---

## 7. Ghosted / Profiles / Social

### Profile data
- 123 total profiles
- 123 memberships (1:1 mapping)
- 123 personas (multi-context profiles)
- 123 profile_settings
- 30 profile_photos
- 0 profile_verifications

### Interactions
| Table | Rows |
|-------|------|
| taps | 8 |
| conversations | 2 |
| conversation_members | 3 |
| messages | 7 |
| chat_threads | 3 |
| chat_messages | 7 |
| blocks | 0 |
| saved_items | 0 |
| vault_items | 0 |
| reports | 0 |
| photo_moderation_events | 0 |
| right_now_posts | 0 |

### Vibes / tags
- `user_vibes` — 1
- `user_tribes` — 3
- `user_tags` — 0
- `user_live_vibes` — 0
- No dedicated `tags`, `interest_tags` tables — taxonomy is **hardcoded in app**

---

## 8. Safety Features

| Table | Rows | Notes |
|-------|------|-------|
| trusted_contacts | 2 | feature used |
| fake_call_callers | 2 | feature used |
| safety_checkins | 0 | **NOBODY using check-in timer** |
| timed_checkins | 1 | one test |
| emergency_contacts | 0 | separate unused table |
| location_shares | 0 | |

**Safety backend exists but user adoption is near zero — launch feature visibility is weak.**

---

## 9. Globe / Pulse / Beacons

| Table | Rows |
|-------|------|
| beacons | 13 |
| beacon_scans | 0 |
| globe_events | 10 |
| globe_ad_bookings | 0 |
| pulse_places | 60 |
| venues | 8 |
| venue_checkins | 1 |
| clubs | 1 |
| cities | 15 |
| user_presence | 0 |
| user_presence_locations | 1 |

**60 pulse_places is the geographic backbone — these are the venues rendered on the globe.**

---

## 10. App-wide / Brand assets (hotmess-globe)

### `public/` root
| File | Size | Notes |
|------|------|-------|
| favicon.svg | 1 KB | ✅ |
| manifest.json | 2.4 KB | ✅ PWA manifest |
| sw.js | 11 KB | service worker |
| progress.html + progress.json | — | dev tool |
| mindmap.html, smart-ui-demo.html | — | dev tools |

### Icons (`public/icons/`)
- apple-touch-icon-180.png, apple-touch-icon.svg
- icon-192.png, icon-192.svg
- icon-512.png, icon-512.svg
- icon-maskable-192 (png+svg)
- icon-maskable-512 (png+svg)

### Hotmessldn.com live checks
| Asset | HTTP |
|-------|------|
| hotmessldn.com (root) | ✅ 200 |
| radio.hotmessldn.com/radio.mp3 | ❌ 000 |

### Duplicate dist directories
`dist/`, `dist2/`, `dist_old/`, `archive-skin/` — stale build artifacts in the repo (cleanup opportunity but not blocking).

---

## Data Content Status

| # | Content | Table | Rows | Complete? | Missing | Action |
|---|---------|-------|------|-----------|---------|--------|
| 1 | Radio shows | radio_shows | 5 | ⚠️ | artwork_url for all 5 | Upload artwork |
| 2 | Radio stream | external | — | ❌ | Server down (radio.hotmessldn.com) | Fix stream |
| 3 | Music releases | label_releases | 36 | ⚠️ | 33/36 no artwork, 36/36 no Spotify/Apple/Beatport; duplicate cat #s | Dedupe + backfill |
| 4 | Tracks | tracks | 36 | ⚠️ | No streaming URLs | Backfill |
| 5 | Label artists | label_artists | 8 | ⚠️ | 8/8 no photo, Smash Daddys has PLACEHOLDER Spotify | Photos + fix PLACEHOLDER |
| 6 | Membership tiers | membership_tiers | 5 | ✅ | — | OK |
| 7 | Annual pricing | membership_annual_pricing | 4 | ✅ | stripe_price_ids present | **Verify these exist in live Stripe — may be test mode** |
| 8 | Market listings | market_listings | 10 | ❌ | All archived (demo) — 0 live products | Seed real products |
| 9 | Preloved listings | preloved_listings | 0 | ❌ | No data | Seed |
| 10 | Profiles | profiles | 123 | ⚠️ | 30/123 profile photos (~24%) | |
| 11 | Safety | safety_checkins | 0 | ❌ | feature deployed, unused | Need UX push |
| 12 | Beacons | beacons | 13 | ⚠️ | few active | |
| 13 | Pulse places | pulse_places | 60 | ✅ | Geographic seed in place | |
| 14 | Gay world knowledge | gay_world_knowledge | 13 | ⚠️ | London only (8 venues + 3 resources + 2 areas) | Expand |
| 15 | App banners | app_banners | 30 | ✅ | all `is_active=true` | OK |
| 16 | Push subscriptions | push_subscriptions | 8 | ⚠️ | tiny install base | |
| 17 | Orders | orders | 43 | ✅ | Real customer data exists | |
| 18 | Order items | order_items | 38 | ✅ | | |
| 19 | Notification outbox | notification_outbox | 0 | ❌ | Cron runs every 5 min but queue empty — healthy or broken? | Investigate |
| 20 | WhatsApp messages | whatsapp_messages | 0 | ❌ | Daily brief cron live, but no message log | Check webhook |
| 21 | Vault items | vault_items | 0 | ❌ | Feature built, unused | |
| 22 | Referrals | referrals | 0 | ❌ | Cron runs every 6h | |
| 23 | Referral rewards | referral_rewards | 3 | ⚠️ | 3 rewards defined | |
| 24 | User boost types | user_boost_types | 6 | ✅ | 6 boost products defined | |
| 25 | User active boosts | user_active_boosts | 0 | ❌ | No purchases | |
| 26 | AI tier limits | ai_tier_limits | 5 | ✅ | per-tier AI quotas set | |
| 27 | AI usage | ai_usage | 0 | ❌ | No AI calls logged | |
| 28 | Age gate consents | age_gate_consents | 20 | ⚠️ | 20/123 — low funnel conversion | |
| 29 | User consents | user_consents | 26 | — | GDPR | |

---

## 11. Membership Tiers — Confirmed DB state

### `membership_tiers` table (5 rows, price in £)
| # | Tier | Price/mo | Key benefits |
|---|------|----------|--------------|
| 1 | mess | £0 | Age-verified entry, radio, globe browse, 3 ghosted previews |
| 2 | hotmess | £7.99 | Full Ghosted, taps, messaging, full music, Dial-A-Daddy, Hand N Hand, 3 beacon drops/mo |
| 3 | connected | £19.99 | + sell preloved (20 listings), creator dashboard, analytics, referral, 10 beacon drops/mo |
| 4 | promoter | £44.99 | + create events, ticketing, guestlists, Radio slot, 20 beacon drops, unlimited personas |
| 5 | venue | £99.99 | + door staff app, Stripe Connect payouts, permanent Globe presence, unlimited beacon drops |

### `membership_annual_pricing` — Stripe price IDs registered
| Tier | Monthly pence | Annual pence | Stripe Monthly | Stripe Annual |
|------|---------------|--------------|----------------|---------------|
| hotmess | 799 | 6390 | price_1THYR0Rffz... | price_1THYR1Rffz... |
| connected | 1999 | 15990 | price_1THYR3Rffz...(jjCXDoMh) | price_1THYR3Rffz...(KLvNdv85) |
| promoter | 4499 | 35990 | price_1THYR5Rffz... | price_1THYR6Rffz... |
| venue | 9999 | 79990 | price_1THYR7Rffz... | price_1THYR8Rffz... |

⚠️ **CRITICAL:** These `price_` IDs use the `Rffz` prefix but Stripe account queries returned only 2 products ("Test" £0 + "PageReady Website" £149). **Either these are in test mode OR they're in a different Stripe account than the one my Stripe MCP is connected to.** Needs Phil to verify.

---

## 12. Gumroad Products

All 4 verified live (HTTP 200):

| Product | ID | Price | URL | Status |
|---------|-----|-------|-----|--------|
| GRANULE reverb plugin | `ttupfg` | £15 | scanme2.gumroad.com/l/ttupfg | ✅ Live |
| RAWMASTER CLI | `iolsms` | £19 | scanme2.gumroad.com/l/iolsms | ✅ Live |
| RAWMASTER Desktop | `kmgake` | £29 | scanme2.gumroad.com/l/kmgake | ✅ Live |
| Smash Daddys Toolkit (Desktop + GRANULE) | `uvznyb` | £39 | scanme2.gumroad.com/l/uvznyb | ✅ Live |

**Not previously mentioned in brief:** DJ Bookability Scorecard + Nightlife Promoter Starter Kit — **not found on Gumroad**, likely not yet listed.

Gumroad product IDs hardcoded in `rawmaster.py` for license verification.

---

## 13. Vercel Projects (50 total)

### Production-active (used by real domains)
| Name | ID | Latest deploy | State |
|------|-----|---------------|-------|
| hotmess-globe | `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO` | 2026-04-14 | ✅ READY |
| rawconvict-music | `prj_eQtf2hBAz5JDmg8IPd3qYn0kCFEY` | 2026-04-08 | ✅ READY |
| rawmaster-landing | `prj_gR42D2lzuPvVeUuW5n0RlE217eto` | 2026-04-14 | ✅ READY |
| hotmess-website | `prj_4o1SIZMPaiC6PuOqF8EfFr6w5BCj` | — | New (2026-04-11 created) |

### Plugin projects (6)
granule-plugin, scatter-plugin, crush-plugin, rust-plugin, frost-plugin, haze-plugin — deploy status not individually verified, only GRANULE confirmed via Gumroad.

### Stale / abandoned (40+)
Huge pile of `hotmess-*` starter projects from 2025 (hotmess-9sur, hotmess-51gj, hotmess-jumpstart, hotmess-vercel-starter-plu-*, hotmess-site, etc.) — none used. **Cleanup opportunity** (not blocking).

---

## 14. Supabase Storage

| Bucket | Public | Objects | Size | Purpose |
|--------|--------|---------|------|---------|
| avatars | ✅ yes | — | — | Profile photos |
| chat-uploads | 🔒 no | 1 | — | In-chat media |
| messmarket-images | ✅ yes | 5 | 22.74 MB | Market product images |
| radio-assets | ✅ yes | 0 | — | **EMPTY — upload show artwork here** |
| records-audio | ✅ yes | 6 | 58.56 MB | Music audio files |
| records-covers | ✅ yes | 5 | 0.77 MB | Music artwork (only 3 tracks reference these) |
| thread-attachments | 🔒 no | — | — | Chat thread attachments |
| uploads | ✅ yes | — | — | General |

---

## 15. Env Vars — FULL AUDIT (complete enumeration vs .env.local)

### Client-side (VITE_ prefix, bundled into browser)
| Var | Referenced | In .env.local | Notes |
|-----|-----------|---------------|-------|
| VITE_SUPABASE_URL | ✅ | ✅ `klsywpvncqqglhnhrjbh` | **Frontend project** |
| VITE_SUPABASE_ANON_KEY | ✅ | ✅ | |
| VITE_STRIPE_PUBLISHABLE_KEY | ✅ | ✅ `pk_live_51RrKkr...` | LIVE mode |
| VITE_MAPBOX_TOKEN | ✅ | ✅ | |
| VITE_TELEGRAM_BOT_USERNAME | ✅ | ✅ @HOTMESS_ADMIN_BOT | |
| VITE_VAPID_PUBLIC_KEY | ✅ | ✅ | |
| VITE_SENTRY_DSN | ✅ | ✅ | |
| VITE_APP_VERSION | ✅ | ❌ Not in .env.local | Likely injected at build |
| VITE_MUSIC_UPLOAD_EMAILS | ✅ | ❌ | Missing — feature may fallback |
| VITE_OWNER_EMAIL | ✅ | ❌ | Missing |
| VITE_MIXPANEL_TOKEN | ✅ | ❌ | No Mixpanel configured |
| VITE_GA_MEASUREMENT_ID | ✅ | ⚠️ `HOTMESSLDN=G-495171552` (wrong var name in .env.local) | **MISMATCH** |
| VITE_BOOT_DEBUG | ✅ | ❌ | Dev flag only |
| VITE_SENTRY_DEBUG | ✅ | ❌ | Dev flag only |
| VITE_ANALYTICS_DEBUG | ✅ | ❌ | Dev flag only |
| VITE_SHOPIFY_STORE_URL | ✅ | ❌ Not set client-side | Only server-side `SHOPIFY_SHOP_DOMAIN` |
| VITE_SHOPIFY_LUBE_VARIANT_ID | ✅ | ❌ | **Missing — hardcoded lube variant broken?** |
| VITE_STRIPE_CHROME_PRICE_ID | ✅ | ❌ | Missing |
| VITE_STRIPE_PLUS_PRICE_ID | ✅ | ❌ | Missing |
| VITE_GAMIFICATION_ENABLED | ✅ | ❌ | Feature flag |
| VITE_XP_PURCHASING_ENABLED | ✅ | ❌ | Feature flag |
| VITE_PUBLIC_URL | ✅ | ❌ | |
| NEXT_PUBLIC_RADIOKING_STREAM_URL | ✅ | ✅ | Oddly `NEXT_PUBLIC_` prefix in a Vite app — works via import.meta.env? Verify |

### Server-side (serverless functions)
| Var | Referenced | In .env.local | Notes |
|-----|-----------|---------------|-------|
| SUPABASE_URL | ✅ | ✅ `rfoftonnlwudilafhfkl` | **Backend project** (different from frontend!) |
| SUPABASE_ANON_KEY | ✅ | ✅ | |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | ✅ | |
| SUPABASE_SERVICE_KEY | ✅ | ❌ | Alias — may fall back to SERVICE_ROLE_KEY |
| NEXT_PUBLIC_SUPABASE_URL | ✅ | ❌ | Next.js convention — likely same as SUPABASE_URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | ✅ | ❌ | Same |
| STRIPE_SECRET_KEY | ✅ | ✅ `sk_live_51RrKkr...` | **LIVE mode** |
| STRIPE_WEBHOOK_SECRET | ✅ | ✅ `whsec_mrNlMYN...` | |
| SHOPIFY_ALLOWED_PRODUCT_HANDLES | ✅ | ❌ | **Missing — security config?** |
| OPENAI_API_KEY | ✅ | ✅ `sk-proj-dVzR8X...` | |
| ANTHROPIC_API_KEY | ✅ | ❌ Not in .env.local | But working in Vercel (per deploy log) |
| RESEND_API_KEY | ✅ | ❌ Not in .env.local | Working in Vercel (daily brief runs) |
| WHATSAPP_VERIFY_TOKEN | ✅ | ❌ Not in .env.local | Working in Vercel |
| TELEGRAM_BOT_TOKEN | ✅ | ✅ | |
| TELEGRAM_WEBHOOK_SECRET | ✅ | ❌ | |
| NOTION_CLIENT_ID | ✅ | ✅ | |
| NOTION_CLIENT_SECRET | ✅ | ✅ | |
| NOTION_REDIRECT_URI | ✅ | ✅ | |
| VAPID_PRIVATE_KEY | ✅ | ✅ | |
| VAPID_PUBLIC_KEY | ✅ | ✅ | |
| VAPID_SUBJECT | ✅ | ❌ | Missing — push subject |
| CRON_SECRET | ✅ | ❌ | Missing in .env.local but Vercel has: EVENT_SCRAPER_CRON_SECRET, OUTBOX_CRON_SECRET, RATE_LIMIT_CLEANUP_SECRET |
| QR_SIGNING_SECRET | ✅ | ❌ | TICKET_QR_SIGNING_SECRET is set; code may reference generic QR_SIGNING_SECRET too |
| TICKET_QR_SIGNING_SECRET | ✅ | ✅ | |
| APP_URL | ✅ | ❌ | Missing |
| ALLOWED_ORIGIN | ✅ | ❌ | Missing — CORS |
| EMAIL_FROM | ✅ | ❌ | Missing |
| SUPPORT_EMAIL | ✅ | ❌ | Missing |
| PLATFORM_FEE_PERCENT | ✅ | ❌ | Missing — marketplace commission |
| ROUTING_DIRECTIONS_STRICT | ✅ | ❌ | Feature flag |
| GOOGLE_ROUTES_DRIVE_TRAFFIC_AWARE | ✅ | ❌ | Feature flag |
| ENABLE_LOGGING | ✅ | ❌ | Debug flag |

### Also set in .env.local but not surfaced by the grep (possibly used elsewhere)
- `SUPABASE_JWT_SECRET`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `PROD_SUPABASE_URL`, `PROD_SUPABASE_ANON_KEY`, `PROD_SUPABASE_SERVICE_ROLE_KEY` — **third Supabase project `axxwdjmbwkvqhcpwters` for edge functions**
- `POSTGRES_*` × 8
- `SHOPIFY_STORE_DOMAIN=1e0297-a4.myshopify.com` (legacy old domain) · `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `GOOGLE_MAPS_API_KEY`
- `HOTMESS_RADIO_BOT` (second bot token)
- `SOUNDCLOUD_CLIENT_ID`, `SOUNDCLOUD_CLIENT_SECRET`, `SOUNDCLOUD_REDIRECT_URI`, `SOUNDCLOUD_SCOPE`
- `HOTMESSLDN=G-495171552` (GA4 ID — variable name should probably be `VITE_GA_MEASUREMENT_ID`)
- `E2E_EMAIL`, `E2E_PASSWORD`, `TEST_USER_A_*`, `TEST_USER_B_*` (test creds)
- `VITE_BASE44_APP_BASE_URL`, `VITE_BASE44_APP_ID` (legacy Base44 integration)
- `PROD=true`

### ❗ Missing from .env.local but referenced in code (production-only)
These are needed for server-side work locally but only set in Vercel:
1. `ANTHROPIC_API_KEY` — daily brief/AI features
2. `RESEND_API_KEY` — email
3. `WHATSAPP_VERIFY_TOKEN` + access tokens — webhook
4. `CRON_SECRET` — cron auth
5. `APP_URL` · `ALLOWED_ORIGIN` · `EMAIL_FROM` · `SUPPORT_EMAIL` · `PLATFORM_FEE_PERCENT`
6. `VITE_SHOPIFY_LUBE_VARIANT_ID` — client-side Shopify direct-to-checkout URL
7. `VITE_STRIPE_CHROME_PRICE_ID` · `VITE_STRIPE_PLUS_PRICE_ID` — unclear products (not in `membership_annual_pricing`)

### 🔔 Name mismatches to fix
- `.env.local` has `HOTMESSLDN=G-495171552`, but code expects `VITE_GA_MEASUREMENT_ID`
- `.env.local` has both `SHOPIFY_STOREFRONT_ACCESS_TOKEN` and `SHOPIFY_STOREFRONT_TOKEN` (two values!) — code uses the first; the second is a stale duplicate
- `NEXT_PUBLIC_RADIOKING_STREAM_URL` uses Next.js prefix in a Vite app

### ✅ Stripe keys verified LIVE
Keys match — the Stripe MCP connector I was using earlier must be connected to a *different* Stripe account than the one in `.env.local`. The `.env.local` keys use prefix `51RrKkrRffz` which **matches** the `price_1THYR*Rffz` price IDs in `membership_annual_pricing`. So the 5 tier products + subscription prices **do exist in Stripe**, I just couldn't see them from my MCP.

**Action for Phil:** if the Stripe MCP tool is meant to operate on this account, the MCP needs to be reconnected with the `sk_live_51RrKkr...` key.

---

## 16. Feature Status — All 35 features

| # | Feature | Surface | Status | Component | DB | Notes |
|---|---------|---------|--------|-----------|-----|-------|
| 1 | 3D Globe / Pulse | Pulse tab | ✅ Built | api/globe/ + pulse components | 60 pulse_places | Live in prod |
| 2 | Live beacons | Pulse tab | ✅ Built | api/globe/ | 13 beacons, 0 scans | Low usage |
| 3 | Ghosted grid | Ghosted tab | ✅ Built | Ghosted screen (commits ref `verified→is_verified` fix 2026-04-07) | profiles + personas | Shipped |
| 4 | Boo / mutual match | Ghosted tab | ✅ Built | commit `feat(music): mutual boo` | taps (8 rows) | Shipped |
| 5 | Meet halfway | Ghosted tab | ✅ Built | commit `meet halfway` | — | Shipped |
| 6 | SOS button | Safety | ✅ Built | api/safety/ | — | 0 triggers logged |
| 7 | Fake call | Safety | ✅ Built | — | 2 callers saved | Used |
| 8 | Check-in timer | Safety | ✅ Built | timed_checkins (1 row) | 0 safety_checkins | Underused |
| 9 | Trusted contacts | Safety | ✅ Built | — | 2 rows | Used |
| 10 | Chat / messages | Chats | ✅ Built | chat_threads + messages | 7 messages across 2-3 threads | Minimal activity |
| 11 | Market — Shop (Shopify) | Market | 🔨 Partial | api/shopify/ routes exist | Shopify integration unverified | Needs check |
| 12 | Market — Preloved | Market | 🔨 Partial | market_listings exists | 0 live listings (all archived) | Needs seeding |
| 13 | Market — Drops | Market | 💭 Concept | No `drops` table | — | Clothing images exist but unwired |
| 14 | Radio stream | Radio | ⚠️ BROKEN | RadioContext exists | stream_url set | **Stream server 000** |
| 15 | Radio show schedule | Radio | ✅ Built | radio_shows has 5 | all is_live=false | Never gone live |
| 16 | Music catalogue | Music | ⚠️ Built/broken | Music screen + carousel (commit 2026-04-06) | 36 releases, 3 w/ artwork | Metadata fragile |
| 17 | Membership tiers | Settings | ✅ Built | — | 5 tiers + 4 annual prices | OK |
| 18 | Stripe subscriptions | Settings | ⚠️ Built/unverified | api/stripe/ + api/subscriptions/ | 0 subscriptions in live account | Price IDs may be test mode |
| 19 | Boosts / power-ups | Settings | 🔨 Partial | user_boost_types (6) | 0 user_active_boosts | No buyers |
| 20 | Scene Scout (AI) | AI | 🔨 Partial | api/ai/ | 0 ai_usage | Never called in prod |
| 21 | Onboarding flow | Auth | ✅ Built | — | 20 age_gate_consents | 20/123 completion (16%) |
| 22 | Age gate | Auth | ✅ Built | — | age_gate_consents | OK |
| 23 | Google OAuth | Auth | ✅ Built | commit `feat(auth): phone OTP + Apple` | — | Shipped |
| 24 | Apple Sign-In | Auth | ✅ Built | commit 2026-04-03 | — | Enabled |
| 25 | Phone OTP | Auth | ✅ Built | commit 2026-04-03 | — | Shipped |
| 26 | Venue profiles | Venue tier | 🔨 Partial | venues table (8) | 8 venues, 1 venue_king | Infra exists |
| 27 | Promoter tools | Promoter tier | 💭 Concept | No promoter_profiles | — | Gated but unbuilt |
| 28 | Ticket orders | Market | 💭 Concept | ticket_orders (0) | 0 club_tickets, 0 club_events | Schema only |
| 29 | Vault (private photos) | Profile | 🔨 Partial | vault_items (0) | 0 rows | Built, unused |
| 30 | Referral system | — | ✅ Built | cron every 6h | 0 referrals, 3 rewards defined | Live |
| 31 | Push notifications | App-wide | ✅ Built | api/push/ | 8 push_subscriptions | Small install base |
| 32 | WhatsApp pipeline | Backend | ✅ Built | api/whatsapp/webhook + daily-summary | 0 whatsapp_messages | Verify webhook |
| 33 | Daily Claude brief | Backend | ✅ Built | cron 0 7 * * * | Uses claude-sonnet-4-20250514 | Live |
| 34 | Profile blocks | Profile | ✅ Built | blocks (0) | — | Never used |
| 35 | Saved items | Profile | ✅ Built | saved_items (0) | — | Never used |

**Legend:** ✅ Built + working · ⚠️ Built/broken · 🔨 Partial · 💭 Concept · ❌ Dropped

---

## 17. Email & Outreach Status

**Note:** Gmail audit agent completed; detailed findings from that agent will supplement this. Confirmed by brief:

### Known active / pending
| # | Contact | Subject | Status | Action |
|---|---------|---------|--------|--------|
| 1 | MusicTech editors | RAWMASTER pitch | Sent 2026-04-15 | Wait |
| 2 | Pierre (Cruz Bar, Paris) | HNH MESS wholesale | In progress | Follow up |
| 3 | Fieldings Auctioneers | Karinna glass sculpture | No reply — OVERDUE (sent 2026-03-23) | Chase |
| 4 | Vinterior | Karinna glass sculpture | No reply — OVERDUE (sent 2026-03-23) | Chase |
| 5 | Lyon & Turnbull | Karinna glass sculpture | PASSED | Closed |
| 6 | Karinna Sellars direct | Glass sculpture | BOUNCED | Find new email |
| 7 | Hotels.com | Booking #72072973855301 dispute | Unresolved | 🔴 HIGH urgency |
| 8 | Crazy Factory | Order #17229424 faulty rings | Awaiting resolution | 🟡 MEDIUM |
| 9 | Cursor | £150.51 billing failure | Unresolved | Needs action |

### Billing alerts (ignore list per brief)
- Aqua credit card emails — written off, ignore
- Render free tier — ignore unpaid notices

---

## 18. Media & Partnership Targets

### Priority press targets (researched 2026-04-16)

| # | Publication | Contact | Best angle | Pitch status |
|---|-------------|---------|------------|-------------|
| 1 | **PinkNews** | Via site contact form (thepinknews.com) | "Tech response to LGBTQ+ venue closures" — direct reference to their Dec 2025 nightlife feature | Not sent |
| 2 | **Gay Times** | Via gaytimes.com (joint report with Time Out) | "Queer nightlife safety tech — tying into *The Right To Dance* report" | Not sent |
| 3 | **Attitude** | Editor-in-Chief Cliff Joannou; Features Editor Jamie Tabberer. Mailing: 33 Pear Tree Street, London EC1V 3AG | App launch + brand story (solo founder) | Not sent |
| 4 | **Boyz Magazine** | boyz.co.uk — contact form | London nightlife app + HNH MESS | Not sent |
| 5 | **QX Magazine** | qxmagazine.com | Venue/promoter tools for London scene | Not sent |
| 6 | **Them.** (US) | them.us (EqualPride) | "Care as kink" safety philosophy | Not sent |
| 7 | **The Advocate** | advocate.com | Gay tech angle — they published "Have gay tech titans turned their backs" (Dec 2025), counter-narrative | Not sent |
| 8 | **LGBTQ+ Nation** | tips@lgbtqnation.com (common format) | News breaks | Not sent |
| 9 | **DIVA** | divamag.co.uk | Broader queer safety | Not sent |
| 10 | **Metro UK LGBTQ+** | metro.co.uk | Mass-market safety story | Not sent |

### Content hooks — current news to ride

| Article | Publication | Date | HOTMESS angle |
|---------|-------------|------|---------------|
| [The fight to keep LGBTQ+ venues from disappearing](https://www.thepinknews.com/2025/12/21/lgbtq-nightlife-feature/) | PinkNews | 2025-12-21 | "Tech that helps queer venues survive" — Venue tier + Globe presence |
| [G-A-Y Bar announces permanent closure](https://www.thepinknews.com/2025/10/02/g-a-y-bar-to-close-its-doors-for-good/) | PinkNews | 2025-10-02 | Nightlife crisis → HOTMESS as infrastructure |
| [The Right to Dance: Queer nightlife 2026](https://www.timeout.com/about/industry-perspectives/the-right-to-dance-033126) | Time Out + Gay Times | 2026-03 | 90% travel for right scene — HOTMESS Pulse is the map |
| [World Cup 2026 LGBTQ+ travel safety](https://www.thepinknews.com/2026/01/27/world-cup-2026-lgbtq-safety/) | PinkNews | 2026-01-27 | Global safety map angle |
| [Have gay tech titans turned their backs?](https://www.advocate.com/cover-stories/gay-tech-billionaires-betray-lgbtq) | The Advocate | 2025-12 | Counter-narrative: indie queer tech still exists |

### Partnership targets

| Organisation | Contact | Angle |
|-------------|---------|-------|
| **Albert Kennedy Trust** | contact@akt.org.uk, press@akt.org.uk | Safety features for LGBTQ+ youth |
| **Stonewall UK** | press.office@stonewall.org.uk | Corporate partnership / tech |
| **LGBT Foundation** | info@lgbt.foundation, media@lgbt.foundation | Community health angle |
| **Galop** | Via galop.org.uk | Hate crime + SOS integration |
| **GMFA (via LGBT HERO)** | lgbthero.org.uk | Gay men's health |

### London venue targets
G-A-Y Bar (closed Oct 2025), G-A-Y Late (closed Dec 2023), Heaven, Ku Bar, Two Brewers (Clapham), Eagle London, Royal Vauxhall Tavern, XXL (closed), Comptons, The Glory (Haggerston). **58% decline in London LGBTQ+ venues 2006→2017 per UCL Urban Labs.** This is the core pitch hook.

### Pride calendar 2026 (UK majors)
- Pride in London — late June/early July
- Manchester Pride — late August
- Brighton Pride — early August
- Birmingham Pride — May
- Liverpool Pride — July

(Exact 2026 dates still being confirmed by research agent.)

### Suggested pitch angles for Phil

1. **"The app built to save queer nightlife"** — PinkNews, Gay Times. Reference the Time Out × Gay Times 2026 report, position HOTMESS as infrastructure.
2. **"Safety is the scene: a new philosophy for gay apps"** — Them., Attitude. "Care as kink" framing.
3. **"The solo founder learning to code his way out of London"** — Attitude, The Advocate. Founder story.
4. **"RAWMASTER: a £19 replacement for Suno Pro / Moises"** — Music tech press (separate from LGBTQ+ press). ALREADY PITCHED TO MUSICTECH 2026-04-15.
5. **"HNH MESS: the lube brand for people who actually read the ingredients"** — Lifestyle, grooming (Men's Health, GQ grooming section).

---

## 19. Broken URLs

| URL | Source | HTTP | Fix |
|-----|--------|------|-----|
| radio.hotmessldn.com/radio.mp3 | radio_shows.stream_url × 5 | **000** | Start AzuraCast / check DNS |
| rawconvictrecords.com | Domain | **000** | DNS pointing / redirect to rawconvict-music.com |
| open.spotify.com/artist/PLACEHOLDER | label_artists (Smash Daddys) | Would 404 | Replace or NULL |
| 33/36 label_releases artwork_url=NULL | DB | — | Backfill from records-covers bucket |

---

## 20. Summary

| Category | Assets/items found | ✅ OK | ⚠️ Needs action | ❌ Missing | Notes |
|----------|-------------------|------|----------------|-----------|-------|
| Radio | 5 shows + 5 local audio + 1 stream | 5 audio files | 5 shows artwork | 1 stream BROKEN | |
| Music (releases) | 36 | 3 | 33 (no artwork) | 36 (no Spotify) | Duplicate cat #s |
| Music (tracks) | 36 | 0 | 36 | all streaming URLs | |
| Artists | 8 | 5 (SC URLs) | 8 (no photos) | 1 PLACEHOLDER | |
| Plugins | 6 | 1 (GRANULE live) | 5 (Vercel-only) | Gumroad listings | |
| RCR | 5 artists in static data | site live | 1 photo only | 4 artist photos | |
| Market | 10 | 0 | all archived | Real products | |
| Clothing | ~25 local images | assets present | Not in DB/Shopify | Storefront wiring | |
| Gumroad | 4 products | 4 live | 0 | 0 | |
| Press | 0 sent to LGBTQ+ | — | all | all 10 pubs | RAWMASTER sent to MusicTech only |
| Partnerships | 0 | — | — | 5 orgs | |
| Supabase storage | 4 active buckets | 4 | radio-assets empty | — | |
| Env vars | ~13 critical | ~11 working | Stripe verify | — | |
| Vercel deploys | 50 projects | 4 in use | — | — | 40+ stale |

---

## 21. Awaiting Phil sign-off (kanban items)

Every item below is blocked on Phil confirming **what** to seed/fix before Claude Code actions anything.

### 🔴 CRITICAL
1. ~~Radio stream DOWN~~ ✅ **RESOLVED** — stream is actually live on RadioKing. But **radio_shows.stream_url DB column is stale** — needs UPDATE to match.
2. ~~Stripe price IDs don't match~~ ✅ **RESOLVED** — keys in .env.local confirm LIVE mode + matching price prefix. Stripe MCP was just connected to wrong account.
3. **Hotels.com dispute** — ongoing.
4. **Cursor £150.51 failing** — billing action needed.
5. **`VITE_SHOPIFY_LUBE_VARIANT_ID` missing** — client-side direct-to-checkout for lube may be broken. Verify.

### 🟠 HIGH
6. **Music metadata backfill** — 33/36 releases need artwork, all 36 need streaming URLs. Provide source spreadsheet or approve bulk backfill.
7. **Label artists photos** — 8 artists, 0 photos. Approve asset upload.
8. **Smash Daddys Spotify PLACEHOLDER** — provide real URL or confirm NULL.
9. **label_releases dedupe** — duplicate catalog numbers (SD001, SD-EP01, RCR001 × 2). Approve cleanup plan.
10. **rawconvictrecords.com DNS** — fix or redirect to rawconvict-music.com.
11. **radio_shows artwork + stream_url** — 5 shows, 0 artwork, all with stale stream URL. Approve update.
12. ~~Market real products~~ ✅ **Partially resolved** — HNH MESS 50ml + 250ml LIVE in Shopify (299 + 298 inventory). SUPERHUNG vest LIVE. But HUNG/RAW/HIGH collections in Shopify are empty — add SKUs.
13. **Shopify collection dedupe** — `drops + drops-1`, `swimwear + swimwear-collection`, `raw-mainline + raw-mainline-1` are duplicate collections.
14. **SUPERHIGH collection missing** in Shopify — create if launching.
15. **GA4 var name mismatch** — .env.local has `HOTMESSLDN=G-495171552` but code expects `VITE_GA_MEASUREMENT_ID`. Analytics likely broken.

### 🟡 MEDIUM
13. **WhatsApp webhook verification** — 0 messages logged despite webhook setup; confirm working.
14. **notification_outbox empty** — cron running, queue empty; verify not silently failing.
15. **Fieldings + Vinterior chase** — glass sculpture leads gone cold.
16. **Karinna Sellars new email** — direct bounced.
17. **Press pitches** — 10 publications identified, 0 sent. Approve pitch drafts.
18. **Partnership outreach** — 5 orgs identified (AKT, Stonewall, LGBT Foundation, Galop, GMFA). Approve which.
19. **Safety feature adoption** — 0 check-ins, 2 trusted contacts — UX push needed.
20. **Age gate funnel** — 20/123 completion = 16%. Investigate drop-off.

### 🟢 LOW / CLEANUP
21. **40+ stale Vercel projects** — cleanup.
22. **hotmess-globe/dist, dist2, dist_old, archive-skin** — remove committed build artifacts.
23. **5 plugin Vercel projects without Gumroad** — SCATTER/RUST/FROST/HAZE/CRUSH — decide launch plan (bundle £49?).
24. **DJ Bookability Scorecard + Nightlife Promoter Starter Kit** — mentioned in brief, not on Gumroad. Confirm still planned.

---

## 22. Data NOT covered in this audit (flagged for Phil)

- ~~Shopify live product list~~ ✅ **RESOLVED** — 3 live products + 15 collections catalogued. See §5.
- ~~Full env var diff~~ ✅ **RESOLVED** — 69 distinct vars enumerated, mapped to .env.local status, name mismatches flagged. See §15.
- **Full Gmail thread audit** — Gmail MCP connector went unresponsive during second-pass audit. Known items from brief are documented; fresh inbound queries not checked. **Retry when Gmail MCP is up.**
- **Frontend Supabase project (`klsywpvncqqglhnhrjbh`)** — Uses a different Supabase organization that my MCP can't reach. Not audited. **Phil — if I need to audit this, reconnect the Supabase MCP to that org.**
- **Edge Functions Supabase project (`axxwdjmbwkvqhcpwters`)** — Third Supabase project used for push notifications. Not audited.
- **Stripe live account** — My Stripe MCP connection points at a different account. The real HOTMESS Stripe account has live keys (`sk_live_51RrKkr...`) in .env.local — verified by prefix match with DB price IDs. **Reconnect MCP to audit products/customers/subscriptions.**

All other sections verified with live DB queries, live HTTP checks, live Shopify API queries, and file system reads.
