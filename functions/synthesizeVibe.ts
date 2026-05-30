import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's sweat history
    const [scans, purchases, listens, xpLedger] = await Promise.all([
      base44.entities.BeaconCheckIn.filter({ user_email: user.email }, '-created_date', 50),
      base44.entities.Order.filter({ buyer_email: user.email }, '-created_date', 30),
      base44.entities.BeaconCheckIn.filter({ 
        user_email: user.email,
        beacon_mode: 'radio'
      }, '-created_date', 20),
      base44.entities.XPLedger.filter({ user_email: user.email }, '-created_date', 100)
    ]);

    // Build sweat history summary
    const sweatHistory = {
      total_scans: scans.length,
      total_purchases: purchases.length,
      total_listens: listens.length,
      scan_locations: scans.map(s => s.beacon_title),
      purchase_categories: purchases.map(p => p.metadata?.category || 'general'),
      listen_genres: listens.map(l => l.metadata?.genre || 'electronic'),
      xp_sources: xpLedger.reduce((acc, ledger) => {
        acc[ledger.transaction_type] = (acc[ledger.transaction_type] || 0) + 1;
        return acc;
      }, {})
    };

    // Use AI to synthesize vibe
    const prompt = `You are the HOTMESS OS Vibe Synthesizer. Analyze this user's "Sweat History" and generate a dynamic character profile.

User Activity:
- Total Scans: ${sweatHistory.total_scans}
- Total Purchases: ${sweatHistory.total_purchases}
- Top Scan Locations: ${sweatHistory.scan_locations.slice(0, 5).join(', ')}
- Purchase Categories: ${sweatHistory.purchase_categories.slice(0, 5).join(', ')}
- XP Sources: ${Object.keys(sweatHistory.xp_sources).join(', ')}

Generate a vibe profile in ALL CAPS with this structure:
1. A 2-3 word VIBE TITLE (e.g., "HEAVY-PULSE ARCHITECT", "SHADOW MERCHANT", "NEON HUNTER")
2. A single sentence description (max 15 words)
3. An archetype (choose from: architect, hunter, collector, explorer, socialite, merchant, guardian, alchemist)
4. 3-5 dynamic traits (single words in caps)
5. A hex color that matches the vibe energy

Format your response as JSON with keys: title, description, archetype, traits (array), color`;

    const vibeData = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          archetype: { type: 'string' },
          traits: { type: 'array', items: { type: 'string' } },
          color: { type: 'string' }
        }
      }
    });

    // Check if vibe already exists
    const existingVibes = await base44.entities.UserVibe.filter({ user_email: user.email });
    
    const vibeRecord = {
      user_email: user.email,
      vibe_title: vibeData.title,
      vibe_description: vibeData.description,
      vibe_color: vibeData.color,
      archetype: vibeData.archetype.toLowerCase(),
      traits: vibeData.traits,
      sweat_history: sweatHistory,
      last_synthesized: new Date().toISOString(),
      synthesis_count: (existingVibes[0]?.synthesis_count || 0) + 1
    };

    if (existingVibes.length > 0) {
      await base44.asServiceRole.entities.UserVibe.update(existingVibes[0].id, vibeRecord);
    } else {
      await base44.asServiceRole.entities.UserVibe.create(vibeRecord);
    }

    // Update user with sweat_coins if not set
    if (!user.sweat_coins) {
      await base44.auth.updateMe({ sweat_coins: 0 });
    }

    return Response.json({
      success: true,
      vibe: vibeRecord
    });

  } catch (error) {
    console.error('Vibe synthesis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});