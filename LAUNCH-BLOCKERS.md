# LAUNCH-BLOCKERS.md

**Baseline:** `fe52338`
**Date:** 2026-04-06
**Question:** What must be resolved before real users can trust this in production tonight?

---

## Definition

A launch blocker is something that will cause a real user to hit a dead end, lose data, or have a broken core-loop experience. Nice-to-haves, stubs, and minor polish are NOT blockers.

The E2E suite passed 14/14 on production at this baseline. The core loop works. The blockers below are gaps that real users will hit that automated tests cannot cover.

---

## Active blockers

### BLK-01 — Trusted contacts = 0 (SOS push untested in prod)

| Field | Value |
|-------|-------|
| **Severity** | P1 — safety-critical feature unverified |
| **Why** | `trusted_contacts` table has 0 rows in production. SOS button renders and doesn't crash (QA-11 passed), but the push-to-contacts path has never fired with a real contact. |
| **Fix** | Phil: add at least one trusted contact via the app on a real account and trigger SOS to confirm push arrives on contact's device. |
| **Owner** | Phil |
| **Automated?** | No — requires two real devices |

---

### BLK-02 — `uploads` storage bucket missing in production

| Field | Value |
|-------|-------|
| **Severity** | P1 — file upload features broken |
| **Why** | The Supabase project `rfoftonnlwudilafhfkl` does not have an `uploads` bucket. Code in `uploadToStorage.ts` falls back to `messmarket-images` for the `uploads` code name, but other features that use this bucket directly will fail. |
| **Fix** | Supabase dashboard → Storage → Create bucket named `uploads` with public read, authenticated write. |
| **Owner** | Phil |
| **Automated?** | No — dashboard action |

---

### BLK-03 — Magic link email delivery unverified

| Field | Value |
|-------|-------|
| **Severity** | P0 — new user cannot sign up without this |
| **Why** | QA-01 was skipped (needs real email inbox). Supabase Auth is configured but we have not confirmed a real magic link email arrives, is formatted correctly, and the link works end-to-end in a browser. |
| **Fix** | Phil: sign up with a real email address, receive the magic link, click it, confirm redirect lands on `/ghosted` (not `/auth` or 404). |
| **Owner** | Phil |
| **Automated?** | No — requires real email inbox |

---

### BLK-04 — Push notification display: real-device verification

| Field | Value |
|-------|-------|
| **Severity** | P1 — users won't know about matches/messages |
| **Why** | SW `push` event handler is wired in `sw.js` and QA-09 confirmed the subscription flow works. But no real push notification has been sent and received on a real device to confirm the notification actually appears. |
| **Fix** | Phil: on Chrome mobile or Safari PWA, grant notification permission, trigger an action that sends a push (e.g. receive a boo), confirm notification appears on lock screen. |
| **Owner** | Phil |
| **Automated?** | No — requires physical device |

---

### BLK-05 — Google OAuth broken in production

| Field | Value |
|-------|-------|
| **Severity** | P2 — alternative auth method broken |
| **Why** | Google OAuth returns "Unable to exchange external code: 4/0A" error. This is a Supabase Auth configuration issue — the Google OAuth client secret in Supabase is stale or invalid. |
| **Fix** | Supabase Dashboard → Authentication → Providers → Google → update Client Secret with current value from Google Cloud Console. |
| **Owner** | Phil |
| **Automated?** | No — dashboard action |

---

### BLK-06 — Full 7-step onboarding walkthrough unverified

| Field | Value |
|-------|-------|
| **Severity** | P1 — new user journey not end-to-end human-tested |
| **Why** | QA-02 was skipped (needs `SUPABASE_SERVICE_ROLE_KEY` to reset state). The onboarding code has been reviewed and spot-checked but no human has walked all 7 screens in sequence on production with a fresh account recently. |
| **Fix** | Phil: create a brand-new account on a real device, go through all onboarding steps without skipping, confirm grid loads at the end. |
| **Owner** | Phil |
| **Automated?** | No — requires fresh account state |

---

## Soft blockers (not day-1 stoppers but should be resolved soon)

### SOFT-01 — Stripe Connect: seller payouts not set up

| Field | Value |
|-------|-------|
| **Severity** | P2 — sellers cannot receive money |
| **Why** | All 3 sellers have `stripe_onboarding_complete = false`. Stripe Connect onboarding requires dashboard action. Preloved payments are currently "arrange via chat." |
| **Fix** | Phil: Stripe Dashboard → Connect → Accounts → complete onboarding for each seller. Then uncomment the one-line redirect in `PayoutManager.jsx`. |
| **Owner** | Phil |

---

### SOFT-02 — Video calls not verified in production

| Field | Value |
|-------|-------|
| **Severity** | P2 — feature may be broken with real users |
| **Why** | `L2VideoCallSheet.tsx` has WebRTC peer connection code. Not tested with two real accounts on separate devices. |
| **Fix** | Two-device test: both users in a matched chat, initiate video call, confirm stream establishes. |
| **Owner** | Phil |

---

### SOFT-03 — OTP expiry not configured

| Field | Value |
|-------|-------|
| **Severity** | P2 — magic links expire too quickly or too slowly |
| **Why** | Supabase default OTP expiry may not match the intended 1-hour window. |
| **Fix** | Supabase Dashboard → Auth → Email → OTP Expiry → set to 3600 |
| **Owner** | Phil |

---

## Cleared blockers (fixed during QA pass, 2026-04-06)

| Blocker | Fix | Commit |
|---------|-----|--------|
| `profiles.photos` column in SELECT queries | Removed from all hooks + sheets | `2453fdd` |
| `profiles.last_lat/last_lng` in SELECT queries | Removed — location in `user_presence` | `2453fdd` |
| `profiles.verified` → `is_verified` | Fixed column name | `2453fdd` |
| `messages` wrong column names (`thread_id`, `sender_email`) | Fixed to `conversation_id`, `sender_id` | `90ba11b` |
| `taps` RLS INSERT/SELECT/DELETE broken (`auth.users` inaccessible) | Replaced with `auth.jwt() ->> 'email'` | DB migration |
| Cookie banner covering Ghosted grid in E2E | Added `hm_cookie_consent_v1` to `bypassGates` | `20a0f2e` |
