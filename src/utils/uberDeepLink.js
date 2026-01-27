/**
 * Build Uber deep link for ride requests
 */
export const buildUberDeepLink = ({
  dropoffLat,
  dropoffLng,
  dropoffNickname,
  pickupLat,
  pickupLng,
} = {}) => {
  const lat = Number(dropoffLat);
  const lng = Number(dropoffLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const url = new URL('https://m.uber.com/ul/');
  url.searchParams.set('action', 'setPickup');
  
  // Use specific pickup if provided, otherwise use current location
  if (Number.isFinite(pickupLat) && Number.isFinite(pickupLng)) {
    url.searchParams.set('pickup[latitude]', String(pickupLat));
    url.searchParams.set('pickup[longitude]', String(pickupLng));
  } else {
    url.searchParams.set('pickup', 'my_location');
  }
  
  url.searchParams.set('dropoff[latitude]', String(lat));
  url.searchParams.set('dropoff[longitude]', String(lng));

  const nickname = String(dropoffNickname || '').trim();
  if (nickname) {
    url.searchParams.set('dropoff[nickname]', nickname);
  }

  return url.toString();
};

/**
 * Build Lyft deep link for ride requests
 * @see https://developer.lyft.com/docs/deeplinking
 */
export const buildLyftDeepLink = ({
  dropoffLat,
  dropoffLng,
  dropoffNickname,
  pickupLat,
  pickupLng,
} = {}) => {
  const lat = Number(dropoffLat);
  const lng = Number(dropoffLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // Lyft uses a different URL scheme
  const url = new URL('https://lyft.com/ride');
  
  // Add pickup coordinates if provided
  if (Number.isFinite(pickupLat) && Number.isFinite(pickupLng)) {
    url.searchParams.set('pickup[latitude]', String(pickupLat));
    url.searchParams.set('pickup[longitude]', String(pickupLng));
  }
  
  // Destination
  url.searchParams.set('destination[latitude]', String(lat));
  url.searchParams.set('destination[longitude]', String(lng));

  const nickname = String(dropoffNickname || '').trim();
  if (nickname) {
    url.searchParams.set('destination[address]', nickname);
  }

  return url.toString();
};

/**
 * Get all ride service deep links
 */
export const buildRideServiceLinks = ({
  dropoffLat,
  dropoffLng,
  dropoffNickname,
  pickupLat,
  pickupLng,
} = {}) => {
  const params = { dropoffLat, dropoffLng, dropoffNickname, pickupLat, pickupLng };
  
  return {
    uber: buildUberDeepLink(params),
    lyft: buildLyftDeepLink(params),
  };
};

/**
 * Estimated fare ranges by distance (rough approximations)
 * These are indicative only - actual fares vary by city, time, and demand
 */
export const getEstimatedFareRange = (distanceKm) => {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
  
  // Base fare + per km rate (rough US average)
  const baseFare = 2.50;
  const perKmRate = 1.50;
  const bookingFee = 2.00;
  
  const estimatedFare = baseFare + (distanceKm * perKmRate) + bookingFee;
  
  // Add surge/demand variance
  const lowEstimate = Math.max(5, Math.round(estimatedFare * 0.85));
  const highEstimate = Math.round(estimatedFare * 1.35);
  
  return {
    low: lowEstimate,
    high: highEstimate,
    currency: 'USD',
    disclaimer: 'Estimate only. Actual fare may vary.',
  };
};
