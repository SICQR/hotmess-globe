/**
 * POST /api/meetpoint/suggest
 * Chunk 05 — Meet Flow
 *
 * Logic:
 * 1. If both users have same venue in right_now_posts → suggest that venue
 * 2. Else → compute geographic midpoint from last_lat/last_lng
 *
 * Returns: { lat, lng, label, source: 'shared_venue'|'midpoint' }
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'unauthenticated' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'invalid_token' });

  const { thread_id, user_b_id } = req.body;
  if (!user_b_id) return res.status(400).json({ error: 'user_b_id required' });

  try {
    // Load both profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, last_lat, last_lng, display_name')
      .in('id', [user.id, user_b_id]);

    const me = profiles?.find(p => p.id === user.id);
    const them = profiles?.find(p => p.id === user_b_id);
    if (!me || !them) return res.status(404).json({ error: 'profiles_not_found' });

    // Check for shared venue in right_now_posts
    const { data: beacons } = await supabaseAdmin
      .from('right_now_posts')
      .select('user_id, venue_name, lat, lng')
      .in('user_id', [user.id, user_b_id])
      .not('venue_name', 'is', null)
      .gt('ends_at', new Date().toISOString());

    const myBeacon = beacons?.find(b => b.user_id === user.id);
    const theirBeacon = beacons?.find(b => b.user_id === user_b_id);

    if (myBeacon?.venue_name && theirBeacon?.venue_name &&
        myBeacon.venue_name === theirBeacon.venue_name) {
      return res.status(200).json({
        lat: myBeacon.lat,
        lng: myBeacon.lng,
        label: myBeacon.venue_name,
        source: 'shared_venue',
      });
    }

    // Fall back to geographic midpoint
    const lat1 = me.last_lat || myBeacon?.lat;
    const lng1 = me.last_lng || myBeacon?.lng;
    const lat2 = them.last_lat || theirBeacon?.lat;
    const lng2 = them.last_lng || theirBeacon?.lng;

    if (!lat1 || !lat2) {
      return res.status(200).json({
        lat: null, lng: null, label: 'Somewhere nearby', source: 'no_location',
      });
    }

    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;

    return res.status(200).json({
      lat: midLat,
      lng: midLng,
      label: 'Midpoint',
      source: 'midpoint',
    });
  } catch (err) {
    console.error('[meetpoint/suggest]', err);
    return res.status(500).json({ error: 'internal', message: err.message });
  }
}
