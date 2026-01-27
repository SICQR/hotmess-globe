/**
 * API: AI Content Moderation
 * 
 * Scans content (photos, messages, profiles) for policy violations
 * using AI moderation service.
 * 
 * POST: Moderate content
 *   - content_type: 'photo' | 'message' | 'profile' | 'story'
 *   - content_id: UUID of the content
 *   - content_data: The actual content to moderate
 */

import { json, getBearerToken } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';

// Moderation thresholds
const THRESHOLDS = {
  nudity: 0.8,
  violence: 0.7,
  hate_speech: 0.7,
  spam: 0.8,
  scam: 0.7,
  underage: 0.5, // Lower threshold for safety
};

// Actions based on severity
const ACTIONS = {
  low: 'none',
  medium: 'warn',
  high: 'blur',
  critical: 'remove',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error: clientError, serviceClient, anonClient } = getSupabaseServerClients();
  if (clientError) return json(res, 500, { error: clientError });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.id) return json(res, 401, { error: 'Invalid auth token' });

  const { content_type, content_id, content_data } = req.body;

  if (!content_type || !content_data) {
    return json(res, 400, { error: 'Missing required fields: content_type, content_data' });
  }

  if (!['photo', 'message', 'profile', 'story', 'stream'].includes(content_type)) {
    return json(res, 400, { error: 'Invalid content_type' });
  }

  try {
    // In production, this would call an AI moderation API (e.g., AWS Rekognition, Google Vision, OpenAI)
    // For now, we'll simulate the response
    const moderationResult = await moderateContent(content_type, content_data);

    // Determine action based on results
    let action = 'none';
    let requiresReview = false;
    const flagReasons = [];

    for (const [category, score] of Object.entries(moderationResult.scores)) {
      if (score >= THRESHOLDS[category]) {
        flagReasons.push({ reason: category, confidence: score });
        
        // Determine action severity
        if (category === 'underage' && score > 0.5) {
          action = 'remove';
          requiresReview = true;
        } else if (score > 0.9) {
          action = ACTIONS.critical;
        } else if (score > 0.8) {
          action = ACTIONS.high;
        } else if (score > 0.7) {
          action = ACTIONS.medium;
          requiresReview = true;
        }
      }
    }

    const flagged = flagReasons.length > 0;

    // Log moderation result
    const { error: logError } = await serviceClient
      .from('ai_moderation_logs')
      .insert({
        content_type,
        content_id,
        user_id: user.id,
        flagged,
        flag_reasons: flagReasons,
        confidence_score: moderationResult.overallConfidence,
        action_taken: action,
        requires_human_review: requiresReview,
        ai_response: moderationResult,
      });

    if (logError) {
      console.error('[AI Moderate] Log error:', logError);
    }

    // If content needs to be actioned, update the source
    if (action !== 'none' && content_id) {
      await applyModerationAction(serviceClient, content_type, content_id, action);
    }

    return json(res, 200, {
      flagged,
      action,
      flagReasons,
      requiresReview,
      confidence: moderationResult.overallConfidence,
    });

  } catch (error) {
    console.error('[AI Moderate] Error:', error);
    return json(res, 500, { error: error.message });
  }
}

// Simulated AI moderation (replace with real API in production)
async function moderateContent(contentType, contentData) {
  // In production, call actual AI moderation service
  // Example with OpenAI:
  // const response = await openai.moderations.create({ input: contentData });
  
  // Simulated response
  return {
    scores: {
      nudity: Math.random() * 0.3,
      violence: Math.random() * 0.1,
      hate_speech: Math.random() * 0.1,
      spam: Math.random() * 0.2,
      scam: Math.random() * 0.1,
      underage: Math.random() * 0.05,
    },
    overallConfidence: 0.95,
    categories: [],
  };
}

// Apply moderation action to content
async function applyModerationAction(client, contentType, contentId, action) {
  const tableMap = {
    photo: 'user_photos',
    message: 'messages',
    profile: 'User',
    story: 'stories',
    stream: 'live_streams',
  };

  const table = tableMap[contentType];
  if (!table) return;

  const updateData = {};
  
  if (action === 'blur') {
    updateData.moderation_status = 'blurred';
  } else if (action === 'remove') {
    updateData.moderation_status = 'removed';
    updateData.is_visible = false;
  } else if (action === 'warn') {
    updateData.moderation_status = 'warned';
  }

  if (Object.keys(updateData).length > 0) {
    await client.from(table).update(updateData).eq('id', contentId);
  }
}

export const config = {
  maxDuration: 30,
};
