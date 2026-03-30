# HOTMESS London — Platform Overview

A simple guide to what the platform is, what it does, and what’s possible.

---

## What is it?

**HOTMESS London** is a **Spatial OS** for nightlife and culture in London: a single app where the **Globe** is the home screen, and everything else (radio, social, events, shopping, safety) lives as layers on top. It’s built to move from “a website with pages” to “a world you open: Globe as desktop, Radio as background task, and Social / Market / Events as apps over the Globe.”

- **Deployed on:** Vercel  
- **Stack:** React 18, Vite, Tailwind, Supabase (auth + DB + Realtime), Shopify Storefront API, Mapbox, Three.js / React Three Fiber  
- **Scope:** 12 main product areas, 19 “Parts” (feature modules), ~105 routes, 300+ components  

---

## Core idea: the Globe and layers

- **L0 — Globe:** Always-on 3D globe (London-focused). Beacons on the globe show who’s “Right Now,” where events are, and where P2P listings are.  
- **L1 — HUD:** System bar: radio player (bottom), safety FAB, nav orb, Wetter Watch ticker.  
- **L2 — Sheets:** Context panels over the Globe: profile, event detail, shop, P2P market, Ghosted stack.  
- **L3 — Overlays:** Toasts, match alerts, safety alerts, countdowns.  

User actions (Right Now, RSVP, match, sale, panic) can trigger a **pulse** on the Globe so the map feels alive.

---

## The four pillars (navigation)

| Pillar | What it is | Main features |
|--------|------------|----------------|
| **THE PULSE** | Live and schedule | Live radio, Wetter Watch ticker, schedule, Pulse Calendar (time scrub). |
| **THE VAULT** | Music and archive | Artists, releases, playlists, community, submit release. |
| **THE CELL** | You | Profile, onboarding, rewards, gamification, membership. |
| **THE MARKET** | Shop | Official brand store (Shopify) + creator P2P marketplace. |

From the Globe, the aim is **max 2 taps** to: play, RSVP, message, or safety.

---

## Features and possibilities (by area)

### Identity and access

- **Age gate** (18+).  
- **Auth:** Telegram as primary; email/password and magic link as fallback.  
- **Username:** From Telegram handle or a unique @hotmess handle (required for social/Globe).  
- **AI verification (planned):** Liveness selfie → verified badge and Cyan glow on your beacon.  

### Home and Globe

- **Home** is the Globe: 3D canvas with beacons (Lime = Right Now, Cyan = events, Gold = P2P).  
- Beacons come from Supabase Realtime; toggling “Right Now” adds/removes your Lime beacon.  
- “Tonight” mode (e.g. 20:00–06:00): stronger beacons, safety more prominent, Wetter Watch on by default.  

### Social (“Ghosted”)

- **Right Now:** Toggle on → your Lime beacon appears at your location for a set window (e.g. 4h).  
- **Discover:** See who’s Right Now; tap a beacon → mini-profile sheet.  
- **Match / Say Hi:** Start a thread; optional Telegram notification.  
- **Inbox:** Messages and threads.  
- **Profiles:** View others’ profiles; connection and presence on the Globe.  

### Events

- **Events list** and **event detail** (with RSVP).  
- **Beacons:** Events can show as Cyan beacons; RSVP can affect beacon size/intensity.  
- **Pulse Calendar (Part 18):** Time dimension — scrub timeline to filter beacons by time.  
- **Flow “From Ear to Floor”:** Radio plays a track → “Live Near You” if artist has an event → tap → zoom to venue → event sheet → RSVP.  

### Music and radio

- **Live radio:** Persistent player in the HUD (L1); stays on while you move around the app.  
- **Shows, schedule, episodes:** Browse and listen.  
- **Releases, artists, playlists:** Catalog and discovery.  
- **BPM/metadata (remap):** Can drive Globe shaders (e.g. pulse frequency).  

### Commerce (dual marketplace)

- **Official store (Shopify):** Brand shops (e.g. HNH MESS). Browse collections, product pages, cart, checkout.  
- **P2P (Creators):** Artist/creator resale; Supabase + Stripe Connect. Listings can create **Gold beacons** at seller location.  
- **Unified Vault (remap):** One place for “my orders” — Shopify orders + P2P purchases.  
- **Carts:** One flow for Shopify; separate flow for P2P (no mixed cart).  

### Safety

- **Safety FAB** in the HUD (L1).  
- **Panic:** Triggers emergency mode (red overlay); location to trusted contacts; admin/security see priority beacon.  
- **No full navigation away:** Dismiss returns you to the same view (Globe or sheet).  
- **Resources and reporting** via Safety hub.  

### Profile, rewards, membership

- **Profile:** Bento-style “Convict ID,” edit profile, settings.  
- **Gamification:** Challenges, XP, leaderboard.  
- **Membership:** Upgrade, billing, receipts; Stripe-backed.  

### Business and admin

- **Business dashboard** (`/biz`): Analytics, onboarding.  
- **Creator dashboard:** Listings, P2P sales.  
- **Admin:** City Signals (Globe pulse), Wetter Watch CMS, AI Verification dashboard, moderation (reports, content, users).  

### Extras and utility

- **Wetter Watch:** Live stats ticker (L1).  
- **Pre-launch countdown:** For drops and events.  
- **Directions:** Routing (e.g. to events/venues).  
- **Scan:** Check-in, redeem (tickets, etc.).  
- **Legal:** Privacy, terms, guidelines, contact.  
- **More:** Settings, stats, care, help, account (consents, export, delete).  

---

## Data and integrations (high level)

| System | Role |
|--------|------|
| **Supabase** | Auth (incl. Telegram), profiles, beacons, messages, event RSVPs, P2P listings, gamification, safety. |
| **Shopify** | Official product catalog, cart, checkout. |
| **Telegram** | Login widget; Bot for notifications (match, sale, safety). |
| **Mapbox** | Maps and routing. |
| **Stripe** | Membership, P2P payments (Connect). |

One data path to the Globe: **Supabase Realtime beacons** + **GlobeContext.emitPulse** for user-driven pulses (Right Now, RSVP, match, sale, panic). No duplicate “pulse” systems.

---

## Beacon colours (semantics)

| Colour | Hex | Meaning |
|--------|-----|--------|
| **Lime** | #39FF14 | Right Now (social presence). |
| **Cyan** | #00D9FF | Events. |
| **Gold** | #FFD700 | P2P marketplace listings. |
| **Purple** | #B026FF | Radio-related (optional). |

Verified users (after AI Verification) get a **Cyan glow** on their beacon.

---

## Current state vs remap

- **Already in app:** Globe with beacons, Telegram auth + username step, Right Now → Lime beacon, live radio, events, social (Ghosted, inbox), Shopify market, P2P creators market, safety, profile, membership, admin/biz tools, Wetter Watch, countdown, and the rest of the routes above.  
- **Remap (from REMAP-MASTER):** Globe as persistent shell; L2 sheets for Social/Event/Market instead of full-page navigations where possible; Safety as overlay; BPM → Globe shaders; Unified Vault; Pulse Calendar; “Tonight” and max-2-taps behaviour; AI Verification (Part 19) and Verified glow; single `routeConfig` and documented Remap env.  

The **Master Remap** doc (`HOTMESS-LONDON-OS-REMAP-MASTER.md`) is the single source of truth for architecture, wire-flows, schema, and implementation checklist.

---

## Who it’s for

- **Users:** Go out in London; discover events and people; listen to radio; buy official and P2P; stay safe.  
- **Creators/artists:** List P2P; get Gold beacons; sell via Stripe Connect.  
- **Businesses:** Run events; use admin/biz dashboards; manage Wetter Watch and City Signals.  
- **Developers:** One codebase (React/Vite), Supabase + Shopify + Telegram + Mapbox + Three.js; remap doc and this overview for orientation.

---

## Quick link summary

| Need | Doc or area |
|------|-------------|
| Full remap spec (architecture, flows, schema, checklist) | `docs/HOTMESS-LONDON-OS-REMAP-MASTER.md` |
| This high-level overview | `docs/PLATFORM-OVERVIEW.md` |
| Run the app locally | `npm run dev` (default: http://localhost:5173) |
| Wireframes by Part | `wireframes/WIREFRAMES-PART*.html` |

---

*Last updated: 2026-02-08. For implementation details and data wire-flows, see REMAP-MASTER.*
