# HOTMESS v6 — Build Package

This directory holds everything Cowork needs to build v6, plus the live build-state file that powers Phil's dashboard.

## Structure

```
docs/v6/
├── specs/          ← 33 spec docs + the original CLAUDE_CODE_BUILD_BRIEF.docx
├── components/     ← 13 production-ready JSX components from April 25, 2026
├── deprecated/     ← 27 older versions of specs — IGNORE these, they're superseded
├── Hotmess_User_Fields_v2.xlsx   ← canonical user schema reference
├── state.json      ← LIVE build state, Cowork keeps this current
└── README.md       ← this file
```

## How Cowork uses this

1. **Read specs from `specs/`.** Each chunk's spec docs are referenced by name in the v2 plan.
2. **Read components from `components/`.** Each JSX is the production-ready starting point — port to TS, place in `src/components/`, replace fragmented current implementation per chunk.
3. **Ignore `deprecated/`.** Historical only.
4. **Update `state.json` after every meaningful event** (see below).

## Cowork's responsibility for state.json

After every meaningful event, Cowork must overwrite `state.json` with current build state. Events that trigger an update:

- New branch created for a chunk
- Commit pushed to a chunk branch
- PR opened
- CI status changes (passing → failing or vice versa)
- PR merged into `feat/v6-spec-build`
- Feature flag flipped
- Deployment goes READY or ERROR
- Phil signs off on a chunk
- Ramp progresses (phil_only → admins → ...)

The schema is defined by the existing `state.json`. Don't change the schema without updating the dashboard.

### Quick state-update procedure

```bash
# Cowork pulls live state, mutates, writes back, commits
node scripts/update-v6-state.js \
  --chunk=04a \
  --status=in-progress \
  --pr=145 \
  --ci=passing
git add docs/v6/state.json
git commit -m "chore(v6): update state — chunk 04a in progress"
git push
```

(Cowork can also write the JSON manually if scripted update isn't built yet.)

### Recent activity log

Every state update should append to the `recent_activity` array (cap at most recent 50 events):

```json
{
  "kind": "merge",
  "icon": "✓",
  "what": "Chunk 00 merged to feat/v6-spec-build",
  "actor": "phil",
  "when": "2026-05-01T14:23:00Z",
  "url": "https://github.com/SICQR/hotmess-globe/pull/123"
}
```

### Feature flag mirror

When Cowork flips a flag in production Supabase (after Chunk 00 lands), it must also mirror the change into `state.json` `flags` array. The audit log lives in Supabase; the dashboard reads the mirror here for zero-token visibility.

```json
"flags": [
  {
    "key": "v6_all_off",
    "cohort": "off",
    "enabled_globally": false,
    "last_flipped": "2026-05-01T14:30:00Z",
    "last_flipped_by": "phil"
  }
]
```

### Infra mirror

Once a day (or when a chunk lands that affects infra), Cowork queries Supabase advisors + Stripe + funnel and mirrors the headline numbers into `state.json` `infra` and `funnel`. Detailed data stays in Supabase; this is a snapshot for the dashboard.

## Phil's dashboard

`hotmess-v6-build-dashboard.html` (delivered separately) reads this `state.json` over HTTPS via GitHub raw content. No tokens. No setup. Phil opens it in a browser tab and sees live state.

Dashboard URL pattern:
```
https://raw.githubusercontent.com/SICQR/hotmess-globe/main/docs/v6/state.json
```

Or, if Cowork pushes state updates to `feat/v6-spec-build` more frequently than to main:
```
https://raw.githubusercontent.com/SICQR/hotmess-globe/feat/v6-spec-build/docs/v6/state.json
```

The dashboard tries both.

## Don't

- Don't move or rename files in `specs/` or `components/`. The v2 plan references them by their exact filenames.
- Don't commit secrets to `state.json`. It's intentionally public-readable. Tokens, API keys, customer PII — never go here.
- Don't delete `state.json` even if v6 is fully shipped. After ramp completes, freeze the file as historical record.
