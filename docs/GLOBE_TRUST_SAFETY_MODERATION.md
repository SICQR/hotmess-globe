# Globe Trust Safety Moderation

Purpose: define the trust architecture, moderation systems, abuse prevention, escalation rules, crisis handling, reputation systems, enforcement pipeline, and safety governance for the HOTMESS Globe.

This document protects the ecosystem.

The Globe is:

- realtime;
- location-aware;
- socially expressive;
- nightlife-focused;
- emotionally vulnerable.

Without strong trust and safety systems, platforms like this become:

- harassment systems;
- stalking infrastructure;
- spam economies;
- unsafe meetup tools;
- manipulation engines;
- exploitation surfaces.

This architecture exists to prevent that.

---

# Core trust philosophy

The Globe should feel:

```txt
alive, expressive, consensual, protected
```

Users should feel:

- agency;
- reversibility;
- safety;
- emotional clarity;
- moderation fairness.

---

# Core safety principles

## 1. Consent is foundational

Consent governs:

- messaging;
- location precision;
- meetup escalation;
- trusted sharing;
- social visibility.

Consent must:

- be explicit;
- reversible;
- contextual;
- time-bound.

---

## 2. Safety overrides engagement

The system must prioritise:

- user wellbeing;
- crisis protection;
- moderation intervention;
- abuse prevention.

Over:

- growth;
- virality;
- monetisation;
- engagement metrics.

---

## 3. Trust is earned

Visibility and amplification should depend partly on:

- behaviour;
- moderation history;
- verification;
- community trust.

Not only:

- payment;
- popularity.

---

## 4. Safety should not destroy atmosphere

The Globe should remain:

- cinematic;
- playful;
- nightlife-oriented;
- expressive.

Safety systems should feel:

```txt
calm and invisible until needed
```

---

# Threat model

The system must actively defend against:

- stalking;
- harassment;
- outing;
- predatory meetup behaviour;
- fake events;
- ticket scams;
- spam floods;
- location triangulation;
- hate speech;
- underage misuse;
- doxxing;
- impersonation;
- coercion;
- fake SOS abuse;
- coordinated abuse;
- raid behaviour.

---

# Trust architecture

## Trust layers

```ts
export type TrustLevel =
  | 'unverified'
  | 'basic'
  | 'trusted'
  | 'verified_vendor'
  | 'moderator'
  | 'safety_operator';
```

---

# Reputation model

Trust score should consider:

- account age;
- moderation history;
- successful interactions;
- event attendance;
- reports received;
- reports confirmed;
- trusted-contact relationships;
- cancellation behaviour;
- spam signals.

---

# Reputation constraints

Reputation must NEVER become:

```txt
public social ranking
```

No:

- public scores;
- popularity ladders;
- clout gamification.

Trust is infrastructural.

Not performative.

---

# Verification systems

## Vendor verification

Vendors may verify:

- identity;
- venue ownership;
- organisation affiliation.

Verification improves:

- trust;
- beacon eligibility;
- recommendation quality.

---

## Human verification

Optional verification may support:

- anti-bot protection;
- safer meetup confidence;
- moderation quality.

Must remain:

- privacy-aware;
- optional where legally possible.

---

# Moderation layers

## Layer 1 — Automated systems

Realtime systems detect:

- spam;
- scam patterns;
- duplicate floods;
- malicious links;
- suspicious routing;
- harassment phrases;
- impersonation.

---

## Layer 2 — User reports

Users may report:

- beacons;
- users;
- messages;
- events;
- vendors;
- marketplace listings.

---

## Layer 3 — Human moderation

Human moderators review:

- escalated abuse;
- sensitive reports;
- harassment;
- impersonation;
- threats;
- coordinated abuse;
- Help/SOS misuse.

---

## Layer 4 — Safety operations

Safety operators handle:

- emergency escalation;
- crisis response;
- severe threats;
- law-enforcement requests where legally required.

---

# Moderation priority model

## Highest priority

Immediate review:

- SOS abuse;
- threats of violence;
- underage exploitation;
- stalking;
- doxxing;
- targeted harassment;
- coercion.

---

## High priority

Fast review:

- ticket scams;
- fake events;
- impersonation;
- marketplace fraud.

---

## Standard priority

Normal review:

- spam;
- duplicate posting;
- low-quality abuse;
- misleading metadata.

---

# Report flow architecture

## Canonical report flow

```txt
Report
→ Category
→ Optional evidence
→ Submit
→ Safety acknowledgement
→ Review
→ Action
```

Should be:

- fast;
- private;
- low-friction.

---

# Report categories

## Abuse

- harassment;
- hate;
- threats;
- coercion.

---

## Safety

- stalking;
- unsafe meetup;
- fake emergency;
- predatory behaviour.

---

## Fraud

- fake ticket;
- scam;
- fake vendor;
- counterfeit item.

---

## Content

- spam;
- duplicate posting;
- misleading event;
- inappropriate media.

---

# Enforcement actions

## Soft actions

- deprioritisation;
- visibility reduction;
- warning;
- cooldown;
- publish limits.

---

## Hard actions

- beacon removal;
- temporary suspension;
- account restriction;
- vendor removal;
- permanent ban.

---

## Safety actions

- SOS isolation;
- emergency escalation;
- law-enforcement preservation requests where legally required.

---

# Progressive enforcement

The system should prefer:

```txt
progressive intervention before permanent punishment
```

Except for:

- predatory behaviour;
- exploitation;
- severe threats;
- underage abuse.

---

# Beacon moderation

Beacons may be:

- hidden;
- deprioritised;
- collapsed into stacks;
- rate-limited;
- removed.

Moderation state should propagate realtime.

---

# Vendor governance

Vendor systems require:

- stricter moderation;
- fraud prevention;
- sponsorship disclosure;
- escalation paths.

---

# Ticket safety

Ticket systems should:

- discourage scalping;
- detect repeated scams;
- flag suspicious pricing;
- limit mass reposting.

---

# Marketplace safety

Preloved systems should:

- encourage safe meetup zones;
- discourage home exposure;
- detect suspicious listings;
- rate-limit spam reposts.

---

# Messaging safety

Messaging systems should support:

- block;
- mute;
- report;
- trust downgrade;
- consent withdrawal.

---

# Block system

Blocking should:

- remove proximity surfacing;
- remove visibility;
- remove interaction routes;
- remove trust relationships.

Immediately.

---

# Shadow restriction systems

The system may silently restrict:

- spam floods;
- malicious amplification;
- bot-like behaviour.

Without public humiliation.

---

# Anti-dogpiling protections

The system should avoid:

- mob visibility;
- viral harassment;
- quote-pile abuse.

Especially around:

- crisis states;
- Help/SOS;
- moderation events.

---

# Underage protections

The Globe is:

```txt
18+ only
```

Systems should:

- discourage underage onboarding;
- escalate suspicious behaviour;
- restrict unsafe interactions.

---

# Recovery and care protections

NA/AA and recovery participation must remain:

- privacy-protected;
- non-performative;
- non-searchable publicly.

---

# Help and SOS governance

Help and SOS systems require:

- elevated moderation priority;
- audit logging;
- restricted visibility;
- anti-abuse heuristics.

---

# Fake SOS abuse prevention

Detect:

- repeated false alarms;
- spam activation;
- coordinated misuse.

But:

```txt
never punish uncertainty during genuine distress
```

Very important.

---

# Emotional safety design

Safety messaging should feel:

- calm;
- direct;
- human;
- non-punitive where possible.

Avoid:

```txt
corporate punishment language
```

---

# Moderation transparency

Users should understand:

- what happened;
- why action occurred;
- what they can do next.

---

# Appeals system

Users should be able to:

- appeal moderation;
- request review;
- clarify misunderstandings.

Except where:

- severe exploitation;
- legal requirements;
- immediate danger.

---

# Audit logging

Sensitive actions should log:

- moderator;
- timestamp;
- action;
- reason;
- escalation source.

---

# Internal moderation tooling

Moderators require:

- scoped access;
- audit visibility;
- privacy-safe tooling;
- evidence systems;
- escalation controls.

---

# Moderator wellbeing

Moderation systems should minimise:

- unnecessary exposure;
- trauma overload;
- graphic escalation.

Use:

- staged reveal;
- blurred previews;
- rotation systems.

---

# AI moderation policy

AI moderation may:

- assist prioritisation;
- classify spam;
- detect abuse patterns.

AI moderation may NOT:

- become sole authority for severe punishment;
- expose sensitive private data unnecessarily.

---

# Crisis response principles

During crisis:

- safety overrides engagement;
- moderation escalation accelerates;
- visibility narrows;
- audit logging increases.

---

# Location safety integration

Trust and safety systems integrate with:

```txt
GLOBE_PRIVACY_LOCATION_POLICY.md
```

Including:

- precision downgrade;
- trust revocation;
- blocked-user isolation;
- SOS visibility.

---

# Realtime moderation propagation

Moderation actions should propagate instantly:

- remove harmful beacons;
- update stacks;
- invalidate cached visibility;
- remove routing.

---

# Supabase and RLS governance

Sensitive tables should require:

- role-based access;
- audit logging;
- restricted moderator scopes.

---

# Suggested moderation tables

```txt
moderation_reports
moderation_actions
moderation_evidence
trust_scores
vendor_verifications
safety_incidents
blocked_relationships
appeals
```

---

# Rate limiting and abuse prevention

Protect against:

- report spam;
- beacon floods;
- fake account waves;
- realtime abuse bursts.

---

# Notification safety

Notifications must avoid:

- outing risk;
- crisis oversharing;
- harassment amplification.

---

# Accessibility and safety

Safety systems must remain:

- keyboard accessible;
- screenreader compatible;
- motion-safe.

---

# Legal and compliance support

Support:

- GDPR;
- UK GDPR;
- lawful deletion/export;
- legal preservation where required.

---

# Implementation targets

Create/refactor toward:

```txt
src/lib/trust/TrustScoreEngine.ts
src/lib/trust/VerificationService.ts
src/lib/moderation/ModerationPipeline.ts
src/lib/moderation/RealtimeModerationBus.ts
src/lib/moderation/AbuseDetectionEngine.ts
src/lib/moderation/ReportProcessingService.ts
src/lib/moderation/EnforcementPolicy.ts
src/lib/moderation/AppealsService.ts
src/lib/safety/SOSProtectionEngine.ts
src/lib/safety/ThreatDetectionService.ts
src/lib/safety/ModeratorAuditService.ts
src/components/safety/ReportSheet.tsx
src/components/safety/BlockUserDialog.tsx
src/components/safety/SafetyCenter.tsx
src/components/safety/ModerationStatusSheet.tsx
```

---

# Testing requirements

## Unit tests

Test:

- trust scoring;
- block propagation;
- moderation visibility;
- abuse detection;
- escalation logic.

## Integration tests

Test:

- realtime beacon removal;
- SOS isolation;
- report handling;
- blocked-user visibility removal;
- moderation audit logging.

## E2E tests

Test:

- reports submit successfully;
- blocked users disappear immediately;
- Help/SOS remains protected;
- moderation propagates realtime;
- spam floods get rate-limited;
- appeals function correctly;
- recovery participation remains private.

---

# Acceptance criteria

The trust and safety system succeeds when:

- the Globe feels expressive but protected;
- consent remains foundational;
- abuse is rapidly contained;
- moderation feels fair and human;
- Help/SOS systems remain trustworthy;
- vendors and marketplaces avoid scam collapse;
- spam cannot dominate dense districts;
- trust improves visibility without becoming clout;
- recovery participation stays protected;
- blocked users disappear immediately;
- realtime moderation propagates cleanly;
- nightlife atmosphere survives without becoming chaos.