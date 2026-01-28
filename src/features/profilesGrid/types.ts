export type Photo = {
  url: string;
  isPrimary: boolean;
};

export type ProductPreview = {
  id?: string;
  handle?: string;
  imageUrl: string;
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
  
  // Engagement metrics for social proof
  engagementMetrics?: {
    profileViews24h?: number;
    profileViewsWeek?: number;
    totalLikes?: number;
    totalFollowers?: number;
    lastActiveMinutes?: number;
  };

  profileName: string;
  title: string;
  locationLabel: string;
  geoLat: number;
  geoLng: number;
  photos: Photo[];
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
