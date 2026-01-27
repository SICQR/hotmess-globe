/**
 * API: Stories
 * 
 * Create, read, and manage ephemeral stories (24-hour expiry).
 * 
 * GET: Get stories feed (from followed users)
 * POST: Create a new story
 */

import { json, getBearerToken } from '../shopify/_utils.js';
import { getSupabaseServerClients, getAuthedUser } from '../routing/_utils.js';

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  
  if (!['GET', 'POST'].includes(method)) {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const { error: clientError, serviceClient, anonClient } = getSupabaseServerClients();
  if (clientError) return json(res, 500, { error: clientError });

  const accessToken = getBearerToken(req);
  if (!accessToken) return json(res, 401, { error: 'Missing bearer token' });

  const { user, error: userError } = await getAuthedUser({ anonClient, accessToken });
  if (userError || !user?.id) return json(res, 401, { error: 'Invalid auth token' });

  try {
    if (method === 'GET') {
      return await getStoriesFeed(req, res, serviceClient, user);
    } else if (method === 'POST') {
      return await createStory(req, res, serviceClient, user);
    }
  } catch (error) {
    console.error('[Stories] Error:', error);
    return json(res, 500, { error: error.message });
  }
}

async function getStoriesFeed(req, res, client, user) {
  const { page = 1, limit = 20, user_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // If specific user requested, get their stories
  if (user_id) {
    const { data: stories, error } = await client
      .from('stories')
      .select(`
        *,
        author:user_id (id, username, full_name, avatar_url)
      `)
      .eq('user_id', user_id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) {
      return json(res, 500, { error: 'Failed to fetch stories' });
    }

    // Mark as viewed
    if (stories?.length > 0) {
      const viewInserts = stories.map(s => ({
        story_id: s.id,
        viewer_id: user.id,
      }));
      
      await client
        .from('story_views')
        .upsert(viewInserts, { onConflict: 'story_id,viewer_id' });
    }

    return json(res, 200, { stories, page: parseInt(page), limit: parseInt(limit) });
  }

  // Get stories from followed users
  const { data: following } = await client
    .from('user_follows')
    .select('followed_id')
    .eq('follower_id', user.id);

  const followedIds = following?.map(f => f.followed_id) || [];
  followedIds.push(user.id); // Include own stories

  const { data: stories, error } = await client
    .from('stories')
    .select(`
      *,
      author:user_id (id, username, full_name, avatar_url)
    `)
    .in('user_id', followedIds)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (error) {
    return json(res, 500, { error: 'Failed to fetch stories feed' });
  }

  // Get view status for each story
  const storyIds = stories?.map(s => s.id) || [];
  const { data: views } = await client
    .from('story_views')
    .select('story_id')
    .eq('viewer_id', user.id)
    .in('story_id', storyIds);

  const viewedStoryIds = new Set(views?.map(v => v.story_id) || []);

  // Group stories by user
  const groupedStories = {};
  for (const story of stories || []) {
    const userId = story.user_id;
    if (!groupedStories[userId]) {
      groupedStories[userId] = {
        user: story.author,
        stories: [],
        hasUnviewed: false,
      };
    }
    const storyWithViewStatus = {
      ...story,
      viewed: viewedStoryIds.has(story.id),
    };
    groupedStories[userId].stories.push(storyWithViewStatus);
    if (!storyWithViewStatus.viewed) {
      groupedStories[userId].hasUnviewed = true;
    }
  }

  return json(res, 200, {
    storyGroups: Object.values(groupedStories),
    page: parseInt(page),
    limit: parseInt(limit),
  });
}

async function createStory(req, res, client, user) {
  const {
    type,
    media_url,
    thumbnail_url,
    text_content,
    background_color,
    music_track_id,
    music_title,
    music_artist,
    music_preview_url,
    location_name,
    location_lat,
    location_lng,
    stickers,
    mentions,
    poll_options,
    link_url,
    link_text,
    visibility = 'followers',
  } = req.body;

  if (!type || !['photo', 'video', 'text', 'music', 'location'].includes(type)) {
    return json(res, 400, { error: 'Invalid or missing story type' });
  }

  // Validate required content based on type
  if (type === 'photo' && !media_url) {
    return json(res, 400, { error: 'Photo stories require media_url' });
  }
  if (type === 'video' && !media_url) {
    return json(res, 400, { error: 'Video stories require media_url' });
  }
  if (type === 'text' && !text_content) {
    return json(res, 400, { error: 'Text stories require text_content' });
  }

  // Calculate expiry (24 hours from now)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const storyData = {
    user_id: user.id,
    type,
    media_url,
    thumbnail_url,
    text_content,
    background_color,
    music_track_id,
    music_title,
    music_artist,
    music_preview_url,
    location_name,
    location_lat,
    location_lng,
    stickers: stickers || [],
    mentions: mentions || [],
    poll_options,
    link_url,
    link_text,
    visibility,
    expires_at: expiresAt,
  };

  const { data: story, error } = await client
    .from('stories')
    .insert(storyData)
    .select()
    .single();

  if (error) {
    console.error('[Stories] Create error:', error);
    return json(res, 500, { error: 'Failed to create story' });
  }

  // Moderate content asynchronously
  if (media_url) {
    // In production, trigger moderation API
    // fetch('/api/ai/moderate', { method: 'POST', body: ... })
  }

  // Notify followers about new story (async)
  // This would trigger push notifications

  return json(res, 201, { story });
}

export const config = {
  maxDuration: 30,
};
