import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check: require a valid Supabase session via Bearer token
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
  } catch {
    return res.status(401).json({ error: 'Auth verification failed' });
  }

  const { city, zoom } = req.query;
  try {
    let tilesQuery = supabase.from('globe_heat_tiles').select('city, tile_id, intensity, sources, window_end').eq('k_threshold_met', true).order('window_end', { ascending: false });
    if (city) tilesQuery = tilesQuery.eq('city', city);
    const { data: tiles } = await tilesQuery.limit(zoom && parseInt(zoom) < 8 ? 20 : 100);
    const latestTiles = {};
    for (const t of tiles || []) { if (!latestTiles[t.city]) latestTiles[t.city] = t; }
    const { data: radioSignals } = await supabase.from('radio_signals').select('city, signal_type, intensity, expires_at').gt('expires_at', new Date().toISOString()).limit(20);
    res.status(200).json({ tiles: Object.values(latestTiles), radio_signals: radioSignals || [], meta: { aggregated: true, delayed_minutes: 5 }});
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
}
