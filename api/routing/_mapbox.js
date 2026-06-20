const DEFAULT_TIMEOUT_MS = 10000;

const fetchJsonSafe = async (url, init, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...init, signal: controller.signal });
    const json = await resp.json().catch(() => null);
    return { ok: true, resp, json };
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    return {
      ok: false,
      error: aborted ? 'Upstream request timed out' : 'Upstream request failed',
      details: { name: error?.name || null, message: error?.message || String(error) },
      aborted,
    };
  } finally {
    clearTimeout(id);
  }
};

const mapboxProfile = (mode) => {
  if (mode === 'WALK') return 'walking';
  if (mode === 'DRIVE') return 'driving-traffic';
  if (mode === 'BICYCLE') return 'cycling';
  if (mode === 'TRANSIT') return 'walking'; // Mapbox has no transit — walk fallback
  if (mode === 'TWO_WHEELER') return 'driving';
  return null;
};

// Post-process: merge consecutive unnamed-path steps.
// Mapbox labels unnamed pedestrian footways as "the walkway" which is noise.
// Consecutive unnamed steps get collapsed into one "Continue along the path."
// instruction with summed distance + duration.
const UNNAMED_STEP_RE = /\b(walkway|footway|path|pedestrian)\b/i;
const ARRIVAL_RE = /\b(destination|arrive)\b/i;

const mergeUnnamedSteps = (rawSteps) => {
  const out = [];
  let buf = null;
  for (const step of rawSteps) {
    const txt = step.instruction || '';
    const isUnnamed = UNNAMED_STEP_RE.test(txt) && !ARRIVAL_RE.test(txt);
    if (isUnnamed) {
      if (buf) {
        buf.distance_meters = (buf.distance_meters || 0) + (step.distance_meters || 0);
        buf.duration_seconds = (buf.duration_seconds || 0) + (step.duration_seconds || 0);
      } else {
        buf = {
          instruction: 'Continue along the path.',
          distance_meters: step.distance_meters || 0,
          duration_seconds: step.duration_seconds || 0,
        };
      }
    } else {
      if (buf) { out.push(buf); buf = null; }
      out.push(step);
    }
  }
  if (buf) out.push(buf);
  return out;
};

export const fetchMapboxDirections = async ({ token, origin, destination, mode }) => {
  const profile = mapboxProfile(mode);
  if (!profile) return { ok: false, error: `Unsupported mode: ${mode}` };

  // Mapbox coordinates are lng,lat order
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    steps: 'true',
    overview: 'full',
    geometries: 'polyline', // precision-5, same encoding as Google — works with decodeGooglePolyline
    language: 'en',
    access_token: token,
  });

  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?${params}`;
  const result = await fetchJsonSafe(url, undefined, { timeoutMs: DEFAULT_TIMEOUT_MS });

  if (!result.ok) {
    return {
      ok: false,
      error: result.aborted ? 'Mapbox Directions timed out' : 'Mapbox Directions request failed',
      details: result.details,
    };
  }

  const { resp, json } = result;
  if (!resp.ok) {
    return { ok: false, error: `Mapbox Directions HTTP ${resp.status}`, details: json };
  }

  const route = Array.isArray(json?.routes) ? json.routes[0] : null;
  if (!route) return { ok: false, error: 'Mapbox Directions returned no routes', details: json };

  const duration_seconds = Number.isFinite(route.duration) ? Math.round(route.duration) : null;
  const distance_meters = Number.isFinite(route.distance) ? Math.round(route.distance) : null;
  if (!duration_seconds || !distance_meters) {
    return { ok: false, error: 'Mapbox Directions missing duration or distance', details: json };
  }

  const encoded_polyline = typeof route.geometry === 'string' ? route.geometry : null;

  const stepsRaw = route?.legs?.[0]?.steps;
  const rawMapped = Array.isArray(stepsRaw)
    ? stepsRaw
        .map((step) => {
          const instruction = step?.maneuver?.instruction || null;
          const distanceMeters = Number.isFinite(step?.distance) ? Math.round(step.distance) : null;
          const durationSeconds = Number.isFinite(step?.duration) ? Math.round(step.duration) : null;
          if (!instruction && !distanceMeters && !durationSeconds) return null;
          return {
            instruction,
            distance_meters: distanceMeters,
            duration_seconds: durationSeconds,
          };
        })
        .filter(Boolean)
    : [];

  const steps = mergeUnnamedSteps(rawMapped);

  return {
    ok: true,
    duration_seconds,
    distance_meters,
    encoded_polyline,
    steps,
    provider: 'MAPBOX',
  };
};
