/**
 * HOTMESS v6 — Runtime Isolation: Field Manifest
 * Source of truth for per-service access control.
 * Every service that queries the DB or calls another service
 * must be listed here. Enforcement is at runtime via
 * enforceFieldAccess() in isolationEnforcement.js.
 *
 * Spec: HOTMESS-RuntimeEnforcement.docx §2
 *       HOTMESS-SystemIsolationMap.docx §3
 */

/** Fields no service may pass to an AI context. Ever. */
export const AI_BLOCKED_FIELDS = [
  'support_preferences',
  'lifestyle_preferences',
  'support_notifications_enabled',
  'support_detail_level',
  'backup_contacts',
  'care_settings',
  'safety_alerts',
  'get_out_enabled',
  'land_time',
  'moderation_history',
  'risk_flags',
  'report_history',
];

/** Supabase Realtime channels permitted to broadcast. */
export const ALLOWED_REALTIME_CHANNELS = [
  'public_movement_presence',
  'meet_sessions',
  'beacon_state',
  'notifications',
];

/** Tables that must never appear in any Realtime broadcast. */
export const REALTIME_BLOCKED_TABLES = [
  'support_preferences',
  'lifestyle_preferences',
  'backup_contacts',
  'safety_alerts',
  'care_settings',
  'moderation_reports',
  'age_verification_log',
];

/**
 * Per-service field declarations.
 * `allowed` — fields this service may read.
 * `blocked` — fields that throw immediately if requested.
 *
 * A field not listed in either array is treated as blocked
 * (fail-closed).
 */
export const FIELD_MANIFEST = {
  AI_LAYER: {
    allowed: [
      'chat_text',
      'movement_state',
      'right_now_status',
      'venue_context',
      'event_data',
      'meet_stage',
    ],
    blocked: [
      'support_preferences',
      'lifestyle_preferences',
      'backup_contacts',
      'care_settings',
      'safety_alerts',
      'historical_sessions',
      'moderation_history',
    ],
  },

  OPERATOR_PANEL: {
    allowed: [
      'beacon_state',
      'event_rsvp_count',
      'checkin_rate',
      'peak_time_aggregate',
      'aa_state_readonly',
    ],
    blocked: [
      'user_location',
      'movement_state',
      'chat_content',
      'support_preferences',
      'lifestyle_preferences',
      'care_settings',
      'backup_contacts',
      'meet_sessions',
    ],
  },

  MEET_SYSTEM: {
    allowed: [
      'location_session',
      'movement_state',
      'meet_sessions',
      'right_now_status',
      'chat_thread_meet',
    ],
    blocked: [
      'support_preferences',
      'lifestyle_preferences',
      'backup_contacts',
      'care_settings',
      'operator_data',
      'globe_aggregate',
      'ai_outputs',
    ],
  },

  NOTIFICATIONS: {
    allowed: [
      'notification_prefs',
      'support_notifications_enabled',
      'movement_state',
      'meet_stage',
    ],
    blocked: [
      'support_detail_level_external',
      'lifestyle_preferences',
      'care_alert_content',
      'other_user_notif_state',
    ],
  },

  GLOBE_SYSTEM: {
    allowed: [
      'globe_signals',
      'crowd_density',
      'beacon_intensity',
      'aa_state',
      'event_state',
      'movement_session_count',
    ],
    blocked: [
      'user_location',
      'chat_content',
      'meet_sessions',
      'support_preferences',
      'lifestyle_preferences',
      'care_settings',
      'backup_contacts',
      'ai_outputs',
    ],
  },
};
