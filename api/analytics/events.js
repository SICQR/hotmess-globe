/**
 * Analytics Events API
 * 
 * Receives batched analytics events from the frontend.
 * Stores in Supabase for analysis and forwards to external providers.
 */

import { createClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client
let _supabase = null;

const getSupabase = () => {
  if (_supabase) return _supabase;
  
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.warn('[Analytics] Missing Supabase configuration');
    return null;
  }
  
  _supabase = createClient(url, key);
  return _supabase;
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'No events provided' });
    }

    // Process and validate events
    const processedEvents = events.map(event => ({
      event_name: event.event,
      properties: event.properties || {},
      user_id: event.userId || null,
      session_id: event.sessionId || null,
      timestamp: event.properties?.timestamp || new Date().toISOString(),
      url: event.properties?.url || null,
      user_agent: event.properties?.userAgent || null,
      created_at: new Date().toISOString(),
    }));

    // Store in Supabase (if table exists)
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error: dbError } = await supabase
          .from('analytics_events')
          .insert(processedEvents);

        if (dbError) {
          console.warn('Failed to store analytics events:', dbError.message);
          // Don't fail the request - events are also logged
        }
      } catch (dbErr) {
        console.warn('Analytics DB error:', dbErr.message);
      }
    }

    // Log for debugging/monitoring
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Received ${events.length} analytics events`);
    }

    // Forward to external services if configured
    await forwardToExternalServices(processedEvents);

    return res.status(200).json({ 
      success: true, 
      received: events.length 
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Forward events to external analytics services
 */
async function forwardToExternalServices(events) {
  const promises = [];

  // Mixpanel
  if (process.env.MIXPANEL_TOKEN) {
    const mixpanelEvents = events.map(e => ({
      event: e.event_name,
      properties: {
        ...e.properties,
        token: process.env.MIXPANEL_TOKEN,
        distinct_id: e.user_id || e.session_id || 'anonymous',
        time: new Date(e.timestamp).getTime() / 1000,
      },
    }));

    promises.push(
      fetch('https://api.mixpanel.com/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mixpanelEvents),
      }).catch(err => console.warn('Mixpanel forward error:', err.message))
    );
  }

  // Amplitude
  if (process.env.AMPLITUDE_API_KEY) {
    const amplitudeEvents = events.map(e => ({
      event_type: e.event_name,
      user_id: e.user_id || undefined,
      device_id: e.session_id || undefined,
      event_properties: e.properties,
      time: new Date(e.timestamp).getTime(),
    }));

    promises.push(
      fetch('https://api2.amplitude.com/2/httpapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.AMPLITUDE_API_KEY,
          events: amplitudeEvents,
        }),
      }).catch(err => console.warn('Amplitude forward error:', err.message))
    );
  }

  await Promise.all(promises);
}
