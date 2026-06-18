import '../_silence-dep0169.js';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: true } };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return error ? null : user;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { lng, lat, area_hint, vibe_note, duration_hours } = req.body || {};

  // Validate lng/lat
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return res.status(400).json({ error: 'lng and lat must be numbers' });
  }
  if (lat < -90 || lat > 90) {
    return res.status(400).json({ error: 'lat must be between -90 and 90' });
  }
  if (lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'lng must be between -180 and 180' });
  }

  // Rate limit: max 3 broadcasts per user per 24h
  const { count, error: countError } = await supabase
    .from('person_signals')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (countError) {
    return res.status(500).json({ error: 'Rate limit check failed' });
  }
  if ((count ?? 0) >= 3) {
    return res.status(429).json({ error: 'Rate limit exceeded: max 3 broadcasts per 24 hours' });
  }

  // Call broadcast_signal RPC
  const { data, error } = await supabase.rpc('broadcast_signal', {
    p_user_id: user.id,
    p_lng: lng,
    p_lat: lat,
    p_area_hint: area_hint ?? null,
    p_vibe_note: vibe_note ?? null,
    ...(duration_hours != null ? { p_duration_hours: duration_hours } : {}),
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const row = Array.isArray(data) ? data[0] : data;

  // NEVER return geog_precise or user_id
  return res.status(200).json({
    id: row.id,
    signal_type: row.signal_type,
    fuzz_radius_m: row.fuzz_radius_m,
    area_hint: row.area_hint,
    vibe_note: row.vibe_note,
    freshness: 'fresh',
    expires_at: row.expires_at,
  });
}
