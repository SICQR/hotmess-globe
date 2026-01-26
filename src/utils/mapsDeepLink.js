const normalizeMode = (mode) => String(mode || '').trim().toLowerCase();

const normalizeUiMode = (mode) => {
  const m = normalizeMode(mode);
  if (m === 'walk' || m === 'walking' || m === 'foot') return 'foot';
  if (m === 'bike' || m === 'bicycle' || m === 'bicycling') return 'bike';
  if (m === 'drive' || m === 'driving' || m === 'cab') return 'cab';
  if (m === 'uber') return 'uber';
  return 'foot';
};

export const buildInAppDirectionsLink = ({ destinationLat, destinationLng, mode, label } = {}) => {
  const lat = Number(destinationLat);
  const lng = Number(destinationLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const qs = new URLSearchParams();
  qs.set('lat', String(lat));
  qs.set('lng', String(lng));
  const safeLabel = String(label || '').trim();
  if (safeLabel) qs.set('label', safeLabel);
  qs.set('mode', normalizeUiMode(mode));
  return `/directions?${qs.toString()}`;
};

export const buildGoogleMapsDirectionsLink = ({
  destinationLat,
  destinationLng,
  mode,
} = {}) => {
  // Back-compat name, but intentionally keeps navigation inside the app.
  return buildInAppDirectionsLink({ destinationLat, destinationLng, mode });
};
