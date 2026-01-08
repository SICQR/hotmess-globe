import { supabase } from '@/components/utils/supabaseClient';

const getAccessToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
};

const authedFetch = async (url, options = {}) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJson ? payload?.error || 'Request failed' : 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }

  return payload;
};

export const fetchNearbyCandidates = async ({
  lat,
  lng,
  radiusMeters = 10000,
  limit = 40,
  approximate = false,
}) => {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius_m: String(radiusMeters),
    limit: String(limit),
    approximate: approximate ? 'true' : 'false',
  });

  return authedFetch(`/api/nearby?${params.toString()}`, { method: 'GET' });
};

export const fetchRoutingEtas = async ({ origin, destination, ttlSeconds = 120, modes }) => {
  return authedFetch('/api/routing/etas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      origin,
      destination,
      ttl_seconds: ttlSeconds,
      ...(Array.isArray(modes) ? { modes } : {}),
    }),
  });
};
