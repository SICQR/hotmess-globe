# Globe Media Capture And Consent System

Purpose: define how HOTMESS Globe handles media capture, nightlife photography, video recording, livestreaming, archive consent, creator permissions, privacy boundaries, and participant protection.

This document governs:

- media capture;
- nightlife photography;
- video recording;
- livestream systems;
- creator uploads;
- consent management;
- archive permissions;
- venue recording policies;
- participant visibility controls.

The system exists to:

- preserve nightlife culture;
- support creators;
- celebrate events;
- protect vulnerable users;
- preserve consent.

NOT to:

- create covert surveillance;
- expose vulnerable behaviour;
- normalise invasive recording;
- pressure visibility.

---

# Core philosophy

Media systems should feel:

```txt
consensual, expressive, respectful, culturally alive
```

NOT:

```txt
constant social recording pressure
```

The platform should support:

- atmosphere;
- artistry;
- memory;
- nightlife documentation.

WITHOUT creating:

- extraction culture;
- involuntary visibility;
- performance anxiety.

---

# Canonical media hierarchy

```txt
Event
→ Moment
→ Capture
→ Consent State
→ Visibility Layer
→ Archive State
```

Each media object must:

- contain consent metadata;
- support moderation review;
- support visibility updates.

---

# Media types

Supported media types:

| Type | Examples |
|---|---|
| Photography | event shots |
| Video | clips/reels |
| Livestream | broadcasts |
| Audio | radio capture |
| Ambient Media | atmosphere visuals |
| Promotional | flyers/trailers |
| Archive | historical content |
| Accessibility | captions/signage |

---

# Consent states

Canonical consent states:

```txt
Public Consent
Venue Consent
Limited Visibility
Friends Only
Blurred Identity
No Capture Requested
Restricted Archive
Removed
```

Consent systems must:

- remain understandable;
- remain reversible;
- support temporary visibility.

---

# Venue media policy layers

Venues may define:

- photography policies;
- livestream rules;
- restricted recording zones;
- creator permissions;
- archive retention rules.

Examples:

| Venue Type | Typical Policy |
|---|---|
| Club | selective capture |
| Recovery Space | no recording |
| Festival | broad promotional capture |
| Popup | creator-led consent |
| Chill Space | minimal capture |

Venue policy visibility must remain:

- clear;
- accessible;
- non-hidden.

---

# No-capture preference system

Users may request:

```txt
No Capture Preferred
```

The system may support:

- subtle visibility indicators;
- creator reminders;
- moderation escalation;
- optional identity blurring.

This preference must NEVER:

- publicly shame users;
- expose vulnerability.

---

# Identity blurring system

The platform may support:

- face blurring;
- selective masking;
- identity suppression;
- crowd anonymisation.

Identity protection should prioritise:

- vulnerable users;
- closeted users;
- recovery participants;
- safety-sensitive communities.

---

# Livestream governance

Livestream systems must:

- respect venue rules;
- support delayed moderation;
- minimise non-consensual exposure.

Livestreams should support:

- moderated overlays;
- restricted camera zones;
- archive expiration;
- visibility controls.

Forbidden:

- covert streaming;
- hidden audience recording;
- deceptive livestreaming.

---

# HOTMESS RADIO integrations

Radio-linked media may include:

- booth streams;
- event takeovers;
- artist interviews;
- audio-only memory layers;
- district sound moments.

Audio-first capture should remain:

```txt
less invasive than visual-first nightlife culture
```

---

# Archive visibility controls

Users must retain control over:

- tagged media;
- discoverability;
- archive persistence;
- public association.

Users may:

- remove tags;
- request takedown;
- hide archive visibility;
- limit distribution.

---

# Temporary media systems

Some media should:

- expire automatically;
- reduce long-term exposure;
- support ephemeral nightlife culture.

Examples:

| Media Type | Suggested Duration |
|---|---|
| Story Clips | 24 hrs |
| Temporary Event Reels | 72 hrs |
| Archive Highlights | permanent |
| SOS-related Media | prohibited |

---

# Restricted capture zones

Certain spaces may prohibit recording.

Examples:

- recovery spaces;
- quiet rooms;
- Help zones;
- consent-sensitive areas;
- accessibility support spaces.

Restricted zones should:

- remain clearly marked;
- support moderation enforcement.

---

# Consent-aware AI processing

AI systems may support:

- automatic blur suggestions;
- unsafe exposure detection;
- moderation assistance;
- accessibility captioning.

AI must NEVER:

- infer sexuality;
- infer intoxication;
- infer private identity;
- generate behavioural risk profiles.

---

# Media moderation

Moderation systems should support:

- takedowns;
- consent disputes;
- unsafe exposure review;
- copyright review;
- impersonation detection;
- exploitation prevention.

Priority moderation categories:

- exposed vulnerable states;
- non-consensual outing;
- hidden recordings;
- harassment.

---

# Accessibility requirements

Media systems must support:

- captions;
- alt text;
- transcripts;
- reduced flashing;
- audio controls;
- screen readers.

Accessibility metadata should:

- remain first-class;
- not become optional decoration.

---

# Privacy policy

The system must NEVER expose:

- hidden attendee identities;
- Help/SOS participants;
- precise user movement;
- Ghosted chats;
- recovery participation.

Media systems must remain:

- consent-aware;
- privacy-safe;
- moderation-ready.

---

# Creator permissions

Verified creators may access:

- approved capture zones;
- event media uploads;
- archive publishing;
- venue-approved livestreaming.

Creators must:

- follow consent rules;
- respect venue policy;
- support takedown compliance.

Repeated violations may trigger:

- upload restrictions;
- moderation review;
- creator suspension.

---

# District media atmosphere

Media rendering should feel:

- atmospheric;
- cinematic;
- soft;
- emotionally alive.

Avoid:

- overwhelming autoplay;
- noisy video walls;
- algorithmic chaos.

Media should enhance:

```txt
city memory and atmosphere
```

NOT:

```txt
doomscroll nightlife content addiction
```

---

# Monetisation boundaries

Allowed:

- creator portfolios;
- archive collections;
- venue recap packages;
- radio-linked media releases.

Forbidden:

- selling nightlife identity data;
- surveillance advertising;
- exploitative visibility systems;
- forced public exposure.

Consent must NEVER become:

```txt
a monetisation obstacle to bypass
```

---

# Suggested Supabase tables

```txt
media_assets
media_consent_states
venue_media_policies
media_visibility_rules
media_blur_requests
livestream_sessions
restricted_capture_zones
media_takedown_requests
archive_media_permissions
creator_capture_permissions
```

Related existing tables:

```txt
events
beacons
venue_profiles
creator_profiles
archived_events
radio_broadcasts
```

---

# Suggested implementation targets

```txt
src/lib/media/MediaConsentEngine.ts
src/lib/media/MediaVisibilityController.ts
src/lib/media/IdentityBlurService.ts
src/lib/media/LivestreamModerationService.ts
src/lib/media/MediaArchiveController.ts
src/lib/media/RestrictedZoneManager.ts
src/lib/media/MediaTakedownService.ts
src/lib/media/CreatorPermissionResolver.ts
src/components/media/ConsentVisibilityBadge.tsx
src/components/media/MediaCapturePolicyPanel.tsx
src/components/media/RestrictedZoneOverlay.tsx
src/components/media/LivestreamConsentControls.tsx
src/components/media/ArchiveMediaManager.tsx
```

---

# Rendering philosophy

Media layers should feel:

- emotionally textured;
- respectful;
- cinematic;
- breathable.

Avoid:

- autoplay overload;
- surveillance aesthetics;
- chaotic content walls.

Media should support:

```txt
collective nightlife memory
```

WITHOUT creating:

```txt
permanent public exposure pressure
```

---

# Acceptance criteria

The system succeeds when:

- nightlife culture can be documented safely;
- creators retain artistic freedom;
- vulnerable users remain protected;
- venues maintain clear media boundaries;
- archive systems remain consent-aware;
- no-capture preferences remain respected;
- identity protection tools reduce exposure risk;
- livestreaming remains accountable;
- media enhances atmosphere without overwhelming the globe;
- HOTMESS Globe feels culturally expressive without becoming invasive nightlife surveillance.
