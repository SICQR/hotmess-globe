/**
 * D58 — Canonical SOS payload composer.
 *
 * Amendment 8: All trusted-contact SOS dispatches MUST originate from this
 * function. Telegram, SMS, and operational alert channels may adapt formatting
 * for transport constraints but may NOT redefine field ordering, identity
 * language, event IDs, timestamps, CTA text, or emergency instructions.
 *
 * Any drift from this composer is a doctrine violation. Channel adapters call
 * composeSosPayload({ channel, ...opts }) and use the returned `body` directly.
 *
 * Versioning: the TEMPLATE_VERSION constant ships with every dispatch row so
 * historical messages can be traced back to the format they were rendered
 * under. Increment on any template-shape change.
 */
import { formatEventCode } from './_event-id.js';

export const TEMPLATE_VERSION = 'D58-S0-v1';

const BANNED_PHRASES = [
  'A friend just pressed SOS',   // pre-D58 anonymous template
  'Acknowledge here',             // pre-D58 weak CTA
  'call the member now',          // pre-D58 weak CTA
  // D59 Appendix A §A.1, §A.9 — "trusted contact" is a post-acceptance label.
  // Until the two-party acceptance flow exists (D59-S2), every SOS recipient is
  // technically a Safety Recipient who never agreed. Banning the word at the
  // composer protects against quiet regressions.
  'trusted contact',
  'Trusted Contact',
];

/**
 * Format the trigger time in BST (Europe/London). Most SOS events involve a
 * London-based member; recipient locale handling is deferred to S3+ when we
 * add geocoding + locale resolution. Until then, BST/GMT is the conservative
 * default — explicit timezone in the line removes ambiguity.
 */
function formatTriggeredAt(createdAt) {
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(d.getTime())) return 'unknown';
  try {
    const time = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/London',
      timeZoneName: 'short',
    }).format(d);
    return time; // e.g. "19:02 BST"
  } catch {
    return d.toISOString();
  }
}

/**
 * Build a UNIVERSAL maps link. The previous Apple Maps deeplink
 * (maps.apple.com) redirects to the wrong page on non-Apple devices, so an
 * emergency contact on Android lands somewhere useless. Google's documented
 * universal URL opens the location correctly on iOS, Android and desktop.
 */
function buildMapsLink(lat, lng) {
  if (lat == null || lng == null) return null;
  const a = Number(lat).toFixed(5);
  const b = Number(lng).toFixed(5);
  return `https://www.google.com/maps/search/?api=1&query=${a},${b}`;
}

function coordPair(lat, lng) {
  if (lat == null || lng == null) return null;
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

/**
 * Normalise a phone to tap-to-call shape. We trust upstream E.164; this is a
 * display-only normaliser so the displayed line is consistent.
 */
function displayPhone(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  return v.startsWith('+') ? v : `+${v.replace(/\D/g, '')}`;
}

/**
 * composeSosPayload — single source of truth for all SOS channel payloads.
 *
 * @param {Object} opts
 * @param {'telegram'|'sms'|'ops'} opts.channel
 * @param {Object} opts.event — safety_events row (id, created_at, metadata)
 * @param {Object} opts.user — profile row (display_name, phone, last_lat, last_lng)
 * @param {string|null} opts.ackUrl — token-scoped acknowledgement page URL
 * @returns {{
 *   body: string,
 *   eventCode: string,
 *   templateVersion: string,
 *   missingFields: string[]
 * }}
 */
export function composeSosPayload(opts = {}) {
  const { channel = 'telegram', event = {}, user = {}, ackUrl = null } = opts;

  const eventCode = formatEventCode({
    createdAt: event.created_at,
    eventId: event.id,
  });

  // Identity (Amendment 1: mandatory, no consent gate)
  const name = (user.display_name && String(user.display_name).trim()) || 'A HOTMESS member';
  const firstName = name.split(/\s+/)[0];

  // Phone (Amendment 5: tap-to-call mandatory line)
  const phone = displayPhone(user.phone);

  // Location (raw coords from metadata > profile fallback)
  const meta = (event.metadata && typeof event.metadata === 'object') ? event.metadata : {};
  const lat = meta.lat ?? user.last_lat ?? null;
  const lng = meta.lng ?? user.last_lng ?? null;
  const mapsLink = buildMapsLink(lat, lng);
  const coords = coordPair(lat, lng);

  // Trigger time (Amendment doctrine: explicit, never "the message bubble timestamp")
  const triggeredAt = formatTriggeredAt(event.created_at || new Date());

  // Track what we couldn't render — surfaced to callers for observability,
  // never blocks send (safety doctrine: ship what we have).
  const missingFields = [];
  if (!user.display_name) missingFields.push('display_name');
  if (!phone) missingFields.push('phone');
  if (!mapsLink) missingFields.push('location');
  if (!ackUrl) missingFields.push('ackUrl');

  let body;
  if (channel === 'sms') {
    body = composeSms({ name, firstName, phone, ackUrl, mapsLink, coords, triggeredAt, eventCode });
  } else if (channel === 'ops') {
    body = composeOps({ name, firstName, phone, ackUrl, mapsLink, coords, triggeredAt, eventCode, event });
  } else {
    body = composeTelegram({ name, firstName, phone, ackUrl, mapsLink, coords, triggeredAt, eventCode });
  }

  return { body, eventCode, templateVersion: TEMPLATE_VERSION, missingFields };
}

/**
 * Telegram payload (Phil-locked shape). Telegram has no length budget worth
 * worrying about — full payload renders cleanly.
 */
function composeTelegram({ name, firstName, phone, ackUrl, mapsLink, coords, triggeredAt, eventCode }) {
  const lines = [];
  lines.push('🚨 HOTMESS SOS');
  lines.push('');
  lines.push(`${name.toUpperCase()} triggered SOS.`);
  lines.push('');
  lines.push(`You are receiving this alert because ${firstName} listed you as a contact to reach in an emergency.`);
  lines.push('');
  if (phone) {
    lines.push('Call now:');
    lines.push(phone);
    lines.push('');
  } else {
    lines.push(`Phone not on file — use the live location link below to coordinate with ${firstName}.`);
    lines.push('');
  }
  if (ackUrl) {
    lines.push('View live location:');
    lines.push(ackUrl);
    lines.push('');
  }
  // D59 Appendix A §A.1 — HOTMESS-as-infrastructure-not-rescuer.
  // Keep the recipient anchored to a phone-someone-they-know contract.
  if (mapsLink) {
    lines.push('Last known location:');
    lines.push(mapsLink);
    if (coords) lines.push(`(${coords})`);
    lines.push('');
  } else {
    lines.push('Last known location: unavailable.');
    lines.push('');
  }
  lines.push('Triggered:');
  lines.push(triggeredAt);
  lines.push('');
  lines.push('SOS Event:');
  lines.push(eventCode);
  lines.push('');
  lines.push(`If you cannot reach ${firstName}, contact emergency services and share the live location above.`);
  lines.push('');
  lines.push('— HOTMESS member safety');
  return lines.join('\n');
}

/**
 * SMS payload (Phil-locked: core safety contract intact, compressed for budget).
 * Targets ≤320 chars (two SMS segments) — every required field present.
 */
function composeSms({ name, firstName, phone, ackUrl, mapsLink, triggeredAt, eventCode }) {
  // Compact recognition line + identity + tap-to-call + view-link + maps + time + event
  const parts = [];
  parts.push(`🚨 HOTMESS SOS: ${name} triggered SOS.`);
  parts.push(`${firstName} listed you as an emergency contact.`);
  if (phone) {
    parts.push(`Call: ${phone}`);
  } else {
    parts.push(`Phone not on file.`);
  }
  if (ackUrl) {
    parts.push(`Live: ${ackUrl}`);
  }
  if (mapsLink) {
    parts.push(`Map: ${mapsLink}`);
  }
  parts.push(`At ${triggeredAt}.`);
  parts.push(`Event: ${eventCode}`);
  return parts.join(' ');
}

/**
 * Ops alert payload (Phil's own Telegram). Same canonical shape — full telegram
 * version with an explicit ops marker so Phil can distinguish at a glance.
 */
function composeOps({ name, firstName, phone, ackUrl, mapsLink, coords, triggeredAt, eventCode, event }) {
  const eventTypeUpper = String(event.type || 'sos').toUpperCase();
  const tg = composeTelegram({ name, firstName, phone, ackUrl, mapsLink, coords, triggeredAt, eventCode });
  // Prepend an ops marker line so the message is immediately distinguishable
  // from a trusted-contact alert (Phil receives both paths for SOS events).
  return `[ OPS ALERT — ${eventTypeUpper} ]\n${tg}\n\nEvent UUID: ${event.id || 'unknown'}`;
}

export const __testing = {
  BANNED_PHRASES,
  formatTriggeredAt,
  buildMapsLink,
  displayPhone,
  composeTelegram,
  composeSms,
  composeOps,
};
