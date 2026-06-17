import { getEnv, json } from '../shopify/_utils.js';
import { createClient } from '@supabase/supabase-js';

/**
 * One-shot: seed radio_shows table with the 5 HOTMESS shows.
 * Requires SUPABASE_SERVICE_ROLE_KEY.
 * Auth: ?secret=CRON_SECRET header or x-cron-secret header.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  // Auth — require CRON_SECRET
  const secret = getEnv('CRON_SECRET');
  if (secret) {
    const provided =
      (req.headers?.['x-cron-secret']) ||
      (req.headers?.authorization?.replace(/^Bearer\s+/i, '')) ||
      new URL(`https://x${req.url}`).searchParams.get('secret');
    if (!provided || provided !== secret) {
      return json(res, 401, { error: 'Unauthorized' });
    }
  }

  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(res, 500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const shows = [
    { id: '20000000-0000-0000-0000-000000000001', title: 'Wake the Mess',              host: 'DJ Chaos',        schedule: 'Mon\u2013Fri 7\u201310am',  description: 'Start your morning with the hottest beats and queer wellness.',        slug: 'wake-the-mess' },
    { id: '20000000-0000-0000-0000-000000000002', title: 'Dial-a-Daddy / Dial-a-Darling', host: 'Papa Bear',    schedule: 'Mon\u2013Fri 3\u20135pm',   description: 'Afternoon advice, confessions and community call-ins.',               slug: 'dial-a-daddy' },
    { id: '20000000-0000-0000-0000-000000000003', title: 'Drive Time Mess',            host: 'The Collective',  schedule: 'Mon\u2013Fri 5\u20137pm',   description: 'Rush hour bangers to get you home safe.',                            slug: 'drive-time-mess' },
    { id: '20000000-0000-0000-0000-000000000004', title: 'HOTMESS Nights',             host: 'SMASH DADDYS',    schedule: 'Fri\u2013Sat 7\u201311pm',  description: 'Weekend club sets, live DJs and pre-party energy.',                  slug: 'hotmess-nights' },
    { id: '20000000-0000-0000-0000-000000000005', title: 'Hand-in-Hand',               host: 'HNH Collective',  schedule: 'Sun 6\u20138pm',             description: 'Sunday wind-down. Deep house, mental health check-ins and chill.',   slug: 'hand-in-hand' },
  ];

  const { error, count } = await client
    .from('radio_shows')
    .upsert(shows, { onConflict: 'id', count: 'exact' });

  if (error) {
    return json(res, 500, { error: error.message });
  }

  return json(res, 200, { ok: true, upserted: count ?? shows.length, shows: shows.map(s => s.title) });
}
