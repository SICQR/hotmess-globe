/**
 * A/B Testing Framework
 * 
 * Simple, client-side A/B testing for CTAs and UI variations.
 * Integrates with analytics for tracking conversions.
 */

import { trackEvent } from './analytics';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Define experiments here
 * Each experiment has:
 * - id: unique identifier
 * - variants: array of variant objects with id and weight
 * - defaultVariant: fallback variant id
 */
export const EXPERIMENTS = {
  hero_cta: {
    id: 'hero_cta',
    variants: [
      { id: 'control', label: 'GET STARTED FREE', weight: 50 },
      { id: 'action', label: 'START MATCHING NOW', weight: 25 },
      { id: 'social_proof', label: 'JOIN 10K+ MEMBERS', weight: 25 },
    ],
    defaultVariant: 'control',
  },
  
  go_live_cta: {
    id: 'go_live_cta',
    variants: [
      { id: 'control', label: 'Go Live', weight: 50 },
      { id: 'urgency', label: 'Go Live Now', weight: 25 },
      { id: 'count', label: 'Go Live ({count} online)', weight: 25 },
    ],
    defaultVariant: 'control',
  },

  match_score_display: {
    id: 'match_score_display',
    variants: [
      { id: 'percentage', format: 'percentage', weight: 40 }, // "87%"
      { id: 'label', format: 'label', weight: 30 },           // "Great Match"
      { id: 'both', format: 'both', weight: 30 },             // "87% - Great Match"
    ],
    defaultVariant: 'percentage',
  },

  profile_completion_prompt: {
    id: 'profile_completion_prompt',
    variants: [
      { id: 'banner', type: 'banner', weight: 34 },
      { id: 'card', type: 'card', weight: 33 },
      { id: 'nudge', type: 'nudge', weight: 33 },
    ],
    defaultVariant: 'banner',
  },

  sort_default: {
    id: 'sort_default',
    variants: [
      { id: 'match', sortBy: 'match', weight: 50 },
      { id: 'distance', sortBy: 'distance', weight: 25 },
      { id: 'lastActive', sortBy: 'lastActive', weight: 25 },
    ],
    defaultVariant: 'match',
  },
};

// ============================================================================
// Core Functions
// ============================================================================

const STORAGE_KEY = 'hotmess_ab_assignments';
const EXPOSURE_KEY = 'hotmess_ab_exposures';

/**
 * Get or assign a variant for an experiment
 */
export function getVariant(experimentId, userId = null) {
  const experiment = EXPERIMENTS[experimentId];
  if (!experiment) {
    console.warn(`Unknown experiment: ${experimentId}`);
    return null;
  }

  // Check for stored assignment
  const assignments = getStoredAssignments();
  
  if (assignments[experimentId]) {
    return experiment.variants.find(v => v.id === assignments[experimentId]) || 
           experiment.variants.find(v => v.id === experiment.defaultVariant);
  }

  // Assign new variant
  const variant = assignVariant(experiment, userId);
  
  // Store assignment
  assignments[experimentId] = variant.id;
  storeAssignments(assignments);

  return variant;
}

/**
 * Weighted random variant assignment
 */
function assignVariant(experiment, userId = null) {
  const { variants, defaultVariant } = experiment;
  
  // If user ID provided, use deterministic assignment
  if (userId) {
    const hash = hashString(userId + experiment.id);
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const target = hash % totalWeight;
    
    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (target < cumulative) {
        return variant;
      }
    }
  }

  // Random assignment based on weights
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  const random = Math.random() * totalWeight;
  
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (random < cumulative) {
      return variant;
    }
  }

  // Fallback
  return variants.find(v => v.id === defaultVariant) || variants[0];
}

/**
 * Simple string hash for deterministic assignment
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ============================================================================
// Storage
// ============================================================================

function getStoredAssignments() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function storeAssignments(assignments) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  } catch (e) {
    console.warn('Failed to store A/B assignments:', e);
  }
}

// ============================================================================
// Tracking
// ============================================================================

/**
 * Track when a user is exposed to a variant
 */
export function trackExposure(experimentId, variantId) {
  const exposures = getExposures();
  const key = `${experimentId}:${variantId}`;
  
  // Only track first exposure
  if (!exposures[key]) {
    exposures[key] = Date.now();
    storeExposures(exposures);
    
    trackEvent('ab_exposure', {
      experiment_id: experimentId,
      variant_id: variantId,
    });
  }
}

/**
 * Track conversion for an experiment
 */
export function trackConversion(experimentId, conversionType = 'click') {
  const assignments = getStoredAssignments();
  const variantId = assignments[experimentId];
  
  if (variantId) {
    trackEvent('ab_conversion', {
      experiment_id: experimentId,
      variant_id: variantId,
      conversion_type: conversionType,
    });
  }
}

function getExposures() {
  try {
    const stored = localStorage.getItem(EXPOSURE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function storeExposures(exposures) {
  try {
    localStorage.setItem(EXPOSURE_KEY, JSON.stringify(exposures));
  } catch (e) {
    console.warn('Failed to store exposures:', e);
  }
}

// ============================================================================
// React Hook
// ============================================================================

import { useMemo, useEffect } from 'react';

/**
 * React hook for A/B testing
 * 
 * Usage:
 * const { variant, trackClick } = useExperiment('hero_cta', user?.id);
 * <Button onClick={trackClick}>{variant.label}</Button>
 */
export function useExperiment(experimentId, userId = null) {
  const variant = useMemo(() => {
    return getVariant(experimentId, userId);
  }, [experimentId, userId]);

  // Track exposure on mount
  useEffect(() => {
    if (variant) {
      trackExposure(experimentId, variant.id);
    }
  }, [experimentId, variant]);

  const trackClick = () => {
    trackConversion(experimentId, 'click');
  };

  const trackSuccess = () => {
    trackConversion(experimentId, 'success');
  };

  return {
    variant,
    variantId: variant?.id,
    trackClick,
    trackSuccess,
    experimentId,
  };
}

// ============================================================================
// Debug/Admin
// ============================================================================

/**
 * Force a specific variant (for testing)
 */
export function forceVariant(experimentId, variantId) {
  const assignments = getStoredAssignments();
  assignments[experimentId] = variantId;
  storeAssignments(assignments);
}

/**
 * Reset all assignments
 */
export function resetAllExperiments() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(EXPOSURE_KEY);
}

/**
 * Get current assignments (for debugging)
 */
export function getCurrentAssignments() {
  return getStoredAssignments();
}

/**
 * Get all experiments status
 */
export function getExperimentStatus() {
  const assignments = getStoredAssignments();
  const exposures = getExposures();

  return Object.entries(EXPERIMENTS).map(([id, experiment]) => ({
    id,
    name: experiment.id,
    assignedVariant: assignments[id] || 'not assigned',
    exposed: Object.keys(exposures).some(key => key.startsWith(`${id}:`)),
    variants: experiment.variants.map(v => v.id),
  }));
}
