# Globe Camera Choreography

Purpose: define the camera movement, zoom bands, transition rules, focus behaviour, reduced-motion variants, and Globe-to-Mapbox handoff choreography for the HOTMESS Globe.

The camera is not just navigation.

The camera is:

- orientation;
- emotion;
- trust;
- spatial meaning;
- accessibility risk;
- performance control.

Bad camera behaviour makes the Globe feel:

- blurry;
- cheap;
- chaotic;
- nauseating;
- technically broken.

Good camera behaviour makes it feel:

```txt
alive, premium, spatial, and intentional
```

---

# Core rules

## 1. Never zoom into blur

Current issue:

- selected beacon zooms too close;
- Earth texture becomes blurry;
- local detail is fake;
- beacons look like giant towers.

Hard rule:

```txt
The camera must never enter the forbidden blur zone during normal interaction.
```

---

## 2. The Globe is not street-level detail

The sphere handles:

- orbital;
- regional;
- city;
- atmospheric signal.

Mapbox/local mode handles:

- street;
- venue;
- detailed navigation;
- dense local beacons.

---

## 3. Motion must preserve orientation

Every camera move should help the user understand:

- where they came from;
- where they are going;
- why the view changed.

Avoid:

- teleport jumps;
- sudden spins;
- violent zooms;
- disorienting rotations.

---

## 4. User control pauses ambience

When the user drags, pinches, taps, or searches:

- idle drift pauses;
- camera takes their input seriously;
- no auto-motion fights them.

---

# Camera bands

These are canonical camera states.

| Band | Name | Altitude | Renderer | Purpose |
|---|---|---:|---|---|
| C0 | Orbital | 2.6–3.4 | Globe | world signal / atmosphere |
| C1 | Region | 2.0–2.6 | Globe | country / regional energy |
| C2 | City | 1.45–2.0 | Globe / hybrid | city signal / district glow |
| C3 | District | 1.15–1.45 | hybrid | cluster split / local handoff |
| C4 | Local | Mapbox zoom | Mapbox | street / venue / local stack |
| C5 | Detail | Mapbox + sheet | Mapbox/UI | selected venue/beacon/card |

Forbidden Globe altitude:

```txt
< 1.05
```

Do not cross this until real high-resolution globe tile/detail rendering exists.

---

# Named camera presets

```ts
export const GLOBE_CAMERA_PRESETS = {
  orbital: { altitude: 2.9, duration: 1400 },
  region: { altitude: 2.25, duration: 1200 },
  city: { altitude: 1.7, duration: 1100 },
  district: { altitude: 1.28, duration: 900 },
  signal: { altitude: 1.22, duration: 800 },
  minSafe: { altitude: 1.05 },
};
```

Mobile adjustment:

```ts
altitude += 0.18 to 0.35
```

Reason:

- smaller screen;
- finger occlusion;
- less texture tolerance;
- higher motion sensitivity.

---

# Transition types

## Ambient drift

Purpose:

- subtle life;
- atmosphere;
- spatial depth.

Rules:

- slow;
- interruptible;
- disabled in reduced motion;
- never active while user is interacting.

---

## Focus move

Triggered by:

- city select;
- beacon select;
- cluster expand;
- search result.

Rules:

- ease toward target;
- preserve context;
- avoid over-zoom;
- open drawer/card after camera begins settling.

---

## Cluster expand

Triggered by:

- tapping dense cluster;
- tapping district stack.

Sequence:

1. soften surrounding glow;
2. move to district band;
3. split cluster into stack/drawer;
4. optionally hand off to Mapbox if density demands it.

---

## Globe-to-Mapbox handoff

Triggered by:

- local zoom threshold;
- district selection;
- selected venue/event requiring local detail;
- density state `packed` or `overloaded`;
- user chooses local map.

Sequence:

1. focus city/district on Globe;
2. reduce atmosphere intensity;
3. fade in Mapbox local layer;
4. flatten local perspective;
5. replace Globe pins with local stacks;
6. activate local controls.

Avoid:

- hard cut;
- sudden full-screen map jump;
- losing selected context.

---

# User interaction rules

## Drag / pan

- user controls rotation;
- ambient drift pauses;
- selected state remains unless user clears it;
- do not auto-snap unless requested.

---

## Pinch / zoom

- zoom clamps to safe range;
- crossing local threshold offers/hands off to Mapbox;
- never allows blur-zone dive.

---

## Tap city

Sequence:

1. set selected city;
2. rotate/focus to city;
3. move to city altitude;
4. open CitySignalDrawer;
5. show district stacks.

---

## Tap cluster

Sequence:

1. select cluster;
2. move to district altitude;
3. split into stack/drawer;
4. do not show every child as pins if dense.

---

## Tap beacon

Sequence:

1. select beacon;
2. small focus move only;
3. no blur-zone zoom;
4. open typed card/sheet;
5. dim unrelated background.

---

## Tap Help/SOS

Public Globe:

- no exact public SOS tap target.

Trusted-contact/safety view:

- focus route calmly;
- no panic spin;
- preserve orientation;
- expose exact location only inside protected safety surface.

---

# Timing and easing

Motion should feel expensive, not frantic.

## Default durations

| Move | Duration |
|---|---:|
| city focus | 900–1200ms |
| beacon focus | 650–900ms |
| cluster expand | 800–1100ms |
| Globe→Mapbox handoff | 900–1400ms |
| reset to orbital | 1000–1600ms |

---

# Easing language

Use:

- smooth ease-out;
- soft cubic;
- slight inertia;
- no bounce.

Avoid:

- springy cartoon bounce;
- harsh linear movement;
- snap jumps.

---

# Reduced motion camera rules

Reduced motion changes camera choreography.

## In reduced motion

- shorten travel distance;
- reduce rotation;
- fade overlays instead of camera sweeps;
- use static focus where possible;
- disable ambient drift;
- reduce Globe→Mapbox movement intensity.

---

# Low stimulation camera rules

Low stimulation should:

- slow transitions slightly;
- reduce simultaneous changes;
- avoid sharp zooms;
- reduce background animation;
- maintain stronger orientation breadcrumbs.

---

# Orientation breadcrumbs

Users need to know where they are.

Provide:

- selected city label;
- zoom band label where helpful;
- back to world control;
- back to city control;
- local mode indicator;
- selected signal card.

---

# Back navigation choreography

## From local to city

Sequence:

1. close/compact card;
2. fade Mapbox detail down;
3. return to district/city Globe band;
4. restore city glow.

## From city to world

Sequence:

1. collapse stacks;
2. reduce labels;
3. ease back to orbital;
4. restore global atmosphere.

---

# Camera ownership

Only one system owns camera policy:

```txt
GlobeCameraPolicy
```

No component should hardcode:

- altitude;
- duration;
- transition thresholds;
- handoff logic.

---

# Renderer-specific rules

## `EnhancedGlobe3D`

Allowed:

- orbital camera;
- city focus;
- signal focus above min safe altitude;
- arcs and atmosphere.

Forbidden:

- street-level zoom;
- exact local map behaviour;
- arbitrary point altitude `0.8` style focus.

---

## `LocalMapboxScene`

Allowed:

- map zoom;
- district fit bounds;
- venue focus;
- route focus;
- map pitch/tilt if accessible.

Forbidden:

- globe orbital drift;
- fake 3D planet effects.

---

# Camera and density

Camera state affects density rendering.

| Camera band | Render style |
|---|---|
| Orbital | city heat / constellations |
| Region | regional clusters |
| City | district stacks |
| District | cluster split / local handoff |
| Local | Mapbox clusters/cards |
| Detail | card/sheet + local context |

Rules:

- camera zoom never forces more pins than density budget allows;
- closer does not always mean more markers;
- dense areas become stacks/lists, not pin forests.

---

# Camera and boosts

Boosts may influence:

- featured route;
- city/district spotlight;
- drawer ordering.

Boosts may not:

- force camera movement;
- hijack user view;
- auto-zoom to sponsor;
- create giant spotlight without consent.

---

# Camera and safety

Safety always overrides choreography.

Help/SOS rules:

- no public exact camera target;
- trusted-contact view only;
- calm urgency;
- no cinematic delay if urgent action needed;
- no ads/sponsor interstitials.

---

# Failure states

## Camera target invalid

Fallback:

- stay current view;
- open list/card if available;
- log safe diagnostic.

## Mapbox unavailable

Fallback:

- district/card/list mode;
- do not over-zoom Globe.

## Globe unavailable

Fallback:

- city list;
- Mapbox local if available;
- static signal dashboard.

---

# Testing requirements

## Unit tests

Test:

- altitude clamps;
- mobile altitude offsets;
- reduced motion variants;
- local handoff threshold;
- invalid coordinate fallback.

## Integration tests

Test:

- tap city;
- tap cluster;
- tap beacon;
- enter local Mapbox mode;
- exit local mode;
- reduced motion path;
- Help/SOS protected path.

## E2E tests

Test:

- no camera move below min safe altitude;
- selected beacon opens sheet without blur-zone zoom;
- dense cluster expands to stack, not individual pin explosion;
- Globe→Mapbox transition preserves selected city context;
- reduced motion disables ambient drift.

---

# Implementation targets

Create/refactor toward:

```txt
src/lib/globe/camera/GlobeCameraPolicy.ts
src/lib/globe/camera/GlobeCameraPresets.ts
src/lib/globe/camera/GlobeCameraTransitions.ts
src/lib/globe/camera/GlobeMapboxHandoff.ts
src/lib/globe/camera/GlobeCameraAccessibility.ts
src/lib/globe/camera/GlobeCameraBreadcrumbs.ts
```

---

# Acceptance criteria

The camera system succeeds when:

- no normal interaction enters the blur zone;
- selected beacons feel focused without over-zooming;
- cities feel cinematic;
- local detail uses Mapbox, not fake sphere zoom;
- users never feel yanked around;
- reduced motion remains comfortable;
- dense clusters expand coherently;
- camera never fights user input;
- boosts never hijack view;
- Help/SOS never exposes public exact location;
- back navigation feels natural;
- the Globe feels premium, spatial, and calm under pressure.