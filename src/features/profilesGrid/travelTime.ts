import type { TravelTimeResponse } from './types';
import { supabase } from '@/components/utils/supabaseClient';

export type LatLng = { lat: number; lng: number };

type CacheEntry = {
  expiresAtMs: number;
  value: TravelTimeResponse;
};

const TTL_MS = 2 * 60 * 1000;

const getAccessToken = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<TravelTimeResponse>>();

// GPS can jitter and cause tiny coord changes that explode request volume.
// Bucket to ~0.001° (~110m) so travel time stays stable and caching works.
const roundTo3 = (n: number) => Math.round(n * 1e3) / 1e3;

export const makeTravelTimeKey = (viewer: LatLng, destination: LatLng) => {
  const vLat = roundTo3(viewer.lat);
  const vLng = roundTo3(viewer.lng);
  const dLat = roundTo3(destination.lat);
  const dLng = roundTo3(destination.lng);
  return `${vLat},${vLng}|${dLat},${dLng}`;
};

const bucketLatLng = (value: LatLng): LatLng => ({
  lat: roundTo3(value.lat),
  lng: roundTo3(value.lng),
});

const isFiniteLatLng = (value: LatLng) =>
  Number.isFinite(value.lat) && Number.isFinite(value.lng);

export async function fetchTravelTime({
  viewer,
  destination,
  signal,
}: {
  viewer: LatLng;
  destination: LatLng;
  signal?: AbortSignal;
}): Promise<TravelTimeResponse> {
  if (!isFiniteLatLng(viewer) || !isFiniteLatLng(destination)) {
    return { walking: null, driving: null, bicycling: null, uber: null, fastest: null };
  }

  const viewerBucket = bucketLatLng(viewer);
  const destinationBucket = bucketLatLng(destination);

  const key = makeTravelTimeKey(viewerBucket, destinationBucket);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAtMs > now) return cached.value;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const token = await getAccessToken();

      const res = await fetch('/api/travel-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal,
        body: JSON.stringify({
          origin: { lat: viewerBucket.lat, lng: viewerBucket.lng },
          destination: { lat: destinationBucket.lat, lng: destinationBucket.lng },
        }),
      });

      if (!res.ok) {
        return { walking: null, driving: null, bicycling: null, uber: null, fastest: null };
      }

      const data: unknown = await res.json();
      const parsed = parseTravelTimeResponse(data);
      cache.set(key, { expiresAtMs: Date.now() + TTL_MS, value: parsed });
      return parsed;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

const isModeResult = (value: unknown): value is { durationSeconds: number; label: string } => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.durationSeconds === 'number' &&
    Number.isFinite(v.durationSeconds) &&
    typeof v.label === 'string'
  );
};

export const parseTravelTimeResponse = (value: unknown): TravelTimeResponse => {
  if (!value || typeof value !== 'object') return { walking: null, driving: null, bicycling: null, uber: null, fastest: null };
  const v = value as Record<string, unknown>;

  const walking = isModeResult(v.walking) ? v.walking : null;
  const driving = isModeResult(v.driving) ? v.driving : null;
  const bicycling = isModeResult(v.bicycling) ? v.bicycling : null;
  const uber = isModeResult(v.uber) ? v.uber : null;
  const fastest = isModeResult(v.fastest) ? v.fastest : null;

  return { walking, driving, bicycling, uber, fastest };
};

export const getFastestLabel = (value: TravelTimeResponse | null) => {
  const label = value?.fastest?.label;
  return label && label.trim() ? label : null;
};

export const getTravelModeSummary = (value: TravelTimeResponse | null) => {
  const toMins = (seconds: number) => Math.max(1, Math.round(seconds / 60));

  const walk = Number.isFinite(value?.walking?.durationSeconds)
    ? `foot ${toMins(value.walking.durationSeconds)}m`
    : null;
  const cab = Number.isFinite(value?.driving?.durationSeconds)
    ? `cab ${toMins(value.driving.durationSeconds)}m`
    : null;
  const bike = Number.isFinite(value?.bicycling?.durationSeconds)
    ? `bike ${toMins(value.bicycling.durationSeconds)}m`
    : null;

  const uber = Number.isFinite(value?.uber?.durationSeconds)
    ? `uber ${toMins(value.uber.durationSeconds)}m`
    : null;

  const parts = [walk, cab, bike, uber].filter(Boolean);
  return parts.length ? parts.join(' • ') : null;
};
