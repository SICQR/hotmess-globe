/**
 * Acceptance-token signing utilities (D59 S1).
 *
 * When a HOTMESS user nominates someone as a trusted contact, the dispatcher
 * sends an invitation containing a link back to /contact/accept/{tc_id}.
 * The recipient is anonymous — they do NOT need a HOTMESS account to accept
 * (locked by SAFETY_CONSTITUTION § Account-free acceptance).
 *
 * The link carries a token + expiry. Server-side verify checks both:
 *   - now() < expiresAt
 *   - HMAC(tcId + userId + expiresAtIso) === providedToken
 *
 * Token expires 30 days after issue. If unused, the nominator can resend
 * the invitation which generates a fresh token.
 *
 *   signAcceptanceToken(trustedContactId, userId, expiresAtIso) → hex
 *   verifyAcceptanceToken(tcId, userId, expIso, providedHex)    → boolean
 *   buildAcceptanceUrl(tcId, userId, baseUrl?, ttlDays?)         → { url, token, expiresAt }
 *
 * Secret comes from SAFETY_ACCEPT_SECRET (separate from ack secret so a
 * compromise of one doesn't pivot the other). Falls back to SAFETY_ACK_SECRET
 * if the dedicated env var isn't set, but logs a warning at boot.
 */
import crypto from 'node:crypto';

const ALG = 'sha256';
const DEFAULT_TTL_DAYS = 30;

function getSecret() {
  const dedicated = process.env.SAFETY_ACCEPT_SECRET;
  if (dedicated && dedicated.length >= 16) return dedicated;
  // Fallback so existing prod doesn't break on day one. Operators should
  // set SAFETY_ACCEPT_SECRET as soon as practical.
  const fallback = process.env.SAFETY_ACK_SECRET;
  if (fallback && fallback.length >= 16) return fallback;
  return null;
}

function payload(trustedContactId, userId, expiresAtIso) {
  return `${trustedContactId}:${userId}:${expiresAtIso}`;
}

export function signAcceptanceToken(trustedContactId, userId, expiresAtIso) {
  const secret = getSecret();
  if (!secret) return null;
  const h = crypto.createHmac(ALG, secret);
  h.update(payload(trustedContactId, userId, expiresAtIso));
  return h.digest('hex');
}

export function verifyAcceptanceToken(trustedContactId, userId, expiresAtIso, providedHex) {
  if (!providedHex || typeof providedHex !== 'string') return false;
  if (!expiresAtIso) return false;
  // Reject expired tokens before doing any crypto work — saves CPU on stale links.
  const exp = Date.parse(expiresAtIso);
  if (Number.isNaN(exp) || exp < Date.now()) return false;
  const secret = getSecret();
  if (!secret) return false;
  const expectedHex = signAcceptanceToken(trustedContactId, userId, expiresAtIso);
  if (!expectedHex) return false;
  if (expectedHex.length !== providedHex.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedHex, 'hex'),
      Buffer.from(providedHex, 'hex'),
    );
  } catch {
    return false;
  }
}

export function buildAcceptanceUrl(trustedContactId, userId, baseUrl, ttlDays) {
  const ttl = Number.isFinite(ttlDays) && ttlDays > 0 ? ttlDays : DEFAULT_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000);
  const expiresAtIso = expiresAt.toISOString();
  const token = signAcceptanceToken(trustedContactId, userId, expiresAtIso);
  if (!token) return null;
  const root = baseUrl
    || process.env.PUBLIC_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || 'https://hotmessldn.com';
  const url = `${root.replace(/\/$/, '')}/contact/accept/${encodeURIComponent(trustedContactId)}?token=${token}&exp=${encodeURIComponent(expiresAtIso)}`;
  return { url, token, expiresAt: expiresAtIso };
}

export const __testing = {
  payload,
  getSecret,
};
