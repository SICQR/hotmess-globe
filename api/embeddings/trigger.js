/**
 * Embedding Trigger Service
 * 
 * Triggers embedding generation when profile text fields change.
 * Can be called from profile update endpoints or as a cron job.
 * 
 * POST /api/embeddings/trigger
 * - body.user_id: specific user to update (admin only)
 * - body.batch: true to process multiple users needing updates
 */

import { createClient } from '@supabase/supabase-js';
import { generateUserEmbeddings } from './index.js';

const getEnv = (key, fallbacks = []) => {
  let val = process.env[key];
  if (val) return val;
  for (const fb of fallbacks) {
    val = process.env[fb];
    if (val) return val;
  }
  return null;
};

const json = (res, status, body) => {
  res.status(status).json(body);
  return res;
};

const getBearerToken = (req) => {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
};

const getSupabaseClients = () => {
  const supabaseUrl = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', ['VITE_SUPABASE_ANON_KEY']);
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Supabase not configured' };
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const serviceClient = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

  return { anonClient, serviceClient, error: null };
};

/**
 * Find users who need embedding updates
 * (profile text changed since last embedding generation)
 */
const findUsersNeedingUpdates = async (serviceClient, limit = 50) => {
  // Find users whose profile updated_at is after their embedding updated_at
  // or who have no embeddings at all
  const { data, error } = await serviceClient
    .from('User')
    .select(`
      id,
      bio,
      updated_at,
      profile_embeddings(updated_at)
    `)
    .not('bio', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit * 2); // Fetch extra to filter

  if (error) {
    console.error('[embeddings/trigger] Failed to find users:', error);
    return [];
  }

  // Filter to users needing updates
  const needingUpdates = (data || []).filter(user => {
    const embeddingUpdatedAt = user.profile_embeddings?.[0]?.updated_at;
    if (!embeddingUpdatedAt) return true; // No embeddings yet
    return new Date(user.updated_at) > new Date(embeddingUpdatedAt);
  });

  return needingUpdates.slice(0, limit).map(u => u.id);
};

/**
 * Process batch of users
 */
const processBatch = async (serviceClient, openaiKey, userIds) => {
  const results = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const userId of userIds) {
    try {
      const result = await generateUserEmbeddings({ userId, serviceClient, openaiKey });
      results.processed++;
      
      if (result.error) {
        results.errors.push({ userId, error: result.error });
      } else if (result.updated) {
        results.updated++;
      } else {
        results.skipped++;
      }

      // Rate limiting: small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      results.errors.push({ userId, error: err.message });
    }
  }

  return results;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { anonClient, serviceClient, error: clientError } = getSupabaseClients();

  if (clientError || !serviceClient) {
    return json(res, 500, { error: 'Service role not configured' });
  }

  const openaiKey = getEnv('OPENAI_API_KEY');
  if (!openaiKey) {
    return json(res, 500, { error: 'OpenAI API key not configured' });
  }

  // Check for cron secret or admin auth
  const cronSecret = getEnv('CRON_SECRET');
  const providedSecret = req.headers['x-cron-secret'] || req.query.secret;
  const isCron = cronSecret && providedSecret === cronSecret;

  let isAdmin = false;
  let currentUserId = null;

  if (!isCron) {
    const token = getBearerToken(req);
    if (!token) {
      return json(res, 401, { error: 'Missing authorization' });
    }

    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return json(res, 401, { error: 'Invalid token' });
    }

    // Get user info
    const { data: dbUser } = await serviceClient
      .from('User')
      .select('id, email')
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
      .single();

    if (!dbUser) {
      return json(res, 404, { error: 'User not found' });
    }

    currentUserId = dbUser.id;

    // Check if admin - first check database role, then fallback to ADMIN_EMAILS
    const { data: userProfile } = await serviceClient
      .from('User')
      .select('role')
      .eq('id', dbUser.id)
      .single();
    
    if (userProfile?.role === 'admin') {
      isAdmin = true;
    } else {
      // Fallback to ADMIN_EMAILS env var
      const adminEmails = (getEnv('ADMIN_EMAILS') || '').split(',').map(e => e.trim().toLowerCase());
      isAdmin = adminEmails.includes(dbUser.email?.toLowerCase());
    }
  }

  const body = req.body || {};
  const { user_id: targetUserId, batch, limit = 50 } = body;

  // Batch processing (cron or admin only)
  if (batch) {
    if (!isCron && !isAdmin) {
      return json(res, 403, { error: 'Batch processing requires admin access' });
    }

    const userIds = await findUsersNeedingUpdates(serviceClient, Math.min(limit, 100));
    
    if (userIds.length === 0) {
      return json(res, 200, { message: 'No users need embedding updates', processed: 0 });
    }

    const results = await processBatch(serviceClient, openaiKey, userIds);
    return json(res, 200, results);
  }

  // Single user update
  let userIdToProcess = targetUserId;

  // If specific user_id provided, must be admin or cron
  if (targetUserId && targetUserId !== currentUserId) {
    if (!isCron && !isAdmin) {
      return json(res, 403, { error: 'Cannot update other users embeddings' });
    }
  } else if (!targetUserId) {
    userIdToProcess = currentUserId;
  }

  if (!userIdToProcess) {
    return json(res, 400, { error: 'No user_id provided' });
  }

  const result = await generateUserEmbeddings({
    userId: userIdToProcess,
    serviceClient,
    openaiKey,
  });

  if (result.error) {
    return json(res, 500, result);
  }

  return json(res, 200, result);
}

// Export for programmatic use
export { findUsersNeedingUpdates, processBatch };
