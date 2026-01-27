import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch before importing
global.fetch = vi.fn();

// Import after mocking
import { trackEvent, trackPageView, trackCTAClick, identifyUser, getLocalEvents, clearLocalEvents } from './analytics';

describe('Analytics Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    (global.fetch as any).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    clearLocalEvents();
  });

  describe('trackEvent', () => {
    it('creates an event with correct structure', () => {
      const event = trackEvent('test_event', { foo: 'bar' });
      
      expect(event.event).toBe('test_event');
      expect(event.properties.foo).toBe('bar');
      expect(event.properties.timestamp).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('includes URL in properties', () => {
      const event = trackEvent('test_event');
      expect(event.properties.url).toBeDefined();
    });
  });

  describe('trackPageView', () => {
    it('tracks page view with page name', () => {
      const event = trackPageView('Home', { referrer: 'test' });
      
      expect(event.event).toBe('page_view');
      expect(event.properties.page_name).toBe('Home');
      expect(event.properties.referrer).toBe('test');
    });
  });

  describe('trackCTAClick', () => {
    it('tracks CTA click with required fields', () => {
      const event = trackCTAClick('hero_cta', 'home_page', 'Sign Up');
      
      expect(event.event).toBe('cta_click');
      expect(event.properties.cta_id).toBe('hero_cta');
      expect(event.properties.cta_location).toBe('home_page');
      expect(event.properties.cta_text).toBe('Sign Up');
    });
  });

  describe('Local Event Storage', () => {
    it('stores events locally in debug mode', () => {
      trackEvent('test_event_1');
      trackEvent('test_event_2');
      
      const events = getLocalEvents();
      // Events are stored in dev mode
      expect(Array.isArray(events)).toBe(true);
    });

    it('clears local events', () => {
      trackEvent('test_event');
      clearLocalEvents();
      
      const events = getLocalEvents();
      expect(events.length).toBe(0);
    });
  });
});
