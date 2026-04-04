import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data, error } = await supabase.rpc('grant_referral_rewards');

  if (error) {
    console.error('grant_referral_rewards error:', error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ rewarded: data || 0 });
}
