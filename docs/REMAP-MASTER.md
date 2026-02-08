# HOTMESS London OS — Master Remap & Wire-Flow

**Version:** REMAP-MASTER v1.0  
**Date:** 2026-02-08  
**Status:** Developer-ready spec (single source of truth for remap)

---

## Changelog

| Version | Date       | Change |
|---------|------------|--------|
| v1.0    | 2026-02-08 | Initial master remap: architecture, HUD layers, 19 Parts, flows, Pulse contract, schema, checklist, Mermaid diagrams. |

---

## Table of Contents

1. [Executive summary](#1-executive-summary)
2. [System architecture](#2-system-architecture)
3. [Navigation and HUD remap](#3-navigation-and-hud-remap)
4. [Current app ↔ 19 Parts mapping](#4-current-app--19-parts-mapping)
5. [End-to-end user flows](#5-end-to-end-user-flows)
6. [Data and component wire-flow](#6-data-and-component-wire-flow)
7. [Database schema (Supabase)](#7-database-schema-supabase)
8. [Component hierarchy (Figma-style spec)](#8-component-hierarchy-figma-style-spec)
9. [Telegram and identity](#9-telegram-and-identity)
10. [Dual marketplace](#10-dual-marketplace)
11. [Improvements and additions](#11-improvements-and-additions)
12. [Implementation checklist](#12-implementation-checklist)
13. [Visual diagrams (Mermaid)](#13-visual-diagrams-mermaid)
14. [Remap environment variables](#14-remap-environment-variables)
15. [Codebase hygiene (for implementers)](#15-codebase-hygiene-for-implementers)

---

## 1. Executive summary

### Vision

Move from a **website with pages** to a **Spatial OS**:

- **Globe** = desktop (always-on background).
- **Radio** = background task (persistent player).
- **Ghosted / Market / Events** = applications (L2 sheets over the Globe).

Every user action that affects the world (Right Now, RSVP, match, sale, panic) triggers a **Globe pulse** where applicable.

### Current state

- **Scope:** 12 original features (Live Radio, Shows, Schedule, Releases, Artists, Playlists, Countdown, Wetter Watch, Submit Release, Social, Events, Commerce), 19 Parts, ~105 routes, 326 components.
- **Stack:** React 18 + Vite, Tailwind, Framer Motion, TanStack Query, Zustand, Supabase, Shopify Storefront API, Mapbox, Three.js / React Three Fiber.

### Remap outcome

- **Single "London OS" loop:** Globe as L0; HUD L1–L3; all pillar content as overlays/sheets where possible.
- **One data path to the Globe:** `GlobeContext.emitPulse` + Supabase Realtime on `beacons`.
- **4 Nav Pillars:** THE PULSE, THE VAULT, THE CELL, THE MARKET.

---

## 2. System architecture

### Headless triad

| Layer | Technology | Role |
|-------|------------|------|
| **Spatial engine** | Three.js / React Three Fiber + Mapbox GL | Existing Globe (L0); 3D canvas and beacon rendering. |
| **Data / Auth** | Supabase | Auth (incl. Telegram), Postgres, Realtime, Storage. |
| **Official commerce** | Shopify Storefront API | Headless brand stores (HNH MESS, etc.). |
| **P2P marketplace** | Supabase schema (non-Shopify) | Creator/artist resale; Stripe Connect for payments. |
| **Notifications** | Telegram Bot | Globe-triggered alerts (match, sale, safety). |

---

## 3. Navigation and HUD remap

### Layer definitions

| Layer | Description | Key components |
|-------|-------------|----------------|
| **L0** | Globe (built) | Persistent 3D canvas; BeaconMesh from `beacons` + WorldPulseContext atmosphere. |
| **L1** | System HUD | ConvictPlayer (bottom), SafetyFAB, NavigationOrb, CityPulseBar / Wetter Watch ticker. |
| **L2** | Contextual sheets/drawers | Profile (Bento/Convict ID), Ghosted stack, Shopify store, P2P Vault, Event detail. |
| **L3** | Overlays / toasts | Match alerts, XP level-up, safety alerts, drop countdowns. |

### 4 Nav Pillars

| Pillar | Parts | User action |
|--------|-------|-------------|
| **THE PULSE** | 6, 11, 13, 17, 18 | Listen live, Wetter Watch, schedule, Pulse Calendar. |
| **THE VAULT** | 13, 14, 15 | Artists, releases, archive, community, submit release. |
| **THE CELL** | 1–3, 5, 8, 9 | Profile, onboarding, rewards, gamification, membership. |
| **THE MARKET** | 7, 10, 15 | Shop (Shopify + P2P), countdowns, tickets. |

### "Tonight" behaviour

- **Time window:** 20:00–06:00 local (configurable).
- **What changes:** Stronger Beacon emphasis, Safety FAB more prominent, Wetter Watch ticker default on.

### Max 3 levels rule

- **From Globe, user is never more than 2 taps from:** play, RSVP, message, or safety.

---

## 4. Beacon colours (single source of truth)

```js
const BEACON_COLOR = {
  social: '#39FF14',      // Lime — Right Now
  event: '#00D9FF',       // Cyan — events
  marketplace: '#FFD700', // Gold — P2P listings
  radio: '#B026FF',       // Purple — radio-related
};
```

---

## 5. Data and component wire-flow

### Pulse contract

- **All triggers** that affect the Globe call **`emitPulse({ type, coordinates, intensity })`** from GlobeContext.
- Event types: `TRACK_CHANGE`, `RIGHT_NOW`, `RSVP`, `MATCH`, `SALE`, `PANIC`, `NEW_BEACON`, `REMOVE_BEACON`.

### Feature → component → data → Globe trigger

| Feature / module | Component(s) | Data action | Globe trigger |
|-----------------|-------------|-------------|---------------|
| Radio | ConvictPlayer, RadioSchedule | — | TRACK_CHANGE → shader BPM |
| Right Now | Social, presence toggle | Supabase: beacons insert/delete (type: social) | Lime beacon at coords |
| Events RSVP | EventCard, BeaconDetail | Supabase: event_rsvp; beacons metadata | Beacon size/intensity |
| Ghosted match | GhostedStack, MatchBar | Supabase: message_thread | Optional connection line |
| Shopify purchase | ShopCart, Checkout | Shopify API | Optional "drop" beacon |
| P2P listing | Marketplace, CreatorsCart | Supabase: p2p_listings; beacons insert | Gold beacon at seller |
| Safety panic | SafetyFAB, PanicButton | Supabase: safety alert; location | Red overlay / admin beacon |

---

## 6. Dual marketplace

| Type | Entry | Data | Payments | Globe |
|------|-------|------|----------|-------|
| **Official (Shopify)** | `/market`, `/market/:collection`, `/market/p/:handle` | Shopify Storefront API | Shopify checkout | Optional "drop" beacons |
| **P2P (Supabase)** | `/market/creators`, `/market/creators/p/:id` | Supabase `p2p_listings` | Stripe Connect | Gold beacon at seller |

---

## 7. Implementation checklist

### Phase 1 — Globe alive ✅
- [x] Telegram Auth bridge + profile creation
- [x] Supabase Realtime subscription for `beacons`
- [x] Right Now toggle → beacons insert/delete → Lime beacon

### Phase 2 — Commerce and Vault ✅
- [x] Seller → Beacon wiring (create/delete P2P listing → Gold beacon)
- [x] Unified Vault component (`useUnifiedVault.js` + `/vault` page)
- [x] WORLD_PULSE event dispatch (`useP2PListingBeacon.js`)
- [x] Beacon colour consistency (single BEACON_COLOR source)

### Phase 3 — Sheets and nav
- [ ] Refactor nav: Globe as persistent shell
- [ ] L2 sheets for pillars

### Phase 4 — Safety and Part 19
- [ ] Safety FAB + emergency mode
- [ ] Telegram Bot webhook
- [ ] Part 19 AI Verification

---

## 8. Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/edge only |
| `VITE_TELEGRAM_BOT` | Telegram Login Widget |
| `SHOPIFY_STOREFRONT_TOKEN` | Shopify Storefront API |
| `SHOPIFY_STORE_DOMAIN` | Shopify store domain |
| `VITE_MAPBOX_TOKEN` | Mapbox GL |

---

**End of REMAP-MASTER v1.0**
