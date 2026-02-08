# HOTMESS London OS — System Manual

**Purpose:** Single implementer contract: how the London OS actually works. Use this for onboarding and wiring; for full spec and product overview see the linked docs.

**See also:** [HOTMESS-LONDON-OS-REMAP-MASTER.md](HOTMESS-LONDON-OS-REMAP-MASTER.md) (full spec), [PLATFORM-OVERVIEW.md](PLATFORM-OVERVIEW.md) (product overview).

---

## 1. Layer contract

UI is organised in **layers**. Z-order and responsibilities:

| Layer | Description | Where it lives today |
|-------|-------------|------------------------|
| **L0** | Globe (persistent 3D canvas) | Home route; [GlobeHero](src/components/globe/GlobeHero.jsx), BeaconMesh. |
| **L1** | System HUD | ConvictPlayer (bottom), SafetyFAB, NavigationOrb, CityPulseBar / Wetter Watch ticker. |
| **L2** | Contextual sheets/drawers | Profile (Bento), Ghosted stack, Shopify store, P2P Vault, Event detail. **Vault** is currently a full-page L2-style view at `/vault`. |
| **L3** | Overlays / toasts | Sonner toasts, match alerts, XP level-up, safety alerts. |

Target remap: Globe never unmounts in “London OS” mode; navigation is modality (which sheet is open) as well as route. Current app still uses full-page routes for many pillars; Vault and some sheets use L2-style styling.

---

## 2. Identity and Telegram

- **Current user:** `base44.auth.me()` returns the logged-in user (e.g. `{ id, auth_user_id, email, ... }`). Use **`currentUser?.auth_user_id ?? currentUser?.id`** as the canonical user id for promoter/owner (e.g. beacons, Vault).
- **Telegram:** Login is via the **Telegram Login Widget** (client-side). **tg-auth** (HMAC validation of Telegram `auth_data`) is **server-side** — e.g. Supabase Edge Function — and is **not in this repo yet**. See REMAP-MASTER §9 for spec.
- **Username:** From Telegram handle or a unique @hotmess handle; required for social/Globe.

---

## 3. Geo and beacons

- **Source:** Beacons come from **Supabase Realtime** on the `Beacon` table (capital B). No PostGIS `location` in current inserts; use **lat/lng columns** only.
- **Hooks:**  
  - `useGlobeBeacons` — Realtime list for Globe; `getBeaconColorForKind(kind)`.  
  - `useRightNowBeacon` — Toggle; insert/delete Lime beacon (social).  
  - `useP2PListingBeacon` — Insert/delete Gold beacon for P2P listings (SellerDashboard).
- **Kinds and colours:** social → **Lime** (#39FF14), event → **Cyan** (#00D9FF), marketplace → **Gold** (#FFD700), radio → Purple (#B026FF). See [useGlobeBeacons](src/hooks/useGlobeBeacons.js) and REMAP-MASTER §6.

---

## 4. Vault aggregation

- **Hook:** [useUnifiedVault.js](src/hooks/useUnifiedVault.js). Takes `user`; aggregates:
  - **P2P buyer orders** — base44 Order (Supabase).
  - **User beacons** — Supabase `Beacon` where `promoter_id` = user’s `auth_user_id` or `id`.
  - **Shopify** — stub (empty array + TODO); real Shopify customer orders would need API or webhook.
- Returns `inventory`, `beacons`, `stats`, `isLoading`, `error`, `refetch`. Page: [Vault.jsx](src/pages/Vault.jsx) at `/vault`.

---

## 5. Event bus

- **WORLD_PULSE:** Custom event for Globe ripples. Payload: `{ type, color, lat?, lng? }` (e.g. `type: 'GOLD_DROP'`, `color: '#FFD700'`). Emit after P2P listing create; optional for other actions.
- **Consumer:** [GlobeHero.jsx](src/components/globe/GlobeHero.jsx) — listens for `WORLD_PULSE`, pushes ripple into `worldPulseRipplesRef`, draws expanding rings on canvas (~1.5s), then removes. Default coords London (51.5, -0.12) if not provided.
- **Future:** BPM/metadata from Radio → Globe shaders (optional); same GlobeContext/emitPulse path.

---

## 6. Maintenance

- **Env:** Remap env vars in REMAP-MASTER §14 and [START_HERE.md](../START_HERE.md) (Remap / London OS section). Required for Globe/auth: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. If unset, app runs with a Supabase stub (no real DB/Realtime).
- **Migrations:** Supabase migrations in `supabase/migrations/`; apply via Supabase CLI or dashboard.
- **Route hygiene:** REMAP-MASTER §15 — avoid duplicate route entries in [App.jsx](src/App.jsx); consider single `routeConfig` when refactoring.

---

*Last updated: 2026-02-08. For architecture, wire-flows, and checklist see REMAP-MASTER.*
