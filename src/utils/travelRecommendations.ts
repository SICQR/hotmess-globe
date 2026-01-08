export type TravelModeKey = 'foot' | 'cab' | 'bike' | 'uber';

export type TravelRecContext = {
  viewerText?: string;
  targetText?: string;
  seconds?: Partial<Record<TravelModeKey, number | null | undefined>>;
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

  // Base: start from ETA (fastest tends to win).
  const scores: Record<TravelModeKey, number> = {
    foot: scoreFromEta(sFoot),
    cab: scoreFromEta(sCab),
    bike: scoreFromEta(sBike),
    uber: scoreFromEta(sUber ?? sCab),
  };

  // Content-driven nudges (lightweight + explainable).
  const safetyWords = ['safe', 'safely', 'care', 'aftercare', 'late', 'night', 'club', 'party', 'drink', 'drinks'];
  const bikeWords = ['bike', 'bikes', 'cycle', 'cycling', 'bicycle', 'bicycling', 'eco', 'green'];
  const walkWords = ['walk', 'walking', 'near', 'nearby', 'local', 'stroll'];

  if (hasAny(tokens, safetyWords)) {
    scores.uber += 12;
    scores.cab += 8;
  }

  if (hasAny(tokens, bikeWords)) {
    scores.bike += 10;
  }

  if (hasAny(tokens, walkWords)) {
    scores.foot += 8;
  }

  // Guardrails so we don't recommend unrealistic modes.
  const footMins = Number.isFinite(sFoot) ? Math.max(1, Math.round(Number(sFoot) / 60)) : null;
  const bikeMins = Number.isFinite(sBike) ? Math.max(1, Math.round(Number(sBike) / 60)) : null;

  if (footMins !== null && footMins > 25) scores.foot -= 25;
  if (bikeMins !== null && bikeMins > 35) scores.bike -= 20;

  const order = (Object.keys(scores) as TravelModeKey[])
    .sort((a, b) => scores[b] - scores[a]);

  return { order, scores };
};
