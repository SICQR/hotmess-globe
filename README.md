# HOTMESS — Men-Only Social, Commerce & Nightlife Platform (MSM)

A full-stack, men-only (18+) platform for men who have sex with men (MSM), combining social connection, nightlife discovery, peer-to-peer commerce, ticketing, media, and care — within a single, consent-first ecosystem.

**React 18 + Vite + Supabase + Vercel**

---

## 0. Positioning & Scope (Authoritative)

**HOTMESS is:**
- Men-only
- 18+
- Built specifically for men who have sex with men (MSM)
- Explicitly adult
- Consent-first
- Safety-aware
- Multi-intent by design

**HOTMESS is not:**
- an LGBT+ umbrella platform
- a general social network
- an escort directory
- a sexual services marketplace

**This README is authoritative.**
If behaviour is not documented here, it is not considered live.

---

## 📊 Build Stats

| Category | Count |
|----------|-------|
| Pages / Routes | 85 |
| Component Folders | 61 |
| API Endpoints | 8 |
| Database Migrations | 70 |
| UI Components | 73 (shadcn/ui + custom) |

---

## 🧠 Core Product Model

Every user is defined by three layers:

```
ACCOUNT → ROLE(S) → PERSONA
```

### Account (Immutable)
- Supabase Auth identity
- Age verification (18+)
- Consent acknowledgements
- Moderation & safety history

### Roles (Stackable)

Roles define capabilities, not identity:
- Social / hookup user
- Buyer
- Seller
- Creator
- Organiser / club

A user may hold multiple roles simultaneously.

### Personas (Contextual Presentation)

Personas are presentation skins, not new profiles:
- affect name, bio, photos, intent signals
- can change by location or context
- do not bypass moderation, consent, or safety

Personas exist to remove the need for multiple apps.

---

## 🧭 Core Worlds (Single Platform, Multiple Surfaces)

HOTMESS is one platform composed of distinct but connected worlds:
- **Home** — editorial / entry
- **Ghosted** — people + opportunity grid
- **MessMarket** — commerce
- **Tickets** — resale now, official sales later
- **Events & Nightlife**
- **Radio & Music**
- **Care & Safety**

All worlds share:
- the same account
- the same messaging system
- the same safety & moderation layer

---

## 👻 Ghosted — Multi-Intent Discovery Grid

Ghosted is not just a hookup grid.

It is a **people + opportunity grid** where users may:
- hook up
- chat
- sell items
- buy items
- sell tickets
- promote events
- create communities

### Ghosted Cards

All users appear via the same card structure:
- primary image
- distance & travel time
- online status
- persona indicator (subtle)
- role signals (seller / creator / organiser)

There are no separate grids for dating vs selling.

### Discoverability Rules
- Personas affect presentation, not base discoverability
- Filters adjust visibility, not identity
- Private data (messages, purchases, safety actions) is never discoverable

---

## 🛒 MessMarket — Peer-to-Peer Commerce

MessMarket supports adult peer-to-peer commerce.

### Allowed
- clothing
- fetish gear
- worn items (e.g. underwear, shoes)
- physical goods
- digital goods
- access to Telegram rooms or communities

### Not Allowed
- sexual services
- escort advertising
- pay-per-meet sexual access

**Items are not people.**
This boundary is enforced.

### Sellers as People

Sellers may:
- appear as people
- also hook up
- also create content

Clarity of intent matters more than depersonalisation.

---

## 🎟️ Ticketing

### Phase 1 — Ticket Resale (Current)
- Peer-to-peer resale
- Verified sellers
- Proof of ticket ownership
- Mandatory in-platform chat
- AI-assisted fraud detection
- Escrow-style payment where possible

### Phase 2 — Official Ticketing (Planned)
- Clubs and promoters sell directly
- Trusted third-party ticket integrations
- Clearly labelled "Official" tickets

Resale and official sales co-exist.

---

## 💬 Messaging System (Unified)

There is one messaging system, with context tags:
- Social / Hookup
- Commerce
- Ticket
- Creator / Community
- Telegram-linked

Context determines:
- UI treatment
- safety gates
- AI thresholds

### Telegram Integration

Telegram is a first-class extension, not a loophole:
- access may be gated
- misuse affects HOTMESS privileges
- platform rules still apply

---

## 🤖 AI Systems

AI is split into two strictly separated domains:

### Discovery AI
- profile ranking
- proximity weighting
- intent matching

### Safety AI
- distress detection
- boundary violation signals
- abuse pattern recognition

**AI:**
- may flag
- may recommend
- may not silently punish
- may not shadow-ban

All enforcement is human-reviewed.

---

## 🚦 Safety Gates & Consent

Contextual safety gates include:
- Age gate (hard)
- Consent gate (persistent)
- Sexual content gate
- Commerce safety gate
- AI distress gate

Gates are functional, not performative.

---

## 🧠 Care & Aftercare

Care tools are always available, never forced:
- panic button
- check-in timers
- Hand N Hand support
- grounding resources

Care is infrastructure, not marketing.

---

## 🛡️ Moderation & Enforcement

Enforcement always follows:

```
Persona → Role → Account
```

No shadow bans.
All actions are logged and appealable.

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profiles` | GET | Paginated Ghosted feed |
| `/api/travel-time` | POST | ETA calculations |
| `/api/telegram/*` | POST | Telegram integration |
| `/api/webhook/*` | POST | Stripe / commerce |
| `/api/cron/*` | GET | Scheduled jobs |
| `/api/health` | GET | Health check |

---

## 🗄️ Database (Supabase)

Key tables:
- `profiles`
- `personas`
- `roles`
- `events`
- `tickets`
- `products`
- `orders`
- `messages`
- `reports`
- `safety_checkins`

---

## 🎯 Feature Status

### Live
- Auth (email, Google, Telegram)
- Ghosted grid
- Messaging
- Events
- Commerce
- Ticket resale (partial)
- Radio & music
- Safety gates
- Admin tools

### Partial
- QR ticket scanning
- Premium tiers
- Push notifications

### Planned
- Official ticket sales
- Enhanced personas
- Advanced discovery tuning

---

## 🚀 Quick Start

```bash
git clone https://github.com/SICQR/hotmess-globe.git
cd hotmess-globe
npm install
npm run dev
```

---

## 🔒 Security & Compliance

- GDPR export & deletion
- No minors
- No escorting
- No trafficking
- Consent-first design
- Moderation transparency

---

## 📄 License

**Proprietary — SICQR Ltd**

---

## Final Statement

HOTMESS is a men-only ecosystem for men who have sex with men, designed to enable connection, commerce, nightlife, and care — without fragmentation, ambiguity, or exploitation.

**This README defines the platform.**
