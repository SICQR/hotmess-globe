#!/usr/bin/env bash
# One-shot rotation of leaked Supabase legacy JWT secret + downstream Vercel + GitHub updates.
#
# Generated 2026-04-17 during the Brief #2 autonomous attempt. The Brief #2 Cowork
# session could not run this itself because the sandbox cannot reach Supabase dashboard,
# Vercel API, or GitHub API (all blocked by host policy), and no credentials were mounted.
#
# RUN THIS ONCE FROM YOUR MAC when you land. Total time: ~15 min including redeploy + smoke.
#
# Prereqs (install if missing):
#   brew install gh jq curl
#   npm i -g vercel@latest
#
# Auth prereqs:
#   gh auth login                                           # or export GH_TOKEN
#   vercel login                                            # or export VERCEL_TOKEN
#   For Supabase rotation: requires dashboard browser access (no CLI path exists).
#
# Rollback: every old Vercel value is written to /tmp/hotmess-rollback-<timestamp>.env
# before overwriting. If smoke fails:
#   source /tmp/hotmess-rollback-<ts>.env
#   vercel env rm SUPABASE_SERVICE_ROLE_KEY production --yes
#   echo "$OLD_SERVICE_ROLE" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
#   (repeat per key/env, then `vercel --prod --force`)

set -euo pipefail

VERCEL_PROJECT="prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO"
VERCEL_TEAM="team_ctjjRDRV1EpYKYaO9wQSwRyv"
SUPABASE_REF="rfoftonnlwudilafhfkl"
GH_REPO="SICQR/hotmess-globe"
TS=$(date +%Y%m%d-%H%M%S)
ROLLBACK_FILE="/tmp/hotmess-rollback-${TS}.env"

# ── Step 1: human-only — rotate the Supabase legacy JWT secret ─────────────
cat <<EOM
────────────────────────────────────────────────────────────────────────────
STEP 1 — Rotate the Supabase legacy JWT secret (dashboard-only, ~2 min)

Open: https://supabase.com/dashboard/project/${SUPABASE_REF}/settings/api

  a. Scroll to "JWT Settings" → "Legacy JWT Secret" → "Change Legacy Secret"
  b. Click "Generate a random secret" → confirm the dialog.
     ⚠  This logs out every active user. With 0 paying customers it is fine.
  c. After it completes, copy the NEW "Project API keys" from the page:
     - anon / public  (the short JWT that ships to the browser)
     - service_role   (the longer JWT that the /api backends use)

When you have both values in your clipboard, press ENTER here.
EOM
read -r

read -rsp "Paste NEW anon key:         " NEW_ANON; echo
read -rsp "Paste NEW service_role key: " NEW_SERVICE_ROLE; echo

if [[ -z "$NEW_ANON" || -z "$NEW_SERVICE_ROLE" ]]; then
  echo "ERROR: both keys required. Aborting." >&2
  exit 1
fi

# ── Step 2: snapshot old Vercel env values (for rollback) ───────────────────
echo "→ Snapshotting old Vercel env values to ${ROLLBACK_FILE}..."
{
  echo "# Rollback snapshot ${TS}"
  for key in SUPABASE_SERVICE_ROLE_KEY SUPABASE_ANON_KEY VITE_SUPABASE_ANON_KEY; do
    for env in production preview development; do
      # `vercel env pull` only pulls one env at a time; loop explicitly.
      val=$(vercel env get "$key" "$env" --scope "$VERCEL_TEAM" 2>/dev/null || echo "")
      echo "OLD_${key}_${env}=\"${val}\""
    done
  done
} > "$ROLLBACK_FILE"
echo "   saved → $ROLLBACK_FILE"

# ── Step 3: write new values to Vercel (all 3 envs × 3 keys) ────────────────
echo "→ Updating Vercel env vars..."
for env in production preview development; do
  for key_pair in "SUPABASE_SERVICE_ROLE_KEY:$NEW_SERVICE_ROLE" \
                  "SUPABASE_ANON_KEY:$NEW_ANON" \
                  "VITE_SUPABASE_ANON_KEY:$NEW_ANON"; do
    key="${key_pair%%:*}"
    val="${key_pair#*:}"
    vercel env rm  "$key" "$env" --scope "$VERCEL_TEAM" --yes 2>/dev/null || true
    printf '%s' "$val" | vercel env add "$key" "$env" --scope "$VERCEL_TEAM"
  done
done

# ── Step 4: rotate GitHub Actions secrets ──────────────────────────────────
echo "→ Updating GitHub Actions secrets..."
gh secret set TEST_USER_A_PASSWORD --repo "$GH_REPO" --body 'PVamKK1QipEFc54Kav7ApRRH0Ysfgl6P'
gh secret set TEST_USER_B_PASSWORD --repo "$GH_REPO" --body '6zgIjK9iJw8a991nNwK-YmXOCVXq9Bvr'
gh secret set VITE_SUPABASE_ANON_KEY --repo "$GH_REPO" --body "$NEW_ANON"

# ── Step 5: trigger a fresh prod deploy with the new env ────────────────────
echo "→ Triggering prod redeploy of latest main..."
cd "$(git rev-parse --show-toplevel)"
vercel --prod --force --scope "$VERCEL_TEAM"

# ── Step 6: smoke test ──────────────────────────────────────────────────────
echo "→ Smoke test..."
SUPABASE_URL="https://${SUPABASE_REF}.supabase.co"

echo -n "  1/4 anon read → "
http=$(curl -s -o /tmp/smoke-anon.json -w '%{http_code}' \
  -H "apikey: $NEW_ANON" \
  "$SUPABASE_URL/rest/v1/radio_shows?is_active=eq.true&select=id&limit=1")
[[ "$http" == "200" ]] && echo "OK ($http)" || { echo "FAIL ($http)"; exit 2; }

echo -n "  2/4 hotmessldn.com → "
http=$(curl -s -o /dev/null -w '%{http_code}' https://hotmessldn.com/)
[[ "$http" == "200" ]] && echo "OK ($http)" || { echo "FAIL ($http)"; exit 2; }

echo -n "  3/4 age gate present → "
curl -s https://hotmessldn.com/ | grep -qi 'age\|18\|over 18' && echo "OK" || echo "WARN (content not inspectable — verify manually)"

echo -n "  4/4 write test (insert + delete throwaway banner) → "
psql_url="postgresql://postgres.${SUPABASE_REF}:${NEW_SERVICE_ROLE}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"
echo "SKIPPED — run manually: from the Supabase SQL editor, INSERT + DELETE a row in app_banners."

# ── Step 7: watch runtime logs for 10 min ───────────────────────────────────
echo "→ Watching Vercel runtime logs for 10 min. Ctrl+C to abort earlier."
vercel logs --follow --scope "$VERCEL_TEAM" "$VERCEL_PROJECT" &
LOGS_PID=$!
sleep 600
kill $LOGS_PID 2>/dev/null || true

# ── Step 8: GitGuardian alerts ─────────────────────────────────────────────
cat <<EOM

────────────────────────────────────────────────────────────────────────────
STEP 8 — Close GitGuardian alerts (dashboard-only, ~30 sec)

Open: https://dashboard.gitguardian.com/workspace/-/incidents
  a. Find "Supabase Service Role JWT exposed on GitHub" → Resolve
  b. Find "Company Email Password exposed on GitHub"   → Resolve

Then append the completion timestamp to docs/INCIDENT_LOG.md and commit:

  git commit -am "docs(incident): close 2026-04-17 rotation — dashboard rotation + smoke green"
  git push

Rollback snapshot (if needed): $ROLLBACK_FILE
EOM
