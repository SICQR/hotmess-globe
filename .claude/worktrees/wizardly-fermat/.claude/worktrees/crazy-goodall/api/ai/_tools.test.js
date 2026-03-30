import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOOL_DEFINITIONS, executeTool } from './_tools.js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }))
}));

describe('AI Tools Module', () => {
  let mockSupabase;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createClient } = await import('@supabase/supabase-js');
    mockSupabase = createClient();
  });

  describe('TOOL_DEFINITIONS', () => {
    it('should export array of tool definitions', () => {
      expect(Array.isArray(TOOL_DEFINITIONS)).toBe(true);
      expect(TOOL_DEFINITIONS.length).toBeGreaterThan(0);
    });

    it('should have correctly formatted tool definitions', () => {
      TOOL_DEFINITIONS.forEach(tool => {
        expect(tool).toHaveProperty('type', 'function');
        expect(tool).toHaveProperty('function');
        expect(tool.function).toHaveProperty('name');
        expect(tool.function).toHaveProperty('description');
        expect(tool.function).toHaveProperty('parameters');
      });
    });

    it('should include searchProducts tool', () => {
      const searchProducts = TOOL_DEFINITIONS.find(t => t.function.name === 'searchProducts');
      expect(searchProducts).toBeDefined();
      expect(searchProducts.function.parameters.properties).toHaveProperty('query');
      expect(searchProducts.function.parameters.properties).toHaveProperty('category');
    });

    it('should include findEvents tool', () => {
      const findEvents = TOOL_DEFINITIONS.find(t => t.function.name === 'findEvents');
      expect(findEvents).toBeDefined();
    });

    it('should include navigateTo tool', () => {
      const navigateTo = TOOL_DEFINITIONS.find(t => t.function.name === 'navigateTo');
      expect(navigateTo).toBeDefined();
      expect(navigateTo.function.parameters.properties.page.enum).toContain('home');
    });
  });

  describe('executeTool', () => {
    it('should return error for unknown tool', async () => {
      const result = await executeTool('unknownTool', {});
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Unknown tool');
    });

    it('should handle tool execution errors', async () => {
      mockSupabase.from().single.mockRejectedValue(new Error('Database error'));

      const result = await executeTool('getUserStats', {}, { email: 'test@test.com' });
      expect(result).toHaveProperty('error');
    });
  });

  describe('searchProducts tool', () => {
    beforeEach(() => {
      mockSupabase.from().single.mockResolvedValue({
        data: [
          { id: 1, title: 'Product 1', price: 20, category: 'clothing' },
          { id: 2, title: 'Product 2', price: 15, category: 'lube' }
        ],
        error: null
      });
    });

    it('should search products by query', async () => {
      const result = await executeTool('searchProducts', { query: 'shirt' });

      expect(mockSupabase.from).toHaveBeenCalledWith('products');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toHaveProperty('products');
    });

    it('should filter by category', async () => {
      await executeTool('searchProducts', { category: 'clothing' });

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('category', 'clothing');
    });

    it('should filter by max price', async () => {
      await executeTool('searchProducts', { maxPrice: 25 });

      expect(mockSupabase.from().lte).toHaveBeenCalledWith('price', 25);
    });

    it('should filter by brand', async () => {
      await executeTool('searchProducts', { brand: 'RAW' });

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('brand', 'RAW');
    });

    it('should return message with count', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: [{ id: 1, title: 'Test' }],
        error: null
      });

      const result = await executeTool('searchProducts', {});

      expect(result.message).toContain('1');
    });

    it('should handle no results', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await executeTool('searchProducts', {});

      expect(result.message).toContain('No products found');
    });

    it('should handle database errors', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' }
      });

      const result = await executeTool('searchProducts', {});

      expect(result).toHaveProperty('error');
    });
  });

  describe('findEvents tool', () => {
    it('should find events with date range', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: [
          {
            id: 1,
            title: 'Party Night',
            start_date: new Date().toISOString(),
            location_name: 'G-A-Y'
          }
        ],
        error: null
      });

      const result = await executeTool('findEvents', { dateRange: 'tonight' });

      expect(mockSupabase.from).toHaveBeenCalledWith('Beacon');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('beacon_type', 'event');
      expect(result).toHaveProperty('events');
    });

    it('should calculate this_weekend date range', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: [], error: null });

      await executeTool('findEvents', { dateRange: 'this_weekend' });

      expect(mockSupabase.from().gte).toHaveBeenCalled();
      expect(mockSupabase.from().lte).toHaveBeenCalled();
    });

    it('should filter by event type', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: [], error: null });

      await executeTool('findEvents', { type: 'club' });

      expect(mockSupabase.from().contains).toHaveBeenCalledWith('metadata', { event_type: 'club' });
    });

    it('should search by query', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: [], error: null });

      await executeTool('findEvents', { query: 'pride' });

      expect(mockSupabase.from().or).toHaveBeenCalled();
    });

    it('should truncate long descriptions', async () => {
      const longDesc = 'a'.repeat(200);
      mockSupabase.from().single.mockResolvedValue({
        data: [{
          id: 1,
          title: 'Event',
          description: longDesc,
          start_date: new Date().toISOString()
        }],
        error: null
      });

      const result = await executeTool('findEvents', {});

      expect(result.events[0].description.length).toBeLessThanOrEqual(150);
    });
  });

  describe('getRadioSchedule tool', () => {
    it('should return now playing info', async () => {
      const result = await executeTool('getRadioSchedule', { when: 'now' });

      expect(result).toHaveProperty('schedule');
      expect(result.schedule).toHaveProperty('show');
      expect(result.message).toContain('Currently playing');
    });

    it('should return today schedule', async () => {
      const result = await executeTool('getRadioSchedule', { when: 'today' });

      expect(Array.isArray(result.schedule)).toBe(true);
      expect(result.schedule.length).toBeGreaterThan(0);
    });

    it('should return weekly highlights', async () => {
      const result = await executeTool('getRadioSchedule', { when: 'this_week' });

      expect(Array.isArray(result.schedule)).toBe(true);
    });
  });

  describe('getUserStats tool', () => {
    it('should return error when not logged in', async () => {
      const result = await executeTool('getUserStats', {}, {});

      expect(result).toHaveProperty('error', 'Not logged in');
    });

    it('should fetch user stats', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          xp_balance: 1500,
          subscription_tier: 'MESS',
          level: 5,
          current_streak: 3,
          achievements: ['first_beacon']
        },
        error: null
      });

      const result = await executeTool('getUserStats', {}, { email: 'test@test.com' });

      expect(result.xp).toBe(1500);
      expect(result.tier).toBe('MESS');
      expect(result.level).toBe(5);
      expect(result.streak).toBe(3);
    });

    it('should handle missing stats with defaults', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {},
        error: null
      });

      const result = await executeTool('getUserStats', {}, { email: 'test@test.com' });

      expect(result.xp).toBe(0);
      expect(result.tier).toBe('FREE');
      expect(result.level).toBe(1);
    });

    it('should handle database errors', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      const result = await executeTool('getUserStats', {}, { email: 'test@test.com' });

      expect(result).toHaveProperty('error');
    });
  });

  describe('findNearbyVenues tool', () => {
    it('should find venues by type', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: [
          { title: 'Club 1', content: 'Great music', location_area: 'Vauxhall' }
        ],
        error: null
      });

      const result = await executeTool('findNearbyVenues', { type: 'club' });

      expect(mockSupabase.from).toHaveBeenCalledWith('gay_world_knowledge');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('category', 'venue');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('subcategory', 'club');
    });

    it('should filter by area', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: [], error: null });

      await executeTool('findNearbyVenues', { area: 'Soho' });

      expect(mockSupabase.from().ilike).toHaveBeenCalledWith('location_area', '%Soho%');
    });

    it('should handle type "any"', async () => {
      mockSupabase.from().single.mockResolvedValue({ data: [], error: null });

      await executeTool('findNearbyVenues', { type: 'any' });

      // Should not call eq for subcategory
      const eqCalls = mockSupabase.from().eq.mock.calls;
      const subcategoryCalls = eqCalls.filter(call => call[0] === 'subcategory');
      expect(subcategoryCalls.length).toBe(0);
    });
  });

  describe('explainTerm tool', () => {
    it('should find term definition', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          title: 'PrEP',
          content: 'Pre-exposure prophylaxis medication',
          metadata: { related: ['PEP', 'HIV'] }
        },
        error: null
      });

      const result = await executeTool('explainTerm', { term: 'prep' });

      expect(result.term).toBe('PrEP');
      expect(result.definition).toContain('prophylaxis');
      expect(result.related).toContain('PEP');
    });

    it('should fall back to broader search', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({
          data: { title: 'Circuit Party', content: 'Large dance event' },
          error: null
        });

      const result = await executeTool('explainTerm', { term: 'circuit' });

      expect(result.term).toBe('Circuit Party');
    });

    it('should handle term not found', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({ data: null, error: {} })
        .mockResolvedValueOnce({ data: null, error: {} });

      const result = await executeTool('explainTerm', { term: 'unknown' });

      expect(result.definition).toBeNull();
      expect(result.message).toContain("don't have a definition");
    });
  });

  describe('getSafetyResources tool', () => {
    it('should return sexual health resources', async () => {
      const result = await executeTool('getSafetyResources', { topic: 'sexual_health' });

      expect(result.title).toContain('Sexual Health');
      expect(result.items).toBeDefined();
      expect(result.items[0]).toHaveProperty('name');
      expect(result.items[0].name).toContain('56 Dean Street');
    });

    it('should return mental health resources', async () => {
      const result = await executeTool('getSafetyResources', { topic: 'mental_health' });

      expect(result.title).toContain('Mental Health');
      expect(result.items.some(item => item.name.includes('Switchboard'))).toBe(true);
    });

    it('should return crisis resources', async () => {
      const result = await executeTool('getSafetyResources', { topic: 'crisis' });

      expect(result.items.some(item => item.phone === '999')).toBe(true);
    });

    it('should return PrEP information', async () => {
      const result = await executeTool('getSafetyResources', { topic: 'prep' });

      expect(result.title).toContain('PrEP');
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should return harm reduction resources', async () => {
      const result = await executeTool('getSafetyResources', { topic: 'harm_reduction' });

      expect(result.items.some(item => item.name.includes('Release'))).toBe(true);
    });

    it('should default to crisis for unknown topic', async () => {
      const result = await executeTool('getSafetyResources', { topic: 'unknown' });

      expect(result.title).toContain('Crisis');
    });

    it('should include supportive message', async () => {
      const result = await executeTool('getSafetyResources', { topic: 'sexual_health' });

      expect(result.message).toContain('safety matters');
    });
  });

  describe('navigateTo tool', () => {
    it('should return navigation URL', () => {
      const result = executeTool('navigateTo', { page: 'events' });

      expect(result.url).toBe('/events');
      expect(result.action).toBe('navigate');
    });

    it('should handle page with params', () => {
      const result = executeTool('navigateTo', {
        page: 'profile',
        params: { tab: 'photos' }
      });

      expect(result.url).toContain('/profile');
      expect(result.url).toContain('tab=photos');
    });

    it('should default to home for unknown page', () => {
      const result = executeTool('navigateTo', { page: 'unknown' });

      expect(result.url).toBe('/');
    });

    it('should include all valid pages', () => {
      const pages = ['home', 'pulse', 'events', 'market', 'social', 'music', 'profile', 'settings'];

      pages.forEach(page => {
        const result = executeTool('navigateTo', { page });
        expect(result.url).toBeTruthy();
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null args', async () => {
      const result = await executeTool('searchProducts', null);
      expect(result).toBeDefined();
    });

    it('should handle empty userContext', async () => {
      const result = await executeTool('getUserStats', {}, {});
      expect(result).toHaveProperty('error');
    });

    it('should handle malformed database responses', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await executeTool('searchProducts', {});
      expect(result).toBeDefined();
    });
  });
});