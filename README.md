# HOTMESS — Global Queer Nightlife Platform

> **"From Ear to Floor"** — A spatial OS for queer nightlife discovery, connection, and commerce.

**Live:** [hotmessldn.com](https://hotmessldn.com) | [Zia Fork (Production)](https://hotmess-website-taupe.vercel.app)
**Status:** Production (Sprint 2 / Chunk 11 Reconcile)
**Updated:** 2026-04-23

---

## 📊 Live Metrics (April 2026 Audit)

| Metric | Current | 90-Day Target | 12-Month Target |
|--------|---------|---------------|-----------------|
| **Registered Profiles** | 123 | 500 | 5,000 |
| **Onboarded Users** | 89 | 350 | 3,500 |
| **Paying Members** | 0 | 25 | 500+ |
| **Monthly Revenue (MRR)** | £0 | £500+ | £8,500+ |
| **Active Venues/Promoters**| 0 | 3 | 20+ |

---

## 🌐 The Platform Ecosystem

### 1. Pulse — The Globe
A cinematic 3D interactive globe showing real-time presence.
*   **Tech:** Three.js + NASA night-side texture + gold atmospheric glow.
*   **The Moat:** Includes permanent markers for **NA (Narcotics Anonymous)** and **AA (Alcoholics Anonymous)** meetings. Recovery is part of the fabric of queer nightlife.
*   **Live Signals:** Venue pins (Fire, Eagle, RVT, etc.) and real-time user beacons.

### 2. Ghosted — Proximity Matching
A "meet-halfway" midpoint algorithm for connection.
*   **The Boo Mechanic:** The platform-native interaction. Mutual Boo required to open chat.
*   **Tiered Visibility:** 
    *   **MESS (Free):** Received Boos are "fogged." Can only see mutual Boos.
    *   **HOTMESS:** Full visibility of who Boo'd you.
    *   **CONNECTED+:** Includes **Vibe Blast** (send signal to all connections at once).
*   **Vibe:** Breaking the haunting—from ghosts to connection.

### 3. Safety Suite — "Care as Kink"
Core infrastructure provided free to all users:
*   **SOS:** One-tap emergency alert with live location to trusted contacts.
*   **Fake Call:** Staged incoming call for graceful situational exits.
*   **Check-In:** Timed safety confirm; auto-notifies contacts if missed.
*   **Trusted Contacts:** A safety network separate from the social graph.

### 4. Persona System — Multi-Profile Architecture
Sophisticated single-account, multi-persona capability.
*   **Persona Types:** `MAIN`, `TRAVEL`, `WEEKEND`, `CUSTOM`.
*   **Inheritance Modes:** 
    *   `FULL_INHERIT`: Identity stays same, location overrides only.
    *   `OVERRIDE_FIELDS`: Base main profile with specific field overrides.
    *   `OVERRIDE_ALL`: Fully independent profile.
*   **Visibility Engine:** Independent rules per persona (Blocklist, Allowlist, Attribute Filters).
*   **Persona-Bound Messaging:** Threads are locked to the persona they started with.

### 5. Commerce — Three-Tab Market
*   **Shop:** HNH MESS Lube and HOTMESS apparel.
*   **Preloved:** Peer-to-peer resale via Stripe.
*   **Drops:** Exclusive, time-limited cultural releases (HUNG, HIGH, RAW).

---

## 🎵 Sonic Identity (Sound Map)

Every major surface has a sonic signature drawn from the **RAW CONVICT RECORDS** catalogue:
*   **Pulse Globe:** Ambient deep electronic pulse. Spatial "gold frequency."
*   **Ghosted Browse:** Subtle rhythmic groove. Medium BPM.
*   **Mutual Boo:** Warm ascending tone (celebratory).
*   **Safety SOS:** Low, serious pulse (functional/no music).
*   **Market:** Smooth, tactile lo-fi.

---

## 🚀 ROADMAP: SPRINT 2 ACTIVE SCOPE

| Chunk | Feature | Status | Deliverable |
|-------|---------|--------|-------------|
| **1** | Photo Upload | **DONE ✅** | Supabase storage + immediate profile rendering. |
| **2** | UI Polish | **DONE ✅** | Radio volume slider, CAPS headers, Preloved test listings. |
| **3** | Profile Edit | **DONE ✅** | Full edit screen (Name, Bio, Age, Pronouns, Links). |
| **4** | Ghosted Grid | **DONE ✅** | 2-col grid, online dots, filter bar, paywall logic. |
| **5** | **Chat UI** | **DONE ✅** | Real-time messaging, thread creation, read receipts. |
| **6** | Stripe/Shopify | **DONE ✅** | Fix webhook (ERR_MODULE_NOT_FOUND) + Admin API sync. |
| **7** | Membership | **DONE ✅** | Tier selection → Stripe checkout → DB update. |
| **8** | **Emails (Resend)** | **DONE ✅** | Noir B&W Templates (Magic Link, Membership, Shopify, Preloved). |
| **9** | **Beacons & GPS** | **DONE ✅** | Adaptive GPS, neighborhood geocoding, 50mi filter, Uber sync. |
| **10** | Safety UI | PENDING | Timed check-in screen + contact notification. |
| **11** | Push Notifications | PENDING | Browser push for Boos, messages, and beacons. |

---

## 🛠️ April 2026 Stabilization & UX Refinement

Following the completion of Chunk 7, the platform underwent a rigorous stabilization phase to ensure the "Noir Premium" experience translates perfectly to physical mobile devices.

### 1. Spatial Layout & Header Calibration
*   **Safe-Area Geometry**: Standardized top padding to `88px` across `MarketMode`, `PulseMode`, and `GhostedMode`. This precisely aligns content below the fixed **Global Ticker** and **Top HUD**, ensuring that interactive elements like the Cart icon, Filters, and Profile triggers are never obstructed by system-level banners.
*   **Floating HUD Integration**: Fully hooked up the **Ghosted HUD** (floating chat action button) to the live unread count engine. Replaced static placeholders with a dynamic, pulsing notification badge that updates via Supabase Realtime.

### 2. Gesture Management & Scroll Physics
*   **Scroll-Trap Elimination**: Conducted a platform-wide audit of L2 sheets. Removed redundant `overflow-y-auto` and `h-full` properties from `L2OrderSheet`, `L2MyOrdersSheet`, and `L2MyListingsSheet`. 
*   **Unified Physics**: By delegating all scroll handling to the master `L2SheetContainer`, the app now maintains consistent momentum-based scrolling and rubber-band effects on iOS and Android, eliminating "stuck" scrolls during mobile navigation.
*   **Refresh Stability**: Hardened the pull-to-refresh logic in the Shop and Preloved engines to prevent UI locking during heavy data fetches.

### 3. Notification & Messaging Infrastructure
*   **Case-Insensitive Unread Engine**: Resolved a critical bug where mixed-case emails (e.g., `User@Example.com`) caused persistent notification badges. The unread count system now normalizes all JSONB keys to lowercase and performs robust case-insensitive summing.
*   **Deep-Sync Navigation**: Updated `OSBottomNav` to force a "Deep Refresh" of message counts whenever the Ghosted tab is entered. This ensures badges are cleared even if a user reads a message on a different device or through a direct notification link.
*   **Duplicate Event Prevention**: Deployed a PostgreSQL trigger (`prevent_duplicate_notifications`) to the `notifications` table. This prevents "Spam firing" of system events (like "Item Sold") by enforcing a 60-second uniqueness window for identical payloads.

### 4. Market Engine & Visual Polish
*   **Layout Shift Prevention**: Removed erratic Framer Motion `layout` properties from `ShopProductCard` and `PrelovedProductCard`. This fixes the "snapping" or "disappearing" image bug that occurred during quick navigation or grid re-renders.
*   **Noir Aesthetics**: Standardized the use of glassmorphism and gold-accent borders across all new stabilization fixes to maintain the high-fidelity brand identity.

### 5. Transactional Email Infrastructure (Chunk 8) - DONE ✅
*   **Noir Design System**: Overhauled all transactional emails with a "Noir" aesthetic (True Black `#000000` background, Stark White `#FFFFFF` typography, and minimal 1px borders).
*   **Custom Magic Link Engine**: Implemented `api/auth/magic-link.js` to bypass unstyled default emails. It generates Supabase auth links and delivers them via Resend with premium branding.
*   **Membership Confirmations**: Automated welcome emails for all paid tiers (MESS, CONNECTED, etc.) with dynamic feature lists.
*   **Marketplace Automation**: 
    *   **Shopify**: Full order summaries with itemized pricing and tracking links.
    *   **Preloved**: Buyer confirmations featuring item titles, prices, and seller contact info.
*   **Vercel Optimized**: All routes are serverless-ready and utilize environment variables for security.
*   **Resend Integration**: High-deliverability infrastructure using the Resend API for all system notifications.

### 6. Location & Ghosted Mode Infrastructure (Chunk 9) - DONE ✅
*   **Adaptive GPS Fallback**: Deployed a resilient geolocation system in `useGPS.ts` that automatically downgrades from High-Accuracy (GPS) to Low-Accuracy (Wi-Fi/IP) if a hardware lock fails. This ensures 100% reliability for Desktop/Windows users.
*   **Neighborhood Geocoding**: Integrated the Google Maps Geocoding API to transform raw coordinates into human-readable area names (e.g., "Shoreditch", "Soho"). These are persisted to `location_area` for privacy-first proximity display.
*   **50-Mile Filter & Mile Standard**: Standardized all proximity logic to the Imperial system. The `get_nearby_ghosted` RPC now enforces a strict 50-mile (80km) visibility radius, and distances are formatted as "0.4 mi" across the grid and profiles.
*   **Uber & Share Location**: Polished the Uber deep-link integration with a 500ms web fallback. Hardened the "Share Location" chat feature with PostGIS coordinate snapshots and real-time replication for instant receipt.
*   **Instant Sync Trigger**: Updated the Profile Settings toggle to trigger an immediate browser GPS lock upon activation, ensuring coordinates are populated instantly without waiting for the next heartbeat interval.
*   **Pulse Globe Visuals**: Optimized the 3D globe to render venues as large pulsing gold rings and users as discrete white dots, maintaining a clear visual hierarchy between cultural anchors and individual presence.
*   **Global Noir Pull-to-Refresh (Stabilized)**: Standardized the "Global Noir Pull-to-Refresh" system by stripping out all legacy, redundant, and conflicting pull-to-refresh implementations from across the entire app (Safety, Care, Squads, Shop, Radio, Profile, etc.). The system now delegates all touch-based refresh gestures to a single, high-performance OS-level hook in `App.jsx`, ensuring fluid interactions and eliminating navigation hangs across all mobile and web surfaces.
*   **Schema Unification**: Migrated location consent and spatial coordinates directly into the `profiles` table. This eliminates 400 Bad Request errors caused by PostgREST schema caching and ensures a single source of truth for user privacy and position.
*   **Elite Globe UX & Safety Architecture Upgrade** (DONE ✅):
    *   **NA/AA Recovery Pins**: Fully implemented as permanent white pulsing "stars of hope" on the globe. These are distinct from venues and users, serving as cultural anchors for community support.
    *   **UI Seeding for Recovery**: The "Drop Beacon" modal now includes a **Recovery** category, allowing users to add permanent meeting locations directly to the `pulse_places` table from the interface.
    *   **Safety Onboarding**: The guided walkthrough for new users to move from "UNSAFE" to "SECURE" is fully live.
    *   **Sober Identity UI**: Selection fields (Sober, Cali Sober, NY Sober) are integrated into the Profile Editor and Onboarding.
    *   **Chat UI Implementation**: The premium "Chat Surface" is fully operational for secure community connections.
    *   **Revenue Wiring**: Stripe and Shopify environment variables are finalized; Shop and Subscriptions are unblocked.
    *   **Ghosted-Style Sheet DNA**: Migrated all Globe-internal sheets (Layers, Beacon Preview, Location Shop) to a premium "Elite" architecture with `32px` rounded corners and matte black backdrops.

    *   **Intelligent Gesture Guard**: Resolved mobile gesture conflicts by implementing a "Smart Target Scan" in `usePullToRefresh`, preventing accidental app reloads when closing sheets.
    *   **Ergonomic HUD Calibration**: Fine-tuned the vertical positioning of the Layers toggle and Beacon FAB for maximum mobile thumb reachability and screen clarity.




---

## 💰 Revenue Model

### 1. Subscription Tiers
*   **MESS (Free):** Basic globe, safety, radio.
*   **HOTMESS (£7.99):** Full Ghosted, Boo visibility, Music, 3 Beacons.
*   **CONNECTED (£19.99):** P2P selling, Creator dashboard, AI Scene Scout, 10 Beacons.
*   **PROMOTER (£44.99):** Event creation, Ticketing, Radio slot, 20 Beacons.
*   **VENUE (£99.99):** Stripe Connect, Permanent globe presence, Unlimited beacons.

### 2. In-App Boosts
*   **Highlighted Message (£1.49)** / **Profile Bump (£1.99)** / **Vibe Blast (£2.49)**
*   **Globe Glow (£2.99)** / **Extra Beacon (£3.99)** / **Incognito Week (£4.99)**

---

## 🛡️ Harm Reduction & Identity

*   **Sober Identities:** First-class recognition for **Sober**, **Cali Sober**, and **NY Sober**.
*   **Recovery Pins (AA/NA):** Live, permanent cultural anchors on the Pulse Globe. Always visible, white-pulsing markers for meetings and community support.
*   **Community Seeding:** Real-time UI-based resource drops for safety and recovery resources.
*   **Secure Messaging:** End-to-end community chat surface for safe meetups and connections.
*   **Chem-Friendly Disclosure:** Opt-in only, filterable fields for informed consent and safer sex boundaries.

*   **The Moat:** Safety as a prerequisite, not a feature.


---

## 🛰️ Scene Intelligence & Distribution

HOTMESS is built on deep scene intelligence, analyzed from **50,000+ messages** across London's core queer WhatsApp communities (*TroubleMakers*, *London Boys*, *Coffee & Cuddling*).

### The Growth Flywheel
1.  **Promoter Network:** Direct injection via scene leaders like **Lee/Jamie HP** (London Boys) and **Sergio Sardo** (Trough).
2.  **Density Events:** Launch targets at dominant nights like **Adonis @ Fire** (400+ mentions in community data).
3.  **Visual Proof:** The Pulse globe lights up during these events, creating a "visibly alive" platform that drives organic sharing.

### Physical Anchors
Seeded venues include **Fire London**, **Eagle**, **Heaven**, **RVT**, **Egg**, **XOYO**, **Village Soho**, and **The Glory**.

---

## 🛠️ Maintenance & Security

*   **User Recovery:** If users are stuck under the old broken age gate, run:
    ```sql
    UPDATE profiles SET onboarding_stage = 'signed_up', age_verified = true, updated_at = now() 
    WHERE onboarding_stage = 'start' AND age_verified = false;
    ```
*   **JWT Rotation:** Deferred until post-travel (May 4). Script at `scripts/rotate-supabase-jwt.sh`.
*   **Apple Sign-In:** Secret rotation required ~Oct 2026.

---

## 🏗️ Technical Stack & Credentials

*   **Frontend:** React 18, TypeScript, Vite, Tailwind CSS.
*   **Backend:** Supabase (PostgreSQL, Realtime, PostGIS, Storage).
*   **Commerce:** Headless Shopify + Stripe (Smash Daddys Ltd).
*   **Distribution:** Vercel (Production) + Hetzner (Radio AzuraCast).
*   **WhatsApp API:** Meta-verified. Webhook active. OTP +44 7457 404159 pending.

---

## 🎨 Brand & Identity

*   **Primary Colors:** Deep Dark (`#050507`), Gold (`#C8962C`).
*   **Sub-Brands:** HNH MESS (Lube), RAW CONVICT (Music), HUNG/HIGH/RAW (Apparel).
*   **Legal Entity:** Smash Daddys Ltd (Trading as HOTMESS London).

---

**Built with 🖤 for the queer nightlife community.**

*"Always too much. Never enough."*
