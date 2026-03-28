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

    // Verify user is the current king
    if (venueKing.king_email !== user.email) {
      return Response.json({ error: 'Only the current king can collect tax' }, { status: 403 });
    }

    // Get all check-ins at this venue since king was crowned
    const checkIns = await base44.asServiceRole.entities.BeaconCheckIn.filter({
      beacon_id: venue_id
    });

    const taxableCheckIns = checkIns.filter(ci => 
      new Date(ci.created_date) > new Date(venueKing.crowned_at) &&
      ci.user_email !== venueKing.king_email
    );

    const taxAmount = taxableCheckIns.length; // 1 XP per check-in

    if (taxAmount === 0) {
      return Response.json({ 
        success: true, 
        message: 'No tax to collect',
        tax_collected: 0
      });
    }

    // Convert XP tax to Sweat Coins (1:1 ratio)
    const sweatEarned = taxAmount;
    const currentSweat = user.sweat_coins || 0;
    const newSweat = currentSweat + sweatEarned;

    await base44.asServiceRole.entities.User.update(user.id, {
      sweat_coins: newSweat
    });

    // Log Sweat Coin transaction
    await base44.asServiceRole.entities.SweatCoin.create({
      user_email: user.email,
      amount: sweatEarned,
      transaction_type: 'king_tax',
      reference_id: venue_id,
      reference_type: 'venue',
      metadata: {
        check_ins_taxed: taxableCheckIns.length
      },
      balance_after: newSweat
    });

    // Update venue king total tax collected
    await base44.asServiceRole.entities.VenueKing.update(venueKing.id, {
      total_tax_collected: (venueKing.total_tax_collected || 0) + taxAmount
    });

    // Notify king
    await base44.asServiceRole.entities.NotificationOutbox.create({
      user_email: user.email,
      notification_type: 'king_crowned',
      title: 'Tax Collected',
      message: `You collected ${sweatEarned} Sweat Coins from ${taxableCheckIns.length} check-ins at ${venueKing.venue_name}`,
      metadata: {
        venue_id,
        sweat_earned: sweatEarned,
        check_ins: taxableCheckIns.length
      }
    });

    return Response.json({
      success: true,
      tax_collected: taxAmount,
      sweat_earned: sweatEarned,
      new_balance: newSweat,
      check_ins_taxed: taxableCheckIns.length
    });

  } catch (error) {
    console.error('Passive tax collection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});