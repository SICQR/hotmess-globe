# HOTMESS — Final Completeness Addendum

This addendum folds final patches, wireframe logic, red-team notes, and Figma mapping into the canonical spec.

---

## SECTION 1 — HOME V2 STRUCTURE (WIREFRAME-READY)

### HOME = ENTRY POINT, NOT JUST MANIFESTO

**Above the fold:**
- Hero (existing)
- Age / Consent Gate (first visit only)
  - Copy: `MEN-ONLY • 18+ • CONSENT-FIRST`

**Below hero:**
- **RIGHT NOW STRIP** (new)
  - Pulls from:
    - Active Beacons
    - Right Now statuses
    - Live Events
  - Copy examples:
    - "London is warm tonight"
    - "3 rooms open"

**Middle sections (existing, reordered):**
- Radio (heartbeat)
- Shop / Drops
- GHOSTED Preview (connection, secondary)
- Care Preview

**Bottom of Home (new):**
- **LANDING STRIP**
  - Copy: "Landing matters as much as leaving."
  - CTA: `Open Care`

---

## SECTION 2 — FIGMA PAGE MAP

### FOUNDATIONS
- Design System
- Typography
- Color Tokens
- Iconography
- Motion Rules

### SCREENS
| Screen | Notes |
|--------|-------|
| Home v2 | Radio-first, Right Now strip, Care landing |
| GHOSTED | Social/discovery grid — opt-in, contextual |
| Pulse / Globe | Presence visualization, beacons on map |
| Tonight (Events) | What's happening, RSVP |
| Event Detail | Single event view |
| Market (Consolidated) | Shop + drops + merch |
| Product Detail | Single product |
| Music / Radio | Live shows, schedule, archive |
| Show Detail | Individual show page |
| Messaging | Chat threads, voice notes |
| More / Settings | Profile, settings, safety |
| Care Hub | Aftercare, resources, exits |

### SYSTEMS
| System | Purpose |
|--------|---------|
| Beacons | Time-limited presence signals |
| Right Now | "I'm out" status |
| Travel Time | How far to a beacon |
| Care States | Aftercare prompts, check-ins |
| Safety States | Panic, SOS, fake call |
| Pause / Invisibility | Go silent without shame |

### OVERLAYS
| Overlay | Trigger |
|---------|---------|
| Age Gate | First visit |
| Consent Cue | Before messaging / connection |
| Aftercare Prompt | After intensity (late night, long session) |
| Late Night Detector | Time-based nudge |
| SOS | Panic button activation |

---

## SECTION 3 — RED TEAM (RISKS & MITIGATIONS)

| Risk | Mitigation |
|------|------------|
| **Pressure loops** | Pause Visibility toggle. Silence-friendly copy. |
| **Coercive discovery** | No grid ranking. No unread pressure. GHOSTED is opt-in. |
| **Burnout** | SessionTimer. LateNightDetector. Care landings. |
| **Legal exposure** | Explicit consent gates. Clear 18+ framing. No encouragement language. |
| **Safety at meetups** | Beacons abstracted (no exact locations). SOS always visible. |

---

## SECTION 4 — ACCEPTANCE RULES (DEV)

**A feature is NOT done unless:**
- [ ] Exit exists
- [ ] Pause exists
- [ ] Care link exists
- [ ] Silence is neutral (no shame, no pressure)

**GHOSTED-specific rules:**
- [ ] No ranking by "hotness" or engagement
- [ ] No unread counts that create anxiety
- [ ] Profiles can go invisible without penalty
- [ ] Connection is opt-in, not push
- [ ] Every conversation can be exited cleanly

---

## SECTION 5 — GHOSTED SPEC

### What GHOSTED Is
- The social/discovery grid
- Opt-in, temporary, contextual connection
- Secondary to Radio (not the lead)

### What GHOSTED Is NOT
- A dating app
- A grid optimized for engagement
- A place where silence is punished

### GHOSTED Principles
1. **Presence over performance** — Being there matters more than metrics
2. **Opt-in always** — No push, no pressure
3. **Withdrawal allowed** — Can go invisible anytime, no shame
4. **Context matters** — Who's at this event? Who's near me? Not "who's online globally"
5. **Care visible** — Safety/exit always 1 tap away

### GHOSTED Features
| Feature | Status | Notes |
|---------|--------|-------|
| Profile grid | ✅ Built | Infinite scroll, cards |
| Match probability | ✅ Built | AI scoring (secondary) |
| Messaging | ✅ Built | Chat, voice notes |
| Right Now status | ✅ Built | "I'm out" indicator |
| Filters | 🟡 Partial | Needs work |
| Invisibility mode | 🟡 Partial | Needs enforcement |
| Contextual discovery | 🔴 Planned | "At this event" filter |

---

## SECTION 6 — FINAL BUILD TRUTH

**HOTMESS does not optimise engagement.**

It optimises **trust**, **return**, and **legibility**.

- If a feature traps users, it fails.
- If it shames silence, it fails.
- If it removes exit, it fails.

**GHOSTED follows the same rules.**

The grid exists to facilitate connection, not to create anxiety.
People can leave. People can be invisible. People can come back.

---

## SECTION 7 — NAVIGATION (FINAL)

| Tab | What It Is |
|-----|------------|
| **RADIO** | Home. Music playing. The heartbeat. |
| **TONIGHT** | Beacons, events, what's happening now |
| **GHOSTED** | Social/discovery grid (opt-in) |
| **SHOP** | Merch, drops, commerce |
| **MORE** | Profile, settings, safety, care |

**Globe** lives within TONIGHT (presence visualization).
**Care** is accessible from every screen (1 tap).

---

*This addendum is canonical. All design and dev work references this.*
