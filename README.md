# HOTMESS OS

> A queer social OS for nightlife discovery, connection, and commerce.

**Live:** https://hotmessldn.com
**Stack:** Vite + React + TypeScript + Tailwind + Supabase + Framer Motion + Three.js
**Deploy:** Vercel (push to `main` triggers production deploy)

---

## Quick Start

```bash
# Requires Node >= 20
npm install
cp .env.example .env.local   # fill in Supabase keys at minimum
npm run dev                   # http://localhost:5173
npm run dev -- --host         # LAN-accessible (mobile testing)
```

### Minimum `.env.local`

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

See `.env.example` for all variables. Production secrets live in Vercel dashboard.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (localhost) |
| `npm run dev:lan` | Dev server on LAN (0.0.0.0:5173) |
| `npm run build` | Production build |
| `npm run lint` | ESLint (quiet) |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | Vitest single run |
| `npm run test:e2e` | Playwright E2E (needs `npx playwright install` first) |
| `npm run verify` | lint + typecheck + test + build (CI gate) |

---

## Architecture

### 6-Mode OS with Bottom Nav

| Mode | Route | Description |
|------|-------|-------------|
| Home | `/` | 12-section dashboard (globe hero, feed, events, radio, market picks) |
| Pulse | `/pulse` | Three.js globe + events + beacon FAB |
| Ghosted | `/ghosted` | 3-col proximity grid, filters, taps/woofs |
| Market | `/market` | Shopify headless + preloved marketplace |
| Music | `/music` | Label releases, artists, tracks |
| More | `/more` | Hub: Safety, Care, Profile, Personas, Vault, Settings |

Additional routes: `/radio` (full player, mini player persists globally), `/profile`, `/safety`, `/care`.

### Project Structure

```
src/
  modes/          # Top-level mode components (HomeMode, PulseMode, etc.)
  components/     # Shared UI + 45+ sheet types (L2*Sheet.jsx)
  contexts/       # React contexts (SOS, BootGuard, Persona, Radio, Sheet, Auth)
  hooks/          # Custom hooks (useTaps, usePushNotifications, useLongPress)
  lib/            # Supabase client, sheet policy, utilities
  pages/          # Auth, onboarding, age gate, more hub, safety, care
  config/         # Brand config, feature flags
api/              # Vercel serverless functions (also served locally via vite.config.js)
public/           # PWA assets, hero images, audio
supabase/         # Migration SQL files
e2e/              # Playwright E2E tests
```

### Safety Systems (P0)

- **SOS** — long-press trigger, Z-200 overlay, stops location sharing, emergency contacts
- **Boot Guard** — state machine: Loading -> Auth -> Age -> Onboarding -> Community Gate -> Ready
- **Sheet Policy** — gates chat/video/travel sheets to appropriate contexts
- **PIN Lock** — optional app lock

### Sheet System

Open sheets with `openSheet(type, props)` from `useSheet()`. Stack is LIFO. Back button pops top sheet. URL syncs via `?sheet=<type>` for deep-linking.

### Data Layer

All data goes through Supabase directly:
```js
import { supabase } from '@/components/utils/supabaseClient';
```

Import alias `@/` maps to `src/`.

### Z-Index Layers

| Layer | Z | Contents |
|-------|---|----------|
| L0 | 0 | Globe (Three.js, `/pulse` only) |
| L1 | 50 | Bottom nav, radio mini player |
| L2 | 100 | Content sheets |
| L3 | 150 | Persona switcher, filters |
| Interrupts | 180-200 | Call banner, SOS button, SOS overlay |

---

## Design Tokens

| Token | Value |
|-------|-------|
| Primary gold | `#C8962C` |
| Root bg | `#050507` |
| Card bg | `#1C1C1E` |
| Nav bg | `#0D0D0D` |
| Text muted | `#8E8E93` |
| Danger | `#FF3B30` |
| Radio | `#00C2E0` |
| HUNG brand | `#C41230` |
| Nav height | `83px` |

Dark theme only. No light mode. Full spec in `DESIGN_SYSTEM.md`.

---

## Multi-Brand Ecosystem

| Brand | Type |
|-------|------|
| HOTMESS | Social OS (the app) |
| HNH MESS | Lube brand |
| RAW CONVICT RECORDS | Indie queer label |
| HOTMESS RADIO | 3 flagship shows |
| SMASH DADDYS | In-house production |
| RAW / HUNG / HIGH | Clothing sub-brands |
| SUPERHUNG / SUPERRAW | Limited drops |
| HUNGMESS | Editorial fashion |

Brands are isolated. Cross-promotion is editorial (human) only.

---

## Key Gotchas

- `beacons` is a **VIEW** — use `metadata` JSONB for title/description/address
- Use `owner_id` on beacons (not `user_id`), `starts_at`/`ends_at` (not `start_time`/`end_time`)
- Write to `right_now_status` TABLE (not `profiles.right_now_status`)
- XP system: DB columns kept, UI fully removed
- `base44Client.js` exists but has zero imports — dead code
- 13 AI feature stubs log `[TODO] LLM endpoint needed`

---

## Validation

Always run before pushing:

```bash
npm run lint && npm run typecheck && npm run build
```

Full details in `CLAUDE.md`.
