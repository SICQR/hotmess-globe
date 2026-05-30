# Globe Ghosted Chat System

Purpose: define how Ghosted chat works across the HOTMESS Globe.

This document defines:

- beacon-to-chat flows;
- privacy-safe messaging;
- temporary social context;
- consent escalation;
- ghosting behaviour;
- visibility scopes;
- anti-harassment controls;
- realtime chat orchestration.

Ghosted chat is not a traditional social inbox.

It should feel:

```txt
soft-entry, low-pressure, contextual, and safely disposable
```

The system must reduce:

- social pressure;
- location exposure;
- unwanted persistence;
- inbox accumulation;
- stalking vectors;
- identity coercion.

---

# Core philosophy

Ghosted chat exists because:

```txt
not every interaction should become a permanent social relationship
```

The Globe is ambient.

Chat should begin from:

- context;
- moment;
- signal;
- vibe;
- proximity intent;
- shared interest;

not forced social permanence.

---

# Core rules

Ghosted chat must:

- minimise exposure;
- minimise pressure;
- minimise permanence;
- minimise spam;
- minimise triangulation;
- respect blocks instantly;
- respect visibility scopes;
- fail quiet where uncertain.

Ghosted chat must NOT:

- expose exact GPS;
- expose hidden identities;
- expose recovery participation;
- expose Help/SOS state;
- become a public social graph;
- become popularity infrastructure.

---

# Canonical interaction flow

```txt
Globe beacon
→ Beacon card
→ Profile preview
→ Boo or Message
→ Ghosted chat create/open
→ Temporary contextual conversation
→ Expire / continue / escalate
```

---

# Chat entry points

Ghosted chat may start from:

- person beacon;
- chill beacon;
- event beacon;
- ticket beacon;
- preloved drop;
- venue signal;
- profile preview;
- mutual Boo;
- shared radio interaction;
- approved care route.

Ghosted chat must NOT start automatically from:

- passive map proximity;
- exact location overlap;
- SOS/help events;
- hidden recovery participation.

---

# Beacon → chat flow

## Step 1 — Beacon click

User taps beacon.

Beacon card shows:

- safe context;
- freshness;
- approximate area;
- profile availability;
- consent cues;
- CTA options.

Allowed CTAs:

- `View profile`
- `Boo`
- `Message`
- `Save`
- `Hide`
- `Report`

---

## Step 2 — Profile preview

Profile preview may reveal:

- name/alias;
- profile media;
- selected interests;
- vibe tags;
- public bio;
- social intent.

Only if permitted by:

- visibility policy;
- age gating;
- moderation;
- block state;
- trust scope.

---

## Step 3 — Message intent

Message intent triggers:

```txt
ChatPermissionEngine
```

Checks:

- blocked?
- muted?
- age-compliant?
- spam-limited?
- profile hidden?
- safety restricted?
- cooldown active?
- consent required?

If denied:

- fail quiet;
- no leakage;
- generic unavailable state.

---

## Step 4 — Ghosted chat create/open

If allowed:

```txt
find existing thread
or
create temporary thread
```

Thread receives:

- contextual origin;
- safe seeded metadata;
- privacy scope;
- expiry policy.

Never attach:

- exact GPS;
- hidden metadata;
- recovery data;
- trusted contact state;
- SOS/help context.

---

# Safe seeded context

Allowed:

```txt
Replied from a Chill signal around Soho
```

```txt
Replied from a Ticket beacon
```

```txt
Connected through a Radio pulse
```

Forbidden:

```txt
2 metres away
```

```txt
Currently at exact venue table
```

```txt
Seen leaving recovery group
```

---

# Chat types

## Temporary chat

Default.

Characteristics:

- contextual;
- lightweight;
- expires;
- low-pressure;
- no assumed permanence.

---

## Mutual chat

Unlocked after:

- mutual interaction;
- repeated consent;
- explicit continuation.

Still should NOT:

- expose exact live location automatically.

---

## Trusted chat

Requires explicit escalation.

May allow:

- scoped live location sharing;
- route sharing;
- emergency support context.

Must always:

- display active sharing state clearly;
- support instant revoke.

---

# Ghosting behaviour

Ghosted chat is intentionally ephemeral.

Possible thread states:

```ts
export type GhostedChatState =
  | 'pending'
  | 'active'
  | 'mutual'
  | 'quiet'
  | 'cooling'
  | 'ghosted'
  | 'expired'
  | 'blocked'
  | 'safety_locked';
```

---

# Ghosted state

Ghosted means:

- thread visually fades;
- notifications reduce;
- thread deprioritises;
- no confrontation required.

The system should avoid:

```txt
explicit rejection theatre
```

Rules:

- no "seen and ignored" pressure;
- no public rejection signals;
- no aggressive re-engagement prompts.

---

# Expiry system

Default Ghosted chats should expire.

Suggested defaults:

| Chat type | Expiry |
|---|---:|
| event/ticket | 24–72h after event |
| chill | 12–48h |
| venue vibe | 6–24h |
| market/preloved | after transaction window |
| radio pulse | 24–48h |
| mutual | optional/manual |
| trusted | persistent until revoked |

Expiry should:

- reduce inbox clutter;
- reduce long-tail harassment;
- reinforce moment-based interaction.

---

# Chat reveal system

Identity reveal must be progressive.

Possible reveal levels:

```txt
anonymous
alias-only
partial-profile
full-profile
trusted-profile
```

Rules:

- exact location is separate from identity reveal;
- mutuality does not automatically reveal identity;
- trust escalation requires explicit consent.

---

# Boo system

Boo is a lightweight social nudge.

Boo should:

- feel playful;
- feel low-pressure;
- avoid popularity metrics.

Boo must NOT:

- create public scores;
- affect map ranking publicly;
- become social currency;
- expose exact location.

Possible outcomes:

- silent acknowledgement;
- mutual unlock;
- chat eligibility;
- subtle notification.

---

# Notification policy

Notifications should stay calm.

Good:

```txt
Someone replied to your Chill signal
```

```txt
New message from nearby connection
```

Bad:

```txt
Phil is 43 metres away
```

```txt
You were ignored
```

```txt
3 people viewed your beacon
```

---

# Presence integration

Ghosted chat may use:

- approximate district;
- shared venue context;
- event context;
- radio context.

Ghosted chat must NOT expose:

- exact live GPS;
- background movement;
- route trails;
- passive tracking.

---

# Safety integration

Safety overrides all social behaviour.

If:

- blocked;
- safety-restricted;
- moderation-held;
- harassment-detected;
- spam-detected;

then:

- chat may lock;
- thread may expire early;
- visibility may reduce instantly.

---

# Moderation integration

Ghosted chat supports:

- report;
- mute;
- hide;
- block;
- restrict;
- safety escalation.

Rules:

- block propagates immediately;
- blocked users disappear from Globe interaction surfaces;
- blocked users cannot reopen expired chat.

---

# Anti-harassment rules

The system must prevent:

- message flooding;
- repeated unsolicited reopen attempts;
- triangulation attempts;
- rejection loops;
- visibility farming;
- sexual coercion patterns;
- recovery-targeting abuse.

Controls:

- cooldowns;
- rate limits;
- soft ghosting;
- hidden spam weighting;
- message gating;
- trust thresholds.

---

# Exact location policy

Exact location sharing is:

- NEVER default;
- NEVER implied by chat;
- NEVER unlocked by Boo;
- NEVER unlocked by mutuality alone.

Exact sharing requires:

- explicit consent;
- active timer;
- visible state;
- instant revoke.

---

# Chat UI principles

Ghosted chat UI should feel:

- dark;
- calm;
- breathable;
- low-pressure;
- emotionally soft.

Avoid:

- bright dopamine colours;
- aggressive badges;
- unread anxiety;
- urgency theatre.

---

# Typing indicators

Typing indicators should be subtle.

Allowed:

```txt
Typing…
```

Avoid:

- persistent live activity surveillance;
- detailed active timestamps;
- hyper-online pressure mechanics.

---

# Read states

Avoid social-pressure read systems.

Preferred:

- delivered;
- active recently;
- optional seen state.

Avoid:

```txt
Seen 11:42 PM and ignored
```

---

# Realtime orchestration

Ghosted chat integrates with:

- Realtime Signal Engine;
- Presence system;
- Globe interaction layer;
- Notification policy;
- Safety systems.

Realtime chat updates should:

- stay scoped;
- avoid public visibility amplification;
- never affect public popularity.

---

# Accessibility

Must support:

- reduced motion;
- screen readers;
- keyboard navigation;
- high contrast;
- low-cognitive-load interaction.

Expiry and ghosting states must remain understandable.

---

# Supabase architecture

Suggested tables:

```txt
ghosted_chats
ghosted_chat_members
ghosted_chat_messages
ghosted_chat_context
ghosted_chat_visibility
ghosted_chat_expiry
ghosted_chat_reports
ghosted_chat_blocks
ghosted_chat_state_changes
boo_events
message_intents
```

---

# Suggested services

```txt
src/lib/chat/GhostedChatService.ts
src/lib/chat/GhostedChatPermissionEngine.ts
src/lib/chat/GhostedChatExpiryEngine.ts
src/lib/chat/GhostedChatModerationAdapter.ts
src/lib/chat/GhostedChatContextBuilder.ts
src/lib/chat/GhostedChatRealtimeBridge.ts
src/lib/chat/BooIntentService.ts
src/lib/chat/SoftGhostingEngine.ts
src/lib/chat/ChatRevealPolicy.ts
```

---

# Testing requirements

## Unit tests

Test:

- permission checks;
- block propagation;
- expiry logic;
- reveal policy;
- Boo cooldowns;
- anti-spam limits;
- ghost state transitions.

## Integration tests

Test:

- beacon → chat flow;
- profile visibility enforcement;
- safe seeded context;
- chat expiry cleanup;
- block removes active thread;
- mutual unlock behaviour.

## E2E tests

Test:

- user taps beacon and safely opens chat;
- exact GPS never leaks;
- expired chats disappear gracefully;
- ghosted state reduces pressure;
- harassment controls trigger correctly;
- trusted escalation requires explicit consent.

---

# Acceptance criteria

The Ghosted chat system succeeds when:

- chat feels contextual rather than performative;
- users can connect without social pressure;
- inboxes do not become permanent clutter;
- exact location never leaks accidentally;
- ghosting feels soft rather than hostile;
- safety overrides social momentum;
- temporary interactions feel natural;
- Boo remains playful and lightweight;
- chat never becomes popularity infrastructure;
- the system protects emotional safety as much as technical privacy.