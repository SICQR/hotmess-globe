import crypto from 'node:crypto';

const base64UrlEncode = (buffer) =>
  Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

export const createCodeVerifier = () => {
  // RFC 7636: 43-128 chars. 32 random bytes -> 43 chars base64url.
  return base64UrlEncode(crypto.randomBytes(32));
};

export const createState = () => base64UrlEncode(crypto.randomBytes(16));

export const createCodeChallenge = (codeVerifier) => {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return base64UrlEncode(hash);
};
