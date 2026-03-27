# HOTMESS LONDON OS — V1.5 Bible

## Exec summary

* **V1.5 navigation is locked**: **HOME** (launcher), **PULSE** (map/layers), **EVENTS**, **MARKET**, **SOCIAL** (Connect+Messages merged), **MUSIC** (Radio+Records merged; live stream is king), **MORE** (tools + legal + settings).
* **Everything is buildable**: every route has a job, primary CTAs, microflows, endpoints, safety/consent gates, and upgrade entry points. No dead ends.
* **Monorepo “pop”** comes from: shared tokens + UI kit + demo mode + tests + analytics, plus contextual business CTAs (events, sponsorship, submissions) placed at intent peaks.

---

## Final copy

### Primary tabs (V1.5)

**HOME • PULSE • EVENTS • MARKET • SOCIAL • MUSIC • MORE**

### Naming decisions

* **HOME** = formerly “Pulse” (launcher/dashboard)
* **PULSE** = formerly “Globe” (map + layers)
* **SOCIAL** = merged **Connect + Messages**
* **MUSIC** = merged **Radio + Records/Releases** (Radio/live stream is the primary mode)

### Global UI microcopy blocks

* **Consent cue:** “Ask first. Confirm yes. Respect no. No pressure.”
* **Aftercare cue:** “Hydrate. Reset. Check in. Land in Safety if you need it.”
* **Footer stamp:** “18+ • Consent-first • Care always.”

### HOME module headlines

* **ON AIR:** “Live now on HOTMESS RADIO.”

  * Sub: “Next up: {Show} • {Time}”
  * CTAs: **Listen Live** • **Add next show to Calendar**
* **TONIGHT:** “Three moves you can actually make.”

  * CTAs: **RSVP** • **Open in Pulse**
* **DROP:** “Limited. Unapologetic. Gone fast.”

  * CTA: **Shop now**
* **SOCIAL:** “Right now guys near you.”

  * CTAs: **Discover** • **Set availability**
* **SAFETY CHECK:** “You good?”

  * CTAs: **All good** • **Need a minute** • **Safety**

### MUSIC hero + page copy

* **MUSIC**

  * Subhead: “Live radio first. Then the releases. Then the rabbit hole.”
  * CTAs: **Listen Live** • **Browse Shows** • **New Releases**
* **RAW CONVICT RECORDS**

  * Subhead: “New drops, catalogue, and what’s playing this week.”
  * CTAs: **New Releases** • **Label page** • **Submit a release** (biz)

### Business CTA copy (contextual, not spam)

* Events pages: **“Promoter? List your event.”**
* Music show pages: **“Sponsor this show.”**
* Release pages: **“Submit a release / pitch.”**
* Profile pages: **“DJ/Producer? Get verified.”**

---

## Flows

## 1) Core user journeys (high fidelity)

### Journey A — First-time entry → instant action

**Deep link / QR / URL → 18+ Age Gate → HOME**

* From HOME, the user picks one:

  * **Listen Live** → MUSIC Live
  * **Tonight** → Events list → Event detail → RSVP → Calendar add
  * **Drop** → Market → PDP → Cart → Checkout
  * **Social** → Discover → Profile → Message → Thread (consent gate on first send)

### Journey B — The SOCIAL loop (retention engine)

**HOME → SOCIAL Discover → Profile → Message → Thread**

* First message send triggers **Consent Gate**
* Thread includes safety actions: **Report / Block / Mute**
* Post-chat: optional **Aftercare nudge**

### Journey C — The PULSE map loop (city-feel)

**HOME → PULSE → select Layer → tap Pin → bottom sheet → single primary CTA**

* People pin → SOCIAL profile preview
* Event pin → Event detail
* Care pin → Safety
* Market pin → Market item/collection

### Journey D — The MUSIC loop (identity engine)

**HOME (On Air) → MUSIC Live → Show Page → Clips/Episodes/Releases → Save/Share → Calendar**

* Music drives returns via **Next show** + **Calendar**

### Journey E — Events loop (business engine)

**Events list → Event detail → RSVP → Calendar → optional Social thread**

* Contextual promoter CTAs appear on Events list and Event detail

### Journey F — Market loop (commerce)

**Market → Collection → PDP → Cart → Checkout → Confirmation**

* Confirmation cross-links:

  * **Music** (listen while you wait)
  * **Safety** (aftercare/resources)

---

## 2) V1.5 route map (canonical)

### Entry + system

* `/_/go/:type/:id` Deep link resolver
* `/age` 18+ gate
* `/_/offline` `/_/maintenance` `/_/404` `/_/500`

### Auth + onboarding

* `/auth` `/auth/sign-in` `/auth/sign-up` `/auth/magic-link` `/auth/verify` `/auth/reset`
* `/onboarding` `/onboarding/consent` `/onboarding/profile` `/onboarding/preferences` `/onboarding/privacy` `/onboarding/notifications` `/onboarding/location`
* `/_/permissions/location` `/_/permissions/notifications` `/_/permissions/camera`

### Primary tabs

* **HOME**: `/`
* **PULSE (map)**: `/pulse`
* **EVENTS**: `/events`, `/events/:id`
* **MARKET**: `/market`, `/market/:collection`, `/market/p/:handle`, `/orders`, `/orders/:id`, `/orders/:id/tracking`, `/returns`, `/returns/:id`
* **SOCIAL**: `/social`, `/social/discover`, `/social/inbox`, `/social/u/:id`, `/social/t/:threadId`
* **MUSIC**: `/music`, `/music/live`, `/music/shows`, `/music/schedule`, `/music/shows/:show`, `/music/shows/:show/episodes`, `/music/shows/:show/episodes/:id`, `/music/releases`, `/music/releases/:slug`, `/music/tracks`, `/music/tracks/:id`, `/music/playlists`, `/music/playlists/:id`, `/music/artists`, `/music/artists/:id`, `/music/clips/:id`
* **MORE**: `/more`

### More stack (tools)

* **Beacons**: `/more/beacons`, `/more/beacons/new`, `/more/beacons/:id`, `/more/beacons/:id/edit`, `/more/beacons/:id/expired`
* **Stats**: `/more/stats`, `/more/stats/detail`
* **Challenges**: `/more/challenges`, `/more/challenges/:id`
* **Safety**: `/safety`, `/safety/report`, `/safety/report/:id`, `/safety/reports`, `/safety/blocks`, `/safety/resources`, `/safety/appeal`
* **Calendar**: `/calendar`, `/calendar/subscriptions`, `/calendar/settings`
* **Scan**: `/scan`, `/scan/check-in`, `/scan/redeem`, `/scan/join`, `/scan/success`, `/scan/fail`
* **Community**: `/community`, `/community/new`, `/community/:threadId`, `/community/drafts`
* **Leaderboard**: `/leaderboard`, `/leaderboard/how-it-works`, `/leaderboard/opt-in`

### Utilities

* `/notifications`, `/notifications/settings`
* `/saved` (events/profiles/posts/products)

### Account + billing + GDPR

* `/account`, `/account/profile`, `/account/photos`, `/account/boundaries`, `/account/visibility`, `/account/blocked`, `/account/devices`
* `/account/membership`, `/account/upgrade`, `/account/billing`, `/account/receipts`
* `/account/data`, `/account/data/export`, `/account/data/delete`, `/account/data/retention`

---

## 3) Microflows + endpoints (buildability)

### Global endpoints

* `POST /api/age/verify`
* `GET /api/me` `PATCH /api/me` `PATCH /api/me/privacy`
* `POST /api/consent/ack`
* `GET /api/subscriptions/me` `POST /api/subscriptions/upgrade`
* `GET /api/notifications` `PATCH /api/notifications/settings`
* `POST /api/saved/toggle`
* `POST /api/safety/report` `GET /api/safety/reports`
* `POST /api/safety/block` `GET /api/safety/blocks`
* `POST /api/aftercare/checkin`
* **Internal calendar only:** `GET /api/calendar` `POST /api/calendar/add` `DELETE /api/calendar/:itemId`

### SOCIAL microflows

* Discover → Profile → Message → Thread
* First send → Consent Gate → Send
* Thread → Report/Block → Safety

Endpoints:

* `GET /api/social/discover?filters=...`
* `GET /api/users/:id`
* `POST /api/messages/thread`
* `GET /api/messages/inbox`
* `GET /api/messages/:threadId`
* `POST /api/messages/:threadId/send`

### Events microflows

* List → Detail → RSVP → Calendar add → optional thread

Endpoints:

* `GET /api/events`
* `GET /api/events/:id`
* `POST /api/events/:id/rsvp`
* `POST /api/calendar/add` (internal)
* `POST /api/messages/thread { eventId }` (optional)

### Market microflows

* Collection → PDP → Cart sheet → Checkout → Order → Tracking/Returns

Endpoints:

* `GET /api/market/collections`
* `GET /api/market/products?collection=...`
* `GET /api/market/products/:handle`
* `POST /api/cart/add` `POST /api/cart/remove`
* `POST /api/checkout/start`
* `GET /api/orders` `GET /api/orders/:id`
* `POST /api/returns/start`

### Pulse (map) microflows

* Map load → default layer
* Tap pin → bottom sheet → single CTA

Endpoints:

* `GET /api/pulse/pins?layer=events&bbox=...`
* `GET /api/pulse/pins?layer=people&bbox=...` (privacy rules)
* `GET /api/pulse/pins?layer=care&bbox=...`
* `GET /api/pulse/pins?layer=market&bbox=...`

### Music microflows

* Now Playing → Listen → Show context → Save/Share → Calendar
* Releases → Play → Save → Follow

SoundCloud integration rules (V1.5):

* Store **SoundCloud URNs** as canonical IDs.
* Prefer **embeds/SDK** for playback; cache metadata; treat stream URLs as ephemeral.
* Implement rate-limit safe patterns: backoff, caching, “play on SoundCloud” fallback.

Endpoints:

* `GET /api/music/now-playing`
* `GET /api/music/shows` `GET /api/music/shows/:show`
* `GET /api/music/episodes?show=...`
* `GET /api/music/releases` `GET /api/music/releases/:slug`
* `GET /api/music/tracks` `GET /api/music/tracks/:id`
* `GET /api/music/playlists` `GET /api/music/playlists/:id`
* `GET /api/music/artists` `GET /api/music/artists/:id`

### Beacons microflows

* Create beacon → choose audience/duration/location precision → publish
* Browse nearby → tap → Social/profile or Message request
* Expire → optional aftercare nudge

Endpoints:

* `POST /api/beacons`
* `GET /api/beacons?near=...`
* `DELETE /api/beacons/:id`

### Safety microflows

* Report: category → details → evidence → submit → confirmation ID
* Block list management
* Resources + aftercare check-ins

Endpoints:

* `POST /api/safety/report`
* `GET /api/safety/reports`
* `POST /api/safety/block`
* `GET /api/safety/blocks`
* `POST /api/safety/appeal`
* `GET /api/safety/resources`

---

## 4) Traffic-light system (multi-layer)

### Legend

* VALUE (user impact) • RISK (safety/privacy/legal) • REV (revenue potential) • BUILD (effort)

### Primary tabs

* **HOME** — VALUE 🟢 | RISK 🟢 | REV 🟢 | BUILD 🟠
* **PULSE (map)** — VALUE 🟢 | RISK 🟠 | REV 🟠 | BUILD 🔴
* **EVENTS** — VALUE 🟢 | RISK 🟠 | REV 🟢 | BUILD 🟠
* **MARKET** — VALUE 🟢 | RISK 🟢 | REV 🟢 | BUILD 🟠
* **SOCIAL** — VALUE 🟢 | RISK 🔴 | REV 🟢 | BUILD 🟠
* **MUSIC** — VALUE 🟢 | RISK 🟢 | REV 🟠 | BUILD 🟠→🔴 (player + queue + caching)
* **MORE** — VALUE 🟠 | RISK 🟠 | REV 🟠 | BUILD 🟠

### More tools

* **Safety** — VALUE 🟢 | RISK 🔴 | REV 🟢 | BUILD 🟠
* **Calendar** — VALUE 🟢 | RISK 🟢 | REV 🟠 | BUILD 🟠
* **Beacons** — VALUE 🟠 | RISK 🔴 | REV 🟠 | BUILD 🟠
* **Scan** — VALUE 🟠 | RISK 🟠 | REV 🟢 | BUILD 🔴
* **Community** — VALUE 🟠 | RISK 🔴 | REV 🟠 | BUILD 🟠
* **Stats** — VALUE 🟠 | RISK 🟢 | REV 🟠 | BUILD 🟢
* **Challenges** — VALUE 🟠 | RISK 🟢 | REV 🟠 | BUILD 🟠
* **Leaderboard** — VALUE 🟠 | RISK 🟠 | REV 🟠 | BUILD 🟢

---

## 5) Memberships + upgrade entry points

### User tiers

#### FREE (£0)

* Access: HOME, PULSE (basic layers), Events browse, Market browse, Social basic discover/inbox
* Limits:

  * Social: limited new message threads/day
  * Beacons: 1/day, short duration
  * Stats: summary only
  * Calendar: basic view, limited subscriptions

#### PLUS (£9.99/mo)

* Unlocks:

  * Social: higher daily new threads + request sorting
  * Saved presets in filters
  * Beacons: more/day + longer durations + privacy controls
  * Calendar: more subscriptions + reminders
  * Feed/hype controls: follow topics + mute keywords

#### PRO (£19.99/mo)

* Unlocks:

  * Social visibility boost (rotating, non-spam)
  * PULSE: advanced people layers (heat/availability) with privacy-safe rules
  * Music: early access drops + member perks when attached to Market
  * Stats: full dashboards

### Business tiers

#### BUSINESS STARTER (£49/mo)

* Event listing + basic analytics + limited boosts

#### VENUE PRO (£149/mo)

* Featured pins + Scan check-in + analytics export

#### NETWORK/SPONSOR (£499/mo)

* Sponsor inventory (Music shows, Hype modules) + partner integrations

### Upgrade entry points (where upsell appears)

* **SOCIAL**

  * Hit new-thread limit → “Upgrade to Plus”
  * Save filter preset → “Plus required”
  * Boost visibility → “Go Pro”
* **PULSE**

  * Advanced people layer toggle → “Pro”
* **MUSIC**

  * Sponsor module → Business Sponsor
  * Release submission / pitch → Business submission flow
* **EVENTS**

  * “List your event” → Business Starter
  * Enable Scan check-in → Venue Pro
* **MARKET**

  * Member pricing / early access → Pro

---

## 6) Business + Admin consoles (comprehensive)

### Business console routes `/biz/*`

* `/biz` dashboard
* `/biz/onboarding`
* `/biz/venue`
* `/biz/events` `/biz/events/new` `/biz/events/:id/edit`
* `/biz/scan` `/biz/scan/check-in` `/biz/scan/redeem`
* `/biz/analytics` `/biz/billing`
* `/biz/sponsorships` `/biz/sponsorships/inventory` `/biz/sponsorships/buy`
* `/biz/team`
* `/biz/music/submissions/new` (release pitch)

### Admin routes `/admin/*`

* `/admin`
* `/admin/moderation`
* `/admin/reports` `/admin/reports/:id`
* `/admin/users` `/admin/users/:id`
* `/admin/events` `/admin/events/:id`
* `/admin/content` (feed/music/community)
* `/admin/sponsors`
* `/admin/config`
* `/admin/audit` `/admin/metrics`

---

## 7) Design + monorepo rules (so it “pops”)

### Separation rules (critical)

* **Shop**, **Music/Radio**, and **OS app** can be separate front-ends.
* Visual consistency comes from **shared tokens**, not shared code.

### Shared token contract

* One `brand.css` with CSS variables used across apps.
* Tailwind maps to those variables.

### “Pop” checklist

* Shared UI kit (`packages/ui`) + Storybook
* Demo mode with seeded data + MSW
* E2E tests (age gate, social first message consent, RSVP + calendar add, checkout start)
* Analytics events across all CTAs

---

## 8) Defaults for Radio/Music pages (your show standards)

### Required “Show rundown” module (displayed on show pages)

* Consent cue (pre-show)
* Sponsor read slot
* Wetter Watch (30–45s)
* Closing affirmation

### Required per-show: stingers + VO

* Keep 3 stingers + 1 VO line per show visible in the show page “signature sounds” section.

---

## 9) Acceptance criteria (non-negotiables)

* Every route has **loading / empty / error / success** states.
* Every screen has **one primary CTA** (secondary allowed, but one “main”).
* Safety actions are always reachable within 1 tap from social surfaces.
* Calendar integration is **internal only** (no Google-specific flow).
* Music uses SoundCloud integration patterns that are **URN-first** and **rate-limit safe**.

---

## 10) Next build sequence (recommended)

1. **Shell + tokens + UI kit** (HOME/PULSE/SOCIAL/MUSIC skeletons)
2. **Age gate + onboarding + account/membership** (gates + upgrades wired)
3. **SOCIAL loop** (discover → message → consent → safety)
4. **MUSIC loop** (live → show → releases; embeds + caching)
5. **Events + calendar** (RSVP + calendar add)
6. **Market + orders** (PDP → checkout → confirmation)
7. **More tools** (Safety first, then Beacons/Calendar/Scan)

---

## Appendices

### A) What changed vs earlier drafts

* Pulse renamed to **HOME**; Globe renamed to **PULSE**.
* Connect + Messages merged into **SOCIAL**.
* Radio + Records merged into **MUSIC**; Live stream is the primary view.

### B) Where business CTAs live (intent peaks)

* Music show pages → Sponsor
* Release pages → Submit/Pitch
* Events pages → List/Boost/Scan
* Market drops (optional) → Partner drop pitches

### C) Release Launch Playbook (Jan 10 @ 00:00 London)

* Launch is **time-gated** to Jan 10, 00:00 in **Europe/London**.
* Release detail pages use **slug routes**:

  * `/music/releases/hnhmess`
  * `/music/releases/now-thats-what-i-call-a-hotmess-vol1`
* Pre-launch state: show countdown (server-trusted time) + “Add to calendar” / “Notify me” style CTAs.
* Post-launch state: show the release player (embed-first, URN-first) and the primary monetization CTA (e.g. Market “Buy”).
