import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  const { cityId } = req.body;
  try {
    const { data, error } = await supabase.rpc('approve_cadence_escalation', { p_city_id: cityId, p_admin_id: user.id });
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
}
