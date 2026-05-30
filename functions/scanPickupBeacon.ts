import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { qr_code, lat, lng, photo_url } = await req.json();

    if (!qr_code || !lat || !lng) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find pickup beacon
    const beacons = await base44.asServiceRole.entities.PickupBeacon.filter({ 
      pickup_qr_code: qr_code 
    });

    if (beacons.length === 0) {
      return Response.json({ error: 'Pickup beacon not found' }, { status: 404 });
    }

    const beacon = beacons[0];

    // Verify user is the buyer
    if (beacon.buyer_email !== user.email) {
      return Response.json({ error: 'Only buyer can scan pickup beacon' }, { status: 403 });
    }

    // Check if already picked up
    if (beacon.status === 'picked_up') {
      return Response.json({ error: 'Already picked up' }, { status: 400 });
    }

    // Check if expired
    if (new Date(beacon.expires_at) < new Date()) {
      await base44.asServiceRole.entities.PickupBeacon.update(beacon.id, {
        status: 'expired'
      });
      return Response.json({ error: 'Pickup beacon expired' }, { status: 400 });
    }

    // Verify location proximity (within 50 meters)
    const distance = calculateDistance(lat, lng, beacon.lat, beacon.lng);
    if (distance > 50) {
      return Response.json({ 
        error: 'Too far from pickup location', 
        distance_meters: Math.round(distance)
      }, { status: 400 });
    }

    // Update pickup beacon to picked up
    await base44.asServiceRole.entities.PickupBeacon.update(beacon.id, {
      status: 'picked_up',
      picked_up_at: new Date().toISOString(),
      pickup_photo_url: photo_url
    });

    // Update order status to completed
    await base44.asServiceRole.entities.Order.update(beacon.order_id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    // Release escrow funds to seller
    const sellerUser = await base44.asServiceRole.entities.User.filter({ email: beacon.seller_email });
    
    if (beacon.escrow_amount_xp > 0) {
      const newXP = (sellerUser[0]?.xp || 0) + beacon.escrow_amount_xp;
      await base44.asServiceRole.entities.User.update(sellerUser[0].id, { xp: newXP });
      
      await base44.asServiceRole.entities.XPLedger.create({
        user_email: beacon.seller_email,
        amount: beacon.escrow_amount_xp,
        transaction_type: 'purchase',
        reference_id: beacon.order_id,
        reference_type: 'order',
        balance_after: newXP
      });
    }

    if (beacon.escrow_amount_sweat > 0) {
      const newSweat = (sellerUser[0]?.sweat_coins || 0) + beacon.escrow_amount_sweat;
      await base44.asServiceRole.entities.User.update(sellerUser[0].id, { sweat_coins: newSweat });
      
      await base44.asServiceRole.entities.SweatCoin.create({
        user_email: beacon.seller_email,
        amount: beacon.escrow_amount_sweat,
        transaction_type: 'payout',
        reference_id: beacon.order_id,
        reference_type: 'order',
        balance_after: newSweat
      });
    }

    // Notify seller
    await base44.asServiceRole.entities.NotificationOutbox.create({
      user_email: beacon.seller_email,
      notification_type: 'product_sold',
      title: 'Product Picked Up - Funds Released',
      message: `Your product has been picked up and funds have been released to your account.`,
      metadata: {
        order_id: beacon.order_id,
        xp_released: beacon.escrow_amount_xp,
        sweat_released: beacon.escrow_amount_sweat
      }
    });

    return Response.json({
      success: true,
      message: 'Pickup confirmed, funds released to seller',
      order_completed: true
    });

  } catch (error) {
    console.error('Pickup scan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Haversine formula to calculate distance between two lat/lng points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
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