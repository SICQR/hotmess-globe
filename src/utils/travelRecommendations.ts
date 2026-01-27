export type TravelModeKey = 'foot' | 'cab' | 'bike' | 'uber' | 'lyft' | 'transit';

export type TravelRecContext = {
  viewerText?: string;
  targetText?: string;
  seconds?: Partial<Record<TravelModeKey, number | null | undefined>>;
};

/**
 * Mode display configuration
 */
export const TRAVEL_MODE_CONFIG: Record<TravelModeKey, { label: string; icon: string; color: string }> = {
  foot: { label: 'Walk', icon: '🚶', color: '#39FF14' },
  bike: { label: 'Bike', icon: '🚴', color: '#00D9FF' },
  cab: { label: 'Cab', icon: '🚕', color: '#FFEB3B' },
  uber: { label: 'Uber', icon: '📱', color: '#000000' },
  lyft: { label: 'Lyft', icon: '🚗', color: '#FF00BF' },
  transit: { label: 'Transit', icon: '🚇', color: '#3B82F6' },
};

const tokenize = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const buildText = ({ tags, bio, title, tagline }: { tags?: unknown; bio?: unknown; title?: unknown; tagline?: unknown }) => {
  const tagText = Array.isArray(tags) ? tags.map((t) => String(t)).join(' ') : String(tags || '');
  return [tagText, bio, title, tagline].filter(Boolean).join(' ');
};

export const buildProfileRecText = (profile: any) => {
  if (!profile || typeof profile !== 'object') return '';
  return buildText({
    tags: profile.tags || profile.user_tags || profile.interests,
    bio: profile.bio || profile.about || profile.profile_bio,
    title: profile.title || profile.profileName || profile.full_name,
    tagline: profile.sellerTagline || profile.seller_tagline,
  });
};

const hasAny = (tokens: string[], words: string[]) => words.some((w) => tokens.includes(w));

const scoreFromEta = (seconds: number | null | undefined) => {
  if (!Number.isFinite(seconds)) return 0;
  const mins = Math.max(1, Math.round(Number(seconds) / 60));
  // Lower minutes -> higher score.
  return Math.max(0, 60 - mins);
};

export const recommendTravelModes = ({ viewerText, targetText, seconds }: TravelRecContext) => {
  const txt = `${viewerText || ''} ${targetText || ''}`.trim();
  const tokens = tokenize(txt);

  const sFoot = seconds?.foot;
  const sCab = seconds?.cab;
  const sBike = seconds?.bike;
  const sUber = seconds?.uber;
  const sLyft = seconds?.lyft;
  const sTransit = seconds?.transit;

  // Base: start from ETA (fastest tends to win).
  const scores: Record<TravelModeKey, number> = {
    foot: scoreFromEta(sFoot),
    cab: scoreFromEta(sCab),
    bike: scoreFromEta(sBike),
    uber: scoreFromEta(sUber ?? sCab),
    lyft: scoreFromEta(sLyft ?? sCab), // Lyft uses same ETA as cab if not provided
    transit: scoreFromEta(sTransit),
  };

  // Content-driven nudges (lightweight + explainable).
  const safetyWords = ['safe', 'safely', 'care', 'aftercare', 'late', 'night', 'club', 'party', 'drink', 'drinks'];
  const bikeWords = ['bike', 'bikes', 'cycle', 'cycling', 'bicycle', 'bicycling', 'eco', 'green'];
  const walkWords = ['walk', 'walking', 'near', 'nearby', 'local', 'stroll'];
  const transitWords = ['metro', 'subway', 'train', 'bus', 'transit', 'public', 'commute'];
  const ecoWords = ['eco', 'green', 'sustainable', 'environment', 'carbon'];

  if (hasAny(tokens, safetyWords)) {
    scores.uber += 12;
    scores.lyft += 12;
    scores.cab += 8;
  }

  if (hasAny(tokens, bikeWords)) {
    scores.bike += 10;
  }

  if (hasAny(tokens, walkWords)) {
    scores.foot += 8;
  }

  if (hasAny(tokens, transitWords)) {
    scores.transit += 10;
  }

  if (hasAny(tokens, ecoWords)) {
    scores.transit += 6;
    scores.bike += 6;
    scores.foot += 4;
  }

  // Guardrails so we don't recommend unrealistic modes.
  const footMins = Number.isFinite(sFoot) ? Math.max(1, Math.round(Number(sFoot) / 60)) : null;
  const bikeMins = Number.isFinite(sBike) ? Math.max(1, Math.round(Number(sBike) / 60)) : null;
  const transitMins = Number.isFinite(sTransit) ? Math.max(1, Math.round(Number(sTransit) / 60)) : null;

  if (footMins !== null && footMins > 25) scores.foot -= 25;
  if (bikeMins !== null && bikeMins > 35) scores.bike -= 20;
  if (transitMins !== null && transitMins > 60) scores.transit -= 15;

  // If transit time not provided, give it a lower base score
  if (!Number.isFinite(sTransit)) {
    scores.transit = Math.max(0, scores.transit - 20);
  }

  const order = (Object.keys(scores) as TravelModeKey[])
    .sort((a, b) => scores[b] - scores[a]);

  return { order, scores };
};

/**
 * Get the top N recommended modes, filtering out unavailable ones
 */
export const getTopModes = (
  recommendations: ReturnType<typeof recommendTravelModes>,
  availableModes: TravelModeKey[] = ['foot', 'bike', 'cab', 'uber'],
  count: number = 4
): TravelModeKey[] => {
  return recommendations.order
    .filter(mode => availableModes.includes(mode))
    .slice(0, count);
};
