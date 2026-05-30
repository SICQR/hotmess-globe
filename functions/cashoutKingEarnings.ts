import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all venues where user is king
    const userKingdoms = await base44.asServiceRole.entities.VenueKing.filter({
      king_email: user.email
    });

    if (userKingdoms.length === 0) {
      return Response.json({ 
        error: 'You are not a king of any venue',
        message: 'Scan more beacons to claim a kingdom!'
      }, { status: 404 });
    }

    let totalSweatEarned = 0;
    const cashouts = [];

    // Process each kingdom
    for (const kingdom of userKingdoms) {
      // Check if crown has expired
      if (new Date(kingdom.expires_at) < new Date()) {
        continue; // Skip expired kingdoms
      }

      // Get uncollected tax
      const checkIns = await base44.asServiceRole.entities.BeaconCheckIn.filter({
        beacon_id: kingdom.venue_id
      });

      const uncollectedCheckIns = checkIns.filter(ci => 
        new Date(ci.created_date) > new Date(kingdom.crowned_at) &&
        ci.user_email !== kingdom.king_email
      );

      const taxAmount = uncollectedCheckIns.length;

      if (taxAmount > 0) {
        // Convert to Sweat Coins
        totalSweatEarned += taxAmount;

        // Update kingdom tax collected
        await base44.asServiceRole.entities.VenueKing.update(kingdom.id, {
          total_tax_collected: (kingdom.total_tax_collected || 0) + taxAmount
        });

        cashouts.push({
          venue_name: kingdom.venue_name,
          venue_id: kingdom.venue_id,
          tax_collected: taxAmount,
          sweat_earned: taxAmount
        });
      }
    }

    if (totalSweatEarned === 0) {
      return Response.json({
        success: true,
        message: 'No earnings to cashout',
        kingdoms: userKingdoms.length
      });
    }

    // Add Sweat Coins to user
    const currentSweat = user.sweat_coins || 0;
    const newSweat = currentSweat + totalSweatEarned;

    await base44.asServiceRole.entities.User.update(user.id, {
      sweat_coins: newSweat
    });

    // Log transaction
    await base44.asServiceRole.entities.SweatCoin.create({
      user_email: user.email,
      amount: totalSweatEarned,
      transaction_type: 'king_tax',
      reference_type: 'cashout',
      metadata: {
        kingdoms_count: cashouts.length,
        venues: cashouts.map(c => c.venue_name)
      },
      balance_after: newSweat
    });

    // Notify user
    await base44.asServiceRole.entities.NotificationOutbox.create({
      user_email: user.email,
      notification_type: 'king_crowned',
      title: 'King Earnings Cashed Out',
      message: `You earned ${totalSweatEarned} Sweat Coins from ${cashouts.length} venues!`,
      metadata: {
        sweat_earned: totalSweatEarned,
        cashouts
      }
    });

    return Response.json({
      success: true,
      total_sweat_earned: totalSweatEarned,
      new_balance: newSweat,
      kingdoms_cashed: cashouts.length,
      details: cashouts
    });

  } catch (error) {
    console.error('King cashout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});