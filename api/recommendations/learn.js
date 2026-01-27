import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Interaction weights for learning
const INTERACTION_WEIGHTS = {
  view: 0.1,      // Slight positive signal
  like: 1.0,      // Strong positive
  message: 1.5,   // Very strong positive
  meet: 2.0,      // Strongest positive
  save: 0.8,      // Strong positive
  skip: -0.3,     // Slight negative
  block: -2.0,    // Strong negative
};

// Decay factor for older interactions (per day)
const DECAY_FACTOR = 0.98;

// Learn preferences from user's interaction history
async function learnPreferences(userEmail) {
  if (!supabase) return null;

  try {
    // Fetch recent interactions
    const { data: interactions, error: intError } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(500);

    if (intError || !interactions?.length) {
      return null;
    }

    // Fetch target user profiles
    const targetEmails = [...new Set(interactions.map(i => i.target_email))];
    const { data: targetProfiles, error: profilesError } = await supabase
      .from('User')
      .select('email, age, profile_type, tags, interests, city, looking_for, archetypes')
      .in('email', targetEmails);

    if (profilesError || !targetProfiles?.length) {
      return null;
    }

    const profileMap = Object.fromEntries(targetProfiles.map(p => [p.email, p]));

    // Calculate preference scores
    const preferences = {
      profile_types: {},
      interests: {},
      archetypes: {},
      age_scores: {},
      distance_preference: 0,
      interaction_count: interactions.length,
    };

    const now = Date.now();

    for (const interaction of interactions) {
      const profile = profileMap[interaction.target_email];
      if (!profile) continue;

      const weight = INTERACTION_WEIGHTS[interaction.interaction_type] || 0;
      const daysSince = (now - new Date(interaction.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const decayedWeight = weight * Math.pow(DECAY_FACTOR, daysSince);

      // Learn profile type preferences
      if (profile.profile_type) {
        const type = profile.profile_type;
        preferences.profile_types[type] = (preferences.profile_types[type] || 0) + decayedWeight;
      }

      // Learn interest preferences
      const interests = profile.interests || profile.tags || [];
      for (const interest of interests) {
        preferences.interests[interest] = (preferences.interests[interest] || 0) + decayedWeight;
      }

      // Learn archetype preferences
      const archetypes = profile.archetypes || [];
      for (const archetype of archetypes) {
        preferences.archetypes[archetype] = (preferences.archetypes[archetype] || 0) + decayedWeight;
      }

      // Learn age preferences
      if (profile.age) {
        const ageBucket = Math.floor(profile.age / 5) * 5; // 5-year buckets
        preferences.age_scores[ageBucket] = (preferences.age_scores[ageBucket] || 0) + decayedWeight;
      }

      // Learn distance preference
      if (interaction.distance_km && weight > 0) {
        preferences.distance_preference += interaction.distance_km * decayedWeight;
      }
    }

    // Normalize scores
    const normalizeScores = (scores) => {
      const entries = Object.entries(scores);
      if (entries.length === 0) return {};
      
      const max = Math.max(...entries.map(([, v]) => Math.abs(v)), 1);
      return Object.fromEntries(entries.map(([k, v]) => [k, v / max]));
    };

    preferences.profile_types = normalizeScores(preferences.profile_types);
    preferences.interests = normalizeScores(preferences.interests);
    preferences.archetypes = normalizeScores(preferences.archetypes);
    preferences.age_scores = normalizeScores(preferences.age_scores);

    // Calculate preferred age range from age scores
    const ageEntries = Object.entries(preferences.age_scores)
      .filter(([, v]) => v > 0.3)
      .map(([k]) => parseInt(k));
    
    if (ageEntries.length > 0) {
      preferences.preferred_age_range = [Math.min(...ageEntries), Math.max(...ageEntries) + 5];
    }

    // Calculate preferred profile types
    preferences.preferred_profile_types = Object.entries(preferences.profile_types)
      .filter(([, v]) => v > 0.3)
      .map(([k]) => k);

    // Calculate top preferred interests
    preferences.preferred_interests = Object.entries(preferences.interests)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .filter(([, v]) => v > 0.2)
      .map(([k]) => k);

    // Calculate top preferred archetypes
    preferences.preferred_archetypes = Object.entries(preferences.archetypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .filter(([, v]) => v > 0.2)
      .map(([k]) => k);

    // Calculate preferred distance
    if (preferences.distance_preference > 0) {
      const positiveInteractions = interactions.filter(i => 
        INTERACTION_WEIGHTS[i.interaction_type] > 0 && i.distance_km
      );
      if (positiveInteractions.length > 0) {
        preferences.preferred_distance_km = Math.round(
          preferences.distance_preference / positiveInteractions.length
        );
      }
    }

    // Store learned preferences
    const { error: upsertError } = await supabase
      .from('user_preferences_learned')
      .upsert({
        user_email: userEmail,
        preferred_age_range: preferences.preferred_age_range 
          ? `[${preferences.preferred_age_range[0]},${preferences.preferred_age_range[1]})`
          : null,
        preferred_distance_km: preferences.preferred_distance_km || null,
        preferred_profile_types: preferences.preferred_profile_types,
        preferred_interests: preferences.preferred_interests,
        preferred_archetypes: preferences.preferred_archetypes,
        interaction_weights: {
          profile_types: preferences.profile_types,
          interests: preferences.interests,
          archetypes: preferences.archetypes,
          age_scores: preferences.age_scores,
        },
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'user_email',
      });

    if (upsertError) {
      console.error('[recommendations/learn] Upsert error:', upsertError);
    }

    return preferences;
  } catch (error) {
    console.error('[recommendations/learn] Error:', error);
    return null;
  }
}

// Calculate ML-enhanced score using learned preferences
function calculateMLScore(profile, learnedPrefs) {
  if (!learnedPrefs) return 0;

  let score = 0;
  const weights = learnedPrefs.interaction_weights || {};

  // Profile type match
  const profileType = profile.profile_type || 'standard';
  if (weights.profile_types?.[profileType]) {
    score += weights.profile_types[profileType] * 15;
  }

  // Interest overlap
  const profileInterests = profile.interests || profile.tags || [];
  for (const interest of profileInterests) {
    if (weights.interests?.[interest]) {
      score += weights.interests[interest] * 5;
    }
  }

  // Archetype match
  const profileArchetypes = profile.archetypes || [];
  for (const archetype of profileArchetypes) {
    if (weights.archetypes?.[archetype]) {
      score += weights.archetypes[archetype] * 8;
    }
  }

  // Age match
  if (profile.age && weights.age_scores) {
    const ageBucket = Math.floor(profile.age / 5) * 5;
    if (weights.age_scores[ageBucket]) {
      score += weights.age_scores[ageBucket] * 10;
    }
  }

  // Normalize to 0-20 range
  return Math.max(0, Math.min(20, score));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // Get authenticated user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const preferences = await learnPreferences(user.email);

    if (!preferences) {
      return res.status(200).json({
        success: true,
        message: 'Not enough interactions to learn preferences',
        preferences: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Preferences updated',
      preferences: {
        preferred_age_range: preferences.preferred_age_range,
        preferred_distance_km: preferences.preferred_distance_km,
        preferred_profile_types: preferences.preferred_profile_types,
        preferred_interests: preferences.preferred_interests?.slice(0, 10),
        preferred_archetypes: preferences.preferred_archetypes?.slice(0, 5),
        interaction_count: preferences.interaction_count,
      },
    });
  } catch (error) {
    console.error('[recommendations/learn] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export { learnPreferences, calculateMLScore };
