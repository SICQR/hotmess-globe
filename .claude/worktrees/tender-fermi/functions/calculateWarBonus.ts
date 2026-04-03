import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { venue_id, base_xp } = await req.json();

    if (!venue_id || !base_xp) {
      return Response.json({ error: 'Missing venue_id or base_xp' }, { status: 400 });
    }

    // Check if venue has active war
    const venueKings = await base44.asServiceRole.entities.VenueKing.filter({ venue_id });
    if (venueKings.length === 0) {
      return Response.json({
        success: true,
        multiplier: 1,
        final_xp: base_xp,
        war_active: false
      });
    }

    const venueKing = venueKings[0];

    // Check if war is active and not expired
    if (!venueKing.war_active) {
      return Response.json({
        success: true,
        multiplier: 1,
        final_xp: base_xp,
        war_active: false
      });
    }

    const warEndTime = new Date(venueKing.war_started_at).getTime() + (24 * 60 * 60 * 1000);
    const now = Date.now();

    if (now > warEndTime) {
      // War has expired, deactivate it
      await base44.asServiceRole.entities.VenueKing.update(venueKing.id, {
        war_active: false
      });

      return Response.json({
        success: true,
        multiplier: 1,
        final_xp: base_xp,
        war_active: false,
        war_expired: true
      });
    }

    // War is active - apply 2x multiplier
    const multiplier = 2;
    const finalXP = base_xp * multiplier;
    const timeRemaining = Math.ceil((warEndTime - now) / (60 * 60 * 1000));

    return Response.json({
      success: true,
      multiplier,
      final_xp: finalXP,
      war_active: true,
      bonus_xp: finalXP - base_xp,
      time_remaining_hours: timeRemaining,
      war_started_by: venueKing.war_started_by
    });

  } catch (error) {
    console.error('War bonus calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});