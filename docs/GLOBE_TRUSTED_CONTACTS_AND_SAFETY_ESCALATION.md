# Globe Trusted Contacts And Safety Escalation

Purpose: define trusted contacts, SOS escalation, emergency visibility, welfare systems, consent-safe escalation flows, and crisis protection infrastructure across HOTMESS Globe.

This document governs:

- trusted contacts;
- SOS systems;
- safety escalation;
- temporary visibility escalation;
- route sharing;
- welfare check systems;
- emergency consent handling;
- privacy protection;
- care escalation;
- crisis-state governance.

The safety system should feel:

```txt
calm, trustworthy, consent-aware, and protective
```

not:

```txt
surveillant, panic-inducing, manipulative, or theatrically dangerous
```

---

# Core philosophy

Safety systems exist to:

- protect users;
- reduce harm;
- support consent;
- support nightlife safety;
- support emotional safety;
- support crisis response;
- support queer community infrastructure.

Safety systems do NOT exist to:

- track users excessively;
- harvest sensitive movement data;
- create panic;
- simulate law-enforcement infrastructure;
- pressure oversharing.

---

# Trusted contacts philosophy

Trusted contacts are:

```txt
consent-based temporary safety relationships
```

NOT:

```txt
permanent surveillance relationships
```

Users remain:

- in control;
- visibility-aware;
- revocable;
- granular.

---

# Trusted contact capabilities

Trusted contacts MAY:

- receive SOS escalation;
- receive temporary location visibility;
- receive welfare-check notifications;
- receive route-share visibility;
- receive emergency beacon escalation;
- receive timed safety alerts.

Trusted contacts must NEVER:

- receive unrestricted tracking;
- bypass consent architecture;
- receive permanent GPS history.

---

# Trust levels

Suggested trust levels:

| Level | Capability |
|---|---|
| basic trusted | emergency notifications |
| active trusted | temporary route visibility |
| welfare trusted | timed safety check-ins |
| emergency trusted | SOS escalation access |

Trust levels should:

- remain revocable;
- remain transparent;
- remain temporary-capable.

---

# SOS philosophy

SOS systems should:

- feel calm;
- reduce panic;
- remain actionable;
- preserve user agency.

The SOS system must NOT:

- theatrically exaggerate danger;
- create public spectacle;
- expose vulnerability publicly.

---

# SOS activation flow

Recommended flow:

```txt
Hold-to-confirm
→ Optional trusted contact selection
→ Optional route share
→ Escalation timer
→ Trusted notifications
→ Safety state active
```

The system should avoid:

- accidental activation;
- panic UI;
- aggressive flashing.

---

# SOS visibility rules

SOS state visibility:

| Viewer | Visibility |
|---|---|
| public users | hidden |
| trusted contacts | allowed |
| platform safety systems | limited |
| moderators | emergency-only |

SOS states must NEVER:

- appear in discovery feeds;
- appear on district maps;
- appear in realtime public rails.

---

# Location escalation rules

Location escalation should:

- remain temporary;
- remain consent-bound;
- expire automatically;
- remain visibility-scoped.

Suggested escalation states:

```txt
No location
Approximate district
Temporary live share
Timed route share
Emergency live visibility
```

---

# Route sharing

Route sharing should:

- be opt-in;
- be temporary;
- expire automatically;
- remain trusted-only.

Users should configure:

- duration;
- visibility precision;
- trusted recipients;
- expiry behaviour.

The system must NEVER:

- preserve permanent route history publicly;
- expose travel patterns.

---

# Welfare check systems

Welfare systems should support:

- nightlife safety;
- recovery check-ins;
- meetup safety;
- post-event wellbeing.

Examples:

```txt
Check in after 2 hours?
```

```txt
Share safe arrival with trusted contact?
```

The tone must remain:

```txt
supportive rather than parental
```

---

# Safety timers

Users may enable:

- timed check-ins;
- arrival confirmations;
- route expiry timers;
- SOS countdown escalation.

Safety timers should:

- remain quiet;
- avoid panic language;
- remain cancellable.

---

# Expired safety escalation

If timers expire:

1. soft reminder;
2. second confirmation;
3. optional trusted escalation;
4. optional emergency escalation.

Escalation should:

- avoid overreaction;
- avoid false panic;
- preserve user agency.

---

# Safety beacon integration

Safety beacons may include:

```txt
Need Help
Walk With Me
Safe Ride
Trusted Meetup
Recovery Support
SOS
```

Critical rule:

public visibility differs from trusted visibility.

Public users should NEVER see:

- precise emergency states;
- exact crisis location;
- trusted escalation metadata.

---

# Care escalation

Care escalation should prioritise:

- emotional calm;
- human language;
- trust;
- de-escalation.

Good:

```txt
Support is available if needed.
```

Bad:

```txt
EMERGENCY DETECTED
```

unless genuinely critical.

---

# Moderation escalation

Moderation may access limited emergency systems when:

- credible harm risk exists;
- abuse reports escalate;
- active threats occur;
- platform safety is compromised.

Moderator access must:

- remain logged;
- remain audited;
- remain restricted.

---

# Privacy protections

Trusted contact systems must NEVER expose:

- permanent GPS history;
- historical route archives;
- hidden attendance;
- recovery participation publicly;
- sensitive movement metadata.

Emergency visibility should:

- expire automatically;
- minimize retained data.

---

# Trusted contact onboarding

Users should understand:

- what trusted contacts can see;
- how escalation works;
- expiry rules;
- emergency visibility behaviour;
- revocation controls.

The system should avoid:

```txt
confusing safety assumptions
```

---

# Emotional safety

Safety systems must avoid:

- fear theatre;
- panic amplification;
- shame;
- coercive safety prompts;
- emotional manipulation.

The system should feel:

```txt
quietly protective
```

---

# Reduced stimulation safety mode

Reduced stimulation mode should:

- simplify emergency UI;
- reduce flashing;
- reduce alarm intensity;
- reduce realtime chaos.

Safety systems should remain:

- highly legible;
- cognitively calm.

---

# Accessibility

Safety systems must support:

- screen readers;
- haptics;
- high contrast;
- reduced motion;
- large tap targets;
- keyboard accessibility.

SOS systems must remain usable:

- one-handed;
- under stress;
- with reduced visibility.

---

# Anti-surveillance policy

The platform must NEVER:

- sell location history;
- expose movement analytics publicly;
- create hidden tracking;
- preserve emergency data indefinitely;
- build behavioural surveillance profiles.

Forbidden:

```txt
Safety score
```

```txt
Movement reliability score
```

```txt
Risk ranking
```

---

# Sponsored safety policy

Sponsored systems must NEVER:

- imitate emergency alerts;
- appear inside SOS flows;
- interrupt safety escalations;
- impersonate care systems.

Safety infrastructure must remain:

```txt
commercially protected
```

---

# Suggested Supabase tables

```txt
trusted_contacts
trusted_contact_permissions
sos_sessions
safety_checkins
route_shares
emergency_visibility_states
welfare_timers
safety_escalations
emergency_audit_logs
trusted_contact_notifications
```

---

# Suggested services

```txt
src/lib/safety/TrustedContactEngine.ts
src/lib/safety/SOSEscalationService.ts
src/lib/safety/TemporaryLocationVisibility.ts
src/lib/safety/RouteShareService.ts
src/lib/safety/WelfareCheckService.ts
src/lib/safety/SafetyTimerEngine.ts
src/lib/safety/EmergencyVisibilityPolicy.ts
src/lib/safety/ModeratorEmergencyAccess.ts
src/lib/safety/ReducedStimulationSafetyAdapter.ts
```

---

# Testing requirements

## Unit tests

Test:

- trust permissions;
- route expiry;
- SOS visibility scope;
- escalation timing;
- revocation behaviour;
- audit logging;
- reduced stimulation safety flows.

## Integration tests

Test:

- exact GPS never leaks publicly;
- emergency visibility expires correctly;
- trusted permissions remain scoped;
- SOS never appears in public discovery;
- moderator emergency access logs correctly;
- route sharing expires automatically.

## E2E tests

Test:

- SOS activation works under stress;
- safety flows feel calm rather than panic-inducing;
- users understand trusted visibility;
- emergency escalation remains privacy-safe;
- safety systems work in low-connectivity environments;
- accessibility users can trigger SOS reliably.

---

# Acceptance criteria

The trusted contacts and safety escalation system succeeds when:

- users feel protected without feeling surveilled;
- trusted visibility remains consent-based;
- emergency escalation remains calm and actionable;
- exact location never leaks publicly;
- safety systems remain accessible under stress;
- emergency visibility expires automatically;
- care systems feel human rather than institutional;
- moderators cannot abuse emergency visibility;
- SOS systems remain emotionally non-theatrical;
- the Globe supports nightlife safety without becoming a surveillance platform.