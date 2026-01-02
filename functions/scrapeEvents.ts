import { base44 } from '@base44/sdk';

/**
 * Automated Event Scraper
 * Scrapes LGBT nightlife events from the web and creates/updates beacons
 * 
 * Schedule this to run daily via Base44 dashboard
 */
export default async function scrapeEvents(request) {
  const { cities = ['London', 'Manchester', 'Brighton'], daysAhead = 14 } = request.body || {};
  
  const results = {
    created: 0,
    updated: 0,
    errors: []
  };

  try {
    for (const city of cities) {
      console.log(`Scraping events for ${city}...`);
      
      // Use AI to find events
      const prompt = `You are a specialist LGBT nightlife researcher. Find upcoming LGBT events, clubs, parties, and social gatherings in ${city} for the next ${daysAhead} days.

For each event provide:
- Event name
- Venue name
- Full address
- Date and time (format: YYYY-MM-DD HH:mm)
- Description (2-3 sentences)
- Event type (club_night, drag_show, party, social, pride_event)
- Ticket URL if available
- Estimated capacity if known

Focus on LGBT-specific venues and events. Use multiple sources to verify accuracy.`;

      const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  venue_name: { type: 'string' },
                  address: { type: 'string' },
                  date_time: { type: 'string' },
                  description: { type: 'string' },
                  event_type: { type: 'string' },
                  ticket_url: { type: 'string' },
                  capacity: { type: 'number' }
                }
              }
            }
          }
        }
      });

      // Get coordinates for the city
      const cityCoords = await getCityCoordinates(city);

      // Process each event
      for (const event of response.events || []) {
        try {
          // Check if event already exists (by name and date)
          const existing = await base44.asServiceRole.entities.Beacon.filter({
            title: event.name,
            city: city,
            kind: 'event'
          });

          const eventData = {
            title: event.name,
            description: event.description,
            kind: 'event',
            lat: cityCoords.lat,
            lng: cityCoords.lng,
            city: city,
            venue_name: event.venue_name,
            event_date: new Date(event.date_time).toISOString(),
            mode: mapEventTypeToMode(event.event_type),
            active: true,
            status: 'published',
            is_verified: true,
            ticket_url: event.ticket_url || null,
            capacity: event.capacity || null,
            xp_scan: 50 // Default XP for checking in
          };

          if (existing.length > 0) {
            // Update existing event
            await base44.asServiceRole.entities.Beacon.update(existing[0].id, eventData);
            results.updated++;
          } else {
            // Create new event
            await base44.asServiceRole.entities.Beacon.create(eventData);
            results.created++;
          }
        } catch (err) {
          results.errors.push(`Failed to process ${event.name}: ${err.message}`);
        }
      }
    }

    return {
      success: true,
      message: `Scraped events for ${cities.join(', ')}`,
      results
    };
  } catch (error) {
    console.error('Event scraping failed:', error);
    return {
      success: false,
      error: error.message,
      results
    };
  }
}

/**
 * Map event types to beacon modes
 */
function mapEventTypeToMode(eventType) {
  const mapping = {
    'club_night': 'crowd',
    'drag_show': 'crowd',
    'party': 'crowd',
    'social': 'hookup',
    'pride_event': 'crowd',
    'meetup': 'hookup'
  };
  return mapping[eventType] || 'crowd';
}

/**
 * Get coordinates for a city (simplified - in production use geocoding API)
 */
async function getCityCoordinates(city) {
  const coords = {
    'London': { lat: 51.5074, lng: -0.1278 },
    'Manchester': { lat: 53.4808, lng: -2.2426 },
    'Brighton': { lat: 50.8225, lng: -0.1372 },
    'Birmingham': { lat: 52.4862, lng: -1.8904 },
    'Glasgow': { lat: 55.8642, lng: -4.2518 },
    'Edinburgh': { lat: 55.9533, lng: -3.1883 }
  };
  return coords[city] || { lat: 51.5074, lng: -0.1278 };
}