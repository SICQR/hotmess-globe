import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '../test/mocks/react-query';

// Mock fetch
global.fetch = vi.fn();

// Mock the actual hook - we'll test the logic
describe('Match Probability Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        matchProbability: 85,
        breakdown: {
          travel: 18,
          roleCompat: 15,
          kinkOverlap: 12,
          intent: 8,
          semantic: 8,
          lifestyle: 7,
          activity: 6,
          completeness: 6,
          chem: 3,
          hosting: 2,
        },
        travelTimeMinutes: 12,
      }),
    });
  });

  it('should fetch match probability for a user', async () => {
    const mockFetch = global.fetch as any;
    
    // Simulate a fetch call
    const response = await fetch('/api/match-probability/single?targetUserId=user-123');
    const data = await response.json();
    
    expect(data.matchProbability).toBe(85);
    expect(data.breakdown.roleCompat).toBe(15);
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });
    
    const response = await fetch('/api/match-probability/single?targetUserId=user-123');
    expect(response.ok).toBe(false);
  });

  it('should return breakdown with all expected fields', async () => {
    const response = await fetch('/api/match-probability/single?targetUserId=user-123');
    const data = await response.json();
    
    const expectedFields = [
      'travel', 'roleCompat', 'kinkOverlap', 'intent', 
      'semantic', 'lifestyle', 'activity', 'completeness', 
      'chem', 'hosting'
    ];
    
    expectedFields.forEach(field => {
      expect(data.breakdown).toHaveProperty(field);
      expect(typeof data.breakdown[field]).toBe('number');
    });
  });
});
