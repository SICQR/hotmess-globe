import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRealtimeSubscription, usePresenceSubscription, useBroadcastSubscription } from './useRealtimeSubscription';

// Mock channel object
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  untrack: vi.fn(),
  track: vi.fn(),
  send: vi.fn(),
};

// Mock supabase
vi.mock('@/components/utils/supabaseClient', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}));

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

describe('useRealtimeSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel.subscribe.mockImplementation((callback) => {
      // Simulate successful subscription
      callback('SUBSCRIBED');
      return mockChannel;
    });
  });

  it('should not subscribe when disabled', () => {
    const { result } = renderHook(
      () => useRealtimeSubscription('test_table', { enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isConnected).toBe(false);
  });

  it('should not subscribe when table is not provided', () => {
    const { result } = renderHook(
      () => useRealtimeSubscription(null),
      { wrapper: createWrapper() }
    );

    expect(result.current.isConnected).toBe(false);
  });

  it('should subscribe to table changes', async () => {
    const { supabase } = await import('@/components/utils/supabaseClient');

    const { result } = renderHook(
      () => useRealtimeSubscription('messages'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(supabase.channel).toHaveBeenCalledWith(expect.stringContaining('messages'));
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'messages',
        schema: 'public',
      }),
      expect.any(Function)
    );
  });

  it('should call onInsert handler on INSERT event', async () => {
    const onInsert = vi.fn();
    let payloadHandler;

    mockChannel.on.mockImplementation((event, config, handler) => {
      if (event === 'postgres_changes') {
        payloadHandler = handler;
      }
      return mockChannel;
    });

    renderHook(
      () => useRealtimeSubscription('messages', { onInsert }),
      { wrapper: createWrapper() }
    );

    // Simulate INSERT event
    act(() => {
      payloadHandler({
        eventType: 'INSERT',
        new: { id: 1, content: 'Hello' },
        old: null,
      });
    });

    expect(onInsert).toHaveBeenCalledWith({ id: 1, content: 'Hello' });
  });

  it('should call onUpdate handler on UPDATE event', async () => {
    const onUpdate = vi.fn();
    let payloadHandler;

    mockChannel.on.mockImplementation((event, config, handler) => {
      if (event === 'postgres_changes') {
        payloadHandler = handler;
      }
      return mockChannel;
    });

    renderHook(
      () => useRealtimeSubscription('messages', { onUpdate }),
      { wrapper: createWrapper() }
    );

    // Simulate UPDATE event
    act(() => {
      payloadHandler({
        eventType: 'UPDATE',
        new: { id: 1, content: 'Updated' },
        old: { id: 1, content: 'Original' },
      });
    });

    expect(onUpdate).toHaveBeenCalledWith(
      { id: 1, content: 'Updated' },
      { id: 1, content: 'Original' }
    );
  });

  it('should handle channel errors', async () => {
    mockChannel.subscribe.mockImplementation((callback) => {
      callback('CHANNEL_ERROR');
      return mockChannel;
    });

    const { result } = renderHook(
      () => useRealtimeSubscription('messages'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('should unsubscribe on unmount', async () => {
    const { supabase } = await import('@/components/utils/supabaseClient');

    const { unmount } = renderHook(
      () => useRealtimeSubscription('messages'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      // Wait for subscription
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});

describe('usePresenceSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel.subscribe.mockImplementation(async (callback) => {
      callback('SUBSCRIBED');
      return mockChannel;
    });
    mockChannel.presenceState = vi.fn().mockReturnValue({});
    mockChannel.track.mockResolvedValue(undefined);
  });

  it('should not subscribe when disabled', () => {
    const { result } = renderHook(
      () => usePresenceSubscription('room:1', { enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isConnected).toBe(false);
  });

  it('should track user presence', async () => {
    const userInfo = { id: 'user-123', name: 'Test User' };

    const { result } = renderHook(
      () => usePresenceSubscription('room:1', { userInfo }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(mockChannel.track).toHaveBeenCalledWith(userInfo);
  });

  it('should return online count', async () => {
    mockChannel.presenceState.mockReturnValue({
      'user-1': [{}],
      'user-2': [{}],
      'user-3': [{}],
    });

    let syncHandler;
    mockChannel.on.mockImplementation((event, config, handler) => {
      if (event === 'presence' && config.event === 'sync') {
        syncHandler = handler;
      }
      return mockChannel;
    });

    const { result } = renderHook(
      () => usePresenceSubscription('room:1'),
      { wrapper: createWrapper() }
    );

    // Simulate sync event
    act(() => {
      syncHandler();
    });

    expect(result.current.onlineCount).toBe(3);
  });
});

describe('useBroadcastSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannel.subscribe.mockImplementation((callback) => {
      callback('SUBSCRIBED');
      return mockChannel;
    });
    mockChannel.send.mockResolvedValue(undefined);
  });

  it('should subscribe to broadcast messages', async () => {
    const onMessage = vi.fn();

    const { result } = renderHook(
      () => useBroadcastSubscription('chat:1', { onMessage }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(mockChannel.on).toHaveBeenCalledWith(
      'broadcast',
      expect.objectContaining({ event: 'message' }),
      expect.any(Function)
    );
  });

  it('should be able to broadcast messages', async () => {
    const { result } = renderHook(
      () => useBroadcastSubscription('chat:1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    await act(async () => {
      await result.current.broadcast({ text: 'Hello!' });
    });

    expect(mockChannel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'message',
      payload: { text: 'Hello!' },
    });
  });
});
