# PHIL_ACTIONS — owner-only items (2026-05-23)

Cowork cannot do these: they are access-control / dashboard / device actions. They are gated to the repo owner by both tooling and safety policy (an agent should not modify security permissions or access controls, even when asked). Each has a copy-paste recipe.

---

## 0. GitHub push credential (unblocks ALL code work)

Cowork has **no GitHub auth** in its environment, so it cannot push branches or open PRs. Nothing code-side lands until this exists.

- Generate a **fine-grained PAT** scoped to `SICQR/hotmess-globe` only: Contents (RW), Pull requests (RW), Workflows (RW) — and Administration (RW) only if you want Cowork to *read* protection state (it will not change it).
- **Delivery:** prefer a GitHub MCP connector or injecting the token into Cowork's environment over pasting a long-lived token into chat. If pasted, use a short-expiry token and rotate after Sprint 2. Cowork will not echo it back.
- Verify: Cowork pushes a no-op commit on a throwaway branch, confirms it lands, deletes the branch.

---

## Item 0 — Deployment pipeline lockdown (do BEFORE resuming code work)

### 0a. Vercel: production branch → `production`
1. Create the branch from current `main` (`6f51d59`) so live state doesn't change:
   `git push origin main:production`  *(Cowork can do this once it has the PAT)*
2. Vercel → Project `hotmess-globe` (`prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO`, team `team_ctjjRDRV1EpYKYaO9wQSwRyv`) → Settings → Git → **Production Branch** → set to `production` → Save.
3. Verify `hotmessldn.com` still resolves to the same deployment (it should — `production` == `main` at switchover).

### 0b. Vercel: skip docs-only builds
Preferred — land via PR in `vercel.json` (Cowork has prepared this):
```json
"ignoreCommand": "git diff --quiet HEAD^ HEAD -- . ':(exclude)docs/**'"
```
Note: exit 0 = Vercel **skips** the build. The command exits 0 only when nothing **outside** `docs/` changed → docs-only commits don't deploy. *(Phil's original `git diff … ./docs` was inverted — it would skip when docs did NOT change. The above is corrected.)*

### 0c. GitHub branch protection on `main`
```bash
gh api -X PUT repos/SICQR/hotmess-globe/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": [] },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

### 0d. GitHub branch protection on `production`
Same payload against `…/branches/production/protection`.
**Caveat (verified):** this is a **user-owned** repo, so GitHub's `restrictions` (named service-account / push-allowlist) are **not available** — that field must be `null`. `enforce_admins: true` + require-PR already blocks direct pushes (including the owner). Production is then only updated by a `main` → `production` PR.

### Approval gate — DECIDED: Path A
`required_approving_review_count` is set to **0** above (Phil's call). Require-PR + strict status checks + `enforce_admins` + preview-URL review remain the gate; the self-approval deadlock is avoided. Upgrade to a real second reviewer (Path B) later if Cowork-as-bot starts shipping autonomously.

### Rebase the two open PRs first
`#279` (design-system) and `#284` (pre-release audit) have base SHAs behind `main`. With `strict: true` ("up-to-date required") they'll need rebasing before merge. Rebase them before enabling protection so the lockdown doesn't strand them.

---

## BLK-05 — Google OAuth secret (P2)
Supabase Dashboard → Authentication → Providers → Google → update **Client Secret** with the current value from Google Cloud Console → Save. (Fixes "Unable to exchange external code: 4/0A".)

---

## Real-device test session (BLK-01 / BLK-04 / BLK-06)
On a real phone, one session:
- **BLK-01:** add a trusted contact, fire SOS, confirm the contact's device receives SMS/WhatsApp.
- **BLK-04:** grant push permission, trigger a push, confirm it shows on the lock screen (note: 0 Apple Web Push subs exist — test Android/Chrome first).
- **BLK-06:** create a brand-new account, walk all onboarding steps, confirm the grid loads.

---

## Q2 — backfill stuck `cron_runs` (Cowork can run on your word, via Supabase MCP)
After the cron fix is merged + live, run once:
```sql
update cron_runs
set status = 'error',
    ended_at = now(),
    detail = coalesce(detail, '{}'::jsonb) || '{"closed_retroactively":"crash-fix 2026-05-23: builder .catch() bug"}'::jsonb
where job_name = 'data-retention' and status = 'running' and ended_at is null;
```
Cowork held this rather than writing to production before the governance lockdown — say the word and it runs.
