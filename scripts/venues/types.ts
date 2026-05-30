export interface OpeningHoursDay {
  open: string;  // "HH:MM"
  close: string; // "HH:MM"
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type OpeningHours = {
  [K in DayOfWeek]?: OpeningHoursDay[];
} & { notes?: string | null };

export type VerificationStatus = 'verified' | 'partial' | 'needs_manual_review';
export type VenueType = 'bar' | 'club' | 'sauna' | 'cafe' | 'event_space' | 'mixed';
export type PriceBand = '$' | '$$' | '$$$' | 'unknown';

export interface WorldVenue {
  id: string;
  name: string;
  city: string;
  country: string;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  instagram_url: string | null;
  google_maps_url: string | null;
  source_urls: string[];
  venue_type: VenueType;
  opening_hours: OpeningHours | null;
  vibe_tags: string[];
  price_band: PriceBand;
  description_short: string | null;
  description_long: string | null;
  phone: string | null;
  email: string | null;
  accessibility_notes: string | null;
  cashless_or_cash: string | null;
  last_verified_at: string;
  confidence_score: number;
  verification_status: VerificationStatus;
}

export interface WorldVenueEvent {
  id: string;
  venue_id: string;
  venue_name: string;
  city: string;
  title: string;
  start_datetime: string | null;
  end_datetime: string | null;
  event_url: string | null;
  ticket_url: string | null;
  promoter: string | null;
  description: string | null;
  tags: string[];
  source_url: string | null;
  last_verified_at: string;
  confidence_score: number;
}

export interface FailedRow {
  city: string;
  entity_type: string;
  entity_name: string;
  issue_type: string;
  reason: string;
  source_url: string;
  action_taken: string;
}
