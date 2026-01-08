const normalizeMode = (mode) => String(mode || '').trim().toLowerCase();

export const buildGoogleMapsDirectionsLink = ({
  destinationLat,
  destinationLng,
  mode,
} = {}) => {
  const lat = Number(destinationLat);
  const lng = Number(destinationLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const m = normalizeMode(mode);
  const travelMode =
    m === 'walk' || m === 'walking'
      ? 'walking'
      : m === 'drive' || m === 'driving' || m === 'cab'
        ? 'driving'
        : m === 'bike' || m === 'bicycle' || m === 'bicycling'
          ? 'bicycling'
          : null;

  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', `${lat},${lng}`);
  if (travelMode) url.searchParams.set('travelmode', travelMode);

  // NOTE: we intentionally omit origin so Maps can use current location.
  return url.toString();
};
