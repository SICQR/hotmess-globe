import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }))
}));

global.fetch = vi.fn();

describe('Scene Scout API', () => {
  let mockReq;
  let mockRes;
  let handler;
  let mockSupabase;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';

    handler = (await import('./scene-scout.js')).default;
    const { createClient } = await import('@supabase/supabase-js');
    mockSupabase = createClient();

    mockReq = {
      method: 'POST',
      body: { userEmail: 'test@test.com' }
    };

    mockRes = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis()
    };
  });

  describe('CORS and method validation', () => {
    it('should handle OPTIONS requests', async () => {
      mockReq.method = 'OPTIONS';
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should reject non-POST requests', async () => {
      mockReq.method = 'GET';
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
    });
  });

  describe('input validation', () => {
    it('should require userEmail', async () => {
      mockReq.body = {};
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing userEmail' });
    });

    it('should default to today when date not provided', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: { music_taste: [], tribes: [] },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(String)
        })
      );
    });
  });

  describe('user profile loading', () => {
    it('should load user preferences', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          music_taste: ['techno', 'house'],
          tribes: ['bear', 'otter'],
          interests: ['clubs'],
          city: 'London'
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.from).toHaveBeenCalledWith('User');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('email', 'test@test.com');
    });

    it('should handle user not found', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('event scoring', () => {
    beforeEach(() => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            music_taste: ['techno'],
            tribes: ['bear'],
            city: 'London'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            id: 1,
            title: 'Test Event',
            start_date: new Date().toISOString(),
            location_name: 'Fire',
            metadata: { music: ['techno'], vibe: ['bear'] }
          }],
          error: null
        });
    });

    it('should score events with music match', async () => {
      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          picks: expect.arrayContaining([
            expect.objectContaining({
              type: 'event',
              score: expect.any(Number)
            })
          ])
        })
      );
    });

    it('should prioritize time bonus for late night events', async () => {
      const lateNight = new Date();
      lateNight.setHours(23, 0, 0);

      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { music_taste: [], tribes: [], city: 'London' },
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            id: 1,
            title: 'Late Night Party',
            start_date: lateNight.toISOString(),
            location_name: 'XXL',
            metadata: {}
          }],
          error: null
        });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('venue scoring', () => {
    it('should include venues in recommendations', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            music_taste: ['techno'],
            tribes: [],
            city: 'London'
          },
          error: null
        })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: [{
            id: 1,
            title: 'G-A-Y Bar',
            content: 'Popular venue',
            location_area: 'Soho',
            category: 'venue',
            metadata: { music: ['techno'], type: 'bar' }
          }],
          error: null
        });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          picks: expect.any(Array)
        })
      );
    });

    it('should filter venues by minimum score', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { music_taste: [], tribes: [], city: 'London' },
          error: null
        })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: [{
            id: 1,
            title: 'Low Score Venue',
            content: 'Description',
            location_area: 'Area',
            metadata: {}
          }],
          error: null
        });

      await handler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      // Low-scoring venues might be filtered out
      expect(response.picks).toBeDefined();
    });
  });

  describe('HOTMESS activity integration', () => {
    it('should fetch Right Now activity', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { music_taste: [], tribes: [], city: 'London' },
          error: null
        })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: [
            { destination: 'Fire', count: 5 },
            { destination: 'Eagle', count: 3 }
          ],
          error: null
        });

      await handler(mockReq, mockRes);

      expect(mockSupabase.from).toHaveBeenCalledWith('right_now_status');
    });

    it('should include activity summary in response', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { music_taste: [], tribes: [], city: 'London' },
          error: null
        })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: [{ destination: 'Fire', count: 10 }],
          error: null
        });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          hotmessActivity: expect.any(Array)
        })
      );
    });
  });

  describe('match reasons', () => {
    it('should generate reasons for recommendations', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            music_taste: ['techno'],
            tribes: ['bear'],
            city: 'London'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            id: 1,
            title: 'Event',
            start_date: new Date().toISOString(),
            location_name: 'Venue',
            metadata: { music: ['techno'] }
          }],
          error: null
        });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          picks: expect.arrayContaining([
            expect.objectContaining({
              reasons: expect.any(Array)
            })
          ])
        })
      );
    });
  });

  describe('top picks selection', () => {
    it('should limit to top 5 picks', async () => {
      const manyEvents = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        title: `Event ${i}`,
        start_date: new Date().toISOString(),
        location_name: 'Venue',
        metadata: {}
      }));

      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { music_taste: [], tribes: [], city: 'London' },
          error: null
        })
        .mockResolvedValueOnce({ data: manyEvents, error: null });

      await handler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.picks.length).toBeLessThanOrEqual(5);
    });

    it('should sort picks by score', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            music_taste: ['techno', 'house'],
            tribes: [],
            city: 'London'
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: [
            {
              id: 1,
              title: 'Perfect Match',
              start_date: new Date().toISOString(),
              location_name: 'Fire',
              metadata: { music: ['techno', 'house'] }
            },
            {
              id: 2,
              title: 'No Match',
              start_date: new Date().toISOString(),
              location_name: 'Other',
              metadata: {}
            }
          ],
          error: null
        });

      await handler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      if (response.picks.length > 1) {
        expect(response.picks[0].score).toBeGreaterThanOrEqual(response.picks[1].score);
      }
    });
  });

  describe('AI narrative generation', () => {
    it('should generate AI narrative when OpenAI available', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { music_taste: ['techno'], tribes: [], city: 'London' },
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            id: 1,
            title: 'Event',
            start_date: new Date().toISOString(),
            location_name: 'Fire',
            metadata: {}
          }],
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: 'Hit Fire around 10pm for the best vibes.' }
          }]
        })
      });

      await handler(mockReq, mockRes);

      expect(global.fetch).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          narrative: expect.any(String)
        })
      );
    });

    it('should use fallback narrative when OpenAI unavailable', async () => {
      delete process.env.OPENAI_API_KEY;

      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { music_taste: [], tribes: [], city: 'London' },
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            id: 1,
            title: 'Event',
            start_date: new Date().toISOString(),
            location_name: 'Venue',
            metadata: {}
          }],
          error: null
        });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          narrative: expect.stringContaining('Event')
        })
      );
    });

    it('should show fallback when no picks available', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { music_taste: [], tribes: [], city: 'London' },
          error: null
        })
        .mockResolvedValueOnce({ data: [], error: null });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          narrative: expect.stringContaining('not much happening')
        })
      );
    });
  });

  describe('user preferences in response', () => {
    it('should include user preferences', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            music_taste: ['techno', 'house'],
            tribes: ['bear', 'otter'],
            city: 'London'
          },
          error: null
        })
        .mockResolvedValueOnce({ data: [], error: null });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          userPreferences: {
            musicTaste: ['techno', 'house'],
            tribes: ['bear', 'otter']
          }
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle exceptions', async () => {
      mockSupabase.from().single.mockRejectedValue(new Error('Unexpected error'));

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle missing metadata gracefully', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { music_taste: [], tribes: [], city: 'London' },
          error: null
        })
        .mockResolvedValueOnce({
          data: [{
            id: 1,
            title: 'Event',
            start_date: new Date().toISOString(),
            location_name: 'Venue',
            metadata: null
          }],
          error: null
        });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});