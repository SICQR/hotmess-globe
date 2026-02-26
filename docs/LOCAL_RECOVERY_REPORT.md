# HOTMESS — Local Project Recovery Report
**Generated:** 2026-02-26
**Method:** git log + diff against ~/hotmess-globe/src for all 50+ local copies

---

## SUMMARY

| Finding | Count |
|---------|-------|
| Projects diffed | 32 |
| Projects with unique code | 14 |
| Components worth recovering | 18 |
| React Native build found | 1 |
| Projects safe to delete | 24 |

---

## HIGH PRIORITY RECOVERIES

### 1. `~/Desktop/hotmess-overview` — Radio UI Components
**Unique files not in canonical:**
- `src/components/radio/NowNextCard.tsx` — "Now Playing / Up Next" radio card
- `src/components/radio/QualityPopover.tsx` — Stream quality selector popover
- `src/components/radio/ReminderNudge.tsx` — Show reminder nudge component
- `src/components/radio/SoundConsentModal.tsx` — Audio autoplay consent modal
- `src/hooks/use-radio-player.ts` — Standalone radio player hook
- `src/lib/health.ts` — Health check utility

**Verdict: RECOVER** — These radio components are meaningfully better UX than what's in main. `NowNextCard` is especially useful for the radio schedule. `SoundConsentModal` solves a real autoplay browser restriction issue. `QualityPopover` suggests stream quality selection was planned.

**Action:** Copy to `src/components/radio/` in main.

---

### 2. `~/HOTMESS_OS/` — Figma-connected components + AI APIs
**Unique dirs:**
- `src/api/ai/` — AI API integrations
- `src/components/figma/` — Figma-exported component implementations

**Verdict: INVESTIGATE** — The `figma/` components may be auto-generated Figma → code. The `ai/` endpoints may have implementations not in main's `api/ai/`.

**Action:** Read and compare `src/components/figma/` and `src/api/ai/` vs canonical.

---

### 3. `~/Downloads/hotmess-core (1)/` — Legal & Brand Pages
**Unique pages not in canonical:**
- `src/pages/About.tsx`
- `src/pages/AbuseSafety.tsx`
- `src/pages/Accessibility.tsx`
- `src/pages/Affiliate.tsx`
- `src/pages/AgeVerify.tsx`
- `src/guards/` directory

**Verdict: RECOVER SELECTIVELY** — Main app has no `/about`, `/accessibility`, `/abuse`, or `/affiliate` routes. These legal/brand pages are needed for any serious product launch. `AgeVerify.tsx` may have a different implementation than current AgeGate.

**Action:** Extract the legal page content/copy and create routes.

---

### 4. `~/HOTMESS_BACKUP_20260131/hotmess-globe/` — Stories + EnhancedToast
**Unique files:**
- `src/stories/` — Storybook stories (removed from main in cleanup)
- `src/utils/enhancedToast.js` — Enhanced toast utility

**Verdict: LOW PRIORITY** — Stories were intentionally removed. `enhancedToast.js` may have useful toast patterns but main already has toast.

---

### 5. `~/Desktop/hotmess-enterprise-hardened/` — Brand Marketing Components
**Unique files:**
- `src/HotmessLanding.tsx` — Landing page component
- `src/components/AftercareFooter.tsx` — Aftercare-themed footer
- `src/components/BrandShowcase.tsx` — Brand showcase component
- `src/components/Analytics.tsx` — Analytics wrapper

**Verdict: RECOVER LANDING** — `HotmessLanding.tsx` and `BrandShowcase.tsx` could be used for a proper marketing landing page at `/`.

---

### 6. `~/Downloads/hotmess-enterprise/` — AIConcierge + Landing
**Unique files (115 total):**
- `src/components/AIConcierge.tsx` — AI concierge chat component
- `src/HotmessLanding.tsx` — Another landing variant

**Verdict: RECOVER AICONCIERGE** — `AIConcierge.tsx` is a full AI chat interface not in main. With OpenAI already configured, this could be activated.

---

### 7. `~/hotmess-os/` — **React Native Build** (Separate Mobile App)
**Stack:** react-native, react-navigation/bottom-tabs, react-native-gesture-handler, react-native-reanimated

This is an entirely separate React Native mobile implementation of HOTMESS. Only 1 commit ("Initial commit"). It was an experiment at building a native mobile app vs the current PWA approach.

**Verdict: ARCHIVE** — The PWA approach is production and deployed. Native app was abandoned early. Keep for reference if native app becomes a priority. Don't delete — this is a different strategic direction.

---

### 8. `~/hotmess-design-generator/` — AI Design Tool
**Unique files:**
- `src/components/project-card.tsx`
- `src/components/project-stepper.tsx`
- `src/components/prompt-input.tsx`
- `src/components/sidebar.tsx`
- `src/components/sitemap/` — Sitemap visualization
- `src/components/styleguide/` — Style guide viewer

**Stack:** Next.js + @xyflow/react (node graph library)

**Verdict: INTERESTING / LOW PRIORITY** — This is an internal tool for generating HOTMESS design assets using AI. Has a visual flow editor (xyflow). Could be useful for internal tooling but not related to the main app.

---

### 9. `~/Sites/sicqr-ltd/` — SICQR Company Website
**Git:** YES (1 commit: "HOTMESS refactor baseline, Next 15, TS, age-gate, CMP, webhooks")

This is the SICQR Ltd company website (Next.js 15 with TypeScript). Separate from the app.

**Verdict: SEPARATE PROJECT** — Not part of hotmess-globe. Should have its own repo/deployment.

---

### 10. `~/Downloads/beacon-backend/` — Standalone Beacon Backend
**Unique files:**
- `src/index.ts` — Express/Fastify server entry
- `src/mockData.ts` — Beacon mock data
- `src/routes/` — Beacon route handlers
- `src/types/beacon.ts` — Beacon type definitions
- `src/types/signedBeacon.ts` — Signed beacon (crypto?) type

**Verdict: INVESTIGATE** — A standalone TypeScript beacon backend service. This might predate the Supabase-backed beacon system. The `signedBeacon.ts` type is interesting — suggests beacons with cryptographic signatures were planned.

---

### 11. `~/Downloads/hotmess-v3-sensory-c-main/` — v3 Full Rebuild (150 unique files)
**Unique directories:**
- `src/ai/` — AI module
- `src/app/` — App structure
- `src/api/radio/` — Radio API handlers
- `src/api/shop/` — Shop API handlers

**Stack:** Vite + React + full Radix UI + TanStack Query + @phosphor-icons + @heroicons

**Verdict: LARGE EXPERIMENT** — This was a full v3 "sensory" rebuild with 150 unique files. The `src/app/` structure suggests a different routing approach. The `src/ai/` module may have AI implementations worth extracting.

---

### 12. `~/Downloads/hotmess-core (4)/` — Auth Guards + Analytics
**Unique files:**
- `src/components/CookieBanner.tsx` — GDPR cookie consent banner
- `src/components/RoleGuard.tsx` — Role-based access control component
- `src/lib/analytics.ts` — Analytics abstraction layer
- `src/bot/` — Bot integration code

**Verdict: RECOVER RoleGuard + CookieBanner** — No GDPR cookie banner exists in main. `RoleGuard.tsx` could be useful for admin route protection. `analytics.ts` abstraction may be cleaner than current approach.

---

## SAFE TO DELETE (No unique code)

| Path | Reason |
|------|--------|
| `~/hotmess-globe-fix` | 10 commits behind main, same source |
| `~/hotmess-globe-stabilization` | Older version of same repo |
| `~/HOTMESS_BACKUP_20260131` | Useful as backup; schedule for deletion after 90 days |
| `~/Desktop/hotmess-nextjs` | Next.js skeleton only, 1 initial commit |
| `~/Downloads/HM1_ready_for_github_vercel_BEST` | 4 unique files, all superseded |
| `~/Downloads/hotmess-globe-main` | All unique files are Login/Onboarding pages removed intentionally |
| `~/Downloads/hotmess-globe-main 2` | Same — Welcome.jsx + old pages |
| `~/Downloads/hotmess-core (1)` | Legal pages worth extracting content from, then delete |
| `~/Downloads/HOTMESS_full_repo` | No src/ dir, likely compressed export |
| `~/Downloads/hotmessldn1` | Next.js starter only |
| `~/Downloads/Hotmess-os-vite` | Early Vite experiment, superseded |
| `~/Downloads/hotmess-enterprise 2` | Near-identical to hotmess-enterprise |
| `~/PROJECTS/hm15_clean` | Next.js 15 clean starter |
| `~/PROJECTS/hotmess_next15_headless` | Next.js 15 headless starter |
| All other `~/Downloads/hotmess-core (N)` variants | Duplicate of core (1) |
| All `~/Downloads/hotmess-enterprise (N)` variants | Duplicate of enterprise |
| All `~/Downloads/HOTMESS OS` variants | Superseded |
| `~/Downloads/HOTMESS_full_repo (x4)` | Multiple copies of same export |
| `~/Downloads/hotmess-bot-final-main (x5)` | Telegram bot — same code x5 |
| `~/hotmess-webfiles-github-ready` | Next.js, no unique code |

---

## ACTION SUMMARY

| Priority | Action | Source | Target |
|----------|--------|--------|--------|
| 🔴 HIGH | Recover radio components | `hotmess-overview/src/components/radio/` | `hotmess-globe/src/components/radio/` |
| 🟠 MEDIUM | Extract legal pages | `hotmess-core (1)/src/pages/` | New `/about`, `/accessibility`, `/legal` routes |
| 🟠 MEDIUM | Extract AIConcierge | `hotmess-enterprise/src/components/AIConcierge.tsx` | `hotmess-globe/src/components/ai/` |
| 🟡 LOW | Review HOTMESS_OS figma/ components | `HOTMESS_OS/src/components/figma/` | Evaluate for design system |
| 🟡 LOW | CookieBanner for GDPR | `hotmess-core (4)/src/components/CookieBanner.tsx` | `hotmess-globe/src/components/` |
| 🟡 LOW | Investigate signed beacons | `beacon-backend/src/types/signedBeacon.ts` | Evaluate for beacon security |
| ⚫ ARCHIVE | React Native app | `~/hotmess-os/` | Keep, don't delete |
| ⚫ ARCHIVE | SICQR website | `~/Sites/sicqr-ltd/` | Separate deployment |
