import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRecommendations, useRecordInteraction, getScoreExplanation, getDistanceLabel } from './useRecommendations';

// Mock supabase
vi.mock('@/components/utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when disabled', () => {
    const { result } = renderHook(
      () => useRecommendations({ lat: 51.5, lng: -0.1, enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle authentication error', async () => {
    const { supabase } = await import('@/components/utils/supabaseClient');
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    const { result } = renderHook(
      () => useRecommendations({ lat: 51.5, lng: -0.1, enabled: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should fetch recommendations when authenticated', async () => {
    const { supabase } = await import('@/components/utils/supabaseClient');
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });

    const mockRecommendations = {
      recommendations: [
        { email: 'user1@test.com', score: 85 },
        { email: 'user2@test.com', score: 72 },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRecommendations),
    });

    const { result } = renderHook(
      () => useRecommendations({ lat: 51.5, lng: -0.1, limit: 20, enabled: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockRecommendations);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/recommendations'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });
});

describe('useRecordInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should record interaction when authenticated', async () => {
    const { supabase } = await import('@/components/utils/supabaseClient');
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderHook(
      () => useRecordInteraction(),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync({
      targetEmail: 'user@test.com',
      interactionType: 'like',
      metadata: { source: 'profile' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/recommendations/interaction',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
        body: JSON.stringify({
          target_email: 'user@test.com',
          interaction_type: 'like',
          metadata: { source: 'profile' },
        }),
      })
    );
  });
});

describe('getScoreExplanation', () => {
  it('should return null for missing scores', () => {
    expect(getScoreExplanation(null)).toBeNull();
    expect(getScoreExplanation(undefined)).toBeNull();
  });

  it('should return "Very close to you" for high distance score', () => {
    const result = getScoreExplanation({ distance: 30 });
    expect(result).toContain('Very close to you');
  });

  it('should return "Nearby" for medium distance score', () => {
    const result = getScoreExplanation({ distance: 22 });
    expect(result).toContain('Nearby');
  });

  it('should return "In your area" for lower distance score', () => {
    const result = getScoreExplanation({ distance: 15 });
    expect(result).toContain('In your area');
  });

  it('should return combined explanations', () => {
    const result = getScoreExplanation({
      distance: 25,
      interest: 20,
      activity: 15,
      compatibility: 18,
    });
    
    expect(result).toContain('Very close to you');
    expect(result).toContain('Many shared interests');
    expect(result).toContain('Recently active');
    expect(result).toContain('High compatibility');
  });

  it('should return "Good match" when no specific explanations', () => {
    const result = getScoreExplanation({ distance: 5, interest: 5 });
    expect(result).toBe('Good match');
  });
});

describe('getDistanceLabel', () => {
  it('should return null for missing distance', () => {
    expect(getDistanceLabel(null)).toBeNull();
    expect(getDistanceLabel(undefined)).toBeNull();
  });

  it('should return "Less than 1 km" for distances under 1km', () => {
    expect(getDistanceLabel(0.5)).toBe('Less than 1 km');
    expect(getDistanceLabel(0.8)).toBe('Less than 1 km');
  });

  it('should return distance with one decimal for under 5km', () => {
    expect(getDistanceLabel(2.3)).toBe('2.3 km away');
    expect(getDistanceLabel(4.5)).toBe('4.5 km away');
  });

  it('should return rounded distance for under 50km', () => {
    expect(getDistanceLabel(12.6)).toBe('13 km away');
    expect(getDistanceLabel(25.2)).toBe('25 km away');
  });

  it('should return rounded distance without "away" for over 50km', () => {
    expect(getDistanceLabel(75)).toBe('75 km');
    expect(getDistanceLabel(150.5)).toBe('151 km');
  });
});
