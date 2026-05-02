/**
 * Ack-token signing utilities.
 *
 * The dispatcher embeds an ACK URL in every off-app safety alert (SMS, WhatsApp,
 * email, voice prompt). Backups click/dial it to acknowledge → /api/safety/ack/[id]
 * verifies the HMAC and marks the safety_delivery_log row acked.
 *
 *   sign(deliveryId, userId)        → "<deliveryId>:<userId>:<hex-hmac>"
 *   verify(deliveryId, userId, tok) → boolean (constant-time)
 *
 * Secret comes from SAFETY_ACK_SECRET. The implementation is Node's standard
 * `crypto`; no external deps. Constant-time comparison prevents timing leaks.
 */
import crypto from 'node:crypto';

const ALG = 'sha256';

function getSecret() {
  const s = process.env.SAFETY_ACK_SECRET;
  if (!s || s.length < 16) return null;
  return s;
}

function payload(deliveryId, userId) {
  return `${deliveryId}:${userId}`;
}

export function signAckToken(deliveryId, userId) {
  const secret = getSecret();
  if (!secret) return null;
  const h = crypto.createHmac(ALG, secret);
  h.update(payload(deliveryId, userId));
  return h.digest('hex');
}

export function verifyAckToken(deliveryId, userId, providedHex) {
  if (!providedHex || typeof providedHex !== 'string') return false;
  const secret = getSecret();
  if (!secret) return false;
  const expectedHex = signAckToken(deliveryId, userId);
  if (!expectedHex) return false;
  // Hex strings of equal length → safe to constant-time compare as buffers.
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

export function buildAckUrl(deliveryId, userId, baseUrl) {
  const tok = signAckToken(deliveryId, userId);
  if (!tok) return null;
  const root = baseUrl
    || process.env.PUBLIC_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || 'https://hotmessldn.com';
  return `${root.replace(/\/$/, '')}/api/safety/ack/${encodeURIComponent(deliveryId)}?token=${tok}`;
}
