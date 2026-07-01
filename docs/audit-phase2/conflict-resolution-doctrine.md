# D64 — Doctrine Library Precedence Doctrine

**Status:** DRAFT (proposed). House format: principle -> invariants -> enforcement -> failure modes.
**Author:** Phase 2 backbone audit, 2026-06-30. For Phil's ratification.
**Forecloses:** the unresolved question of which of HOTMESS's four parallel doctrine libraries wins when they disagree. No such rule currently exists; `developer-rules-checklist.md §10` and `sacred-invariants.md` name a partial hierarchy but neither addresses the sealed `.docx` specs or the on-disk skills, and neither is itself binding over the others.

---

## §0 The problem this doctrine exists to solve

HOTMESS governance is spread across **four libraries that can and do disagree**:

1. **The numbered spine** — `docs/doctrine/Dxx-*.md` (D00–D63) plus `sacred-invariants.md`, `product-doctrine.md`, `beacon-doctrine.md`. Living, version-controlled, cross-referenced, written to be enforceable.
2. **The sealed `.docx` specs** — `docs/v6/specs/*.docx` (33 files, several marked `-SEALED` / `-LOCKED` / `-FINAL`). Detailed, threshold-rich, but binary, un-greppable until converted, and frozen at seal time.
3. **The governance specs** — `docs/governance/*.md` (ranking-constitution, ranking-formula, signal-economics, trust-system, developer-rules-checklist). Tier-1 constitutional, threshold-bearing.
4. **The on-disk skills** — operator/agent skills (e.g. `hotmess-cowork`) that encode operational behaviour and credentials, executed by agents acting on the platform.

Today, when two of these disagree (e.g. Flash expiry "120s" in the docx vs an implicit value elsewhere, or a `-SEALED` spec contradicting a newer numbered doctrine), **there is no rule for which wins.** The result is silent drift: whoever the implementer happened to read becomes the de-facto law. `HOTMESS-SystemAudit.docx` already catalogues exactly this class of conflict (#1: Flash expiry 120s vs "2 min").

---

## §1 Principle

> **The most recently ratified, most enforceable, most safety-proximate statement of a rule wins — and there must always be exactly one canonical location for each rule.**

Precedence is not seniority of format. It is a function of three ordered tests: **safety-proximity, then enforceability, then recency** — applied within a fixed library precedence order that resolves ties.

---

## §2 Invariants

**§2.1 — Sacred Invariants are supreme, always.** `sacred-invariants.md` (and the decision hierarchy Safety -> Truth -> Trust -> Freshness -> Momentum -> Readability -> Relevance -> Monetization) wins over **every** library, in every conflict, with no exception. This is restated from sacred-invariants.md's own "if any other governance doc contradicts this doc, this doc wins" and is not weakened here.

**§2.2 — The library precedence order is fixed:**

1. **Sacred Invariants** (`sacred-invariants.md` + decision hierarchy)
2. **Governance canonical specs** (`docs/governance/*.md`) — ranking, signal-economics, trust, developer-rules
3. **The numbered doctrine spine** (`docs/doctrine/Dxx-*.md`, `product-doctrine.md`, `beacon-doctrine.md`)
4. **Sealed `.docx` specs** (`docs/v6/specs/*.docx`)
5. **On-disk skills** (operator/agent skills)

Anything higher beats anything lower on a direct contradiction.

**§2.3 — Recency overrides within a tier, never across the safety boundary.** A newer doctrine in tier 3 beats an older doctrine in tier 3. A newer `.docx` (tier 4) does **not** beat an older spine doctrine (tier 3) on the same rule — format precedence holds — UNLESS the spine doctrine explicitly defers to the spec. Recency is a tie-breaker inside a tier, not a tier-jumper.

**§2.4 — Sealed/Locked is a freshness flag, not a precedence flag.** A `.docx` marked `-SEALED`/`-LOCKED` means *its authors froze it*; it does **not** elevate it above the numbered spine or governance. A sealed spec that contradicts a newer numbered doctrine is **superseded**, and the spec must be marked superseded (per `HOTMESS-SYSTEM-INDEX-FINAL`: "superseded files must never sit alongside active").

**§2.5 — Skills are downstream, never upstream.** On-disk skills encode *how to operate* the platform; they may never define or override a *rule*. If a skill's behaviour contradicts any doctrine library, the doctrine wins and the skill is the bug. Skills inherit; they do not legislate.

**§2.6 — Exactly one canonical location per rule.** Per developer-rules-checklist §9. When the same rule appears in two libraries, the lower-precedence copy must be rewritten to **reference** the canonical one, not restate it. Duplicated rules are a conflict waiting to happen and are treated as a defect.

**§2.7 — `.docx` content is not enforceable until converted.** A rule that lives only in a sealed binary `.docx` cannot be CI-checked, grepped, or audited, and therefore — per Sacred Invariant #13 — is **not production-ready** as a rule. Sealed specs must be converted to greppable text (as Phase 2 did) and, if load-bearing, promoted into the numbered spine before they can govern shipped code.

---

## §3 Enforcement

- **Precedence resolver (doc-lint).** A CI job parses the `Status:`/ratification-date header of every doctrine and governance file and the seal-date of every spec, builds a rule-to-location index, and flags any rule asserted in two libraries with differing values. Owner: governance maintainer (Phil or delegate).
- **Conflict register.** Extend `HOTMESS-SystemAudit.docx`'s conflict table into a living `docs/governance/conflict-register.md`: every detected cross-library disagreement gets one row (rule, locations, resolved value, winning tier). No silent merges (developer-rules §10).
- **Supersession marking.** When the spine supersedes a `.docx`, the `.docx` moves to `docs/v6/deprecated/` (the convention already in use) and the spine doctrine names it as superseded.
- **PR gate.** Any PR that touches a rule present in >1 library must update the canonical copy and convert lower copies to references, or it fails review (developer-rules §11/§12).
- **Skill audit.** Skills are reviewed against current doctrine on every doctrine change; a skill encoding a stale rule is patched, not honoured.

## §4 Failure modes (what this doctrine prevents)

- **Silent drift** — implementer reads whichever library they found first; two features ship with two values for the same rule. (The Flash-expiry 120s-vs-"2 min" bug is the canonical example.)
- **Seal-as-supremacy** — a `-LOCKED` spec being treated as unoverridable simply because it says LOCKED, blocking a newer, safer numbered doctrine.
- **Skill-as-law** — an operator skill's convenience behaviour quietly overriding a safety doctrine because the agent executing it never consulted the spine.
- **Orphan rules** — a rule (e.g. D55 demand-signals) living only in a DB comment or a skill, governing live code with no doctrine the resolver can check.
- **Duplicate-and-diverge** — the same rule restated in governance and in a docx, then edited in only one place.

---

## §5 Recommended immediate actions (triage)

1. Ratify this as **D64** and add it to the numbered spine (it is itself a constitutional doctrine; per EXECUTION's pair pattern its pair is *[multiple sources of truth preserved, contradiction-without-resolution forbidden]*).
2. Promote the load-bearing sealed specs (Legal-Compliance, Content-Policy, DevHandoff thresholds, NightOperatorPanel) into numbered spine doctrines so they become CI-enforceable (§2.7).
3. Write the orphan doctrines that govern shipped code first: **D55 (demand signals), D59/D60 (safety), ticket-resale doctrine** — see surface-triage.md.
4. Rename `GLOBE-CINEMATIC-RENDERING-SYSTEM.md` -> `50-*.md` and `GLOBE-ZOOM-SEMANTIC-SYSTEM.md` -> `51-*.md` for greppability.
