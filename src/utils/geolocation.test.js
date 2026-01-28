import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isGeolocationSupported,
  normalizeGeolocationError,
  getLatLngFromPosition,
  safeGetViewerLatLng,
} from './geolocation';

describe('geolocation utilities', () => {
  describe('isGeolocationSupported', () => {
    it('returns true when navigator.geolocation exists', () => {
      const originalNavigator = global.navigator;
      global.navigator = { geolocation: {} };
      expect(isGeolocationSupported()).toBe(true);
      global.navigator = originalNavigator;
    });

    it('returns false when navigator.geolocation does not exist', () => {
      const originalNavigator = global.navigator;
      global.navigator = {};
      expect(isGeolocationSupported()).toBe(false);
      global.navigator = originalNavigator;
    });

    it('returns false when navigator is undefined', () => {
      const originalNavigator = global.navigator;
      delete global.navigator;
      expect(isGeolocationSupported()).toBe(false);
      global.navigator = originalNavigator;
    });
  });

  describe('normalizeGeolocationError', () => {
    it('returns denied for permission denied error (code 1)', () => {
      const error = { code: 1, message: 'User denied geolocation' };
      const result = normalizeGeolocationError(error);
      expect(result).toEqual({
        code: 1,
        reason: 'denied',
        message: 'User denied geolocation',
      });
    });

    it('returns unavailable for position unavailable error (code 2)', () => {
      const error = { code: 2, message: 'Position unavailable' };
      const result = normalizeGeolocationError(error);
      expect(result).toEqual({
        code: 2,
        reason: 'unavailable',
        message: 'Position unavailable',
      });
    });

    it('returns timeout for timeout error (code 3)', () => {
      const error = { code: 3, message: 'Timed out' };
      const result = normalizeGeolocationError(error);
      expect(result).toEqual({
        code: 3,
        reason: 'timeout',
        message: 'Timed out',
      });
    });

    it('returns error for unknown error codes', () => {
      const error = { code: 99, message: 'Unknown error' };
      const result = normalizeGeolocationError(error);
      expect(result).toEqual({
        code: 99,
        reason: 'error',
        message: 'Unknown error',
      });
    });

    it('handles null/undefined errors', () => {
      const result = normalizeGeolocationError(null);
      expect(result).toEqual({
        code: null,
        reason: 'error',
        message: 'Geolocation error',
      });
    });

    it('provides default messages when message is missing', () => {
      const error = { code: 1 };
      const result = normalizeGeolocationError(error);
      expect(result.message).toBe('Permission denied');
    });
  });

  describe('getLatLngFromPosition', () => {
    it('extracts lat/lng from valid position object', () => {
      const position = {
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
          accuracy: 10,
          heading: 90,
          speed: 5,
        },
        timestamp: 1706000000000,
      };

      const result = getLatLngFromPosition(position);
      expect(result).toEqual({
        lat: 51.5074,
        lng: -0.1278,
        accuracy: 10,
        heading: 90,
        speed: 5,
        timestamp: 1706000000000,
      });
    });

    it('returns null for invalid latitude', () => {
      const position = {
        coords: {
          latitude: NaN,
          longitude: -0.1278,
        },
      };
      expect(getLatLngFromPosition(position)).toBeNull();
    });

    it('returns null for invalid longitude', () => {
      const position = {
        coords: {
          latitude: 51.5074,
          longitude: Infinity,
        },
      };
      expect(getLatLngFromPosition(position)).toBeNull();
    });

    it('returns null for null position', () => {
      expect(getLatLngFromPosition(null)).toBeNull();
    });

    it('returns null for missing coords', () => {
      expect(getLatLngFromPosition({})).toBeNull();
    });

    it('handles missing optional fields', () => {
      const position = {
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
        },
      };

      const result = getLatLngFromPosition(position);
      expect(result.accuracy).toBeNull();
      expect(result.heading).toBeNull();
      expect(result.speed).toBeNull();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('safeGetViewerLatLng', () => {
    let mockGeolocation;
    let originalNavigator;

    beforeEach(() => {
      originalNavigator = global.navigator;
      mockGeolocation = {
        getCurrentPosition: vi.fn(),
      };
      global.navigator = { geolocation: mockGeolocation };
    });

    afterEach(() => {
      global.navigator = originalNavigator;
      vi.clearAllMocks();
    });

    it('returns location on successful first attempt', async () => {
      const mockPosition = {
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
          accuracy: 10,
        },
        timestamp: Date.now(),
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await safeGetViewerLatLng();
      expect(result).toMatchObject({
        lat: 51.5074,
        lng: -0.1278,
      });
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    });

    it('returns null when geolocation is not supported', async () => {
      global.navigator = {};
      const result = await safeGetViewerLatLng();
      expect(result).toBeNull();
    });

    it('returns null on permission denied without retry', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error({ code: 1, message: 'Permission denied' });
      });

      const result = await safeGetViewerLatLng({}, { retries: 2 });
      expect(result).toBeNull();
      // Should not retry on permission denied
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    });

    it('retries on timeout error', async () => {
      let callCount = 0;
      const mockPosition = {
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
        },
        timestamp: Date.now(),
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        callCount++;
        if (callCount < 2) {
          error({ code: 3, message: 'Timeout' });
        } else {
          success(mockPosition);
        }
      });

      const result = await safeGetViewerLatLng({}, { retries: 2, baseDelayMs: 10 });
      expect(result).not.toBeNull();
      expect(result.lat).toBe(51.5074);
      expect(callCount).toBe(2);
    });

    it('retries on position unavailable error', async () => {
      let callCount = 0;
      const mockPosition = {
        coords: {
          latitude: 51.5074,
          longitude: -0.1278,
        },
        timestamp: Date.now(),
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        callCount++;
        if (callCount < 3) {
          error({ code: 2, message: 'Position unavailable' });
        } else {
          success(mockPosition);
        }
      });

      const result = await safeGetViewerLatLng({}, { retries: 3, baseDelayMs: 10 });
      expect(result).not.toBeNull();
      expect(callCount).toBe(3);
    });

    it('returns null after exhausting retries', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error({ code: 3, message: 'Timeout' });
      });

      const result = await safeGetViewerLatLng({}, { retries: 2, baseDelayMs: 10 });
      expect(result).toBeNull();
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('passes options to getCurrentPosition', async () => {
      const mockPosition = {
        coords: { latitude: 51.5074, longitude: -0.1278 },
        timestamp: Date.now(),
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const options = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
      await safeGetViewerLatLng(options);

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        options
      );
    });
  });
});
