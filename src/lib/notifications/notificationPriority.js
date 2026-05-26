/**
 * src/lib/notifications/notificationPriority.js
 *
 * Canonical priority taxonomy for HOTMESS notifications.
 * Brief: PR 4 of the notification stack (Phil 2026-05-26).
 *
 * Rules:
 *   - Every notification type maps to exactly one tier
 *   - If a new notification type is uncertain, default to AMBIENT and flag it
 *   - Nothing outside this file may invent new tiers
 *
 *   CRITICAL — SOS, safety. Must deliver. Retry x2 (5min backoff) then fall back.
 *   HIGH     — Mutual boo, new message, beacon tap on profile. Primary + push.
 *   AMBIENT  — Nearby activity, broadcasts. In-app bell only unless opted up.
 *              beacon_nearby has its own 30min dedup cooldown.
 *   SILENT   — System / audit. Writes outbox only. Never surfaces.
 */

export const PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  AMBIENT: 'ambient',
  SILENT: 'silent',
};

/** Canonical notification_type → tier. Default AMBIENT for unknown. */
export const TYPE_PRIORITY = {
  // CRITICAL
  sos_trigger: PRIORITY.CRITICAL,
  safety_alert: PRIORITY.CRITICAL,
  emergency: PRIORITY.CRITICAL,
  sos: PRIORITY.CRITICAL,

  // HIGH
  mutual_boo: PRIORITY.HIGH,
  new_message: PRIORITY.HIGH,
  beacon_tap: PRIORITY.HIGH,
  message: PRIORITY.HIGH,
  boo: PRIORITY.HIGH,
  match: PRIORITY.HIGH,

  // AMBIENT
  beacon_nearby: PRIORITY.AMBIENT,
  radio_event: PRIORITY.AMBIENT,
  creator_broadcast: PRIORITY.AMBIENT,
  event_reminder: PRIORITY.AMBIENT,
  drop: PRIORITY.AMBIENT,

  // SILENT
  read_receipt: PRIORITY.SILENT,
  system_audit: PRIORITY.SILENT,
};

/** Which tiers may also trigger browser push (additive alongside primary). */
export const PUSH_TIERS = [PRIORITY.CRITICAL, PRIORITY.HIGH];

/** Tiers that NEVER leave the in-app bell. */
export const IN_APP_ONLY_TIERS = [PRIORITY.AMBIENT, PRIORITY.SILENT];

/** Resolve any notification_type to its tier. Unknown → AMBIENT. */
export function tierFor(notificationType) {
  if (!notificationType) return PRIORITY.AMBIENT;
  const t = String(notificationType).toLowerCase();
  return TYPE_PRIORITY[t] || PRIORITY.AMBIENT;
}

export default { PRIORITY, TYPE_PRIORITY, PUSH_TIERS, IN_APP_ONLY_TIERS, tierFor };
