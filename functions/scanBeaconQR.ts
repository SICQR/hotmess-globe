import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { qr_code, lat, lng } = await req.json();

    if (!qr_code) {
      return Response.json({ error: 'Missing qr_code' }, { status: 400 });
    }

    // Parse QR code - format: "BEACON-{beacon_id}" or "PICKUP-{order_id}-{timestamp}"
    if (qr_code.startsWith('PICKUP-')) {
      // Handle pickup beacon scan
      return Response.json({ 
        redirect: 'scanPickupBeacon',
        qr_code 
      });
    }

    if (!qr_code.startsWith('BEACON-')) {
      return Response.json({ error: 'Invalid QR code format' }, { status: 400 });
    }

    const beacon_id = qr_code.replace('BEACON-', '');

    // Get beacon
    const beacons = await base44.asServiceRole.entities.Beacon.filter({ id: beacon_id });
    if (beacons.length === 0) {
      return Response.json({ error: 'Beacon not found' }, { status: 404 });
    }

    const beacon = beacons[0];

    // Verify proximity if coordinates provided
    if (lat && lng && beacon.lat && beacon.lng) {
      const distance = calculateDistance(lat, lng, beacon.lat, beacon.lng);
      if (distance > 100) {
        return Response.json({ 
          error: 'Too far from beacon',
          distance_meters: Math.round(distance),
          beacon_location: { lat: beacon.lat, lng: beacon.lng }
        }, { status: 400 });
      }
    }

    // Award XP for scan
    let xpReward = beacon.xp_scan || 10;

    // Check war multiplier
    const venueKings = await base44.asServiceRole.entities.VenueKing.filter({ 
      venue_id: beacon_id 
    });
    
    if (venueKings.length > 0 && venueKings[0].war_active) {
      const warEndTime = new Date(venueKings[0].war_started_at).getTime() + (24 * 60 * 60 * 1000);
      if (Date.now() < warEndTime) {
        xpReward *= 2;
      }
    }

    const newXP = (user.xp || 0) + xpReward;
    await base44.asServiceRole.entities.User.update(user.id, { xp: newXP });

    await base44.asServiceRole.entities.XPLedger.create({
      user_email: user.email,
      amount: xpReward,
      transaction_type: 'scan',
      reference_id: beacon_id,
      reference_type: 'beacon',
      balance_after: newXP
    });

    // Create check-in
    const checkIn = await base44.asServiceRole.entities.BeaconCheckIn.create({
      user_email: user.email,
      beacon_id,
      beacon_title: beacon.title,
      xp_earned: xpReward
    });

    return Response.json({
      success: true,
      beacon,
      check_in_id: checkIn.id,
      xp_earned: xpReward,
      new_xp_total: newXP
    });

  } catch (error) {
    console.error('QR scan error:', error);
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