import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
    }))
  }))
}));

global.fetch = vi.fn();

describe('Profile Analysis API', () => {
  let mockReq;
  let mockRes;
  let handler;
  let mockSupabase;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';

    handler = (await import('./profile-analysis.js')).default;
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
    it('should set CORS headers', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: { email: 'test@test.com' },
        error: null
      });

      await handler(mockReq, mockRes);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String));
    });

    it('should handle OPTIONS requests', async () => {
      mockReq.method = 'OPTIONS';
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.end).toHaveBeenCalled();
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

    it('should handle profile not found', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Profile not found' });
    });
  });

  describe('optimization rules', () => {
    it('should detect missing face pic', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          photos: [{ is_face: false }]
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              id: 'no_face_pic',
              impact: 'high'
            })
          ])
        })
      );
    });

    it('should detect short bio', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          bio: 'Short'
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              id: 'short_bio',
              impact: 'medium'
            })
          ])
        })
      );
    });

    it('should detect no interests', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          interests: []
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              id: 'no_interests'
            })
          ])
        })
      );
    });

    it('should detect missing looking_for', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          looking_for: []
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              id: 'no_looking_for',
              impact: 'high'
            })
          ])
        })
      );
    });

    it('should detect generic bio phrases', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          bio: 'Just ask me anything about myself'
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              id: 'generic_bio'
            })
          ])
        })
      );
    });
  });

  describe('completeness score', () => {
    it('should calculate 100% for complete profile', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          photos: [{ is_face: true }],
          bio: 'A detailed bio with more than 50 characters describing my interests',
          interests: ['music', 'fitness'],
          tribes: ['bear'],
          looking_for: ['dating'],
          music_taste: ['techno'],
          position: 'vers',
          height: 180,
          body_type: 'average'
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          completeness: 100,
          strengthLevel: 'excellent'
        })
      );
    });

    it('should calculate partial completeness', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          photos: [{ is_face: true }],
          bio: 'Good bio with enough characters'
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          completeness: expect.any(Number)
        })
      );
    });
  });

  describe('strength levels', () => {
    it('should return excellent for >= 90%', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          photos: [{ is_face: true }],
          bio: 'A detailed bio with more than 50 characters',
          interests: ['music'],
          tribes: ['bear'],
          looking_for: ['dating'],
          music_taste: ['techno'],
          position: 'vers',
          height: 180,
          body_type: 'average'
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          strengthLevel: 'excellent'
        })
      );
    });

    it('should return needs_work for < 70%', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com'
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          strengthLevel: expect.stringMatching(/needs_work|incomplete/)
        })
      );
    });
  });

  describe('AI summary generation', () => {
    it('should generate AI summary when issues exist', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          photos: []
        },
        error: null
      });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Add a face pic for better results.' } }]
        })
      });

      await handler(mockReq, mockRes);

      expect(global.fetch).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          aiSummary: expect.any(String)
        })
      );
    });

    it('should use fallback summary when OpenAI unavailable', async () => {
      delete process.env.OPENAI_API_KEY;

      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          looking_for: []
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          aiSummary: expect.stringContaining('Quick wins')
        })
      );
    });

    it('should show positive message for complete profile', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          photos: [{ is_face: true }],
          bio: 'A great bio with more than fifty characters in it',
          interests: ['music'],
          tribes: ['bear'],
          looking_for: ['dating'],
          music_taste: ['techno'],
          position: 'vers',
          height: 180,
          body_type: 'average'
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          aiSummary: expect.stringContaining('solid')
        })
      );
    });
  });

  describe('issue sorting', () => {
    it('should prioritize high impact issues first', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          photos: [],
          looking_for: [],
          music_taste: []
        },
        error: null
      });

      await handler(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      const issues = response.issues;

      const highImpactIssues = issues.filter(i => i.impact === 'high');
      expect(issues[0].impact).toBe('high');
    });
  });

  describe('profile stats', () => {
    it('should include profile stats in response', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          photos: [{ url: '1' }, { url: '2' }],
          bio: 'Test bio',
          interests: ['music', 'art'],
          tribes: ['bear']
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          profileStats: {
            hasPhotos: true,
            photoCount: 2,
            hasBio: true,
            bioLength: 8,
            interestsCount: 2,
            tribesCount: 1
          }
        })
      );
    });
  });

  describe('high priority count', () => {
    it('should count high priority issues', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          photos: [],
          looking_for: []
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          highPriorityCount: 2
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

    it('should handle rule check exceptions gracefully', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: {
          email: 'test@test.com',
          photos: null
        },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});