import crypto from 'node:crypto';

const base64urlEncode = (value) => {
  const buf = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const base64urlDecode = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return Buffer.from('');

  const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  return Buffer.from(padded, 'base64');
};

const timingSafeEqual = (a, b) => {
  const aa = Buffer.isBuffer(a) ? a : Buffer.from(String(a));
  const bb = Buffer.isBuffer(b) ? b : Buffer.from(String(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
};

export const signTicket = ({ secret, payload }) => {
  const header = 'hm1';
  const payloadJson = JSON.stringify(payload || {});
  const payloadB64 = base64urlEncode(payloadJson);

  const signingInput = `${header}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', String(secret)).update(signingInput).digest();
  const sigB64 = base64urlEncode(sig);

  return `${header}.${payloadB64}.${sigB64}`;
};

export const verifyTicket = ({ secret, token, nowSeconds = Math.floor(Date.now() / 1000) }) => {
  const raw = String(token || '').trim();
  const parts = raw.split('.');
  if (parts.length !== 3) return { ok: false, error: 'Invalid ticket format' };

  const [header, payloadB64, sigB64] = parts;
  if (header !== 'hm1') return { ok: false, error: 'Unsupported ticket version' };

  const signingInput = `${header}.${payloadB64}`;
  const expectedSig = crypto.createHmac('sha256', String(secret)).update(signingInput).digest();
  const providedSig = base64urlDecode(sigB64);

  if (!timingSafeEqual(expectedSig, providedSig)) {
    return { ok: false, error: 'Invalid ticket signature' };
  }

  let payload = null;
  try {
    const json = base64urlDecode(payloadB64).toString('utf8');
    payload = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Invalid ticket payload' };
  }

  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Invalid ticket payload' };
  }

  const iat = Number(payload.iat);
  const exp = Number(payload.exp);
  if (!Number.isFinite(iat) || !Number.isFinite(exp)) {
    return { ok: false, error: 'Missing ticket timestamps' };
  }

  // Allow small clock skew.
  if (iat > nowSeconds + 120) {
    return { ok: false, error: 'Ticket not yet valid' };
  }

  if (exp < nowSeconds - 60) {
    return { ok: false, error: 'Ticket expired' };
  }

  return { ok: true, payload };
};

export const randomNonce = (bytes = 8) => {
  return base64urlEncode(crypto.randomBytes(bytes));
};
