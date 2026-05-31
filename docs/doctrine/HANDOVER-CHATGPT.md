# HOTMESS Doctrine Handover — for ChatGPT

**Date:** 2026-05-31
**Author:** Phil Gizzie (via the previous AI session)
**Purpose:** Resume the HOTMESS doctrine stack and convergence slice without restarting context. Read this before doing anything.

---

## §0 Read This First

You are taking over from a session that built the constitutional doctrine layer of HOTMESS. The work is on the `SICQR/hotmess-globe` GitHub repo. Production is at `hotmessldn.com`. Phil delegates execution — do not ask him for information that is in this document or in the existing doctrine docs.

**The single binding rule for all your work:**

> Every doctrine or slice you write must use the **HOTMESS Slice Execution Format** locked in `docs/doctrine/EXECUTION.md`. Read that file first. If a scope doc does not produce all nine sections, the scope doc does not ship.

**The single operational shift:**

> Stop asking "what should HOTMESS be?" Start asking "which locked doctrine does this surface violate?"

---

## §1 What Already Shipped

### §1.1 Shipped doctrines (canon-locked, in `docs/doctrine/`)

| File | What it governs |
|---|---|
| `EXECUTION.md` | Meta-doctrine. Doctrine-to-product transformation. Slice Execution Format. **Read first.** |
| `08-visibility-state-architecture.md` | Off-grid / public / incognito visibility states |
| `12-drop-beacon-doctrine.md` | Beacon semantics |
| `14-routing-continuity-doctrine.md` | InAppDirections; no Google Maps escape |
| `15-care-language-doctrine.md` | Care tone; D15 violations are sacred |
| `16-surface-layer-doctrine.md` | Z-index registry, shield/FAB/PTR |
| `18-product-sheet-layout-doctrine.md` | Product sheet zones; Media Hierarchy §7 (campaign creates desire, product validates) |
| `19-marketplace-doctrine.md` | Preloved + Ticket Resale, Commerce Beacon Doctrine (§6.10), No Marketplace SEO Tone (§11.1) |
| `20-identity-doctrine.md` | The four identity layers (Presence/Safety/Legal/Recovery). Sacred sentence: *"A user may be socially pseudonymous while remaining legally accountable to the platform."* |
| `22-temporal-doctrine.md` | The HOTMESS philosophy of memory. Sacred sentences: *"Remember enough to preserve continuity, never enough to reconstruct a life"* + *"The right to become unknown again."* |
| `34-trajectory-doctrine.md` | Shared trajectory as canonical primitive. Connection Escalation Ladder (Ambient → Contextual → Coordinated → Converged → Trusted → Care). 7 Universal Connection Laws. |

D20, D22, D34 are the **constitutional trio**. Everything else inherits from them. Read them in that order.

### §1.2 Slice docs (in `docs/doctrine/slices/`)

| File | Status |
|---|---|
| `convergence-v1.md` | **Active slice.** PR 1 + PR 2 merged. PR 3 + PR 4 remaining. |
| `ghosted-nearby-blend.md` | Scoped, not built |
| `editorial-aspect.md` | Shipped (PR #724) |

### §1.3 Recent PRs (most recent first)

| PR | Subject | State |
|---|---|---|
| #732 | Convergence v1 PR 2: QuietContactPanel + ChatSheet convergence banner | Merged to main; **production NOT promoted** (flag off) |
| #731 | Convergence v1 PR 1: L2HybridExchangeSheet contract | Merged to main; **production NOT promoted** (flag off) |
| #730 | EXECUTION rule + convergence-v1 slice scope | Merged to main + production |
| #729 | D22 Temporal Doctrine | Merged + production |
| #728 | D34 Trajectory Doctrine | Merged + production |
| #727 | D20 Identity Doctrine | Merged + production |
| #726 | D19 Marketplace Doctrine | Merged + production |

Current production sha: `4f1624103dac5708ce6755c83f1130116a44a433`.
Current main sha (ahead of production by 2 PRs that are flag-gated): `3b68cc4d215109c250ce5ce0cdbfe6ad335a1af8`.

---

## §2 What Phil Locked As The Next Architecture Sequence

Phil promoted D22 to Tier 1 and elevated D31. The full sequence:

### Phase 1 — Legal / Identity Reality
1. ✅ **D20 — Identity Doctrine** (shipped)
2. ⬜ **D21 — Payment & Payout Doctrine** (DEFERRED — Phil's call: *"D21 without real behavioural surfaces risks becoming theoretically correct financial infrastructure. Write D21 after observing the convergence slice."*)
3. ✅ **D22 — Temporal Doctrine** (shipped)

### Phase 2 — Behavioural Integrity
4. ⬜ **D24 — Contextual Trust Weighting Doctrine** (renamed from "Trust Score" — must stay invisible, alters routing not display)
5. ⬜ **D25 — In-App Messaging Doctrine**
6. ⬜ **D28 — Refund & Cancellation Doctrine**

### Phase 3 — Ecosystem Governance
7. ⬜ **D31 — Venue & Partner Power Doctrine** (Phil-elevated to top-tier seriousness)
8. ⬜ **D32 — AI & Automation Doctrine** (must explicitly ban synthetic intimacy, engagement optimisation, emotional prediction)
9. ⬜ **D23 / D26 / D27 / D29 / D30 reactive fills**

### Phase 4 — Long-Term Philosophical Infrastructure
10. ⬜ **D33 — Memory & Permanence Doctrine** (inherits D22)

---

## §3 The Convergence Slice (Active Implementation)

**File:** `docs/doctrine/slices/convergence-v1.md`
**Purpose:** Pressure-test D08 + D17 + D19 + D20 + D22 + D34 against real surfaces in a single end-to-end path: **beacon → hybrid sheet → temporary chat → handoff → decay.**

### §3.1 PRs in the slice (per §8 of the slice doc)

- ✅ **PR 1 — L2HybridExchangeSheet contract** (PR #731). New sheet with trajectory line, symmetric identity, listing context, contact placeholder. Feature-flagged `VITE_CONVERGENCE_HYBRID_SHEET`.
- ✅ **PR 2 — QuietContactPanel + ChatSheet convergence banner** (PR #732). Three D34-ladder affordances; L2ChatSheet accepts `convergenceContext` prop and renders banner above composer.
- ⬜ **PR 3 — Handoff completion + resolution language.** Replace marketplace verbs with `Passed on / Sorted / Covered / Claimed / Going together / Heading there / Picked up / Handed over`. Atmospheric aggregate write on handoff. Text-scan CI gate against prohibited words (`Sold / Buyer / Transaction / Order / Seller completed`).
- ⬜ **PR 4 — Retention enforcement + context decay.** Trajectory context decay schedule for hybrid sheet (24h → "Crossed recently" → 7d gone). Thread-decay scheduled job. Off-grid hardening. Care quarantine binding. Archive export check confirms 30-day destruction.

### §3.2 Acceptance tests (slice §5 — 8 doctrine-bound tests)

Read `docs/doctrine/slices/convergence-v1.md §5` for the full list. Each PR must point at the specific tests it satisfies.

Phil eye-tested PR 2 on his phone. Visual was confirmed: gold-bordered "Heading to Eagle too?" as primary, "Still available?" secondary, "Need one?" tertiary, with the `CONVERGENCE` caps label above the primary. Reading order: trajectory → identity → listing → contact panel. He did not flag feel-issues.

### §3.3 Preview branch

- Branch: `preview/convergence-pr1`
- Latest commit: `b063a5e121aaed83aed38f59489ebd667af6818a`
- URL: `https://hotmess-globe-git-preview-conver-8409f3-phils-projects-59e621aa.vercel.app/?_vercel_share=yaxPoQQm7yipYWC9quT8DUlgaDe5B0qd&_hp=1`
- Mock states: `?_hp=1` pseudonymous, `?_hp=2` disclosed, `?_hp=offgrid` off-grid
- **DO NOT** merge the preview branch. **DO NOT** promote it. It's a throwaway eye-test branch.

### §3.4 Production state

Production stays at `4f1624103dac5708ce6755c83f1130116a44a433`. The hybrid sheet does NOT render in production until somebody flips `VITE_CONVERGENCE_HYBRID_SHEET=true` in the Vercel project env vars. That decision is Phil's, not yours.

---

## §4 What To Do Next

### §4.1 Default next action (if Phil hasn't said otherwise)

**Ship PR 3 of the convergence slice.** Per the slice doc:

- One behavioural change: handoff completion + resolution language locked
- Acceptance tests to satisfy: §5.3 (no individual exchange data on atmospheric), §5.5 (text-scan against prohibited verbs)
- Rollback path: revert resolution copy + gate atmospheric write behind a flag
- Maximum 4 files touched, PR description fits on one screen.

### §4.2 Alternative — if Phil flags a feel-issue with PR 2

Fix the hybrid sheet panel before PR 3. Do **not** start PR 3 until the panel feels right. Phil's exact warning was: *"If yes, PR 3 starts. If no, fix the sheet contract before adding interaction."*

### §4.3 If Phil asks to write a new doctrine

Use the order in §2. D24 (Contextual Trust Weighting) is next in Phase 2 after the convergence slice ships. Phil's rename is binding: it is **never** called "Trust Score." The sentence *"the OS feels different to high-trust users without ever telling them they are high-trust users"* is the test of whether the doctrine is doing its job.

D31 (Venue & Partner Power) is the most existential of the unwritten doctrines. Phil's framing: *"who controls the nightlife layer?"*

---

## §5 The Tone Rules That Cannot Drift

These are quoted from Phil's own words across the session. If you write copy or doctrine and any of these would be violated, the work is doctrinally wrong:

- *"HOTMESS is built by preserving behavioural coherence across every surface."*
- *"The OS should feel right before it feels addictive."*
- *"HOTMESS commerce should feel circulated, not extracted."*
- *"Continuity is more important than exhaustive recall."*
- *"Disclosure is not a trust accelerant."*
- *"You do not earn the right to be here."*
- *"Business pressure is not architectural authority."*
- *"Aggregate atmosphere may influence ambience, never enforcement."*
- *"Convenience is not justification for layer collapse."*

The HOTMESS register: **human, nocturnal, infrastructural, emotionally intelligent.** Never: activist abstraction, GDPR-tech legalism, startup trust language, marketplace SEO, creator-economy verification.

---

## §6 Operational Mechanics

### §6.1 GitHub workflow

- Repo: `SICQR/hotmess-globe`
- PAT lives in `/sessions/<id>/.git-credentials` on Phil's session shell. You can pull blobs and push commits via REST API. Pattern used throughout the session:
  1. Get current main SHA + tree
  2. Create blob(s) for changed file(s)
  3. Create new tree based on main's tree with blob(s)
  4. Create commit on top of main
  5. Create ref/branch
  6. Open PR via API
  7. Merge via API (squash)
  8. If production should follow: force-update `refs/heads/production` to new main SHA via `PATCH /repos/.../git/refs/heads/production`

### §6.2 Vercel

- Project ID: `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO`
- Team ID: `team_ctjjRDRV1EpYKYaO9wQSwRyv`
- Production branch: `production`
- Preview previews: every branch push auto-builds
- Feature flag for convergence slice: `VITE_CONVERGENCE_HYBRID_SHEET`. Currently UNSET (so default off) in production. Flipping is Phil's call.

### §6.3 Supabase

- Project ref: `rfoftonnlwudilafhfkl` (eu-west-2)
- A throwaway edge function `tmp-brand-upload` exists for asset uploads. Currently neutralised (verify_jwt:true, returns 410). To use it, redeploy with the upload logic temporarily, push asset, re-neutralise. Pattern used in PR #725 (DROPS hero) — see commit history.

### §6.4 Slice format enforcement

Every slice scope doc you write must contain all 9 sections from `docs/doctrine/EXECUTION.md §4`:
1. Governing doctrines
2. Surface being changed
3. Behavioural thesis
4. Sacred invariants
5. Failure modes
6. Acceptance tests
7. Retention classification
8. Instrumentation
9. PR sequence + observation window

**Maximum 4 PRs per slice. Each PR fits on one screen. Each PR has one acceptance test + one rollback path.**

---

## §7 Active Open Threads (Lower Priority)

- `#412` — Ghosted nearby fallback: blend with recent when sparse. Scope doc exists.
- `#190` — SOS trusted contacts via Telegram scope
- `#225` — Observation phase parked; no boost shipping until signal arrives
- `#234` — Onboarding Truth Architecture (D09) content (skeleton exists)
- `#274` — Delete `Auth.jsx` after telemetry observation
- `#352` — 24h cleanup: remove old Supabase URL from Google OAuth client

These can wait. Do not touch them unless Phil specifically asks.

---

## §8 The One Thing You Should Not Do

**Do not freelance product philosophy.** The doctrine stack is the contract. If a question is ambiguous, the answer is in one of D20 / D22 / D34 / D19 / EXECUTION. If you cannot find the answer there, ask Phil one direct question — do not write a 1000-word philosophical proposal.

The session that produced this handover spent its first half writing doctrine and its second half implementing the first slice. The doctrine is strong enough now that execution velocity is the bottleneck, not architectural clarity.

Move fast against locked contracts.

---

## §9 Final Sentence

> HOTMESS is trajectory infrastructure. It is not a marketplace. It is not a map. It is not a chat app. It is the system through which queer nightlife continues across time, identity, and city.

If you forget everything else in this handover, hold on to that.

— end —
