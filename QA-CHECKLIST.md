# Real-Device QA Checklist

**Baseline:** `456e0e5`
**Date:** 2026-04-06
**Target:** hotmessldn.com (production)
**Question:** Can a real user trust this enough to use it tonight?

---

## How to use this

Open hotmessldn.com on each device. Run every test. Mark PASS / FAIL / SOFT.
- **PASS** — works as expected
- **FAIL** — broken, blocks launch
- **SOFT** — works but feels wrong, note what

---

## Devices to test

| Device | Browser | Tester | Status |
|--------|---------|--------|--------|
| iPhone (Safari) | Safari PWA | | |
| iPhone (Chrome) | Chrome | | |
| Android (Chrome) | Chrome | | |
| Desktop (Chrome) | Chrome | | |
| Desktop (Safari) | Safari | | |

---

## 1. First visit + signup

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 1.1 | Open hotmessldn.com — splash loads, no white flash | | |
| 1.2 | Age gate appears, tap "I'm 18+" | | |
| 1.3 | Sign up with email — magic link screen appears | | |
| 1.4 | Magic link received in inbox (check spam) | | |
| 1.5 | Tap magic link — returns to app, onboarding starts | | |
| 1.6 | Complete all onboarding steps (name, photo, vibe, safety, location) | | |
| 1.7 | Land on Ghosted grid with profiles visible | | |

---

## 2. Profile photo upload

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 2.1 | Go to Profile — tap photo area | | |
| 2.2 | Select photo from camera roll | | |
| 2.3 | Photo uploads without error | | |
| 2.4 | Photo appears on your profile immediately | | |
| 2.5 | Photo appears to OTHER users on the grid | | |
| 2.6 | Try uploading a tiny image (<200px) — error message shown | | |
| 2.7 | Try uploading a >5MB image — error message shown | | |

---

## 3. Ghosted grid

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 3.1 | Grid loads with profile cards | | |
| 3.2 | Cards show photo, name, distance/location | | |
| 3.3 | Online indicators visible on active users | | |
| 3.4 | Scroll loads more profiles (infinite scroll) | | |
| 3.5 | Tap a profile — profile sheet opens | | |
| 3.6 | Profile sheet shows photos, bio, badges | | |

---

## 4. Boo + Match flow

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 4.1 | Open a profile sheet — tap Boo button | | |
| 4.2 | Boo registers (button state changes) | | |
| 4.3 | On the OTHER device: boo notification arrives | | |
| 4.4 | Other user boos back | | |
| 4.5 | Match overlay appears on both devices | | |
| 4.6 | "Send a message" CTA on match overlay works | | |

---

## 5. Chat

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 5.1 | Chat sheet opens from match or profile | | |
| 5.2 | Type and send a text message | | |
| 5.3 | Message appears in thread immediately | | |
| 5.4 | Other user sees message (push or in-app) | | |
| 5.5 | Upload a photo in chat | | |
| 5.6 | Photo renders in thread | | |
| 5.7 | Unread badge shows on nav when backgrounded | | |

---

## 6. Meet prefill

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 6.1 | In a chat thread — tap Meet button | | |
| 6.2 | Meet sheet opens with midpoint suggestion | | |
| 6.3 | Map renders with location | | |

---

## 7. Push notifications

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 7.1 | Permission prompt appears (first visit or settings) | | |
| 7.2 | Grant permission — no error | | |
| 7.3 | Receive a push when app is backgrounded (boo/chat) | | |
| 7.4 | Tap push notification — app opens to correct screen | | |
| 7.5 | Push suppressed when already viewing that chat thread | | |
| 7.6 | Push suppressed for boo/match when on /ghosted | | |

---

## 8. SOS

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 8.1 | Long-press SOS button — overlay appears | | |
| 8.2 | Location captured (check DB or UI) | | |
| 8.3 | Trusted contacts receive push with location | | |
| 8.4 | Safety page loads from More menu | | |

---

## 9. Radio

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 9.1 | Navigate to Radio tab | | |
| 9.2 | Tap play — stream starts | | |
| 9.3 | Navigate away — mini player persists above nav | | |
| 9.4 | Mini player controls work (pause/resume) | | |
| 9.5 | Navigate back to Radio — player state correct | | |

---

## 10. Market checkout

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 10.1 | Navigate to Market tab | | |
| 10.2 | Browse products — cards load with images + prices | | |
| 10.3 | Tap a product — detail sheet opens | | |
| 10.4 | Add to cart — cart badge updates | | |
| 10.5 | Open cart — items listed correctly | | |
| 10.6 | Tap checkout — Stripe payment page loads | | |
| 10.7 | (Test mode) Complete payment — success screen | | |

---

## 11. Movement / presence

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 11.1 | Grant location permission | | |
| 11.2 | Your profile shows as "online" to others | | |
| 11.3 | Background the app for 5+ min — status changes to recently active | | |
| 11.4 | Close app entirely — status eventually goes offline | | |
| 11.5 | "Who's Out RN" on home shows real online count | | |

---

## 12. PWA basics

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 12.1 | Add to Home Screen prompt or manual add works | | |
| 12.2 | Launch from home screen — full screen, no browser chrome | | |
| 12.3 | Navigate between tabs — no white flash or reload | | |
| 12.4 | Back button closes sheets before navigating back | | |
| 12.5 | Pull-to-refresh is disabled (no accidental reloads) | | |

---

## 13. Edge cases

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 13.1 | Airplane mode — app shows cached content, no crash | | |
| 13.2 | Slow 3G — app loads (may be slow but no white screen) | | |
| 13.3 | Expired magic link — shows "Link expired, resend?" | | |
| 13.4 | Double-tap back quickly — no crash or double navigation | | |
| 13.5 | Rotate device — layout doesn't break | | |

---

## Go / No-Go summary

Fill after completing all tests:

**FAIL count:** ___
**SOFT count:** ___

### Fails (blocks launch)

| # | What failed | Impact | Fix estimate |
|---|-------------|--------|--------------|
| | | | |

### Softs (ship but note)

| # | What felt off | Severity | |
|---|---------------|----------|-|
| | | | |

### Decision

- [ ] GO — ship it
- [ ] NO-GO — fix fails first, re-test
