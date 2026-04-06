/**
 * Trust scoring — calculateRankScore tests
 */
import { describe, it, expect } from 'vitest';
import { calculateRankScore } from '@/os/moderation';

const baseTrust = {
  responseRate: 0.5,
  reliabilityScore: 0.7,
  verified: false,
  noShowCount: 0,
  reportCount: 0,
};

describe('calculateRankScore', () => {
  it('returns a value between 0 and 1', () => {
    for (let i = 0; i < 50; i++) {
      const score = calculateRankScore(baseTrust, 10, true, 2);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('applies 0.5x multiplier for 0 photos', () => {
    // Remove randomness by using custom weights
    const weights = { distance: 0, online: 0, verified: 0, trust: 1, photo: 0, randomDelta: 0 };
    const with0 = calculateRankScore(baseTrust, 10, false, 0, weights);
    const with1 = calculateRankScore(baseTrust, 10, false, 1, weights);
    // 0 photos → 0.5x multiplier on trust score, 1 photo → 1.0x
    expect(with0).toBeCloseTo(baseTrust.reliabilityScore * 0.5, 2);
    expect(with1).toBeCloseTo(baseTrust.reliabilityScore * 1.0, 2);
  });

  it('applies 1.2x multiplier for 3+ photos (unverified)', () => {
    const weights = { distance: 0, online: 0, verified: 0, trust: 1, photo: 0, randomDelta: 0 };
    const score = calculateRankScore(baseTrust, 10, false, 4, weights);
    expect(score).toBeCloseTo(baseTrust.reliabilityScore * 1.2, 2);
  });

  it('applies 1.4x multiplier for verified + 3+ photos', () => {
    const verified = { ...baseTrust, verified: true };
    const weights = { distance: 0, online: 0, verified: 0, trust: 1, photo: 0, randomDelta: 0 };
    const score = calculateRankScore(verified, 10, false, 5, weights);
    expect(score).toBeCloseTo(verified.reliabilityScore * 1.4, 2);
  });

  it('ranks online users higher than offline (all else equal)', () => {
    const weights = { distance: 0, online: 1, verified: 0, trust: 0, photo: 0, randomDelta: 0 };
    const online = calculateRankScore(baseTrust, 10, true, 2, weights);
    const offline = calculateRankScore(baseTrust, 10, false, 2, weights);
    expect(online).toBeGreaterThan(offline);
  });

  it('ranks closer users higher', () => {
    const weights = { distance: 1, online: 0, verified: 0, trust: 0, photo: 0, randomDelta: 0 };
    const near = calculateRankScore(baseTrust, 1, false, 2, weights);
    const far = calculateRankScore(baseTrust, 50, false, 2, weights);
    expect(near).toBeGreaterThan(far);
  });

  it('ranks verified users higher', () => {
    const weights = { distance: 0, online: 0, verified: 1, trust: 0, photo: 0, randomDelta: 0 };
    const verified = calculateRankScore({ ...baseTrust, verified: true }, 10, false, 2, weights);
    const unverified = calculateRankScore(baseTrust, 10, false, 2, weights);
    expect(verified).toBeGreaterThan(unverified);
  });

  it('clamps extreme scores to [0, 1]', () => {
    const extreme = { ...baseTrust, reliabilityScore: 100 };
    const weights = { distance: 1, online: 1, verified: 1, trust: 1, photo: 1, randomDelta: 0 };
    const score = calculateRankScore(extreme, 0, true, 10, weights);
    expect(score).toBeLessThanOrEqual(1);
  });
});
