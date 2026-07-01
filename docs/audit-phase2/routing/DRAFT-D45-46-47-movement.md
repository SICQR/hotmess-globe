# D45–D47 — Movement, Magnetism & Interaction Weight (kinetic-series cluster)

**Status:** DRAFT — surfaced by Phase 2 deep-dive, awaiting Phil ratification.
**Path:** `docs/doctrine/45-47-movement-interaction-weight-doctrine.md` (proposed; may split into D45/D46/D47 on ratification).
**Named by:** D43 §"Future doctrines" (D45 Magnetic Movement, D46 Hover-Tap-Sheet Commit Chain) and D43 Appendix B (D47 Interaction Weight Doctrine).
**Inherits from:** D14 (Routing as Continuity), D34 (Trajectory & Connection Flows), D43 (In-World vs Sheet-World), D48 (Spatial Identity Exposure), D52 (Trajectory Interruption), sacred-invariants (#2, #3, #5, #13).
**Inherited by:** every surface that renders a moving signal, snaps a marker, or escalates a hover into a sheet — current (`L2MeetSheet`, `MovementStatusCard`, proximity cards) and future.
**Why now:** D43 Appendix B deferred this cluster until "the right slice of code proves what the codification should permit and forbid." That code shipped (`useMovementSession`, the live-meet movement loop, the proximity hover->tap->sheet chain, the `movement_*`/`travel_*`/`routes` tables). The restraint clause is satisfied; the cluster is ready to be written.

---

## §0 — The Principle

> **The system carries the user through the city, does more understanding so the user does less operating, and never lets motion become a trail.**

This single sentence fuses the three reserved doctrines:

- **D45 Magnetic Movement** — a moving signal has *weight*; it snaps, decays, and renders by behaviour, never by a number the user is asked to set.
- **D46 Hover-Tap-Sheet Commit Chain** — interaction escalates in exactly three rungs (notice -> intend -> commit), and a sheet is only ever earned by an explicit commit, never by inference.
- **D47 Interaction Weight** — the system may *understand* a moment (read momentum, ETA, convergence) but may not *operate on the user's behalf* in ways that remove explicit control, manufacture cleverness, or reconstruct a path.

It is the kinetic expression of D14 §0 ("Never eject the user from the night" / "HOTMESS is carrying me through the city") and the affirmative half of D52 (D52 governs what happens when motion *breaks*; this cluster governs what motion *is* while it works).

---

## §1 — Invariants (LOCK)

These bind every surface that renders, weights, or escalates movement.

**§1.1 — A trail is structurally impossible, not merely discouraged.** No surface, table, or realtime channel may allow reconstruction of a user's path from stored positions. Per-ping position data is fuzzed *at the substrate boundary* (D33 §1.3) before it is stored, and heading is never combined with precise position. *Inherits SI #2, SI #3.* (Resolves R-02.)

**§1.2 — Movement weight is derived, never declared.** The "weight" of a moving signal (how strongly it renders, snaps, or persists) is computed from behaviour — proximity, momentum, convergence, freshness — and is never an `intensity` slider, score, or number exposed to or set by the user. *Inherits D56 §2 (intensity slider forbidden — "abstraction leakage"), signal-economics "Trust is a rate modifier."*

**§1.3 — Every moving signal expires, and the substrate sweeps it.** A moving signal carries a non-null `expires_at` and a purge path that physically removes the row after expiry. Declared-but-unswept expiry is non-compliant. Motion that outlives its session is a trail by another name. *Inherits SI #5; resolves R-03, R-05.*

**§1.4 — Public route geometry is abstracted; precise geometry is participant-scoped.** A route line readable by anyone other than its two participants carries only fuzzed or district-abstracted geometry. Precise origin/destination coordinates exist only inside a consenting pair's session (the `travel_sessions` recipient model, or `meet_sessions` participant model). *Inherits D14 §1.5 (no surveillance routing / no path history), D48 §1; resolves R-01.*

**§1.5 — The commit chain has exactly three rungs and the sheet is the only one that costs.** Notice (in-world hover/chip), intend (tap/popup), commit (sheet). A sheet may only open on explicit commit. No surface may auto-open a sheet from inference, dwell-time, or proximity. *Inherits D43 §0, §1, §2 commitment test, §6 burden-of-proof.* (This is the D46 contribution.)

**§1.6 — Understanding may rise; operating may not.** The system may read momentum, predict ETA, and surface convergence ("you're both heading to Soho"). It may not act on that reading in ways that remove explicit control, pre-commit the user, auto-share location, or perform "magic." Every inferred state is *shown*, never *executed*. *Inherits D43 Appendix B (the unwritten principle made floor: "more understanding, less operating, but clarity/consent/intentionality remain the floor").* (This is the D47 contribution.)

**§1.7 — Exposure register is intent-routed and consent-gated, in doctrine not just UI.** Movement renders to a peer only when the relationship is mutual and the sharer is not off-grid, and only at the banded distance register, never raw coordinates. The `isMutual && !offGrid` gate currently living in component code is hereby constitutional. *Inherits D48 §3, D34 §4.5 (presence-leakage rules), D08.*

**§1.8 — Continuity-failure truth is inherited wholesale from D52.** This cluster does not restate D52's nine failure modes; it binds them. Any movement surface this cluster governs must pass D52 §2's failure-mode matrix. *Inherits D52 §1, §2.*

---

## §2 — Enforcement (how each invariant is made real)

| Invariant | Substrate / code enforcement |
|---|---|
| §1.1 Trail impossible | Route `movement_updates` writes through a single fuzzing function (extend `fuzz_signal_point()` to a `fuzz_movement_point()` that quantises and drops heading when stored). Revoke direct table INSERT from `authenticated`; force the function path (D33 §1.5). |
| §1.2 Weight derived | No `intensity`/`weight` column writable by client. Render weight computed server-side or client-side from `eta_minutes` + freshness + convergence; never persisted as a user-set field. |
| §1.3 Expire + sweep | `expires_at` NOT NULL on `movement_sessions` and `routes`. Add a sweeper cron (sibling to existing `cron_runs` jobs) that deletes expired `movement_sessions`/`movement_updates`/`routes` rows. Audit point: the migration that adds the cron. |
| §1.4 Geometry scope | `routes_read` policy changed from `true` to participant/abstract-only; precise lat/lng on any public-readable route replaced with fuzzed geog. `travel_sessions` recipient policy is the reference implementation. |
| §1.5 Commit chain | Lint/review rule: no `openSheet()` call may be triggered by `onHover`, `onDwell`, or a proximity threshold. Sheets open only from explicit `onClick`/commit handlers. Enforced at PR review against D43 §2. |
| §1.6 Understand != operate | Any predicted/inferred state renders as a *shown* card (e.g. `MovementMessageCard`'s `onMeetHalfway` is an offer, not an auto-action). No code path may auto-share location, auto-accept a meet, or pre-commit a route without a user tap. |
| §1.7 Exposure gate | The `isMutual && !offGrid` + banded-distance gate moves from per-component checks into a shared guard consumed by every movement surface; the `public_movement_presence` projection exposes only `youDist`/`themDist` bands, never coordinates. |
| §1.8 Continuity | Movement surfaces import D52's failure-mode handling; CI acceptance test asserts all nine modes have a rendered state. |

---

## §3 — Failure modes (drift indicators — if you see these, the cluster is being violated)

1. **A heading column next to a precise position column.** Reconstructable trajectory. (R-02.) Forbidden by §1.1.
2. **A world-readable route with real coordinates and a nullable expiry.** (R-01/R-05.) Forbidden by §1.3 + §1.4.
3. **An `intensity` slider, a "movement score," or any user-set weight number reappearing on a drop or share surface.** Forbidden by §1.2 (and D56 §2).
4. **A sheet that opens because the user hovered, dwelled, or got near something.** Forbidden by §1.5.
5. **The app auto-sharing location, auto-accepting a meet, or "helpfully" routing the user somewhere they didn't tap.** Forbidden by §1.6 — this is the "assistant-as-cleverness" violation D43 Appendix B warns about.
6. **`expires_at` set but rows never deleted.** A trail wearing an expiry label. Forbidden by §1.3.
7. **Movement leaking across an off-grid boundary, or precise coordinates reaching a non-participant.** Forbidden by §1.7 (and D34 §4.5).
8. **"You walked 12.4 km / 3-night streak" gamification of motion.** Forbidden by D14 §1.6, restated here — motion is night, not a quantified-self metric.

---

## §4 — Acceptance test

A movement/route surface conforms when **all** hold:

- [ ] No stored row combines precise position with heading; per-ping positions are fuzzed at the substrate boundary.
- [ ] No client-writable weight/intensity number governs render.
- [ ] Every moving signal has a non-null `expires_at` **and** a sweeper that deletes it.
- [ ] No public-readable geometry carries precise coordinates of an individual's path.
- [ ] No sheet opens without an explicit commit tap.
- [ ] No inferred state triggers an action without a user tap.
- [ ] Peer exposure passes the mutual + not-off-grid + banded-distance gate.
- [ ] All nine D52 failure modes render a truthful state.

---

## §5 — Companion references

- **sacred-invariants.md** — #2 (no exact tracking / no trails / fuzzy radii), #3 (anti-stalking is structural), #5 (signals always expire), #13 (unmeasurable rule is not production-ready), #18 (the map IS the product).
- **D14 — Routing as Continuity** — §0 "Never eject the user from the night," §1.5 no surveillance routing, §1.6 no quantified-self, §4 route as moving signal.
- **D34 — Trajectory & Connection Flows** — §1 shared-trajectory primitive, §2 escalation ladder (this cluster governs the kinetic feel of the Ambient->Coordinated->Converged rungs), §4.5 presence-leakage rules.
- **D43 — In-World vs Sheet-World** — §0/§1/§2 commitment test (the D46 spine), Appendix B (the D47 "understanding > operating" pressure this draft constitutionalises).
- **D48 — Spatial Identity Exposure** — §1 three modes, §3 intent-routes-exposure (the §1.7 gate).
- **D52 — Trajectory Interruption** — §1 continuity is a contract, §2 nine failure modes (bound wholesale by §1.8).
- **D56 — Unified Signal Emission Surface** — §2 intensity-slider forbiddance (the §1.2 precedent).
- **D33 — Memory & Permanence** — §1 substrate-incapability pattern (the enforcement model for §1.1/§1.3).
- **Live tables:** `movement_sessions`, `movement_updates`, `travel_sessions`, `travel_updates`, `routes`, `meet_sessions`, `location_shares`, `user_presence_locations`. DB functions: `fuzz_signal_point()` (extend), `st_isvalidtrajectory()`.

---

## §6 — Ratification note

This draft deliberately keeps the three reserved numbers (D45/D46/D47) under one roof because Phase 2 found them inseparable in code: magnetic movement (D45), the commit chain (D46), and the understanding/operating boundary (D47) are all expressions of the same §0 sentence. Phil may ratify as one doctrine or split into three on lock. The restraint clause of D43 Appendix B is satisfied — the codifying slice exists — so writing is no longer premature.
