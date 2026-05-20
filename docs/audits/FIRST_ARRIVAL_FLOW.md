# First-arrival flow + pre-send polish findings

**Date:** 2026-05-20 · **Context:** Dean + Richard founding sign-in. Investigation; risky timing fixes held (see why per task). Stack reminder: **hotmess-globe is Vite + React SPA — no Next.js SSR/hydration.**

## Task 5 — Where a new user actually lands

Traced `src/pages/auth/callback.jsx` + `src/contexts/BootGuardContext.jsx`.

- `auth/callback.jsx`: returning user (`onboarding_completed=true`) → `/pulse`; new/incomplete user → `/`; expired/bot link → `/` gracefully. Comment notes BootGuard does final routing from `/` regardless.
- `BootGuardContext` states: `UNAUTHENTICATED → NEEDS_AGE → NEEDS_ONBOARDING → NEEDS_COMMUNITY_GATE → READY`.
- **Dean + Richard are new users.** After magic-link sign-in they hit `/`, BootGuard sees `onboarding_completed=false` → `NEEDS_ONBOARDING` → the 8-step onboarding flow → `READY`. Their first *real* app surface after onboarding is **Home (`/`)**, not Pulse directly.

**First-arrival verdict:** the landing route is calm (Home feed) and onboarding is gated/self-explanatory. No P0 friction in the routing itself. The friction risk is the Pulse glitch (below) IF they tap Pulse early, and the consent double-prompt.

## Task 1 — Pulse first-arrival glitch (root-cause hypothesis; fix HELD)

`BootGuardContext` (lines 134–138) starts returning users **optimistically at `READY`** synchronously from a cached local session, then **asynchronously re-validates** and can `setBootState` again. On first arrival that state flip remounts the route subtree; combined with `UnifiedGlobe` (Three.js) initialising only on `/pulse`, the visible result is a "glitch + restart."

**Recommended fix (not applied):** in the async re-validation, guard `setBootState` so it only fires when the resolved state *differs* from the current state (avoid a redundant READY→READY re-render), and give the globe canvas an explicit loading state instead of a silent remount. **Held because:** this is auth/boot timing — a wrong change regresses sign-in for everyone. Must be verified in a real browser session before shipping, which I can't do from the sandbox. Not safe to blind-ship hours before the send.

## Task 2 — Duplicate consent prompt (root-cause hypothesis; fix HELD)

Four consent surfaces exist: `onboarding/screens/LocationConsentScreen.jsx`, `privacy/ConsentFlow.tsx`, `auth/ConsentForm.jsx`, `radio/SoundConsentModal.tsx`. The double-prompt on globe entry is most likely the onboarding `LocationConsentScreen` AND a runtime location-permission check firing on `/pulse` without coordinating on a single `location_consent` flag.

**Recommended fix (not applied):** consolidate to one gate keyed on `profiles.location_consent` / localStorage `location_consent`; the runtime check should no-op if onboarding already captured consent. **Held because:** confirming *which two* fire needs a render-tree trace in a live browser; consent logic touches a safety-adjacent permission and shouldn't be blind-edited pre-send.

## Task 3 — Market stale-render flash (root-cause hypothesis; fix HELD)

Not SSR/hydration (Vite SPA). The flash is most likely the lazy-loaded `MarketMode` double-mounting via the `/shop`→`/market` redirect chain or the engine-switch remount. Cosmetic, low-impact, and `/market` is not on the core first-arrival path (Home → onboarding). **Held** — cosmetic, lowest priority, needs browser repro.

## Task 6 — Photo grid (PR #285 + consolidation ec71806)

Deploy **READY** at `ec71806`. Code verified: drag-and-drop reorder, "Set cover" (touch), add/delete, cover→`profiles.avatar_url` sync, correct `profile_photos` schema, consolidated so `L2PhotosSheet` and the inline edit grid share one component. **Real drag-feel needs a browser** — recommend Phil eyeballs on prod; I can't drive a pointer from the sandbox.

## Task 7 — Sentry dev tools

Confirmed in code: `Settings.jsx:483` gates Developer Tools on `import.meta.env.DEV && (admin||superadmin)`. In a production Vite build `import.meta.env.DEV === false`, so the block is dead-code-stripped — never renders in prod. Sentry SDK itself untouched (still reporting). Cannot verify the Sentry dashboard event stream from the sandbox.

## Task 8 — Legal/help links

Verified at code level (Sprint 1): `CommunityGuidelines` added to the Pages registry → auto-routed (`/CommunityGuidelines`); Auth legal microcopy repointed to `/legal/terms`, `/legal/privacy`, `/CommunityGuidelines`; HelpCenter + Contact already registry-routed; FAQ content lives inside HelpCenter. **SPA caveat:** curl returns the app shell for every path, so a true 404 check is client-side — needs a browser click-through to be 100%, but the routes now exist in the router.

## Summary for the send

- **Routing is calm** (Home → onboarding). No P0.
- **Tasks 1/2/3 are real but unverifiable-from-sandbox timing/cosmetic issues.** Documented with fixes; held rather than blind-shipped before the send. None block Dean + Richard's core path (sign in → Home → wander → edit photo).
- **The one true gate is Task 4** (welcome-email timing contradiction + broken radio link) — posted to PR #284 for Phil's decision.
