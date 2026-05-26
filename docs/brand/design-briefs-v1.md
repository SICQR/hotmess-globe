# HOTMESS · LDN · Design Briefs v1.0

**Status:** Canonical product design doctrine. One brief per surface. Hand-off-ready prompts for designer / AI / future-Phil.
**Source:** Phil Gizzie, 2026-05-26.
**Audience:** gay men · 18+ · London-first.
**Tone:** bold · unapologetic · lux · masc.
**Voice:** Phil at 7am on his porch.
**Floor:** consent-first · care always.
**Surfaces:** 17.

---

## 01 · HOME

`/` — mode: home

First surface after auth. The opposite of an infinite feed. Tell the user what's live near them right now, what's on tonight, what they should land in — and stop. No scroll-for-the-sake-of-it.

**Must show**
- HNH MESS hero — full-bleed product photography, aftercare framing, single CTA to shop
- Daily check-in — streak count + claim button
- 4 signal cards — Pulse count, Live radio track, Tonight's events, Preloved drops
- Your last 24h — taps received / boos / profile views, lightweight

**States**
- Quiet night (low signal count) — leans on radio + aftercare instead of presence
- Pre-event (afternoon) — Tonight card grows, events surface earlier
- Right Now active (you've cast) — your cast appears at top with timer
- Sober / discreet mode — strips imagery, mutes saturation

**Voice cues**
*"Good evening. 38 signals near you. The radio is live."*
*"Quiet tonight. Want to land in something?"*
Terse · founder-personal · no exclamation marks.

**Must not**
- Become a content feed
- Recommend people by algorithm — proximity only
- Use the word "discover", "explore", or "for you"

---

## 02 · PULSE · THE GLOBE

`/pulse` — mode: pulse

The theatre piece. A living queer signal layer rendered as a real sphere — not a flat map. It exists to locate, listen, land, and convert. Beautiful first, useful always.

**Visual anatomy**
- Sphere: radial atmosphere outside, terminator inside, specular highlight upper-left
- Graticule: latitudes as cos-projected ellipses, longitudes as sin-scaled ellipses, slow rotation (80s/loop)
- Continent silhouettes: gold-tinted abstract shapes, never literal
- Particles: 24 gold dots drifting up from atmosphere
- CityPulseBar top: London / Berlin / NYC / LA / Paris / Lisbon / CDMX / Tokyo, each with count + RIGHT NOW count

**Beacons = 9 hero glyphs**
- GYM · barbell · `#FF5500` · HEARTBEAT
- CLUB · concentric · `#A899D8` · BLOOM
- SAUNA · steam · `#00C2E0` · DRIFT
- LEATHER · cuffs · gold · STABLE
- CAFÉ · cup · cream · SHIMMER
- CLINIC · cross · off-white · BREATHE (care)
- AFTERCARE · halo · off-white · REST (care)
- CRUISING · radar · `#FF2D78` · SCAN
- MARKET · bag · gold · GLOSS

**Interaction**
- Tap a glyph → BeaconSheet (see brief 12)
- Tap city in pulse bar → camera zooms; data refreshes (London/Berlin/NYC/LA have full choreography)
- Glyph filter chips at bottom — show the motion word inline so users learn the language
- FAB (brand) bottom-right → cast your own beacon
- Long-press a glyph → preview card without committing to the full sheet

**Must not**
- Show exact GPS — only city / district granularity
- Render canvas on any non-pulse route (canvas bleed-through bug from PR #280)
- Hijack vertical drag as pull-to-refresh
- Use realistic globe textures — keep it stylised, gold-lit

---

## 03 · GHOSTED · GRID

`/ghosted?tab=grid`

The proximity-discovery surface. A 3-column grid of nearby men. No swiping. No infinite scroll. You see who's there; you act once.

**Card anatomy**
- 0.78 aspect ratio · square-ish portrait
- Photo with bottom gradient overlay
- Status dot (active green / right-now pink) top-left
- Persona badge top-right when not MAIN
- Name + age in display type
- Distance + last-seen in mono micro
- Up to 3 Looking-For tags (dashed border, "+ MASC")

**Filter chips (top)**
- ALL · 247 (count present)
- RIGHT NOW (pink) · ONLINE (green) · VERIFIED (cyan)
- + MASC · + SOBER · + GYM (tag filters, multi-select)
- TRAVEL (filter for people not local)

**Voice cues**
*"No swiping. No ghosts."*
*"long-press a tile to switch persona"*

**Must not**
- Show photos for users at REVEAL = anonymous
- Show distance closer than 0.1 mi
- Have a "match" celebration animation
- Surface popularity metrics (taps received) publicly

---

## 04 · GHOSTED · THREADS + BOOS

`/ghosted?tab=threads | boos`

Chat as ephemeral, low-pressure, contextual. The whole system exists to reduce exposure, pressure, permanence, spam, and triangulation. A ghosted thread does not confront the ghoster.

**State machine (9 states)**
- `pending` · awaiting first reply (warn-amber)
- `active` · recent exchange (signal-green)
- `mutual` · both said yes (brand-gold)
- `quiet` · no recent activity — opacity 0.70
- `cooling` · auto-deprioritising — opacity 0.55
- `ghosted` · faded · 0.35 opacity · no confrontation
- `expired` · context window closed
- `blocked` · emergency-red, locked composer
- `safety_locked` · paused by Safety Hub

**Reveal levels (5)**
- anonymous → alias-only → partial → full → trusted
- Visualised as 5 dots; only filled ones are unlocked
- Reveal escalation is explicit, not automatic
- Live location is separate from identity reveal

**Boos**
- Lightweight social nudge — playful, no popularity metric
- Incoming boos: anonymised ("ANON-12C4") until you boo back
- Mutual boo → thread upgrades from pending → active
- Decline is silent — no notification sent to the booer

**Must not**
- Show "Seen" or "Read at" timestamps
- Send re-engagement prompts to either side after a ghost
- Auto-reveal identity on mutuality
- Persist mutual chats without an explicit "keep" gesture

---

## 05 · EVENTS

`/events` — mode: events

What's on. Programmatic + community + recovery, all in one stack. Calendar grid for browsers, list for the impatient, RSVPs tab so the user sees their own commitments without hunting.

**List item**
- Date block left: month + day + dow, gold-tinted card
- Title (display type), venue + time (mono)
- Beacon glyph badge for the event type (club / meetup / care / na_aa / record_release)
- Going count (only after threshold to avoid empty rooms)
- TONIGHT pill (pink) or HOST pill (gold) where relevant

**Calendar tab**
- Standard 7-col weekday grid · current month
- Days with events get brand-tint background + gold dot
- Tap a day → filtered list jumps to that date

**RSVPs tab**
- Only events you've RSVPed to
- Each row has its QR pass inline (no extra tap to find it)
- Cancellable up to event start; no shame copy

**Must not**
- Sort by "trending" — chronological only
- Surface attendee photos (privacy)
- Use scarcity copy ("only 4 spots left")

---

## 06 · MARKET

`/market` — mode: market

Commerce as care. Three tabs in one mode: SHOP (Hotmess line + RAW CONVICT records + HNH MESS), PRELOVED (peer-to-peer trade), SELL YOURS (Stripe Connect onboarding + payouts).

**Product card**
- 1:1 image — real product photography, never illustration
- NEW / LTD pill where relevant (gold)
- Name in display type, variant in mono micro
- Price right-aligned, gold
- P2P only: seller line below card ("MARCO · 0.4mi", verified check)

**Sell tab**
- Founder copy: *"Preloved gear, kit, merch. Local-first."*
- State plainly: 8% platform fee, weekly payouts
- Payout ledger card: PENDING / REQUESTED / LIFETIME

**Voice cues**
*"Stripe Connect · 8% platform fee · weekly payouts."*
Plain numbers · no caps drama · £7.99 not JUST £7.99!

**Must not**
- Discount with countdown timers
- Show "X people viewed this"
- Sell anything that would compromise care positioning

---

## 07 · VAULT

`/vault` — mode: vault

Everything you've earned, bought, or been given. Three tabs: PASSES (tickets + access with live QRs), ORDERS (Shopify + P2P history), MEMBERSHIP (Chrome status).

**Pass treatment**
- Featured pass renders QR full-card, white background, true contrast
- Code printed in mono micro under QR (fallback if scanner fails)
- Other passes collapse to row + tiny QR thumbnail
- Expired passes move to archive section, faded

**Order row**
- Square thumbnail · title · ID + date · status pill
- Status: DELIVERED (signal) / SHIPPED (warn) / PASS (brand)
- Tap → order detail with tracking + reorder

**Chrome membership card**
- Full-bleed gold gradient card
- Display type "CHROME" italic — the membership IS its lockup
- Benefits in plain prose, never bullet-pointed marketing

**Must not**
- Surface "upgrade to Chrome" upsell on free user's vault — that lives in More
- Show purchase reviews / ratings

---

## 08 · RADIO + RECORDS

mini-player (persistent) + expanded sheet

HOTMESS RADIO is always there. A 48px persistent bar above the dock shows what's live; tapping expands the full Radio mode (now playing hero · waveform · shows · releases · live tab).

**Mini-player**
- 32px cover thumb · live dot · title + artist
- 7-bar animated waveform when playing
- Single play/pause button in brand color
- Tap anywhere except button → expand

**Expanded**
- 96px cover · LIVE pill · title · DJ · "342 LISTENING"
- 48-bar full waveform with current position
- Tabs: LIVE · SHOWS · RAW CONVICT
- Releases tab = 2-col grid of record covers (use real product photography)

**Shows on roster**
- THE PORCH · Phil · Weds 09:00 (founder show)
- AFTERCARE RADIO · D. Vauxx · Sun 22:00
- SCHOOL OF HOTMESS · MESS BOYS · Fri 19:00
- WALKING RED FLAG · Kai + Tom · Tues 21:00

**Must not**
- Autoplay without consent modal on first session
- Hide the player when in Safety mode — care over commerce, but radio is care-adjacent

---

## 09 · SAFETY HUB

shield top-right (always accessible)

The Safety FAB is the one button that exists on every screen at z-index 60. The hub is where you land. SOS at the top — armable with a hold gesture, disarmable instantly. Aftercare and Recovery as equal citizens.

**SOS row (centerpiece)**
- 56px emergency-red circle with SOS glyph
- "HOLD 3 SECONDS TO ARM" → "ARMED · 3 CONTACTS NOTIFIED"
- Armed state: red border + ring pulse animation + glow
- Contact names listed plainly: "ALEX · DANI · MUM"
- Disarm = single tap (no confirmation, no friction)

**2x2 care grid**
- AFTERCARE — Hydrate / Reset / Check in (safety tone)
- RECOVERY — Sobriety streak + next meeting (brand)
- CONSENT — Ask / Confirm / Respect no (safety)
- FAKE CALL — one-tap exit, leaves no trace (warn)

**Emergency contacts**
- 3 avatars in a row, name + relationship label below
- Always-active green dot if their location-share is on
- Edit button top-right of card

**Must not**
- Frame anything as medical treatment
- Require auth to access — Safety must work even when signed out
- Use loud marketing copy in here ever

---

## 10 · PROFILE (YOURS)

tap avatar top-left

Editable identity card. Top-down: cover photo + ring-ed avatar; name + handle + city pair; bio one-liner; verification + sober + persona pills; 3-up stat strip; 3-col photo grid. The whole thing should be read in <5s.

**Header**
- 200px cover, gradient overlay bottom
- 88px avatar with brand-gold ring + status dot
- EDIT pill top-right, glass-blur background

**Identity block**
- Name in display type (hero-size)
- Age + handle in mono small, gold
- Bio = 1-2 sentences, never marketing voice
- Tag row: OG / VERIFIED / SOBER NY / MASC / GYM / CREATIVE

**Stat strip**
- 3 metrics: BEACONS cast / MUTUALS / STREAK
- Big gold display numbers, micro mono labels

**Must not**
- Show "Profile completion %"
- Suggest fields to fill — let the user choose what to share
- Render NSFW photos until age-gate is passed in this session

---

## 11 · PROFILE SHEET (SOMEONE ELSE'S)

tap a card from Ghosted grid

Bottom sheet opened from a grid card. The user's first impression of someone — make it dense, scannable, and end at a single binary choice: TAP / BOO or SAY HELLO.

**Anatomy**
- 320px header image with back button + RIGHT NOW pill (when applicable)
- Display-type name + age over image
- Persona badge inline with distance/district
- Below image: VERIFIED · OG pills + LOOKING-FOR tags
- Bio block (1-2 sentences)
- 6-photo grid (square thumbs)
- MUTUALS card: count + 3 stacked avatars

**Action bar**
- TAP / BOO buttons left (compact, see brief 14 for primitives)
- SAY HELLO primary full-width right
- SAY HELLO opens a pending ghosted thread, never a hot inbox

**Must not**
- Show "last online" timestamp more precise than the hour
- Surface the other person's view count of your profile
- Have a "Super Like"

---

## 12 · BEACON SHEET

tap any glyph on the Globe

Every beacon needs a reason to exist, a clear visual, a tap result, a privacy posture, a default expiry, and moderation. The sheet renders all six. No beacon creates a dead end.

**Header**
- 240px hero image — venue or contextual product photography
- NOW + ENDS-time pill if live
- Distance + district line in gold
- Title + age (if person-beacon) in display hero

**Body sections**
- INTENT — the beacon's one-liner, in quotes
- VIBE chips — ghost-tone pills
- PRESENCE card — last ping + verification + mutual count
- CONSENT CUES card — 3 plain rules
- Bottom: VIEW PROFILE + SAY HELLO

**By beacon type**
- event/ticket → CTAs: details · get ticket · listen live · find care
- chill/meetup → CTAs: join intent · profile · save
- care/na_aa → CTAs: open care card · directions · meeting times (never logs who clicked)
- urgent_safety → opens Safety surface immediately, not a sheet

---

## 13 · AUTH · SIGN-IN / SIGN-UP

`/auth`

First impression of the product to a non-member. The wordmark is the hero — copy does the work. Monospace tech aesthetic. No image stock. No social-proof logos. Founder line at the bottom.

**Hero**
- Cinematic display: *"THE GLOBE FOR YOUR KIND."* — italic gold on "YOUR"
- 1 mono sentence under: *"Queer-direct, real proximity, no swiping, no ghosts. Recovery-informed."*

**Form**
- Email · Password · (Handle if sign-up)
- Single primary CTA "SIGN IN" / "CREATE ACCOUNT"
- Mode-toggle as ghost button below
- Telegram login row optional (existing user base)

**Founder line**
*"18+ · Consent-first · Care always. A platform · radio · records · London. Built by Phil. You turned up. Thank you."*

**Must not**
- Show testimonials or "trusted by X members"
- Marketing imagery — only the wordmark
- Use Google / Apple branded buttons above the email field

---

## 14 · ONBOARDING

first session, post-sign-up

Four steps. Each is a statement, not a sales pitch. The user is being told the floor — these are the rules they're agreeing to by being here.

**The 4 statements**
- `01 · CONSENT-FIRST` — *"Ask first. Confirm yes. Respect no. No pressure."*
- `02 · NO GHOSTS` — *"You match, you talk."*
- `03 · PROXIMITY, NOT SWIPING` — *"No infinite feed."*
- `04 · CARE & RECOVERY` — *"Sobriety as identity. Land in Safety when you need it."*

**Layout per step**
- 4-segment progress bar top
- "STEP 01 / 04" micro label gold
- Cinematic display: last word italic gold
- 1 body paragraph mono
- BACK ghost + primary CTA ("I HEAR YOU" → "GOT IT" → "NEXT" → "I'M IN")

**Must not**
- Skip step button
- Image carousel — type is the hero
- "Welcome to HOTMESS!" copy

---

## 15 · PERSONA SWITCHER

long-press avatar (anywhere)

Three personas. Presentation layer only. No permissions change. No discoverability bypass. Visual presentation only — same user, different face.

**The 3 personas**
- ◆ MAIN — default · everyday (gold)
- ◇ TRAVEL — when you're away (safety cyan)
- ◈ AFTERHOURS — late · club · risk-aware (right-now pink)

**Modal**
- Blur-backdrop full-overlay
- 3 stacked cards, each: glyph + label + gloss + check if active
- Tap outside to dismiss
- Footer micro: "◊ NO PERMISSIONS CHANGE · NO DISCOVERY BYPASS"

**Must not**
- Reach 4+ personas — simplification is sacred
- Allow custom personas (removed 2026-05-07)
- Use the persona to hide blocks or reports — those are global

---

## 16 · INTERRUPTS

z 120 — z 200

Four full-screen takeovers that obey strict z-ordering. They never compete with each other — only one shows at a time. Each is its own visual register.

**AGE GATE · z 120**
- Black bg · gold "AGE-GATE · 18+" tag
- Cinematic display *"YOU MUST BE 18 OR OLDER TO ENTER"* (italic on 18+)
- Single mono paragraph stating the deal
- Primary "I AM 18+ · CONTINUE" + ghost "LEAVE"

**PIN LOCK · z 1000**
- Lock glyph + "LOCKED"
- 4 dots that fill as you type
- Number pad 3x4 with mono digits, X to delete
- Auto-submit on 4th digit

**FAKE CALL · z 200**
- True system-call layout — looks like iOS / Android incoming
- 120px avatar · "MUM" hero · "mobile · london"
- Red decline + green accept (both end the prototype overlay)
- Leaves zero trace in any local log

**INCOMING CALL BANNER · z 180**
- Top-of-screen toast (not full takeover)
- Avatar + name + "INCOMING VIDEO CALL"
- Slide-down from top, slide-up to dismiss
- 30s auto-dismiss

---

## 17 · MORE · SETTINGS

bell icon top-right → MORE

Every system surface lives here. 5 sections, each a stacked card. Items get colored detail when the state matters (Chrome = brand, Verified = signal, Sign out = destructive).

**Sections (in order)**
- ACCOUNT — edit profile · privacy · verification
- MEMBERSHIP — Chrome status · payment
- SAFETY & CARE — emergency contacts · aftercare prefs · blocked
- CONTENT — RAW CONVICT · your shows · merch
- LEGAL — GDPR export · terms · sign out (destructive red)

**Row anatomy**
- Title display-type, subtitle mono micro
- Subtitle color tracks meaning: signal-green (verified), brand (Chrome), destructive (sign out)
- Right arrow on every row · uniform target size

**Must not**
- Hide GDPR export
- Show user-pic of Phil or anyone in here
- Have a Help section that opens a chatbot

---

**HOTMESS DESIGN BRIEFS · v1.0 · 2026**
17 SURFACES · 3 PERSONAS · 9 HERO GLYPHS · 16 BEACON TYPES · 9 GHOSTED STATES · 5 REVEAL LEVELS · 4 INTERRUPTS

Voice spec: `docs/brand/voice.md` · Tokens: `tokens.css`

Built by Phil. You turned up. Thank you.
