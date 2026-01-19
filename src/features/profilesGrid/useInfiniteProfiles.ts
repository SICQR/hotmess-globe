import { useCallback, useEffect, useRef, useState } from 'react';
import type { Profile, ProfilesResponse } from './types';
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
  return { items: uniqueItems, nextCursor };
};

export function useInfiniteProfiles() {
  const [items, setItems] = useState<Profile[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(async (cursor: string | null) => {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const token = await getAccessToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const res = await fetch(`/api/profiles${params}`, { method: 'GET', headers });
    if (!res.ok) throw new Error(`Failed to fetch profiles (${res.status})`);
    const data: unknown = await res.json();
    return parseProfilesResponse(data);
  }, []);

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
  }, [fetchPage, isLoadingInitial, isLoadingMore, nextCursor]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  return {
    items,
    nextCursor,
    isLoadingInitial,
    isLoadingMore,
    error,
    loadMore,
    reload: loadInitial,
  };
}
