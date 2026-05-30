/**
 * Presence Domain Layer
 * 
 * Centralizes all presence/live status operations.
 * Handles online status, location broadcasting, and realtime presence.
 */

import { supabase } from '@/components/utils/supabaseClient';

export interface PresenceState {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
  latitude?: number;
  longitude?: number;
  status?: 'available' | 'busy' | 'invisible';
}

export interface PresenceBeacon {
  id: string;
  user_id: string;
  type: 'presence' | 'hotspot' | 'event';
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  expires_at?: string;
  created_at: string;
}

// Presence tracking state
let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
let heartbeatInterval: number | null = null;

/**
 * Start presence tracking for current user
 */
export async function startPresence(
  location?: { lat: number; lng: number }
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Update profile with online status
  const updates: Record<string, unknown> = {
    is_online: true,
    last_seen: new Date().toISOString(),
  };

  if (location) {
    updates.latitude = location.lat;
    updates.longitude = location.lng;
  }

  await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  // Set up realtime presence channel
  if (!presenceChannel) {
    presenceChannel = supabase.channel('presence:global', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        // Presence state synchronized
      })
      .subscribe();
  }

  // Heartbeat to keep presence alive
  if (!heartbeatInterval) {
    heartbeatInterval = window.setInterval(async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    }, 30000); // Every 30 seconds
  }
}

/**
 * Stop presence tracking
 */
export async function stopPresence(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (presenceChannel) {
    await supabase.removeChannel(presenceChannel);
    presenceChannel = null;
  }

  if (user) {
    await supabase
      .from('profiles')
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq('id', user.id);
  }
}

/**
 * Update location while online
 */
export async function updateLocation(lat: number, lng: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('profiles')
    .update({
      latitude: lat,
      longitude: lng,
      last_seen: new Date().toISOString(),
    })
    .eq('id', user.id);
}

/**
 * Get online users count
 */
export async function getOnlineCount(): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_online', true);

  if (error) {
    console.error('[presence] getOnlineCount error:', error.message);
    return 0;
  }

  return count || 0;
}

/**
 * Get presence beacons (live markers on globe)
 */
export async function getBeacons(
  lat?: number, 
  lng?: number, 
  radiusKm: number = 100
): Promise<PresenceBeacon[]> {
  let query = supabase
    .from('beacons')
    .select('*')
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[presence] getBeacons error:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Create a presence beacon
 */
export async function createBeacon(
  type: PresenceBeacon['type'],
  lat: number,
  lng: number,
  options?: { title?: string; description?: string; expiresIn?: number }
): Promise<PresenceBeacon | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const expiresAt = options?.expiresIn
    ? new Date(Date.now() + options.expiresIn * 60000).toISOString()
    : null;

  const { data, error } = await supabase
    .from('beacons')
    .insert({
      user_id: user.id,
      type,
      latitude: lat,
      longitude: lng,
      title: options?.title,
      description: options?.description,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error('[presence] createBeacon error:', error.message);
    return null;
  }

  return data;
}

/**
 * Delete a beacon
 */
export async function deleteBeacon(beaconId: string): Promise<boolean> {
  const { error } = await supabase
    .from('beacons')
    .delete()
    .eq('id', beaconId);

  if (error) {
    console.error('[presence] deleteBeacon error:', error.message);
    return false;
  }

  return true;
}

/**
 * Subscribe to beacon changes (realtime)
 */
export function subscribeToBeacons(callback: (beacons: PresenceBeacon[]) => void) {
  const channel = supabase
    .channel('beacons:live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'beacons' },
      async () => {
        const beacons = await getBeacons();
        callback(beacons);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
