# HOTMESS — Consolidation Plan
**Generated:** 2026-02-26

---

## CURRENT STATE

- **1 live repo:** `hotmess-globe` (Vite + React + Supabase)
- **50+ dead/archived local copies** in Downloads, Desktop, Documents
- **80+ stale remote branches** (copilot/*, cursor/*)
- **2 local worktree branches** from Claude Code agents
- **Multiple env file variants** (.env.local, .env.production, .env.vercel, .env.prod)

## VERDICT: No multi-repo consolidation needed

The hotmess-globe repo is already the canonical single source. There is no parallel architecture to merge — just noise to clean up.

---

## PHASE 1: BRANCH CLEANUP (Do now)

### Delete all stale remote branches

Safe to delete — all predated by main's current state:

```bash
# Delete all copilot/* branches
git branch -r | grep 'copilot/' | sed 's/origin\///' | xargs -I{} git push origin --delete {}

# Delete all cursor/* branches
git branch -r | grep 'cursor/' | sed 's/origin\///' | xargs -I{} git push origin --delete {}

# Delete worktree branches (after confirming no active worktrees)
git push origin --delete worktree-agent-a447b1e4
git push origin --delete worktree-agent-a606ff88
```

### Review local branches before deleting

Each of these may contain useful work — diff before deleting:

```bash
git log main..cleanup/mvp-build --oneline
git log main..hotmess-london-os-master-remap --oneline
git log main..stabilization-phase-3a --oneline
git log main..stabilization/2026-02-20-phase0 --oneline
git log main..visual-makeover-and-readme --oneline
git log main..visual-makeover-cherry-pick --oneline
```

If diff shows nothing new → delete.

---

## PHASE 2: ENV FILE CLEANUP

### Problem: 4 overlapping env files

| File | Status | Action |
|------|--------|--------|
| `.env.local` | ✅ Keep | Primary local dev file (gitignored) |
| `.env.production` | ⚠️ Review | Has NOTION vars + Stripe key. Confirm matches Vercel. |
| `.env.vercel` | ⚠️ Redundant | Near-identical to .env.production. Remove. |
| `.env.prod` | ⚠️ Has unique vars | Has OPENAI_API_KEY, SOUNDCLOUD_*, VAPID keys. Merge into .env.local, delete file. |

### Fix: Standardize to `.env.local` only

```bash
# Merge unique vars from .env.prod into .env.local, then delete redundant files
# Then run: vercel env pull .env.local  # to get fresh from Vercel
```

### Gitignore audit

```bash
cat .gitignore | grep env
# Verify .env*, .env.local, .env.production, .env.vercel are all listed
```

---

## PHASE 3: VERCEL ENV CLEANUP

Clean up dead/malformed vars:

```bash
# Remove malformed vars (dead weight, not used by Vite)
vercel env rm vite_publicSUPABASE_ANON_KEY
vercel env rm vite_publicSUPABASE_URL
vercel env rm vite_publicSUPABASE_PUBLISHABLE_KEY

# Remove legacy Base44 vars (from prior platform)
vercel env rm VITE_BASE44_APP_BASE_URL
vercel env rm VITE_BASE44_APP_ID

# Review CLAUDE_1ST_KEY — likely added by agent, probably not needed
vercel env rm CLAUDE_1ST_KEY  # after confirming no api/ code uses it
```

Add missing vars to Preview/Development:

```bash
vercel env add VITE_SUPABASE_ANON_KEY preview
vercel env add VITE_SUPABASE_ANON_KEY development
vercel env add VITE_SUPABASE_URL preview     # if not set
vercel env add VITE_SUPABASE_URL development  # if not set
```

---

## PHASE 4: LOCAL DISK CLEANUP

**Safe to delete** (duplicate/archived copies with no unique code):
- All of `~/Downloads/hotmess-core (1–9)` and variants
- All of `~/Downloads/hotmess-enterprise (1–5)` and variants
- All of `~/Downloads/HOTMESS OS`, `HOTMESS OS (2)`, `HOTMESS OS (Copy) (Copy)`
- All of `~/Downloads/HOTMESS_full_repo (x4)` and untitled folder variants
- All of `~/Downloads/hotmess-bot-final-main (x5)`
- `~/Downloads/hotmess-globe-main` (x2) — these are copies of the GitHub repo
- `~/Desktop/hotmess-stabilization-20260220` — snapshotted in HOTMESS_BACKUP_20260131
- `~/hotmess-globe-fix` — 10 commits behind main, no unique source
- `~/hotmess-globe-stabilization` — investigate, likely safe to delete
- `~/HOTMESS_OS` + `~/hotmess-os` — if these are just experiments

**Keep:**
- `~/hotmess-globe` — CANONICAL
- `~/HOTMESS_BACKUP_20260131` — rollback safety net (archive, don't delete)
- `~/Documents/GitHub/AzuraCast` — if radio self-hosting is planned
- `~/Downloads/hotmess-london (10)` — has multi-page HTML with brand pages not yet in app

**Investigate before deciding:**
- `~/Documents/GitHub/hotmess-consolidated-build`
- `~/hotmess-design-generator`
- `~/Sites/sicqr-ltd`

---

## PHASE 5: HOTMESS-LONDON STATIC SITE EXTRACTION

`~/Downloads/hotmess-london (10)` contains a full multi-page static HTML site with:
- `/home`, `/radio`, `/shop`, `/rooms`, `/djs`, `/shows`
- `/raw`, `/hung`, `/high`, `/hnh`, `/content`
- `/lookbook`, `/affiliates`, `/legal`, `/qr`
- `/superhung`, `/superhigh`, `/xxx`
- `/product-detail-page`

These pages represent brand content that does NOT yet exist in the main app. Recommended action:
1. Review each page for content/design
2. Extract useful copy, imagery, and design patterns
3. Plan routes in the main app for brand sub-pages (e.g. `/raw`, `/hung`, `/high`)
4. Implement as dedicated routes or as content in ProfileMode/MarketMode

---

## PHASE 6: AZURACAST RADIO SELF-HOSTING

Three copies of AzuraCast exist. If the plan is to self-host the radio (moving off RadioKing):
1. Deploy AzuraCast to a VPS (DigitalOcean, Hetzner)
2. Configure shows: Wake The Mess, Dial A Daddy, Hand N Hand
3. Update stream URL in `RadioContext.tsx`
4. Set `HOTMESS_RADIO_BOT` env var for the Telegram bot integration

Currently the stream URL is hardcoded in RadioContext. A future improvement would be to make it configurable via env var.

---

## DEFINITION OF DONE

- [ ] All `copilot/*` and `cursor/*` remote branches deleted
- [ ] All local stale branches either merged or deleted
- [ ] Vercel env vars cleaned (malformed removed, missing added)
- [ ] `.env.local` is the single source for local dev
- [ ] `~/Downloads` cleaned of duplicate project copies
- [ ] hotmess-london static site content extracted and planned
- [ ] One repo, one deployment, clean env, clean branches
