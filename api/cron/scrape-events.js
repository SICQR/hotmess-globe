/**
 * Cron Job: Scrape Events
 * Automated event scraping from configured sources
 * 
 * Runs: Daily at 3 AM UTC
 * Schedule in vercel.json: "0 3 * * *"
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Get sources from environment
const getEventSources = () => {
  try {
    const sourcesJson = process.env.EVENT_SCRAPER_SOURCES_JSON;
    if (!sourcesJson) return {};
    return JSON.parse(sourcesJson);
  } catch {
    return {};
  }
};

const MAX_EVENTS_PER_CITY = parseInt(process.env.EVENT_SCRAPER_MAX_EVENTS_PER_CITY || '15', 10);

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.EVENT_SCRAPER_CRON_SECRET || process.env.CRON_SECRET;
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const sources = getEventSources();

  const results = {
    cities: [],
    totalEvents: 0,
    errors: [],
  };

  console.log('[Cron/Events] Starting event scrape...');

  try {
    for (const [city, feedUrls] of Object.entries(sources)) {
      const cityResult = {
        city,
        eventsFound: 0,
        eventsAdded: 0,
        errors: [],
      };

      for (const feedUrl of feedUrls) {
        try {
          console.log(`[Cron/Events] Fetching ${feedUrl} for ${city}...`);
          
          const response = await fetch(feedUrl, {
            headers: { 'User-Agent': 'HotmessEventScraper/1.0' },
            signal: AbortSignal.timeout(30000), // 30 second timeout
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const contentType = response.headers.get('content-type') || '';
          let events = [];

          if (contentType.includes('application/json')) {
            const data = await response.json();
            events = Array.isArray(data) ? data : data.events || data.items || [];
          } else {
            // Try to parse as JSON anyway
            const text = await response.text();
            try {
              const data = JSON.parse(text);
              events = Array.isArray(data) ? data : data.events || data.items || [];
            } catch {
              console.warn(`[Cron/Events] Non-JSON response from ${feedUrl}`);
              continue;
            }
          }

          cityResult.eventsFound += events.length;

          // Process events (limit per city)
          const eventsToProcess = events.slice(0, MAX_EVENTS_PER_CITY - cityResult.eventsAdded);

          for (const event of eventsToProcess) {
            try {
              // Normalize event data
              const normalizedEvent = {
                title: event.title || event.name || 'Untitled Event',
                description: event.description || event.summary || '',
                city: city,
                venue: event.venue || event.location?.name || '',
                address: event.address || event.location?.address || '',
                start_time: event.start_time || event.startTime || event.date || new Date().toISOString(),
                end_time: event.end_time || event.endTime || null,
                image_url: event.image_url || event.image || event.thumbnail || '',
                external_url: event.url || event.link || '',
                external_id: event.id || event.external_id || `${feedUrl}:${event.title}`,
                source: feedUrl,
                category: event.category || event.type || 'party',
                price_info: event.price || event.ticket_info || null,
                scraped_at: new Date().toISOString(),
              };

              // Upsert event (avoid duplicates by external_id)
              const { error: upsertError } = await supabase
                .from('events')
                .upsert(normalizedEvent, { 
                  onConflict: 'external_id',
                  ignoreDuplicates: false,
                });

              if (upsertError) {
                console.warn(`[Cron/Events] Failed to upsert event: ${upsertError.message}`);
              } else {
                cityResult.eventsAdded++;
              }
            } catch (eventError) {
              cityResult.errors.push(`Event processing: ${eventError.message}`);
            }
          }

        } catch (fetchError) {
          cityResult.errors.push(`${feedUrl}: ${fetchError.message}`);
          console.error(`[Cron/Events] Failed to fetch ${feedUrl}:`, fetchError.message);
        }
      }

      results.cities.push(cityResult);
      results.totalEvents += cityResult.eventsAdded;
    }

    // Clean up old scraped events (older than 30 days past)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await supabase
      .from('events')
      .delete()
      .lt('start_time', thirtyDaysAgo.toISOString())
      .not('source', 'is', null); // Only delete scraped events

    console.log(`[Cron/Events] Complete. Added ${results.totalEvents} events across ${results.cities.length} cities.`);

    return res.status(200).json({
      success: true,
      results,
    });

  } catch (error) {
    console.error('[Cron/Events] Fatal error:', error);
    return res.status(500).json({
      error: 'Event scraping failed',
      details: error.message,
    });
  }
}
