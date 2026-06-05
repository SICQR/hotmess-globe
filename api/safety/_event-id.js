/**
 * D58 — SOS Event ID generator.
 *
 * Format: HM-SOS-{YYYYMMDD}-{4-char base32}
 * Example: HM-SOS-20260604-AB12
 *
 * The 4-char tail is derived deterministically from the safety_events.id (uuid)
 * so the same event always produces the same code regardless of which dispatcher
 * path computed it. This is the unification rule from D58 Amendment 2 + 9:
 * every channel emitted for the same SOS event MUST surface the same event_code.
 *
 * Crockford base32 alphabet (excludes I, L, O, U for ambiguity) — easier to
 * dictate over the phone if a contact calls support.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32

/**
 * Derive a stable 4-char tag from a uuid by xor-folding the hex into 20 bits.
 * Deterministic — same uuid always yields the same tag.
 */
function tagFromUuid(uuid) {
  if (!uuid || typeof uuid !== 'string') return 'XXXX';
  const hex = uuid.replace(/-/g, '').toLowerCase();
  // Take first 16 hex chars as a 64-bit integer (BigInt for safety) and reduce.
  let n = 0n;
  for (let i = 0; i < Math.min(16, hex.length); i++) {
    const v = parseInt(hex[i], 16);
    if (Number.isNaN(v)) continue;
    n = (n << 4n) | BigInt(v);
  }
  // Fold to 20 bits (4 base32 chars × 5 bits = 20 bits)
  const mask = (1n << 20n) - 1n;
  const folded = (n ^ (n >> 20n) ^ (n >> 40n)) & mask;
  let out = '';
  let x = folded;
  for (let i = 0; i < 4; i++) {
    out = ALPHABET[Number(x & 31n)] + out;
    x = x >> 5n;
  }
  return out;
}

function yyyymmdd(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * formatEventCode({ createdAt, eventId }) → "HM-SOS-20260604-AB12"
 *
 * @param {Object} opts
 * @param {string|Date} opts.createdAt — safety_events.created_at (ISO string or Date)
 * @param {string} opts.eventId — safety_events.id (uuid)
 * @returns {string}
 */
export function formatEventCode({ createdAt, eventId }) {
  const day = yyyymmdd(createdAt || new Date());
  const tag = tagFromUuid(eventId);
  return `HM-SOS-${day}-${tag}`;
}

export const __testing = { tagFromUuid, yyyymmdd };
