# CONFORMANCE — Demand-signal / "WANT IN" surface (D55 gap)

> **Phase 2 deep-dive · Surface (M) Trust / signal economy.** Read-only DB census + targeted code grep. No repo or DB writes performed.
> Census date: 2026-06-30. Supabase project `rfoftonnlwudilafhfkl`.
> Companion draft: [`DRAFT-D55-demand-signal.md`](./DRAFT-D55-demand-signal.md)

---

## 0. Summary verdict

A `demand_signals` table is **live, RLS-on, and self-described as "D55"** in its own column comment — but **no doctrine D55 exists in `docs/doctrine/`.** The table is governed by a comment and a function, not by constitutional text. Worse, its *shape* is the inverse of what D33 (Memory & Permanence) requires: it stores **one identifying row per WANT IN tap** — `user_id` + `product_id` + `city` + `member_tier` + `nearest_active_beacon_id` + precise `signalled_at` — which is exactly the per-event, fully-attributed persistence that D33 §1.1/§1.2 declares structurally forbidden. It does **not** expire (Sacred Invariant #5 violation), and the decay is *display-only* (`compute_demand_pressure()` half-lifes the *weight* at read time but never deletes or anonymises the row).

**Severity ladder for this surface:**

| ID | Finding | Severity |
|---|---|---|
| T-01 | `demand_signals` retains a **per-event, fully-identified row** (`user_id`, `product_id`, `city`, `member_tier`, `beacon_id`, precise time) — the D33 §1.1/§1.2 substrate-incapability pattern is inverted. This is a who-wants-what-where-when ledger keyed to a real user. | **HIGH** |
| T-02 | **No expiry.** No `expires_at`, no purge cron, no TTL. `compute_demand_pressure()` applies a 14-day half-life to the *weight* at read time, but the underlying row lives forever. Violates Sacred Invariant #5 ("Signals always expire. Nothing is visible forever"). | **HIGH** |
| T-03 | **Cross-user leak surface is latent, not active, but the data is collected for it.** The only authenticated policy is `INSERT own`; there is no per-user SELECT, so a member cannot read others' WANT INs today — good. But the table aggregates *who wants what* across all users for service-role curator reads, and the comment frames it as "curator intelligence." Any future read surface, export, or partner dashboard built on this table would leak demand attribution. | **MEDIUM** |
| T-04 | **No doctrine, so no test.** D55 is referenced by the table comment and by `compute_demand_pressure()` but has no constitutional text. Per Sacred Invariant #13, an unmeasurable/unauditable rule is not production-ready — and there is no rule to audit against. | **MEDIUM** |
| T-05 | **Trust/ranking interaction is undefined.** `demand_signals` carries `member_tier` and `signal_count_for_target`, implying tier- and volume-weighted demand could feed ranking or boost. Nothing in signal-economics-spec or the ranking-constitution governs whether demand pressure may influence visibility — an unbounded path from "WANT IN taps" to "ranking lift" would violate "Trust outranks payment" (SI #7) if tiered demand became a paid-prominence side-channel. | **MEDIUM** |
| T-06 | `demand_signals` is **not registered in `signal_taxonomy`** (11 rows) and has no row in `signal_routing_logic` (8 rows). It sits outside the governed signal economy entirely — it is a signal the signal-economics spec does not know exists. | **LOW** |

---

## 1. Code entry points (targeted grep, `src/` + `api/`)

`demand_signal` / `want_in` / `wantin` returned **no matches in `src/` or `api/`.** The table is **DB-only**: it is written and read exclusively through the database (the `compute_demand_pressure()` SECURITY DEFINER function + presumed service-role / edge-function inserts), not through any committed application code in the sparse checkout. Related surfaces found:

| Path | Relevance |
|---|---|
| `src/lib/surfaceLayers.ts` | Only `want`-adjacent hit; a guardrail comment, unrelated to demand signals. |
| `src/components/tickets/TicketCard.jsx` (`demand_level` low/normal/high) | A *display* demand indicator on tickets — separate from `demand_signals`; consumes `listing.demand_level`, not the table. |
| `src/pages/tickets/TicketDetail.jsx` | Renders `listing.demand_level` badge. |

**Implication:** the WANT IN write path is not in this checkout (likely a Supabase edge function or a Shopify-webhook ingestion, given `shopify_handle`/`product_id`/`drop_source` columns). The doctrine must therefore govern the *table contract* and the *function*, because that is the only surface that exists.

---

## 2. Database census — `demand_signals` and signal-family tables

### 2.1 `demand_signals` (0 rows; comment: "D55: every WANT IN tap. Internal curator intelligence ONLY... Decay computed at read time via compute_demand_pressure().")

| Column | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL | **identifying** — the wanter |
| `product_id` | uuid | the wanted thing |
| `shopify_handle` | text | the wanted thing (commerce) |
| `city` / `city_slug` | text | **where** they want it |
| `member_tier` | text | **trust/tier attribution** (T-05) |
| `nearest_active_beacon_id` | uuid | **near-location attribution** |
| `drop_source` | text | provenance |
| `signalled_at` | timestamptz NOT NULL `now()` | **precise time** |
| `signal_count_for_target` | int NOT NULL `1` | running count per target |

- **RLS:** `demand_signals_admin_all` (service_role ALL, `true`/`true`) + `demand_signals_insert_own` (authenticated INSERT, `user_id = auth.uid()`).
- **No authenticated SELECT policy** -> members cannot read the table at all (good for cross-user privacy today, T-03). Only service role reads.
- **No `expires_at`, no DELETE policy for users, no purge** (T-02).

### 2.2 `compute_demand_pressure(p_product_id, p_shopify_handle, p_half_life_days=14)` — SQL, STABLE, SECURITY DEFINER
```
SUM( 0.5 ^ ( age_seconds / (half_life_days * 86400) ) )
```
- Half-lifes each row's contribution by age (default 14 days) and sums. **Decay is a read-time weighting only.** The row is never decayed *out of existence*. A WANT IN from a year ago still contributes a tiny (but non-zero) weight and, more importantly, **still exists as an identified row.** This is the precise distinction D33 §3.4 + SI #5 draw: visibility-decay is not the same as memory-expiry, and only the latter satisfies the invariant.

### 2.3 Signal-family context
- `signal_taxonomy` (11 rows): governs `signal_key`, `visibility_scope`, `supports_expiry`, `pulse_weight`, `requires_mutual`. **`demand_signals` is not represented here.** It is an ungoverned signal.
- `signal_routing_logic` (8 rows): `supports_trust_boost`, `supports_geo_boost`, `supports_time_decay`, `visibility_behavior`. **No row for demand.**
- `person_signals` (13 rows): the *correct* shape to compare against — it has `expires_at` NOT NULL (default `now()+4h`), `geog_fuzzed` + `fuzz_radius_m`, and self-only RLS. This is the conformant sibling that `demand_signals` should have been modelled on.
- `radio_signals`, `venue_upgrade_signals`: other signal-family tables, both with `created_at`; `radio_signals` has `expires_at`.

---

## 3. Privacy-substrate checks

### 3.1 Does it expire? (Sacred Invariant #5) — **NO (T-02).**
No `expires_at` column, no TTL, no purge cron (census of `cron_runs` for demand/expire/purge/cleanup jobs returned zero hits). Read-time half-life decays the *weight*, not the *row*. Verdict: **non-conformant.** SI #5 is unambiguous: "Nothing is visible forever. Default expiry applies even when premium extends it." A row that lives forever fails this even if its weight asymptotes to zero.

### 3.2 Does it leak who-wants-what cross-user? — **Not today; built to (T-03).**
No authenticated SELECT policy exists, so a member cannot query others' WANT INs. Cross-user leak is therefore **closed at the RLS layer right now.** But the table *collects and retains* full who-wants-what-where attribution for service-role "curator intelligence." The risk is latent: any future curator dashboard, partner export, or analytics join over this table re-opens the leak, and the data needed to leak is already being permanently retained. D33's posture is that you do not retain what you would not want to leak — the substrate should be *incapable*, not merely *currently un-exposed*.

### 3.3 Trust / ranking interaction? — **Undefined and unbounded (T-05).**
`member_tier` + `signal_count_for_target` are retained, which is the data you would need to make demand *tier-weighted* and *volume-weighted*. Nothing in signal-economics-spec, ranking-constitution, or ranking-formula-spec governs whether demand pressure may modulate visibility or boost. If tiered demand ever lifts ranking, it becomes a paid-prominence channel and collides with SI #7 ("Trust outranks payment... paid visibility may never manufacture credibility") and signal-economics "Boosts cannot manufacture credibility."

---

## 4. Inheritance the draft pulls from

| Source | What demand-signal doctrine must inherit |
|---|---|
| **sacred-invariants #5** | Signals always expire; row-level expiry, not just weight decay. |
| **sacred-invariants #7/#9** | Demand may inform curation; demand may never manufacture credibility or buy ranking. |
| **sacred-invariants #6** | The system never fakes demand; quiet WANT IN is a valid state — no synthetic demand pressure. |
| **D33 — Memory & Permanence §1.1-1.5** | Aggregate-only persistence; identifying columns physically absent; boundary-side bucketing; single write path. The demand ledger must be re-shaped to a counter, not an event log. |
| **D24 — Contextual Trust Weighting §2** | Trust is event-sequence reconstructed at query time, never a stored score; demand must not become a per-user demand *score* or caste. |
| **D56 — Unified Signal Emission §1/§2** | "The intent IS the signal"; no creator-economy primitives; demand is presence/intent emission, not a metadata object. |
| **signal-economics-spec** | Controlled scarcity; finite, decaying, tiered-by-truth-not-tier-alone; "do not fake heat"; demand must register in `signal_taxonomy`. |

---

## 5. The single sentence the draft must hold

> **HOTMESS may know that demand exists without remembering who wanted what.** Demand pressure is a decaying aggregate the curator can read; it is not a permanent, per-user, per-place ledger of desire.
