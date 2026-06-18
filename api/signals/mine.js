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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // NEVER select geog_precise
  const { data, error } = await supabase
    .from('person_signals')
    .select('id, signal_type, fuzz_radius_m, area_hint, vibe_note, expires_at, freshness')
    .eq('user_id', user.id)
    .eq('state', 'active')
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(200).json({ active: false });
  }

  return res.status(200).json({
    active: true,
    signal: {
      id: data.id,
      signal_type: data.signal_type,
      fuzz_radius_m: data.fuzz_radius_m,
      area_hint: data.area_hint,
      vibe_note: data.vibe_note,
      expires_at: data.expires_at,
      freshness: data.freshness,
    },
  });
}
