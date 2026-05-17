# Sprint 0 — Auth funnel rescue (EMERGENCY post-ship)

**Brief:** `EMERGENCY_auth_funnel_rescue.md`  
**Branch:** `fix/auth-funnel-rescue` (PR #273 squash `4b4231c`)  
**Production deploy:** `dpl_E8KCAqGLe6tRRZPaFgLtSBPDmVT2` → READY, aliased to hotmessldn.com  
**Shipped:** 2026-05-17, ~80 min from emergency declaration

## Root cause analysis

120 reentry emails shipped. 68 reentry_tokens rows existed (from my MODE=enqueue script writes, NOT from user clicks). **0 consumed.** 4h of runtime logs showed ZERO `/api/auth/reentry-verify` calls — i.e. nobody who clicked the email reached the verify endpoint.

Two compounding bugs, plus a metadata data-quality bug:

1. **BootRouter intercepts /reentry.** `PUBLIC_PATH_PREFIXES` in `src/components/shell/BootRouter.jsx` listed only `/legal /about /terms /privacy /guidelines /contact /accessibility`. Non-authed members landing on `/reentry` got routed to `OnboardingRouter` (which renders the SignUp/AgeGate flow) before ReentryPage ever mounted. That's why verify was never called — the ReentryPage `useEffect` that calls it never ran.
2. **reentry-complete had no session creation.** Even with the BootRouter fix, the welcome screen's `Hit the globe →` button navigated to `/pulse`, which has an auth guard that bounces unauth'd users to `/auth`. So Glen would have completed reentry, seen the welcome screen, clicked the button, and immediately landed on the sign-in page — confused that he just signed up but is being asked to sign in.
3. **52 of 120 sent emails went out with `href="undefined"`.** The v1 outbox enqueue happened in two passes: 61 rows via `MODE=enqueue` script (which populated `metadata.reentry_url`), then 67 via direct SQL backfill (which set `metadata.needs_token_mint=true` but never populated `reentry_url`). The dispatcher's `htmlBody()` reads `metadata.reentry_url` and renders `href="${reentryUrl}"` — undefined when missing. So 52 of those went out with a literal `href="undefined"` in the CTA anchor.

## Fixes shipped (one branch, one PR)

| Issue | Fix |
|---|---|
| **1 (P0)** BootRouter intercept | Added `/reentry` + `/portal` to `PUBLIC_PATH_PREFIXES`. |
| **1b (P0)** No session handoff | `reentry-complete` now calls `supabase.auth.admin.generateLink({type:'magiclink', email})` and returns `action_link`. ReentryPage's done phase renders the primary CTA as `<a href={actionLink}>Enter HOTMESS →</a>` so the click hands off to `/auth/callback` with a real session. |
| **2 (P1)** Duplicate Telegram buttons | Added `MutationObserver` to `TelegramLoginButton.jsx` that flips `showFallback=false` when an `<iframe>` appears in the container post-watchdog. |
| **3 (P1)** No forgot-password | Added `Forgot password?` button below the password field on the sign-in form (renders only when `isSignIn=true`). Fires `supabase.auth.resetPasswordForEmail(email, {redirectTo:/reset-password})` — BootRouter already whitelists `/reset-password`. |
| **4 (P1)** Apple Sign-In broken | Investigation: zero `APPLE_*` env vars on hotmess-globe Vercel. .p8 key not reachable. **Feature-flag off** per brief's launch-day mitigation: `APPLE_ENABLED = import.meta.env.VITE_AUTH_APPLE_ENABLED === 'true'` (defaults false). When Phil hands over .p8 + sets all four `APPLE_*` env vars + `VITE_AUTH_APPLE_ENABLED=true`, the button reappears without code change. |
| **Data fix** | 52 sent rows tagged `metadata.broken_url_v1=true` so Phil can query the cohort for follow-up. |

## Apple env-var inventory (`vercel env ls production | grep -i apple`)

```
(zero results)
```

Required for Apple Sign-In server-side flow:
- `APPLE_CLIENT_ID` (likely `com.homessldn.web.auth` per userMemories)
- `APPLE_TEAM_ID` (`TX9YWW78MN`)
- `APPLE_KEY_ID` (`Q48XF5HY73`)
- `APPLE_PRIVATE_KEY` (the .p8 content as PEM)
- `VITE_AUTH_APPLE_ENABLED` (set to `true` to un-hide the client button)

None of these are set. Cowork cannot mint the client-secret JWT without the .p8.

## Smoke test against prod

```bash
$ curl -s https://hotmessldn.com/assets/index-DaNURfmy.js | grep -oE '"/reentry"|"/portal"|action_link|generateLink' | sort -u
"/portal"
"/reentry"
action_link
generateLink

$ curl -sI https://hotmessldn.com/reentry
HTTP/2 200
```

BootRouter whitelist + magic-link wiring confirmed in the deployed bundle.

## Token consumption — before/after

```
BEFORE (pre-deploy):
  tokens minted: 68
  consumed:       0

AFTER (post-deploy, T+0):
  tokens minted: 68
  consumed:       0   (clicks from now-on should flip this)
```

Hourly monitor scheduled — see "Watch" section below.

## Glen-first personal follow-up message (Phil sends manually)

Paste into Telegram / WhatsApp / iMessage to Glen first, then to anyone in the cohort Phil knows personally. The 52 broken-URL recipients get a fresh URL appended (Phil pulls from the SQL query at the bottom).

```
Hey [name], 

The reentry email I sent earlier was broken — the link bounced you straight to the sign-in page instead of letting you back in. Sorry. Just fixed it.

If you tried already and gave up: try the same link again, it works now. End of the flow you'll see "Enter HOTMESS →" — that's the one that actually logs you in.

If you can't find the email or your link is one of the broken ones, I'll send you a fresh URL personally — DM me.

Phil
```

To pull the fresh URL for any specific person:

```sql
-- Replace 'glen@example.com' with the recipient
SELECT user_email, metadata->>'first_name' AS first_name,
       CASE WHEN metadata ? 'reentry_url'
            THEN metadata->>'reentry_url'
            ELSE '(broken — needs fresh mint)' END AS reentry_url,
       metadata->>'broken_url_v1' AS broken
FROM notification_outbox
WHERE notification_type='reentry-invitation'
  AND user_email = 'glen@example.com';
```

For the 52 broken-URL recipients: a `MODE=followup` resend script can be wired post-confirmation (mints fresh tokens from profile_id + REENTRY_SECRET, sends with "auth was broken, try now" copy). Cowork holds until Phil approves the resend.

## Out of scope (per brief HARD list)

- The two auth page surfaces ("JOIN THE NIGHT" vs "Welcome back") — Sprint 1 brief, not touched.
- No new auth methods added.
- The reentry email itself (already shipped, can't be recalled).
- AgeGate or username-lock components.

## What ships next

- **Hourly monitor:** scheduled task fires a token-consumption count + posts to chat. Phil sees the bounce rate fall in real time.
- **52-row follow-up resend:** held for Phil's go.
- **Sprint 1 #02 (partner pitch):** un-paused after this rescue is verified working.
- **Sprint 1 #01 zip:** still blocked on file handoff from the other Cowork thread.

## Confidence statement

The BootRouter fix + magic-link handoff is the right shape. The deployed bundle confirms both changes shipped. The next real-world clicks will be the proof — within an hour, `consumed > 0` is the green-light signal.

If consumed stays at 0 over the next 90 min, something else is broken beyond this PR — Cowork posts a fresh diagnosis. Per the brief's failure-mode contract.
