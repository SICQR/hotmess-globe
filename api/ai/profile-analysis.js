/**
 * HOTMESS AI Profile Analysis API
 * 
 * POST /api/ai/profile-analysis
 * 
 * Analyzes a user's profile and provides optimization suggestions.
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

// Profile optimization rules with impact levels
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
    id: 'old_photos',
    check: (profile) => {
      if (!profile.photos?.length) return false;
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const oldestPhoto = profile.photos.reduce((oldest, p) => {
        const date = new Date(p.created_at || p.uploaded_at);
        return date < oldest ? date : oldest;
      }, new Date());
      return oldestPhoto < sixMonthsAgo;
    },
    impact: 'low',
    message: 'Refresh your photos',
    detail: 'Your photos might be getting stale',
    action: 'upload_photo'
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
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://hotmess-globe-fix.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'Missing userEmail' });
    }

    // Fetch user profile
    const { data: profile, error: fetchError } = await getSupabase()
      .from('User')
      .select(`
        id,
        email,
        display_name,
        username,
        bio,
        photos,
        interests,
        music_taste,
        tribes,
        looking_for,
        position,
        height,
        body_type,
        age,
        created_at
      `)
      .eq('email', userEmail)
      .single();

    if (fetchError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Run all optimization checks
    const issues = [];
    for (const rule of OPTIMIZATION_RULES) {
      try {
        if (rule.check(profile)) {
          issues.push({
            id: rule.id,
            impact: rule.impact,
            message: rule.message,
            detail: rule.detail,
            action: rule.action
          });
        }
      } catch (e) {
      }
    }

    // Calculate completeness score
    const totalChecks = OPTIMIZATION_RULES.length;
    const passedChecks = totalChecks - issues.length;
    const completeness = Math.round((passedChecks / totalChecks) * 100);

    // Sort issues by impact
    const impactOrder = { high: 0, medium: 1, low: 2 };
    issues.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

    // Generate AI summary if we have OpenAI
    let aiSummary = null;
    if (OPENAI_API_KEY && issues.length > 0) {
      aiSummary = await generateAISummary(profile, issues);
    } else if (issues.length > 0) {
      // Fallback summary
      const highImpact = issues.filter(i => i.impact === 'high');
      if (highImpact.length > 0) {
        aiSummary = `Quick wins: ${highImpact.map(i => i.message.toLowerCase()).join(' and ')}. Trust me, it makes a difference.`;
      } else {
        aiSummary = `Looking good! A few small tweaks could help: ${issues[0].message.toLowerCase()}.`;
      }
    } else {
      aiSummary = "Your profile is looking solid! You're all set to make connections.";
    }

    // Calculate profile strength level
    let strengthLevel;
    if (completeness >= 90) strengthLevel = 'excellent';
    else if (completeness >= 70) strengthLevel = 'good';
    else if (completeness >= 50) strengthLevel = 'needs_work';
    else strengthLevel = 'incomplete';

    return res.status(200).json({
      completeness,
      strengthLevel,
      issues,
      highPriorityCount: issues.filter(i => i.impact === 'high').length,
      aiSummary,
      profileStats: {
        hasPhotos: profile.photos?.length > 0,
        photoCount: profile.photos?.length || 0,
        hasBio: !!profile.bio,
        bioLength: profile.bio?.length || 0,
        interestsCount: profile.interests?.length || 0,
        tribesCount: profile.tribes?.length || 0
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
- Photo count: ${profile.photos?.length || 0}

Rules:
- Max 2 sentences
- Be encouraging, not critical
- Match HOTMESS voice: cheeky, direct, caring
- Focus on the highest impact change first
- Don't be preachy

Example good outputs:
- "Quick win: add a face pic. Trust me, it makes a huge difference."
- "Your profile's solid, but a longer bio would help people start conversations."
- "Almost there! Just need to say what you're looking for."`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
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
