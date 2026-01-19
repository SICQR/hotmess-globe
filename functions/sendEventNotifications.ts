import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sends push notifications for upcoming events near users
 * Should be called via scheduled task (hourly or daily)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin-only function - verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Get all upcoming events in next 24 hours
    const upcomingEvents = await base44.asServiceRole.entities.Beacon.filter({
      kind: 'event',
      status: 'published',
      active: true
    });

    const eventsIn24h = upcomingEvents.filter(e => {
      if (!e.event_date) return false;
      const eventDate = new Date(e.event_date);
      return eventDate > now && eventDate <= in24Hours;
    });

    if (eventsIn24h.length === 0) {
      return Response.json({ message: 'No upcoming events to notify about' });
    }

    // Get all users with location data
    const allUsers = await base44.asServiceRole.entities.User.list();
    const usersWithLocation = allUsers.filter(u => u.lat && u.lng);

    // Get all RSVPs to avoid duplicate notifications
    const allRsvps = await base44.asServiceRole.entities.EventRSVP.list();

    let notificationsSent = 0;

    // For each event, find nearby users and send notifications
    for (const event of eventsIn24h) {
      const eventRsvps = allRsvps.filter(r => r.event_id === event.id);
      const rsvpedEmails = new Set(eventRsvps.map(r => r.user_email));

      // Calculate distance for each user
      for (const targetUser of usersWithLocation) {
        // Skip if already RSVPed
        if (rsvpedEmails.has(targetUser.email)) continue;

        const distance = calculateDistance(
          event.lat, event.lng,
          targetUser.lat, targetUser.lng
        );

        // Notify if within 5km
        if (distance <= 5) {
          try {
            await base44.asServiceRole.entities.NotificationOutbox.create({
              user_email: targetUser.email,
              notification_type: 'event_nearby',
              title: '🎉 Event Near You Tonight!',
              message: `${event.title} is happening ${distance.toFixed(1)}km away. Check it out!`,
              metadata: {
                event_id: event.id,
                event_title: event.title,
                distance_km: distance,
                event_date: event.event_date
              }
            });

            notificationsSent++;
          } catch (error) {
            console.error(`Failed to send notification to ${targetUser.email}:`, error);
          }
        }
      }
    }

    return Response.json({
      success: true,
      events_processed: eventsIn24h.length,
      notifications_sent: notificationsSent
    });

  } catch (error) {
    console.error('Event notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}