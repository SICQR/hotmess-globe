/**
 * HOTMESS Radio → Business Closed Loop
 * 
 * - Shows declare optional city_focus[]
 * - Listener growth boosts city warmth
 * - Businesses can sponsor a show window, not users
 * - Post-show: see lift vs baseline (city-level)
 * 
 * This tells venues where to book DJs.
 * This tells labels where to launch.
 */

// Warmth boost per listener (capped)
const LISTENER_WARMTH_FACTOR = 0.05;
const MAX_WARMTH_BOOST = 2.0;

// Sponsorship rules
const SPONSORSHIP_RULES = {
  minShowDurationMinutes: 30,
  maxActiveSponsorsPerShow: 3,
  cooldownHours: 24, // Same sponsor can't repeat within 24h
};

/**
 * Calculate warmth boost from radio listeners
 */
export function calculateWarmthBoost(listenerCount, baselineListeners) {
  if (!listenerCount || listenerCount <= baselineListeners) {
    return 0;
  }

  const growth = listenerCount - baselineListeners;
  const boost = growth * LISTENER_WARMTH_FACTOR;
  
  return Math.min(boost, MAX_WARMTH_BOOST);
}

/**
 * Get city warmth impact from a radio show
 */
export function getShowCityImpact(show) {
  const impacts = [];

  // Primary city focus
  if (show.city_focus?.length > 0) {
    for (const city of show.city_focus) {
      impacts.push({
        city,
        source: 'city_focus',
        weight: 1.0,
      });
    }
  }

  // Secondary: where listeners are (aggregated, delayed)
  if (show.listener_cities) {
    for (const [city, count] of Object.entries(show.listener_cities)) {
      if (count >= 20) { // k-anon threshold
        impacts.push({
          city,
          source: 'listener_aggregate',
          weight: 0.3, // Lower weight than declared focus
          k_count: count,
        });
      }
    }
  }

  return impacts;
}

/**
 * Validate sponsorship request
 */
export function validateSponsorship(business, show, existingSponsors) {
  const errors = [];

  // Business must be verified
  if (!business.verified) {
    errors.push('business_not_verified');
  }

  // Show must meet minimum duration
  if (show.duration_minutes < SPONSORSHIP_RULES.minShowDurationMinutes) {
    errors.push('show_too_short');
  }

  // Check max sponsors per show
  if (existingSponsors.length >= SPONSORSHIP_RULES.maxActiveSponsorsPerShow) {
    errors.push('max_sponsors_reached');
  }

  // Check cooldown
  const recentSponsorships = existingSponsors.filter(s => 
    s.business_id === business.id && 
    isWithinCooldown(s.created_at)
  );
  if (recentSponsorships.length > 0) {
    errors.push('cooldown_active');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isWithinCooldown(timestamp) {
  const cooldownMs = SPONSORSHIP_RULES.cooldownHours * 60 * 60 * 1000;
  return Date.now() - new Date(timestamp).getTime() < cooldownMs;
}

/**
 * Calculate post-show metrics
 */
export function calculateShowMetrics(show, baseline) {
  const metrics = {
    showId: show.id,
    duration: show.duration_minutes,
    cities: {},
  };

  // Per-city impact
  for (const city of (show.city_focus || [])) {
    const cityBaseline = baseline.cities?.[city] || {};
    const cityNow = show.end_state?.cities?.[city] || {};

    metrics.cities[city] = {
      listeners: {
        baseline: cityBaseline.listeners || 0,
        peak: cityNow.peak_listeners || 0,
        lift: (cityNow.peak_listeners || 0) - (cityBaseline.listeners || 0),
      },
      heat: {
        baseline: cityBaseline.heat || 0,
        end: cityNow.heat || 0,
        lift: (cityNow.heat || 0) - (cityBaseline.heat || 0),
      },
      events: {
        taps: cityNow.event_taps || 0,
        conversions: cityNow.event_conversions || 0,
      },
    };
  }

  // Aggregate metrics
  metrics.total = {
    peakListeners: show.peak_listeners || 0,
    avgListeners: show.avg_listeners || 0,
    uniqueListeners: show.unique_listeners || 0,
    cityReach: Object.keys(metrics.cities).length,
    totalLift: Object.values(metrics.cities).reduce(
      (sum, c) => sum + (c.heat?.lift || 0), 0
    ),
  };

  return metrics;
}

/**
 * Get sponsor ROI metrics
 */
export function calculateSponsorROI(sponsorship, showMetrics) {
  const focusCities = sponsorship.city_focus || [];
  let totalReach = 0;
  let totalLift = 0;

  for (const city of focusCities) {
    const cityMetrics = showMetrics.cities?.[city];
    if (cityMetrics) {
      totalReach += cityMetrics.listeners?.peak || 0;
      totalLift += cityMetrics.heat?.lift || 0;
    }
  }

  const spend = sponsorship.budget || 0;
  const costPerReach = spend > 0 ? spend / Math.max(totalReach, 1) : 0;
  const costPerLift = spend > 0 ? spend / Math.max(totalLift, 0.1) : 0;

  return {
    sponsorshipId: sponsorship.id,
    spend,
    reach: totalReach,
    lift: totalLift,
    costPerReach: Math.round(costPerReach * 100) / 100,
    costPerLift: Math.round(costPerLift * 100) / 100,
    roi: totalLift > 0 ? (totalLift / spend) : 0,
  };
}

/**
 * Create radio signal for globe
 */
export function createRadioSignal(show, intensity) {
  return {
    id: `radio_${show.id}`,
    source: 'radio_session',
    type: 'wave',
    city: show.city_focus?.[0] || 'global',
    cities: show.city_focus || [],
    intensity: Math.min(intensity, 1.0),
    show_name: show.title,
    host: show.host_name,
    timestamp: new Date().toISOString(),
    k_count: show.listener_count || 0,
    expires_at: show.end_time,
  };
}

/**
 * Get shows affecting a city
 */
export function getShowsAffectingCity(shows, cityId) {
  return shows.filter(show => {
    // Direct city focus
    if (show.city_focus?.includes(cityId)) return true;
    
    // Listener aggregate (if above threshold)
    const listenerCount = show.listener_cities?.[cityId] || 0;
    if (listenerCount >= 20) return true;
    
    return false;
  });
}
