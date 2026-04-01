import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  return createClient(url, key);
}

export async function requireAIAccess(req, feature) {
  const supabase = getServiceClient();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: 'Invalid token', status: 401 };

  // Get tier from memberships table
  const { data: membership } = await supabase
    .from('memberships')
    .select('tier')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  const tier = membership?.tier || 'mess';

  // Get limits for this tier
  const { data: limits } = await supabase
    .from('ai_tier_limits')
    .select('*')
    .eq('tier', tier)
    .single();

  if (!limits) return { error: 'Config error', status: 500 };

  const limitKey = feature === 'chat' ? 'chat_daily' : `${feature}_monthly`;
  const featureLimit = limits[limitKey];

  if (featureLimit === 0) {
    return {
      error: `Upgrade to use ${feature}. Not available on your current plan.`,
      status: 403,
      tier,
      upgradeRequired: true
    };
  }

  // Count usage this period
  let usageCount = 0;
  if (featureLimit !== -1) {
    const periodStart = feature === 'chat'
      ? new Date(new Date().setHours(0,0,0,0)).toISOString()
      : new Date(new Date(new Date().setDate(1)).setHours(0,0,0,0)).toISOString();

    const { count } = await supabase
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('feature', feature)
      .gte('used_at', periodStart);

    usageCount = count || 0;

    if (usageCount >= featureLimit) {
      return {
        error: `You've reached your ${feature} limit for this period. Upgrade for more.`,
        status: 429,
        tier,
        usageCount,
        featureLimit,
        upgradeRequired: true
      };
    }
  }

  return { user, tier, limits, usageCount, featureLimit };
}

export async function logAIUsage(userId, feature, tier, tokensUsed, model) {
  try {
    const supabase = getServiceClient();
    await supabase.from('ai_usage').insert({
      user_id: userId,
      feature,
      tier_at_use: tier,
      tokens_used: tokensUsed || null,
      model: model || 'gpt-4o'
    });
  } catch {
    // Non-blocking — logging failures don't break the feature
  }
}
