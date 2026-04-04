import { createClient } from '@supabase/supabase-js';

const isRunningOnVercel = () => !!(process.env.VERCEL || process.env.VERCEL_ENV);

const getHeader = (req, name) => {
  const value = req?.headers?.[name] || req?.headers?.[name.toLowerCase()] || req?.headers?.[name.toUpperCase()];
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
};

const isVercelCronRequest = (req) => {
  const value = getHeader(req, 'x-vercel-cron');
  if (String(value || '') === '1') return true;
  const auth = getHeader(req, 'authorization');
  const secret = process.env.CRON_SECRET;
  if (auth && secret && auth === `Bearer ${secret}`) return true;
  return false;
};

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const allowVercelCron = isRunningOnVercel() && isVercelCronRequest(req);

  if (cronSecret && !allowVercelCron) {
    const authHeader = getHeader(req, 'authorization');
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!cronSecret && !allowVercelCron) {
    const vercelEnv = process.env.VERCEL_ENV || '';
    const nodeEnv = process.env.NODE_ENV || '';
    if (vercelEnv === 'production' || nodeEnv === 'production') {
      return res.status(401).json({ error: 'CRON_SECRET not configured' });
    }
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
