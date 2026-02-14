/**
 * HOTMESS AI Scene Scout API
 * 
 * POST /api/ai/scene-scout
 * 
 * AI-powered nightlife recommendations based on user preferences.
 */

import { createClient } from '@supabase/supabase-js';

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      _supabase = createClient(url, key);
    }
  }
  return _supabase;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Scoring weights
const SCORING = {
  MUSIC_MATCH: 30,
  TRIBE_MATCH: 25,
  HOTMESS_ACTIVITY: 20,
  TIME_BONUS: 10,      // After 10pm
  DISTANCE_BONUS: 10,  // Within 5km
  FEATURED_BONUS: 5    // Platform featured events
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://hotmess-globe-fix.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userEmail, date, location } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'Missing userEmail' });
    }

    // Default to today
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get user preferences
    const { data: user, error: userError } = await getSupabase()
      .from('User')
      .select('music_taste, tribes, interests, city')
      .eq('email', userEmail)
      .single();

    if (userError) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get events for the date
    const dayStart = new Date(targetDate);
    dayStart.setHours(18, 0, 0); // Start from 6pm
    const dayEnd = new Date(targetDate);
    dayEnd.setDate(dayEnd.getDate() + 1);
    dayEnd.setHours(8, 0, 0); // Until 8am next day

    const { data: events, error: eventsError } = await getSupabase()
      .from('Beacon')
      .select('*')
      .eq('beacon_type', 'event')
      .gte('start_date', dayStart.toISOString())
      .lte('start_date', dayEnd.toISOString())
      .order('start_date', { ascending: true });

    if (eventsError) {
    }

    // Get venues from knowledge base
    const { data: venues, error: venuesError } = await getSupabase()
      .from('gay_world_knowledge')
      .select('*')
      .eq('category', 'venue')
      .eq('location_city', user?.city || 'London');

    if (venuesError) {
    }

    // Get HOTMESS activity (users with Right Now or RSVP'd)
    const { data: hotmessActivity } = await getSupabase()
      .from('right_now_status')
      .select('destination, count')
      .eq('status', 'active')
      .not('destination', 'is', null);

    // Score and rank picks
    const picks = [];

    // Score events
    for (const event of events || []) {
      const score = calculateEventScore(event, user, hotmessActivity);
      const reasons = getMatchReasons(event, user, hotmessActivity);
      
      picks.push({
        id: event.id,
        type: 'event',
        title: event.title,
        description: event.description?.slice(0, 100),
        score,
        reasons,
        start_time: event.start_date,
        metadata: {
          area: event.location_area || event.metadata?.area,
          venue: event.location_name,
          type: event.metadata?.event_type
        }
      });
    }

    // Score venues (for general recommendations)
    for (const venue of venues || []) {
      const score = calculateVenueScore(venue, user, hotmessActivity);
      if (score >= 40) { // Only include if reasonable match
        const reasons = getVenueReasons(venue, user, hotmessActivity);
        
        picks.push({
          id: venue.id,
          type: 'venue',
          title: venue.title,
          description: venue.content?.slice(0, 100),
          score,
          reasons,
          metadata: {
            area: venue.location_area,
            type: venue.metadata?.type,
            vibe: venue.metadata?.vibe
          }
        });
      }
    }

    // Sort by score and take top 5
    picks.sort((a, b) => b.score - a.score);
    const topPicks = picks.slice(0, 5);

    // Generate AI narrative
    let narrative = null;
    if (OPENAI_API_KEY && topPicks.length > 0) {
      narrative = await generateNarrative(topPicks, user, targetDate);
    } else if (topPicks.length > 0) {
      // Fallback narrative
      const topPick = topPicks[0];
      narrative = `Based on your vibe, I'd check out ${topPick.title}. ${topPick.reasons[0] || 'Looks like a good match.'}`;
    } else {
      narrative = "Not much happening tonight that matches your preferences. Maybe explore something new?";
    }

    // Get activity summary
    const activitySummary = (hotmessActivity || [])
      .slice(0, 5)
      .map(a => ({
        location: a.destination,
        count: a.count
      }));

    return res.status(200).json({
      date: targetDate,
      picks: topPicks,
      narrative,
      hotmessActivity: activitySummary,
      userPreferences: {
        musicTaste: user?.music_taste || [],
        tribes: user?.tribes || []
      }
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function calculateEventScore(event, user, activity) {
  let score = 0;

  // Music match
  const eventMusic = event.metadata?.music || [];
  const userMusic = user?.music_taste || [];
  if (eventMusic.some(m => userMusic.includes(m))) {
    score += SCORING.MUSIC_MATCH;
  }

  // Tribe/vibe match
  const eventVibe = event.metadata?.vibe || [];
  const userTribes = user?.tribes || [];
  if (eventVibe.some(v => userTribes.includes(v))) {
    score += SCORING.TRIBE_MATCH;
  }

  // HOTMESS activity
  const venueActivity = activity?.find(a => 
    a.destination?.toLowerCase().includes(event.location_name?.toLowerCase())
  );
  if (venueActivity && venueActivity.count >= 5) {
    score += SCORING.HOTMESS_ACTIVITY;
  }

  // Time bonus (after 10pm)
  const startHour = new Date(event.start_date).getHours();
  if (startHour >= 22 || startHour < 6) {
    score += SCORING.TIME_BONUS;
  }

  // Featured bonus
  if (event.beacon_tier === 'featured' || event.beacon_tier === 'spotlight') {
    score += SCORING.FEATURED_BONUS;
  }

  return Math.min(score, 100);
}

function calculateVenueScore(venue, user, activity) {
  let score = 30; // Base score for venues

  // Music match
  const venueMusic = venue.metadata?.music || [];
  const userMusic = user?.music_taste || [];
  if (venueMusic.some(m => userMusic.includes(m))) {
    score += 20;
  }

  // Vibe match
  const venueVibe = venue.metadata?.vibe || [];
  const userTribes = user?.tribes || [];
  if (venueVibe.some(v => userTribes.includes(v))) {
    score += 20;
  }

  // Activity
  const locationActivity = activity?.find(a => 
    a.destination?.toLowerCase().includes(venue.location_area?.toLowerCase())
  );
  if (locationActivity) {
    score += Math.min(locationActivity.count * 2, 15);
  }

  return Math.min(score, 100);
}

function getMatchReasons(event, user, activity) {
  const reasons = [];

  const eventMusic = event.metadata?.music || [];
  const userMusic = user?.music_taste || [];
  const matchedMusic = eventMusic.filter(m => userMusic.includes(m));
  if (matchedMusic.length > 0) {
    reasons.push(`Matches your ${matchedMusic[0]} taste`);
  }

  const venueActivity = activity?.find(a => 
    a.destination?.toLowerCase().includes(event.location_name?.toLowerCase())
  );
  if (venueActivity && venueActivity.count >= 3) {
    reasons.push(`${venueActivity.count} HOTMESS users heading there`);
  }

  if (event.beacon_tier === 'featured') {
    reasons.push('Featured event');
  }

  return reasons;
}

function getVenueReasons(venue, user, activity) {
  const reasons = [];

  const venueVibe = venue.metadata?.vibe || [];
  const userTribes = user?.tribes || [];
  const matchedVibe = venueVibe.filter(v => userTribes.includes(v));
  if (matchedVibe.length > 0) {
    reasons.push(`${matchedVibe[0]} friendly`);
  }

  if (venue.metadata?.type) {
    reasons.push(`${venue.metadata.type} in ${venue.location_area}`);
  }

  return reasons;
}

async function generateNarrative(picks, user, date) {
  try {
    const prompt = `Generate a brief nightlife recommendation for a gay man in London.

Date: ${date}
User's music taste: ${user?.music_taste?.join(', ') || 'varied'}
User's tribes: ${user?.tribes?.join(', ') || 'not specified'}

Top picks for tonight:
${picks.slice(0, 3).map((p, i) => `${i + 1}. ${p.title} (${p.type}) - ${p.reasons.join(', ')}`).join('\n')}

Rules:
- Max 3 sentences
- Be specific about timing suggestions
- Match HOTMESS voice: bold, cheeky, knowledgeable
- Include specific venue/event names
- If relevant, suggest a progression (pre-drinks → main event)

Example: "Based on your vibe, I'd hit Horse Meat first around 9pm for warm-up drinks, then migrate to XXL around 1am when it really kicks off."`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are a knowledgeable gay nightlife guide for London. Be specific and helpful.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}
