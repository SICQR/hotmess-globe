import { getEnv } from '../shopify/_utils.js';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export const getMusicUploadEmailAllowlist = () => {
  const raw = getEnv('MUSIC_UPLOAD_EMAILS', [
    // Optional server-side fallbacks
    'MUSIC_OWNER_EMAILS',
    'OWNER_EMAIL',
    // Local dev convenience (avoid using these in prod)
    'VITE_MUSIC_UPLOAD_EMAILS',
    'VITE_OWNER_EMAIL',
  ]);

  if (!raw) return [];

  return String(raw)
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
};

// Returns:
// - true/false when an allowlist is configured
// - null when not configured
export const isMusicUploadAllowlisted = (email) => {
  const allowlist = getMusicUploadEmailAllowlist();
  if (!allowlist.length) return null;
  return allowlist.includes(normalizeEmail(email));
};
