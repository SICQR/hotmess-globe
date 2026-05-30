# Slice G — Person Photo Markers

**Status:** Doctrine-pinned. Phil-ratified. Queued behind #303 (schema split) and #213 (incognito). Not active.
**Flag:** `BEACON_PHOTO_MARKERS` — default OFF.
**Scope axis:** person only.

This slice gives Pulse Sniffies-grade visceral photo-as-marker behaviour — but only on the person axis, only behind the flag, only with strict zoom-collapse logic, only after a dense-city pre-ship simulation. It does not jump the queue.

---

## 1. Locked rules (Phil's words, verbatim)

### Marker style by axis

| Axis   | Marker style                         |
| ------ | ------------------------------------ |
| Person | circular photo marker                |
| Place  | abstract beacon glyph                |
| Event  | branded/event glyph                  |
| Route  | line / pulse / directional construct |
| Care   | cream protected marker system        |

### Read rule

The marker should NOT become the profile. It must read as "someone is signalling from here" — NOT "here is a floating avatar head". That means:

- small
- masked
- ring-led
- bloom still matters
- photo subordinate to intent colour
- slight blur/glow underlay
- no hard white borders
- no Apple Maps contact-pin energy

### Zoom collapse

- low zoom = revert to bloom/intensity constellation
- medium zoom = selective photo markers
- high zoom = full contextual markers

This is doctrine-consistent spatial readability, not a compromise.

---

## 2. Scope — exactly six items

1. `cover_photo_url` column on beacons table (additive, nullable, no schema rewrite).
2. Picker step in `BeaconDropModal.jsx` — pulls from user's existing profile photos. NO new upload flow.
3. Person-axis renderer only (`entity_kind = 'person'`), implemented in the top-level `mapboxLayerStack.js`. Historical twin-file footgun — see task #314.
4. Zoom-threshold collapse logic — constants + handler.
5. Max visible photo markers cap — config constant.
6. Graceful fallback to existing sprite system when flag OFF, photo missing, or cap exceeded.

---

## 3. Out of scope

- Touching venue / event / care / route markers.
- Redesigning the globe.
- Changing clustering globally.
- Adding uploads — reuse profile photos only.
- Letting photos bypass D15 dignity rules.

---

## 4. Pre-ship gate (mandatory)

Dense-city simulation before any production rollout.

- Soho, Vauxhall, Hackney.
- 200 concurrent person signals.
- Night mode active.
- Movement (route layer) active.
- Radio live.
- Care anchors visible.
- Verdict on each cell: "alive" or "casino map spam". Only "alive" ships.

If any cell reads as casino map spam, the slice does not ship. Tune, re-sim, re-verdict.

---

## 5. Doctrine pinning

This slice only earns its keep because these four exist. Sniffies structurally can't ship this — they don't have the doctrine to hold it.

- [D11 — Arrival State / Profile Identity](../11-arrival-state-doctrine.md)
- [D12 — 4-Axis Signal Taxonomy (person/place/event/route)](../12-drop-beacon-doctrine.md)
- [D15 — Care Language](../15-care-language-doctrine.md)
- D266 — Inbox / Notification Ontology

The marker is signal, not avatar. Photo subordinate to intent colour. Ring leads, bloom carries. If any of the four above are violated by an implementation choice, that choice loses.

---

## 6. Flag

`BEACON_PHOTO_MARKERS=true` env flag. Default OFF. Flip per environment after the dense-city verdict reads "alive" across Soho, Vauxhall, Hackney.
