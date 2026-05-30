import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { venue_id } = await req.json();

    if (!venue_id) {
      return Response.json({ error: 'Missing venue_id' }, { status: 400 });
    }

    // Get venue king record
    const venueKings = await base44.asServiceRole.entities.VenueKing.filter({ venue_id });
    if (venueKings.length === 0) {
      return Response.json({ error: 'No king found for this venue' }, { status: 404 });
    }

    const venueKing = venueKings[0];

    // Check if user is trying to challenge
    if (venueKing.king_email === user.email) {
      return Response.json({ error: 'You are already the king, cannot declare war on yourself' }, { status: 400 });
    }

    // Check if war is already active
    if (venueKing.war_active) {
      const warTimeRemaining = new Date(venueKing.war_started_at).getTime() + (24 * 60 * 60 * 1000) - Date.now();
      if (warTimeRemaining > 0) {
        return Response.json({ 
          error: 'War already active',
          time_remaining_hours: Math.ceil(warTimeRemaining / (60 * 60 * 1000))
        }, { status: 400 });
      }
    }

    // Calculate war cost (10 XP to declare war)
    const warCost = 10;
    if (user.xp < warCost) {
      return Response.json({ 
        error: 'Insufficient XP to declare war',
        required: warCost,
        current: user.xp
      }, { status: 400 });
    }

    // Deduct war cost from user
    const newXP = user.xp - warCost;
    await base44.asServiceRole.entities.User.update(user.id, { xp: newXP });

    // Log XP transaction
    await base44.asServiceRole.entities.XPLedger.create({
      user_email: user.email,
      amount: -warCost,
      transaction_type: 'war_trigger',
      reference_id: venue_id,
      reference_type: 'venue',
      balance_after: newXP
    });

    // Activate war for 24 hours
    await base44.asServiceRole.entities.VenueKing.update(venueKing.id, {
      war_active: true,
      war_started_at: new Date().toISOString(),
      war_started_by: user.email
    });

    // Notify current king
    await base44.asServiceRole.entities.NotificationOutbox.create({
      user_email: venueKing.king_email,
      notification_type: 'war_declared',
      title: 'War Declared!',
      message: `${user.full_name} has declared war for ${venueKing.venue_name}! 2x XP for 24 hours.`,
      metadata: {
        venue_id,
        challenger_email: user.email,
        challenger_name: user.full_name
      }
    });

    // Notify challenger
    await base44.asServiceRole.entities.NotificationOutbox.create({
      user_email: user.email,
      notification_type: 'war_declared',
      title: 'War Declared!',
      message: `You declared war on ${venueKing.venue_name}! Earn 2x XP for the next 24 hours.`,
      metadata: {
        venue_id,
        king_name: venueKing.king_name
      }
    });

    return Response.json({
      success: true,
      message: 'War declared - 2x XP multiplier active for 24 hours',
      venue: venueKing.venue_name,
      war_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      xp_spent: warCost
    });

  } catch (error) {
    console.error('War declaration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});