import type { Profile } from './types';

const normalizeText = (value: unknown) => String(value || '').trim();

const toOneLine = (value: string) => value.replace(/\s+/g, ' ').trim();

const shorten = (value: string, max = 80) => {
  const text = toOneLine(value);
  if (!text) return '';
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
};

const uniq = (values: string[], max: number) => {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of values) {
    const value = normalizeText(raw);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }

  return out;
};

export const getProfileHeadline = (profile: Profile) => {
  const sellerTagline = normalizeText((profile as any)?.sellerTagline);
  const title = normalizeText(profile?.title);
  const bio = normalizeText((profile as any)?.bio);

  if (sellerTagline) return shorten(sellerTagline);

  // Title from `/api/profiles` is often a bio-derived headline already.
  if (title && title.toLowerCase() !== 'member') return shorten(title);

  if (bio) return shorten(bio);

  return title || 'Member';
};

export const getProfileChips = (profile: Profile, max = 3) => {
  const tags = Array.isArray((profile as any)?.tags) ? (profile as any).tags : [];
  const preferredVibes = Array.isArray((profile as any)?.preferredVibes)
    ? (profile as any).preferredVibes
    : [];

  // Keep the chip row compact; these render on the default (collapsed) card.
  return uniq(
    [...preferredVibes.map((t: any) => String(t)), ...tags.map((t: any) => String(t))],
    Math.max(0, Math.trunc(max))
  );
};

export const getProfileStatusLine = (profile: Profile) => {
  // Back-compat for local-only Connect fields.
  const onlineNow = (profile as any)?.onlineNow === true;
  const rightNow = (profile as any)?.rightNow === true;
  if (rightNow) return 'Right now';
  if (onlineNow) return 'Online now';

  const availabilityRaw = normalizeText((profile as any)?.availabilityStatus);
  const activityRaw = normalizeText((profile as any)?.activityStatus);

  const availability = availabilityRaw.toLowerCase();
  const activity = activityRaw.toLowerCase();

  if (availability === 'right_now' || availability === 'available_now' || availability === 'available') {
    return 'Right now';
  }

  if (activity === 'online') return 'Online now';
  if (activity === 'at_event') return 'At an event';

  // Avoid showing negative/ambiguous statuses by default.
  return null;
};
