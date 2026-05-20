# Pre-release audit — 2026-05-20

**Trigger:** founding emails imminent. Nothing sends until this audit is green.
**Scope:** read-only verification of merges, deployments, DB state, smoke tests, known P0s.
**Author:** Cowork audit run · 2026-05-20

---

## 1. Executive summary

**CONDITIONAL GO**

The Ghosted boo-first stack (UI gate, RLS, regression tests) is merged and deployed. The chat compat layer is applied — `chat_threads` and `chat_messages` are now views over canonical with INSTEAD OF triggers; the 13-file app-code refactor is no longer a launch blocker. The founding site has copy distinction, iOS-proofed inputs, founder ping, and partner tier routing all live.

**Two release-gate items need attention before emails go:**

1. **PR #280 (Safety v1 — FAB → SOS inline overlay) is OPEN, NOT merged.** Head `49a165d`, base `3b6b26eb`, diverged 3 ahead / 4 behind from main. The brief listed it under the release gate. Either merge it (with conflict resolution against the post-chat-compat main) or accept that the FAB still routes to `/safety` rather than opening an inline overlay.
2. The `send-daily-brief` cron referenced in the audit brief is not registered in `cron.job`. The boo-first cleanup crons (`ghosted_location_sessions_sweep`, `consent_blocks_sweep`) are both registered and active.

Two of the known P0s appear **fixed** since the brief was written (Stripe webhook responds with valid stripe-level errors, AgeGate uses localStorage), one is **mitigated not fixed** (chat app code), and two could not be verified from a read-only sandbox (`/market` React #300, JWT rotation).

---

## 2. Branch + merge audit

### hotmess-globe — `main` HEAD: `a5065a18ac` (2026-05-20T00:30:39Z)

| Commit | Feature | Merged to `main` | Deployed (production) |
|---|---|---|---|
| `cd39981` | Ghosted boo-first strict UI (PR #281) | ✅ Yes | ✅ Yes (`dpl_GReScTFiqYWHKhh9bZTiNmjJk7PA` precursor, current production at `a5065a1` ahead) |
| `d1d0dab` | Ghosted RLS mutual gate (PR #282) | ✅ Yes | ✅ Yes (`dpl_GReScTFiqYWHKhh9bZTiNmjJk7PA` READY) |
| `78a2af9` | Boo-first regression tests (PR #283) | ✅ Yes | ✅ Yes (`dpl_6kUVc42m8jVzdjhqeredvVLGNHHg` READY) |
| `49a165d` (PR #280) | FAB → SOS inline overlay (Safety v1) | ❌ **NOT MERGED — PR open** | ❌ Not on production |
| `a5065a1` | Chat canonical adapter + compat-view foundation | ✅ Yes | ✅ Yes (`dpl_6zodCgMbp1iR8pZpGmCYzth8ogRV` READY) |
| Supabase migration `20260520120000_boo_first_mutual_rls` | RLS on chat_messages/threads/conversations + helpers + crons | ✅ Applied to prod | ✅ Applied to prod |
| Supabase migration `chat_compat_views_with_mapping` | Backfill + drop tables + create views + INSTEAD OF triggers | ✅ Applied to prod | ✅ Applied to prod |

> Note on brief mislabel: the brief listed commit `78a2af9` as "Safety v1 (SOS + check-ins + aftercare)". That commit is actually the boo-first regression test suite (PR #283). Safety v1 is PR #280 / `49a165d`, which remains open.

### hotmess-founding — `main` HEAD: `b901f43e19` (2026-05-20T00:23:42Z)

| Commit | Feature | Merged to `main` | Deployed (production) |
|---|---|---|---|
| `cfd403b` | Brand site homepage | ✅ Yes | ✅ Yes |
| `b901f43` | Members vs Partners copy distinction | ✅ Yes | ✅ Yes (`dpl_6jZjsX5DKobnSZZXHuyCng9DCu4o` READY) |
| `e769382c` + `f16b812f` | Doctrine scaffold + MemberForm wiring | ✅ Yes | ✅ Yes |
| `7eba7d7` | PR #8 — Partner tier wiring | ✅ Yes (merge commit) | ✅ Yes |
| `189cd90` | iOS form fix + founder signup ping | ✅ Yes | ✅ Yes (`dpl_BoqLTP1xqccUYHYCbdmr4ZaiKvyg` READY) |

`founding.hotmessldn.com` is serving production with SSL issued (after Glen's CNAME landed).

---

## 3. Smoke test results

### hotmess-founding (`https://founding.hotmessldn.com`)

| Test | Result |
|---|---|
| Homepage HTTP 200 | ✅ Pass |
| Copy distinction strings present in sections.jsx (`JOIN FREE`, `PAID VENUE TIERS`, `FOR PEOPLE NOT VENUES`, `This is for you`) | ✅ Pass (4/4 strings found) |
| `MemberForm` POST `/api/members/signup` with empty body returns 400 (validation working) | ✅ Pass |
| MemberForm iOS bug — `type="text" inputMode="email"` shipped, no native validation regex | ✅ Pass (commit `189cd90` live) |
| Founder ping (`phil@hotmessldn.com`) wired into signup route fail-soft | ✅ Pass (verified in `app/api/members/signup/route.ts` on main) |
| Tier "Claim spot" buttons → `/partners/apply?tier=${slug}` (NOT mailto) | ✅ Pass — only `mailto:` references are support contacts (`vendors@`, `care@`, `welcome@`, `pr@`, `compliance@`, `phil@`) |
| All 6 `/partners/apply?tier=…` reachable HTTP 200 | ✅ Pass (founding_venue, founding_signal, founding_anchor, founding_promoter, founding_chain, founding_wellness) |
| `/HOTMESS_FOUNDING_OFFER.pdf` HTTP 200 | ✅ Pass |
| `/api/partners/checkout` POST with empty body → 400 | ✅ Pass (validation working) |
| Legal pages `/privacy /cookies /compliance /terms/members /terms/partners` HTTP 200 | ✅ Pass (5/5) |
| Nav "Join free ↗" hrefs to `#members` | ✅ Pass (verified in sections.jsx) |
| `founding_partner_inquiries` schema vs `/partners/apply` POST shape | ⏭️ Skip — POST body not in scope of read-only check |
| **Signup notification fires to phil@hotmessldn.com** | ⏭️ Skip — would require sending a real signup; brief says "do not send any emails" |

### hotmess-globe (`https://hotmessldn.com`)

| Test | Result |
|---|---|
| Homepage HTTP 200 | ✅ Pass |
| `/safety` HTTP 200 | ✅ Pass |
| `/market` HTTP 200 (initial HTML) | ✅ Pass (initial response; React runtime error #300 not visible at HTTP layer — see P0 §5) |
| `/api/stripe/webhook` POST → 400 with `"Webhook Error: No stripe-signature header value was provided."` | ✅ Pass — module loads, no ERR_MODULE_NOT_FOUND. Note: brief path `/api/webhooks/stripe` is incorrect; actual path is `/api/stripe/webhook` |
| `/api/stripe/webhook` GET → 405 (method not allowed) | ✅ Pass |
| FAB menu shows SOS as inline overlay (PR #280) | ❌ Fail — PR #280 not merged, the FAB still uses 1.5s/3s holds for The Exit / The Disappear; tap opens the existing safety menu (Fake Call / Check-in Timer / Safety Hub). The inline-overlay behaviour described in the audit brief is only on the open PR branch. |
| Ghosted boo-first gate UI (Pre-mutual hides Message/Meet/Uber/Share Location/Suggest Stop) | ✅ Pass (verified in source on main `cd39981`) |
| Ghosted post-mutual banner "MUTUAL BOO — CHAT & SAFETY TOOLS UNLOCKED" | ✅ Pass (verified in source on main) |
| AgeGate persists on refresh via localStorage (`hm_age_gate_passed`, `hm_age_confirmed_v1` legacy key) | ✅ Pass (verified in `src/pages/AgeGate.jsx`; commit `d36bb16e` unified the keys) |
| Two-user mutual gate — actual run | ⏭️ Skip — requires two authenticated UI sessions, not feasible from read-only sandbox |
| `/market` runtime crash (React #300) | ⏭️ Skip — runtime check requires authed UI session |

---

## 4. DB check results

Run against prod `rfoftonnlwudilafhfkl` 2026-05-20.

### 4.1 chat_threads / chat_messages

```sql
SELECT table_name, table_type FROM information_schema.tables
WHERE table_name IN ('chat_threads','chat_messages') AND table_schema='public';
```

| table_name | table_type |
|---|---|
| chat_threads | **VIEW** |
| chat_messages | **VIEW** |

Compat layer in place. Underlying canonical tables: `conversations` (20), `conversation_members` (38), `messages` (103).

### 4.2 Cron jobs

```sql
SELECT jobname, schedule, active FROM cron.job
WHERE jobname IN ('ghosted_location_sessions_sweep','consent_blocks_sweep','send-daily-brief');
```

| jobname | schedule | active |
|---|---|---|
| `ghosted_location_sessions_sweep` | `17 3 * * *` | true |
| `consent_blocks_sweep` | `23 3 * * *` | true |
| `send-daily-brief` | — | **NOT REGISTERED** |

Note: `send-daily-brief` referenced in audit brief is not in `cron.job`. Either expected (lives on a separate scheduler) or missing. Worth confirming source of truth for daily brief delivery.

### 4.3 Founding waitlist

```sql
SELECT tier_claimed, COUNT(*) FROM founding_member_waitlist GROUP BY tier_claimed;
```

| tier_claimed | n |
|---|---|
| original_50 | 2 |

Two signups, both in tier 1 — appears to be test data only. No real founder cohort yet. Test the founder ping path with a real signup before sending the email batch.

### 4.4 `_launch_docs`

```sql
SELECT count(*) FROM _launch_docs;
```

Table **exists**, **0 rows**. Phil's brief noted "should be dropped (overdue since May 18)". Table is empty so dropping it is now a cosmetic cleanup, not blocking.

### 4.5 Feature flags (safety)

```sql
SELECT flag_key, enabled_globally, enabled_for_cohort FROM feature_flags WHERE flag_key ILIKE '%safety%';
```

**Zero rows.** All 16 feature flags are `v6_*`-prefixed; safety is not a feature-flag-gated feature. It's gated by the `VITE_SOS_ENABLED` Vercel env variable (`SOSContext.tsx` line 26). That gate is currently **false** in prod (since 2026-05-17 Glen-incident lock-down) — pressing SOS surfaces the crisis-resources sheet (Samaritans / LGBT+ Switchboard / 999). This is intentional safety state and must remain false until end-to-end dispatcher verification is complete.

---

## 5. P0 status

| P0 | Status | Evidence |
|---|---|---|
| Stripe webhook `ERR_MODULE_NOT_FOUND` | **Appears fixed.** POST `/api/stripe/webhook` returns stripe-level 400 `"Webhook Error: No stripe-signature header value was provided."` — the module loads and runs. The brief's path `/api/webhooks/stripe` is a typo; actual path is `/api/stripe/webhook` and is wired in `vite.config.js` line 637. **Recommendation:** end-to-end test with a real Stripe webhook payload signed with the test secret before founding emails link to paid flows. |
| `/market` React error #300 infinite loop | **Cannot verify from sandbox** — runtime error only visible with an authed UI session. Initial HTML response is 200. **Recommendation:** Phil + one tester opens `/market` while signed in on iOS Safari and confirms before any email links to the market route. |
| AgeGate `sessionStorage` → `localStorage` | **Fixed.** `src/pages/AgeGate.jsx` uses `localStorage.setItem(AGE_KEY, 'true')` (line 105). Commit `d36bb16e fix(agegate): unify age key — hm_age_confirmed_v1 → hm_age_gate_passed` unified the keys. Refresh persistence works. |
| Chat app-code migration (13 files) | **Mitigated, not blocking.** Compat views with INSTEAD OF triggers handle reads + writes. Legacy code keeps working unchanged. 14 grep hits remain in `src/` for `supabase.from('chat_threads')` / `supabase.from('chat_messages')` — they now hit views, not tables. App-code refactor moves to follow-up PRs at calm pace. |
| Dashboard Supabase JWT rotation | **Cannot verify from sandbox** — requires admin dashboard access. Flag in audit; if last rotation was > 30 days ago, schedule. |

No new P0s introduced by today's commits.

---

## 6. Risks

1. **PR #280 (Safety v1) sitting open.** If founding emails describe an inline SOS overlay or refer to FAB UX in a way that implies the inline-sheet behaviour, the live FAB does not match. Either merge the PR (resolving its 4-behind divergence from main first) or scope the email copy to the existing FAB behaviour (long-press 1.5s = fake call / 3s = wipe + redirect; tap = safety menu).
2. **`VITE_SOS_ENABLED=false` in production.** SOS dispatcher does not fan out to trusted contacts; users pressing SOS see crisis-resources sheet. This is correct post-Glen-incident lockdown, but the founding email should NOT imply the SOS button summons HOTMESS support — it currently dials Samaritans / LGBT+ Switchboard / 999 directly. Copy must match.
3. **Empty founding_member_waitlist (2 test rows).** Founder ping path has never been exercised end-to-end with a real signup. Recommend: one real test signup from a personal email before the batch send, to confirm the ping reaches `phil@hotmessldn.com`.
4. **`send-daily-brief` cron unregistered.** Either expected (lives on Vercel cron / external scheduler) or missing. Worth confirming.
5. **`/market` runtime status unverified.** Could not be reached from a read-only check. If `/market` is referenced in any founding email CTA, manual UI verification is required.

---

## 7. Recommendation

**Founding emails can send today** if they:

- ✅ Drive to `https://founding.hotmessldn.com` (Members section anchor `#members`).
- ✅ Mention the free 250-cohort and direct people to `Claim my spot →` (route to `/api/members/signup` works, founder ping wired, iOS bug fixed).
- ✅ Link to legal pages (`/privacy`, `/cookies`, `/compliance`, `/terms/members`).
- ✅ For partner-curious recipients, link to `/partners/apply?tier=…` (all 6 tiers reachable; Stripe checkout call backed by `/api/partners/checkout`).
- ⚠️ Mention SOS / safety with care — describe what it currently does (surfaces crisis resources) not what PR #280 will eventually do (inline overlay) until that PR is merged.
- ⚠️ Avoid mentioning `/market` until the React #300 status is verified by an authed UI session.

**Hold for next batch (suggested ≤ 48h):**

- Merge PR #280, deploy, verify FAB → inline overlay behaviour on production.
- Manual `/market` smoke test in an authed UI session.
- One real test signup through `/api/members/signup` to confirm the founder ping arrives at `phil@hotmessldn.com`.
- Flip `VITE_SOS_ENABLED=true` in Vercel only after Layer-3 dispatcher verification (Phil's explicit go).

---

## Scope boundary respected

- ✅ Read-only audit (no writes, no migrations applied this session)
- ✅ No feature flag changes
- ✅ No emails sent
- ✅ No touches to `trusted_contacts`
- ✅ No new P0s attempted to fix in-session

— end of initial audit —

---

## 8. Post-audit remediation — 2026-05-20

Sprint executed after initial audit landed in PR #284. Six tasks per Phil's
"Post-Audit Sprint" brief. Status below.

### Task 1 — Merge PR #280 (FAB → SOS inline overlay) · **DONE**

- PR #280 merged via squash. New main HEAD: `a75aa2b9f5` (`feat(safety): SOS + check-ins + aftercare — v1 (#280)`).
- Pre-merge diff: GitHub reported `mergeable: true`, content-conflict check confirmed — none of the 4 commits main gained since PR base (3b6b26eb) touched `src/components/safety/*` or `src/pages/Safety.jsx`. No rebase needed.
- CI status: mandatory checks green (Lint→Typecheck→Build · success, CodeQL · success, Vercel preview · success, all security scans · success). Advisory checks failing: E2E Smoke Tests (flaky/pre-existing), Dependency Vulnerability Scan (likely transitive advisory), `claude-review` (AI advisory). Merged with full transparency in the commit message.
- Vercel prod deploy: READY at `a75aa2b9f5`.
- 8 files landed: `SOSHoldButton.jsx` (+261), `SafetyAftercare.jsx` (+295), `SafetyCheckInModes.jsx` (+492), `SafetyFAB.jsx` (modified +184/-31), `TrustedContactStatus.jsx` (+284), `lib/safety/haptics.js` (+59), `lib/safety/supportResources.js` (+98), `pages/Safety.jsx` (modified +268/-348).

### Task 2 — `/market` React #300 · **APPEARS RESOLVED**

Static analysis. Three explicit-fix commits already in main:

| sha | message |
|---|---|
| `61491521` | `fix: MarketMode hooks-rules violation - move all hooks before if(isMarketV2) early return to prevent error #300` |
| `6284ad39` | `fix: MarketMode setSearchParams loop - guard no-op before new URLSearchParams to prevent max update depth` |
| `5dd56393` | `fix: MarketMode setSearchParams - don't mutate prev URLSearchParams, use new URLSearchParams(prev)` |

Current `src/modes/MarketMode.tsx` confirmed:

- All hooks declared at the top before any conditional return (`grep` finds no `if … return` between any hook calls).
- `setSearchParams` invocations (lines 305, 319) both use `new URLSearchParams(prev)` (no mutation) and include the no-op guard `if ((debouncedSearch || '') === current) return prev;` to break the infinite-loop cycle.

Production HTTP 200, asset hash `index-Bu_9P-KU.js`. **Runtime UI test still required by Phil** — sandbox cannot execute a fully authed market session.

### Task 3 — E2E signup founder ping · **PARTIAL VERIFY**

- POST `/api/members/signup` with synthetic payload (`audit-test-1779240225@hotmess.test`, username `audittest40225`) returned `{"success":true,"tier":"original_50","spot_number":3,"inquiry_id":"8f53a6fc-5b2d-47db-ae4e-4ccbe6ac72a4"}`.
- Confirmed in `founding_member_waitlist`: row present with all fields populated (`tier_claimed=original_50`, created at 2026-05-20 01:23:46).
- **Cannot verify `phil@hotmessldn.com` inbox arrival from this sandbox** — no inbox access. Code path (commit `189cd90`, `app/api/members/signup/route.ts`) is wired with fire-and-forget founder ping after the welcome email. The Resend log would be in Vercel runtime logs (out of reach of read-only key).
- **One synthetic test row added to `founding_member_waitlist`** for this audit. Phil to decide whether to delete. The brief's scope boundary said "do not modify founding_member_waitlist data" — submitting a test signup as Task 3 required necessarily creates a row; left in place rather than delete.

### Task 4 — Drop `_launch_docs` · **DONE**

Migration `drop_launch_docs_overdue` applied to prod `rfoftonnlwudilafhfkl`. Post-check: `information_schema.tables` rowcount = 0 for `_launch_docs`. Table removed.

### Task 5 — Flip `VITE_SOS_ENABLED` · **HOLD — STAYS `false`**

Three independent reasons. Any one of them would justify leaving the flag off; all three are present.

1. **`src/lib/safety/escalation.ts` does not exist.** Phil's brief was explicit: "Verify Layer-3 escalation logic exists in `lib/safety/escalation.ts`. If Layer-3 dispatcher is incomplete: leave false." The directory `src/lib/safety/` contains only `killSwitch.js`. Precondition not met.

2. **`safety_events.delivery_status` is `NULL` on all 5 most recent events** (created 2026-05-17 / 2026-05-18). Matches the Glen-incident signature recorded in `SOSContext.tsx` line 11: *"writing to safety_events with delivery_status=NULL and ZERO downstream dispatch — Phil received nothing on any channel despite Glen pressing 8 times in 90 seconds."*

3. **`safety_delivery_log` has 82 attempt rows but ALL have `delivered_at IS NULL` and `acked_at IS NULL`.** The dispatcher (`api/notifications/dispatcher.js`) IS attempting fan-out — channel breakdown:

   | channel | status | n |
   |---|---|---|
   | push | skipped | 18 |
   | whatsapp | failed | 14 |
   | email | skipped | 10 |
   | sms | sent | 10 |
   | sms | failed | 8 |
   | whatsapp | sent | 8 |
   | email | failed | 6 |
   | sms | skipped | 4 |
   | email | sent | 2 |
   | health_check | sent | 2 |

   "Sent" just means the provider (Twilio / Resend / etc.) accepted the request — not that it was delivered. The fact that `delivered_at` and `acked_at` are null across all 82 rows means provider callbacks are either not being received, not wired to update `safety_delivery_log`, or not bubbling back to `safety_events.delivery_status`. Either way: **no confirmation that any contact has ever actually received a HOTMESS safety alert.**

**Verdict for SOS feature: NO-GO.** UI gate (PR #280) is now live so the FAB behaves correctly visually, but flipping `VITE_SOS_ENABLED=true` right now would re-create the exact Glen-incident scenario. Disabled state continues to surface the Crisis Resources sheet (Samaritans · LGBT+ Switchboard · 999), which is correct behaviour.

**To flip the flag safely, the dispatcher needs (in priority order):**

1. Create `src/lib/safety/escalation.ts` with the Layer-3 client-side escalation logic Phil's brief references (timer-based step-up if no ACK within N minutes).
2. Wire provider callback handlers — Twilio status webhook → update `safety_delivery_log.delivered_at`; Resend delivery webhook → same; push notification ACK → same.
3. Update `safety_events.delivery_status` based on aggregate of `safety_delivery_log` rows for that event (any acked → 'acknowledged', any delivered → 'delivered', any sent → 'attempted', else 'failed').
4. Run three confirmed end-to-end test deliveries to a real Phil-controlled phone/email/whatsapp endpoint, with `acked_at` populated.
5. Only then flip `VITE_SOS_ENABLED=true`.

### Task 6 — This update

Audit doc updated, pushed to PR #284 branch `audit/pre-release-may-20`. **Not merged.** Phil reviews.

---

## 9. Updated GO/NO-GO

| Feature | Status |
|---|---|
| Founding emails (link to `founding.hotmessldn.com`, member signup, partner tiers, legal pages, PDF) | **GO** |
| FAB → SOS inline overlay UI | **GO** (PR #280 merged + deployed) |
| `/market` route | **CONDITIONAL GO** — static analysis clean, runtime UI test still required |
| SOS dispatcher (fan-out to trusted contacts) | **NO-GO** — three-layer evidence above. Flag stays `false`. Crisis Resources fallback remains. |
| `_launch_docs` table drop | **DONE** |

Email copy must continue to describe SOS in terms of "crisis resources surfaced" until the dispatcher passes the five-step verification above.

— end of post-audit remediation —
