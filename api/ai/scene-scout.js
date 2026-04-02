/**
 * HOTMESS AI Scene Scout API
 *
 * POST /api/ai/scene-scout
 *
 * AI-powered nightlife recommendations based on user preferences.
 */

import { createClient } from '@supabase/supabase-js';
import { requireAIAccess, logAIUsage } from './_auth.js';

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

const SCORING = {
  MUSIC_MATCH: 30,
  TRIBE_MATCH: 25,
  HOTMESS_ACTIVITY: 20,
  TIME_BONUS: 10,
  DISTANCE_BONUS: 10,
  FEATURED_BONUS: 5
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://hotmessldn.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth gate
  const access = await requireAIAccess(req, 'scene_scout');
  if (access.error) {
    return res.status(access.status).json({
      error: access.error,
      upgradeRequired: access.upgradeRequired || false
    });
  }
  const { user, tier } = access;

  try {
    const { date, location } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get user preferences from profiles table (not dead User table)
    const { data: profile, error: profileError } = await getSupabase()
      .from('profiles')
      .select('city, public_attributes')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const attrs = profile?.public_attributes || {};
    // Build user object — vibe/scenes/looking_for are canonical keys from VibeScreen
    const userPref = {
      music_taste: attrs.vibe ? [attrs.vibe] : (attrs.music_taste || []),
      tribes: attrs.scenes || attrs.tribes || [],
      interests: attrs.looking_for || attrs.interests || [],
      city: profile?.city || 'London',
    };

    const dayStart = new Date(targetDate);
    dayStart.setHours(18, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setDate(dayEnd.getDate() + 1);
    dayEnd.setHours(8, 0, 0);

    const { data: events } = await getSupabase()
      .from('beacons')
      .select('*')
      .eq('kind', 'event')
      .gte('event_start', dayStart.toISOString())
      .lte('event_start', dayEnd.toISOString())
      .order('event_start', { ascending: true });

    const { data: venues } = await getSupabase()
      .from('gay_world_knowledge')
      .select('*')
      .eq('category', 'venue')
      .eq('location_city', userPref.city);

    const { data: hotmessActivity } = await getSupabase()
      .from('right_now_status')
      .select('destination, count')
      .gte('expires_at', new Date().toISOString())
      .not('destination', 'is', null);

    const picks = [];

    for (const event of events || []) {
      const score = calculateEventScore(event, userPref, hotmessActivity);
      const reasons = getMatchReasons(event, userPref, hotmessActivity);
      picks.push({
        id: event.id,
        type: 'event',
        title: event.title,
        description: event.description?.slice(0, 100),
        score,
        reasons,
        start_time: event.event_start,
        metadata: {
          area: event.location_area || event.metadata?.area,
          venue: event.location_name,
          type: event.metadata?.event_type
        }
      });
    }

    for (const venue of venues || []) {
      const score = calculateVenueScore(venue, userPref, hotmessActivity);
      if (score >= 40) {
        const reasons = getVenueReasons(venue, userPref, hotmessActivity);
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

    picks.sort((a, b) => b.score - a.score);
    const topPicks = picks.slice(0, 5);

    let narrative = null;
    if (OPENAI_API_KEY && topPicks.length > 0) {
      narrative = await generateNarrative(topPicks, userPref, targetDate);
    } else if (topPicks.length > 0) {
      const topPick = topPicks[0];
      narrative = `Based on your vibe, I'd check out ${topPick.title}. ${topPick.reasons[0] || 'Looks like a good match.'}`;
    } else {
      narrative = "Not much happening tonight that matches your preferences. Maybe explore something new?";
    }

    const activitySummary = (hotmessActivity || [])
      .slice(0, 5)
      .map(a => ({ location: a.destination, count: a.count }));

    // Log usage (non-blocking)
    await logAIUsage(user.id, 'scene_scout', tier, null, 'gpt-4o');

    return res.status(200).json({
      date: targetDate,
      picks: topPicks,
      narrative,
      hotmessActivity: activitySummary,
      userPreferences: {
        musicTaste: userPref.music_taste,
        tribes: userPref.tribes
      }
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function calculateEventScore(event, user, activity) {
  let score = 0;
  const eventMusic = event.metadata?.music || [];
  const userMusic = user?.music_taste || [];
  if (eventMusic.some(m => userMusic.includes(m))) score += SCORING.MUSIC_MATCH;

  const eventVibe = event.metadata?.vibe || [];
  const userTribes = user?.tribes || [];
  if (eventVibe.some(v => userTribes.includes(v))) score += SCORING.TRIBE_MATCH;

  const venueActivity = activity?.find(a =>
    a.destination?.toLowerCase().includes(event.location_name?.toLowerCase())
  );
  if (venueActivity && venueActivity.count >= 5) score += SCORING.HOTMESS_ACTIVITY;

  const startHour = new Date(event.event_start).getHours();
  if (startHour >= 22 || startHour < 6) score += SCORING.TIME_BONUS;

  if (event.beacon_tier === 'featured' || event.beacon_tier === 'spotlight') score += SCORING.FEATURED_BONUS;

  return Math.min(score, 100);
}

function calculateVenueScore(venue, user, activity) {
  let score = 30;
  const venueMusic = venue.metadata?.music || [];
  const userMusic = user?.music_taste || [];
  if (venueMusic.some(m => userMusic.includes(m))) score += 20;

  const venueVibe = venue.metadata?.vibe || [];
  const userTribes = user?.tribes || [];
  if (venueVibe.some(v => userTribes.includes(v))) score += 20;

  const locationActivity = activity?.find(a =>
    a.destination?.toLowerCase().includes(venue.location_area?.toLowerCase())
  );
  if (locationActivity) score += Math.min(locationActivity.count * 2, 15);

  return Math.min(score, 100);
}

function getMatchReasons(event, user, activity) {
  const reasons = [];
  const eventMusic = event.metadata?.music || [];
  const userMusic = user?.music_taste || [];
  const matchedMusic = eventMusic.filter(m => userMusic.includes(m));
  if (matchedMusic.length > 0) reasons.push(`Matches your ${matchedMusic[0]} taste`);

  const venueActivity = activity?.find(a =>
    a.destination?.toLowerCase().includes(event.location_name?.toLowerCase())
  );
  if (venueActivity && venueActivity.count >= 3) reasons.push(`${venueActivity.count} HOTMESS users heading there`);

  if (event.beacon_tier === 'featured') reasons.push('Featured event');
  return reasons;
}

function getVenueReasons(venue, user, activity) {
  const reasons = [];
  const venueVibe = venue.metadata?.vibe || [];
  const userTribes = user?.tribes || [];
  const matchedVibe = venueVibe.filter(v => userTribes.includes(v));
  if (matchedVibe.length > 0) reasons.push(`${matchedVibe[0]} friendly`);
  if (venue.metadata?.type) reasons.push(`${venue.metadata.type} in ${venue.location_area}`);
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
- If relevant, suggest a progression (pre-drinks → main event)`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
