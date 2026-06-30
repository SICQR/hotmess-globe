# BACKBONE SUMMARY — Phase 2 Doctrine⇄Code Conformance Audit

**SICQR/hotmess-globe (public) · backbone foundation · generated 2026-06-30**

This is the scoped, completable backbone — triage depth, not the full 22-surface deep conformance audit. It establishes the corpus index, the missing-number map, the surface triage matrix, and a drafted precedence doctrine.

---

## Headline findings

### 1. Rule census: enforceable vs aspirational
- **~95 enforceable rules** extracted across the corpus (measurable / thresholded / state-transitioned / rate-limited / auditable).
- **~10 aspirational-only rules** (tone, "feel", values without a measurable trigger).
- **~105 total rule rows** drawn from **90 documents**: 47 doctrine + 5 governance + 5 operations + 33 sealed specs (converted from `.docx`).
- The corpus is enforceable **by construction**: Sacred Invariant #13 and Developer-Rules §8 require every rule to carry an owner, an observable signal, a threshold, and a breach-action. Aspirational rules are the exception, and most are wrapped inside an otherwise-enforceable doc (e.g. D15 care-tone is soft, but its forbidden-vocabulary list is a live CI/DOM gate).

### 2. Surfaces with a doctrine gap
- **5 of 22 surfaces** carry a doctrine gap (code and/or DB exist with no governing — or only unwritten — doctrine):
  - **J Tickets/resale** (full gap — resale logic governed only by DB comments)
  - **M Trust/signal economy** (D55 `demand_signals` live, doctrine never written)
  - **N Safety/SOS** (D59 + D60 named but unwritten while code/DB are live)
  - **U GDPR/retention** (built; rules scattered, no consolidated retention doctrine)
  - **D Routing/trajectory** (D45/46/47 named-unwritten; travel/movement tables present but empty/stubbed)
- **0 surfaces are UNBUILT** (every surface that has doctrine also has code + DB presence).
- **16 of 22 surfaces are fully OK** (doctrine + code + DB all present).

### 3. Missing-number tally by status (numbering gaps in D00–D63)
- **(a) deleted: 0** — no number shows file-deletion evidence.
- **(b) never written: 22** — 23, 26, 27, 29, 30, 36–42, 45–47, 54, 55, 57–62. Of these, **9 are reserved/named** (D42 Commitment Depth, D45 Magnetic Movement, D46 Hover-Tap-Sheet Commit Chain, D47 Interaction Weight, D55 Demand Signals, D58/D59/D60 safety-contact family, plus the D23/26/27/29/30 "reactive fill" constitutional block EXECUTION §205 says are "to be written"); **13 are entirely unused** numbers.
- **(c) exists but off-convention or docx-only: 3** — D17 (docx-only, carried by the Market specs), D50 (= `GLOBE-CINEMATIC-RENDERING-SYSTEM.md`), D51 (= `GLOBE-ZOOM-SEMANTIC-SYSTEM.md`).

### 4. The four-library conflict has no resolver (now drafted)
HOTMESS governance lives in four parallel libraries (numbered spine · sealed `.docx` · governance specs · on-disk skills) that can contradict each other, with **no rule for which wins** — `HOTMESS-SystemAudit.docx` already logs exactly this (Flash expiry 120s vs "2 min"). `conflict-resolution-doctrine.md` proposes **D64**, fixing precedence as: Sacred Invariants > Governance specs > numbered spine > sealed `.docx` > skills, with safety-proximity then enforceability then recency as the resolving tests, and "exactly one canonical location per rule."

---

## Top 5 doctrine gaps to write first
Ranked by the risk of the surface they govern (safety-proximity first, per the decision hierarchy).

1. **D59 + D60 — Safety / SOS event orchestration & two-party trusted-contact agreement.** Highest risk: the safety surface (SOS, trusted contacts, `aa_escalation_log`, `safety_broadcasts`) is **live in code and DB** but the doctrines that should govern recipient consent (D59) and live-SOS orchestration (D60) are named-but-unwritten. Safety code running without its governing doctrine is the most dangerous gap in the platform. Write first.

2. **Ticket-resale doctrine (D17/J).** Full doctrine gap: FIFO resale queue, reissue windows, and `founding_fee_exempt` 0%-fee enforcement are shipped (`ticket_resale_queue`, `ticket_inventory_pools`) governed only by DB comments. Money + scarcity + fairness logic with no written rule invites both disputes and quiet drift.

3. **D55 — Demand-signal / "WANT IN" doctrine (M).** `demand_signals` ("every WANT IN tap, internal curator intelligence ONLY, never surfaced publicly") is a shipped table touching the signal economy and privacy substrate, with **no doctrine at all** — it exists only as a DB comment. Given D24/D33 constraints on per-user behavioural data, an ungoverned demand-intelligence table is a privacy-substrate risk.

4. **GDPR / retention consolidation doctrine (U).** Retention and erasure rules are scattered across D22, D06, and the Legal-Compliance docx, governing `gdpr_consents`(341), `gdpr_deletion_log`, and `user_data_requests`. A single consolidated retention doctrine is needed for legal defensibility (UK OSA 2023, GDPR Arts. 8/17).

5. **D45/D46/D47 — Movement & interaction-weight doctrines (D).** Named and depended-upon by D43 but unwritten; routing/trajectory code exists and travel/movement DB tables are provisioned (though empty). Write before the trajectory feature is filled in, so the build inherits the rule rather than retrofitting it.

*(Cross-cutting: ratify **D64 precedence doctrine** alongside these — without it, writing new doctrine into a spine that can be silently overridden by a sealed `.docx` or a skill leaves the gaps half-closed.)*

---

## Deliverables (this backbone)
- `corpus-index.md` — per-rule enforceability index across all 90 corpus docs.
- `missing-doctrine.md` — status of every numbering gap with grep evidence.
- `surface-triage.md` — 22-surface doctrine/code/DB matrix with gap flags.
- `conflict-resolution-doctrine.md` — drafted D64 library-precedence doctrine.
- `BACKBONE_SUMMARY.md` — this file.

## Method & constraints honoured
- Repo sparse-cloned (`docs/ src/ api/`); 33 `docs/v6/specs/*.docx` converted to greppable text via pandoc.
- Doctrine/code existence from targeted grep (no bulk reading of 350 src files).
- DB existence from a **read-only** `list_tables` census of Supabase `rfoftonnlwudilafhfkl` (~190 public tables). **No writes / no DDL** were issued.
- Triage depth only — not full per-rule conformance verification against code.

## Incidental security note (surfaced by the read-only census)
The Supabase advisor flagged **1 table with RLS disabled: `public.spatial_ref_sys`** (a PostGIS system table, 8500 rows). This is the standard PostGIS metadata table and is low-risk, but it is exposed to anon/authenticated roles. Remediation (`ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;`) is the user's call — enabling without policies would block PostGIS reads. Flagging per the advisor; not actioned (read-only mandate).
