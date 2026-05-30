import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id, lat, lng } = await req.json();

    if (!order_id || !lat || !lng) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch order to verify seller
    const order = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    if (order.length === 0) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = order[0];

    // Verify user is the seller
    if (orderData.seller_email !== user.email) {
      return Response.json({ error: 'Only seller can create pickup beacon' }, { status: 403 });
    }

    // Generate unique QR code
    const qrCode = `PICKUP-${order_id}-${Date.now()}`;

    // Calculate expiry (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Create pickup beacon
    const pickupBeacon = await base44.asServiceRole.entities.PickupBeacon.create({
      order_id,
      seller_email: orderData.seller_email,
      buyer_email: orderData.buyer_email,
      product_id: orderData.product_id,
      lat,
      lng,
      pickup_qr_code: qrCode,
      status: 'ready_for_pickup',
      dropped_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      escrow_amount_xp: orderData.total_price_xp || 0,
      escrow_amount_gbp: orderData.total_price_gbp || 0,
      escrow_amount_sweat: orderData.total_price_sweat || 0
    });

    // Update order status to awaiting_pickup
    await base44.asServiceRole.entities.Order.update(order_id, {
      status: 'awaiting_pickup'
    });

    // Notify buyer
    await base44.asServiceRole.entities.NotificationOutbox.create({
      user_email: orderData.buyer_email,
      notification_type: 'product_sold',
      title: 'Product Ready for Pickup',
      message: `Your order is ready! Head to the pickup location and scan the QR code to complete the transaction.`,
      metadata: {
        order_id,
        pickup_beacon_id: pickupBeacon.id,
        lat,
        lng
      }
    });

    return Response.json({
      success: true,
      pickup_beacon: pickupBeacon,
      qr_code: qrCode
    });

  } catch (error) {
    console.error('Pickup beacon creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});