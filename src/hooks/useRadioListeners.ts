/**
 * useRadioListeners — Query active radio listeners for a show.
 *
 * Returns listener profiles, counts, and nearby detection.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

export interface RadioListener {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  showId: string;
  email: string | null;
}

export interface RadioListenerData {
  listeners: RadioListener[];
  count: number;
  nearbyCount: number;
}

const EMPTY: RadioListenerData = { listeners: [], count: 0, nearbyCount: 0 };

async function fetchRadioListeners(showId?: string): Promise<RadioListenerData> {
  const now = new Date().toISOString();
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: { session } } = await supabase.auth.getSession();
  const myId = session?.user?.id;

  // Fetch active listeners (not expired, updated within 10 min)
  let query = supabase
    .from('radio_listeners')
    .select('user_id, show_id, updated_at, expires_at')
    .gt('updated_at', tenMinAgo);

  // Filter: no expires_at OR expires_at in the future
  query = query.or(`expires_at.is.null,expires_at.gt.${now}`);

  if (showId) {
    query = query.eq('show_id', showId);
  }

  const { data: rows } = await query.limit(100);
  if (!rows || rows.length === 0) return EMPTY;

  const userIds = rows.map(r => r.user_id).filter(id => id !== myId);
  if (userIds.length === 0) return { ...EMPTY, count: rows.length };

  // Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, email')
    .in('id', userIds);

  const listeners: RadioListener[] = (profiles || [])
    .filter(p => p.display_name)
    .map(p => ({
      userId: p.id,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      showId: rows.find(r => r.user_id === p.id)?.show_id || '',
      email: p.email,
    }));

  return {
    listeners,
    count: rows.length,
    nearbyCount: listeners.length, // simplified — all active = nearby
  };
}

export function useRadioListeners(showId?: string) {
  return useQuery<RadioListenerData>({
    queryKey: ['radio-listeners', showId],
    queryFn: () => fetchRadioListeners(showId),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

/** Check if a specific user is currently listening */
export function isListening(listeners: RadioListener[], userId: string): boolean {
  return listeners.some(l => l.userId === userId);
}
