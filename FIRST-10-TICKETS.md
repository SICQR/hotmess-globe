# FIRST-10-TICKETS.md

**Baseline:** `fe52338`
**Date:** 2026-04-06
**Context:** E2E suite passes 14/14. Core loop verified. These are the 10 most impactful next engineering tickets — all addressable without new features or architecture changes.

Priority: P0 = blocks real usage tonight, P1 = blocks real usage this week, P2 = polish/scale

---

## TKT-01 — Wire push event handler to show browser notifications

**Priority:** P1
**File:** `public/sw.js`
**What:** The service worker is registered and VAPID keys are set. The `push` event handler exists but may not call `self.registration.showNotification()` in all paths. QA-09 passed subscription setup, but no real notification has appeared on a real device.
**Acceptance:** Receive a boo or chat message on a real device with notification permission granted. A lock-screen notification appears with correct title, body, and icon. Tapping the notification opens the app to the relevant thread.
**Effort:** ~1–2 hours. Code is in `sw.js` and `api/notifications/process.js`.

---

## TKT-02 — Create `uploads` storage bucket in production

**Priority:** P1
**Where:** Supabase Dashboard (rfoftonnlwudilafhfkl) → Storage
**What:** Create bucket named `uploads`. Policy: public read, authenticated write, 5MB max file size.
**Why:** Several upload paths fall through to this bucket name. Without it, uploads silently fail.
**Acceptance:** `uploadToStorage('uploads', file, path)` returns a public URL without error.
**Effort:** 5 minutes in dashboard. No code changes needed.
**Owner:** Phil (dashboard action)

---

## TKT-03 — Fix Google OAuth client secret in Supabase

**Priority:** P1
**Where:** Supabase Dashboard → Authentication → Providers → Google
**What:** The Google OAuth client secret is stale. Update it from Google Cloud Console.
**Why:** Google Sign-In returns "Unable to exchange external code: 4/0A" for all users.
**Acceptance:** Google Sign-In flow completes and lands on `/ghosted`.
**Effort:** 10 minutes. No code changes needed.
**Owner:** Phil

---

## TKT-04 — Seed trusted_contacts and do real SOS test

**Priority:** P1
**What:** Add at least one trusted contact via the app UI on a real account. Trigger SOS. Confirm push notification arrives on the contact's device with Google Maps link and user location.
**Why:** QA-11 passed (no crash) but the actual push-to-contacts path has never fired in prod.
**Acceptance:** Contact's phone receives push with location. App returns to normal after SOS clear.
**Effort:** Manual test, ~30 minutes.
**Owner:** Phil

---

## TKT-05 — Wire AI stubs to real Claude API endpoints

**Priority:** P2
**Files:** At least 4+ components with `console.warn('[TODO] LLM endpoint needed')` including `WingmanAI`, `SceneScout`, and match-probability features.
**What:** Replace `console.warn` stubs with real `fetch('/api/ai/...')` calls. The `/api/ai/` route group exists in `api/ai/` — wire up at minimum: Scene Scout (venue recommendations from `gay_world_knowledge`) and Wingman AI (conversation starters from chat context).
**Acceptance:** Scene Scout returns venue recommendations. Wingman AI returns 3 conversation starters in the chat sheet.
**Effort:** 1 day. `api/ai/scene-scout.js` already queries `gay_world_knowledge`. Need to add Claude API call.

---

## TKT-06 — Complete read receipt sync (chat)

**Priority:** P2
**File:** `src/components/sheets/L2ChatSheet.jsx`, `src/hooks/useMarkRead.ts`
**What:** `markRead()` currently zeroes `chat_threads.unread_count` in Supabase. The bidirectional read receipt (showing "read" tick to the sender) is not yet wired.
**Acceptance:** Message sent by Alpha shows a "read" tick when Beta opens the thread. Unread badge in OSBottomNav clears immediately when thread is opened.
**Effort:** ~3 hours. Need Supabase realtime subscription on `chat_threads.unread_count` for the sender's context.

---

## TKT-07 — Verify QR ticket scanning in production

**Priority:** P2
**Files:** `/api/scan/`, `src/modes/VaultMode.tsx`
**What:** Event RSVPs write a ticket to the Vault with a QR code. The `/api/scan/` endpoint is in the repo. Confirm: QR code renders correctly in Vault, scanning endpoint validates it against `TICKET_QR_SIGNING_SECRET`, and the ticket is marked as used.
**Acceptance:** Real QR code scanned with a camera app resolves to the correct event + attendee. Double-scan is rejected.
**Effort:** ~2 hours to verify + fix any gaps. `TICKET_QR_SIGNING_SECRET` must be set in Vercel env.

---

## TKT-08 — Define and populate VaultMode content

**Priority:** P2
**File:** `src/modes/VaultMode.tsx`
**What:** VaultMode shell exists but content is undefined. Phil to decide: tickets, orders, saved items, archive? The `vault_items` table exists. Suggested scope: purchased event tickets (with QR), Shopify orders, and saved market listings.
**Acceptance:** Vault tab shows at least: event tickets with QR codes, and Shopify orders. Empty state is clean and informative.
**Effort:** 1 day design + build.
**Owner:** Phil to define scope first.

---

## TKT-09 — Stripe Connect onboarding for sellers

**Priority:** P2 (soft blocker for sellers receiving money)
**What:** Three existing sellers need Stripe Connect onboarding. Once onboarded, uncomment the one-line payout redirect in `PayoutManager.jsx`.
**Acceptance:** Seller dashboard shows real earnings. Payout button initiates a Stripe Connect transfer.
**Effort:** Manual Stripe dashboard action for each seller, then 1-line code uncomment.
**Owner:** Phil (Stripe dashboard)

---

## TKT-10 — Two-device push notification suppression test (QA-10)

**Priority:** P2
**What:** QA-10 was listed as "cannot be automated — requires two simultaneous physical devices." When a user is actively viewing a chat thread, they should NOT receive a push notification for new messages in that thread (in-app suppression). This has never been verified.
**Acceptance:** User A is in a chat thread with User B. User B sends a message. User A does NOT receive a lock-screen push. User A navigates away, User B sends another message. User A DOES receive a push.
**Effort:** Manual test, ~30 minutes with two devices.
**Owner:** Phil

---

## Order of execution

If Phil has one engineering session to burn before launch:

1. TKT-03 (Google OAuth — 10 min, Phil)
2. TKT-02 (uploads bucket — 5 min, Phil)
3. TKT-01 (push notification display — 1–2 hrs, Claude)
4. TKT-04 (SOS manual test — 30 min, Phil)
5. TKT-05 (AI stubs — 1 day, Claude — not required for launch, do after)
