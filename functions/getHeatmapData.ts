import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { city, bounds } = await req.json();

    // Get all active Right Now users
    const rightNowUsers = await base44.asServiceRole.entities.RightNowStatus.filter({
      active: true
    });

    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Filter by city if specified
    let filteredUsers = rightNowUsers.filter(rn => {
      const u = allUsers.find(user => user.email === rn.user_email);
      return u && (!city || u.city === city) && new Date(rn.expires_at) > new Date();
    });

    // Apply bounds filter if specified
    if (bounds) {
      filteredUsers = filteredUsers.filter(rn => {
        const u = allUsers.find(user => user.email === rn.user_email);
        if (!u || !u.last_location) return false;
        const { lat, lng } = u.last_location;
        return lat >= bounds.south && lat <= bounds.north && 
               lng >= bounds.west && lng <= bounds.east;
      });
    }

    // Grid size: 500m cells
    const GRID_SIZE = 0.005;
    const zoneMap = {};

    // Snap users to grid
    filteredUsers.forEach(rn => {
      const u = allUsers.find(user => user.email === rn.user_email);
      if (!u || !u.last_location) return;

      const gridLat = Math.floor(u.last_location.lat / GRID_SIZE) * GRID_SIZE;
      const gridLng = Math.floor(u.last_location.lng / GRID_SIZE) * GRID_SIZE;
      const key = `${gridLat},${gridLng}`;

      if (!zoneMap[key]) {
        zoneMap[key] = {
          lat: gridLat + GRID_SIZE / 2,
          lng: gridLng + GRID_SIZE / 2,
          users: [],
          intensity: 0,
          is_super_blob: false,
          cold_vibe_count: 0
        };
      }

      zoneMap[key].users.push({
        email: u.email,
        name: u.full_name,
        cold_vibe: rn.cold_vibe || false
      });

      if (rn.cold_vibe) {
        zoneMap[key].cold_vibe_count++;
      }
    });

    // Calculate intensity and mark super blobs
    const zones = Object.values(zoneMap).map(zone => {
      zone.intensity = Math.min(zone.users.length / 20, 1);
      
      if (zone.users.length >= 10) {
        zone.is_super_blob = true;
        zone.pulse_intensity = zone.intensity;
      }

      return zone;
    });

    // Calculate stats
    const totalUsers = filteredUsers.length;
    const superBlobCount = zones.filter(z => z.is_super_blob).length;
    const coldVibeCount = zones.reduce((sum, z) => sum + z.cold_vibe_count, 0);

    return Response.json({
      success: true,
      zones,
      stats: {
        total_active_users: totalUsers,
        total_zones: zones.length,
        super_blobs: superBlobCount,
        cold_vibe_users: coldVibeCount
      }
    });

  } catch (error) {
    console.error('Heatmap data error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});