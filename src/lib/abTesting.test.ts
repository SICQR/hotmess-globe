import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getVariant,
  trackExposure,
  trackConversion,
  forceVariant,
  resetAllExperiments,
  getCurrentAssignments,
  EXPERIMENTS,
} from './abTesting';

describe('A/B Testing Framework', () => {
  beforeEach(() => {
    resetAllExperiments();
    vi.clearAllMocks();
  });

  describe('getVariant', () => {
    it('returns a valid variant for known experiments', () => {
      const variant = getVariant('hero_cta');
      
      expect(variant).toBeDefined();
      expect(variant?.id).toBeDefined();
      expect(EXPERIMENTS.hero_cta.variants.some(v => v.id === variant?.id)).toBe(true);
    });

    it('returns null for unknown experiments', () => {
      const variant = getVariant('unknown_experiment' as any);
      expect(variant).toBeNull();
    });

    it('returns consistent variant for same user', () => {
      const variant1 = getVariant('hero_cta', 'user-123');
      const variant2 = getVariant('hero_cta', 'user-123');
      
      expect(variant1?.id).toBe(variant2?.id);
    });

    it('stores assignment in localStorage', () => {
      getVariant('hero_cta');
      
      const assignments = getCurrentAssignments();
      expect(assignments.hero_cta).toBeDefined();
    });
  });

  describe('forceVariant', () => {
    it('forces a specific variant', () => {
      forceVariant('hero_cta', 'action');
      
      const variant = getVariant('hero_cta');
      expect(variant?.id).toBe('action');
    });
  });

  describe('resetAllExperiments', () => {
    it('clears all assignments', () => {
      getVariant('hero_cta');
      getVariant('go_live_cta');
      
      resetAllExperiments();
      
      const assignments = getCurrentAssignments();
      expect(Object.keys(assignments).length).toBe(0);
    });
  });

  describe('Experiment Configuration', () => {
    it('has valid weight distributions', () => {
      Object.entries(EXPERIMENTS).forEach(([id, experiment]) => {
        const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
        expect(totalWeight).toBe(100);
      });
    });

    it('has default variant defined', () => {
      Object.entries(EXPERIMENTS).forEach(([id, experiment]) => {
        const defaultExists = experiment.variants.some(v => v.id === experiment.defaultVariant);
        expect(defaultExists).toBe(true);
      });
    });
  });
});
