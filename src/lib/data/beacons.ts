/**
 * Beacons Domain Layer
 * 
 * Centralizes all beacon/event/safety operations for the globe.
 * Handles event markers, safety alerts, and live hotspots.
 */

import { supabase } from '@/components/utils/supabaseClient';

export type BeaconType = 'event' | 'hotspot' | 'safety' | 'presence' | 'venue';

export interface Beacon {
  id: string;
  type: BeaconType;
  userId?: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  imageUrl?: string;
  startTime?: string;
  endTime?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface Event extends Beacon {
  type: 'event';
  venueName?: string;
  ticketUrl?: string;
  price?: number;
  capacity?: number;
  attendeeCount?: number;
  organizerId?: string;
  organizerName?: string;
}

export interface SafetyAlert extends Beacon {
  type: 'safety';
  severity: 'info' | 'warning' | 'danger';
  reportedBy?: string;
  verifiedBy?: string;
  resolved: boolean;
}

export interface BeaconFilters {
  types?: BeaconType[];
  nearLocation?: { lat: number; lng: number; radiusKm: number };
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// BEACONS (GENERIC)
// ============================================

/**
 * Get all beacons with optional filters
 */
export async function getBeacons(filters: BeaconFilters = {}): Promise<Beacon[]> {
  let query = supabase
    .from('beacons')
    .select('*')
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

  if (filters.types && filters.types.length > 0) {
    query = query.in('type', filters.types);
  }
  if (filters.startDate) {
    query = query.gte('starts_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('starts_at', filters.endDate);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[beacons] getBeacons error:', error.message);
    return [];
  }

  return (data || []).map(normalizeBeacon);
}

/**
 * Get beacon by ID
 */
export async function getBeaconById(id: string): Promise<Beacon | null> {
  const { data, error } = await supabase
    .from('beacons')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[beacons] getBeaconById error:', error.message);
    return null;
  }

  return normalizeBeacon(data);
}

// ============================================
// EVENTS
// ============================================

/**
 * Get events (beacons of type 'event')
 */
export async function getEvents(filters: Omit<BeaconFilters, 'types'> = {}): Promise<Event[]> {
  const beacons = await getBeacons({ ...filters, types: ['event'] });
  return beacons as Event[];
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(limit: number = 20): Promise<Event[]> {
  const { data, error } = await supabase
    .from('beacons')
    .select('*')
    .eq('type', 'event')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[beacons] getUpcomingEvents error:', error.message);
    return [];
  }

  return (data || []).map(normalizeBeacon) as Event[];
}

/**
 * Get events by organizer
 */
export async function getEventsByOrganizer(organizerId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('beacons')
    .select('*')
    .eq('type', 'event')
    .eq('owner_id', organizerId)
    .order('starts_at', { ascending: false });

  if (error) {
    console.error('[beacons] getEventsByOrganizer error:', error.message);
    return [];
  }

  return (data || []).map(normalizeBeacon) as Event[];
}

// ============================================
// SAFETY ALERTS
// ============================================

/**
 * Get active safety alerts
 */
export async function getSafetyAlerts(
  lat?: number, 
  lng?: number, 
  radiusKm: number = 50
): Promise<SafetyAlert[]> {
  const { data, error } = await supabase
    .from('beacons')
    .select('*')
    .eq('type', 'safety')
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[beacons] getSafetyAlerts error:', error.message);
    return [];
  }

  return (data || []).map(normalizeBeacon) as SafetyAlert[];
}

/**
 * Report a safety concern
 */
export async function reportSafetyConcern(
  title: string,
  lat: number,
  lng: number,
  options?: {
    description?: string;
    severity?: SafetyAlert['severity'];
  }
): Promise<SafetyAlert | null> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('beacons')
    .insert({
      type: 'safety',
      lat,
      lng,
      owner_id: user?.id,
      metadata: {
        title,
        description: options?.description,
        severity: options?.severity || 'warning',
        resolved: false,
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
    })
    .select()
    .single();

  if (error) {
    console.error('[beacons] reportSafetyConcern error:', error.message);
    return null;
  }

  return normalizeBeacon(data) as SafetyAlert;
}

// ============================================
// CREATE/UPDATE/DELETE
// ============================================

export interface CreateBeaconInput {
  type: BeaconType;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  imageUrl?: string;
  startTime?: string;
  endTime?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a beacon
 */
export async function createBeacon(input: CreateBeaconInput): Promise<Beacon | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('beacons')
    .insert({
      owner_id: user.id,
      type: input.type,
      lat: input.latitude,
      lng: input.longitude,
      starts_at: input.startTime,
      ends_at: input.endTime,
      expires_at: input.expiresAt,
      // Store rich fields in metadata (beacons view doesn't have text columns)
      metadata: {
        ...(input.metadata || {}),
        title: input.title,
        description: input.description,
        address: input.address,
        image_url: input.imageUrl,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('[beacons] createBeacon error:', error.message);
    return null;
  }

  return normalizeBeacon(data);
}

/**
 * Update a beacon
 */
export async function updateBeacon(
  id: string, 
  updates: Partial<CreateBeaconInput>
): Promise<Beacon | null> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Columns that exist on the beacons view
  if (updates.latitude !== undefined) updateData.lat = updates.latitude;
  if (updates.longitude !== undefined) updateData.lng = updates.longitude;
  if (updates.startTime !== undefined) updateData.starts_at = updates.startTime;
  if (updates.endTime !== undefined) updateData.ends_at = updates.endTime;
  if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt;

  // Text fields live in metadata (beacons view has no text columns)
  const metaUpdates: Record<string, unknown> = { ...(updates.metadata || {}) };
  if (updates.title !== undefined) metaUpdates.title = updates.title;
  if (updates.description !== undefined) metaUpdates.description = updates.description;
  if (updates.address !== undefined) metaUpdates.address = updates.address;
  if (updates.imageUrl !== undefined) metaUpdates.image_url = updates.imageUrl;
  if (Object.keys(metaUpdates).length > 0) updateData.metadata = metaUpdates;

  const { data, error } = await supabase
    .from('beacons')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[beacons] updateBeacon error:', error.message);
    return null;
  }

  return normalizeBeacon(data);
}

/**
 * Delete a beacon
 */
export async function deleteBeacon(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('beacons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[beacons] deleteBeacon error:', error.message);
    return false;
  }

  return true;
}

// ============================================
// REALTIME
// ============================================

/**
 * Subscribe to beacon changes
 */
export function subscribeToBeacons(
  callback: (beacons: Beacon[]) => void,
  types?: BeaconType[]
) {
  const channel = supabase
    .channel('beacons:live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'beacons' },
      async () => {
        const beacons = await getBeacons({ types });
        callback(beacons);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================
// HELPERS
// ============================================

interface RawBeacon {
  id: string;
  type: string;
  user_id?: string;
  owner_id?: string;
  title?: string;
  description?: string;
  lat?: number;
  lng?: number;
  latitude?: number;  // fallback if column alias exists
  longitude?: number; // fallback if column alias exists
  address?: string;
  image_url?: string;
  starts_at?: string;
  ends_at?: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
  resolved?: boolean;
  created_at: string;
  updated_at?: string;
}

function normalizeBeacon(raw: RawBeacon): Beacon {
  const base: Beacon = {
    id: raw.id,
    type: raw.type as BeaconType,
    userId: raw.user_id || raw.owner_id,
    title: raw.title || (raw.metadata?.title as string) || 'Untitled',
    description: raw.description || (raw.metadata?.description as string),
    latitude: raw.lat ?? raw.latitude ?? 0,
    longitude: raw.lng ?? raw.longitude ?? 0,
    address: raw.address || (raw.metadata?.address as string),
    imageUrl: raw.image_url || (raw.metadata?.image_url as string),
    startTime: raw.starts_at,
    endTime: raw.ends_at,
    expiresAt: raw.expires_at,
    metadata: raw.metadata,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };

  // Add type-specific fields
  if (raw.type === 'safety') {
    return {
      ...base,
      severity: (raw.metadata?.severity as SafetyAlert['severity']) || 'warning',
      resolved: raw.resolved ?? (raw.metadata?.resolved as boolean) ?? false,
    } as SafetyAlert;
  }

  if (raw.type === 'event') {
    return {
      ...base,
      venueName: raw.metadata?.venue_name as string,
      ticketUrl: raw.metadata?.ticket_url as string,
      price: raw.metadata?.price as number,
      capacity: raw.metadata?.capacity as number,
      attendeeCount: raw.metadata?.attendee_count as number,
      organizerId: raw.user_id,
    } as Event;
  }

  return base;
}
