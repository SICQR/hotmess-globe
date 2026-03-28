/**
 * HOTMESS AI Wingman API
 *
 * POST /api/ai/wingman
 *
 * Generates conversation starters based on two profiles.
 */

import { createClient } from '@supabase/supabase-js';

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      _supabase = createClient(url, key);
    }
  }
  return _supabase;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://hotmessldn.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const { viewerEmail, targetProfileId } = req.body;

    if (!viewerEmail || !targetProfileId) {
      return res.status(400).json({ error: 'Missing viewerEmail or targetProfileId' });
    }

    // Get both profiles from `profiles` table (not legacy `User`)
    // public_attributes holds: position, looking_for, body_type, sexual_orientation
    const [viewerResult, targetResult] = await Promise.all([
      getSupabase()
        .from('profiles')
        .select('display_name, username, bio, public_attributes, city, location')
        .eq('email', viewerEmail)
        .single(),
      getSupabase()
        .from('profiles')
        .select('display_name, username, bio, public_attributes, city, location')
        .eq('id', targetProfileId)
        .single()
    ]);

    if (viewerResult.error || targetResult.error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const viewer = viewerResult.data;
    const target = targetResult.data;

    // Extract public_attributes arrays
    const viewerAttrs = viewer.public_attributes || {};
    const targetAttrs = target.public_attributes || {};

    // Find common ground across public_attributes arrays
    const commonInterests = findCommon(
      viewerAttrs.interests || [],
      targetAttrs.interests || []
    );
    const commonMusic = findCommon(
      viewerAttrs.music_taste || [],
      targetAttrs.music_taste || []
    );
    const commonTribes = findCommon(
      viewerAttrs.tribes || [],
      targetAttrs.tribes || []
    );
    const commonLookingFor = findCommon(
      viewerAttrs.looking_for || [],
      targetAttrs.looking_for || []
    );

    // Check for shared events (both RSVPd to same event)
    const { data: viewerRsvps } = await getSupabase()
      .from('event_rsvps')
      .select('event_id')
      .eq('user_email', viewerEmail)
      .limit(20);

    const { data: targetRsvps } = await getSupabase()
      .from('event_rsvps')
      .select('event_id')
      .eq('user_id', targetProfileId)
      .limit(20);

    const viewerEventIds = (viewerRsvps || []).map(r => r.event_id);
    const targetEventIds = (targetRsvps || []).map(r => r.event_id);
    const sharedEventIds = viewerEventIds.filter(id => targetEventIds.includes(id));

    let sharedEventTitles = [];
    if (sharedEventIds.length > 0) {
      const { data: events } = await getSupabase()
        .from('beacons')
        .select('title')
        .in('id', sharedEventIds.slice(0, 3));
      sharedEventTitles = (events || []).map(e => e.title).filter(Boolean);
    }

    // Build context for AI
    const context = {
      viewer: {
        name: viewer.display_name || viewer.username || 'User',
        tribes: viewerAttrs.tribes?.join(', ') || null,
        position: viewerAttrs.position || null,
      },
      target: {
        name: target.display_name || target.username || 'them',
        tribes: targetAttrs.tribes?.join(', ') || null,
        position: targetAttrs.position || null,
        bio: target.bio?.slice(0, 200) || null,
        looking_for: targetAttrs.looking_for?.join(', ') || null,
      },
      commonGround: {
        interests: commonInterests,
        music: commonMusic,
        tribes: commonTribes,
        looking_for: commonLookingFor,
      },
      sharedEvents: sharedEventTitles,
    };

    // Generate openers with AI
    const prompt = buildWingmanPrompt(context);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are HOTMESS Wingman, helping gay men start conversations. Be cheeky, warm, and genuinely helpful. Never be crude, cheesy, or use pickup lines. Match HOTMESS brand voice: bold but caring.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      })
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error');
    }

    const completion = await openaiResponse.json();
    const content = completion.choices[0]?.message?.content;

    // Parse openers from response
    let openers;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        openers = parsed.openers || [];
      } else {
        openers = content.split(/\d+\.\s+/).filter(Boolean).slice(0, 3);
      }
    } catch {
      openers = ['Hey! Your profile caught my eye.', 'Hi there! Would love to chat sometime.', 'Hey, what brings you to HOTMESS?'];
    }

    // Ensure we have 3 openers
    while (openers.length < 3) {
      openers.push('Hey! Noticed we might vibe. Would love to chat.');
    }

    return res.status(200).json({
      openers: openers.slice(0, 3).map((text, i) => ({
        text: typeof text === 'string' ? text.trim() : text,
        type: ['personal', 'flirty', 'question'][i]
      })),
      commonGround: {
        interests: commonInterests,
        music: commonMusic,
        tribes: commonTribes,
        events: sharedEventTitles,
      },
      targetName: context.target.name,
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function findCommon(arr1, arr2) {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
  return arr1.filter(item => arr2.includes(item));
}

function buildWingmanPrompt(context) {
  const parts = [
    `Generate 3 conversation starters for a gay dating app.`,
    ``,
    `Context:`,
    `- You are: ${context.viewer.name}${context.viewer.tribes ? `, identifies as ${context.viewer.tribes}` : ''}`,
    `- Messaging: ${context.target.name}${context.target.tribes ? `, ${context.target.tribes}` : ''}`
  ];

  if (context.target.bio) {
    parts.push(`- Their bio: "${context.target.bio}"`);
  }

  if (context.target.looking_for) {
    parts.push(`- They're looking for: ${context.target.looking_for}`);
  }

  if (context.commonGround.interests.length > 0) {
    parts.push(`- Shared interests: ${context.commonGround.interests.join(', ')}`);
  }

  if (context.commonGround.music.length > 0) {
    parts.push(`- Shared music taste: ${context.commonGround.music.join(', ')}`);
  }

  if (context.commonGround.tribes.length > 0) {
    parts.push(`- Same tribe(s): ${context.commonGround.tribes.join(', ')}`);
  }

  if (context.sharedEvents.length > 0) {
    parts.push(`- Both attending: ${context.sharedEvents.join(', ')}`);
  }

  parts.push(
    ``,
    `Rules:`,
    `- Each opener max 20 words`,
    `- First should reference something specific from their profile or shared interests`,
    `- Second can be playfully flirty (but NOT crude or sexual)`,
    `- Third should be a genuine question`,
    `- NO pickup lines, NO clichés, NO "hey" by itself`,
    `- Match HOTMESS voice: bold, cheeky, warm`,
    ``,
    `Return as JSON: { "openers": ["...", "...", "..."] }`
  );

  return parts.join('\n');
}
