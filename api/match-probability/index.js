/**
 * Match Probability API
 * 
 * POST /api/match-probability
 * 
 * Calculates compatibility score between two users.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Scoring weights
const WEIGHTS = {
  MUSIC_TASTE: 15,
  TRIBES: 15,
  INTERESTS: 15,
  LOOKING_FOR: 20,
  POSITION_COMPAT: 10,
  AGE_PREFERENCE: 10,
  DISTANCE: 10,
  ACTIVITY_MATCH: 5
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // For GET requests, read params from query string
  const params = req.method === 'GET' ? req.query : req.body;

  try {
    const { userId, targetUserId } = params;

    if (!userId || !targetUserId) {
      return res.status(400).json({ error: 'Missing userId or targetUserId' });
    }

    // Fetch both profiles
    const { data: profiles, error } = await supabase
      .from('User')
      .select(`
        id,
        display_name,
        age,
        music_taste,
        tribes,
        interests,
        looking_for,
        position,
        age_preference_min,
        age_preference_max,
        latitude,
        longitude,
        last_active
      `)
      .in('id', [userId, targetUserId]);

    if (error || profiles.length !== 2) {
      return res.status(404).json({ error: 'Users not found' });
    }

    const user = profiles.find(p => p.id === userId);
    const target = profiles.find(p => p.id === targetUserId);

    // Calculate scores
    const scores = {};
    const reasons = [];

    // 1. Music taste overlap
    const musicOverlap = calculateOverlap(user.music_taste, target.music_taste);
    scores.music = Math.round(musicOverlap * WEIGHTS.MUSIC_TASTE);
    if (musicOverlap > 0.5) {
      const common = getCommonItems(user.music_taste, target.music_taste);
      reasons.push(`Both into ${common.slice(0, 2).join(' & ')}`);
    }

    // 2. Tribes overlap
    const tribesOverlap = calculateOverlap(user.tribes, target.tribes);
    scores.tribes = Math.round(tribesOverlap * WEIGHTS.TRIBES);
    if (tribesOverlap > 0.3) {
      const common = getCommonItems(user.tribes, target.tribes);
      reasons.push(`${common[0]} connection`);
    }

    // 3. Interests overlap
    const interestsOverlap = calculateOverlap(user.interests, target.interests);
    scores.interests = Math.round(interestsOverlap * WEIGHTS.INTERESTS);
    if (interestsOverlap > 0.3) {
      const common = getCommonItems(user.interests, target.interests);
      reasons.push(`Shared interest in ${common[0]}`);
    }

    // 4. Looking for alignment
    const lookingForMatch = calculateLookingForMatch(user.looking_for, target.looking_for);
    scores.lookingFor = Math.round(lookingForMatch * WEIGHTS.LOOKING_FOR);
    if (lookingForMatch > 0.5) {
      reasons.push('Looking for the same things');
    }

    // 5. Position compatibility
    const positionCompat = calculatePositionCompatibility(user.position, target.position);
    scores.position = Math.round(positionCompat * WEIGHTS.POSITION_COMPAT);
    if (positionCompat > 0.7) {
      reasons.push('Compatible positions');
    }

    // 6. Age preference
    const ageMatch = calculateAgeMatch(user, target);
    scores.age = Math.round(ageMatch * WEIGHTS.AGE_PREFERENCE);

    // 7. Distance (if location available)
    let distance = null;
    if (user.latitude && user.longitude && target.latitude && target.longitude) {
      distance = calculateDistance(
        user.latitude, user.longitude,
        target.latitude, target.longitude
      );
      const distanceScore = distance < 5 ? 1 : distance < 20 ? 0.7 : distance < 50 ? 0.4 : 0.2;
      scores.distance = Math.round(distanceScore * WEIGHTS.DISTANCE);
      
      if (distance < 5) {
        reasons.push('Very close by');
      }
    } else {
      scores.distance = WEIGHTS.DISTANCE * 0.5; // Neutral if no location
    }

    // 8. Activity match (both online recently)
    const bothActive = isRecentlyActive(user.last_active) && isRecentlyActive(target.last_active);
    scores.activity = bothActive ? WEIGHTS.ACTIVITY_MATCH : Math.round(WEIGHTS.ACTIVITY_MATCH * 0.5);
    if (bothActive) {
      reasons.push('Both active now');
    }

    // Calculate total
    const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
    const maxScore = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);
    const percentage = Math.round((totalScore / maxScore) * 100);

    // Generate AI explanation if high match
    let aiExplanation = null;
    if (OPENAI_API_KEY && percentage >= 60) {
      aiExplanation = await generateAIExplanation(user, target, reasons, percentage);
    }

    // Determine match level
    let matchLevel;
    if (percentage >= 85) matchLevel = 'exceptional';
    else if (percentage >= 70) matchLevel = 'great';
    else if (percentage >= 55) matchLevel = 'good';
    else if (percentage >= 40) matchLevel = 'moderate';
    else matchLevel = 'low';

    // Cache the result
    await supabase
      .from('match_explanations')
      .upsert({
        user_id: userId,
        target_user_id: targetUserId,
        score: percentage,
        breakdown: scores,
        reasons,
        ai_explanation: aiExplanation,
        calculated_at: new Date().toISOString()
      }, { onConflict: 'user_id,target_user_id' });

    return res.status(200).json({
      score: percentage,
      matchLevel,
      breakdown: scores,
      reasons: reasons.slice(0, 3),
      aiExplanation,
      distance: distance ? `${distance.toFixed(1)}km` : null
    });

  } catch (error) {
    console.error('Match probability error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function calculateOverlap(arr1, arr2) {
  if (!arr1?.length || !arr2?.length) return 0;
  const set1 = new Set(arr1.map(s => s.toLowerCase()));
  const set2 = new Set(arr2.map(s => s.toLowerCase()));
  const intersection = [...set1].filter(x => set2.has(x));
  const union = new Set([...set1, ...set2]);
  return intersection.length / union.size;
}

function getCommonItems(arr1, arr2) {
  if (!arr1?.length || !arr2?.length) return [];
  const set2 = new Set(arr2.map(s => s.toLowerCase()));
  return arr1.filter(item => set2.has(item.toLowerCase()));
}

function calculateLookingForMatch(lf1, lf2) {
  if (!lf1?.length || !lf2?.length) return 0.5;
  
  // Direct matches
  const overlap = calculateOverlap(lf1, lf2);
  if (overlap > 0) return overlap;
  
  // Complementary matches (e.g., "dates" matches "relationship")
  const complementary = {
    'dates': ['relationship', 'dating', 'fun'],
    'fun': ['dates', 'hookups', 'nsa'],
    'relationship': ['dates', 'dating', 'ltr'],
    'friends': ['networking', 'chat'],
    'hookups': ['fun', 'nsa']
  };
  
  for (const item of lf1) {
    const matches = complementary[item.toLowerCase()] || [];
    if (lf2.some(x => matches.includes(x.toLowerCase()))) {
      return 0.7;
    }
  }
  
  return 0.3;
}

function calculatePositionCompatibility(pos1, pos2) {
  if (!pos1 || !pos2) return 0.5;
  
  const p1 = pos1.toLowerCase();
  const p2 = pos2.toLowerCase();
  
  // Same position
  if (p1 === p2) {
    if (p1 === 'vers' || p1 === 'versatile') return 1;
    if (p1 === 'side') return 1;
    return 0.3; // Two tops or two bottoms
  }
  
  // Complementary
  const complementary = {
    'top': ['bottom', 'vers', 'versatile'],
    'bottom': ['top', 'vers', 'versatile'],
    'vers': ['top', 'bottom', 'vers', 'versatile'],
    'versatile': ['top', 'bottom', 'vers', 'versatile'],
    'side': ['side', 'vers', 'versatile']
  };
  
  if (complementary[p1]?.includes(p2)) return 1;
  
  return 0.5;
}

function calculateAgeMatch(user, target) {
  if (!target.age) return 0.5;
  
  const minAge = user.age_preference_min || 18;
  const maxAge = user.age_preference_max || 99;
  
  if (target.age >= minAge && target.age <= maxAge) {
    // Bonus for being in the middle of preference range
    const midPoint = (minAge + maxAge) / 2;
    const distance = Math.abs(target.age - midPoint);
    const range = (maxAge - minAge) / 2;
    return 1 - (distance / range) * 0.3;
  }
  
  // Outside preference
  const outsideBy = target.age < minAge 
    ? minAge - target.age 
    : target.age - maxAge;
  
  return Math.max(0, 1 - (outsideBy * 0.1));
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function isRecentlyActive(lastActive) {
  if (!lastActive) return false;
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
  return new Date(lastActive) > thirtyMinsAgo;
}

async function generateAIExplanation(user, target, reasons, score) {
  try {
    const prompt = `Generate a brief, cheeky one-liner explaining why these two gay men might be a ${score}% match.

Key compatibility factors:
${reasons.join('\n')}

Rules:
- Max 15 words
- Be playful but not cringe
- HOTMESS voice: bold, cheeky, direct
- Don't mention the percentage

Examples:
- "Both house music heads who like to vers? This could get interesting."
- "Same tribe, same vibe. The stars are aligning here."
- "Close enough to meet, compatible enough to click."`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 50,
        temperature: 0.8
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim().replace(/"/g, '') || null;
  } catch {
    return null;
  }
}
