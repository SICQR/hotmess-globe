import { useCallback, useEffect, useRef, useState } from 'react';
import type { Profile, MatchProbabilityResponse, SortOption } from './types';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Options for fetching profiles with match probability
 */
export type MatchProbabilityOptions = {
  /** Viewer latitude for travel time calculation */
  lat?: number;
  /** Viewer longitude for travel time calculation */
  lng?: number;
  /** Sort order: 'match' (default), 'distance', 'lastActive', 'newest' */
  sort?: SortOption;
  /** Filter by profile types */
  profileTypes?: string[];
  /** Minimum match score (0-100) */
  minScore?: number;
  /** Minimum age */
  ageMin?: number;
  /** Maximum age */
  ageMax?: number;
  /** Maximum distance in kilometers */
  distanceKm?: number;
  /** Number of profiles per page */
  limit?: number;
  /** Whether to enable the hook */
  enabled?: boolean;
};

const getAccessToken = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
};

const dedupeProfiles = (profiles: Profile[]): Profile[] => {
  const seen = new Set<string>();
  const out: Profile[] = [];

  for (const profile of profiles) {
    if (!profile || typeof profile.id !== 'string') continue;
    const key = profile.id.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(profile);
  }

  return out;
};

const parseMatchProbabilityResponse = (value: unknown): MatchProbabilityResponse => {
  if (!value || typeof value !== 'object') {
    return { items: [], nextCursor: null, total: 0, scoringVersion: '1.0', sortedBy: 'match' };
  }
  
  const v = value as Record<string, unknown>;

  const rawItems = Array.isArray(v.items) ? v.items : [];
  const items: Profile[] = rawItems
    .map((item) => item as Profile)
    .filter((p) => !!p && typeof p.id === 'string');

  const uniqueItems = dedupeProfiles(items);

  return {
    items: uniqueItems,
    nextCursor: typeof v.nextCursor === 'string' ? v.nextCursor : null,
    total: typeof v.total === 'number' ? v.total : items.length,
    scoringVersion: typeof v.scoringVersion === 'string' ? v.scoringVersion : '1.0',
    sortedBy: (v.sortedBy as SortOption) || 'match',
  };
};

const buildQueryParams = (options: MatchProbabilityOptions, cursor: string | null): string => {
  const params = new URLSearchParams();

  if (cursor) params.set('offset', cursor);
  if (options.lat !== undefined && Number.isFinite(options.lat)) params.set('lat', String(options.lat));
  if (options.lng !== undefined && Number.isFinite(options.lng)) params.set('lng', String(options.lng));
  if (options.sort) params.set('sort', options.sort);
  if (options.profileTypes?.length) params.set('profile_types', options.profileTypes.join(','));
  if (options.minScore !== undefined) params.set('min_score', String(options.minScore));
  if (options.ageMin !== undefined) params.set('age_min', String(options.ageMin));
  if (options.ageMax !== undefined) params.set('age_max', String(options.ageMax));
  if (options.distanceKm !== undefined) params.set('distance_km', String(options.distanceKm));
  if (options.limit !== undefined) params.set('limit', String(options.limit));

  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

/**
 * Hook for fetching profiles with match probability scores
 * 
 * Uses /api/match-probability endpoint which computes compatibility scores
 * based on profile data, travel time, and semantic text similarity.
 */
export function useMatchProbabilityProfiles(options: MatchProbabilityOptions = {}) {
  const { enabled = true } = options;

  const [items, setItems] = useState<Profile[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [scoringVersion, setScoringVersion] = useState('1.0');
  const [sortedBy, setSortedBy] = useState<SortOption>('match');
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const fetchPage = useCallback(async (cursor: string | null, opts: MatchProbabilityOptions) => {
    const queryString = buildQueryParams(opts, cursor);
    const token = await getAccessToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const headers = { Authorization: `Bearer ${token}` };
    const res = await fetch(`/api/match-probability${queryString}`, { method: 'GET', headers });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch profiles (${res.status})`);
    }
    
    const data: unknown = await res.json();
    return parseMatchProbabilityResponse(data);
  }, []);

  const loadInitial = useCallback(async () => {
    if (!enabled) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoadingInitial(true);
    setError(null);

    try {
      cursorRef.current = null;
      hasMoreRef.current = true;
      const page = await fetchPage(null, optionsRef.current);
      setItems(dedupeProfiles(page.items));
      setNextCursor(page.nextCursor);
      setTotal(page.total);
      setScoringVersion(page.scoringVersion);
      setSortedBy(page.sortedBy);
      cursorRef.current = page.nextCursor;
      hasMoreRef.current = page.nextCursor !== null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch profiles';
      setError(msg);
    } finally {
      setIsLoadingInitial(false);
    }
  }, [enabled, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!enabled) return;
    if (isLoadingInitial || isLoadingMore) return;
    if (!hasMoreRef.current) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const page = await fetchPage(cursor, optionsRef.current);
      setItems((prev) => dedupeProfiles([...prev, ...page.items]));
      setNextCursor(page.nextCursor);
      setTotal(page.total);
      cursorRef.current = page.nextCursor;
      hasMoreRef.current = page.nextCursor !== null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load more profiles';
      setError(msg);
    } finally {
      setIsLoadingMore(false);
    }
  }, [enabled, fetchPage, isLoadingInitial, isLoadingMore]);

  // Reload when options change
  useEffect(() => {
    void loadInitial();
  }, [
    loadInitial,
    options.lat,
    options.lng,
    options.sort,
    options.minScore,
    options.ageMin,
    options.ageMax,
    options.distanceKm,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    options.profileTypes?.join(','),
  ]);

  return {
    items,
    nextCursor,
    total,
    scoringVersion,
    sortedBy,
    isLoadingInitial,
    isLoadingMore,
    error,
    loadMore,
    reload: loadInitial,
  };
}

/**
 * Helper to get a human-readable label for match probability
 */
export function getMatchProbabilityLabel(probability: number): string {
  if (probability >= 90) return 'Excellent match';
  if (probability >= 75) return 'Great match';
  if (probability >= 60) return 'Good match';
  if (probability >= 40) return 'Moderate match';
  return 'Low match';
}

/**
 * Helper to get color class for match probability
 */
export function getMatchProbabilityColor(probability: number): string {
  if (probability >= 80) return 'text-emerald-400';
  if (probability >= 60) return 'text-cyan-400';
  if (probability >= 40) return 'text-yellow-400';
  return 'text-white/60';
}
