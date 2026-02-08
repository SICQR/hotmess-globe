# HOTMESS London OS — Figma-Style UI/UX System Map

**Document type:** Figma-style spec (frames, components, overlays, states, flows)  
**App:** Spatial, state-driven nightlife OS (not a marketing site)  
**Entry URL:** `https://hotmess-globe-j70j2rf41-phils-projects-59e621aa.vercel.app/age?next=%2F`  
**Starting point:** Age Gate (18+ verification)

---

## 1. GLOBAL APP LAYOUT — PERSISTENT LAYERS (FRAMES)

The app is a **single spatial OS**. Navigation is mode/state-based; the Globe is the persistent background. Describe the canvas as four stacked Figma frames.

### Frame: L0 — Globe (Background)

| Property | Value |
|----------|--------|
| **Name** | L0_Globe |
| **Role** | Persistent background; never unmounts in London OS mode |
| **Z-index** | 0 (bottom) |
| **Content** | Three.js / React Three Fiber 3D globe (London-focused); BeaconMesh rendering beacons from Supabase Realtime |
| **Interactivity** | Rotate/zoom; tap beacon → opens L2 sheet (event/profile/shop context) |
| **Data** | `useGlobeBeacons`; Beacon table (Supabase); lat/lng per beacon |
| **Visual states** | Default; pulse ripples (WORLD_PULSE); optional BPM-driven shader pulse from Radio |

**Components (L0):**
- GlobeHero (canvas + camera)
- BeaconMesh (Lime / Cyan / Gold / Purple orbs)
- WorldPulseContext (ambient atmosphere; anonymised)
- Pulse ripple rings (transient, from WORLD_PULSE events)

---

### Frame: L1 — System HUD

| Property | Value |
|----------|--------|
| **Name** | L1_SystemHUD |
| **Role** | System chrome; always visible when OS is active |
| **Z-index** | 10 |
| **Content** | Radio player (bottom), Safety FAB, Navigation orb (pillar nav), CityPulseBar / Wetter Watch ticker |
| **Interactivity** | Tap nav → change mode / open L2 sheet; tap Safety → L3 interrupt; radio play/pause/schedule |

**Components (L1):**
- ConvictPlayer (persistent radio; bottom bar)
- SafetyFAB (floating action button; panic path)
- NavigationOrb / bottom nav (HOME, PULSE, EVENTS, MARKET, SOCIAL, MUSIC, MORE)
- CityPulseBar (ticker / live stats)
- Wetter Watch ticker (when enabled)

---

### Frame: L2 — Slide-in Sheets

| Property | Value |
|----------|--------|
| **Name** | L2_Sheets |
| **Role** | Contextual panels over the Globe; one primary sheet at a time |
| **Z-index** | 20 |
| **Content** | Profile (Bento/Convict ID), Ghosted stack (social), Event detail, Shopify store, P2P Vault/Marketplace, Chat thread |
| **Interactivity** | Slide in from edge or bottom; dismiss returns to Globe view; no full-page navigation where sheet suffices |

**Components (L2):**
- BentoProfile / Convict ID sheet
- GhostedStack (social discovery / match)
- EventDetail drawer (BeaconDetail)
- ShopifyProductGrid / ShopCart sheet
- P2PVault / Marketplace / ProductDetail sheet
- Chat / thread sheet
- Vault (inventory + active signals; L2-style full view at `/vault`)

**Sheet styling (design system):** Scanner-style left accent (Cyan #00D9FF), double border, consistent padding; class `sheet-l2`.

---

### Frame: L3 — System Interrupts

| Property | Value |
|----------|--------|
| **Name** | L3_Interrupts |
| **Role** | Modal overlays and toasts; block or float above L2 |
| **Z-index** | 30 |
| **Content** | Safety emergency overlay, match alert, drop countdown, XP level-up toast, system toasts |
| **Interactivity** | Dismiss returns to previous state (Globe or sheet); Safety stays until user dismisses or resolves |

**Components (L3):**
- Safety emergency overlay (red theme; location share; no nav away)
- Match alert (e.g. “Someone said hi” + Open thread)
- Drop countdown (e.g. release / event)
- XP level-up toast
- Sonner toasts (generic)
- Consent / age re-prompt if needed

---

## 2. AUTH & IDENTITY FLOW

**Entry:** Age Gate screen (`/age?next=%2F`).

### 2.1 Frames and states

| Frame | Description |
|-------|-------------|
| **AgeGate** | Full-screen gate: 18+ verification (e.g. date picker or confirm). CTA: “Enter” → next step. |
| **AuthChoice** | After age pass: “Log in with Telegram” (primary) | “Log in with email” (fallback). |
| **TelegramLogin** | Telegram Login Widget (client-side); redirect/callback with auth_data. |
| **EmailLogin** | Email + password or magic link (Supabase Auth). |
| **UsernameResolution** | If Telegram provided `tg_username` → confirm or edit handle. If null → force creation of unique @hotmess_handle. Required before social/Globe. |
| **AIVerification** | (Planned) Liveness selfie → server/edge → `profiles.is_verified`; client shows success. |
| **VerifiedVsUnverified** | Verified: Cyan glow on user beacon; badge in profile. Unverified: no glow; optional prompt to verify. |

### 2.2 Flow (wire-frame)

```
AgeGate [18+ confirm]
  → AuthChoice [Telegram | Email]
  → TelegramLogin OR EmailLogin
  → Session + profile
  → UsernameResolution [has tg_username? → confirm/edit : create @hotmess_handle]
  → (Optional) AIVerification [liveness → is_verified]
  → Live Globe (L0 + L1 visible)
```

### 2.3 State rules

- **Username:** Must exist before any social/Globe features (explicit rule; document for edge cases).
- **Verified:** `profiles.is_verified` → Cyan glow on beacon; verified badge in L2 profile sheet.

---

## 3. CORE MODES (NO PAGES)

Map as **mode states**, not routes. Each mode can be represented by which L2 sheet is open and what the Globe is showing.

| Mode | Description | L2 surface | Globe behaviour |
|------|-------------|------------|-----------------|
| **Radio** | Listening; schedule; BPM | ConvictPlayer (L1); optional schedule sheet | Optional BPM pulse in shader |
| **Social / Ghosted** | Right Now, discover, match, inbox | Ghosted stack; profile sheet; chat thread | Lime beacons (Right Now); tap → mini-profile |
| **Events / Pulse** | Events list; calendar; RSVP | Event list or Event detail sheet | Cyan beacons; RSVP can affect intensity |
| **Marketplace** | Official (Shopify) + P2P | Shop sheet; P2P sheet; cart; checkout | Gold beacons at P2P sellers; optional drop at brand coords |
| **Profile / Vault** | Identity, inventory, signals | BentoProfile; Vault (orders + beacons) | User’s beacons visible |
| **Admin** | Conditional (role-based) | Admin dashboard; City Signals; Wetter Watch CMS; moderation | Admin-only Globe controls |

**Max 2 taps from Globe:** play, RSVP, message, or safety.

---

## 4. GLOBE INTERACTION MODEL

For each interaction: **Trigger** → **Data source** → **Globe visual change**.

| Interaction | Trigger | Data source | Globe visual change |
|-------------|---------|-------------|---------------------|
| **Social “Right Now”** | User toggles Right Now on | Supabase: insert/delete row in `Beacon` (kind: social) | Lime beacon appears/removes at user coords |
| **Event heat clusters** | Events with location / RSVP | Supabase: `Beacon` (kind: event); event_rsvp | Cyan beacons; size/intensity can reflect RSVP count |
| **Marketplace gold drops** | Creator lists P2P item | Supabase: `Beacon` (kind: marketplace) + p2p_listings | Gold beacon at seller location; WORLD_PULSE ripple (GOLD_DROP) |
| **Safety emergency** | User taps Safety FAB → Panic | Supabase: safety alert; location to trusted contacts | Red overlay (L3); admin/security see priority beacon |
| **Radio BPM visual pulse** | Track change / BPM metadata | Radio context / ConvictPlayer | Optional: Globe shader pulse frequency from BPM |
| **Match / Say Hi** | User matches or sends hi | Supabase: message_thread | Optional: connection line between two beacons |
| **Shopify purchase** | Checkout complete | Shopify API | Optional: “drop” beacon at brand coords |

**Single data path:** `GlobeContext.emitPulse` + Supabase Realtime on `beacons`. No duplicate pulse systems.

**Pulse event types:** `TRACK_CHANGE`, `RIGHT_NOW`, `RSVP`, `MATCH`, `SALE`, `PANIC`, `NEW_BEACON`, `REMOVE_BEACON`.

---

## 5. KEY FLOWS (WIRE-FRAMES)

Each flow: **Entry point** → **UI surface** → **State change** → **Exit state**.

### 5.1 User onboarding (Age Gate → Live Globe)

| Step | Entry point | UI surface | State change | Exit state |
|------|-------------|------------|--------------|------------|
| 1 | App open with `/age?next=%2F` | Age Gate full screen | User confirms 18+ | Auth choice |
| 2 | Auth choice | Telegram or Email CTA | User selects Telegram | Telegram widget |
| 3 | Telegram callback | Session created | Supabase Auth + profile | Username resolution |
| 4 | Username screen | Confirm/edit or create @handle | Profile has username | (Optional) AI verify |
| 5 | (Optional) Liveness | Part 19 UI | is_verified set | Live Globe |
| 6 | Navigate to `/` or `next` | L0 Globe + L1 HUD | — | User on Globe |

### 5.2 Ghosted match flow

| Step | Entry point | UI surface | State change | Exit state |
|------|-------------|------------|--------------|------------|
| 1 | User on Globe / Social | Lime beacon visible | — | User taps beacon |
| 2 | Tap beacon | L2 mini-profile sheet | — | “Say Hi” CTA |
| 3 | Say Hi | Supabase: create message_thread | Thread exists | Optional Telegram notify |
| 4 | Recipient | L3 match alert | “Someone said hi” | Open thread (L2) |
| 5 | Thread open | L2 chat sheet | Conversation | Dismiss → Globe |

### 5.3 Event RSVP flow

| Step | Entry point | UI surface | State change | Exit state |
|------|-------------|------------|--------------|------------|
| 1 | Globe or Events mode | Cyan event beacon or list | — | User taps event |
| 2 | Tap event | L2 Event detail sheet | — | RSVP CTA |
| 3 | RSVP | Supabase: event_rsvp insert | Going/Maybe | Beacon intensity update |
| 4 | Success | Toast + optional ticket in Vault | XP reward; ticket in profile | Dismiss → Globe |

### 5.4 Official shop purchase (Shopify)

| Step | Entry point | UI surface | State change | Exit state |
|------|-------------|------------|--------------|------------|
| 1 | Market pillar | L2 Shop sheet (Shopify) | — | Browse |
| 2 | Product | Product page; Add to cart | Cart context (Shopify) | Cart |
| 3 | Cart | Cart drawer/sheet | — | Checkout |
| 4 | Checkout | Shopify or headless checkout | Order created | Success / redirect |
| 5 | (Optional) | Globe | Optional drop beacon (brand coords) | — |

### 5.5 P2P marketplace purchase

| Step | Entry point | UI surface | State change | Exit state |
|------|-------------|------------|--------------|------------|
| 1 | Market → Creators | L2 P2P sheet | — | Browse |
| 2 | Listing | Product detail; Buy | — | Stripe Checkout session |
| 3 | Checkout | Stripe Connect | Payment; order in Supabase | Success |
| 4 | Seller | Gold beacon at seller (already present); WORLD_PULSE on listing create | — | — |
| 5 | Buyer | Vault: P2P order in inventory | — | — |

### 5.6 Panic / safety activation

| Step | Entry point | UI surface | State change | Exit state |
|------|-------------|------------|--------------|------------|
| 1 | User anywhere | L1 Safety FAB | — | Tap Panic |
| 2 | Panic | L3 Safety overlay (red); no nav away | Supabase: safety alert; location to contacts | Overlay visible |
| 3 | Admin/security | — | Priority beacon / dashboard | — |
| 4 | User dismiss | Dismiss CTA | — | Return to same view (Globe or sheet) |

### 5.7 Telegram notification loop

| Step | Entry point | UI surface | State change | Exit state |
|------|-------------|------------|--------------|------------|
| 1 | Match / sale / safety event | Backend | Telegram Bot webhook | Bot sends message |
| 2 | User in Telegram | Telegram message | “Open HOTMESS OS” link | User taps link |
| 3 | Deep link | App opens to relevant context (e.g. thread, Vault) | — | User in app |

---

## 6. DESIGN SYSTEM TOKENS

### 6.1 Color roles

| Role | Hex | Usage |
|------|-----|--------|
| **Hot Pink** | #FF1493 | Primary CTA, brand moments, wordmark “MESS” |
| **Cyan** | #00D9FF | Events, TONIGHT, info, verified glow, sheet accent |
| **Lime** | #39FF14 | Right Now, success, online, active beacon (social) |
| **Gold** | #FFD700 / #FFB800 | P2P marketplace, premium, drops |
| **Red** | #FF0000 | Safety, alerts, destructive, panic |
| **Purple** | #B026FF | Music, RAW CONVICT, releases, radio beacon |
| **Black** | #000000 | Backgrounds |
| **White** | #FFFFFF | Text on dark, reverse |

**Beacon semantics:** Lime = social, Cyan = event, Gold = marketplace, Purple = radio/release.

### 6.2 Typography roles

| Level | Size (mobile) | Size (desktop) | Weight | Usage |
|-------|----------------|----------------|--------|--------|
| Display | 15vw | 10vw | 900 Italic | Brand wordmark |
| H1 | 3rem | 6rem | 900 | Page/sheet titles |
| H2 | 2rem | 4rem | 900 | Section titles |
| H3 | 1.5rem | 2rem | 800 | Subsections |
| Body | 1rem | 1rem | 400 | Paragraphs |
| Caption | 0.75rem | 0.875rem | 500 | Labels |
| Micro | 0.625rem | 0.75rem | 600 | Legal, metadata, SYS blocks |

**Treatment:** Wordmark HOT (white) + MESS (Hot Pink); taglines ALL-CAPS; CTAs ALL-CAPS, font black.

### 6.3 Motion principles

| Principle | Use |
|-----------|-----|
| **Slide** | L2 sheets: slide in from edge/bottom; dismiss slide out |
| **Pulse** | Globe ripple on WORLD_PULSE; beacon glow; optional BPM shader |
| **Interrupt** | L3 overlays (safety, match): overlay in; dismiss returns to prior state |
| **No full-page nav** | Where possible, stay on Globe + sheet; avoid replacing entire canvas |

### 6.4 Accessibility rules

| Rule | Spec |
|------|------|
| **Contrast** | Text on brand colors: black on Hot Pink/Cyan/Lime/Gold; white on dark backgrounds |
| **Focus** | Visible focus ring (e.g. ring-1 ring-ring); skip-to-content link |
| **Panic mode** | Safety overlay: high contrast (red); clearly visible dismiss; no trapping without exit |
| **Labels** | Buttons/links have accessible names; form fields associated with labels |

---

## 7. FINAL DELIVERABLE

### 7.1 Full screen/frame index (Figma export pages)

| Page / Frame set | Frames included |
|------------------|-----------------|
| **00_Gatekeepers** | AgeGate, AuthChoice, TelegramLogin, EmailLogin, UsernameResolution, AIVerification |
| **01_L0_Globe** | L0_Globe_default, L0_Globe_with_beacons, L0_Globe_pulse_ripple, L0_Globe_safety_overlay |
| **02_L1_HUD** | L1_HUD_collapsed, L1_HUD_radio_open, L1_HUD_nav_expanded, L1_SafetyFAB |
| **03_L2_Sheets** | L2_Profile_Bento, L2_Ghosted_stack, L2_Event_detail, L2_Shopify_store, L2_P2P_Marketplace, L2_Vault, L2_Chat_thread |
| **04_L3_Interrupts** | L3_Safety_overlay, L3_Match_alert, L3_Drop_countdown, L3_Toast_XP |
| **05_Modes** | Mode_Radio, Mode_Social, Mode_Events, Mode_Marketplace, Mode_Profile_Vault, Mode_Admin |
| **06_Flows** | Flow_Onboarding, Flow_Ghosted_match, Flow_Event_RSVP, Flow_Shopify_checkout, Flow_P2P_checkout, Flow_Panic, Flow_Telegram_notify |
| **07_Design_Tokens** | Tokens_Colors, Tokens_Typography, Tokens_Motion, Tokens_Accessibility |

### 7.2 Rationale: From 100+ routes to a single spatial OS

The existing app ships **~105 routes** and **300+ components** as a traditional multi-page site. The Figma map above describes the **target state**: one **spatial OS** where:

1. **One canvas:** The Globe (L0) is the only “page” that never unmounts. All other surfaces are **layers** (L1 HUD, L2 sheets, L3 interrupts). Navigation becomes **mode selection** and **sheet opening**, not URL hopping.

2. **State over routes:** Core modes (Radio, Social, Events, Marketplace, Profile/Vault, Admin) are **states**—which sheet is open, which data is in focus—not separate routes. URLs can still exist for deep links and history, but the mental model is “I’m on the Globe; I opened the Event sheet” rather than “I’m on the Events page.”

3. **Single data path to the Globe:** Every user action that should affect the world (Right Now, RSVP, match, sale, panic) goes through one contract: **GlobeContext.emitPulse** + Supabase Realtime beacons. No duplicate “pulse” or “map update” systems.

4. **Max 2 taps:** From the Globe, the user is at most two taps from play, RSVP, message, or safety. The HUD (L1) and sheets (L2) are built to support that.

5. **Progressive disclosure:** Content is revealed by opening sheets and overlays, not by loading new full pages. The Globe stays visible (or subtly present) so the user never loses spatial context.

By treating the product as **frames and modes** instead of a flat route list, we collapse the effective “surface area” of the UI into a small set of layers and flows. The frame index in §7.1 is the minimal set of Figma pages needed to hand off and implement this OS; it replaces the need to document every route as a separate screen.

---

*End of Figma-style UI/UX System Map. For implementation details see REMAP-MASTER and SYSTEM-MANUAL; for product overview see PLATFORM-OVERVIEW.*
