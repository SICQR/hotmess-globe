/**
 * Beacon Identity System — glyph source-of-truth.
 *
 * The 9 hero glyphs below are lifted byte-for-byte from
 * `Beacon Identity System.html` (ROW HERO, 130px identity-scale variant).
 * They use `viewBox="-32 -32 64 64"` and `currentColor` so the consumer can
 * drive the ring colour via CSS `color` / canvas `fillStyle`.
 *
 * Do NOT swap in the map-row (44px) variants — those have thinner strokes
 * and lose definition at hero size.
 */

export type BeaconCategory =
  | 'gym'
  | 'club'
  | 'sauna'
  | 'leather'
  | 'cafe'
  | 'clinic'
  | 'aftercare'
  | 'cruising'
  | 'market';

/** 'care' applies to clinic + aftercare → white ring per identity spec. */
export type BeaconState = 'venue' | 'care';

export interface BeaconGlyph {
  category: BeaconCategory;
  /** Display label, e.g. 'GYMS'. */
  label: string;
  /** Motion word from the HTML hover-label, e.g. 'HEARTBEAT'. */
  motion: string;
  state: BeaconState;
  /**
   * Inline SVG markup using `viewBox="-32 -32 64 64"` and `currentColor`
   * strokes/fills, matching the .beacon.hero variant from the base identity.
   */
  svg: string;
}

const GYM_SVG =
  '<svg viewBox="-32 -32 64 64" width="64" height="64">' +
    '<g stroke="currentColor" stroke-width="3.5" stroke-linecap="round" fill="none">' +
      '<line x1="-14" y1="0" x2="14" y2="0"/>' +
      '<line x1="-18" y1="-8" x2="-18" y2="8"/>' +
      '<line x1="18"  y1="-8" x2="18"  y2="8"/>' +
      '<line x1="-22" y1="-4" x2="-22" y2="4"/>' +
      '<line x1="22"  y1="-4" x2="22"  y2="4"/>' +
    '</g>' +
  '</svg>';

const CLUB_SVG =
  '<svg viewBox="-32 -32 64 64" width="64" height="64">' +
    '<circle cx="0" cy="0" r="4" fill="currentColor"/>' +
    '<circle cx="0" cy="0" r="10" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<circle cx="0" cy="0" r="18" stroke="currentColor" stroke-width="1.6" fill="none" opacity="0.6"/>' +
    '<circle cx="0" cy="0" r="26" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.32"/>' +
  '</svg>';

const SAUNA_SVG =
  '<svg viewBox="-32 -32 64 64" width="64" height="64">' +
    '<g stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none">' +
      '<path d="M -12,8 Q -8,0 -12,-8 Q -16,-16 -12,-20"/>' +
      '<path d="M 0,10 Q 4,0 0,-10 Q -4,-20 0,-24"/>' +
      '<path d="M 12,8 Q 16,0 12,-8 Q 8,-16 12,-20"/>' +
    '</g>' +
  '</svg>';

const LEATHER_SVG =
  '<svg viewBox="-32 -32 64 64" width="64" height="64">' +
    '<g stroke="currentColor" stroke-width="3" fill="none">' +
      '<rect x="-18" y="-8" width="20" height="14" rx="7"/>' +
      '<rect x="-2"  y="-8" width="20" height="14" rx="7"/>' +
    '</g>' +
  '</svg>';

const CAFE_SVG =
  '<svg viewBox="-32 -32 64 64" width="64" height="64">' +
    '<g stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none">' +
      '<path d="M -14,-8 L -14,8 Q -14,16 -6,16 L 6,16 Q 14,16 14,8 L 14,-8 Z"/>' +
      '<path d="M 14,-2 Q 22,-2 22,4 Q 22,10 14,10"/>' +
    '</g>' +
  '</svg>';

const CLINIC_SVG =
  '<svg viewBox="-32 -32 64 64" width="64" height="64">' +
    '<g fill="currentColor">' +
      '<rect x="-5"  y="-20" width="10" height="40" rx="2"/>' +
      '<rect x="-20" y="-5"  width="40" height="10" rx="2"/>' +
    '</g>' +
  '</svg>';

const AFTERCARE_SVG =
  '<svg viewBox="-32 -32 64 64" width="64" height="64">' +
    '<circle cx="0" cy="0" r="18" stroke="currentColor" stroke-width="3" fill="none"/>' +
    '<circle cx="0" cy="-18" r="2.6" fill="currentColor"/>' +
  '</svg>';

const CRUISING_SVG =
  '<svg viewBox="-32 -32 64 64" width="64" height="64">' +
    '<circle cx="0" cy="0" r="3" fill="currentColor"/>' +
    '<path d="M 0,0 L 22,-4 A 22,22 0 0 1 22,4 Z" fill="currentColor" opacity="0.55"/>' +
    '<circle cx="0" cy="0" r="10" stroke="currentColor" stroke-width="1.8" fill="none" opacity="0.7"/>' +
    '<circle cx="0" cy="0" r="18" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.4"/>' +
  '</svg>';

const MARKET_SVG =
  '<svg viewBox="-32 -32 64 64" width="64" height="64">' +
    '<g stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M -16,-8 L -14,18 L 14,18 L 16,-8 Z"/>' +
      '<path d="M -8,-8 Q -8,-18 0,-18 Q 8,-18 8,-8"/>' +
    '</g>' +
  '</svg>';

export const BEACON_GLYPHS: Record<BeaconCategory, BeaconGlyph> = {
  gym:       { category: 'gym',       label: 'GYMS',      motion: 'HEARTBEAT', state: 'venue', svg: GYM_SVG },
  club:      { category: 'club',      label: 'CLUBS',     motion: 'BLOOM',     state: 'venue', svg: CLUB_SVG },
  sauna:     { category: 'sauna',     label: 'SAUNAS',    motion: 'DRIFT',     state: 'venue', svg: SAUNA_SVG },
  leather:   { category: 'leather',   label: 'LEATHER',   motion: 'STABLE',    state: 'venue', svg: LEATHER_SVG },
  cafe:      { category: 'cafe',      label: 'CAFÉS',     motion: 'SHIMMER',   state: 'venue', svg: CAFE_SVG },
  clinic:    { category: 'clinic',    label: 'CLINICS',   motion: 'BREATHE',   state: 'care',  svg: CLINIC_SVG },
  aftercare: { category: 'aftercare', label: 'AFTERCARE', motion: 'REST',      state: 'care',  svg: AFTERCARE_SVG },
  cruising:  { category: 'cruising',  label: 'CRUISING',  motion: 'SCAN',      state: 'venue', svg: CRUISING_SVG },
  market:    { category: 'market',    label: 'MARKET',    motion: 'GLOSS',     state: 'venue', svg: MARKET_SVG },
};

/**
 * Resolve free-form legacy `beacon_category` strings to a `BeaconCategory`.
 * Returns `null` when unknown so the caller can fall back to the gold default.
 *
 * Lenient mapping:
 *   gym/gyms/fitness                       → gym
 *   club/clubs/nightclub                   → club
 *   sauna/saunas/bathhouse                 → sauna
 *   leather/fetish                         → leather
 *   cafe/café/cafes/coffee                 → cafe
 *   clinic/clinics/sexual_health/health    → clinic
 *   aftercare/care/recovery                → aftercare
 *   cruising/cruise                        → cruising
 *   market/shop/retail                     → market
 */
export function resolveBeaconCategory(input?: string | null): BeaconCategory | null {
  if (input == null) return null;

  // Normalise: lowercase, strip diacritics, collapse separators.
  const normalised = input
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s\-]+/g, '_');

  if (!normalised) return null;

  switch (normalised) {
    case 'gym':
    case 'gyms':
    case 'fitness':
      return 'gym';

    case 'club':
    case 'clubs':
    case 'nightclub':
      return 'club';

    case 'sauna':
    case 'saunas':
    case 'bathhouse':
      return 'sauna';

    case 'leather':
    case 'fetish':
      return 'leather';

    case 'cafe':
    case 'cafes':
    case 'coffee':
      return 'cafe';

    case 'clinic':
    case 'clinics':
    case 'sexual_health':
    case 'health':
      return 'clinic';

    case 'aftercare':
    case 'care':
    case 'recovery':
      return 'aftercare';

    case 'cruising':
    case 'cruise':
      return 'cruising';

    case 'market':
    case 'shop':
    case 'retail':
      return 'market';

    default:
      return null;
  }
}
