/**
 * HOTMESS DJ Archetypes System
 * 
 * DJs are treated as micro-enterprises, not uploads.
 * Access is earned, contextual, and revocable.
 * 
 * Three canonical archetypes:
 * 1. SCENE_ANCHOR - Local power, community builders
 * 2. CULT_TRANSLATOR - Underground credibility, taste leaders
 * 3. MOVING_EXPORT - Touring asset, festival crossover
 */

export const DJ_ARCHETYPES = {
  SCENE_ANCHOR: {
    id: 'scene_anchor',
    name: 'Scene Anchor',
    description: 'Local power. Community builders. The reason a night exists.',
    signals: [
      'consistent_local_heat',
      'event_linked',
      'strong_city_affinity',
    ],
    role: {
      radio: 'regular_rotations', // Not weekly, earned
      events: 'local_priority',
      visibility: 'city_anchored',
    },
    notAllowed: [
      'touring_hype',
      'algorithm_chasing',
    ],
    limits: {
      maxRadioPerMonth: 4,
      maxCitiesActive: 2,
      cooldownDays: 7,
    },
  },
  
  CULT_TRANSLATOR: {
    id: 'cult_translator',
    name: 'Cult Translator',
    description: 'Niche selectors. Taste leaders. Often unknown outside scene.',
    signals: [
      'small_intense_engagement',
      'late_night_spikes',
      'cross_city_resonance',
    ],
    role: {
      radio: 'late_night',
      events: 'invitation_only',
      visibility: 'protected', // Never overexposed
    },
    notAllowed: [
      'forced_promo',
      'overexposure',
    ],
    limits: {
      maxRadioPerMonth: 2,
      maxCitiesActive: 3,
      cooldownDays: 14,
    },
    protection: {
      maxConsecutiveAppearances: 2,
      minDaysBetweenFeatures: 21,
    },
  },
  
  MOVING_EXPORT: {
    id: 'moving_export',
    name: 'Moving Export',
    description: 'Touring DJs. Festival crossover. Label-affiliated.',
    signals: [
      'city_to_city_heat',
      'ticket_velocity',
      'radio_travel_aligned',
    ],
    role: {
      radio: 'event_led', // Only appears around events
      events: 'ticket_sales_integration',
      visibility: 'measured_amplification',
    },
    notAllowed: [
      'pay_to_play_radio',
    ],
    limits: {
      maxRadioPerMonth: 3,
      maxCitiesActive: 5,
      cooldownDays: 5,
    },
  },
};

// DJs HOTMESS does NOT support
export const BLOCKED_DJ_TYPES = [
  'upload_only', // No content platform behavior
  'influencer_first', // No clout chasers
  'access_sellers', // No selling "access"
  'guaranteed_reach_demanders', // No pay-to-play
];

/**
 * Validate if a DJ profile fits an archetype
 */
export function validateArchetype(djProfile, targetArchetype) {
  const archetype = DJ_ARCHETYPES[targetArchetype];
  if (!archetype) return { valid: false, reason: 'unknown_archetype' };

  const errors = [];
  
  // Check required signals
  const matchedSignals = archetype.signals.filter(signal => 
    djProfile.signals?.includes(signal)
  );
  
  if (matchedSignals.length < 2) {
    errors.push(`Needs at least 2 of: ${archetype.signals.join(', ')}`);
  }

  // Check blocked behaviors
  for (const blocked of archetype.notAllowed) {
    if (djProfile.behaviors?.includes(blocked)) {
      errors.push(`Cannot have behavior: ${blocked}`);
    }
  }

  return {
    valid: errors.length === 0,
    matchedSignals,
    errors,
  };
}

/**
 * Check if DJ can appear (respects limits)
 */
export function canAppear(djProfile, context) {
  const archetype = DJ_ARCHETYPES[djProfile.archetype];
  if (!archetype) return { allowed: false, reason: 'no_archetype' };

  const { limits, protection } = archetype;
  const now = new Date();

  // Check monthly radio limit
  if (context.radioAppearancesThisMonth >= limits.maxRadioPerMonth) {
    return { allowed: false, reason: 'monthly_radio_limit' };
  }

  // Check city limit
  if (context.activeCities?.length >= limits.maxCitiesActive) {
    return { allowed: false, reason: 'city_limit' };
  }

  // Check cooldown
  if (context.lastAppearance) {
    const daysSince = (now - new Date(context.lastAppearance)) / (1000 * 60 * 60 * 24);
    if (daysSince < limits.cooldownDays) {
      return { 
        allowed: false, 
        reason: 'cooldown',
        availableIn: Math.ceil(limits.cooldownDays - daysSince),
      };
    }
  }

  // Cult Translator protection
  if (protection) {
    if (context.consecutiveAppearances >= protection.maxConsecutiveAppearances) {
      return { allowed: false, reason: 'overexposure_protection' };
    }
    if (context.lastFeature) {
      const daysSinceFeature = (now - new Date(context.lastFeature)) / (1000 * 60 * 60 * 24);
      if (daysSinceFeature < protection.minDaysBetweenFeatures) {
        return { allowed: false, reason: 'feature_cooldown' };
      }
    }
  }

  return { allowed: true };
}

/**
 * Get DJ visibility level based on context
 */
export function getVisibility(djProfile, viewContext) {
  const archetype = DJ_ARCHETYPES[djProfile.archetype];
  if (!archetype) return 'hidden';

  // DJs only appear via context, never browsed
  if (!viewContext.entryPoint) return 'hidden';

  const validEntryPoints = ['radio', 'event', 'globe_pulse'];
  if (!validEntryPoints.includes(viewContext.entryPoint)) {
    return 'hidden';
  }

  // Check city relevance
  if (archetype.role.visibility === 'city_anchored') {
    if (viewContext.city !== djProfile.primaryCity) {
      return 'reduced';
    }
  }

  // Check protection for Cult Translators
  if (archetype.role.visibility === 'protected') {
    if (viewContext.isFeature && djProfile.recentFeatureCount > 0) {
      return 'reduced';
    }
  }

  return 'full';
}

/**
 * Calculate DJ heat contribution to city
 */
export function calculateHeatContribution(djProfile, cityContext) {
  const archetype = DJ_ARCHETYPES[djProfile.archetype];
  if (!archetype) return 0;

  let base = 0;

  switch (archetype.id) {
    case 'scene_anchor':
      // Strong local impact
      base = djProfile.primaryCity === cityContext.city ? 1.0 : 0.2;
      break;
    case 'cult_translator':
      // Moderate, cross-city impact
      base = 0.6;
      break;
    case 'moving_export':
      // Impact tied to event
      base = cityContext.hasUpcomingEvent ? 0.8 : 0.3;
      break;
  }

  // Apply city affinity modifier
  const affinityBonus = djProfile.cityAffinities?.[cityContext.city] || 0;
  
  return Math.min(base + affinityBonus * 0.2, 1.0);
}
