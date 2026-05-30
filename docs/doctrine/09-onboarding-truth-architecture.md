# 09 — Onboarding Truth Architecture

**Status:** SKELETON locked Phil 2026-05-28. Content TODO after first observation read with onboarding-stage breakdown.
**Audience:** anyone touching the signup → first-meaningful-action flow.
**Rule:** do not open this doc to "fix onboarding." Open it to map perceived meaning. UI changes come last, not first.

---

## 1. The reframe (Phil-locked, 2026-05-28)

This is not onboarding friction. This is **threshold anxiety.**

> "Commit to exposure before understanding the rules."

That is the failure mode we are mapping. Every drop-off between signup and first meaningful action is probably one user asking themselves *"what world am I stepping into and who gets access to me now?"* — and choosing self-protection over commitment.

The product axis has shifted:

| Phase | Until 2026-05-27 | From 2026-05-28 |
|---|---|---|
| What the product needed | capability | **clarity** |
| What "shipping" looks like | new gates, layers, features | **naming, explanation, reassurance, expectation-setting** |
| What metric matters | conversion | **mental-model integrity** |
| Where the wins come from | renderer depth | **semantics** |

Semantics outperform engineering at this stage. We have enough capability. We don't yet have enough clarity.

---

## 2. The likely emotional sequence (Phil hypothesis, to be tested against data)

| Stage | What the user is probably feeling |
|---|---|
| Landing | intrigue |
| Pulse / Ghosted glimpse | activation |
| Identity creation | projection |
| Visibility implications emerge | **uncertainty** |
| Notification channel ask | **commitment anxiety** |
| Drop-off | self-protection |

The notification channel screen is not "enable notifications." It is psychologically:
- "Where may this thing reach me?"
- "How visible am I becoming?"
- "What world am I stepping into?"
- "Who gets access to me now?"

That is **identity exposure**, not settings.

---

## 3. The questions we need to ask (NOT the redesigns we need to make)

Before any UI/copy change, the answers to these must come from real users:

1. What did you think HOTMESS would do?
2. At what point did you hesitate?
3. What felt unclear?
4. What made you uncertain?
5. What did you think other people could see?
6. What made you commit (for those who got through)?

The asking mechanism is TODO — could be a 1-question post-abandon Telegram ping for opt-ins, a 6-question email to the silent-lurker cohort (see §6), or a synchronous chat with the 4 beta-claimed users. Pick after observation read.

---

## 4. What is probably unclear today (Phil hypothesis)

Best-guess list of mental-model gaps a new user lands with:

- **Beacon persistence** — how long does my beacon stay up? Who sees it after I close the app?
- **Map visibility rules** — am I a dot? Is my dot precise? Can someone find me from my beacon?
- **Who sees what** — is my profile visible to non-mutuals? Is my last-seen visible? Is my location?
- **Relationship transitions** — what changes when someone boos me back? What changes at TRUSTED?
- **Notification semantics** — who can ping me? Can I turn it off later? Is the channel choice irreversible?
- **TRUSTED implications** — what do I lose if I trust someone? What do they gain?

Each of these is a TODO answer in §5.

---

## 5. The truth matrix (TODO — fill from data + interviews, not assumptions)

For every visibility-related surface, three columns:

| Surface | What HOTMESS promises | What the user believes is happening | What is actually happening | Gap |
|---|---|---|---|---|
| Beacon drop | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| Pulse map presence | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| Ghosted card visibility | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| Profile preview to others | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| Boo (tap) | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| Mutual boo / CONNECT | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| TRUSTED transition | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| Notification channel choice | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| Beta tier expiration | _TODO_ | _TODO_ | _TODO_ | _TODO_ |

The leak is the **Gap** column.

---

## 6. The silent-lurker cohort (Phil-locked, important)

> "Silent lurkers who return repeatedly without progressing. That cohort matters enormously. They may represent curiosity with caution, nightlife observers, identity-testing users, safety-sensitive users. Those people are not failed conversions. They may be your eventual TRUSTED users."

Tracked separately from abandoned. Different intent, different success path. **Do NOT build re-engagement nudge UI for them.** They are choosing observation. The signal is for understanding, not intervention.

Cohort definition (see task #237):
- Signed in N≥2 times in the last 7 days
- Has `onboarding_abandoned` event in their history
- No `onboarding_stage_completed` past stage 2

Observation view: `obs_silent_lurkers` (TODO).

---

## 7. The entitlement-amplification risk (logged 2026-05-28)

The tier entitlement series shipped today (PR #588-#594) creates differentiated social states. Free users now see fog on Ghosted past 3 cards, get a 90s music cap, see a locked compose box, see a beacon quota toast.

For curious new users mid-onboarding, this may feel like:

> "I'm already behind."

That is the opposite of belonging — and belonging is the felt promise. Watch the abandon delta in the obs views over the next 72h. If abandon increases vs the pre-entitlement baseline, the gating may need a different presentation to newly-signed-up users (e.g. softer copy, "you're new — get a feel for it first", or delayed gating until day 2).

This is a felt-product call, not an engineering one. **Doctrine 07 visual hierarchy still rules: relationship signals outrank monetisation signals.** If onboarding contradicts that, doctrine 07 wins.

---

## 8. Process rule (Phil-locked)

When this doc reaches actionable content:

1. Read observation views FIRST. No code or copy changes before that.
2. Map perceived meaning (§5) BEFORE proposing UI/copy changes.
3. The default response to a perceived gap is **explanation**, not new UI.
4. Test re-explained surfaces against the silent-lurker cohort BEFORE redesigning for the abandoned cohort.
5. Watch for "you're already behind" amplification (§7) as a possible cause if abandon worsens.

---

## 9. What ships from this doc — and what doesn't

**Will likely ship from this work:**
- Re-named labels, expectation-setting micro-copy, onboarding screen rewrites
- One first-class screen: "What HOTMESS is and isn't" (mental model anchor)
- Per-surface visibility callouts ("X sees this when Y happens")
- TRUSTED transition explanation that runs at the moment of mutual-boo

**Will NOT ship from this work:**
- New features
- New entitlements
- New boosts
- Conversion timers, urgency prompts, premium nags
- Anything in the boost park (#225)

---

## 10. Strategic insight (Phil 2026-05-28)

> You are entering the phase where semantics outperform engineering. The biggest wins now come from naming, explanation, reassurance, expectation-setting, visibility clarity, emotional positioning. Not renderer depth. Not more surfaces. Not more boosts.

> The next breakthroughs probably won't come from shipping faster. They'll come from understanding what users *believe* HOTMESS is, before they decide whether to trust it.

This is the field-interpretation phase. Treat it accordingly.
