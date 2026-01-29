export type Photo = {
  url: string;
  isPrimary: boolean;
};

export type ProductPreview = {
  id?: string;
  handle?: string;
  imageUrl: string;
};

/**
 * Match breakdown showing individual scoring dimensions
 */
export type MatchBreakdown = {
  travelTime: number;    // 0-20 points
  roleCompat: number;    // 0-15 points
  kinkOverlap: number;   // 0-15 points
  intent: number;        // 0-12 points
  semantic: number;      // 0-12 points
  lifestyle: number;     // 0-10 points
  activity: number;      // 0-8 points
  completeness: number;  // 0-8 points
};

export type Profile = {
  id: string;
  // Optional rich fields used by host pages + smart CTAs.
  email?: string;
  authUserId?: string;
  profileType?: string;
  city?: string;
  bio?: string;
  sellerTagline?: string;
  hasProducts?: boolean;
  productPreviews?: ProductPreview[];
  tags?: string[];

  profileName: string;
  title: string;
  locationLabel: string;
  geoLat: number;
  geoLng: number;
  photos: Photo[];

  // Match probability fields (populated by /api/match-probability)
  matchProbability?: number;       // 0-100 percentage
  matchBreakdown?: MatchBreakdown;
  travelTimeMinutes?: number;
};

/**
 * Sort options for profile discovery
 */
export type SortOption = 'match' | 'distance' | 'lastActive' | 'newest';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'match', label: 'Best Match' },
  { value: 'distance', label: 'Distance' },
  { value: 'lastActive', label: 'Recently Active' },
  { value: 'newest', label: 'Newest' },
];

export type MatchProfilesResponse = {
  items: Profile[];
  nextCursor: string | null;
  scoringVersion: string;
};

export type ProfilesResponse = {
  items: Profile[];
  nextCursor: string | null;
};

export type ViewerLocationResponse = {
  geoLat: number;
  geoLng: number;
};

export type TravelTimeModeResult = {
  durationSeconds: number;
  label: string;
};

export type TravelTimeResponse = {
  walking: TravelTimeModeResult | null;
  driving: TravelTimeModeResult | null;
  bicycling: TravelTimeModeResult | null;
  uber: TravelTimeModeResult | null;
  fastest: TravelTimeModeResult | null;
};
