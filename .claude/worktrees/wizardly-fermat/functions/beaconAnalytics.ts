import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { beacon_id, time_range = '7d' } = await req.json();

    if (!beacon_id) {
      return Response.json({ error: 'Missing beacon_id' }, { status: 400 });
    }

    // Calculate date threshold
    const daysBack = parseInt(time_range) || 7;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysBack);

    // Get check-ins
    const allCheckIns = await base44.asServiceRole.entities.BeaconCheckIn.filter({
      beacon_id
    });

    const recentCheckIns = allCheckIns.filter(ci => 
      new Date(ci.created_date) > threshold
    );

    // Get unique visitors
    const uniqueVisitors = [...new Set(recentCheckIns.map(ci => ci.user_email))];

    // Get beacon views
    const views = await base44.asServiceRole.entities.EventView.filter({
      event_id: beacon_id
    });

    const recentViews = views.filter(v => 
      new Date(v.created_date) > threshold
    );

    // Calculate peak hours
    const hourCounts = {};
    recentCheckIns.forEach(ci => {
      const hour = new Date(ci.created_date).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), check_ins: count }));

    // Daily breakdown
    const dailyBreakdown = {};
    recentCheckIns.forEach(ci => {
      const date = new Date(ci.created_date).toISOString().split('T')[0];
      dailyBreakdown[date] = (dailyBreakdown[date] || 0) + 1;
    });

    return Response.json({
      success: true,
      beacon_id,
      time_range,
      stats: {
        total_check_ins: allCheckIns.length,
        recent_check_ins: recentCheckIns.length,
        unique_visitors: uniqueVisitors.length,
        total_views: recentViews.length,
        peak_hours: peakHours,
        daily_breakdown: dailyBreakdown
      }
    });

  } catch (error) {
    console.error('Beacon analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});