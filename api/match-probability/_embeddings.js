/**
 * Profile Embedding Generation Utility
 * 
 * Generates OpenAI text embeddings for profile text fields.
 * Used to pre-compute embeddings on profile save for efficient
 * semantic similarity matching.
 * 
 * Usage:
 *   import { generateProfileEmbeddings, updateProfileEmbeddings } from './_embeddings.js';
 *   
 *   // On profile save
 *   await updateProfileEmbeddings({ 
 *     serviceClient, 
 *     userId, 
 *     bio, 
 *     turnOns, 
 *     turnOffs 
 *   });
 */

import { getEnv } from '../shopify/_utils.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;

/**
 * Generate embedding vector using OpenAI API
 */
export const generateEmbedding = async (text, apiKey) => {
  if (!text || !String(text).trim()) {
    return null;
  }

  if (!apiKey) {
    console.warn('OpenAI API key not configured, skipping embedding generation');
    return null;
  }

  const cleanText = String(text).trim().slice(0, 8000); // OpenAI limit

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: cleanText,
        dimensions: EMBEDDING_DIMENSION,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI embedding error:', errorData);
      return null;
    }

    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;
    
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSION) {
      console.error('Invalid embedding response:', data);
      return null;
    }

    return embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    return null;
  }
};

/**
 * Combine multiple embeddings with weights
 * Used to create a single "combined" embedding from bio, turn_ons, turn_offs
 */
export const combineEmbeddings = (embeddings, weights) => {
  const validEmbeddings = [];
  const validWeights = [];

  for (let i = 0; i < embeddings.length; i++) {
    if (Array.isArray(embeddings[i]) && embeddings[i].length === EMBEDDING_DIMENSION) {
      validEmbeddings.push(embeddings[i]);
      validWeights.push(weights[i] || 1);
    }
  }

  if (validEmbeddings.length === 0) {
    return null;
  }

  // Normalize weights
  const totalWeight = validWeights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = validWeights.map((w) => w / totalWeight);

  // Weighted average
  const combined = new Array(EMBEDDING_DIMENSION).fill(0);
  
  for (let i = 0; i < validEmbeddings.length; i++) {
    const embedding = validEmbeddings[i];
    const weight = normalizedWeights[i];
    
    for (let j = 0; j < EMBEDDING_DIMENSION; j++) {
      combined[j] += embedding[j] * weight;
    }
  }

  // Normalize the result (L2 normalization)
  const magnitude = Math.sqrt(combined.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let j = 0; j < EMBEDDING_DIMENSION; j++) {
      combined[j] /= magnitude;
    }
  }

  return combined;
};

/**
 * Generate all profile embeddings from text fields
 */
export const generateProfileEmbeddings = async ({ bio, turnOns, turnOffs, apiKey }) => {
  const openaiKey = apiKey || getEnv('OPENAI_API_KEY');
  
  if (!openaiKey) {
    return {
      bio_embedding: null,
      turn_ons_embedding: null,
      turn_offs_embedding: null,
      combined_embedding: null,
    };
  }

  // Generate individual embeddings in parallel
  const [bioEmbedding, turnOnsEmbedding, turnOffsEmbedding] = await Promise.all([
    generateEmbedding(bio, openaiKey),
    generateEmbedding(turnOns, openaiKey),
    generateEmbedding(turnOffs, openaiKey),
  ]);

  // Create combined embedding with weights
  // Bio gets highest weight (0.5), turn_ons and turn_offs split remaining (0.25 each)
  const combinedEmbedding = combineEmbeddings(
    [bioEmbedding, turnOnsEmbedding, turnOffsEmbedding],
    [0.5, 0.25, 0.25]
  );

  return {
    bio_embedding: bioEmbedding,
    turn_ons_embedding: turnOnsEmbedding,
    turn_offs_embedding: turnOffsEmbedding,
    combined_embedding: combinedEmbedding,
  };
};

/**
 * Update profile embeddings in the database
 * Call this when a user updates their bio, turn_ons, or turn_offs
 */
export const updateProfileEmbeddings = async ({
  serviceClient,
  userId,
  bio,
  turnOns,
  turnOffs,
  apiKey,
}) => {
  if (!serviceClient || !userId) {
    return { error: 'Missing serviceClient or userId' };
  }

  const embeddings = await generateProfileEmbeddings({
    bio,
    turnOns,
    turnOffs,
    apiKey,
  });

  // Only update if we have at least one embedding
  if (
    !embeddings.bio_embedding &&
    !embeddings.turn_ons_embedding &&
    !embeddings.turn_offs_embedding &&
    !embeddings.combined_embedding
  ) {
    return { error: 'No embeddings generated', embeddings: null };
  }

  try {
    // Format vectors for pgvector (arrays to string format)
    const formatVector = (arr) => {
      if (!arr) return null;
      return `[${arr.join(',')}]`;
    };

    const { data, error } = await serviceClient
      .from('profile_embeddings')
      .upsert(
        {
          user_id: userId,
          bio_embedding: formatVector(embeddings.bio_embedding),
          turn_ons_embedding: formatVector(embeddings.turn_ons_embedding),
          turn_offs_embedding: formatVector(embeddings.turn_offs_embedding),
          combined_embedding: formatVector(embeddings.combined_embedding),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Failed to update profile embeddings:', error);
      return { error: error.message, embeddings: null };
    }

    return { error: null, embeddings, data };
  } catch (error) {
    console.error('Failed to update profile embeddings:', error);
    return { error: error?.message || 'Unknown error', embeddings: null };
  }
};

/**
 * Batch update embeddings for multiple profiles
 * Useful for backfilling existing profiles
 */
export const batchUpdateEmbeddings = async ({
  serviceClient,
  profiles,
  apiKey,
  concurrency = 5,
  onProgress,
}) => {
  if (!serviceClient || !Array.isArray(profiles) || profiles.length === 0) {
    return { processed: 0, errors: [] };
  }

  const results = {
    processed: 0,
    errors: [],
  };

  // Process in batches
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, profiles.length) }).map(async () => {
    while (idx < profiles.length) {
      const current = profiles[idx];
      idx += 1;

      if (!current?.userId) {
        results.errors.push({ userId: null, error: 'Missing userId' });
        continue;
      }

      try {
        const result = await updateProfileEmbeddings({
          serviceClient,
          userId: current.userId,
          bio: current.bio,
          turnOns: current.turnOns || current.turn_ons,
          turnOffs: current.turnOffs || current.turn_offs,
          apiKey,
        });

        if (result.error) {
          results.errors.push({ userId: current.userId, error: result.error });
        } else {
          results.processed += 1;
        }

        if (onProgress) {
          onProgress({
            processed: results.processed,
            total: profiles.length,
            current: current.userId,
          });
        }
      } catch (error) {
        results.errors.push({ userId: current.userId, error: error?.message });
      }
    }
  });

  await Promise.all(workers);
  return results;
};
