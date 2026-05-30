/**
 * src/lib/phone.ts — E.164 normalisation for UK + intl phone numbers.
 *
 * Used by:
 *   - The new multichannel trusted-contacts UI (defensive normalisation on blur)
 *   - api/notifications/channels/sms.js / whatsapp.js (defensive before send)
 *   - Backfill scripts for trusted_contacts.contact_phone
 *
 * Rules:
 *   1. Strip non-digit chars (preserve leading +).
 *   2. If starts with "+", treat as E.164 and return as-is.
 *   3. If starts with "00", that's an international prefix — replace with "+".
 *   4. If starts with "0" — UK national format. Strip the 0, prepend "+44".
 *   5. If starts with "7" and is 10 digits — UK mobile without leading 0. Prepend "+44".
 *   6. Otherwise: prepend "+" (assume the leading digits are a country code).
 *
 * Returns null if cleaned digit string is empty or < 7 digits.
 *
 * Cofounder audit 2026-05-18 — Glen's row was stored as `07444203409` (UK
 * national format, no + and leading 0). Twilio rejected with 21211. This
 * utility normalises new entries; backfill SQL fixed existing rows.
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  const hasPlus = s.startsWith('+');
  s = s.replace(/\D/g, '');
  if (s.length < 7) return null;
  if (hasPlus) return '+' + s;
  if (s.startsWith('00')) return '+' + s.slice(2);
  if (s.startsWith('0')) return '+44' + s.slice(1);
  if (s.startsWith('7') && s.length === 10) return '+44' + s;
  return '+' + s;
}

export function isE164(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^\+[1-9]\d{6,14}$/.test(s);
}

export function needsNormalisation(s: string | null | undefined): boolean {
  if (!s) return false;
  const n = normalisePhone(s);
  return n !== null && n !== s;
}
