# Auth surface decision tree

**Status:** investigation only — Polish-sweep Issue 4 (2026-05-18). No code change in this commit.

The 18:24 Mon Samui screen recording surfaced a third logged-out splash that the cofounder audit hadn't seen. This document maps every auth/landing surface that can render to a user with no session, where it's wired, and which conditions select it.

## Surfaces

| Surface | File | Visual signature | Where it renders |
|---|---|---|---|
| **HotmessSplash — `splash` stage** | `src/components/splash/HotmessSplash.jsx` | Cinematic stagger of 7 letters (H‑O‑T‑M‑E‑S‑S), then gold "ENTER" button | `PublicShell` → `/` (initial stage) |
| **HotmessSplash — `auth` stage** | same file, different state | HOTMESS/LONDON wordmark + bottom-sheet with "JOIN" (gold filled) + "Sign In" (gold outline) | Same `/` after `ENTER` is tapped OR after the cinematic auto-advances |
| **Auth ("Welcome back")** | `src/pages/Auth.jsx` | "Get into HOTMESS" + provider list (Google/Telegram/Email + magic-link + Apple gated) | `PublicShell` → `/auth`, `/auth/*` |
| **Examples scaffold (lazy, unreachable in prod)** | `src/examples/auth/*` (`WelcomeScreen`, `LoginScreen`, `SignUpScreen`, `ForgotPasswordScreen`, `JoinCodeScreen`, `ProfileSetupScreen`) | Newer flow per the v6 design system | Wired as lazy imports in `App.jsx` but currently has NO `<Route>` element pointing at them — dead code paths today |
| **AgeGate** | `src/pages/AgeGate.jsx` | 18+ confirmation | `PublicShell` → `/age`, `/AgeGate` |
| **ReentryPage** | `src/pages/ReentryPage.jsx` | Apology + AgeGate + lock-username | `?token=` deeplink from reentry email |

## Routing entry points

`src/components/shell/PublicShell.jsx` is the public router:

```
PublicShell
├─ /         → <HotmessSplash />              ← stages: splash → auth → forgot → reset-sent → done
├─ /age      → <AgeGate />
├─ /AgeGate  → <AgeGate />
├─ /auth     → <Auth />                       ← the "Welcome back" surface
├─ /auth/*   → <Auth />
├─ /reset-password   → <ResetPassword />
├─ /legal/privacy    → <PrivacyPolicyPage />
└─ /legal/*          → <LegalPage />
```

The decision for *which* shell renders (PublicShell vs the authenticated shell) is made one level up in `App.jsx` / `BootGuardContext` based on Supabase session presence.

## Decision tree for a real user

| Visitor state | Surface served | Why |
|---|---|---|
| Cold incognito, no cookies, navigates to `hotmessldn.com/` | HotmessSplash (`splash` stage → `auth` stage) | Default route in PublicShell |
| Returning visitor, expired session, deep-link to `/auth` | Auth ("Welcome back") | Explicit route hit |
| Returning visitor, deep-link to `/` | HotmessSplash | Default route in PublicShell |
| PWA standalone (saved to home screen) | HotmessSplash | Same code path; no PWA-specific branch exists |
| Reentry email clickthrough (`/reentry?token=…`) | ReentryPage | Token-gated authed surface, not strictly an auth surface |
| Expired session + last route was `/pulse` etc. | PublicShell → HotmessSplash | Auth gate redirects to `/` not `/auth` |

## Why three surfaces co-exist

1. **HotmessSplash** is the canonical entry — cinematic + bottom-sheet auth in one screen, shipped earlier this year.
2. **Auth.jsx** is the legacy surface that pre-dates HotmessSplash. Still wired so that any cached deep-link / shared "sign in" URL still works.
3. **examples/auth/*** is a v6-design-system rebuild that's been imported but never routed. Either an in-flight migration that stalled, or a parallel-track design exercise that didn't merge.

## Recommendation (out of scope for this brief — Phil decides)

- Pick ONE: `HotmessSplash` OR `examples/auth/WelcomeScreen` as the canonical surface.
- Redirect `/auth` to whichever is canonical (or fully delete and rely on `/`).
- Remove the unreachable lazy imports in `App.jsx` (`WelcomeScreen`, `LoginScreen`, `SignUpScreen`, `ForgotPasswordScreen`, `JoinCodeScreen`, `ProfileSetupScreen`) — dead code attracts confused contributors.
- Keep ReentryPage and AgeGate separate — they're legitimate distinct flows, not auth alternatives.

## Verification

- Phil's 18:24 Mon Samui recording captures the HotmessSplash → `auth` stage on cold incognito.
- The earlier audit screenshot (Item 5) captured the same surface (HOTMESS/LONDON + JOIN/Sign In).
- The "Welcome back" surface Phil cites is `/auth` and only renders if you navigate there directly.

The "three auth surfaces" headline reduces to: **one shipped surface (HotmessSplash with two visual states) + one legacy surface (Auth.jsx at /auth) + one unreachable in-flight rebuild (examples/auth/*)**.
