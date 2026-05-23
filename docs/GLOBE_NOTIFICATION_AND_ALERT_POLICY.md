# Globe Notification And Alert Policy

Purpose: define how notifications, alerts, nudges, realtime prompts, and urgency systems behave across the HOTMESS Globe.

This document governs:

- push notifications;
- in-app alerts;
- realtime nudges;
- beacon alerts;
- social notifications;
- safety alerts;
- quiet modes;
- urgency policy;
- notification batching;
- emotional load management.

The Globe should feel:

```txt
alive, caring, ambient, and respectful
```

not:

```txt
addictive, manipulative, frantic, or guilt-driven
```

---

# Core philosophy

Notifications are:

```txt
assistive infrastructure
```

not:

```txt
attention extraction systems
```

The product must avoid:

- dopamine farming;
- anxiety loops;
- unread pressure;
- re-engagement addiction;
- fake urgency;
- manipulative streak mechanics;
- social shame mechanics.

---

# Non-negotiable anti-gamification policy

Notifications must NEVER:

- create streak pressure;
- create leaderboard urgency;
- create popularity competition;
- shame inactivity;
- punish absence;
- exploit loneliness;
- manufacture FOMO dishonestly.

Forbidden examples:

```txt
You are missing out
```

```txt
Everybody is here except you
```

```txt
Your beacon is losing attention
```

```txt
3 people ignored you
```

---

# Notification hierarchy

Priority order:

| Category | Priority |
|---|---:|
| trusted safety | critical |
| emergency support | critical |
| care / wellbeing | high |
| direct social interaction | medium |
| selected event updates | medium |
| saved beacon changes | medium |
| radio/live content | low-medium |
| market/preloved | low |
| promotional | lowest |

Rules:

- care outranks commerce;
- safety overrides all batching;
- promotional messaging must stay sparse.

---

# Notification categories

## Safety notifications

Examples:

- trusted contact alert;
- route-share escalation;
- active SOS confirmation;
- safety check-in.

Rules:

- bypass batching where required;
- bypass quiet mode where authorised;
- must remain calm and clear;
- never become panic theatre.

Good:

```txt
Your trusted contact shared a safety update
```

Bad:

```txt
EMERGENCY!!!
```

unless genuinely necessary.

---

## Care notifications

Examples:

- nearby support availability;
- aftercare reminders;
- sober-safe routes;
- Hand N Hand support windows.

Rules:

- gentle tone;
- low-frequency;
- never guilt-driven.

Good:

```txt
Support is nearby if you need it
```

Bad:

```txt
You should really check in
```

---

## Social notifications

Examples:

- Boo received;
- message received;
- mutual interaction;
- profile response.

Rules:

- no popularity framing;
- no social-score language;
- no pressure mechanics.

Good:

```txt
Someone replied to your Chill signal
```

Bad:

```txt
Your profile is trending
```

---

## Event notifications

Examples:

- event starting soon;
- ticket update;
- saved venue activity;
- entry change.

Rules:

- only for opted/saved/relevant events;
- avoid spam bursts;
- suppress duplicate updates.

---

## Market/preloved notifications

Lowest priority.

Rules:

- heavily rate limited;
- digest-first;
- no hype manipulation;
- no fake scarcity.

Forbidden:

```txt
SELLING FAST!!!
```

unless actually verified.

---

# Notification channels

Supported channels:

```txt
push
in-app
badge
email
digest
live banner
quiet rail
trusted-contact override
```

Rules:

- not every event deserves push;
- push is expensive emotionally;
- badge counts should remain calm.

---

# Badge policy

Badge counts should avoid anxiety loops.

Avoid:

- giant unread numbers;
- flashing urgency;
- red panic systems.

Preferred:

- soft indicators;
- grouped summaries;
- contextual prioritisation.

---

# Notification batching

The system should batch aggressively.

Examples:

Instead of:

```txt
8 separate venue updates
```

Use:

```txt
Several saved places are active tonight
```

Batch windows:

| Category | Suggested batch window |
|---|---:|
| social | 1–5m |
| events | 5–15m |
| market | 15–60m |
| radio | 15–30m |
| care | contextual |
| safety | immediate |

---

# Realtime interruption policy

Realtime should not constantly interrupt.

Use interruption only when:

- explicitly selected;
- safety relevant;
- direct social interaction;
- event timing matters;
- trusted escalation exists.

Avoid:

- passive presence interruptions;
- constant nearby updates;
- density spam.

---

# Notification freshness policy

Notifications must remain honest.

Good:

```txt
Recently active nearby
```

Bad:

```txt
Live now
```

without actual proof.

Expired signals should:

- quietly disappear;
- downgrade;
- avoid resurrection spam.

---

# Globe-specific alerts

## District activity

Allowed:

```txt
Soho is warm tonight
```

Forbidden:

```txt
Everyone is at Soho right now
```

---

## Chill beacon

Allowed:

```txt
New Chill signal nearby
```

Forbidden:

```txt
Someone is waiting for you nearby
```

---

## Event beacon

Allowed:

```txt
Your saved event starts in 30 minutes
```

Forbidden:

```txt
You are late
```

---

# Ghosted chat notifications

Ghosted chat should feel soft.

Allowed:

```txt
New message from nearby connection
```

```txt
Conversation reopened
```

Avoid:

- read pressure;
- online surveillance;
- typing obsession;
- guilt prompts.

Forbidden:

```txt
They saw your message and did not respond
```

---

# Boo notifications

Boo should feel lightweight.

Allowed:

```txt
Someone boo’d your signal
```

Avoid:

- counts;
- popularity framing;
- engagement pressure.

Forbidden:

```txt
Your beacon is getting attention
```

---

# Quiet mode

Users must have:

- quiet hours;
- low-stimulation mode;
- reduced interruptions;
- market mute;
- nightlife mute;
- social mute;
- digest-only mode.

Safety exceptions:

- trusted contact alerts;
- explicit emergency escalation.

---

# Reduced stimulation mode

Reduced stimulation mode should:

- suppress non-essential push;
- reduce animations;
- reduce banners;
- reduce urgency language;
- favour digest summaries.

This mode is especially important for:

- ADHD;
- anxiety;
- recovery;
- sensory overload;
- burnout.

---

# Sleep protection

System should avoid:

- late-night spam;
- repeated wakeups;
- unnecessary nightlife escalation.

Respect:

- local timezone;
- quiet hours;
- user sleep settings.

---

# Presence privacy

Notifications must NEVER expose:

- exact GPS;
- route trails;
- hidden attendance;
- recovery participation;
- trusted contact data;
- SOS state publicly.

Forbidden:

```txt
Phil is 80 metres away
```

---

# Emotional safety policy

The system must avoid:

- rejection amplification;
- abandonment anxiety;
- unread pressure;
- jealousy mechanics;
- competitive visibility;
- social scarcity manipulation.

Notifications should feel:

```txt
informative rather than emotionally coercive
```

---

# Notification copy rules

Preferred tone:

- calm;
- direct;
- warm;
- low-pressure;
- human.

Avoid:

- clickbait;
- panic;
- guilt;
- artificial hype;
- manipulative urgency.

---

# Sponsored notification policy

Sponsored notifications:

- require explicit opt-in;
- must be clearly labelled;
- must stay low-frequency;
- cannot mimic safety or care.

Forbidden:

- fake community urgency;
- disguised ads;
- deceptive "nearby people" tactics.

---

# Digest system

Digest-first philosophy preferred.

Digest examples:

```txt
Tonight around Soho:
2 events
1 Chill signal
Radio live nearby
```

Digest should:

- summarise calmly;
- reduce interruption frequency;
- reduce notification fatigue.

---

# Notification suppression engine

System should suppress:

- duplicates;
- stale alerts;
- expired beacons;
- spam bursts;
- repetitive social prompts;
- repeated market nudges.

---

# Escalation policy

Escalation allowed only for:

- safety;
- explicit trusted contact states;
- active route share risk;
- confirmed emergency flows.

Escalation should:

- remain calm;
- remain actionable;
- avoid panic theatre.

---

# Accessibility

Must support:

- screen readers;
- reduced motion;
- reduced stimulation;
- high contrast;
- digest alternatives;
- notification summaries.

Notifications should never rely only on:

- colour;
- vibration;
- flashing animation.

---

# Suggested Supabase tables

```txt
notification_events
notification_preferences
notification_delivery_queue
notification_suppression
notification_digests
notification_reads
notification_batches
notification_quiet_hours
notification_device_tokens
trusted_contact_alerts
```

---

# Suggested services

```txt
src/lib/notifications/NotificationPolicyEngine.ts
src/lib/notifications/NotificationBatcher.ts
src/lib/notifications/NotificationSuppressionEngine.ts
src/lib/notifications/NotificationDigestBuilder.ts
src/lib/notifications/NotificationPriorityRouter.ts
src/lib/notifications/QuietHoursEngine.ts
src/lib/notifications/ReducedStimulationAdapter.ts
src/lib/notifications/SafetyEscalationService.ts
src/lib/notifications/NotificationCopyPolicy.ts
```

---

# Testing requirements

## Unit tests

Test:

- priority ordering;
- batching;
- suppression rules;
- quiet hours;
- reduced stimulation mode;
- escalation permissions;
- duplicate prevention.

## Integration tests

Test:

- care outranks market;
- stale alerts suppress;
- safety bypasses batching;
- quiet mode suppresses nightlife spam;
- sponsored notifications labelled correctly;
- digest summarises correctly.

## E2E tests

Test:

- users do not receive notification floods;
- Ghosted chat remains low-pressure;
- exact GPS never leaks;
- reduced stimulation materially reduces interruptions;
- emergency escalation works correctly;
- unread anxiety patterns do not emerge.

---

# Acceptance criteria

The notification system succeeds when:

- notifications feel useful rather than addictive;
- users are informed without emotional exhaustion;
- care remains above commerce;
- social interaction stays low-pressure;
- exact location never leaks;
- notification fatigue stays low;
- alerts remain honest and contextual;
- quiet mode materially changes experience;
- sponsored messaging never dominates;
- safety escalation works instantly when needed;
- the Globe feels alive without becoming psychologically manipulative.