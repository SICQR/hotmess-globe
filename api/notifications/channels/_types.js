/**
 * Channel module contract — shared by push/sms/whatsapp/email/voice.
 *
 * Each channel exports:
 *
 *   send(opts: SendOpts) → Promise<SendResult>
 *
 * The dispatcher calls `send()` and writes the result into safety_delivery_log.
 * Modules MUST NOT throw; they must return { ok: false, error } on any failure
 * (including missing env vars). This keeps fan-out resilient.
 *
 * Type docs only — no runtime enforcement, JS not TS.
 *
 * SendOpts shape:
 *   {
 *     contact:   { id, contact_name, contact_phone?, contact_email?, user_id_if_internal? },
 *     user:      { id, display_name, email? },
 *     event:     { id, type, metadata, location_str },
 *     mode:      'fanout' | 'sequential',
 *     ackUrl:    string | null,    // null if SAFETY_ACK_SECRET unset
 *     deliveryId: string,           // primary key of the safety_delivery_log row pre-allocated by dispatcher
 *     supabase:  ServiceRoleClient, // for channel-specific lookups (e.g. push subs)
 *   }
 *
 * SendResult shape:
 *   {
 *     ok:        boolean,
 *     skipped?:  boolean,    // true when the channel is impossible (e.g. no phone) — not a failure
 *     providerId?: string,
 *     deliveredAt?: string,  // ISO timestamp if synchronously known delivered (rare)
 *     error?:    string,
 *     raw?:      unknown,    // raw provider response for the audit row
 *   }
 */
export const SAFETY_FROM_DISPLAY = 'HOTMESS Safety';

export function safeStr(v, fallback = '') {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

export function buildAlertCopy({ user, event, ackUrl }) {
  const name = safeStr(user.display_name, 'A friend');
  const where = safeStr(event.location_str, 'Location unavailable');
  const verb = event.type === 'sos'
    ? 'pressed SOS'
    : event.type === 'get_out'
      ? 'pressed Get Out'
      : event.type === 'land_time_miss'
        ? 'missed their Land Time check-in'
        : event.type === 'check_in_miss'
          ? 'missed a safety check-in'
          : 'triggered a safety alert';

  const ackLine = ackUrl ? ` Confirm safe: ${ackUrl}` : '';
  return {
    short: `${name} ${verb} on HOTMESS. ${where}.${ackLine}`.trim(),
    title: `🆘 HOTMESS Safety — ${name}`,
    body: `${name} ${verb} on HOTMESS.\nLast known: ${where}.${ackUrl ? `\n\nReached them? Tap to confirm: ${ackUrl}` : ''}`,
  };
}
