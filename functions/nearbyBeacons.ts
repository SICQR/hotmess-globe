import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lat, lng, radius_km = 5, kind } = await req.json();

    if (!lat || !lng) {
      return Response.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    // Get all active beacons
    let beacons = await base44.asServiceRole.entities.Beacon.filter({ active: true });

    // Filter by kind if specified
    if (kind) {
      beacons = beacons.filter(b => b.kind === kind);
    }

    // Calculate distances and filter by radius
    const nearbyBeacons = beacons
      .map(beacon => {
        if (!beacon.lat || !beacon.lng) return null;
        
        const distance = calculateDistance(lat, lng, beacon.lat, beacon.lng);
        
        if (distance <= radius_km * 1000) {
          return {
            ...beacon,
            distance_meters: Math.round(distance),
            distance_km: (distance / 1000).toFixed(2)
          };
        }
        
        return null;
      })
      .filter(b => b !== null)
      .sort((a, b) => a.distance_meters - b.distance_meters);

    return Response.json({
      success: true,
      count: nearbyBeacons.length,
      beacons: nearbyBeacons
    });

  } catch (error) {
    console.error('Nearby beacons error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}