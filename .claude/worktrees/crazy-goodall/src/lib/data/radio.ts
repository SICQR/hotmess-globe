/**
 * Radio Domain Layer
 * 
 * Centralizes all radio/music operations.
 * Handles show schedules, live state, and player controls.
 */

import { supabase } from '@/components/utils/supabaseClient';

export interface RadioShow {
  id: string;
  title: string;
  description?: string;
  hostName: string;
  hostId?: string;
  imageUrl?: string;
  genre?: string;
  startTime: string;
  endTime: string;
  isLive: boolean;
  streamUrl?: string;
  tags?: string[];
}

export interface RadioState {
  isLive: boolean;
  currentShow: RadioShow | null;
  nextShow: RadioShow | null;
  listenerCount: number;
  streamUrl: string;
}

export interface RadioScheduleDay {
  date: string;
  shows: RadioShow[];
}

// Default stream URL — RadioKing live stream
const DEFAULT_STREAM_URL =
  import.meta.env.NEXT_PUBLIC_RADIOKING_STREAM_URL ||
  'https://listen.radioking.com/radio/736103/stream/802454';

/**
 * Get current radio state
 */
export async function getRadioState(): Promise<RadioState> {
  const now = new Date().toISOString();

  // Get current live show
  const { data: currentData } = await supabase
    .from('radio_shows')
    .select('*')
    .lte('start_time', now)
    .gte('end_time', now)
    .eq('is_active', true)
    .single();

  // Get next upcoming show
  const { data: nextData } = await supabase
    .from('radio_shows')
    .select('*')
    .gt('start_time', now)
    .eq('is_active', true)
    .order('start_time', { ascending: true })
    .limit(1)
    .single();

  // Get listener count from presence or metrics
  const { count: listenerCount } = await supabase
    .from('radio_listeners')
    .select('*', { count: 'exact', head: true });

  return {
    isLive: !!currentData,
    currentShow: currentData ? normalizeShow(currentData) : null,
    nextShow: nextData ? normalizeShow(nextData) : null,
    listenerCount: listenerCount || 0,
    streamUrl: currentData?.stream_url || DEFAULT_STREAM_URL,
  };
}

/**
 * Get schedule for a date range
 */
export async function getSchedule(
  startDate: string,
  endDate: string
): Promise<RadioScheduleDay[]> {
  const { data, error } = await supabase
    .from('radio_shows')
    .select('*')
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .eq('is_active', true)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[radio] getSchedule error:', error.message);
    return [];
  }

  // Group by date
  const byDate = new Map<string, RadioShow[]>();
  for (const show of data || []) {
    const date = show.start_time.split('T')[0];
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date)!.push(normalizeShow(show));
  }

  return Array.from(byDate.entries()).map(([date, shows]) => ({
    date,
    shows,
  }));
}

/**
 * Get today's schedule
 */
export async function getTodaySchedule(): Promise<RadioShow[]> {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const schedule = await getSchedule(today, tomorrow);
  return schedule[0]?.shows || [];
}

/**
 * Get show by ID
 */
export async function getShowById(id: string): Promise<RadioShow | null> {
  const { data, error } = await supabase
    .from('radio_shows')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[radio] getShowById error:', error.message);
    return null;
  }

  return normalizeShow(data);
}

/**
 * Join as listener (for presence/analytics)
 */
export async function joinAsListener(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const listenerId = user?.id || `anon_${crypto.randomUUID()}`;

  await supabase
    .from('radio_listeners')
    .upsert({
      id: listenerId,
      joined_at: new Date().toISOString(),
    });
}

/**
 * Leave as listener
 */
export async function leaveAsListener(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('radio_listeners')
    .delete()
    .eq('id', user.id);
}

/**
 * Subscribe to radio state changes (realtime)
 */
export function subscribeToRadioState(callback: (state: RadioState) => void) {
  const channel = supabase
    .channel('radio:state')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'radio_shows' },
      async () => {
        const state = await getRadioState();
        callback(state);
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

interface RawRadioShow {
  id: string;
  title: string;
  description?: string;
  host_name: string;
  host_id?: string;
  image_url?: string;
  genre?: string;
  start_time: string;
  end_time: string;
  stream_url?: string;
  tags?: string[];
}

function normalizeShow(raw: RawRadioShow): RadioShow {
  const now = new Date();
  const start = new Date(raw.start_time);
  const end = new Date(raw.end_time);

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    hostName: raw.host_name,
    hostId: raw.host_id,
    imageUrl: raw.image_url,
    genre: raw.genre,
    startTime: raw.start_time,
    endTime: raw.end_time,
    isLive: now >= start && now <= end,
    streamUrl: raw.stream_url,
    tags: raw.tags,
  };
}
