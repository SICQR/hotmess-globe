import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchPlatformKnowledge,
  searchGayWorldKnowledge,
  searchAllKnowledge,
  formatKnowledgeForPrompt,
  detectQueryIntent,
  smartSearch
} from './_rag.js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn()
    }))
  }))
}));

// Mock fetch for OpenAI embeddings
global.fetch = vi.fn();

describe('RAG Module', () => {
  let mockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();
    const { createClient } = await import('@supabase/supabase-js');
    mockSupabase = createClient();

    // Set environment variable for tests
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('getEmbedding (via searchPlatformKnowledge)', () => {
    it('should return null when API key is not set', async () => {
      delete process.env.OPENAI_API_KEY;
      mockSupabase.from().or.mockResolvedValue({ data: [], error: null });

      const result = await searchPlatformKnowledge('test query');

      // Should fall back to text search
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should call OpenAI embeddings API with correct parameters', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{
            embedding: [0.1, 0.2, 0.3]
          }]
        })
      });
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await searchPlatformKnowledge('test query');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key'
          }),
          body: expect.stringContaining('test query')
        })
      );
    });

    it('should truncate long queries to 8000 characters', async () => {
      const longQuery = 'a'.repeat(9000);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: [0.1] }]
        })
      });
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await searchPlatformKnowledge(longQuery);

      const fetchCall = global.fetch.mock.calls[0][1].body;
      const parsedBody = JSON.parse(fetchCall);
      expect(parsedBody.input.length).toBeLessThanOrEqual(8000);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          error: { message: 'Rate limit exceeded' }
        })
      });
      mockSupabase.from().or.mockResolvedValue({ data: [], error: null });

      const result = await searchPlatformKnowledge('test query');

      // Should fall back to text search
      expect(result).toBeDefined();
    });

    it('should handle fetch exceptions', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      mockSupabase.from().or.mockResolvedValue({ data: [], error: null });

      const result = await searchPlatformKnowledge('test query');

      expect(result).toBeDefined();
    });
  });

  describe('searchPlatformKnowledge', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: [0.1, 0.2] }]
        })
      });
    });

    it('should call platform knowledge RPC with embedding', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [
          { title: 'Feature 1', content: 'Content 1', similarity: 0.9 }
        ],
        error: null
      });

      const result = await searchPlatformKnowledge('how to use beacons');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_platform_knowledge', {
        query_embedding: [0.1, 0.2],
        match_threshold: 0.7,
        match_count: 5
      });
      expect(result).toEqual([
        { title: 'Feature 1', content: 'Content 1', similarity: 0.9 }
      ]);
    });

    it('should use custom options', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await searchPlatformKnowledge('test', {
        limit: 10,
        threshold: 0.8
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_platform_knowledge', {
        query_embedding: [0.1, 0.2],
        match_threshold: 0.8,
        match_count: 10
      });
    });

    it('should return empty array on RPC error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' }
      });

      const result = await searchPlatformKnowledge('test');
      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await searchPlatformKnowledge('test');
      expect(result).toEqual([]);
    });
  });

  describe('searchGayWorldKnowledge', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: [0.3, 0.4] }]
        })
      });
    });

    it('should call gay world knowledge RPC with filters', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [
          { title: 'Venue 1', content: 'Description', location_area: 'Soho', similarity: 0.85 }
        ],
        error: null
      });

      const result = await searchGayWorldKnowledge('clubs in soho', {
        city: 'London',
        category: 'venue',
        limit: 3
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_gay_world_knowledge', {
        query_embedding: [0.3, 0.4],
        filter_category: 'venue',
        filter_city: 'London',
        match_threshold: 0.7,
        match_count: 3
      });
      expect(result).toHaveLength(1);
    });

    it('should handle null filters', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await searchGayWorldKnowledge('test');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_gay_world_knowledge', {
        query_embedding: [0.3, 0.4],
        filter_category: null,
        filter_city: null,
        match_threshold: 0.7,
        match_count: 5
      });
    });
  });

  describe('searchAllKnowledge', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: [0.5, 0.6] }]
        })
      });
    });

    it('should search both knowledge bases in parallel', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [{ title: 'Platform', similarity: 0.9 }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{ title: 'GayWorld', similarity: 0.85 }],
          error: null
        });

      const result = await searchAllKnowledge('test query');

      expect(result.platform).toHaveLength(1);
      expect(result.gayWorld).toHaveLength(1);
      expect(result.combined).toHaveLength(2);
    });

    it('should sort combined results by similarity', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [{ title: 'Low', similarity: 0.7 }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [{ title: 'High', similarity: 0.95 }],
          error: null
        });

      const result = await searchAllKnowledge('test');

      expect(result.combined[0].similarity).toBe(0.95);
      expect(result.combined[1].similarity).toBe(0.7);
    });

    it('should use custom limits', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await searchAllKnowledge('test', {
        platformLimit: 5,
        gayWorldLimit: 7,
        city: 'Berlin'
      });

      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, 'search_platform_knowledge',
        expect.objectContaining({ match_count: 5 })
      );
      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, 'search_gay_world_knowledge',
        expect.objectContaining({ match_count: 7 })
      );
    });

    it('should handle results with missing similarity', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [{ title: 'NoSim' }],
          error: null
        })
        .mockResolvedValueOnce({
          data: [],
          error: null
        });

      const result = await searchAllKnowledge('test');

      expect(result.combined).toHaveLength(1);
      expect(result.combined[0].similarity).toBeUndefined();
    });
  });

  describe('formatKnowledgeForPrompt', () => {
    it('should format platform results', () => {
      const results = {
        platform: [
          { title: 'Feature', category: 'beacon', content: 'How beacons work' }
        ],
        gayWorld: [],
        combined: []
      };

      const formatted = formatKnowledgeForPrompt(results);

      expect(formatted).toContain('## Retrieved Context');
      expect(formatted).toContain('### Platform Information');
      expect(formatted).toContain('**Feature**: How beacons work');
    });

    it('should format gay world results with location', () => {
      const results = {
        platform: [],
        gayWorld: [
          { title: 'G-A-Y Bar', content: 'Popular venue', location_area: 'Soho' }
        ],
        combined: []
      };

      const formatted = formatKnowledgeForPrompt(results);

      expect(formatted).toContain('### Relevant Knowledge');
      expect(formatted).toContain('**G-A-Y Bar** (Soho): Popular venue');
    });

    it('should format both types of results', () => {
      const results = {
        platform: [{ title: 'P1', content: 'C1' }],
        gayWorld: [{ title: 'G1', content: 'C2' }],
        combined: []
      };

      const formatted = formatKnowledgeForPrompt(results);

      expect(formatted).toContain('### Platform Information');
      expect(formatted).toContain('### Relevant Knowledge');
    });

    it('should return empty string for null results', () => {
      const formatted = formatKnowledgeForPrompt(null);
      expect(formatted).toBe('');
    });

    it('should return empty string for empty combined results', () => {
      const results = {
        platform: [],
        gayWorld: [],
        combined: []
      };

      const formatted = formatKnowledgeForPrompt(results);
      expect(formatted).toBe('');
    });

    it('should handle results without location_area', () => {
      const results = {
        platform: [],
        gayWorld: [{ title: 'Event', content: 'Description' }],
        combined: []
      };

      const formatted = formatKnowledgeForPrompt(results);

      expect(formatted).toContain('**Event**: Description');
      expect(formatted).not.toContain('()');
    });
  });

  describe('detectQueryIntent', () => {
    it('should detect venue intent', () => {
      expect(detectQueryIntent('where is the best club in vauxhall?')).toBe('venue');
      expect(detectQueryIntent('any good bars in soho?')).toBe('venue');
      expect(detectQueryIntent('sauna recommendations')).toBe('venue');
    });

    it('should detect terminology intent', () => {
      expect(detectQueryIntent('what does prep mean?')).toBe('terminology');
      expect(detectQueryIntent('explain the term circuit party')).toBe('terminology');
    });

    it('should detect health intent', () => {
      expect(detectQueryIntent('where can I get prep?')).toBe('health');
      expect(detectQueryIntent('sti testing clinics')).toBe('health');
      expect(detectQueryIntent('hiv support services')).toBe('health');
    });

    it('should detect feature intent', () => {
      expect(detectQueryIntent('how does right now work?')).toBe('feature');
      expect(detectQueryIntent('what is xp?')).toBe('feature');
      expect(detectQueryIntent('how to use beacons')).toBe('feature');
    });

    it('should detect event intent', () => {
      expect(detectQueryIntent('what events are tonight?')).toBe('event');
      expect(detectQueryIntent('pride parties this weekend')).toBe('event');
    });

    it('should detect product intent', () => {
      expect(detectQueryIntent('where to buy lube?')).toBe('product');
      expect(detectQueryIntent('hnh merchandise')).toBe('product');
    });

    it('should detect profile intent', () => {
      expect(detectQueryIntent('how to message someone?')).toBe('profile');
      expect(detectQueryIntent('match preferences')).toBe('profile');
    });

    it('should return general for unclear queries', () => {
      expect(detectQueryIntent('hello')).toBe('general');
      expect(detectQueryIntent('xyz abc def')).toBe('general');
    });

    it('should handle case insensitivity', () => {
      expect(detectQueryIntent('WHERE IS THE CLUB?')).toBe('venue');
      expect(detectQueryIntent('What Does PrEP Mean?')).toBe('terminology');
    });
  });

  describe('smartSearch', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: [0.1, 0.2] }]
        })
      });
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });
    });

    it('should detect intent and search with appropriate options', async () => {
      const result = await smartSearch('best clubs in vauxhall', { city: 'London' });

      expect(result.intent).toBe('venue');
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'search_gay_world_knowledge',
        expect.objectContaining({ match_count: 5 })
      );
    });

    it('should use default city when not provided', async () => {
      await smartSearch('prep clinics');

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'search_gay_world_knowledge',
        expect.objectContaining({ filter_city: 'London' })
      );
    });

    it('should return intent with results', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [{ title: 'P' }], error: null })
        .mockResolvedValueOnce({ data: [{ title: 'G' }], error: null });

      const result = await smartSearch('test');

      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('gayWorld');
      expect(result).toHaveProperty('combined');
    });

    it('should apply intent-specific search options', async () => {
      await smartSearch('what does prep mean');

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'search_platform_knowledge',
        expect.objectContaining({ match_count: 2 })
      );
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'search_gay_world_knowledge',
        expect.objectContaining({ match_count: 3 })
      );
    });
  });

  describe('fallbackTextSearch (via searchPlatformKnowledge without API key)', () => {
    beforeEach(() => {
      delete process.env.OPENAI_API_KEY;
    });

    it('should perform text search when embeddings unavailable', async () => {
      mockSupabase.from().or.mockResolvedValue({
        data: [{ title: 'Result', content: 'Content' }],
        error: null
      });

      const result = await searchPlatformKnowledge('test query');

      expect(mockSupabase.from).toHaveBeenCalled();
      expect(result[0]).toHaveProperty('similarity', 0.5);
    });

    it('should filter by category in text search', async () => {
      mockSupabase.from().or.mockResolvedValue({ data: [], error: null });

      await searchPlatformKnowledge('test', { category: 'venue' });

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('category', 'venue');
    });

    it('should extract searchable words from query', async () => {
      mockSupabase.from().or.mockResolvedValue({ data: [], error: null });

      await searchPlatformKnowledge('the best club in town');

      // Should use words longer than 2 chars
      expect(mockSupabase.from().or).toHaveBeenCalled();
    });

    it('should handle text search errors', async () => {
      mockSupabase.from().or.mockResolvedValue({
        data: null,
        error: { message: 'Search failed' }
      });

      const result = await searchPlatformKnowledge('test');
      expect(result).toEqual([]);
    });
  });
});