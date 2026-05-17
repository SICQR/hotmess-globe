
---

## v3 corrective (2026-05-17 — HOTMESS voice + soft commerce menu)

**Status:** ship-it gate reset to v3. v2 was too plain; v3 adds HOTMESS swagger plus the soft member-tier menu Phil flagged was missing. 128 paused outbox rows still held. Awaiting Phil's `"ship v3"` on the new preview.

**What changed (copy + 1 route wiring, five files):**

- `docs/brand/voice.md` (NEW) — codifies the HOTMESS voice spec verbatim from the v3 brief. Future copy briefs reference it.
- `email-templates/reentry-invitation.mjml` — body rewritten per v3 canonical copy. Adds the menu paragraph (live globe / SOS / proximity / recovery-as-identity / radio / drops / HNH MESS / market) and the price menu paragraph (`£7.99/mo Hotmess` / `£19.99/mo Connected` / `£2.99 boosts`). ~180 words.
- `scripts/reentry-send.mjs` — `htmlBody()` + `textBody()` rewritten. `SUBJECT` now composed from `SUBJECT_BASE + SUBJECT_SUFFIX` env so preview carried `(v3 preview)` in Phil's inbox; bulk ship omits the suffix.
- `src/pages/ReentryPage.jsx` `'done'` phase — full welcome screen (not toast) per brief table. Headline + body + three CTAs:
  - **Primary** `Hit the globe →` → `/pulse`
  - **Secondary** plain-link `Upgrade to Hotmess — £7.99/mo` → `/pricing?tier=hotmess`
  - **Tertiary** `Or browse the market` → `/market`
- `src/App.jsx` — wires `/pricing` route → existing `Pricing.jsx` component (component existed; route did not). Brief failure-mode allowed stubbing; using the existing component is cleaner.

**Outbox row strategy:** unchanged — 128 paused rows re-render at ship time via `htmlBody()`, so they pick up v3 automatically. **Outbox count: 128 / paused, 0 / queued, 0 / sent.** No row UPDATE / DELETE.

**v3 preview sent.** Resend message ID: `463abfdd-faed-49e7-9461-ac6a99ff386a` (subject `You showed up too early. (v3 preview)`). v1 + v2 previews also still in Phil's inbox for audit trail; v3 is canonical.

**Untouched per v3 brief HARD out-of-scope:** migration, `reentry_tokens`, RPC, Dean grandfather, `REENTRY_SECRET`, the Phil-preview gate flow, partner pitch infra.

**Merged via:** PR #272, squash `fdd832113e37deda4e58f40004be846825102960`.
