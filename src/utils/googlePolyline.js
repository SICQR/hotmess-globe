// Minimal Google encoded polyline decoder.
// Spec: https://developers.google.com/maps/documentation/utilities/polylinealgorithm

export const decodeGooglePolyline = (encoded) => {
  const str = String(encoded || '');
  if (!str) return [];

  let index = 0;
  const len = str.length;
  let lat = 0;
  let lng = 0;
  const points = [];

  const decodeSigned = () => {
    let result = 0;
    let shift = 0;

    while (index < len) {
      const b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
      if (b < 0x20) break;
    }

    const delta = (result & 1) ? ~(result >> 1) : (result >> 1);
    return delta;
  };

  while (index < len) {
    lat += decodeSigned();
    lng += decodeSigned();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
};
