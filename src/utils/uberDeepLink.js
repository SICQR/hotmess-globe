export const buildUberDeepLink = ({
  dropoffLat,
  dropoffLng,
  dropoffNickname,
} = {}) => {
  const lat = Number(dropoffLat);
  const lng = Number(dropoffLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const url = new URL('https://m.uber.com/ul/');
  url.searchParams.set('action', 'setPickup');
  url.searchParams.set('pickup', 'my_location');
  url.searchParams.set('dropoff[latitude]', String(lat));
  url.searchParams.set('dropoff[longitude]', String(lng));

  const nickname = String(dropoffNickname || '').trim();
  if (nickname) {
    url.searchParams.set('dropoff[nickname]', nickname);
  }

  return url.toString();
};
