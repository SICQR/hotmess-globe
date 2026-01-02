import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { beacon_id, lat, lng, photo_url, note } = await req.json();

    if (!beacon_id) {
      return Response.json({ error: 'Missing beacon_id' }, { status: 400 });
    }

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
          distance_meters: Math.round(distance)
        }, { status: 400 });
      }
    }

    // Calculate XP reward with war multiplier
    let xpReward = beacon.xp_scan || 10;
    
    // Check for active war
    const venueKings = await base44.asServiceRole.entities.VenueKing.filter({ 
      venue_id: beacon_id 
    });
    
    if (venueKings.length > 0 && venueKings[0].war_active) {
      const warEndTime = new Date(venueKings[0].war_started_at).getTime() + (24 * 60 * 60 * 1000);
      if (Date.now() < warEndTime) {
        xpReward *= 2;
      }
    }

    // Award XP
    const newXP = (user.xp || 0) + xpReward;
    await base44.asServiceRole.entities.User.update(user.id, { xp: newXP });

    // Log XP
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
      photo_url,
      note,
      xp_earned: xpReward
    });

    return Response.json({
      success: true,
      check_in_id: checkIn.id,
      xp_earned: xpReward,
      new_xp_total: newXP
    });

  } catch (error) {
    console.error('Check-in error:', error);
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