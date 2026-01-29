import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isGeolocationSupported,
  normalizeGeolocationError,
  getLatLngFromPosition,
  safeGetViewerLatLng,
} from './geolocation';

// Mock logger
vi.mock('@/utils/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock navigator.geolocation
const mockGetCurrentPosition = vi.fn();

describe('geolocation utilities', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock navigator.geolocation
    Object.defineProperty(global, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: mockGetCurrentPosition,
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  describe('isGeolocationSupported', () => {
    it('should return true when geolocation is available', () => {
      expect(isGeolocationSupported()).toBe(true);
    });

    it('should return false when navigator is undefined', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
      });

      expect(isGeolocationSupported()).toBe(false);
    });

    it('should return false when geolocation is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });

      expect(isGeolocationSupported()).toBe(false);
    });
  });

  describe('normalizeGeolocationError', () => {
    it('should normalize permission denied error (code 1)', () => {
      const error = { code: 1, message: 'User denied geolocation' };
      const result = normalizeGeolocationError(error);

      expect(result).toEqual({
        code: 1,
        reason: 'denied',
        message: 'User denied geolocation',
      });
    });

    it('should normalize position unavailable error (code 2)', () => {
      const error = { code: 2, message: 'Position not available' };
      const result = normalizeGeolocationError(error);

      expect(result).toEqual({
        code: 2,
        reason: 'unavailable',
        message: 'Position not available',
      });
    });

    it('should normalize timeout error (code 3)', () => {
      const error = { code: 3, message: 'Request timed out' };
      const result = normalizeGeolocationError(error);

      expect(result).toEqual({
        code: 3,
        reason: 'timeout',
        message: 'Request timed out',
      });
    });

    it('should handle unknown error codes', () => {
      const error = { code: 99, message: 'Unknown error' };
      const result = normalizeGeolocationError(error);

      expect(result).toEqual({
        code: 99,
        reason: 'error',
        message: 'Unknown error',
      });
    });

    it('should provide default messages', () => {
      const denied = normalizeGeolocationError({ code: 1 });
      expect(denied.message).toBe('Permission denied');

      const unavailable = normalizeGeolocationError({ code: 2 });
      expect(unavailable.message).toBe('Position unavailable');

      const timeout = normalizeGeolocationError({ code: 3 });
      expect(timeout.message).toBe('Timed out');
    });

    it('should handle null/undefined errors', () => {
      const result = normalizeGeolocationError(null);
      expect(result.reason).toBe('error');
      expect(result.code).toBeNull();
    });
  });

  describe('getLatLngFromPosition', () => {
    it('should extract coordinates from position object', () => {
      const position = {
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
          accuracy: 10,
          heading: 45,
          speed: 5,
        },
        timestamp: 1234567890,
      };

      const result = getLatLngFromPosition(position);

      expect(result).toEqual({
        lat: 51.5074,
        lng: -0.1278,
        accuracy: 10,
        heading: 45,
        speed: 5,
        timestamp: 1234567890,
      });
    });

    it('should return null for invalid latitude', () => {
      const position = {
        coords: {
          latitude: null,
          longitude: -0.1278,
        },
      };

      expect(getLatLngFromPosition(position)).toBeNull();
    });

    it('should return null for invalid longitude', () => {
      const position = {
        coords: {
          latitude: 51.5074,
          longitude: undefined,
        },
      };

      expect(getLatLngFromPosition(position)).toBeNull();
    });

    it('should return null for NaN coordinates', () => {
      const position = {
        coords: {
          latitude: NaN,
          longitude: -0.1278,
        },
      };

      expect(getLatLngFromPosition(position)).toBeNull();
    });

    it('should handle missing optional fields', () => {
      const position = {
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
        },
      };

      const result = getLatLngFromPosition(position);

      expect(result.lat).toBe(51.5074);
      expect(result.lng).toBe(-0.1278);
      expect(result.accuracy).toBeNull();
      expect(result.heading).toBeNull();
      expect(result.speed).toBeNull();
    });

    it('should provide default timestamp if missing', () => {
      const position = {
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
        },
      };

      const result = getLatLngFromPosition(position);

      expect(typeof result.timestamp).toBe('number');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should return null for null input', () => {
      expect(getLatLngFromPosition(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(getLatLngFromPosition(undefined)).toBeNull();
    });
  });

  describe('safeGetViewerLatLng', () => {
    it('should return location on success', async () => {
      const mockPosition = {
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
          accuracy: 10,
        },
        timestamp: Date.now(),
      };

      mockGetCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await safeGetViewerLatLng();

      expect(result).toEqual({
        lat: 51.5074,
        lng: -0.1278,
        accuracy: 10,
        heading: null,
        speed: null,
        timestamp: expect.any(Number),
      });
    });

    it('should return null when geolocation is not supported', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });

      const result = await safeGetViewerLatLng();

      expect(result).toBeNull();
    });

    it('should return null on permission denied', async () => {
      mockGetCurrentPosition.mockImplementation((success, error) => {
        error({ code: 1, message: 'Permission denied' });
      });

      const result = await safeGetViewerLatLng();

      expect(result).toBeNull();
    });

    it('should retry on position unavailable', async () => {
      let callCount = 0;
      mockGetCurrentPosition.mockImplementation((success, error) => {
        callCount++;
        if (callCount < 2) {
          error({ code: 2, message: 'Position unavailable' });
        } else {
          success({
            coords: { latitude: 51.5074, longitude: -0.1278 },
            timestamp: Date.now(),
          });
        }
      });

      const result = await safeGetViewerLatLng({}, { retries: 2, baseDelayMs: 10 });

      expect(callCount).toBeGreaterThanOrEqual(2);
      expect(result).not.toBeNull();
      expect(result.lat).toBe(51.5074);
    });

    it('should retry on timeout', async () => {
      let callCount = 0;
      mockGetCurrentPosition.mockImplementation((success, error) => {
        callCount++;
        if (callCount < 2) {
          error({ code: 3, message: 'Timeout' });
        } else {
          success({
            coords: { latitude: 51.5074, longitude: -0.1278 },
            timestamp: Date.now(),
          });
        }
      });

      const result = await safeGetViewerLatLng({}, { retries: 2, baseDelayMs: 10 });

      expect(callCount).toBeGreaterThanOrEqual(2);
      expect(result).not.toBeNull();
    });

    it('should not retry on permission denied', async () => {
      let callCount = 0;
      mockGetCurrentPosition.mockImplementation((success, error) => {
        callCount++;
        error({ code: 1, message: 'Permission denied' });
      });

      const result = await safeGetViewerLatLng({}, { retries: 3 });

      expect(callCount).toBe(1);
      expect(result).toBeNull();
    });

    it('should use custom geolocation options', async () => {
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 51.5074, longitude: -0.1278 },
          timestamp: Date.now(),
        });
      });

      const customOptions = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      };

      await safeGetViewerLatLng(customOptions);

      expect(mockGetCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        customOptions
      );
    });

    it('should return null after max retries', async () => {
      mockGetCurrentPosition.mockImplementation((success, error) => {
        error({ code: 2, message: 'Position unavailable' });
      });

      const result = await safeGetViewerLatLng({}, { retries: 2, baseDelayMs: 10 });

      expect(result).toBeNull();
      // Called initial + retries times (3 total)
      expect(mockGetCurrentPosition).toHaveBeenCalledTimes(3);
    });
  });
});
