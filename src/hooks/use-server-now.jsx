import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';

async function fetchServerNow() {
  // Prefer platform server time when available (e.g. Vercel /api route).
  // In local Vite dev, /api is commonly proxied and this endpoint may not exist.
  if (import.meta.env.PROD) {
    try {
      const res = await fetch('/api/time/now');
      if (res.ok) return res.json();
    } catch {
      // ignore and fall through to RPC
    }
  }

  // Local dev fallback: use Supabase RPC for DB server time.
  const { data, error } = await supabase.rpc('get_server_time');
  if (error) throw new Error(error.message || 'Failed to fetch server time via RPC');

  const iso = typeof data === 'string' ? data : (data?.now ?? null);
  const unixMs = iso ? new Date(iso).getTime() : Date.now();
  return { now: iso || new Date().toISOString(), unixMs };
}

export function useServerNow(options = {}) {
  const tickMs = options.tickMs ?? 1000;

  const { data, isLoading, error } = useQuery({
    queryKey: ['server-time'],
    queryFn: fetchServerNow,
    staleTime: 30_000,
    retry: 1,
  });

  const [localNowMs, setLocalNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setLocalNowMs(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  const offsetMs = useMemo(() => {
    const serverMs = typeof data?.unixMs === 'number' ? data.unixMs : null;
    if (serverMs == null) return 0;
    return serverMs - localNowMs;
  }, [data?.unixMs, localNowMs]);

  const serverNow = useMemo(() => new Date(localNowMs + offsetMs), [localNowMs, offsetMs]);

  return { serverNow, offsetMs, isLoading, error };
}
