# HOTMESS OS — Product Brief for Google Stitch

**Date:** 2026-04-14  
**Live URL:** hotmessldn.com  
**Platform:** Mobile-first PWA (iOS + Android via browser)

---

## What Is HOTMESS?

HOTMESS is a real-time social operating system for the queer nightlife and underground scene, launching in London. It combines social discovery, live events, a marketplace, live radio, a music label, and safety tools into a single app that feels like a nightclub designed as a phone OS.

It's not a dating app. It's not a social network. It's an **OS for nightlife** — answering three questions:
1. **Who's out right now?** (Ghosted + Pulse)
2. **What's happening tonight?** (Events + Beacons + Radio)
3. **What can I buy/sell/listen to?** (Market + Music)

With a safety layer threaded through everything because the audience (queer nightlife seekers) faces unique real-world risks.

---

## The Six Tabs

HOTMESS has a persistent 6-tab bottom navigation bar. Every experience lives under one of these tabs.

### Tab 1: HOME (`/`)

The home screen is a **compressed activation layer**. It answers in under 2 seconds: what is this app? What should I do? What's live right now?

**What users see:**
- A hero with the headline "Tonight's already started" (or "You're live" if they're broadcasting)
- A live signal line: "12 live · 3 venues · On air" — real-time pulse of activity
- A contextual state card: "You're visible" (if broadcasting), "You're off the grid" (if not), or "Complete your profile" (if incomplete)
- Three quick-door buttons to jump to Ghosted, Market, or Music
- A "See who's nearby" hook (only when the user isn't live)
- A secondary strip with the HNH MESS shop and an inline radio player (play/pause + current show name)

**Purpose:** Get users oriented and into the app within one scroll. No feed. No algorithm. Just doors.

---

### Tab 2: PULSE (`/pulse`)

Pulse is the **event and social signal layer** — a map-like view showing what's happening and who's broadcasting right now.

**Four toggleable layers:**
1. **People (Right Now)** — A horizontal scroll of avatars. Each person has a coloured ring showing their current intent: orange = hookup, teal = hang, purple = explore. Tap any avatar to see their profile.
2. **Beacons (Intent)** — Event beacons, personal broadcasts, and safety alerts pinned to locations. Each shows title, address, time-to-event, and a colour (amber for events, orange for drops, red for safety). Tap to open details.
3. **Drops** — Time-limited brand merchandise with urgency indicators ("Gone when gone").
4. **Safety** — Community safety alerts that pulse red on the map.

**Creating a beacon:**
Any user can create a personal broadcast (e.g., "I'm at X Bar, come hang"). They choose a vibe (Hookup/Hang/Explore), write a title, set a location, and it broadcasts for 24 hours. Think of beacons as ephemeral "I'm here" signals.

**The Right Now Status system:**
Users set their current intent — Hookup, Hang, or Explore — which puts a coloured ring on their avatar and makes them discoverable by others filtering for that intent. It expires after a chosen window (15min to 6hr) and can be cleared manually. This is NOT a permanent profile setting — it's a live, temporal broadcast of "what I want right now."

**The 3D globe:**
When the user is on this tab, a Three.js interactive globe renders showing city nodes with pulsing gold rings. Users can rotate/drag/pinch-zoom. This is the visual centrepiece of the app but only renders on this tab (GPU policy — killed everywhere else).

---

### Tab 3: GHOSTED (`/ghosted`)

Ghosted is the **social discovery grid** — a real-time proximity view of who's online, nearby, and looking.

**Three sub-views:**
- **Nearby** — People geographically close, shown in a tight 3-column square grid. Filter chips across the top: Online, New, Looking, Hang, Tonight.
- **Live** — Users currently broadcasting their presence or at an event.
- **Chats** — Active conversation threads (unread counts, last message, online status).

**What each profile card shows:**
- Photo (65% of card)
- Name + distance (35% of card)
- Green online dot (top-right, if active)
- Coloured intent ring (if broadcasting: orange/teal/purple)

**User actions:**
- **Tap a card** → Opens full profile sheet with photos, bio, intent, and action buttons
- **Boo** → Express interest (if mutual, both get notified and chat unlocks)
- **Chat** → Direct message (only available from Ghosted or when viewing a profile)
- **Video call** → Request a video call (only available from Ghosted)
- **Share Your Vibe FAB** → Floating button to set your own Right Now status

**Chat system:**
Messages are real-time text. Threads show the other person's name, avatar, online status (green dot), last message preview, and unread count. Read receipts show if messages have been seen. Video calls can be initiated from within a chat.

**Policy gates:** Chat, video call, and travel sheets can ONLY be opened from Ghosted or when a profile sheet is already open. This prevents drive-by messaging from other parts of the app.

---

### Tab 4: MARKET (`/market`)

Market is a **three-engine commerce system** with distinct sub-tabs:

**Shop (official merch):**
- HOTMESS-branded products + HNH MESS (sexual wellness) goods
- Direct Shopify checkout — real transactions
- Cart persists across sessions
- 2-column product grid with gold price labels

**Preloved (person-to-person):**
- Users list their own items for sale (photos, price, condition)
- Buyers browse listings and message sellers to negotiate/arrange purchase
- No direct in-app payment for preloved — arranged via chat
- Sell FAB (floating button) to create new listings

**Creator Drops (time-limited):**
- Limited-run merchandise from partner brands (HUNG, RAW, etc.)
- Scarcity messaging, urgency indicators
- Browse-only (no resale)

**How buying works:**
- Shop: Add to cart → Shopify checkout → Order confirmed → Appears in Vault
- Preloved: Browse → Message seller → Arrange payment/pickup externally
- Drops: Browse → Purchase (when available) → Appears in Vault

---

### Tab 5: MUSIC (`/music`)

Music is the **Raw Convict Records label catalogue** — not live radio (that's Radio).

**Three sections:**
1. **Hot Right Now** — Individual tracks, newest first, with preview playback
2. **All Releases** — Full album/EP cards with artwork, catalogue number, release date
3. **Producer Mode** — Download stem packs and remix packs for music production

**Access tiers:**
- Preview: 80-second listen (free)
- Full track: Download requires membership
- Stem pack: Individual instrument stems for remixing (membership required)

**Player:** Inline HTML5 audio. Mini player sits above the nav bar showing album art, track title, and a gold progress bar.

---

### Tab 6: MORE (`/more`)

More is a **hub page** linking to everything that doesn't fit in the main 5 tabs:

- **Safety** → SOS, check-ins, emergency contacts, live location
- **Care** → Hand N Hand wellbeing resources (aftercare, crisis support, breathing exercises)
- **My Profile** → Edit profile, photos, verification, settings
- **Personas** → Manage alternate identities
- **Vault** → Purchase history, tickets, saved items
- **Settings** → Notifications, privacy, account
- **Help** → Support

---

## Key Features Deep Dive

### Safety System (threads through everything)

Safety is not a bolt-on — it's a core layer of the OS because HOTMESS serves queer nightlife seekers who face real-world risks.

**SOS Button (always visible, bottom-right of screen):**
- Long-press for 2 seconds to trigger
- Opens a distress modal with three emergency actions:
  1. Call Emergency Services (999/911)
  2. Contact Hand N Hand (support collective)
  3. Grounding exercise (breathing/calming technique)
- Privacy guarantee: "No one can see this screen. Your identity is protected."

**Safety FAB (Shield icon, quick menu):**
- **Fake Call** — Simulates an incoming phone call so users can excuse themselves from an unsafe situation. No actual call is placed — it's a realistic-looking call screen.
- **Check-in Timer** — Set a timer (5/10/30 min or custom). If it expires without being cancelled, emergency contacts are automatically notified. Shows an animated ring on the FAB while active. Can be extended mid-timer.
- **Safety Hub** — Educational resources and safety tools.

**Emergency Contacts:**
- Users add trusted people in profile settings
- SOS and check-in timer use these contacts for alerts
- Contacts receive notifications but NOT the user's location (privacy-first)

**Live Location Sharing:**
- Optional feature in Safety Centre
- Shares real-time location with emergency contacts only
- User-controlled on/off toggle

---

### Persona System (multiple identities)

Users can create up to 5 alternate profiles for different contexts.

**Built-in types:** Main (default), Travel (when away from home), Weekend (party mode)  
**Custom:** User-defined personas for any context

**What a persona controls:**
- Display name shown to others
- Bio/description
- Active photo set (different pictures per persona)
- Location/position

**What a persona does NOT change:**
- Underlying user ID (permissions and safety intact)
- Chat history (shared across all personas)
- Safety contacts

**How to switch:** Long-press your avatar on Profile → Persona Switcher sheet. Only one persona active at a time. Switching is instant.

**Why it exists:** The queer nightlife audience has different presentation needs in different contexts — a work persona, a weekend persona, a travel persona. HOTMESS lets users express different facets without creating separate accounts.

---

### Radio (Live Broadcast)

HOTMESS RADIO is the app's live broadcast channel with scheduled programming.

**Five shows:**
| Show | Schedule | Vibe |
|---|---|---|
| Wake the Mess | Mon–Fri 7–10am | Morning wellness + bangers |
| Dial-a-Daddy | Mon–Fri 3–5pm | Call-in advice show |
| Drive Time Mess | Mon–Fri 5–7pm | Commute energy |
| HOTMESS Nights | Fri–Sat 7–11pm | Weekend club sets |
| Hand-in-Hand | Sun 6–8pm | Wind-down deep house |

**User interactions:**
- Play/pause, volume, mute
- See current show info + schedule
- Share radio link
- ON AIR / OFF AIR badge
- Animated waveform visualisation when playing

**Mini player:** When radio is playing and the user navigates to any other tab, a 56px mini player sits above the bottom nav showing the current show, play/pause, and a waveform animation. It persists until stopped.

---

### Events vs Beacons

These are two distinct systems:

**Beacons** (Pulse tab):
- Ephemeral personal broadcasts lasting 24 hours
- Created by any user ("I'm at X Bar, looking to hang")
- Informal, low-effort, temporal
- Show on the Pulse map/globe

**Events** (via Events mode, accessible from Pulse or Home):
- Formal, scheduled gatherings with full metadata
- Venue, description, RSVP count, ticket info
- Created via "Create Event" flow
- Users RSVP (count visible to others)
- RSVP generates a ticket stored in Vault with QR code for entry

---

### Vault (Purchase & Ticket Archive)

The Vault stores everything a user has bought, sold, or saved.

**Tabs:** All | Orders | Tickets | Sold | Saved

**What's stored:**
- **Orders:** Shopify purchases with status (processing/shipped/delivered), order number, total spend, tracking
- **Tickets:** Event RSVPs with venue, time, and a QR code for entry
- **Sold:** Successfully sold Preloved items with price and date
- **Saved:** Favourited items from the marketplace

**Stats bar:** Total spend, order count, ticket count, sold count, saved count.

---

### Onboarding (8-step gate flow)

New users pass through a linear gate sequence before entering the app:

1. **Age Gate** — Confirm 18+ (legal requirement for the content)
2. **Terms** — Accept terms and conditions
3. **Data Consent** — Privacy/processing consent
4. **GPS Consent** — Location permission (enables all proximity features)
5. **Vibe** — Choose initial intent (Hookup/Hang/Explore) + set position
6. **Photos** — Upload profile pictures
7. **Community Attestation** — Agree to community standards
8. **"What Now?" Action Picker** — Choose where to go first: Ghosted (meet people), Pulse (see what's happening), Market (shop or sell), Radio (listen), or Profile (set up). This personalises the first experience.

Returning users bypass all of this — once `onboarding_completed = true`, they land directly in the app.

---

### Profile

**What users see on their profile:**
- Large circle avatar with gold ring
- Persona badge (MAIN / TRAVEL / WEEKEND / custom)
- Display name + handle
- Intent pill showing current Right Now status (or "Not sharing right now")
- Quick stats: taps received, items listed, events attended

**Profile menu sections:**
- **Identity:** Edit profile, Photos, Get Verified, Location, Personas
- **Activity:** Community, Power-Ups, Invite Friends, My Listings, My Orders, My Earnings, Vault, Favourites
- **Social:** Who Viewed You (profile views in last 7 days)
- **Safety:** Safety Centre, SOS & Emergency Contacts, Privacy, Blocked Users
- **Account:** Notifications, Membership, Help, Settings

---

### Referral System

Users can invite friends via a shareable link or QR code generated from Profile → Invite Friends. Referral tracking shows how many people joined via each user's link. Incoming users who arrive via `?invite=CODE` have the referral code stored and written to their profile on signup.

---

## Brand Architecture

HOTMESS is a multi-brand platform. 12 brands share the OS but are editorially sovereign — they never auto-cross-promote.

| Brand | What It Is |
|---|---|
| **HOTMESS** | The social OS itself |
| **HOTMESS RADIO** | Live broadcast channel |
| **RAW** | Clothing — bold basics |
| **HUNG** | Clothing — statement pieces |
| **HIGH** | Clothing — elevated essentials |
| **SUPERHUNG** | Ultra-limited RAW drops |
| **SUPERRAW** | Ultra-limited RAW drops |
| **HUNGMESS** | Editorial fashion line |
| **RAW CONVICT RECORDS** | Record label |
| **SMASH DADDYS** | In-house music production |
| **HNH MESS** | Sexual wellness brand (lube, aftercare) |
| **MESSMARKET** | Preloved P2P marketplace |

Each brand has its own Shopify collection, its own colour, and its own content category. Cross-brand moments (e.g., a HUNG drop appearing on the Radio page) are human editorial decisions only — never algorithmic.

---

## The Sheet System (how navigation works inside tabs)

Instead of pushing new screens, HOTMESS uses **bottom sheets** that slide up from the bottom of the screen. There are 65 registered sheet types covering profiles, chat, events, products, settings, safety, and more.

Sheets stack in a **last-in-first-out** pile. Pressing back closes the top sheet before navigating backward. Sheets sync to the URL (`?sheet=profile`) for deep-linking.

**Sheet height tiers:** Full (95%), Large (90%), Medium (85%), Small (70%), Mini (50%)

This means a user can be on the Ghosted tab, tap a profile (profile sheet slides up), then tap Chat (chat sheet slides on top of the profile sheet), then press back twice to return to the grid — all without leaving the Ghosted tab. The bottom nav is always visible underneath.

---

## Visual Identity (for Stitch context)

- **True black** (`#000000`) background — not dark grey, not near-black. True black.
- **Gold is the only accent colour.** Two tiers: `#D4AF37` for premium shimmer (wordmark, decorative) and `#C8962C` for interactive elements (CTAs, badges, prices).
- **Space Mono** (monospace) is the primary typeface — gives the app a "control system" authority feel.
- **Dark only.** There is no light mode. There never will be.
- **No pink, no purple accents, no gamification/XP.** The brand explicitly rejects these.
- **Intent colours** (orange/teal/purple) are semantic-only — they appear on status rings and badges, never as button colours.
- **Glass surfaces** use `rgba(255,255,255,0.05)` with blur for layered depth.

The product should feel like a **nightclub designed as a phone OS**: true black walls, warm gold spotlights, monospace authority, every surface slightly reflective but never shiny.

---

## Technical Architecture (for context)

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 6 + TypeScript |
| Styling | Tailwind CSS 3 + Framer Motion |
| UI Components | Radix UI + shadcn/ui |
| 3D | Three.js (globe on /pulse only) |
| Backend | Supabase (Postgres + Auth + Realtime + Edge Functions) |
| Commerce | Shopify headless (shop) + Supabase (preloved) |
| Payments | Stripe Connect (seller payouts) |
| Hosting | Vercel |
| Error Tracking | Sentry |

The app is a PWA (Progressive Web App) — installed on home screens, works offline for cached content, receives push notifications, and behaves like a native app on both iOS and Android without App Store distribution.
