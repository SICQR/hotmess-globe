/**
 * HOTMESS Label Archetypes
 * 
 * Labels are partners, not advertisers.
 * Records are moments, not tracks.
 */

export const LABEL_ARCHETYPES = {
  SCENE_LABEL: {
    id: 'scene_label',
    name: 'Scene Label',
    description: 'Local. Physical + digital. Event-integrated.',
    value: [
      'city_readiness_data',
      'radio_context',
      'ticket_uplift',
    ],
    tier: 'partner',
    benefits: {
      cityInsights: true,
      radioSlots: 2, // per month
      eventIntegration: true,
      amplificationDiscount: 0.2,
    },
  },
  
  EXPORT_LABEL: {
    id: 'export_label',
    name: 'Export Label',
    description: 'Touring pipeline. Cross-border releases.',
    value: [
      'market_testing',
      'city_heat_forecasting',
      'launch_timing',
    ],
    tier: 'premium',
    benefits: {
      cityInsights: true,
      radioSlots: 4,
      eventIntegration: true,
      crossCityData: true,
      amplificationDiscount: 0.15,
    },
  },
  
  CULT_IMPRINT: {
    id: 'cult_imprint',
    name: 'Cult Imprint',
    description: 'Small. Taste-driven. Limited releases.',
    value: [
      'prestige',
      'context',
      'spam_protection',
    ],
    tier: 'exclusive',
    benefits: {
      cityInsights: true,
      radioSlots: 1, // Quality over quantity
      eventIntegration: true,
      protectedVisibility: true, // Never drowned out
      curatedFeatures: true,
      amplificationDiscount: 0,
    },
  },
};

// Labels HOTMESS does NOT want
export const BLOCKED_LABEL_TYPES = [
  'bulk_promo_farm',
  'stream_chasing',
  'editorial_control_demanders',
];

/**
 * Label partnership tiers
 */
export const PARTNERSHIP_TIERS = {
  OBSERVER: {
    id: 'observer',
    name: 'Observer',
    cost: 0,
    benefits: {
      cityInsights: 'basic', // Aggregate only
      radioSlots: 0,
      eventIntegration: false,
    },
  },
  
  PARTNER: {
    id: 'partner',
    name: 'Partner',
    cost: 500, // Monthly
    benefits: {
      cityInsights: 'detailed',
      radioSlots: 2,
      eventIntegration: true,
      dropListings: 3,
    },
  },
  
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    cost: 1500,
    benefits: {
      cityInsights: 'full',
      radioSlots: 4,
      eventIntegration: true,
      crossCityData: true,
      dropListings: 10,
      prioritySupport: true,
    },
  },
  
  EXCLUSIVE: {
    id: 'exclusive',
    name: 'Exclusive',
    cost: 'custom', // By invitation
    benefits: {
      cityInsights: 'full',
      radioSlots: 'unlimited',
      eventIntegration: true,
      crossCityData: true,
      dropListings: 'unlimited',
      curatedFeatures: true,
      protectedVisibility: true,
      dedicatedSupport: true,
    },
  },
};

/**
 * Validate label for partnership
 */
export function validateLabelPartnership(labelProfile, targetTier) {
  const tier = PARTNERSHIP_TIERS[targetTier];
  if (!tier) return { valid: false, reason: 'unknown_tier' };

  const errors = [];

  // Check for blocked behaviors
  for (const blocked of BLOCKED_LABEL_TYPES) {
    if (labelProfile.behaviors?.includes(blocked)) {
      errors.push(`Blocked behavior: ${blocked}`);
    }
  }

  // Exclusive tier requires invitation
  if (targetTier === 'EXCLUSIVE' && !labelProfile.hasInvitation) {
    errors.push('Exclusive tier requires invitation');
  }

  // Check minimum release history
  if (targetTier !== 'OBSERVER') {
    if ((labelProfile.releaseCount || 0) < 3) {
      errors.push('Minimum 3 releases required for partnership');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    tier,
  };
}

/**
 * Get label visibility based on context
 */
export function getLabelVisibility(labelProfile, viewContext) {
  // Labels appear via releases, DJs, or events - never browsed directly
  if (!viewContext.entryPoint) return 'hidden';

  const validEntryPoints = ['release', 'dj_context', 'event', 'radio'];
  if (!validEntryPoints.includes(viewContext.entryPoint)) {
    return 'hidden';
  }

  // Cult imprints get protected visibility
  if (labelProfile.archetype === 'CULT_IMPRINT') {
    return 'protected'; // Never drowned out by bigger labels
  }

  return 'standard';
}

/**
 * Calculate label's city impact
 */
export function calculateLabelCityImpact(labelProfile, cityId) {
  const releases = labelProfile.releases?.filter(r => 
    r.citiesActive?.includes(cityId)
  ) || [];

  const djs = labelProfile.roster?.filter(dj =>
    dj.primaryCity === cityId || dj.cityAffinities?.[cityId] > 0.5
  ) || [];

  const events = labelProfile.events?.filter(e =>
    e.city === cityId && new Date(e.date) > new Date()
  ) || [];

  return {
    releaseCount: releases.length,
    activeRoster: djs.length,
    upcomingEvents: events.length,
    impactScore: (releases.length * 0.3) + (djs.length * 0.4) + (events.length * 0.3),
  };
}
