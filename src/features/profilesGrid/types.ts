export type Photo = {
  url: string;
  isPrimary: boolean;
};

export type ProductPreview = {
  id?: string;
  handle?: string;
  imageUrl: string;
};

export type MatchBreakdown = {
  travelTime: number;
  roleCompat: number;
  kinkOverlap: number;
  intent: number;
  semantic: number;
  lifestyle: number;
  activity: number;
  completeness: number;
  chem?: number;
};

export type Profile = {
  id: string;
  // Optional rich fields used by host pages + smart CTAs.
  email?: string;
  authUserId?: string;
  userId?: string;
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

  // Match probability fields (from /api/match-probability)
  matchProbability?: number;
  matchBreakdown?: MatchBreakdown;
  travelTimeMinutes?: number;
};

export type ProfilesResponse = {
  items: Profile[];
  nextCursor: string | null;
  scoringVersion?: string;
};

export type SortOption = 'match' | 'distance' | 'lastActive' | 'newest';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'match', label: 'Best Match' },
  { value: 'distance', label: 'Distance' },
  { value: 'lastActive', label: 'Recently Active' },
  { value: 'newest', label: 'Newest' },
];

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
