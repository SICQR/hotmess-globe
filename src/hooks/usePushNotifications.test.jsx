import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePushNotifications } from './usePushNotifications';

// Mock navigator
const mockServiceWorkerRegistration = {
  pushManager: {
    getSubscription: vi.fn(),
    subscribe: vi.fn(),
  },
  showNotification: vi.fn(),
};

const mockSubscription = {
  endpoint: 'https://push.example.com/test',
  unsubscribe: vi.fn(),
  toJSON: () => ({
    endpoint: 'https://push.example.com/test',
    keys: {
      p256dh: 'test-key',
      auth: 'test-auth',
    },
  }),
};

// Mock supabase
vi.mock('@/components/utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
      }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

describe('usePushNotifications', () => {
  const originalNavigator = global.navigator;
  const originalNotification = global.Notification;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock navigator.serviceWorker
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          ready: Promise.resolve(mockServiceWorkerRegistration),
        },
      },
      writable: true,
    });

    // Mock window.PushManager
    global.PushManager = vi.fn();

    // Mock Notification
    global.Notification = {
      permission: 'default',
      requestPermission: vi.fn(),
    };

    // Reset mocks
    mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null);
    mockSubscription.unsubscribe.mockResolvedValue(true);
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
    global.Notification = originalNotification;
    delete global.PushManager;
  });

  it('should detect push notification support', async () => {
    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isSupported).toBe(true);
    expect(result.current.permission).toBe('default');
  });

  it('should detect unsupported environment', async () => {
    delete global.navigator.serviceWorker;

    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isSupported).toBe(false);
  });

  it('should check existing subscription on mount', async () => {
    mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(mockSubscription);

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    expect(result.current.subscription).toBe(mockSubscription);
  });

  it('should handle denied permission', async () => {
    global.Notification.requestPermission.mockResolvedValue('denied');

    const { result } = renderHook(() => usePushNotifications());

    let success;
    await act(async () => {
      success = await result.current.subscribe();
    });

    expect(success).toBe(false);
    expect(result.current.permission).toBe('denied');
    expect(result.current.error).toBe('Notification permission denied');
  });

  it('should subscribe when permission granted', async () => {
    global.Notification.requestPermission.mockResolvedValue('granted');
    mockServiceWorkerRegistration.pushManager.subscribe.mockResolvedValue(mockSubscription);

    // Mock VAPID key
    import.meta.env.VITE_VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

    const { result } = renderHook(() => usePushNotifications());

    let success;
    await act(async () => {
      success = await result.current.subscribe();
    });

    expect(success).toBe(true);
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.permission).toBe('granted');
  });

  it('should unsubscribe successfully', async () => {
    mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(mockSubscription);

    const { result } = renderHook(() => usePushNotifications());

    // Wait for initial subscription check
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    let success;
    await act(async () => {
      success = await result.current.unsubscribe();
    });

    expect(success).toBe(true);
    expect(result.current.isSubscribed).toBe(false);
    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('should send test notification', async () => {
    mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(mockSubscription);
    global.Notification.permission = 'granted';

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true);
    });

    let success;
    await act(async () => {
      success = await result.current.sendTestNotification('Test Title', 'Test Body');
    });

    expect(success).toBe(true);
    expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
      'Test Title',
      expect.objectContaining({
        body: 'Test Body',
      })
    );
  });

  it('should not send notification without permission', async () => {
    global.Notification.permission = 'denied';

    const { result } = renderHook(() => usePushNotifications());

    let success;
    await act(async () => {
      success = await result.current.sendTestNotification('Test', 'Body');
    });

    expect(success).toBe(false);
  });
});
