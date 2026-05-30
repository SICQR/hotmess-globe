import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { city } = await req.json();

    if (!city) {
      return Response.json({ error: 'Missing city parameter' }, { status: 400 });
    }

    // Get all active Right Now statuses in the city
    const rightNowUsers = await base44.asServiceRole.entities.RightNowStatus.filter({
      active: true
    });

    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Filter by city and active status
    const cityUsers = rightNowUsers.filter(rn => {
      const user = allUsers.find(u => u.email === rn.user_email);
      return user && user.city === city && new Date(rn.expires_at) > new Date();
    });

    // Grid size: 500m cells
    const GRID_SIZE = 0.005; // ~500m at London latitude
    const zoneMap = {};

    // Snap users to grid cells
    cityUsers.forEach(rn => {
      const user = allUsers.find(u => u.email === rn.user_email);
      if (!user || !user.last_location) return;

      const gridLat = Math.floor(user.last_location.lat / GRID_SIZE) * GRID_SIZE;
      const gridLng = Math.floor(user.last_location.lng / GRID_SIZE) * GRID_SIZE;
      const key = `${gridLat},${gridLng}`;

      if (!zoneMap[key]) {
        zoneMap[key] = {
          lat: gridLat,
          lng: gridLng,
          users: [],
          is_super_blob: false
        };
      }

      zoneMap[key].users.push({
        email: user.email,
        name: user.full_name,
        cold_vibe: rn.cold_vibe || false
      });
    });

    // Mark super blobs (10+ users)
    const zones = Object.values(zoneMap).map(zone => {
      if (zone.users.length >= 10) {
        zone.is_super_blob = true;
        zone.pulse_intensity = Math.min(zone.users.length / 20, 1);
      }
      return zone;
    });

    // Generate AI vibe tooltips for super blobs
    const superBlobs = zones.filter(z => z.is_super_blob);
    for (const blob of superBlobs) {
      const vibePrompt = `Generate a 2-word vibe description for a zone with ${blob.users.length} active users. Make it edgy, urban, and atmospheric. Examples: "HEAVY PULSE", "NEON SWARM", "SHADOW TIDE". Respond with just the 2 words in ALL CAPS.`;
      
      const vibe = await base44.integrations.Core.InvokeLLM({
        prompt: vibePrompt
      });

      blob.vibe_tooltip = vibe.trim();
    }

    return Response.json({
      success: true,
      city,
      total_zones: zones.length,
      super_blobs: superBlobs.length,
      zones
    });

  } catch (error) {
    console.error('Zone blob calculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});