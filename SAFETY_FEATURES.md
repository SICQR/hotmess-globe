# HOTMESS Safety Suite v5 — Feature Documentation

This document outlines the stealth safety features integrated into the HOTMESS application, collectively known as the "Invisible Safety" architecture. The system is designed to provide immediate, discreet emergency tools without drawing attention to the user or triggering aggressive "EMERGENCY" visual overlays.

## Core Gesture Triggers (The Shield FAB)

The Safety FAB (Floating Action Button) is globally available across the application. It sits completely outside the standard React Router page transitions with a forced `z-index` of `150` to ensure it is never blocked by modals or page loads.

### 1. Silent SOS (Triple Tap)
* **Gesture:** Tap the Shield icon 3 times rapidly (600ms threshold).
* **Feedback:** Discreet 3-pulse haptic vibration (no visual change).
* **Action:**
  * Immediately captures high-accuracy GPS coordinates in the background.
  * Writes an atomic entry to the `safety_events` Supabase table.
  * Queues an immediate `sos_alert` to the `notification_outbox`.
  * Dispatches the `safety_alert_v1` template via the **Meta WhatsApp Business API** to all trusted contacts (who have `notify_on_sos` enabled), containing the user's exact coordinates.

### 2. The Exit (1.5s Hold)
* **Gesture:** Press and hold the Shield icon for 1.5 seconds.
* **Feedback:** Single, distinct haptic vibration.
* **Action:** 
  * Dispatches a global `hm:trigger-fake-call` event.
  * The `FakeCallGenerator` instantly overlays a native-looking iOS or Android incoming phone call screen.
  * Provides the user with an immediate, socially acceptable excuse to leave an uncomfortable situation.

### 3. The Disappear (3s Hold)
* **Gesture:** Press and hold the Shield icon for 3+ seconds.
* **Feedback:** Double haptic vibration.
* **Action:**
  * Executes a "Stealth Wipe" of the device.
  * Iterates through `localStorage` and `sessionStorage`, destroying any authentication tokens or tracking data prefixed with `hm_` or `hm.`.
  * Redirects the application instantly to a blank, unauthenticated `/safe` route.

---

## The Window (Check-In Timers)

"The Window" allows users to set an expected return time before they head out. It runs via a globally synced `CheckinTimerContext` to ensure all UI components share the exact same countdown state.

* **Visual Indicator:** When a Window is active, the Shield FAB emits a subtle, pulsing blue glow (`rgba(0,194,224,0.6)`).
* **Expiry Escalation:** If the timer reaches zero and the user has not explicitly tapped "Check Out Safely":
  1. An immediate in-app "Aftercare Nudge" ("You good? 💙") pops up on the user's screen.
  2. The system logs a `missed` status in the `safety_checkins` table.
  3. The `check-ins.js` cron job detects the missed status and pushes a `trusted_contact_alert` into the outbox.
  4. The Meta WhatsApp API dispatches an alert to the user's trusted contacts, providing the last known location.

---

## Infrastructure & Backend Delivery

### Database Schema (Supabase)
The safety suite relies on three core tables:
1. `safety_events`: Immutable ledger for triggered SOS gestures and captured coordinates.
2. `safety_checkins`: Active state management for Check-in Timers ("The Window"), handling expected check-out times and escalation statuses.
3. `notification_outbox`: The centralized queue for all outgoing alerts.

### WhatsApp Delivery Engine
All critical safety alerts bypass standard email queues and are routed directly to WhatsApp for immediate visibility.
* **Dispatcher:** `api/notifications/dispatch.js` acts as the execution engine.
* **Integration:** It connects directly to the **Meta Graph API (v17.0)**.
* **Templates:** Uses the pre-approved `safety_alert_v1` WhatsApp Business template.
* **Environment Configuration:** Relies on `.env` variables (`WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`) to authenticate requests. Error handling gracefully catches Meta OAuth exceptions and logs them directly back to the `notification_outbox` metadata for debugging.
