# Globe Beacon Reputation And Spam Control

Purpose: define beacon reputation systems, spam prevention, abuse throttling, trust weighting, behavioural governance, and anti-manipulation infrastructure across HOTMESS Globe.

This document governs:

- beacon trust systems;
- spam prevention;
- abuse mitigation;
- behavioural throttling;
- beacon credibility;
- density abuse;
- fake activity prevention;
- monetisation boundaries;
- moderation weighting;
- realtime abuse handling.

The system should feel:

```txt
calm, fair, lightweight, and quietly protective
```

not:

```txt
punitive, gamified, socially humiliating, or surveillance-heavy
```

---

# Core philosophy

Reputation systems exist to:

- reduce spam;
- reduce manipulation;
- improve signal quality;
- improve trust;
- preserve readability;
- protect local discovery;
- preserve emotional safety.

Reputation systems do NOT exist to:

- publicly score humans;
- create social hierarchy;
- reward popularity;
- create hidden desirability systems;
- punish socially awkward behaviour.

---

# Critical anti-gamification rule

There must NEVER be:

- public reputation scores;
- visible trust rankings;
- creator tiers;
- influencer ladders;
- beacon karma;
- social credit systems.

Forbidden:

```txt
Top beacon creator
```

```txt
Elite nightlife status
```

```txt
Trust score: 98
```

---

# Reputation philosophy

Beacon reputation should operate as:

```txt
invisible trust infrastructure
```

NOT:

```txt
public social status
```

The system should quietly:

- suppress abuse;
- preserve quality;
- preserve calmness.

---

# Signal integrity principles

Good beacon systems should:

- feel human;
- feel contextual;
- feel sparse enough to read;
- remain emotionally breathable.

Beacon systems should NOT:

- become attention warfare;
- become visibility competition;
- become spam economies.

---

# Beacon reputation weighting

Internal weighting MAY consider:

| Factor | Allowed |
|---|---|
| spam reports | yes |
| moderation history | yes |
| repeated abuse patterns | yes |
| beacon expiry behaviour | yes |
| duplicate beacon frequency | yes |
| fake-event behaviour | yes |
| trusted interaction history | yes |
| verified venue linkage | yes |
| density abuse | yes |

---

# Forbidden reputation factors

The system must NEVER use:

| Factor | Forbidden |
|---|---|
| attractiveness | yes |
| body type | yes |
| wealth signalling | yes |
| public Boo count | yes |
| social popularity | yes |
| nightlife desirability | yes |
| follower counts | yes |
| engagement addiction metrics | yes |

---

# Beacon credibility states

Suggested internal states:

```txt
Normal
Low confidence
Rate limited
Restricted
Moderated
Trusted venue-linked
Emergency protected
```

These states must remain:

```txt
non-public
```

---

# Spam prevention philosophy

Spam systems should:

- quietly reduce abuse;
- preserve calmness;
- avoid false shame;
- avoid aggressive punishment theatre.

The user experience should avoid:

```txt
public humiliation mechanics
```

---

# Beacon creation throttles

The system may limit:

- beacon frequency;
- simultaneous active beacons;
- repeated duplicate beacons;
- district saturation;
- rapid reposting.

Suggested examples:

| Beacon Type | Suggested Concurrent Limit |
|---|---|
| Chill | 1 |
| Event | 3 |
| Ticket | 2 |
| Preloved | 5 |
| SOS | unlimited emergency |
| Need Help | protected |

Limits should remain:

- adaptive;
- contextual;
- moderation-aware.

---

# Density abuse prevention

The system should prevent:

- beacon flooding;
- local map saturation;
- fake district energy;
- spam swarms.

Dense areas should aggregate rather than stack infinitely.

Preferred:

```txt
Several active nearby signals
```

NOT:

```txt
132 overlapping spam nodes
```

---

# Duplicate detection

The system may detect:

- repeated identical beacons;
- repeated repost patterns;
- repetitive venue spam;
- cloned event behaviour.

Suppression should remain:

```txt
quiet and mostly invisible
```

---

# Fake event prevention

Event beacons may require:

- venue validation;
- ticket validation;
- temporal consistency;
- moderation review;
- trust history.

The system should detect:

- fake parties;
- scam tickets;
- repeated no-show events;
- phishing behaviour.

---

# Venue-linked trust

Verified venues may receive:

- increased beacon stability;
- improved visibility confidence;
- reduced duplicate suppression.

This must NEVER become:

```txt
pay-to-dominate visibility
```

---

# Monetisation boundaries

Boost systems MAY:

- extend beacon duration;
- improve district visibility lightly;
- improve event discovery placement.

Boost systems must NEVER:

- override safety suppression;
- bypass moderation;
- fake local activity;
- simulate popularity;
- dominate local districts.

Forbidden:

```txt
pay to trend
```

---

# Behavioural abuse detection

The system may detect:

- harassment swarms;
- beacon griefing;
- impersonation;
- fake SOS misuse;
- coordinated spam;
- beacon bait scams.

The system should prioritise:

- quiet intervention;
- moderation escalation;
- trust preservation.

---

# Fake SOS protections

SOS misuse is critical abuse.

The system may:

- throttle repeated misuse;
- escalate moderator review;
- temporarily restrict emergency access.

The system must avoid:

- blocking genuine emergencies;
- punitive overreaction.

---

# Moderation weighting

Moderation systems may:

- reduce beacon visibility;
- suppress abusive beacons;
- throttle spam clusters;
- restrict fake-event propagation.

Moderation should remain:

```txt
calm and minimally theatrical
```

---

# Reputation decay

Negative weighting should decay over time.

The system should support:

- recovery;
- behavioural improvement;
- mistake tolerance;
- temporary restriction expiry.

The system should avoid:

```txt
permanent invisible punishment
```

---

# Ghosted chat abuse prevention

The system may detect:

- message spam;
- repeated unsolicited reopening;
- harassment persistence;
- beacon-message bait loops.

Ghosted systems should:

- prioritise emotional calm;
- minimise social pressure.

---

# Discovery suppression

Low-confidence beacons may:

- appear less frequently;
- decay faster;
- aggregate earlier;
- require additional validation.

Suppression should remain:

```txt
mostly invisible to normal users
```

---

# Reduced stimulation considerations

Spam systems should reduce:

- beacon chaos;
- duplicate flicker;
- realtime visual overload;
- pulse saturation.

Reduced stimulation users should experience:

```txt
cleaner and calmer districts
```

---

# Accessibility

Abuse-prevention systems must NOT:

- rely only on colour;
- create chaotic warning overlays;
- trigger flashing moderation states.

Moderation messaging should remain:

- calm;
- readable;
- non-shaming.

---

# Privacy protections

Reputation systems must NEVER:

- publicly expose moderation weighting;
- expose trust calculations;
- expose hidden behaviour analysis;
- expose spam scores.

Users must NEVER see:

```txt
This person is low trust
```

---

# Anti-surveillance governance

The system must NEVER become:

- behavioural scoring infrastructure;
- predictive policing;
- emotional surveillance;
- hidden social ranking.

Forbidden:

```txt
Likely unsafe user
```

unless legally required in critical emergency escalation.

---

# Suggested Supabase tables

```txt
beacon_reputation
beacon_rate_limits
beacon_spam_events
beacon_visibility_weights
beacon_moderation_states
beacon_density_aggregates
beacon_duplicate_clusters
beacon_trust_history
beacon_suppression_events
beacon_boosts
```

---

# Suggested services

```txt
src/lib/beacons/BeaconReputationEngine.ts
src/lib/beacons/BeaconSpamDetectionService.ts
src/lib/beacons/BeaconDensityProtection.ts
src/lib/beacons/BeaconDuplicateDetector.ts
src/lib/beacons/BeaconModerationWeighting.ts
src/lib/beacons/BeaconTrustDecayService.ts
src/lib/beacons/BeaconBoostPolicy.ts
src/lib/beacons/BeaconSuppressionEngine.ts
src/lib/beacons/FakeSOSProtection.ts
```

---

# Testing requirements

## Unit tests

Test:

- rate limits;
- duplicate detection;
- boost boundaries;
- suppression weighting;
- moderation escalation;
- trust decay;
- density protection.

## Integration tests

Test:

- spam floods aggregate correctly;
- fake events suppress correctly;
- SOS suppression never blocks emergencies;
- monetisation never bypasses moderation;
- exact reputation remains private;
- district readability survives spam density.

## E2E tests

Test:

- local districts remain calm under spam load;
- beacon flooding becomes difficult;
- legitimate events remain visible;
- reduced stimulation users experience cleaner districts;
- moderation feels non-theatrical;
- the Globe never feels like clout infrastructure.

---

# Acceptance criteria

The beacon reputation and spam-control system succeeds when:

- spam becomes difficult and unrewarding;
- local districts remain readable;
- reputation remains invisible and non-humiliating;
- moderation stays calm and privacy-safe;
- monetisation cannot overpower trust systems;
- fake events decay quickly;
- SOS misuse remains contained without harming genuine emergencies;
- reduced stimulation users experience calmer map density;
- popularity never becomes visibility infrastructure;
- the Globe feels human rather than algorithmically competitive.