/**
 * Tests for useGlobeData hook
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGlobeData } from '../useGlobeData';
import { supabase } from '@/components/utils/supabaseClient';

// Mock Supabase
vi.mock('@/components/utils/supabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue({ status: 'SUBSCRIBED' }),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('useGlobeData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty beacons array', () => {
    const { result } = renderHook(() => useGlobeData());
    expect(result.current).toEqual([]);
  });

  it('should subscribe to Beacon table changes', () => {
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue({ status: 'SUBSCRIBED' }),
    };
    
    supabase.channel.mockReturnValue(mockChannel);

    renderHook(() => useGlobeData());

    // Verify subscription to INSERT events
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'Beacon' },
      expect.any(Function)
    );
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useGlobeData());
    unmount();
    
    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});
