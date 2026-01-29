import { useCallback, useEffect, useRef, useState } from 'react';
import type { Profile, SortOption, MatchProfilesResponse } from './types';
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

const parseMatchResponse = (value: unknown): MatchProfilesResponse => {
  if (!value || typeof value !== 'object') {
    return { items: [], nextCursor: null, scoringVersion: '1.0' };
  }
  const v = value as Record<string, unknown>;

  const rawItems = Array.isArray(v.items) ? v.items : [];
  const items: Profile[] = rawItems
    .map((item) => item as Profile)
    .filter((p) => !!p && typeof p.id === 'string');

  const uniqueItems = dedupeProfiles(items);
  const nextCursor = typeof v.nextCursor === 'string' ? v.nextCursor : null;
  const scoringVersion = typeof v.scoringVersion === 'string' ? v.scoringVersion : '1.0';

  return { items: uniqueItems, nextCursor, scoringVersion };
};

export type UseMatchProfilesOptions = {
  viewerLat?: number | null;
  viewerLng?: number | null;
  sort?: SortOption;
  limit?: number;
  enabled?: boolean;
};

export function useMatchProfiles(options: UseMatchProfilesOptions = {}) {
  const {
    viewerLat = null,
    viewerLng = null,
    sort = 'match',
    limit = 40,
    enabled = true,
  } = options;

  const [items, setItems] = useState<Profile[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [scoringVersion, setScoringVersion] = useState<string>('1.0');
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(async (cursor: string | null): Promise<MatchProfilesResponse> => {
    const params = new URLSearchParams();
    
    if (cursor) {
      params.set('cursor', cursor);
    }
    if (Number.isFinite(viewerLat) && Number.isFinite(viewerLng)) {
      params.set('lat', String(viewerLat));
      params.set('lng', String(viewerLng));
    }
    params.set('sort', sort);
    params.set('limit', String(limit));

    const queryString = params.toString();
    const url = `/api/match-probability${queryString ? `?${queryString}` : ''}`;

    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, { method: 'GET', headers });
    
    if (!res.ok) {
      // Fall back to regular profiles endpoint if match-probability isn't available
      if (res.status === 404) {
        const fallbackParams = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
        const fallbackRes = await fetch(`/api/profiles${fallbackParams}`, { 
          method: 'GET', 
          headers 
        });
        if (!fallbackRes.ok) {
          throw new Error(`Failed to fetch profiles (${fallbackRes.status})`);
        }
        const fallbackData = await fallbackRes.json();
        return {
          items: Array.isArray(fallbackData.items) ? fallbackData.items : [],
          nextCursor: fallbackData.nextCursor || null,
          scoringVersion: 'fallback',
        };
      }
      throw new Error(`Failed to fetch match profiles (${res.status})`);
    }

    const data: unknown = await res.json();
    return parseMatchResponse(data);
  }, [viewerLat, viewerLng, sort, limit]);

  const loadInitial = useCallback(async () => {
    if (!enabled) return;

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
  }, [enabled, fetchPage, isLoadingInitial, isLoadingMore]);

  // Reload when sort or location changes significantly
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
