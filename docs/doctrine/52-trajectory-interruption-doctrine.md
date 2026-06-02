# D52 — Trajectory Interruption Doctrine

**Status:** Drafted 2026-06-02, awaiting Phil ratification
**Path:** `docs/doctrine/52-trajectory-interruption-doctrine.md`
**Inherits from:** D14 (Routing as Continuity), D17 (Surface Layer), D22 (Temporal), D34 (Trajectory & Connection Flows), D44 (Identity Privacy Invariant), D48 (Spatial Identity Exposure)
**Prerequisite for:** Slice 6 Live Meet-Up — Slice 6 cannot open until D52 is ratified
**Surfaces from:** Phil's strategic read during scope ratification — *"Live Meet-Up is the first feature where continuity failure has emotional consequences. Worth explicitly handling before Slice 6 opens."*

---

## §0 Why this exists

Once a trajectory is shared, the system carries an obligation: communicate state truthfully. Trajectory features make the platform's stability legible to two people walking toward each other. When a device goes silent, the other person cannot distinguish:

- "they stopped sharing"
- "they're in a tunnel"
- "they ditched me"
- "their battery died"
- "they were blocked"
- "the app crashed"

Silence is the worst possible UX in trajectory features. Without doctrine, every implementation decision about "what happens when X disconnects" becomes ad-hoc. The first time it fails badly under real use, the trust loss is permanent.

This doctrine codifies the continuity contract once, so every trajectory feature now and in the future inherits it.

---

## §1 Continuity is a contract

The moment a trajectory is shared, the system inherits an obligation: **communicate state truthfully.** State is one of:

- alive and accurate
- alive but degraded (specify how)
- silent (specify why)
- ended (specify why)

The system never displays "alive" when it knows otherwise. The system never displays a stale location as if it were live. The system never silently drops the trajectory and leaves the peer guessing.

---

## §2 Failure modes — LOCK

Every trajectory feature must explicitly answer these nine failure modes. No exceptions.

| Failure mode | Detection | What the peer sees | Auto-end? |
| --- | --- | --- | --- |
| App backgrounded | Visibility API + missed heartbeat (>30s) | "Alex is in the background" — marker dims, timestamp surfaces | No |
| Battery saver active | Battery API + heartbeat throttle | "Alex's battery is low" — marker accuracy radius shown explicitly | No |
| Connection lost | Heartbeat timeout (>90s) | "Alex's signal dropped at \[timestamp\]" — last known position shown explicitly stale | No |
| User force-quit | No heartbeat (>3 min) | "Alex went offline at \[timestamp\]" | No |
| GPS accuracy collapse | Accuracy radius >100m | "Alex's location is uncertain (~Xm)" — radius rendered as halo | No |
| Mid-flow block | Block event fires | Neutral "Meet-up ended" — no shame, no naming, no leak | Yes |
| SOS triggered mid-route | SOS event fires | "Meet-up ended" — no reveal of SOS unless peer is the trusted contact | Yes |
| Battery dies entirely | No recovery within 10 min | "Alex's last known location: X · Y min ago" → auto-end | Yes (after 10 min) |
| Force-quit + relaunch | Reconciled session on app boot | "Resume meet-up?" prompt to BOTH parties before any data flows | No (paused until both consent) |

Each row is enforceable, machine-detectable, and constitutional. Implementations are measured against this matrix.

---

## §3 Truth over hope — LOCK

The system never displays a stale location as if it were live.

- **Stale** = greater than 60 seconds since last fix.
- After 60s, the marker dims, the timestamp surfaces explicitly, and the accuracy halo (if any) renders.
- After 90s, the marker enters "signal dropped" state per §2.
- After 3 min, the marker enters "offline" state per §2.

There is no UX justification for hiding staleness. If the other person is not where the marker says they are, the system has lied.

---

## §4 Framing rule — LOCK

Trajectory features are **never** framed as:

- "Live tracking"
- "Find friends"
- "Location sharing" (the noun *sharing* implies surveillance permission, not mutual convergence)
- "Trace"
- "Follow"
- "Where are you" (as a feature label)

Trajectory features **are** framed as:

- "Meeting convergence"
- "Shared arrival"
- "Live meet-up"
- "On the way" (state, not feature)
- "Heading together"

The frame is **mutual movement toward a shared destination**, never observation of another person. This is queer-safety language: trajectory exposure carries different risk for users whose location implies identity, intent, or community. The frame must reflect mutual convergence at all times.

This rule binds copy, marketing, push notification text, system messages, sheet titles, and analytics event names. An event named `live_tracking_started` is a doctrine breach even if no user sees the label.

---

## §5 SOS sovereignty — LOCK

SOS always interrupts trajectory.

- The party who triggers SOS sees the SOS flow immediately. Meet-up surface dismisses.
- The peer sees neutral "Meet-up ended" — no reveal of SOS unless the peer is one of the SOS trusted contacts (D48 exposure scope).
- The trajectory is auto-ended; the table row marked `ended_by: sos_interrupt`.
- Trajectory data deletes per §9 even when the end reason is SOS.

The peer is not entitled to know the SOS triggered. Safety flow trumps social flow trumps engagement flow. Always.

---

## §6 Block sovereignty — LOCK

A block during an active trajectory ends the trajectory immediately.

- The blocker disappears from the blocked party's view.
- The meet-up surface dismisses with neutral "Meet-up ended."
- No shame, no naming, no leak.
- The blocked party is not informed that a block occurred.
- The trajectory is auto-ended; the table row marked `ended_by: block` but this is not surfaced to either party.

Block is a privacy primitive. The system never leaks block events to the blocked party, even at the cost of ambiguity.

---

## §7 Auto-end conditions — LOCK

A trajectory auto-ends under any of:

- Either party hits SOS (§5)
- Either party blocks (§6)
- Either party hits `expires_at`
- Either party explicitly Stops Sharing
- Connection lost from both parties for >10 min
- Either party transitions to `off_grid` per D48
- Battery-dead resolution after 10 min (§2)
- Geofence arrival detection (50m radius around destination) — clean end

An auto-end is final. There is no implicit resume.

---

## §8 Recovery discipline — LOCK

Recovering trajectories on app relaunch must require **explicit consent from both parties** via a "Resume meet-up?" prompt.

- The system never silently resumes an exposure session.
- The prompt must show both parties: who is resuming, what destination, when the trajectory was paused, and an explicit decline option.
- Either party declining ends the trajectory cleanly.
- Resume is permitted only within 15 minutes of pause. After 15 minutes, no resume is offered.

The reason: trajectory exposure can become contextually wrong while the app is closed. Silent resume risks exposing one party to another in a context they would no longer consent to.

---

## §9 Data discipline — LOCK

Trajectory data is **session-scoped only.**

The system **never logs:**

- The full path
- Intermediate location samples
- Speed or movement patterns
- Cross-trajectory correlations (was this destination visited before?)
- Trajectory destinations as searchable history
- Departure/arrival times beyond the live session

The system **deletes on session end:**

- Live location heartbeats
- Heartbeat metadata (battery state, accuracy radius, network type)
- Inferred ETA history

The system **retains only:**

- The fact that a meet-up occurred (boolean, with start and end timestamps, ended_by reason)
- For audit purposes if a safety event was involved (SOS interrupt)

D44 §2 Privacy Invariant applies even here: the system never operationalises noticing that two meet-ups had the same destination.

---

## §10 What this doctrine forbids

Until a slice spec inherits from this doctrine and is ratified, the following may not ship:

- Any trajectory feature without §2 coverage for all nine failure modes
- Any UX that displays stale location as if it were live (§3 breach)
- Any user-facing copy that uses the §4 forbidden language
- Trajectory data persisted beyond the session (§9 breach)
- Implicit resume of trajectory after app relaunch (§8 breach)
- Notification surfaces that leak SOS or block reasons to the peer (§5, §6 breach)
- Cross-trajectory analytics joining on destinations or arrival patterns (§9 breach)
- Surface that implies surveillance permission rather than mutual convergence (§4 breach)

---

## §11 Inheritance and slice gate

This doctrine is a **hard prerequisite for Slice 6 (Live Meet-Up).** Slice 6 cannot open its first implementation PR until:

1. D52 ratified by Phil
2. Slice 6 scope doc explicitly cites D52 §-anchors for each failure mode
3. Slice 6 acceptance test matrix covers every row in §2
4. Slice 2 marker-distinction Z4 acceptance passes (forms the visual substrate for trajectory markers)

Future trajectory features (group meet-ups, drop-by, walk-home-safe, return-route, party-bus) all inherit from D52 by default. No new trajectory feature ships without §2 coverage.

---

## §12 Why "trajectory" is the right primitive

The doctrine is named **Trajectory Interruption**, not **Live Meet-Up Interruption**, because the constitutional concerns generalize past the first feature. Any future product surface that exposes one user's movement to another inherits D52:

- Group meet-up (more than two parties converging) — multiplies §2 failure modes per party
- Drop-by ("I'll swing past your area") — sustained exposure without a fixed destination
- Walk-home-safe ("Watch me get home") — asymmetric trajectory (one walking, one observing — adds explicit §4 concerns)
- Return-route — post-event safety trajectory
- Party-bus / shared-transport — group trajectory with venue endpoint

Each of those will need its own slice doc inheriting from D52, but the failure-mode contract, the framing rule, the SOS/block sovereignty, the data discipline, and the recovery rules all apply unchanged.

---

## §13 Ratification trail

- 2026-06-02 — D52 drafted. Triggered by Phil's strategic read during cinematic mockup scope ratification: *"Live Meet-Up is the first feature where continuity failure has emotional consequences."*
- §4 framing rule pre-locked from Phil's scope ratification: *"Do NOT market it initially as live tracking. Bad emotional frame."*
- Awaiting Phil ratification of the full doctrine before Slice 6 opens.

---

*End of D52.*
