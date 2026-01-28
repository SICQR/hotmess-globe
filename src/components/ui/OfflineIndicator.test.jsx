import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import OfflineIndicator from './OfflineIndicator';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('OfflineIndicator', () => {
  let originalOnLine;
  let onlineCallback;
  let offlineCallback;
  let addEventListenerSpy;
  let removeEventListenerSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    originalOnLine = navigator.onLine;
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });

    // Track event listeners
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => originalOnLine,
    });
    vi.restoreAllMocks();
  });

  it('renders nothing when online', () => {
    render(<OfflineIndicator />);
    
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/back online/i)).not.toBeInTheDocument();
  });

  it('shows offline indicator when offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });

    render(<OfflineIndicator />);
    
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });

  it('registers event listeners on mount', () => {
    render(<OfflineIndicator />);

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('removes event listeners on unmount', () => {
    const { unmount } = render(<OfflineIndicator />);
    
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('shows offline indicator when going offline', () => {
    render(<OfflineIndicator />);

    // Initially online - nothing shown
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();

    // Find and trigger the offline handler
    const offlineCall = addEventListenerSpy.mock.calls.find(
      ([event]) => event === 'offline'
    );
    const offlineHandler = offlineCall[1];

    act(() => {
      offlineHandler();
    });

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });

  it('shows reconnected message when coming back online', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });

    render(<OfflineIndicator />);

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();

    // Find and trigger the online handler
    const onlineCall = addEventListenerSpy.mock.calls.find(
      ([event]) => event === 'online'
    );
    const onlineHandler = onlineCall[1];

    act(() => {
      onlineHandler();
    });

    expect(screen.getByText(/back online/i)).toBeInTheDocument();
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
  });

  it('hides reconnected message after 3 seconds', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });

    render(<OfflineIndicator />);

    // Find and trigger the online handler
    const onlineCall = addEventListenerSpy.mock.calls.find(
      ([event]) => event === 'online'
    );
    const onlineHandler = onlineCall[1];

    act(() => {
      onlineHandler();
    });

    expect(screen.getByText(/back online/i)).toBeInTheDocument();

    // Advance time by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText(/back online/i)).not.toBeInTheDocument();
  });

  it('clears reconnected state when going offline again', () => {
    render(<OfflineIndicator />);

    // Capture handlers
    const onlineCall = addEventListenerSpy.mock.calls.find(
      ([event]) => event === 'online'
    );
    const onlineHandler = onlineCall[1];
    
    const offlineCall = addEventListenerSpy.mock.calls.find(
      ([event]) => event === 'offline'
    );
    const offlineHandler = offlineCall[1];

    // Go online (after being offline)
    act(() => {
      offlineHandler();
    });
    
    act(() => {
      onlineHandler();
    });

    expect(screen.getByText(/back online/i)).toBeInTheDocument();

    // Go offline again
    act(() => {
      offlineHandler();
    });

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(screen.queryByText(/back online/i)).not.toBeInTheDocument();
  });
});
