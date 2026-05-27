# 04 — Upgrade Surface Doctrine

**Status:** LOCKED — Phil 2026-05-27.

**Purpose:** when and how HOTMESS asks for the upgrade. Invitational, not transactional. Belonging-oriented, not ransom.

---

## The one rule

> **HOTMESS never nags, ransoms, or interrupts intimacy.**

Upgrade prompts feel like *being invited into a room*, not *paying to keep the door open*.

---

## Anti-patterns (NEVER do)

| Pattern | Why it's banned |
|---|---|
| Interstitial blocking the action user just took | hostile UX. ransom feel. |
| "Your free message limit is up" pop-up after typing | interrupts intimacy. cardinal sin. |
| Auto-bill at end of trial without explicit consent | trust-destroying. one-strike rule. |
| Countdown timers on upgrade modals | manufactured urgency. cheap. |
| Locking sent messages "until you upgrade" | retention through hostility. |
| Pop-ups during SOS / safety flows | unforgivable. |
| Pop-ups during mutual boo / first-CONNECT moment | breaks the ceremonial transition. |
| Tier comparison tables on home page | feels SaaS, not HOTMESS. |
| Pay-to-skip TRUSTED 24h cool-down | safety feature, not a tier feature. |

---

## When upgrade IS surfaced

| Surface | When | Tone | Frequency cap |
|---|---|---|---|
| **Drop-beacon limit hit** (MESS used 1, REGULAR used 5) | Inline below button | "*That's your 5 for today — REGULAR removes the cap.*" | once per day |
| **Boo limit hit** | Inline toast | "*Out of boos. REGULAR unlocks unlimited.*" | once per day |
| **Mutual-boo moment (CONNECT transition)** | Subtle chip below celebration | "*Voice notes ready for you in CLOSE.*" | once per CONNECT |
| **Trying to add 2nd TRUSTED on MESS** | Replaces the form | "*One trusted contact in MESS. REGULAR opens 3.*" | every attempt |
| **Trying to download a track on MESS/REGULAR** | Inline next to download button | "*Downloads are CLOSE+. £19/mo.*" | every attempt |
| **Beta expiry T-24h** | Push notification | "*Your beta ends tomorrow. Keep it for £19/mo.*" | once |
| **Beta expiry T-0** | Modal on next app open | "*Your beta ended. Stay close with CLOSE.*" | once, dismissible |
| **Beta expired user reopens app** | Persistent chip at top | "*Founding 250 — welcome back. £19/mo to come back close.*" | sticky until they pay or dismiss for the session |
| **30-day-old user, never paid** | Soft prompt in More tab | "*You've been here a month. Become a regular.*" | once per 30 days |

---

## Tone calibration

**Bad:**
- "Upgrade to Premium"
- "Subscribe now"
- "Try Pro free"
- "Unlock advanced features"

**Good (HOTMESS voice):**
- "Become a regular"
- "Come close"
- "Join the family"
- "Stay tonight"

---

## Copy bank (use these, write more in this register)

### Become REGULAR
- *"Become a regular."*
- *"You're here every night. Make it real."*
- *"Stop counting boos. £9/mo."*

### Become CLOSE
- *"Come close."*
- *"For when your people matter more than the chase."*
- *"Trusted contacts, automated check-ins, voice notes. £19/mo."*

### Become CONVICT
- *"Join the family."*
- *"Phil-direct DM. Royalty share. Roadmap vote. £39/mo."*
- *"For people who shape this place."*

### Beta expiry
- *"Your two weeks are up. Stay close — £19/mo."*
- *"Your beta ended. Founding 250 forever. £19/mo to come back."*

---

## Where upgrade prompts are FORBIDDEN entirely

- During an active SOS / safety event
- During a CONNECT or TRUSTED ceremonial transition (the 1-line copy already shown)
- During an active beacon drop (post-tap, pre-publish)
- During the first 60 seconds of a fresh signup (the user is exploring; don't sell)
- On the /care, /help, /safety routes
- On the /redeem page (they're already claiming, don't double-ask)
- Inside any active chat thread

---

## Public trust loop (anti-nag, pro-belonging)

When changes ship from feedback, surface them. This is the inverse of upgrade prompts:

- **"Recently fixed"** section on /more or /care:
  - *"You asked: voice notes were laggy. We fixed it."*
  - *"You asked: cluster glow at city zoom. Live now."*
- Powered by `beta_feedback.state = 'fixed'` + `resolution_note`
- Shows last 5 items, anonymised contributor count: *"From feedback by 8 of you."*

This builds community trust faster than any upgrade prompt.

---

## Implementation gap

| Surface | Today | Locked |
|---|---|---|
| Limit-reached prompts | various, inconsistent | unified component `<TierGate>` reading `02-membership-entitlement-matrix.md` |
| Beta T-24h push | not wired | pg_cron + push (existing dispatcher) |
| Beta expired chip | not built | new persistent chip component |
| "Recently fixed" loop | not built | new section on /more reading `beta_feedback` resolved rows |
| L2MembershipSheet copy | generic | rewrite per copy bank above |
| Upgrade event tracking | partial | `upgrade_prompt_shown`, `upgrade_prompt_tapped`, `upgrade_prompt_dismissed`, `upgrade_completed` events per surface for funnel analysis |

---

## Cross-references

- `00-canonical-naming.md` — tier names + prices
- `01-relationship-permissions-matrix.md` — state-bound capabilities (orthogonal)
- `02-membership-entitlement-matrix.md` — what each tier unlocks
- `03-identity-system-spec.md` — badges + streaks + XP rules
