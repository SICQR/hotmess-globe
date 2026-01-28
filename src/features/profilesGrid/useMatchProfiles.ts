import { useCallback, useEffect, useRef, useState } from 'react';
import type { Profile, ProfilesResponse, SortOption } from './types';
import { supabase } from '@/components/utils/supabaseClient';

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

const parseProfilesResponse = (value: unknown): ProfilesResponse => {
  if (!value || typeof value !== 'object') return { items: [], nextCursor: null };
  const v = value as Record<string, unknown>;

  const rawItems = Array.isArray(v.items) ? v.items : [];
  const items: Profile[] = rawItems
    .map((item) => item as Profile)
    .filter((p) => !!p && typeof p.id === 'string');

  const uniqueItems = dedupeProfiles(items);

  const nextCursor = typeof v.nextCursor === 'string' ? v.nextCursor : null;
  const scoringVersion = typeof v.scoringVersion === 'string' ? v.scoringVersion : undefined;
  
  return { items: uniqueItems, nextCursor, scoringVersion };
};

export type MatchProfilesOptions = {
  /** Viewer's latitude for travel time calculation */
  viewerLat?: number | null;
  /** Viewer's longitude for travel time calculation */
  viewerLng?: number | null;
  /** Sort order: 'match' | 'distance' | 'lastActive' | 'newest' */
  sort?: SortOption;
  /** Max items per page */
  limit?: number;
};

export function useMatchProfiles(options: MatchProfilesOptions = {}) {
  const { viewerLat, viewerLng, sort = 'match', limit = 40 } = options;
  
  const [items, setItems] = useState<Profile[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [scoringVersion, setScoringVersion] = useState<string | undefined>();
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(async (cursor: string | null) => {
    const params = new URLSearchParams();
    
    if (cursor) {
      params.set('cursor', cursor);
    }
    
    params.set('limit', String(limit));
    params.set('sort', sort);
    
    if (viewerLat !== null && viewerLat !== undefined && Number.isFinite(viewerLat)) {
      params.set('lat', String(viewerLat));
    }
    if (viewerLng !== null && viewerLng !== undefined && Number.isFinite(viewerLng)) {
      params.set('lng', String(viewerLng));
    }
    
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const url = `/api/match-probability?${params.toString()}`;
    const res = await fetch(url, { method: 'GET', headers });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch profiles (${res.status})`);
    }
    
    const data: unknown = await res.json();
    return parseProfilesResponse(data);
  }, [limit, sort, viewerLat, viewerLng]);

  const loadInitial = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoadingInitial(true);
    setError(null);

    try {
      cursorRef.current = null;
      hasMoreRef.current = true;
      const page = await fetchPage(null);
      setItems(dedupeProfiles(page.items));
      setNextCursor(page.nextCursor);
      setScoringVersion(page.scoringVersion);
      cursorRef.current = page.nextCursor;
      hasMoreRef.current = page.nextCursor !== null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch profiles';
      setError(msg);
    } finally {
      setIsLoadingInitial(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingInitial || isLoadingMore) return;
    if (!hasMoreRef.current) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const page = await fetchPage(cursor);
      setItems((prev) => dedupeProfiles([...prev, ...page.items]));
      setNextCursor(page.nextCursor);
      cursorRef.current = page.nextCursor;
      hasMoreRef.current = page.nextCursor !== null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load more profiles';
      setError(msg);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchPage, isLoadingInitial, isLoadingMore]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  return {
    items,
    nextCursor,
    scoringVersion,
    isLoadingInitial,
    isLoadingMore,
    error,
    loadMore,
    reload: loadInitial,
  };
}
