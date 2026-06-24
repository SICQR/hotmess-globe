// TfL Journey Planner provider — real tube / bus / overground / DLR / Elizabeth
// line / night-bus step-by-step routes for London. Free public API; an app key
// (TFL_APP_KEY) is optional and only lifts the anonymous rate limit. Called
// server-side from api/routing/directions.js to avoid CORS and keep any key off
// the client.
//
// Returns the SAME shape the existing Mapbox/Google providers return so
// directions.js can hand it straight to the UI:
//   { ok, duration_seconds, distance_meters, encoded_polyline, steps, provider }
// where each step is { instruction, distance_meters, duration_seconds }.

const TFL_BASE = 'https://api.tfl.gov.uk/Journey/JourneyResults';

// Mode presets. "transit" = full multimodal day routing; "night" = night bus
// biased for the late-night / safer-path product framing.
const MODE_PRESETS = {
  transit: 'tube,bus,overground,dlr,elizabeth-line,walking',
  night: 'night-bus,bus,walking',
};

const round = (n) => (Number.isFinite(n) ? Math.round(n) : null);

const buildUrl = ({ origin, destination, tflMode, appKey }) => {
  const from = `${origin.lat},${origin.lng}`;
  const to = `${destination.lat},${destination.lng}`;
  const params = new URLSearchParams({ mode: tflMode, timeIs: 'Departing' });
  if (appKey) params.set('app_key', appKey);
  return `${TFL_BASE}/${from}/to/${to}?${params.toString()}`;
};

// One TfL leg -> one UI step.
//  - walking leg -> "Walk to {arrival}"
//  - transit leg -> "{line/mode name} -> {arrival}"
const legToStep = (leg) => {
  const durationMins = round(leg?.duration);
  const durationSeconds = durationMins != null ? durationMins * 60 : null;
  const distanceMeters = round(leg?.distance);

  const arrival = leg?.arrivalPoint?.commonName || 'destination';
  const modeName = (leg?.mode?.id || leg?.mode?.name || '').toLowerCase();
  const isWalking = modeName === 'walking' || modeName === 'walk';

  // Prefer the actual line/route name (e.g. "Victoria", "N29") when present.
  const lineName =
    (Array.isArray(leg?.routeOptions) && leg.routeOptions[0]?.name) ||
    leg?.instruction?.summary ||
    leg?.mode?.name ||
    modeName;

  let instruction;
  if (isWalking) {
    instruction = `Walk to ${arrival}`;
  } else if (lineName) {
    instruction = `${lineName} → ${arrival}`;
  } else {
    instruction = leg?.instruction?.summary || `Continue to ${arrival}`;
  }

  return {
    instruction,
    distance_meters: distanceMeters,
    duration_seconds: durationSeconds,
    // mode hint so the UI can pick a tube/bus vs walk icon. Not rendered by
    // the existing turn-icon path but available for transit step styling.
    mode: isWalking ? 'walk' : (modeName || 'transit'),
  };
};

export const fetchTflJourney = async ({ origin, destination, mode = 'transit', appKey = null, timeoutMs = 9000 }) => {
  const tflMode = MODE_PRESETS[mode] || MODE_PRESETS.transit;
  const url = buildUrl({ origin, destination, tflMode, appKey });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let json;
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    json = await res.json().catch(() => null);
    if (!res.ok) {
      // TfL returns 300 with disambiguation options when a point is ambiguous;
      // with lat/lng inputs this is rare, but surface it cleanly either way.
      return {
        ok: false,
        error: json?.message || `TfL Journey Planner returned ${res.status}`,
        details: json || null,
      };
    }
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    return {
      ok: false,
      error: aborted ? 'TfL Journey Planner timed out' : 'TfL Journey Planner request failed',
      details: { name: error?.name || null, message: error?.message || String(error) },
    };
  } finally {
    clearTimeout(timer);
  }

  const journey = Array.isArray(json?.journeys) ? json.journeys[0] : null;
  if (!journey) {
    return { ok: false, error: 'TfL Journey Planner returned no journeys', details: json };
  }

  const legs = Array.isArray(journey.legs) ? journey.legs : [];
  const steps = legs.map(legToStep).filter((s) => s.instruction);

  const duration_seconds =
    round(journey.duration) != null ? round(journey.duration) * 60 : null;

  // TfL doesn't report a single journey distance; sum the per-leg distances.
  const distance_meters = legs.reduce(
    (sum, leg) => sum + (Number.isFinite(leg?.distance) ? leg.distance : 0),
    0,
  );

  if (!duration_seconds && !steps.length) {
    return { ok: false, error: 'TfL Journey Planner returned an empty journey', details: json };
  }

  return {
    ok: true,
    duration_seconds,
    distance_meters: round(distance_meters) || null,
    encoded_polyline: null, // TfL legs carry path geometry but the UI draws nothing for transit
    steps,
    provider: 'TFL',
  };
};
