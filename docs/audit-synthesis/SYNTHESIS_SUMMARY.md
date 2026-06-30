# Phase 1 Synthesis Summary — DB layer driver's board

One board to run the apply pass. Every finding → where it's fixed → how you prove it.
Live numbers re-pulled 2026-06-30. Nothing in this audit was applied to production.

## Coverage matrix (DB surfaces)
Legend: ✅ present/good · ⚠️ present but weak · ❌ missing/broken

| Finding | Sev | Doctrine | Code | DB state | Enforced? | Tested? | Fix PR | Applied? |
|---------|-----|----------|------|----------|-----------|---------|--------|----------|
| DB-01 trilateration | 🔴 | ✅ inv#2/#3 | ⚠️ raw distance | ⚠️ fn leaks precise dist | ❌→✅(draft) | ✅ probe test | #1096 | ❌ Phil |
| DB-02 age method/OSA | 🔴 | ✅ OSA | ⚠️ sets flag | ❌ 77 rows, no CHECK | ❌→✅(draft) | ⚠️ verify query | #1096 | ❌ Phil |
| DB-08 profiles coord leak | 🔴 | ✅ inv#2/#3 | ❌ select('*') | ❌ 114 precise leak | ❌→✅(draft) | ✅ JWT probe | #1096 | ❌ Phil |
| DB-03 35 RLS-no-policy | 🟠 | ✅ default-deny | ⚠️ svc-role only | ⚠️ flag-only lock | ❌→✅(draft) | ⚠️ verify query | #1097 | ❌ Phil |
| DB-04 migration drift | 🟠 | ✅ dev-rules | ❌ 21 files | ❌ 302 untracked | ❌→✅(CI draft) | ✅ CI gate | #1097 | ❌ Phil |
| DB-05 51 SECDEF search_path | 🟠 | ✅ least-priv | n/a | ⚠️ mutable path | ❌→✅(draft) | ✅ advisor=0 | #1097 | ❌ Phil |
| DB-07 product_orders read | 🟡 | ✅ buyer-sees | ⚠️ no order hist | ⚠️ child table | ➖ documented | ➖ | #1097 | ❌ Phil |
| DB-09 PII over-exposure | 🟠 | ✅ minimise | ❌ select('*') | ⚠️ email/phone/hash leak | ❌ | ❌ | design below | ❌ |
| DB-06 partner schema vs D31 | 🟡 | ⚠️ asserts | ⚠️ operator | ❌ no schema | ➖ Phase 2 | ➖ | Phase 2 | ➖ |
| DB-C1 signal expiry | ✅ | ✅ inv#5 | ✅ cron | ✅ scheduled | ✅ | ✅ | — conformant | n/a |
| DB-C2 presence table RLS | ✅ | ✅ | ✅ | ✅ owner-scoped | ✅ | ✅ probe | track in DB-04 | n/a |
| DB-C3 tier pricing | ✅ | ✅ | ✅ | ✅ Stripe IDs | ✅ | ✅ | — conformant | n/a |

## Apply order, ranked by risk × effort (do top-down)
1. **DB-05** (#1097) — non-breaking, half-day, kills 51 injection vectors. Lowest risk, do first.
2. **DB-08** (#1096) — the worst leak; ship the `queryConfig.jsx` client change WITH the REVOKE.
3. **DB-01** (#1096) — 1 fn; after apply, screenshot Nearby showing banded distance.
4. **DB-02** (#1096) — pick backfill A/B/C first, then CHECK, then VALIDATE.
5. **DB-03** (#1097) — REVOKE + policies; run the in-file verify query.
6. **DB-04** (#1097) — seed the baseline dump, enable the CI gate; unblocks everything long-term.
7. **DB-09** — design below; needs the view/RPC split (a refactor, not a one-liner).

## What this system still needs to be conformant & provable
- A **single source-of-truth schema** (DB-04 baseline) — today RLS that protects presence/safety
  exists only in prod, untracked.
- **Self-vs-others data separation** on `profiles` — the root cause behind both DB-08 and DB-09 is
  that one broadcast policy + `select('*')` serves both "my full profile" and "other users' card".
- **Invariant tests in CI** — the JWT-scoped probe (shipped in #1096) should run every PR, plus the
  drift gate (#1097). Make the anti-stalking guarantee a test, not a comment.

## DB-09 remediation design (drafted, not built — needs Phil/frontend sign-off)
Root cause: `profiles_read_visible_authed` (row-wide read of visible profiles) + client
`profiles.select('*')` broadcast `email, phone, pin_code_hash, stripe_subscription_id,
subscription_status, telegram_id/username/chat_id/link_token` to every authenticated user.
Column REVOKE alone breaks self-read (the owner legitimately needs these about themselves), so the
fix is a **read-path split**:

1. **`profiles_card` view** (security_invoker) exposing ONLY safe public fields the grid needs:
   `id, display_name, avatar_url, username, bio, age, gender, looking_for, position, city,
   location_area, location_name, is_online, is_visible, founding_status, tags` (+ the join key —
   see step 4). No coords, no contact, no payment, no auth.
2. Point `useAllUsers` (and Profile/Messages/ChatThread consumers) at `profiles_card`.
3. **`get_my_profile()` SECDEF RPC** scoped to `auth.uid()` returns the full row for the signed-in
   user only (settings screens read this, not the table).
4. **Kill `email` as a join key.** The Connect grid keys candidates by `profile.email`; switch the
   join to `id` so email need never leave the server. This is the one real refactor and the reason
   DB-09 isn't a one-line REVOKE.
5. Then `REVOKE SELECT (email, phone, pin_code_hash, stripe_subscription_id, subscription_status,
   telegram_id, telegram_username, telegram_chat_id, telegram_link_token) ON profiles FROM
   anon, authenticated` — enforced server-side, owner reads via the RPC.

Blast radius: every profile-list consumer (5 call sites). Recommend a dedicated PR + manual QA of
Connect/Profile/Messages before applying. Inherits doctrine `10-profile-identity`,
`HOTMESS-Legal-Compliance-v1-FINAL`.
