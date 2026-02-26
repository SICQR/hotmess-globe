# HOTMESS — Feature Gap Matrix
**Generated:** 2026-02-26
**Sources cross-referenced:** Figma FigJam architecture map, GitHub issues (17 open), Supabase tables (no UI), local project copies, current codebase analysis

---

## GAP CLASSIFICATION

- 🔴 **CRITICAL** — Core product functionality, blocking or near-blocking
- 🟠 **HIGH** — Revenue-generating or major UX gap
- 🟡 **MEDIUM** — Known planned feature with DB/design backing
- 🟢 **LOW** — Polish or nice-to-have
- ⚫ **ABANDONED** — Was planned, no longer relevant

---

## FIGMA → CODE GAPS (from FigJam System Map)

| Feature | Figma Design | Code Status | Gap Level |
|---------|------------|------------|-----------|
| **Auto Skin Switch** (geo-triggered persona) | ✅ Documented in FigJam flow | ❌ Not implemented anywhere | 🟡 MEDIUM |
| **Persona-Bound Conversations** | ✅ "Persona Bound Conversation" node in FigJam | ❌ Chat is not scoped to persona | 🟠 HIGH |
| **Biometric Checkout** | ✅ "Biometric Checkout" in FigJam market flow | ⚠️ PinLockScreen exists but not wired to checkout | 🟡 MEDIUM |
| **Full-Screen Fake Call Overlay** | ✅ "Fake Call Screen" as dedicated interrupt | ⚠️ FakeCallGenerator exists but no Z-200 interrupt screen | 🟡 MEDIUM |
| **Integrated Radio + Tickets Panel** | ✅ FigJam shows "Live Radio + Tickets" as contextual panel | ⚠️ Exist separately, not integrated into one panel | 🟢 LOW |
| **Creator Card** (distinct from profile) | ✅ "Creator Card" variant in FigJam | ⚠️ ProfileCard exists but no creator-specific variant | 🟡 MEDIUM |
| **Hookup Card** (distinct profile skin) | ✅ "Hookup Card" variant in FigJam | ❌ No hookup-mode profile skin | 🟡 MEDIUM |
| **Travel Skin** (auto-switch on travel persona) | ✅ FigJam "Travel Skin → Auto Skin Switch" | ❌ Personas exist but no visual skin switching | 🟡 MEDIUM |

**Note:** 6 Figma files were inaccessible (HTTP 400) with the current token. The FigJam file that IS accessible is an architecture diagram, not a visual design file. The actual UI designs may be in those 6 inaccessible files.

---

## GITHUB ISSUES → FEATURE GAPS (17 open issues)

From GitHub scan of SICQR/hotmess-globe:

| Issue | Type | Status |
|-------|------|--------|
| PR #113 figma-make-v2 (11 days old) | Merge blocker | ⚠️ Blocking downstream PRs (#129) |
| PR #81 temp/no-gate-test | Security risk | 🔴 NEVER merge — bypasses consent gates |
| Open issues re: auth flows | Bug | Various states |
| Open issues re: RLS policies | Security | Most addressed in 20260226000080 |

**Action needed:** Close/resolve PR #113 to unblock merge queue. Explicitly close #81 with a comment that it was a test branch and must not be merged.

---

## SUPABASE TABLES → UI GAPS

| Table/System | DB Status | UI Status | Revenue? | Priority |
|-------------|-----------|-----------|---------|---------|
| `creator_subscriptions` | ✅ Live | ❌ No UI | 💰 YES | 🔴 CRITICAL |
| `community_posts` | ✅ Live | ❌ No UI | No | 🟠 HIGH |
| `achievements` | ✅ Live | ❌ No UI | No | 🟡 MEDIUM |
| `user_checkins` | ✅ Live | ❌ No UI | No | 🟡 MEDIUM |
| `venue_kings` | ✅ Live | ❌ No UI | No | 🟡 MEDIUM |
| `squads` + `squad_members` | ✅ Live | ❌ No UI | No | 🟡 MEDIUM |
| `sweat_coins` | ✅ Live | ❌ No UI | Unclear | 🟢 LOW |
| `collaboration_requests` | ✅ Live | ❌ No UI | No | 🟢 LOW |
| `user_highlights` | ✅ Live | ❌ No UI | No | 🟢 LOW |
| `trusted_contacts` | ✅ Live | ❌ No UI | No | 🟢 LOW |
| `get_amplification_price()` | ✅ Live RPC | ❌ No UI | 💰 YES | 🟠 HIGH |
| `calculate_business_heat()` | ✅ Live RPC | ❌ No UI | No | 🟡 MEDIUM |
| Cadence escalation system | ✅ Live | ❌ No UI | No | 🟢 LOW |

---

## LOCAL COPY RECOVERY → FEATURE GAPS

Features found in local project copies that don't exist in main:

| Feature | Source | Gap Level |
|---------|--------|-----------|
| **NowNextCard** (radio schedule card) | `hotmess-overview` | 🟠 HIGH |
| **QualityPopover** (stream quality selector) | `hotmess-overview` | 🟡 MEDIUM |
| **SoundConsentModal** (audio autoplay consent) | `hotmess-overview` | 🟠 HIGH (browser autoplay policy) |
| **ReminderNudge** (show reminder) | `hotmess-overview` | 🟡 MEDIUM |
| **AIConcierge** (AI chat interface) | `hotmess-enterprise` | 🟡 MEDIUM |
| **About / Accessibility / Legal pages** | `hotmess-core (1)` | 🟠 HIGH (required for app store + legal) |
| **AffiliatePage** | `hotmess-core (1)` | 🟡 MEDIUM |
| **CookieBanner** (GDPR) | `hotmess-core (4)` | 🟠 HIGH (GDPR compliance) |
| **RoleGuard** component | `hotmess-core (4)` | 🟡 MEDIUM |
| **BrandShowcase** component | `hotmess-enterprise-hardened` | 🟢 LOW |
| **HotmessLanding** page | `hotmess-enterprise` | 🟡 MEDIUM |
| **React Native app** | `hotmess-os` | ⚫ SEPARATE TRACK |
| **signedBeacon** crypto type | `beacon-backend` | 🟡 MEDIUM (beacon security) |

---

## CROSS-REFERENCED COMPLETE GAP LIST

### 🔴 CRITICAL (fix now)
1. **`creator_subscriptions` UI** — table live, Stripe wired, zero UI = zero subscription revenue
2. **SoundConsentModal** — browser autoplay policies block radio on first load; no consent flow exists

### 🟠 HIGH (next sprint)
3. **Community posts feed** — `community_posts` table live, no feed in HomeMode
4. **About/Legal pages** — `/about`, `/accessibility`, `/legal` — required before app store submission
5. **GDPR cookie banner** — required for UK/EU compliance (live site operates in London)
6. **`get_amplification_price()` UI** — business amplification is a revenue feature with no UI
7. **NowNextCard** for radio — show schedule integration into mini-player
8. **Persona-bound chat** — personas exist but messages are not scoped to the active persona
9. **PR #113 cleanup** — blocking merge queue

### 🟡 MEDIUM (roadmap)
10. **Auto Skin Switch** — geo-triggered persona visual skins
11. **Creator Card** profile variant — distinct from regular profile card
12. **Achievements UI** — table live, no UI
13. **Venue Kings / check-in leaderboard** — table live, no UI
14. **Squads system** — tables live, no UI
15. **Biometric checkout** — PinLock exists, not wired to checkout
16. **Full-screen fake call overlay** — FakeCallGenerator exists, no interrupt screen
17. **QualityPopover** — stream quality selector
18. **AIConcierge** interface
19. **RoleGuard** for admin routes

### 🟢 LOW (backlog)
20. **Hookup Card** profile skin
21. **Travel Skin** visual variant
22. **ReminderNudge** for radio shows
23. **sweat_coins** UI (purpose unclear)
24. **collaboration_requests** UI
25. **user_highlights** UI
26. **BrandShowcase** landing component
27. **Integrated Radio + Tickets panel**

### ⚫ ABANDONED / SEPARATE
- React Native app (`hotmess-os`) — different strategic track
- AzuraCast self-hosted radio — decision pending
- Video calling backend — planned but no backend exists
- Voice messages in chat — recording stub only
- AR beacon discovery — placeholder only
- Group chat backend — UI exists, no backend
