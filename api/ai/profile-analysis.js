/**
 * HOTMESS AI Profile Analysis API
 *
 * POST /api/ai/profile-analysis
 *
 * Analyzes a user's profile and provides optimization suggestions.
 */

import { createClient } from '@supabase/supabase-js';
import { requireAIAccess, logAIUsage } from './_auth.js';

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

const OPTIMIZATION_RULES = [
  {
    id: 'no_face_pic',
    check: (profile) => !profile.photos?.some(p => p.is_face === true),
    impact: 'high',
    message: 'Add a face pic',
    detail: 'Profiles with clear face photos get 40% more responses',
    action: 'upload_photo'
  },
  {
    id: 'short_bio',
    check: (profile) => !profile.bio || profile.bio.length < 50,
    impact: 'medium',
    message: 'Expand your bio',
    detail: 'Give people something to start a conversation about',
    action: 'edit_bio'
  },
  {
    id: 'no_interests',
    check: (profile) => !profile.interests || profile.interests.length === 0,
    impact: 'medium',
    message: 'Add some interests',
    detail: 'Helps us find better matches for you',
    action: 'edit_interests'
  },
  {
    id: 'no_tribe',
    check: (profile) => !profile.tribes || profile.tribes.length === 0,
    impact: 'medium',
    message: 'Pick your tribe(s)',
    detail: 'Help others understand your vibe',
    action: 'edit_tribes'
  },
  {
    id: 'no_looking_for',
    check: (profile) => !profile.looking_for || profile.looking_for.length === 0,
    impact: 'high',
    message: 'What are you looking for?',
    detail: 'Be upfront about your intentions',
    action: 'edit_looking_for'
  },
  {
    id: 'no_music_taste',
    check: (profile) => !profile.music_taste || profile.music_taste.length === 0,
    impact: 'low',
    message: 'Add your music taste',
    detail: 'Connect over shared music preferences',
    action: 'edit_music'
  },
  {
    id: 'incomplete_stats',
    check: (profile) => !profile.height || !profile.body_type,
    impact: 'low',
    message: 'Complete your stats',
    detail: 'Some people filter by these',
    action: 'edit_stats'
  },
  {
    id: 'no_position',
    check: (profile) => !profile.position,
    impact: 'medium',
    message: 'Add your position',
    detail: 'Vers, top, bottom, side - be clear',
    action: 'edit_position'
  },
  {
    id: 'generic_bio',
    check: (profile) => {
      if (!profile.bio) return false;
      const genericPhrases = ['just ask', 'message me', 'ask me anything', 'new here', 'here for'];
      return genericPhrases.some(phrase => profile.bio.toLowerCase().includes(phrase));
    },
    impact: 'medium',
    message: 'Make your bio more specific',
    detail: 'Generic bios get fewer responses',
    action: 'edit_bio'
  }
];

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

  // Auth gate
  const access = await requireAIAccess(req, 'profile_analysis');
  if (access.error) {
    return res.status(access.status).json({
      error: access.error,
      upgradeRequired: access.upgradeRequired || false
    });
  }
  const { user, tier } = access;

  try {
    // Fetch user profile from profiles table (not dead User table)
    const { data: profileData, error: fetchError } = await getSupabase()
      .from('profiles')
      .select('id, display_name, username, bio, avatar_url, public_attributes, created_at')
      .eq('id', user.id)
      .single();

    if (fetchError || !profileData) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const attrs = profileData?.public_attributes || {};

    // Build enriched profile matching what OPTIMIZATION_RULES expect
    const enrichedProfile = {
      ...profileData,
      interests: attrs.interests || [],
      tribes: attrs.tribes || [],
      looking_for: attrs.looking_for || [],
      position: attrs.position,
      height: attrs.height,
      body_type: attrs.body_type,
      music_taste: attrs.music_taste || [],
      // avatar_url proxy — if avatar_url exists, treat as having a face pic
      photos: profileData.avatar_url ? [{ is_face: true, created_at: profileData.created_at }] : [],
    };

    const issues = [];
    for (const rule of OPTIMIZATION_RULES) {
      try {
        if (rule.check(enrichedProfile)) {
          issues.push({
            id: rule.id,
            impact: rule.impact,
            message: rule.message,
            detail: rule.detail,
            action: rule.action
          });
        }
      } catch (e) {
        // Skip failed checks
      }
    }

    const totalChecks = OPTIMIZATION_RULES.length;
    const passedChecks = totalChecks - issues.length;
    const completeness = Math.round((passedChecks / totalChecks) * 100);

    const impactOrder = { high: 0, medium: 1, low: 2 };
    issues.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

    let aiSummary = null;
    if (OPENAI_API_KEY && issues.length > 0) {
      aiSummary = await generateAISummary(enrichedProfile, issues);
    } else if (issues.length > 0) {
      const highImpact = issues.filter(i => i.impact === 'high');
      if (highImpact.length > 0) {
        aiSummary = `Quick win: ${highImpact[0].message.toLowerCase()}. Trust me, it makes a difference.`;
      } else {
        aiSummary = `Looking good! A few small tweaks could help: ${issues[0].message.toLowerCase()}.`;
      }
    } else {
      aiSummary = "Your profile is looking solid! You're all set to make connections.";
    }

    let strengthLevel;
    if (completeness >= 90) strengthLevel = 'excellent';
    else if (completeness >= 70) strengthLevel = 'good';
    else if (completeness >= 50) strengthLevel = 'needs_work';
    else strengthLevel = 'incomplete';

    // Log usage (non-blocking)
    await logAIUsage(user.id, 'profile_analysis', tier, null, 'gpt-4o');

    return res.status(200).json({
      completeness,
      strengthLevel,
      issues,
      highPriorityCount: issues.filter(i => i.impact === 'high').length,
      aiSummary,
      profileStats: {
        hasPhotos: !!profileData.avatar_url,
        photoCount: profileData.avatar_url ? 1 : 0,
        hasBio: !!profileData.bio,
        bioLength: profileData.bio?.length || 0,
        interestsCount: attrs.interests?.length || 0,
        tribesCount: attrs.tribes?.length || 0
      }
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function generateAISummary(profile, issues) {
  try {
    const highImpact = issues.filter(i => i.impact === 'high');
    const mediumImpact = issues.filter(i => i.impact === 'medium');

    const prompt = `Generate a brief, friendly profile optimization tip for a gay dating app user.

Profile status:
- ${issues.length} areas need attention
- High priority issues: ${highImpact.map(i => i.message).join(', ') || 'none'}
- Medium priority: ${mediumImpact.map(i => i.message).join(', ') || 'none'}
- Has bio: ${!!profile.bio}
- Has photo: ${profile.photos?.length > 0}

Rules:
- Max 2 sentences
- Be encouraging, not critical
- Match HOTMESS voice: cheeky, direct, caring
- Focus on the highest impact change first
- Don't be preachy`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful profile advisor for HOTMESS, a gay dating app. Be brief, friendly, and direct.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}
