# Missing Doctrine — Numbering Gap Analysis

**Phase 2 backbone audit · SICQR/hotmess-globe · generated 2026-06-30**

The numbered doctrine spine runs D00–D63 but is not contiguous. Files present on disk: D00–16, 18–22, 24–25, 28, 31–35, 43–44, 48–49, 52–53, 56, 63, plus two slot-named files (GLOBE-CINEMATIC = D50, GLOBE-ZOOM = D51). This analyses every missing number.

**Method.** For each missing number N: (1) is there an on-disk file `Nx-*.md`? (2) how many times is `DN` cited as a token across `docs/doctrine/` + the 33 converted `.docx` specs? (3) what does the citing context say about its status? Decisive evidence: `docs/doctrine/EXECUTION.md` line 205 explicitly states *"When D23, D26, D27, D29, D30 **are written** (and any future constitutional doctrine after them)…"* — confirming those are reserved-but-unwritten.

Status key: **(a) deleted** = was a file, now gone but still cross-referenced; **(b) never written** = reserved/cited as future or entirely unused; **(c) docx-only** = governing content lives in a sealed `.docx`, not in the numbered spine.

| number | status | evidence |
|---|---|---|
| 17 | (c) docx-only | No `17-*.md`. Cited 47× as `D17` and listed in HANDOVER + PLATFORM-EXPANSION as an active doctrine ("D17 + D19 + D20 + D22 + D34 against real surfaces"). Its subject (commerce/transaction surface) is carried by the sealed Market specs (`HOTMESS-Market-Commerce-Rules.docx`, `HOTMESS-Stripe-Payments-v1.docx`). The number is treated as live but its text never landed as a spine `.md`. |
| 23 | (b) never written | No file; 7× `D23` token hits, all in EXECUTION/HANDOVER. EXECUTION §205 names it among "When D23, D26, D27, D29, D30 are written" — explicitly a reserved future constitutional doctrine, not yet authored. |
| 26 | (b) never written | No file; 9× hits, same EXECUTION §205 "are written" list. Reserved future constitutional doctrine. |
| 27 | (b) never written | No file; 7× hits, EXECUTION §205 list. Reserved future. |
| 29 | (b) never written | No file; 7× hits, EXECUTION §205 list. Reserved future. |
| 30 | (b) never written | No file; 7× hits, EXECUTION §205 list. Reserved future. (D23/26/27/29/30 are the named "reactive fill" block — constitutional slots deliberately held open between the written D24/D25/D28/D31–33.) |
| 36 | (b) never written | No file; 1 faint token hit, no defining context. Unused number. |
| 37 | (b) never written | No file; **0** token hits anywhere in corpus or docx. Never written, never referenced. |
| 38 | (b) never written | No file; 0 defining hits (HANDOVER mention is incidental). Never written. |
| 39 | (b) never written | No file; **0** token hits. Never written. |
| 40 | (b) never written | No file; **0** token hits. Never written. |
| 41 | (b) never written | No file; 1 token hit, no defining context. Unused. |
| 42 | (b) never written — reserved/named | No file, but 12× `D42` hits with a clear reserved title: **"D42 Commitment Depth"** (cited in D43 as "D42 owns the mechanism … commitment-depth filter"). Named and depended-upon but the doctrine text is not yet written. |
| 45 | (b) never written — reserved/named | No file; 2× hits, named **"D45 Magnetic Movement"** in D43's family list (D42+D43+D44+D45+D46). Reserved/named, unwritten. |
| 46 | (b) never written — reserved/named | No file; 3× hits, named **"D46 Hover-Tap-Sheet Commit Chain"** in D43's family. Reserved/named, unwritten. |
| 47 | (b) never written — reserved/named | No file; 2× hits, named **"D47 Interaction Weight Doctrine"** ("may codify it when the D42 question stabilises"). Explicitly future. |
| 50 | (c)/renamed — EXISTS as named file | Not `50-*.md` but lives as `GLOBE-CINEMATIC-RENDERING-SYSTEM.md` whose H1 is **"D50 — Globe Cinematic Rendering System"** (30× `D50` hits, ratified 2026-06-02). The number IS written; only the filename breaks the numeric convention. |
| 51 | (c)/renamed — EXISTS as named file | Lives as `GLOBE-ZOOM-SEMANTIC-SYSTEM.md`, H1 **"D51 — Globe Zoom Semantic System"** (17× hits). Written; filename breaks convention. |
| 54 | (b) never written | No file; **0** token hits. Never written. |
| 55 | (b) never written — referenced by feature | No file; 0 `D55` token hits in corpus text, BUT the live DB has a `demand_signals` table commented "**D55**: every WANT IN tap." So D55 governs shipped code yet has no doctrine document — a doctrine living only in a DB comment / code, never as a written doc. |
| 57 | (b) never written | No file; **0** token hits. Never written. |
| 58 | (b) never written — reserved/named | No file; 1× hit. Adjacent to D59 in the safety-contact family. Reserved, effectively unwritten. |
| 59 | (b) never written — reserved/named | No file; 4× hits, named **"D59 — Trusted Contact as Two-Party Agreement / recipient side"** (cited by D63). Named and depended-upon, text unwritten. |
| 60 | (b) never written — reserved/named | No file; 3× hits, named **"D60 — Safety Event Orchestration"** ("Live SOS events must apply D63 … ratify there before any naming"). Named, depended-upon by D63, text unwritten. |
| 61 | (b) never written | No file; **0** token hits. Never written. |
| 62 | (b) never written | No file; **0** token hits. Never written. |

---

## Tally by status

| status | count | numbers |
|---|---|---|
| (a) deleted | **0** | — (no evidence of any number that was a file and was removed) |
| (b) never written | **22** | 23, 26, 27, 29, 30, 36, 37, 38, 39, 40, 41, 42, 45, 46, 47, 54, 55, 57, 58, 59, 60, 61, 62 (incl. 9 named/reserved slots and 13 fully unused) |
| (c) docx-only or renamed-file (exists) | **3** | 17 (docx-only), 50 (renamed file), 51 (renamed file) |

(Counts to 25 distinct gaps; the prompt's list of 28 numbers includes 17/50/51 which resolve to existing-content cases, leaving 22 truly unwritten plus the 3 above. No number shows deletion evidence.)

### Two findings worth flagging
1. **D50 and D51 exist but violate the naming convention** (`00-canonical-naming.md` would prefer `50-*.md` / `51-*.md`). Triage recommendation: rename for greppability so future audits don't read them as gaps.
2. **D55 is the inverse risk**: it has **no doctrine doc at all** yet already governs a shipped table (`demand_signals`, "every WANT IN tap, internal curator intelligence ONLY"). That is an unbuilt-doctrine-over-built-code gap — code is enforcing a rule that was never written down. This is the most dangerous class in this list.
