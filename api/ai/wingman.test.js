import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }))
}));

global.fetch = vi.fn();

describe('Wingman API', () => {
  let mockReq;
  let mockRes;
  let handler;
  let mockSupabase;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';

    handler = (await import('./wingman.js')).default;
    const { createClient } = await import('@supabase/supabase-js');
    mockSupabase = createClient();

    mockReq = {
      method: 'POST',
      body: {
        viewerEmail: 'viewer@test.com',
        targetProfileId: 'target-123'
      }
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
    it('should require viewerEmail', async () => {
      mockReq.body = { targetProfileId: 'target-123' };
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing viewerEmail or targetProfileId' });
    });

    it('should require targetProfileId', async () => {
      mockReq.body = { viewerEmail: 'viewer@test.com' };
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should require OpenAI API key', async () => {
      delete process.env.OPENAI_API_KEY;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'OpenAI API key not configured' });
    });
  });

  describe('profile loading', () => {
    it('should load both viewer and target profiles', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            display_name: 'Viewer',
            interests: ['music'],
            music_taste: ['techno'],
            tribes: ['bear']
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            display_name: 'Target',
            bio: 'Fun guy',
            interests: ['music'],
            music_taste: ['house'],
            tribes: ['otter']
          },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: '{"openers": ["Hi!", "Hey there!", "What\'s up?"]}' }
          }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.from).toHaveBeenCalledWith('User');
      const eqCalls = mockSupabase.from().eq.mock.calls;
      expect(eqCalls).toContainEqual(['email', 'viewer@test.com']);
      expect(eqCalls).toContainEqual(['id', 'target-123']);
    });

    it('should handle profile not found', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        })
        .mockResolvedValueOnce({
          data: { display_name: 'Target' },
          error: null
        });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('common ground detection', () => {
    it('should find common interests', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            interests: ['music', 'fitness', 'art'],
            music_taste: [],
            tribes: []
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            interests: ['music', 'art', 'travel'],
            music_taste: [],
            tribes: []
          },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: '{"openers": ["Hi!", "Hey!", "Hello!"]}' }
          }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          commonGround: expect.objectContaining({
            interests: expect.arrayContaining(['music', 'art'])
          })
        })
      );
    });

    it('should find common music taste', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            interests: [],
            music_taste: ['techno', 'house'],
            tribes: []
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            interests: [],
            music_taste: ['house', 'trance'],
            tribes: []
          },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: '{"openers": ["Hi!", "Hey!", "Hello!"]}' }
          }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          commonGround: expect.objectContaining({
            music: ['house']
          })
        })
      );
    });

    it('should find common tribes', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            interests: [],
            music_taste: [],
            tribes: ['bear', 'cub']
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            interests: [],
            music_taste: [],
            tribes: ['bear', 'otter']
          },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: '{"openers": ["Hi!", "Hey!", "Hello!"]}' }
          }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          commonGround: expect.objectContaining({
            tribes: ['bear']
          })
        })
      );
    });
  });

  describe('shared events', () => {
    it('should find shared events', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        })
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        })
        .mockResolvedValueOnce({
          data: [
            { event_id: 1, Beacon: { title: 'Pride Party' } },
            { event_id: 2, Beacon: { title: 'Circuit Weekend' } }
          ],
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: '{"openers": ["Hi!", "Hey!", "Hello!"]}' }
          }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          commonGround: expect.objectContaining({
            events: expect.arrayContaining(['Pride Party', 'Circuit Weekend'])
          })
        })
      );
    });
  });

  describe('OpenAI conversation starters', () => {
    it('should generate 3 openers', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { display_name: 'John', interests: ['music'], music_taste: [], tribes: [] },
          error: null
        })
        .mockResolvedValueOnce({
          data: { display_name: 'Mike', bio: 'Love techno', interests: ['music'], music_taste: [], tribes: [] },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '{"openers": ["Saw you love techno - any good club nights recently?", "Hey! Your music taste caught my eye.", "Love your profile! What\'s your favorite venue?"]}'
            }
          }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          openers: expect.arrayContaining([
            expect.objectContaining({
              text: expect.any(String),
              type: expect.any(String)
            })
          ])
        })
      );
    });

    it('should call OpenAI with context', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            display_name: 'John',
            interests: ['music', 'fitness'],
            music_taste: ['techno'],
            tribes: ['bear']
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            display_name: 'Mike',
            bio: 'Gym enthusiast who loves techno',
            interests: ['fitness'],
            music_taste: ['techno'],
            tribes: ['bear']
          },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: '{"openers": ["Hi!", "Hey!", "Hello!"]}' }
          }]
        })
      });

      await handler(mockReq, mockRes);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );

      const fetchCall = global.fetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages[1].content).toContain('techno');
      expect(body.messages[1].content).toContain('fitness');
    });

    it('should handle OpenAI errors with fallbacks', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        })
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'API error' })
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should parse JSON response from OpenAI', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        })
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '{"openers": ["Custom opener 1", "Custom opener 2", "Custom opener 3"]}'
            }
          }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          openers: expect.arrayContaining([
            expect.objectContaining({ text: 'Custom opener 1' })
          ])
        })
      );
    });

    it('should handle non-JSON responses with numbered list fallback', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        })
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '1. First opener\n2. Second opener\n3. Third opener'
            }
          }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          openers: expect.any(Array)
        })
      );
    });

    it('should ensure exactly 3 openers', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        })
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: '{"openers": ["Only one opener"]}' }
          }]
        })
      });

      await handler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.openers).toHaveLength(3);
    });

    it('should assign types to openers', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        })
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: '{"openers": ["A", "B", "C"]}' }
          }]
        })
      });

      await handler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.openers[0].type).toBe('personal');
      expect(response.openers[1].type).toBe('flirty');
      expect(response.openers[2].type).toBe('question');
    });
  });

  describe('response structure', () => {
    beforeEach(() => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            display_name: 'Viewer',
            username: 'viewer123',
            interests: ['music'],
            music_taste: ['techno'],
            tribes: ['bear']
          },
          error: null
        })
        .mockResolvedValueOnce({
          data: {
            display_name: 'Target',
            username: 'target456',
            interests: ['music'],
            music_taste: ['house'],
            tribes: ['otter']
          },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: '{"openers": ["Hi!", "Hey!", "Hello!"]}' }
          }]
        })
      });
    });

    it('should include target name', async () => {
      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          targetName: 'Target'
        })
      );
    });

    it('should use username as fallback for display_name', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { username: 'viewer', interests: [], music_taste: [], tribes: [] },
          error: null
        })
        .mockResolvedValueOnce({
          data: { username: 'target', interests: [], music_taste: [], tribes: [] },
          error: null
        });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          targetName: 'target'
        })
      );
    });

    it('should include all common ground fields', async () => {
      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          commonGround: expect.objectContaining({
            interests: expect.any(Array),
            music: expect.any(Array),
            tribes: expect.any(Array),
            events: expect.any(Array)
          })
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors', async () => {
      mockSupabase.from().single.mockRejectedValue(new Error('Database error'));

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle missing profile data', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: null,
          error: null
        })
        .mockResolvedValueOnce({
          data: { display_name: 'Target' },
          error: null
        });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle malformed AI responses', async () => {
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        })
        .mockResolvedValueOnce({
          data: { interests: [], music_taste: [], tribes: [] },
          error: null
        });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: 'Not valid JSON at all!' }
          }]
        })
      });

      await handler(mockReq, mockRes);

      // Should use fallback openers
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          openers: expect.any(Array)
        })
      );
    });
  });
});