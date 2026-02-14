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
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://hotmess-globe-fix.vercel.app');
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

    // Get both profiles
    const [viewerResult, targetResult] = await Promise.all([
      getSupabase()
        .from('User')
        .select('display_name, username, bio, interests, music_taste, tribes, looking_for')
        .eq('email', viewerEmail)
        .single(),
      getSupabase()
        .from('User')
        .select('display_name, username, bio, interests, music_taste, tribes, looking_for')
        .eq('id', targetProfileId)
        .single()
    ]);

    if (viewerResult.error || targetResult.error) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const viewer = viewerResult.data;
    const target = targetResult.data;

    // Find common ground
    const commonInterests = findCommon(viewer.interests, target.interests);
    const commonMusic = findCommon(viewer.music_taste, target.music_taste);
    const commonTribes = findCommon(viewer.tribes, target.tribes);

    // Check for shared events (both RSVPd)
    const { data: sharedEvents } = await getSupabase()
      .from('EventRSVP')
      .select('event_id, Beacon(title)')
      .in('user_email', [viewerEmail])
      .limit(5);

    // Build context for AI
    const context = {
      viewer: {
        name: viewer.display_name || viewer.username || 'User',
        tribes: viewer.tribes?.join(', ') || 'not specified'
      },
      target: {
        name: target.display_name || target.username || 'them',
        tribes: target.tribes?.join(', ') || 'not specified',
        bio: target.bio?.slice(0, 200) || null
      },
      commonGround: {
        interests: commonInterests,
        music: commonMusic,
        tribes: commonTribes
      },
      sharedEvents: sharedEvents?.map(e => e.Beacon?.title).filter(Boolean) || []
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
        // Fallback: split by numbered list
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
        text: text.trim(),
        type: ['personal', 'flirty', 'question'][i]
      })),
      commonGround: {
        interests: commonInterests,
        music: commonMusic,
        tribes: commonTribes,
        events: context.sharedEvents
      },
      targetName: context.target.name
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function findCommon(arr1, arr2) {
  if (!arr1 || !arr2) return [];
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

  if (context.commonGround.interests.length > 0) {
    parts.push(`- Shared interests: ${context.commonGround.interests.join(', ')}`);
  }

  if (context.commonGround.music.length > 0) {
    parts.push(`- Shared music taste: ${context.commonGround.music.join(', ')}`);
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
