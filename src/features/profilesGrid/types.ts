export type Photo = {
  url: string;
  isPrimary?: boolean;
  /** Legacy field from some API responses */
  file_url?: string;
};

export type ProductPreview = {
  id?: string;
  handle?: string;
  imageUrl: string;
};

/**
 * Image object from legacy API formats
 */
export type ImageObject = {
  url?: string;
  src?: string;
  file_url?: string;
};

/**
 * Match score breakdown showing individual scoring dimensions.
 * Each dimension contributes to the overall matchProbability.
 */
export type MatchBreakdown = {
  /** Travel time score (0-20): Based on real-world travel duration */
  travelTime: number;
  /** Role compatibility score (0-15): Position/role alignment */
  roleCompat: number;
  /** Kink overlap score (0-15): Shared interests minus conflicts */
  kinkOverlap: number;
  /** Intent alignment score (0-12): Looking for + relationship status */
  intent: number;
  /** Semantic text score (0-12): Bio, turn-ons/turn-offs similarity */
  semantic: number;
  /** Lifestyle match score (0-10): Smoking, drinking, fitness, diet */
  lifestyle: number;
  /** Activity recency score (0-8): How recently active */
  activity: number;
  /** Profile completeness score (0-8): Presence of key fields */
  completeness: number;
  /** Optional chem-friendly score (0-3): Only if both users opted in */
  chem?: number;
};

/**
 * Profile type constants
 */
export type ProfileType = 'standard' | 'seller' | 'creator' | 'organizer' | 'premium';

/**
 * Profile kind for personas/secondary profiles
 */
export type ProfileKind = 'MAIN' | 'SECONDARY';

/**
 * Persona type keys for secondary profiles
 */
export type PersonaTypeKey = 'TRAVEL' | 'WEEKEND' | string;

/**
 * Comprehensive Profile interface
 * Eliminates need for (as any) type assertions in ProfileCard.tsx
 */
export type Profile = {
  id: string;
  
  // Core identity
  email?: string;
  authUserId?: string;
  profileName: string;
  title: string;
  
  // Display name variants (privacy-aware)
  username?: string;
  handle?: string;
  full_name?: string;
  display_name?: string;
  
  // Profile type and classification
  profileType?: ProfileType | string;
  
  // Location
  city?: string;
  locationLabel: string;
  geoLat: number;
  geoLng: number;
  
  // Bio and content
  bio?: string;
  sellerTagline?: string;
  tags?: string[];
  
  // Photos - multiple formats for backwards compatibility
  photos: Photo[];
  /** Legacy avatar URL field */
  avatar_url?: string;
  /** Alternative avatar URL casing */
  avatarUrl?: string;
  /** Legacy photo URLs array */
  photo_urls?: string[];
  /** Legacy images array */
  images?: (string | ImageObject)[];
  
  // Products (for seller profiles)
  hasProducts?: boolean;
  productPreviews?: ProductPreview[];

  // Match probability fields (from /api/match-probability)
  /** Overall match probability score (0-100) */
  matchProbability?: number;
  /** Detailed breakdown of match score components */
  matchBreakdown?: MatchBreakdown;
  /** Estimated travel time in minutes */
  travelTimeMinutes?: number;
  /** Distance in kilometers */
  distanceKm?: number;
  
  // Preferences
  /** User's looking for preferences */
  lookingFor?: string[];
  
  // Activity and status
  /** Last seen timestamp (ISO string) */
  lastSeen?: string;
  /** Alternative last_seen casing */
  last_seen?: string;
  /** Whether user is verified */
  verified?: boolean;
  /** Whether user is looking right now */
  lookingRightNow?: boolean;
  /** Right now status active (alternative field) */
  rightNow?: boolean;
  /** Alternative right_now_active field */
  right_now_active?: boolean;
  /** Online status */
  onlineNow?: boolean;
  /** Alternative online_now casing */
  online_now?: boolean;
  /** User's age */
  age?: number;
  
  // Social proof / engagement metrics
  /** Profile view count */
  profile_views_count?: number;
  /** Alternative viewCount casing */
  viewCount?: number;
  /** Messages received count */
  messages_received_count?: number;
  
  // Secondary profile / Persona fields
  /** Whether this is a secondary/persona profile */
  isSecondaryProfile?: boolean;
  /** Profile kind (MAIN or SECONDARY) */
  profile_kind?: ProfileKind;
  /** Persona type key (TRAVEL, WEEKEND, etc.) */
  profile_type_key?: PersonaTypeKey;
  /** Display label for persona type */
  profile_type_label?: string;
};

export type ProfilesResponse = {
  items: Profile[];
  nextCursor: string | null;
};

export type MatchProbabilityResponse = {
  items: Profile[];
  nextCursor: string | null;
  total: number;
  scoringVersion: string;
  sortedBy: 'match' | 'distance' | 'lastActive' | 'newest';
};

export type SortOption = 'match' | 'distance' | 'lastActive' | 'newest';

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
  transit: TravelTimeModeResult | null;
  uber: TravelTimeModeResult | null;
  lyft: TravelTimeModeResult | null;
  fastest: TravelTimeModeResult | null;
};
