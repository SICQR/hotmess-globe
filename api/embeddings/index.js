/**
 * Embedding Service API
 * 
 * Generates and stores vector embeddings for semantic text matching
 * in the match probability scoring system.
 * 
 * Endpoints:
 * - POST /api/embeddings - Generate embeddings for the current user's profile
 * - GET /api/embeddings - Get current user's embeddings status
 */

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// Environment helpers
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

// Initialize Supabase clients
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
 * Generate a hash of text content for cache invalidation
 */
const hashText = (text) => {
  if (!text || typeof text !== 'string') return null;
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex').slice(0, 16);
};

/**
 * Combine text fields into a single string for embedding
 */
const prepareTextForEmbedding = (text) => {
  if (!text || typeof text !== 'string') return '';
  // Clean and normalize the text
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 8000); // OpenAI token limit safety
};

/**
 * Call OpenAI embeddings API
 */
const generateEmbedding = async (text, apiKey) => {
  if (!text || text.trim().length === 0) {
    return { embedding: null, error: null };
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[embeddings] OpenAI API error:', response.status, errorBody);
      return { embedding: null, error: `OpenAI API error: ${response.status}` };
    }

    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      return { embedding: null, error: 'Invalid embedding response' };
    }

    return { embedding, error: null };
  } catch (err) {
    console.error('[embeddings] Failed to generate embedding:', err);
    return { embedding: null, error: err.message };
  }
};

/**
 * Combine multiple embeddings with weights
 */
const combineEmbeddings = (embeddings, weights) => {
  const validEmbeddings = embeddings.filter(e => e && Array.isArray(e));
  const validWeights = weights.slice(0, validEmbeddings.length);

  if (validEmbeddings.length === 0) return null;

  const totalWeight = validWeights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = validWeights.map(w => w / totalWeight);

  const combined = new Array(EMBEDDING_DIMENSIONS).fill(0);

  for (let i = 0; i < validEmbeddings.length; i++) {
    const embedding = validEmbeddings[i];
    const weight = normalizedWeights[i];
    for (let j = 0; j < EMBEDDING_DIMENSIONS; j++) {
      combined[j] += embedding[j] * weight;
    }
  }

  // Normalize the combined vector
  const magnitude = Math.sqrt(combined.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let j = 0; j < EMBEDDING_DIMENSIONS; j++) {
      combined[j] /= magnitude;
    }
  }

  return combined;
};

/**
 * Format embedding array for PostgreSQL vector type
 */
const formatVectorForPg = (embedding) => {
  if (!embedding || !Array.isArray(embedding)) return null;
  return `[${embedding.join(',')}]`;
};

/**
 * Generate and store embeddings for a user's profile
 */
const generateUserEmbeddings = async ({ userId, serviceClient, openaiKey }) => {
  // Fetch user's profile data (public + private)
  const { data: publicProfile, error: publicError } = await serviceClient
    .from('User')
    .select('id, bio')
    .eq('id', userId)
    .single();

  if (publicError) {
    console.error('[embeddings] Failed to fetch public profile:', publicError);
    return { error: 'Failed to fetch profile' };
  }

  const { data: privateProfile } = await serviceClient
    .from('user_private_profile')
    .select('turn_ons, turn_offs, safer_sex_notes')
    .eq('user_id', userId)
    .single();

  // Extract text fields
  const bio = publicProfile?.bio || '';
  const turnOns = privateProfile?.turn_ons || '';
  const turnOffs = privateProfile?.turn_offs || '';
  const saferSexNotes = privateProfile?.safer_sex_notes || '';

  // Generate hashes for cache invalidation
  const bioHash = hashText(bio);
  const turnOnsHash = hashText(turnOns);
  const turnOffsHash = hashText(turnOffs);
  const saferSexNotesHash = hashText(saferSexNotes);

  // Check if embeddings need updating
  const { data: existingEmbeddings } = await serviceClient
    .from('profile_embeddings')
    .select('bio_hash, turn_ons_hash, turn_offs_hash, safer_sex_notes_hash')
    .eq('user_id', userId)
    .single();

  const needsUpdate = !existingEmbeddings ||
    existingEmbeddings.bio_hash !== bioHash ||
    existingEmbeddings.turn_ons_hash !== turnOnsHash ||
    existingEmbeddings.turn_offs_hash !== turnOffsHash ||
    existingEmbeddings.safer_sex_notes_hash !== saferSexNotesHash;

  if (!needsUpdate) {
    return { updated: false, message: 'Embeddings are up to date' };
  }

  // Generate embeddings for each field
  const results = {
    bio: null,
    turnOns: null,
    turnOffs: null,
    saferSexNotes: null,
    errors: [],
  };

  if (bio) {
    const { embedding, error } = await generateEmbedding(prepareTextForEmbedding(bio), openaiKey);
    if (error) results.errors.push(`bio: ${error}`);
    else results.bio = embedding;
  }

  if (turnOns) {
    const { embedding, error } = await generateEmbedding(prepareTextForEmbedding(turnOns), openaiKey);
    if (error) results.errors.push(`turn_ons: ${error}`);
    else results.turnOns = embedding;
  }

  if (turnOffs) {
    const { embedding, error } = await generateEmbedding(prepareTextForEmbedding(turnOffs), openaiKey);
    if (error) results.errors.push(`turn_offs: ${error}`);
    else results.turnOffs = embedding;
  }

  if (saferSexNotes) {
    const { embedding, error } = await generateEmbedding(prepareTextForEmbedding(saferSexNotes), openaiKey);
    if (error) results.errors.push(`safer_sex_notes: ${error}`);
    else results.saferSexNotes = embedding;
  }

  // Combine embeddings with weights (bio: 40%, turn_ons: 25%, turn_offs: 25%, safer_sex: 10%)
  const combinedEmbedding = combineEmbeddings(
    [results.bio, results.turnOns, results.turnOffs, results.saferSexNotes],
    [0.4, 0.25, 0.25, 0.1]
  );

  // Upsert embeddings to database
  const upsertData = {
    user_id: userId,
    bio_embedding: formatVectorForPg(results.bio),
    turn_ons_embedding: formatVectorForPg(results.turnOns),
    turn_offs_embedding: formatVectorForPg(results.turnOffs),
    safer_sex_notes_embedding: formatVectorForPg(results.saferSexNotes),
    combined_embedding: formatVectorForPg(combinedEmbedding),
    bio_hash: bioHash,
    turn_ons_hash: turnOnsHash,
    turn_offs_hash: turnOffsHash,
    safer_sex_notes_hash: saferSexNotesHash,
    embedding_model: EMBEDDING_MODEL,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await serviceClient
    .from('profile_embeddings')
    .upsert(upsertData, { onConflict: 'user_id' });

  if (upsertError) {
    console.error('[embeddings] Failed to save embeddings:', upsertError);
    return { error: 'Failed to save embeddings', details: upsertError.message };
  }

  // Invalidate match score cache for this user
  await serviceClient.rpc('invalidate_match_score_cache', { p_user_id: userId }).catch(() => {});

  return {
    updated: true,
    fieldsProcessed: {
      bio: !!results.bio,
      turnOns: !!results.turnOns,
      turnOffs: !!results.turnOffs,
      saferSexNotes: !!results.saferSexNotes,
      combined: !!combinedEmbedding,
    },
    errors: results.errors.length > 0 ? results.errors : undefined,
  };
};

/**
 * Main handler
 */
export default async function handler(req, res) {
  const { anonClient, serviceClient, error: clientError } = getSupabaseClients();

  if (clientError || !anonClient) {
    return json(res, 500, { error: clientError || 'Database not configured' });
  }

  // Authenticate user
  const token = getBearerToken(req);
  if (!token) {
    return json(res, 401, { error: 'Missing authorization token' });
  }

  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) {
    return json(res, 401, { error: 'Invalid token' });
  }

  // Get user's database ID
  const { data: dbUser, error: userError } = await (serviceClient || anonClient)
    .from('User')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (userError || !dbUser) {
    // Try by email as fallback
    const { data: dbUserByEmail } = await (serviceClient || anonClient)
      .from('User')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!dbUserByEmail) {
      return json(res, 404, { error: 'User profile not found' });
    }
    
    // Use the email-found user
    const userId = dbUserByEmail.id;

    if (req.method === 'GET') {
      return handleGetEmbeddings(res, serviceClient || anonClient, userId);
    }

    if (req.method === 'POST') {
      return handleGenerateEmbeddings(res, serviceClient, userId);
    }

    return json(res, 405, { error: 'Method not allowed' });
  }

  const userId = dbUser.id;

  if (req.method === 'GET') {
    return handleGetEmbeddings(res, serviceClient || anonClient, userId);
  }

  if (req.method === 'POST') {
    return handleGenerateEmbeddings(res, serviceClient, userId);
  }

  return json(res, 405, { error: 'Method not allowed' });
}

/**
 * GET - Check embedding status
 */
async function handleGetEmbeddings(res, client, userId) {
  const { data, error } = await client
    .from('profile_embeddings')
    .select('bio_hash, turn_ons_hash, turn_offs_hash, safer_sex_notes_hash, embedding_model, updated_at')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return json(res, 500, { error: 'Failed to fetch embeddings' });
  }

  if (!data) {
    return json(res, 200, {
      exists: false,
      message: 'No embeddings generated yet',
    });
  }

  return json(res, 200, {
    exists: true,
    hasEmbeddings: {
      bio: !!data.bio_hash,
      turnOns: !!data.turn_ons_hash,
      turnOffs: !!data.turn_offs_hash,
      saferSexNotes: !!data.safer_sex_notes_hash,
    },
    model: data.embedding_model,
    updatedAt: data.updated_at,
  });
}

/**
 * POST - Generate embeddings
 */
async function handleGenerateEmbeddings(res, serviceClient, userId) {
  if (!serviceClient) {
    return json(res, 500, { error: 'Service role not configured' });
  }

  const openaiKey = getEnv('OPENAI_API_KEY');
  if (!openaiKey) {
    return json(res, 500, { error: 'OpenAI API key not configured' });
  }

  const result = await generateUserEmbeddings({ userId, serviceClient, openaiKey });

  if (result.error) {
    return json(res, 500, result);
  }

  return json(res, 200, result);
}

// Export for use by other modules (e.g., profile update hooks)
export { generateUserEmbeddings, generateEmbedding, combineEmbeddings, hashText };
