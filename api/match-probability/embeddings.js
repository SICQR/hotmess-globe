/**
 * Embeddings Generation Endpoint
 * 
 * POST /api/match-probability/embeddings
 * 
 * Generates and stores OpenAI embeddings for a user's profile text fields.
 * Should be called when a user saves their profile.
 */

import {
  getBearerToken,
  getAuthedUser,
  getSupabaseServerClients,
  json,
} from '../routing/_utils.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Call OpenAI embeddings API
 */
async function generateEmbedding(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return null;
  }

  if (!OPENAI_API_KEY) {
    // console.warn('OPENAI_API_KEY not configured, skipping embedding generation');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.trim().slice(0, 8000), // OpenAI limit
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      // console.error('OpenAI embedding error:', error);
      return null;
    }

    const data = await response.json();
    return data?.data?.[0]?.embedding || null;
  } catch (error) {
    // console.error('Embedding generation failed:', error);
    return null;
  }
}

/**
 * Combine multiple embeddings with weights
 */
function combineEmbeddings(embeddings, weights) {
  const validEmbeddings = embeddings.filter(e => e && Array.isArray(e));
  if (validEmbeddings.length === 0) return null;

  // Initialize combined vector
  const combined = new Array(EMBEDDING_DIMENSIONS).fill(0);
  let totalWeight = 0;

  for (let i = 0; i < validEmbeddings.length; i++) {
    const embedding = validEmbeddings[i];
    const weight = weights[i] || 1;
    totalWeight += weight;

    for (let j = 0; j < EMBEDDING_DIMENSIONS; j++) {
      combined[j] += (embedding[j] || 0) * weight;
    }
  }

  // Normalize
  if (totalWeight > 0) {
    for (let j = 0; j < EMBEDDING_DIMENSIONS; j++) {
      combined[j] /= totalWeight;
    }
  }

  // L2 normalize the final vector
  const magnitude = Math.sqrt(combined.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let j = 0; j < EMBEDDING_DIMENSIONS; j++) {
      combined[j] /= magnitude;
    }
  }

  return combined;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { error: 'Method not allowed' });
    }

    // Auth
    const { error: supaErr, anonClient, serviceClient } = getSupabaseServerClients();
    if (supaErr || !serviceClient) {
      return json(res, 500, { error: supaErr || 'Supabase client unavailable' });
    }

    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return json(res, 401, { error: 'Missing Authorization bearer token' });
    }

    const { user: authUser, error: authErr } = await getAuthedUser({ anonClient, accessToken });
    if (authErr || !authUser?.id) {
      return json(res, 401, { error: 'Invalid auth token' });
    }

    // Get user's profile
    const { data: userProfile, error: profileErr } = await serviceClient
      .from('User')
      .select('id, bio')
      .eq('auth_user_id', authUser.id)
      .single();

    if (profileErr || !userProfile) {
      return json(res, 404, { error: 'User profile not found' });
    }

    // Get private profile data
    const { data: privateProfile } = await serviceClient
      .from('user_private_profile')
      .select('turn_ons, turn_offs, looking_for, kinks')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    // Prepare text fields for embedding
    const bio = userProfile.bio || '';
    const turnOns = privateProfile?.turn_ons || '';
    const turnOffs = privateProfile?.turn_offs || '';
    
    // Also include structured data as text for richer embeddings
    const lookingFor = Array.isArray(privateProfile?.looking_for) 
      ? privateProfile.looking_for.join(', ') 
      : '';
    const kinks = Array.isArray(privateProfile?.kinks)
      ? privateProfile.kinks.join(', ')
      : '';

    // Combine all text for a richer embedding
    const combinedText = [
      bio,
      turnOns ? `Turn ons: ${turnOns}` : '',
      turnOffs ? `Turn offs: ${turnOffs}` : '',
      lookingFor ? `Looking for: ${lookingFor}` : '',
      kinks ? `Interests: ${kinks}` : '',
    ].filter(Boolean).join('. ');

    if (!combinedText.trim()) {
      return json(res, 200, { 
        message: 'No text content to embed',
        generated: false 
      });
    }

    // Generate embeddings
    // console.log(`Generating embeddings for user ${userProfile.id}...`);
    
    const [bioEmbedding, turnOnsEmbedding, turnOffsEmbedding, combinedEmbedding] = await Promise.all([
      generateEmbedding(bio),
      generateEmbedding(turnOns),
      generateEmbedding(turnOffs),
      generateEmbedding(combinedText),
    ]);

    // If we got individual embeddings but not combined, create weighted combination
    let finalCombinedEmbedding = combinedEmbedding;
    if (!finalCombinedEmbedding && (bioEmbedding || turnOnsEmbedding || turnOffsEmbedding)) {
      finalCombinedEmbedding = combineEmbeddings(
        [bioEmbedding, turnOnsEmbedding, turnOffsEmbedding],
        [0.4, 0.35, 0.25] // Weights: bio most important, then turn_ons, then turn_offs
      );
    }

    if (!finalCombinedEmbedding) {
      return json(res, 200, {
        message: 'Could not generate embeddings',
        generated: false,
      });
    }

    // Upsert embeddings
    const { error: upsertErr } = await serviceClient
      .from('profile_embeddings')
      .upsert({
        user_id: userProfile.id,
        bio_embedding: bioEmbedding,
        turn_ons_embedding: turnOnsEmbedding,
        turn_offs_embedding: turnOffsEmbedding,
        combined_embedding: finalCombinedEmbedding,
        embedding_model: EMBEDDING_MODEL,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertErr) {
      // console.error('Failed to save embeddings:', upsertErr);
      return json(res, 500, { error: 'Failed to save embeddings' });
    }

    return json(res, 200, {
      message: 'Embeddings generated successfully',
      generated: true,
      fields: {
        bio: !!bioEmbedding,
        turn_ons: !!turnOnsEmbedding,
        turn_offs: !!turnOffsEmbedding,
        combined: !!finalCombinedEmbedding,
      },
    });

  } catch (error) {
    // console.error('Embeddings endpoint error:', error);
    return json(res, 500, { error: error?.message || 'Internal server error' });
  }
}
