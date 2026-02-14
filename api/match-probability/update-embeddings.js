/**
 * Update Profile Embeddings Endpoint
 * 
 * POST /api/match-probability/update-embeddings
 * 
 * Called when a user updates their profile text fields (bio, turn_ons, turn_offs).
 * Generates and stores new embeddings for semantic matching.
 * 
 * Request body:
 *   {
 *     bio?: string,
 *     turnOns?: string,
 *     turnOffs?: string
 *   }
 * 
 * Response:
 *   { success: true, updated: true }
 */

import { getBearerToken, json, readJsonBody } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';
import { updateProfileEmbeddings } from './_embeddings.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  const accessToken = getBearerToken(req);
  
  if (!accessToken) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  const { error: supaErr, serviceClient, anonClient } = getSupabaseServerClients();

  if (supaErr || !anonClient) {
    return json(res, 500, { error: supaErr || 'Supabase not configured' });
  }

  // Authenticate user
  const { user: authUser, error: authErr } = await getAuthedUser({ anonClient, accessToken });
  if (authErr || !authUser?.id) {
    return json(res, 401, { error: 'Invalid auth token' });
  }

  if (!serviceClient) {
    return json(res, 500, { error: 'Service client not configured' });
  }

  try {
    // Get user's profile ID
    const { data: userProfile, error: profileErr } = await serviceClient
      .from('User')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single();

    if (profileErr || !userProfile?.id) {
      return json(res, 404, { error: 'User profile not found' });
    }

    // Parse request body
    const body = (await readJsonBody(req)) || {};
    const bio = body.bio !== undefined ? String(body.bio || '').trim() : undefined;
    const turnOns = body.turnOns !== undefined ? String(body.turnOns || '').trim() : undefined;
    const turnOffs = body.turnOffs !== undefined ? String(body.turnOffs || '').trim() : undefined;

    // If all fields are undefined, fetch from private profile
    let finalBio = bio;
    let finalTurnOns = turnOns;
    let finalTurnOffs = turnOffs;

    if (bio === undefined || turnOns === undefined || turnOffs === undefined) {
      // Fetch existing values from database
      const [{ data: publicProfile }, { data: privateProfile }] = await Promise.all([
        serviceClient.from('User').select('bio').eq('id', userProfile.id).single(),
        serviceClient.from('user_private_profile').select('turn_ons, turn_offs').eq('auth_user_id', authUser.id).single(),
      ]);

      if (bio === undefined && publicProfile?.bio) {
        finalBio = publicProfile.bio;
      }
      if (turnOns === undefined && privateProfile?.turn_ons) {
        finalTurnOns = privateProfile.turn_ons;
      }
      if (turnOffs === undefined && privateProfile?.turn_offs) {
        finalTurnOffs = privateProfile.turn_offs;
      }
    }

    // Check if there's any content to embed
    if (!finalBio && !finalTurnOns && !finalTurnOffs) {
      return json(res, 200, { 
        success: true, 
        updated: false, 
        message: 'No text content to embed' 
      });
    }

    // Generate and store embeddings
    const result = await updateProfileEmbeddings({
      serviceClient,
      userId: userProfile.id,
      bio: finalBio,
      turnOns: finalTurnOns,
      turnOffs: finalTurnOffs,
    });

    if (result.error) {
      // Non-fatal: embeddings are optional
      return json(res, 200, { 
        success: true, 
        updated: false, 
        message: 'Embedding generation failed but profile is still valid' 
      });
    }

    return json(res, 200, { 
      success: true, 
      updated: true,
      hasEmbeddings: {
        bio: !!result.embeddings?.bio_embedding,
        turnOns: !!result.embeddings?.turn_ons_embedding,
        turnOffs: !!result.embeddings?.turn_offs_embedding,
        combined: !!result.embeddings?.combined_embedding,
      }
    });
  } catch (error) {
    return json(res, 500, { error: error?.message || 'Failed to update embeddings' });
  }
}
