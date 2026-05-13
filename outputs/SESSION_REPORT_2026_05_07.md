# Session report — overnight build wave (2026-05-07 → 2026-05-09)

## Summary

9 PRs opened across security, service worker, Pulse P1, onboarding, and design polish.
Resumed from interrupted overnight session (2026-05-08 dispatch) plus two new
critical waves discovered the morning of 2026-05-09 (Cowork-verified):

- **Wave H** — service worker was eating Google Maps requests despite valid key/billing
- **Wave I** — `[GlobeRealtime] city heat fetch failed: Object` log was unpacking-blocked

## PR ledger

| # | Wave | Title | Branch |
|---|------|---|---|
| 245 | B | fix(security): remove hardcoded Google Maps API key fallback | `fix/security/remove-hardcoded-maps-key` |
| 246 | H | fix(sw): bypass service worker for Google Maps API requests | `fix/sw-bypass-googleapis` |
| 247 | I | fix(pulse): unpack city heat fetch error for diagnosis | `fix/pulse-city-heat-fetch-error-logging` |
| 248 | C.1 | fix(pulse): unify layers state to GlobeContext | `fix/pulse-c1-layers-state-unify` |
| 249 | C.2 | fix(pulse): layer filter consistency across all 6 categories | `fix/pulse-c2-layer-filter-consistency` |
| 250 | C.3 | fix(pulse): recovery beacon dedicated treatment | `fix/pulse-c3-recovery-beacon-treatment` |
| 251 | C.4 | fix(pulse): user beacon View Profile CTA in preview panel | `fix/pulse-c4-user-beacon-view-profile-cta` |
| 252 | F | fix(onboarding): defer PIN setup to Safety settings | `fix/onboarding-defer-pin-setup` |
| 253 | G | fix(pulse): widen mobile tap targets on globe pins | `fix/pulse-g-pin-tappability` |

A.3 (Stripe metadata rename) merged earlier as #244 before this session resumed.

## Key calls (the "why")

- **Wave H** is the actual root cause of the Maps prod failure. Maps API key
  was already rotated, restricted, billed, and verified at REST level — but
  the service worker's `networkFirst` was wrapping all `googleapis` requests,
  and SW-context fetch strips/modifies the Referer header that the
  referrer-restricted key needs. Fix is an early-return for `googleapis`
  hostname before the cross-origin allowlist. CACHE_VERSION bumped v4→v5 so
  clients pick up the new SW on next visit (or hard reload).

- **Wave I** doesn't fix the Pulse globe being empty — it makes the next
  reproduction *diagnosable*. The catch block was logging a Supabase
  PostgrestError as plain `e`, which Chrome renders as `Object`. Now unpacks
  `message`/`code`/`details`/`hint` so the next prod log line will name the
  actual cause (column rename / RLS / shape).

- **Wave C.1** found the layers state was *both* in component state AND in
  GlobeContext. The component state was initialised to `['pins']`, never
  updated, debounced for no reason, and passed to `EnhancedGlobe3D` which
  doesn't even declare the prop. Pure dead state.

- **Wave C.2** discovered the Radio toggle in `LayersSheet` did literally
  nothing — there was no filter case for it. People/market matched on
  inconsistent fields. Now uses a single helper that checks
  `beacon_category` OR `type` OR `kind`.

- **Wave C.3** changed recovery beacons from being treated as `venue` to a
  dedicated `recovery` category with white pin, HeartHandshake icon,
  "Confidential" badge, and "Open Hand N Hand" CTA → `/care`. Tone-matched
  to the editorial intent of the recovery layer.

- **Wave F** found the onboarding flow was already tight; the only honest
  cut was deferring `PinSetupScreen` from the gate. PIN was already a
  skip-or-set step and skip already wrote `onboarding_completed=true`.
  PIN management remains reachable via `PinLockScreen` in /safety.
  Centralised completion via new `finishOnboarding()` so Continue and Skip
  on ProfileScreen produce identical results.

- **Wave G** shipped only the pin-tappability tune. The atmosphere recolour
  and persona tinting were intentionally deferred — they're editorial
  design decisions that need a Phil pass, not safe overnight changes.

## Verify after merge + redeploy

After all 9 PRs merge and Vercel redeploys:

1. **Hard reload** https://hotmessldn.com/pulse (Cmd+Shift+R) so the new SW
   activates, OR DevTools → Application → Service Workers → Unregister.
2. Console should NOT log `[LocationService] Reverse geocode failed`.
3. Globe should auto-zoom to user's location within 3 seconds.
4. 15 city pins should render visibly.
5. Toggle each layer in LayersSheet — each should affect the globe.
6. Tap a recovery pin (white) — sheet shows "Open Hand N Hand" CTA.
7. Tap a user beacon — preview shows "View Profile" CTA.
8. Sign out / new account: onboarding ends at ProfileScreen, no PIN gate.

If `[GlobeRealtime] city heat fetch failed:` still logs, the new unpacked
log will name the cause — file as a follow-up PR.

## Blocked on Phil (unchanged)

- VITE_SUPABASE_ANON_KEY not yet set as GitHub repo secret (e2e-smoke runs
  but Supabase calls fail).
- Brand visibility toggles for hung / high / hungmess in
  `src/config/brands.ts`.
- Stripe Connect onboarding (manual, dashboard.stripe.com).

## Files touched

- `api/stripe/create-checkout-session.js` (A.3 — merged earlier as #244)
- `api/stripe/webhook.js` (A.3 — merged earlier)
- `src/hooks/useGPS.ts` (B)
- `public/sw.js` (H)
- `src/hooks/useGlobeRealtime.ts` (I)
- `src/pages/Globe.jsx` (C.1, C.2, C.3, C.4)
- `src/components/globe/BeaconPreviewPanel.jsx` (C.3, C.4)
- `src/components/onboarding/OnboardingRouter.jsx` (F)
- `src/components/globe/EnhancedGlobe3D.jsx` (G)

## Convention compliance

- Branched off latest main per PR ✓
- One PR per item ✓
- `npm run typecheck` green for every commit ✓
- Lint deferred to GitHub Actions CI per dispatch override ✓
- No touches to G2-G7 / env vars / billing ✓
- No clicks on Cloud Console rotation modal ✓
