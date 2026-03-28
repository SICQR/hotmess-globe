# HOTMESS LONDON OS — STANDARD OPERATING PROCEDURE

**Version:** 1.0  
**Applies to:** Product, Design, Engineering, Ops, Admin  
**Scope:** Anything that ships to users

---

## 0. THE PRIME DIRECTIVE

HOTMESS is a **state-driven spatial OS**, not a website.

If a change introduces:
- pages
- navigation stacks
- UI-only state
- duplicated truth

**…it is invalid.**

---

## 1. SYSTEM TRUTH HIERARCHY

```
Supabase (DB + RLS)
   ↓
Beacons (render contract)
   ↓
Globe (visual truth)
   ↓
Sheets / UI
```

**UI is last. UI never invents truth.**

---

## 2. IDENTITY & ACCESS

### Identity
- Supabase Auth is the **only** identity system
- Providers: Google, Telegram
- `profiles.id === auth.users.id` ALWAYS

### OS Mount Gate

The OS runtime **MUST NOT** mount unless ALL are true:

```sql
profiles.age_verified == true
profiles.username IS NOT NULL
profiles.onboarding_complete == true
```

**No previews. No exceptions.**

---

## 3. UI ARCHITECTURE RULES

### Allowed
- One OS shell
- One Globe
- Mode switching (NOW / SOCIAL / EVENTS / RADIO / SHOP / PROFILE)
- Sheets and overlays

### Forbidden
- ❌ Pages
- ❌ Routes as destinations
- ❌ Back buttons
- ❌ Breadcrumbs
- ❌ Page headers
- ❌ Multiple globes

**If it feels like a "page", it's wrong.**

---

## 4. MODES ≠ PAGES

Modes are filters + affordances, not screens.

| Mode | Primary Action |
|------|----------------|
| NOW | Go Live |
| SOCIAL | Handshake |
| EVENTS | RSVP |
| RADIO | Listen |
| SHOP | Buy |
| PROFILE | Verify / Edit |

**Only one primary CTA per mode.**

---

## 5. RIGHT NOW (PRESENCE)

- "Right Now" is a **presence row with TTL**
- UI toggles are **forbidden**
- Presence is created only via RPC (`go_live`)
- Presence always expires

**No presence row = no social dot**

Cooldowns are enforced server-side.

---

## 6. GLOBE CONTRACT

- Globe subscribes to **one table only**: `beacons`
- Globe does **not** know:
  - auth
  - onboarding
  - roles
  - permissions

**Visibility is enforced by RLS, not UI.**

If Globe logic references profile state → **STOP**.

---

## 7. SAFETY (SYSTEM OVERRIDE)

### Trigger
- Press & hold (3s)
- No tap panic
- No confirmation modal

### Behavior
- UI locks immediately
- Red safety beacon created
- Admin notified
- User must explicitly resolve

### Rules
- Safety ignores mode
- Safety ignores navigation
- Safety overrides everything

**If safety can be dismissed accidentally → BLOCK RELEASE.**

---

## 8. COMMERCE RULES

### Official (Shopify)
- Shopify headless only
- Shopify data **never** mirrored into Supabase

### P2P / Market
- Supabase + Stripe escrow
- Listings create gold beacons
- Sale removes beacon

### Vault
- Read-only merge of Shopify + P2P
- No shared checkout logic

---

## 9. DESIGN RULES (FIGMA)

- One Shell frame
- Auto-layout only (8pt grid)
- No absolute positioning (except Globe)
- One state = one frame variant
- Every frame must answer:

```
What Supabase state enables this?
What disables it?
```

**If not answerable → frame is invalid.**

---

## 10. ENGINEERING RULES

### Allowed Writes
- RPCs
- Edge Functions
- Admin service role

### Forbidden
- Client-side inserts for:
  - presence
  - safety
  - beacons
- UI-only state pretending to be real

**All writes must be auditable.**

---

## 11. STORYBOOK & QA

### Storybook

Every core component must have:
- default
- loading
- blocked
- empty
- error

**If a state exists in prod but not in Storybook → fail.**

### First-Night QA (MUST PASS)

- [ ] OS never mounts early
- [ ] Presence TTL expires exactly
- [ ] Beacon visibility matches role
- [ ] Safety locks UI reliably
- [ ] Reload during panic restores lock

**Any failure = no live night.**

---

## 12. ADMIN OPERATIONS

- Admin uses **same OS**
- Admin sees more layers, not a different app
- Admin-only beacons never leak

Admin actions must be:
- logged
- reversible
- visible in DB

---

## 13. CHANGE MANAGEMENT

Before merging any PR, answer **YES** to all:

- [ ] Does this reduce pages?
- [ ] Does this reduce UI-only state?
- [ ] Does Supabase remain the source of truth?
- [ ] Does the Globe stay dumb?
- [ ] Does safety remain authoritative?

**If any answer is "not sure" → do not merge.**

---

## 14. FAILURE CONDITIONS (AUTO-STOP)

Immediately halt rollout if:

- ❌ Users appear live without DB rows
- ❌ Beacons linger after expiry
- ❌ Safety is dismissible
- ❌ Deep links bypass onboarding
- ❌ Two globes mount

---

## FINAL WORD

This SOP exists so HOTMESS does not collapse into a normal app.

If someone says:
> "It would be easier if we just added a page…"

**They are wrong.**
