# Globe Beacon Monetisation And Boost Policy

Purpose: define how beacon boosts, paid visibility, vendor offerings, sponsored placement, subscriptions, and partner monetisation work without turning the Globe into an ad board, game layer, or pay-to-win map.

This policy is grounded in the existing Globe docs:

- boosts may improve discovery, stack priority, recommendation weight, and district visibility;
- boosts may slightly extend active discovery time inside hard caps;
- boosts must not create giant markers;
- boosts must not bypass moderation, privacy, density, accessibility, or safety policy;
- cancelled beacons revoke boosts;
- reported or hidden beacons lose promotional behaviour;
- Help, SOS, trusted-contact safety, and emergency escalation are never monetised.

---

## Core philosophy

Boosting should feel like:

```txt
adding energy to the city
```

NOT:

```txt
buying the skyline
```

Monetisation exists to support:

- independent operators;
- venues;
- creators;
- event partners;
- HOTMESS RADIO integrations;
- care-aware vendor systems;
- platform sustainability.

Monetisation must never damage:

- trust;
- readability;
- safety;
- privacy;
- accessibility;
- cultural credibility.

---

## Non-negotiables

Boosts must NEVER:

- override Help or SOS priority;
- expose private location;
- bypass RLS or visibility policy;
- bypass moderation;
- bypass density budgets;
- create giant pins;
- hijack camera movement;
- imitate care or safety systems;
- create fake urgency;
- create public popularity scores;
- become XP, ranks, streaks, or clout.

---

## Existing boost contract

The existing boost contract is:

| Boost effect | Allowed? |
|---|---|
| increase discovery | yes |
| improve stack order | yes |
| improve recommendation probability | yes |
| increase district visibility | yes |
| slight time extension | yes, capped |
| bigger marker tower | no |
| safety override | no |
| moderation bypass | no |
| camera takeover | no |
| fake trending | no |

---

## Boost types

### Discovery Boost

Purpose:
- make a valid beacon easier to discover.

Allowed effects:
- appears in more nearby surfaces;
- improves rail eligibility;
- improves stack ordering.

Forbidden effects:
- no forced push spam;
- no map domination.

---

### District Boost

Purpose:
- support district-level cultural visibility.

Allowed effects:
- contributes lightly to district warmth;
- improves district stack placement;
- helps event/venue surface in relevant area.

Forbidden effects:
- no district takeover;
- no suppression of independents;
- no fake local activity.

---

### Time Extension

Purpose:
- keep a beacon discoverable slightly longer.

Rules:
- hard caps enforced;
- extension cannot bypass expiry/cancellation;
- extension cannot apply to safety/SOS;
- stale beacons still decay.

---

### Momentum Boost

Purpose:
- help a strong signal reach relevant people faster.

Rules:
- cannot force trending;
- cannot manufacture popularity;
- cannot use Boo/message counts publicly.

---

## Eligible beacon types

| Beacon type | Monetisation eligibility |
|---|---|
| Event | eligible |
| Ticket | eligible with anti-scam checks |
| Venue | eligible with verification |
| Creator | eligible |
| Radio | eligible through editorial/partner package |
| Preloved | eligible with limits |
| Vendor | eligible |
| Chill | limited, user-safe only |
| Care | carefully governed, no exploitative placement |
| Help | never |
| SOS | never |
| Trusted safety | never |
| Recovery support | not commercially amplified |

---

## HOTMESS vendor offerings

Founding commercial offerings should stay restrained and useful.

| Offering | Purpose | Guardrail |
|---|---|---|
| boosted event beacon | temporary event discovery | no giant marker |
| district sponsorship | light cultural presence | no takeover |
| radio integration | HOTMESS RADIO cross-promotion | cultural, not spammy |
| guestlist sync | event access coordination | no fake scarcity |
| ticket integration | realtime ticket status | anti-scam checks |
| venue profile | trusted venue identity | no dominance guarantee |
| aftercare integration | wellbeing links | no panic marketing |
| accessibility tagging | useful venue metadata | not premium-only |
| preloved drop | fashion/archive activation | capped visibility |

---

## Pricing model policy

Pricing may vary by:

- beacon type;
- duration;
- district demand;
- verified partner status;
- city saturation;
- moderation risk;
- campaign package.

Pricing must not vary by:

- user desirability;
- body/appearance;
- social popularity;
- public Boo counts;
- vulnerability state;
- safety need.

---

## Subscription relationship

Vendor quotas may depend on:

- verification;
- subscription level;
- trust history;
- moderation state;
- city saturation.

Subscriptions may grant:

- more draft capacity;
- more scheduled beacons;
- analytics access;
- guestlist/ticket integrations;
- profile tools;
- support response priority.

Subscriptions may not grant:

- safety override;
- privacy override;
- moderation immunity;
- district dominance;
- hidden ad placement.

---

## Boost purchase flow

Canonical flow:

```txt
Select beacon
→ Check eligibility
→ Preview boost effect
→ Show disclosure
→ Confirm price
→ Apply boost
→ Monitor policy
→ Expire/revoke cleanly
```

Preview must show:

- what changes;
- what does not change;
- duration;
- disclosure;
- cancellation/revocation rules.

---

## Revocation rules

Boosts revoke immediately when:

- beacon is cancelled;
- beacon expires;
- beacon is reported and held;
- moderation hides beacon;
- payment fails;
- privacy status changes;
- density/safety policy blocks display.

Refund/credit handling should be explicit in product/legal terms.

---

## Density interaction

Boosts operate inside density budgets.

In dense areas, boosts may:

- raise stack placement;
- improve category order;
- appear in relevant rails;
- contribute to district warmth.

Boosts may not:

- bypass clustering;
- add extra visible markers over budget;
- inflate marker size;
- force local map clutter.

---

## Disclosure policy

Sponsored or paid visibility must be clear.

Allowed labels:

```txt
Sponsored
Partner
Boosted
HOTMESS partner
```

Disclosure must be:

- visible;
- calm;
- non-shaming;
- not hidden in metadata.

Paid placement must never imitate:

- care prompts;
- trusted-contact alerts;
- SOS;
- moderation notices.

---

## Notification policy

Boosts may not create notification spam.

Allowed:

- saved event update;
- opted-in partner digest;
- ticket status change;
- district digest inclusion.

Forbidden:

- fake urgency;
- repeated commercial push;
- countdown manipulation;
- lockscreen location leakage;
- loneliness/FOMO pressure.

---

## Analytics policy

Partners may receive aggregate analytics only.

Allowed metrics:

- impressions;
- saves;
- opens;
- route taps;
- ticket taps;
- stack position;
- boost spend;
- conversion events;
- cancellation/expiry state.

Forbidden analytics:

- exact user GPS;
- recovery participation;
- Help/SOS behaviour;
- private route trails;
- individual attendance unless explicitly consented;
- Ghosted chat contents.

---

## Supabase alignment

The existing docs already expect:

```txt
beacon_boosts
beacon_analytics
beacon_visibility
beacon_trust_scores
beacon_reports
```

Additional monetisation tables may include:

```txt
boost_products
boost_orders
boost_entitlements
boost_refunds
vendor_subscriptions
sponsored_placements
partner_campaigns
payment_events
```

---

## Service alignment

Existing implementation target:

```txt
src/lib/beacons/BeaconBoostEngine.ts
```

Suggested additional services:

```txt
src/lib/monetisation/BoostEligibilityEngine.ts
src/lib/monetisation/BoostPricingEngine.ts
src/lib/monetisation/BoostPurchaseService.ts
src/lib/monetisation/BoostRevocationService.ts
src/lib/monetisation/SponsoredDisclosurePolicy.ts
src/lib/monetisation/VendorSubscriptionPolicy.ts
src/lib/monetisation/PartnerAnalyticsGuard.ts
```

---

## Testing requirements

### Unit tests

Test:
- boost eligibility;
- pricing rules;
- revocation rules;
- disclosure labels;
- density budget compliance;
- safety exclusion;
- moderation exclusion.

### Integration tests

Test:
- cancelled beacon revokes boost;
- reported beacon loses boost;
- dense district keeps marker budgets;
- boosted market remains below care;
- partner analytics never expose GPS;
- failed payment removes entitlement.

### E2E tests

Test:
- partner buys boost and sees honest preview;
- boosted beacon appears higher in stack, not larger on map;
- Help/SOS cannot be boosted;
- sponsored content is disclosed;
- reduced stimulation mode suppresses boost animation;
- monetisation never dominates local discovery.

---

## Acceptance criteria

This policy succeeds when:

- boosts feel useful but subtle;
- monetisation supports culture without controlling it;
- partners understand what they are buying;
- users understand what is sponsored;
- dense districts remain readable;
- safety and care remain protected;
- boosts never become gamification;
- paid visibility never becomes pay-to-win;
- HOTMESS makes money without selling the skyline.