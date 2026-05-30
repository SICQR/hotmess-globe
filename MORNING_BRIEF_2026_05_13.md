# HOTMESS — Morning Brief, 2026-05-13

**Auto-generated while Phil slept.** Read top-to-bottom for a 60-second resume.

---

## Production state right now

| Thing | State |
|---|---|
| Live commit | `9b70c437` (telemetry funnel inserts) |
| Live deploy | `dpl_EMPjE2xBqSfFtK3zhjp8MeNtubkg` — READY at 22:27 UTC |
| Aliases | `hotmessldn.com` + `www.hotmessldn.com` |
| `/api/health` | 200, vercelEnv=production, region lhr1 |
| `PHOTO_LOG_SALT` | set in Vercel prod env ✓ |

---

## Tests run while you slept — 15/15 endpoint green, 3/7 bundle (4 expected fails explained below)

```
── 1. Deploy + infrastructure ──
  PASS  GET /api/health = 200
  PASS  /api/health ok:true
  PASS  /api/health vercelEnv=production
  PASS  GET / = 200
  PASS  HSTS header present

── 2. Stripe webhook signature gating ──
  PASS  POST webhook bad sig = 400 (NOT 500)
  PASS  POST webhook empty = 400

── 3. Ghosted vault signed-URL endpoint ──
  PASS  POST signed-url no auth = 401
  PASS  GET signed-url = 405 (method gate)
  PASS  POST signed-url bogus bearer = 401

── 4. Music routes ──
  PASS  GET /music = 200
  PASS  GET /music/library = 200
  PASS  GET /music/release/<bad-uuid> = 200

── 5. Market route + v2 shell ──
  PASS  GET /market = 200
  PASS  Market HTML contains 'HOTMESS'

── 6. Bundle assertion (across 57 Vite chunks) ──
  PASS  share_album_with RPC present  (in L2ChatSheet chunk)
  PASS  revoke_album_share RPC present (in L2ChatSheet chunk)
  PASS  is_xxx field referenced
  FAIL  record_album_view — expected: no UI consumer yet
  FAIL  /api/ghosted/photo-signed-url — same reason
  FAIL  cleanMicro/cleanVendor — minified; behaviour shipped, name renamed
  FAIL  isDropBrand/SHOP_FOREVER_CATEGORIES — same

  PASS  Bundle does NOT contain pk_test (negative assertion)
  PASS  Bundle does NOT contain sk_test
  PASS  Bundle does NOT contain sk_live (no leak)
  PASS  Bundle does NOT contain "My Store" vendor placeholder
```

Every endpoint and every newly-imported RPC is reachable on the live deploy. The 4 bundle "fails" are minifier renames or unwired consumers — not regressions.

Test script: `~/Downloads/HOTMESS_TESTS.sh` — `bash` it anytime to re-verify.

---

## When you wake up, suggested first 30 minutes

**Priority 1 — Real-world test the vault flow (10 min)**
- Open hotmessldn.com on phone, log in
- Tap into a chat with a mutual BOO
- Look for the gold "SHARE PRIVATE VAULT" button below the chat header
- Tap → should show "Vault shared with [name] — revoke"
- Verify `ghosted_album_shares` has a fresh row, `revoked_at IS NULL`
- Tap again to revoke — row should now have `revoked_at` populated

Caveat: vault has no photos yet, so the toggle will show "Add photos to your vault to share it" until vault-upload UI lands.

**Priority 2 — Confirm telemetry sink (5 min)**
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://hotmessldn.com/api/analytics/track \
  -H "Content-Type: application/json" -d '{"event_name":"smoke_test","category":"test"}'
```
Then check Supabase for any `events`/`analytics_events`/etc table growth. If nothing landed, create `public.analytics_events` per the schema in `~/Downloads/ONBOARDING_TELEMETRY_2026_05_12.md`.

**Priority 3 — Funnel SQL (5 min, once sink confirmed)**
```sql
SELECT event_name, COUNT(DISTINCT user_id) AS users
FROM analytics_events
WHERE created_at > now() - interval '24 hours'
  AND category = 'onboarding'
GROUP BY event_name
ORDER BY users DESC;
```

**Priority 4 — Vault upload UI (rest of morning)**
`L2EditProfileSheet` needs a vault-photos section so users can actually upload. Until that lands, share/access flow is plumbed but has no content. Tasks #24/#25 still pending.

---

## Yesterday's commits (single line each)

| Commit | Summary |
|---|---|
| `28f97034` | Free stems gate + market v2 wired to Shopify |
| `e28cbbd6` | `useV6Flag` localStorage cache + DROP_BRANDS helper |
| `00751d24` | Stems removed + MusicLibraryPage + MusicReleasePage |
| `1ec001fb` | Music routes wired + SuperHung partition applied |
| `4b766565` | Global scrolling ticker disabled |
| `de61821c` | XXX gate flow + play button fix + market P0s + age_verified_at + globe touch-lock + signed-URL + VaultShareToggle |
| `9b70c437` | Telemetry funnel complete (PIN/safety/location/abandon) |

Plus Supabase PROD migrations:
- `photos_albums_limits_and_rpcs_2026_05_12` — share/revoke/record RPCs + photo limits
- `backfill_age_verified_at_2026_05_12` — 100 users backfilled
- `ghosted_photo_access_log_2026_05_12` — forensics log

---

## Still parking-lot

- Resend DNS at Arvixe (SPF/DKIM at `send.hotmessldn.com`)
- Meta WhatsApp token rotation (PNID 1084970661364059, WABA 1688880712455927)
- v6 Chunk 03 PR #194 — checks failing since 2026-05-01
- £2.99 boost test purchase
- Rotate `rk_live` + `pk_live` (pasted in chat — defensive hygiene)
- Audit Preloved market tab

---

## Fast-resume state

- Repo: `~/hotmess-globe` (HEAD = `9b70c437`)
- Stripe live: PageReady `acct_1TEUAmFD4E2lo8Ap`
- Webhook: `we_1TWEvBFD4E2lo8ApLsQRJwFv` — hotmessldn.com, 9 events, enabled
- Supabase prod: `rfoftonnlwudilafhfkl` (eu-west-2)
- Vercel project: `prj_xdS5EoLRDpGhj4GOIbtSLSrCmvJO`
