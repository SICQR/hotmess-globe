# D55 — Demand Signal Doctrine ("WANT IN")

**Status:** DRAFT — surfaced by Phase 2 deep-dive, awaiting Phil ratification.
**Path:** `docs/doctrine/55-demand-signal-doctrine.md` (proposed).
**Governs:** the `demand_signals` table, the `compute_demand_pressure()` function, and every WANT IN tap — the only surface where a member tells the system "I want this drop in my city."
**Inherits from:** D24 (Contextual Trust Weighting), D33 (Memory & Permanence), D56 (Unified Signal Emission Surface), governance/signal-economics-spec, sacred-invariants (#5, #6, #7, #9, #13).
**Inherited by:** any future curator dashboard, drop-allocation surface, or partner demand read.
**Why now:** the table self-identifies as "D55" in its own comment but no doctrine D55 exists. The data layer shipped ahead of its constitution; this draft writes the constitution the table already claims to obey.

---

## §0 — Why this doctrine exists

The WANT IN tap is the purest demand signal HOTMESS has: a member naming a specific drop they want in a specific city. It is commercially precious — it tells the curator what to make and where to send it — and it is privately dangerous, because the raw form of that intelligence is a permanent, fully-attributed ledger of *who wanted what, where, and when*.

The `demand_signals` table currently stores exactly that raw form: one row per tap, carrying `user_id`, `product_id`, `city`, `member_tier`, `nearest_active_beacon_id`, and a precise `signalled_at`, with no expiry. It is the inverse of D33 (Memory & Permanence): D33 §1.1 requires aggregate-only persistence and §1.2 requires identifying columns to be *physically absent*, and this table is a per-event log of identified desire.

The collision is the same one D24 resolved for trust: the platform must be able to *read demand* (to curate drops) without that knowledge mutating into a permanent dossier of what each named member wants. D24's move was "trust primitives are events reconstructed at query time, never stored scores." D55's move is the mirror: **demand primitives are decaying aggregates, never stored events.**

The single sentence: **HOTMESS may know that demand exists without remembering who wanted what.**

---

## §1 — Scope

D55 governs:
- The WANT IN emission and its persisted shape.
- The decay, expiry, and physical lifetime of demand data.
- Who may read demand, at what granularity.
- Whether and how demand may interact with ranking, boost, or trust.

D55 does NOT govern:
- Ticket/listing `demand_level` display badges (low/normal/high) — those are a derived display state on `market_listings`/tickets, not the demand ledger, and carry no per-user attribution.
- Operator-side analytics that consume only aggregate, anonymised demand pressure (permitted under §4).

---

## §2 — Core principle: demand is a decaying aggregate, not an event log

**§2.1 — The system stores demand pressure, not demand events.** The persisted artefact is a counter (per target, per city, per coarse time-bucket) that other writes increment, not a row per tap from which the tapper can be reconstructed. This is the D33 §1.1 aggregate-only pattern applied to demand. (Resolves T-01.)

**§2.2 — Identity is severed at the write boundary.** `user_id` is consumed *only* to enforce one-tap-per-member-per-target dedup and the insert-own RLS check; it is **not** persisted into the demand aggregate. Member tier, if retained at all, is retained as a coarse bucket on the aggregate (e.g. "founding vs. standard demand"), never joined back to a person. (D33 §1.2/§1.3.)

**§2.3 — Demand expires as a row, not just as a weight.** Read-time half-life decay (`compute_demand_pressure`) is necessary but not sufficient. Every demand contribution carries an `expires_at` and is physically swept after it. A WANT IN from beyond the demand window leaves no residue. (Resolves T-02; inherits SI #5.)

**§2.4 — Demand is curator intelligence, not member-readable signal.** No member may read another member's WANT INs, or any view from which another member's desire could be inferred. The current RLS posture (insert-own, no authenticated SELECT) is hereby constitutional, not incidental. (Holds T-03 closed.)

**§2.5 — Demand never manufactures credibility or buys ranking.** Demand pressure may inform what the curator chooses to drop and where. It may **not** lift a listing's ranking, fund a boost, or convert tier-weighted taps into prominence. (Resolves T-05; inherits SI #7/#9, signal-economics "Boosts cannot manufacture credibility.")

---

## §3 — Invariants (LOCK)

**§3.1** No persisted demand artefact contains, or can be joined to, the identity of an individual wanter. *(SI-aligned; D33 §1.2.)*

**§3.2** Every demand contribution has a non-null `expires_at` and a sweeper that deletes it. Read-time decay is additive to, never a substitute for, physical expiry. *(SI #5.)*

**§3.3** No member-facing read path over demand exists. Demand is service-role/curator-only, at aggregate granularity. *(D33 §2; T-03.)*

**§3.4** Demand may modulate curation (what to make, where to send) but is firewalled from ranking, boost, and trust. There is no edge from `demand_signals` to a visibility score. *(SI #7; signal-economics economic hierarchy.)*

**§3.5** The system never fabricates demand pressure to fill a quiet drop. Zero WANT INs renders as zero. Synthetic demand is a structural prohibition. *(SI #6 "the system never pretends there is activity when there is not.")*

**§3.6** Demand is a registered signal: it has a row in `signal_taxonomy` declaring its `visibility_scope` (curator-only), `supports_expiry` (true), and `requires_mutual` (n/a), so the signal-economics spec governs it like every other signal. *(Resolves T-06.)*

**§3.7** The write path is singular and exhaustive: WANT IN reaches the aggregate only through one function whose signature is the audit point. Direct client INSERT of identifying demand rows is revoked. *(D33 §1.5.)*

---

## §4 — Enforcement

| Invariant | Substrate / code enforcement |
|---|---|
| §3.1 No identity | Migrate `demand_signals` from per-event to aggregate: drop `user_id` from the persisted aggregate; keep it only as a transient function parameter used for dedup + RLS, never written to the aggregate table. Identifying columns physically removed (`ALTER TABLE` = the doctrinal audit point). |
| §3.2 Expire + sweep | Add `expires_at` (e.g. `now() + demand_window`); add a sweeper cron (sibling to existing `cron_runs` jobs) deleting expired contributions. `compute_demand_pressure` keeps its half-life as a *secondary* read-time smoother. |
| §3.3 Curator-only | Retain "insert-own, no authenticated SELECT." Any read surface ships behind service-role only; no per-user demand view is ever created. |
| §3.4 Firewall | No SQL join or function path connects demand pressure to `ranking-formula-spec` inputs. Reviewed at PR against the ranking-constitution. |
| §3.5 No synthetic demand | No code path may seed, backfill, or inflate demand counts. Quiet drops display honest zero. |
| §3.6 Registered signal | Insert a `signal_taxonomy` row for `demand_want_in` with curator-only `visibility_scope`. |
| §3.7 Single write path | Expose one SECURITY DEFINER `emit_demand_signal(...)` as the legal write; revoke direct table INSERT from `authenticated`; RLS on, policies minimal. |

---

## §5 — Failure modes (drift indicators)

1. **A `user_id` column surviving on the demand aggregate.** A who-wanted-what ledger. Forbidden by §3.1. *(This is the current state — T-01.)*
2. **No `expires_at` / no sweeper; "decay" implemented only as a read-time weight.** A permanent desire log wearing a decay label. Forbidden by §3.2. *(Current state — T-02.)*
3. **A member-facing "people who want this" or "X others want in" surface.** Re-opens cross-user leak. Forbidden by §3.3 *(and echoes D34 §4.6's ban on "3 others interested" deal-optimisation framing).*
4. **A join from demand to ranking/boost, or tier-weighted demand lifting visibility.** Forbidden by §3.4 — demand buying prominence is the SI #7 violation.
5. **Seeded or inflated demand counts to make a quiet drop look hot.** Forbidden by §3.5 (SI #6).
6. **Demand living outside `signal_taxonomy`/`signal_routing_logic`.** An ungoverned signal. Forbidden by §3.6. *(Current state — T-06.)*
7. **A second write path that inserts identifying demand rows directly.** Forbidden by §3.7.

---

## §6 — Acceptance test

A demand surface conforms when **all** hold:

- [ ] The persisted demand artefact contains no `user_id` and cannot be joined to an individual.
- [ ] Every demand contribution has a non-null `expires_at` **and** is physically swept.
- [ ] No authenticated (non-service) role can SELECT demand.
- [ ] No path connects demand to ranking, boost, or a trust score.
- [ ] Quiet demand renders as honest zero; no synthetic pressure.
- [ ] `demand_want_in` exists in `signal_taxonomy` with curator-only scope.
- [ ] Exactly one function writes demand; direct identifying INSERT is revoked.

---

## §7 — Companion references

- **sacred-invariants.md** — #5 (signals always expire), #6 (never fake activity), #7/#9 (trust outranks payment; boosts cannot manufacture credibility), #13 (unmeasurable rule is not production-ready), #17 (the signal engine is sacred).
- **D33 — Memory & Permanence** — §1.1 aggregate-only, §1.2 identifying columns physically absent, §1.3 boundary-side bucketing, §1.5 single exhaustive write path, §3.4 visibility-decay vs memory-expiry. *The spine of this doctrine.*
- **D24 — Contextual Trust Weighting** — §2 events reconstructed at query time, never stored scores; §8 anti-caste (demand must not become a per-user demand score).
- **D56 — Unified Signal Emission Surface** — §1 "the intent IS the signal," §2 no creator-economy primitives.
- **governance/signal-economics-spec.md** — controlled scarcity, finite + decaying signals, "do not fake heat," economic hierarchy (truth over tier), "boosts cannot manufacture credibility."
- **D34 — Trajectory & Connection Flows** — §4.6 no deal-optimisation behaviour ("3 others interested" ban applies to demand display).
- **Live artefacts:** table `demand_signals`; function `compute_demand_pressure(uuid,text,integer)`; conformant sibling `person_signals` (expiring, fuzzed, self-only — the shape `demand_signals` should mirror); governing tables `signal_taxonomy`, `signal_routing_logic`.

---

## §8 — Ratification note

The table already names this doctrine ("D55") in its own comment. Writing it is overdue, not premature. The single migration this draft implies — re-shaping `demand_signals` from an identified event log to an expiring, anonymised aggregate behind a single write function — is itself the D33 §4 "recurring audit" point: the `ALTER TABLE` that removes `user_id` is the visible doctrinal act that brings the substrate into conformance.
