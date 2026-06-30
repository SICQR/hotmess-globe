# CONFORMANCE — Movement, Routing & Interaction-Weight surface (D45/D46/D47 gap)

> **Phase 2 deep-dive · Surface (D) Routing / Trajectory.** Read-only DB census + targeted code grep. No repo or DB writes performed.
> Census date: 2026-06-30. Supabase project `rfoftonnlwudilafhfkl`.
> Companion draft: [`DRAFT-D45-46-47-movement.md`](./DRAFT-D45-46-47-movement.md)

---

## 0. Summary verdict

The trajectory **code and storage layer is live and substantially better-governed than the trust surface** — fuzzing exists, RLS is owner-scoped, expiry columns are present on every session table. But the **doctrine naming these tables does not exist.** D34 (Trajectory) is the conceptual parent and D52 (Trajectory Interruption) governs the continuity contract, yet the kinetic-series doctrines that D43 *names by number but leaves unwritten* — **D45 Magnetic Movement, D46 Hover-Tap-Sheet Commit Chain, D47 Interaction Weight** — have no constitutional text. The shipped tables (`movement_sessions`, `movement_updates`, `travel_sessions`, `routes`, `meet_sessions`) therefore inherit their safety properties from convention and migration discipline, not from a doctrine they can be audited against.

**Severity ladder for this surface:**

| ID | Finding | Severity |
|---|---|---|
| R-01 | `routes` table is **world-readable** (`routes_read` qual = `true`) and stores precise origin/destination lat-lng with no fuzzing and a nullable `expires_at`. | **HIGH** |
| R-02 | `movement_updates` stores `approx_lat`/`approx_lng` + `heading_degrees` per ping, but precision/fuzz radius is **not enforced at the substrate** — "approx" is a column name, not a guarantee. A per-ping trail with heading is a reconstructable path. | **HIGH** |
| R-03 | No expiry/purge cron observed for `movement_sessions`/`movement_updates`/`travel_*`/`routes`. `expires_at` is set but nothing was found that *acts* on it; trails may persist past their stated life (Sacred Invariant #5 / #2 "persistent user trails are forbidden"). | **HIGH** |
| R-04 | The D45/D46/D47 cluster is unwritten. Movement-weight, magnetic snapping, and interaction-weight behaviours are shipping in code (`useMovementSession`, hover->tap->sheet chains) with no doctrine to test them against (Sacred Invariant #13). | **MEDIUM** |
| R-05 | `routes.expires_at` nullable + `routes_insert` open to `public` with `with_check = true` — any authenticated client can write an immortal public route line. | **MEDIUM** |
| R-06 | `location_shares` precise `current_lat`/`current_lng`/`destination_*`; owner-only RLS is correct, but no fuzz and `end_time` nullable. Acceptable only because it is strictly self-read today; becomes R-01-class the moment it is shared. | **LOW/WATCH** |

---

## 1. Code entry points (targeted grep, `src/` + `api/`)

| Path | Role |
|---|---|
| `src/hooks/useMovementSession.ts` (referenced) | Movement session lifecycle hook — `session`, `isMoving`, `stopMovement`, `markArrived`. |
| `src/components/movement/MovementStatusCard.tsx` | Floating card while user is actively sharing movement. |
| `src/components/chat/MovementMessageCard.tsx` | Rich in-chat movement card; `metadata.type === 'movement'`; `onShareETA`, `onMeetHalfway`. |
| `src/components/chat/JourneyStatusCard.tsx` | States `en_route / nearby / arrived / cancelled`; progress bar for `en_route`. |
| `src/components/sheets/L2MeetSheet.jsx` | Live meet-up surface. Globe signals `EN_ROUTE / MEETPOINT / ARRIVAL / MET` (never live positions). 30-min movement timeout, 10s poll, subscribes to `public_movement_presence`. |
| `src/components/messaging/MeetpointCard.tsx` / `TravelModal.jsx` | Meetpoint emission into chat; ETA countdown, transport estimates, `retracted`/`expired` states. |
| `src/components/social/ProximityUserCard.tsx` / `ProximityGrid.tsx` | Distance + `travelTime` (minutes) on proximity cards. |
| `src/components/sheets/L2ProfileSheet.jsx` | Travel-time calc (walking/bicycling/uber), gated `isMutual && !offGrid`. |
| `src/components/sheets/L2HybridExchangeSheet.tsx` | "Zone A trajectory line" — beacon context as trajectory. |

**Note:** `L2MeetSheet` reads a `public_movement_presence` realtime channel/table that did **not** appear in the public-schema census — verify it is a view over `movement_updates` and that it exposes only banded distance (`youDist`/`themDist`), never raw coordinates, consistent with the file's own header comment ("never live positions").

---

## 2. Database census — movement / routing tables

All tables RLS-enabled. Row counts are live-but-near-empty (feature staged, not yet at scale), so today's exposure is latent.

### 2.1 `movement_sessions` (0 rows) — owner-scoped, good
- Columns: `user_id`, `origin_area` (text label, **not** coords — good), `destination_label`, `destination_place_id`, `eta_minutes`, `visibility`, `share_until`, `active`, `started_at`, **`expires_at`**, `arrived_at`, `stopped_at`.
- RLS: SELECT/INSERT/UPDATE/DELETE all `auth.uid() = user_id`. **Owner-only. Conformant.**
- `origin_area` as a text area-hint rather than lat/lng is the correct D33/D48-aligned shape.

### 2.2 `movement_updates` (0 rows) — **R-02**
- Columns: `session_id`, `user_id`, **`approx_lat`**, **`approx_lng`**, `heading_degrees`, `eta_minutes`, `created_at`.
- RLS: owner-only (`auth.uid() = user_id`) — good for self, but the realtime path (`public_movement_presence`) is what peers consume; that projection is where the precision contract must live.
- **Gap:** "approx" is naming, not enforcement. There is no `fuzz_*` applied at write the way `person_signals` uses `fuzz_signal_point()`. Heading + repeated approx pings = reconstructable trajectory. Sacred Invariant #2 ("persistent user trails are forbidden") and #3 ("anti-stalking is structural, not policy") require the trail to be *structurally* unreconstructable, not conventionally approximate.

### 2.3 `travel_sessions` (0 rows) — best-governed table on this surface
- Precise `origin_*`/`destination_*` lat/lng, `mode`, `provider`, `eta_minutes`, cost band, `status`, `share_mode`, `recipient_user_id`, **`expires_at` NOT NULL**, `arrived_at`.
- RLS: owner ALL; service ALL; **recipient SELECT gated on `share_mode <> 'off' AND status <> 'cancelled' AND expires_at > now()`.** This recipient policy is the model the rest of the surface should copy — time-bounded, consent-bounded, state-bounded.
- `travel_updates` mirrors it: read gated through the parent session's owner/recipient + `share_mode <> 'off'`.

### 2.4 `routes` (0 rows) — **R-01 / R-05**
- Columns: `from_lat`, `from_lng`, `to_lat`, `to_lng` (numeric, **precise**), `kind`, `intensity`, `color`, `metadata`, `created_at`, **`expires_at` nullable**.
- RLS: `routes_read` qual **`true`** (world-readable), `routes_insert` `with_check` **`true`** (any public insert).
- **This is the sharpest hole on the surface.** A public, precise, potentially-immortal origin->destination line. Even if `routes` is intended as decorative "atmospheric route texture" (D14 §4 — routes as moving *signal*, not navigation), the table as shaped permits writing a real person's precise path and reading it back forever. It must either (a) carry only fuzzed/abstracted geometry, or (b) lose public-read. D14 §1.5 explicitly forbids "surveillance routing... history of every path the user took."

### 2.5 `meet_sessions` (0 rows) — participant-scoped, good
- `user_a_id`/`user_b_id`, `thread_id`, `meetpoint_lat`/`lng`, `meetpoint_label`, `status`, `met_at`, `silence_until`, `extended`, `closed_at`.
- RLS: participants-only (`auth.uid() IN (user_a_id, user_b_id)`). **Conformant.** Meetpoint is a single agreed coordinate between two consenting parties — distinct from a trail, so precise coords are appropriate here. `silence_until` aligns with D52 post-meet silence discipline.

### 2.6 `location_shares` (0 rows) — **R-06 watch**
- Precise `current_*`/`destination_*`, `active`, `end_time` nullable.
- RLS: `auth.uid() = user_id` ALL — self-only today. Correct *while self-only*; the nullable `end_time` + precise coords become R-01-class if a share-to-peer path is ever added without a fuzz/expiry gate.

### 2.7 `user_presence_locations` (114 rows) — owner-read only
- Precise `lat`/`lng`/`accuracy_m`. RLS: owner read/insert/update + service ALL. No peer read path in the policy set. The peer-facing fuzzing must therefore happen in whatever service-role function projects this onto the globe — confirm that projection applies banding (cf. Phase 1 DB-01 banded-distance work, task #7).

---

## 3. Anti-stalking invariant check (Sacred Invariants #2 / #3) + D48

| Requirement | Source | Status |
|---|---|---|
| Locations shown as fuzzy radii <= 200 m by default | SI #2 | **Partial.** `person_signals` fuzzes (800-3000 m bands via `fuzz_signal_point`, *coarser* than 200 m, intentional for signal layer). Movement/routes do **not** fuzz at all (R-01/R-02). |
| Permanent presence markers forbidden | SI #2 | At risk — `routes` immortal + public (R-01/R-05). |
| Persistent user trails forbidden | SI #2 | **At risk** — `movement_updates` per-ping + heading, no purge cron observed (R-02/R-03). |
| Anti-stalking is structural, not policy | SI #3 | **Not yet structural** for movement/routes. "approx_lat" and "expires_at" are conventions a future migration could quietly widen. D33 §1 substrate-incapability is not applied here. |
| Exposure register routed by intent/consent | D48 §3 | Movement surfaces gate on `isMutual && !offGrid` in UI (`L2ProfileSheet`, `L2MeetSheet`), which is correct in code but **unbound by doctrine** — nothing forbids a future surface from relaxing it. |
| Continuity-failure truth contract | D52 §1/§2 | Honoured in code (`JourneyStatusCard` states, 30-min timeout, `silence_until`). D52 already covers the *interruption* half; the *movement-weight/precision* half is the D45/47 gap. |

**`fuzz_signal_point()` exists and works** (London-centre distance -> 800/1500/3000 m band, uniform-disc jitter via `sqrt(random())`). It is wired to `person_signals.geog_fuzzed`. It is **not** wired to any movement or route table. The primitive to close R-01/R-02 already exists in the database — it is simply not applied on this surface.

---

## 4. Expiry consistency check (Sacred Invariant #5)

| Table | `expires_at` present | Acted upon? |
|---|---|---|
| `movement_sessions` | yes (nullable) | No purge/expiry cron found (R-03) |
| `movement_updates` | none (`created_at` only) | Per-ping rows accumulate; lifecycle is the parent session's, but no cascade-purge observed |
| `travel_sessions` | **yes, NOT NULL** | Enforced in recipient RLS (`expires_at > now()`) at read; physical purge not confirmed |
| `routes` | yes (**nullable**) | Not enforced anywhere; nullable = immortal-by-default (R-05) |
| `meet_sessions` | `closed_at`/`silence_until` | Lifecycle columns present; purge not confirmed |

**Conclusion:** Expiry is *declared* far more consistently than on the trust surface, and `travel_sessions` even *enforces it at read*. The gaps are (a) `routes`/`movement_sessions` nullable-or-absent expiry, and (b) absence of an observed sweeper that physically removes expired trail rows. Declared-but-unswept expiry still violates SI #2's "persistent trails" if rows survive.

---

## 5. Where the doctrine must land

D34 establishes trajectory as the OS primitive and D52 locks the interruption/continuity contract. Neither governs **movement weight** (how a moving signal is rendered, snapped, and decayed) or **interaction weight** (how hover->tap->sheet escalates, and how much the system *infers* vs. asks). D43 Appendix B explicitly reserves these as **D45 Magnetic Movement, D46 Hover-Tap-Sheet Commit Chain, D47 Interaction Weight** and records Phil's restraint instruction: write them only when a slice of code proves what to permit and forbid. **That code now exists** (`useMovementSession`, the L2MeetSheet movement loop, the proximity hover/tap/sheet chain). The draft codifies the cluster against the live tables above.
