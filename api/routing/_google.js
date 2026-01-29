import { toSecondsFromGoogleDuration } from './_utils.js';

// Increased from 10s to 20s to reduce CONNECTION_RESET errors
// Google Maps can be slow, especially for batch requests
const DEFAULT_TIMEOUT_MS = 20000;

const fetchJsonSafe = async (url, init, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, { ...init, signal: controller.signal });
    const json = await resp.json().catch(() => null);
    return { ok: true, resp, json };
  } catch (error) {
    const code = error?.cause?.code || error?.code || null;
    const aborted = error?.name === 'AbortError';
    return {
      ok: false,
      error: aborted ? 'Upstream request timed out' : 'Upstream request failed',
      details: {
        code,
        name: error?.name || null,
        message: error?.message || String(error),
      },
      aborted,
    };
  } finally {
    clearTimeout(id);
  }
};

export const distanceMatrixMode = (mode) => {
  if (mode === 'WALK') return 'walking';
  if (mode === 'TRANSIT') return 'transit';
  if (mode === 'DRIVE') return 'driving';
  if (mode === 'BICYCLE') return 'bicycling';
  return null;
};

export const routesApiMode = (mode) => {
  if (mode === 'WALK') return 'WALK';
  if (mode === 'TRANSIT') return 'TRANSIT';
  if (mode === 'DRIVE') return 'DRIVE';
  if (mode === 'BICYCLE') return 'BICYCLE';
  if (mode === 'TWO_WHEELER') return 'TWO_WHEELER';
  return null;
};

export const fetchDistanceMatrix = async ({ apiKey, origin, destinations, mode }) => {
  const dmMode = distanceMatrixMode(mode);
  if (!dmMode) return { ok: false, error: `Unsupported mode: ${mode}` };

  const params = new URLSearchParams();
  params.set('origins', `${origin.lat},${origin.lng}`);
  params.set(
    'destinations',
    destinations.map((d) => `${d.lat},${d.lng}`).join('|')
  );
  params.set('mode', dmMode);
  params.set('key', apiKey);

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
  const result = await fetchJsonSafe(url, undefined, { timeoutMs: DEFAULT_TIMEOUT_MS });
  if (!result.ok) {
    return {
      ok: false,
      error: result.aborted ? 'Distance Matrix timed out' : 'Distance Matrix request failed',
      details: result.details,
    };
  }

  const resp = result.resp;
  const body = result.json;

  if (!resp.ok) {
    return { ok: false, error: `Distance Matrix HTTP ${resp.status}`, details: body };
  }

  if (!body || body.status !== 'OK') {
    return { ok: false, error: `Distance Matrix status ${body?.status || 'unknown'}`, details: body };
  }

  const elements = body?.rows?.[0]?.elements;
  if (!Array.isArray(elements)) {
    return { ok: false, error: 'Distance Matrix response missing elements', details: body };
  }

  const results = elements.map((el) => {
    if (!el || el.status !== 'OK') return { ok: false, duration_seconds: null, distance_meters: null };
    const duration = el.duration?.value;
    const distance = el.distance?.value;
    const duration_seconds = toSecondsFromGoogleDuration(duration);
    const distance_meters = typeof distance === 'number' && Number.isFinite(distance) ? Math.round(distance) : null;
    if (!duration_seconds || !distance_meters) return { ok: false, duration_seconds: null, distance_meters: null };
    return { ok: true, duration_seconds, distance_meters };
  });

  return { ok: true, results, provider: 'DIST_MATRIX' };
};

export const fetchRoutesV2 = async ({ apiKey, origin, destination, mode, trafficAware }) => {
  const travelMode = routesApiMode(mode);
  if (!travelMode) return { ok: false, error: `Unsupported mode: ${mode}` };

  const body = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode,
  };

  const fieldMask = trafficAware && mode === 'DRIVE'
    ? 'routes.duration,routes.distanceMeters,routes.staticDuration'
    : 'routes.duration,routes.distanceMeters';

  if (trafficAware && mode === 'DRIVE') {
    body.routingPreference = 'TRAFFIC_AWARE';
    body.departureTime = new Date().toISOString();
  }

  const result = await fetchJsonSafe(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    },
    { timeoutMs: DEFAULT_TIMEOUT_MS }
  );

  if (!result.ok) {
    return {
      ok: false,
      error: result.aborted ? 'Routes API timed out' : 'Routes API request failed',
      details: result.details,
    };
  }

  const resp = result.resp;
  const json = result.json;
  if (!resp.ok) {
    return { ok: false, error: `Routes API HTTP ${resp.status}`, details: json };
  }

  const route = Array.isArray(json?.routes) ? json.routes[0] : null;
  if (!route) return { ok: false, error: 'Routes API returned no routes', details: json };

  const durationTraffic = toSecondsFromGoogleDuration(route.duration);
  const distance_meters = typeof route.distanceMeters === 'number' && Number.isFinite(route.distanceMeters)
    ? Math.round(route.distanceMeters)
    : null;

  const staticDuration = toSecondsFromGoogleDuration(route.staticDuration);

  if (!durationTraffic || !distance_meters) {
    return { ok: false, error: 'Routes API returned invalid duration/distance', details: json };
  }

  if (trafficAware && mode === 'DRIVE' && staticDuration) {
    // Prefer the traffic-aware duration for "real-time" estimates.
    // Expose the static duration separately for debugging/UX if needed.
    return {
      ok: true,
      duration_seconds: durationTraffic,
      duration_in_traffic_seconds: durationTraffic,
      static_duration_seconds: staticDuration,
      distance_meters,
      provider: 'ROUTES_V2',
    };
  }

  return { ok: true, duration_seconds: durationTraffic, distance_meters, provider: 'ROUTES_V2' };
};

export const fetchRoutesV2Directions = async ({ apiKey, origin, destination, mode, trafficAware }) => {
  const travelMode = routesApiMode(mode);
  if (!travelMode) return { ok: false, error: `Unsupported mode: ${mode}` };

  const body = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode,
  };

  const fieldMask = [
    'routes.duration',
    'routes.distanceMeters',
    'routes.polyline.encodedPolyline',
    'routes.legs.steps.distanceMeters',
    'routes.legs.steps.duration',
    'routes.legs.steps.navigationInstruction.instructions',
  ].join(',');

  if (trafficAware && mode === 'DRIVE') {
    body.routingPreference = 'TRAFFIC_AWARE';
    body.departureTime = new Date().toISOString();
  }

  const result = await fetchJsonSafe(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    },
    { timeoutMs: DEFAULT_TIMEOUT_MS }
  );

  if (!result.ok) {
    return {
      ok: false,
      error: result.aborted ? 'Routes API timed out' : 'Routes API request failed',
      details: result.details,
    };
  }

  const resp = result.resp;
  const json = result.json;
  if (!resp.ok) {
    return { ok: false, error: `Routes API HTTP ${resp.status}`, details: json };
  }

  const route = Array.isArray(json?.routes) ? json.routes[0] : null;
  if (!route) return { ok: false, error: 'Routes API returned no routes', details: json };

  const duration_seconds = toSecondsFromGoogleDuration(route.duration);
  const distance_meters = typeof route.distanceMeters === 'number' && Number.isFinite(route.distanceMeters)
    ? Math.round(route.distanceMeters)
    : null;

  if (!duration_seconds || !distance_meters) {
    return { ok: false, error: 'Routes API returned invalid duration/distance', details: json };
  }

  const encoded_polyline = route?.polyline?.encodedPolyline || null;

  const stepsRaw = route?.legs?.[0]?.steps;
  const steps = Array.isArray(stepsRaw)
    ? stepsRaw
        .map((step) => {
          const instruction = step?.navigationInstruction?.instructions || null;
          const distanceMeters = typeof step?.distanceMeters === 'number' && Number.isFinite(step.distanceMeters)
            ? Math.round(step.distanceMeters)
            : null;
          const durationSeconds = toSecondsFromGoogleDuration(step?.duration);

          if (!instruction && !distanceMeters && !durationSeconds) return null;
          return {
            instruction,
            distance_meters: distanceMeters,
            duration_seconds: durationSeconds,
          };
        })
        .filter(Boolean)
    : [];

  return {
    ok: true,
    duration_seconds,
    distance_meters,
    encoded_polyline,
    steps,
    provider: 'ROUTES_V2',
  };
};
