/**
 * usePrivacySettings — read/write user_privacy_settings from Supabase.
 *
 * Single source of truth for all privacy controls.
 * Auto-creates a default row on first access if none exists.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

export interface PrivacySettings {
  user_id: string;
  visibility: 'visible' | 'low' | 'invisible';
  show_at_venues: boolean;
  show_nearby: boolean;
  share_vibe: boolean;
  journey_sharing: 'off' | 'ask' | 'trusted_only';
  ai_suggestions: boolean;
  analytics_consent: boolean;
  location_enabled: boolean;
}

const DEFAULTS: Omit<PrivacySettings, 'user_id'> = {
  visibility: 'visible',
  show_at_venues: true,
  show_nearby: true,
  share_vibe: true,
  journey_sharing: 'ask',
  ai_suggestions: true,
  analytics_consent: false,
  location_enabled: true,
};

const KEY = ['privacy-settings'];

async function fetchOrCreate(): Promise<PrivacySettings | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const uid = session.user.id;

  // Try to read existing
  const { data, error } = await supabase
    .from('user_privacy_settings')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();

  if (data) return data as PrivacySettings;

  // Auto-create defaults
  if (error?.code === 'PGRST116' || !data) {
    const { data: created, error: insertErr } = await supabase
      .from('user_privacy_settings')
      .insert({ user_id: uid, ...DEFAULTS })
      .select()
      .single();

    if (insertErr) {
      // Race condition — another tab created it
      const { data: retry } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', uid)
        .single();
      return (retry as PrivacySettings) || null;
    }
    return created as PrivacySettings;
  }

  return null;
}

export function usePrivacySettings() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: fetchOrCreate,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<Omit<PrivacySettings, 'user_id'>>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_privacy_settings')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;
      return data as PrivacySettings;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<PrivacySettings>(KEY);
      if (prev) {
        qc.setQueryData<PrivacySettings>(KEY, { ...prev, ...patch });
      }
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });

  return {
    settings: query.data ?? null,
    isLoading: query.isLoading,
    update: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

/**
 * Quick check helpers for use in product surfaces.
 */
export function useIsVisible() {
  const { settings } = usePrivacySettings();
  return settings?.visibility !== 'invisible';
}

export function useCanShowAtVenues() {
  const { settings } = usePrivacySettings();
  return settings?.show_at_venues !== false && settings?.visibility !== 'invisible';
}

export function useCanShowNearby() {
  const { settings } = usePrivacySettings();
  return settings?.show_nearby !== false && settings?.visibility !== 'invisible';
}

export function useAiEnabled() {
  const { settings } = usePrivacySettings();
  return settings?.ai_suggestions !== false;
}
