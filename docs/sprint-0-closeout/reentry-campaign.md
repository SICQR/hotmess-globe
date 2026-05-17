
---

## v2 corrective (2026-05-17 — copy-only)

**Status:** ship-it gate reset to v2. v1 preview was sent + acknowledged but
not flipped. v2 preview now in Phil's inbox; flip waits on Phil's reply.

**What changed (copy-only, four files):**

- `email-templates/reentry-invitation.mjml` — body prose replaced per v2 brief. Subject + structure + button styling unchanged.
- `scripts/reentry-send.mjs` — `htmlBody()` + `textBody()` re-rendered. New CTA "Come back to HOTMESS →", new community-recognition framing ("one of 154 people who showed up before this platform was real"), OG-50 phrasing ("community recognition, a small badge on your profile, the satisfaction of saying you were here when. No price tag. No upsell.").
- `api/auth/reentry-complete.js` — adds `spot_number` to response (cohort count incl. this profile after the FOR-UPDATE write).
- `src/pages/ReentryPage.jsx` — post-success welcome renders inline per the v2 brief table:
  - `original_50`: "You're back. OG 50 spot N — that's a permanent badge on your profile. Welcome home."
  - `founding`: "You're back. Founding member #N. Welcome home."
  - `early`: "You're back. Welcome home."

**Outbox row strategy:** no UPDATE or DELETE on the 128 rows. They store `metadata.needs_token_mint=true` with no rendered HTML; the dispatcher re-renders per row via `htmlBody()` at ship time. Bumping the script body is sufficient. **Outbox row count remains 128 / paused.**

**v2 preview sent.** Resend message ID: `efe2dab8-aba9-4ade-a12a-4636a9451af6` (replaces v1 `e60970d6-4193-4e90-a5a0-fd11bdbcc54f`). Both still appear in Phil's `scanme@sicqr.com` inbox; the v2 is the one to read for ship-it.

**Untouched per v2 brief HARD out-of-scope:** migration, `reentry_tokens` table, `assign_founding_status_slot()` RPC, Dean grandfather, `REENTRY_SECRET` env, the 128 outbox rows themselves, the Phil-preview gate flow, partner pitch infra, Sprint 1 #01 notification routing.

**Merged via:** PR #271, squash `3fe225df5f60cba49be46cfdaee70c9879316d91`.
