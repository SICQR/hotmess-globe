import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn(),
      update: vi.fn()
    }))
  }))
}));

vi.mock('./_system-prompt.js', () => ({
  buildSystemPrompt: vi.fn(() => 'System prompt'),
  detectCrisis: vi.fn(() => false),
  getCrisisResponse: vi.fn(() => 'Crisis response'),
  buildFunctionContext: vi.fn(() => ({}))
}));

vi.mock('./_rag.js', () => ({
  smartSearch: vi.fn(() => Promise.resolve({ intent: 'general', platform: [], gayWorld: [], combined: [] })),
  formatKnowledgeForPrompt: vi.fn(() => '')
}));

vi.mock('./_tools.js', () => ({
  TOOL_DEFINITIONS: [],
  executeTool: vi.fn(() => Promise.resolve({ success: true }))
}));

global.fetch = vi.fn();

describe('AI Chat API', () => {
  let mockReq;
  let mockRes;
  let handler;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.ALLOWED_ORIGIN = 'https://test.app';

    handler = (await import('./chat.js')).default;

    mockReq = {
      method: 'POST',
      headers: {},
      body: {
        message: 'hello'
      }
    };

    mockRes = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis()
    };
  });

  describe('CORS handling', () => {
    it('should set CORS headers', async () => {
      await handler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String));
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, OPTIONS');
    });

    it('should handle OPTIONS requests', async () => {
      mockReq.method = 'OPTIONS';
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('method validation', () => {
    it('should reject non-POST requests', async () => {
      mockReq.method = 'GET';
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
    });

    it('should accept POST requests', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }]
        })
      });

      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('message validation', () => {
    it('should reject requests without message', async () => {
      mockReq.body = {};
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Message is required' });
    });

    it('should reject non-string messages', async () => {
      mockReq.body.message = 123;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('API key validation', () => {
    it('should reject when API key not configured', async () => {
      delete process.env.OPENAI_API_KEY;
      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'OpenAI API key not configured' });
    });
  });

  describe('crisis detection', () => {
    it('should detect crisis and return immediate response', async () => {
      const { detectCrisis, getCrisisResponse } = await import('./_system-prompt.js');
      detectCrisis.mockReturnValue(true);
      getCrisisResponse.mockReturnValue('Crisis response text');

      mockReq.body.message = 'I want to die';
      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          response: 'Crisis response text',
          crisis: true
        })
      );
    });

    it('should log crisis detection', async () => {
      const { detectCrisis } = await import('./_system-prompt.js');
      detectCrisis.mockReturnValue(true);

      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = createClient();
      mockSupabase.from().insert.mockResolvedValue({});

      mockReq.body.message = 'suicidal thoughts';
      await handler(mockReq, mockRes);

      expect(mockSupabase.from).toHaveBeenCalledWith('ai_usage_logs');
    });
  });

  describe('OpenAI integration', () => {
    it('should call OpenAI API with correct parameters', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'AI response' } }]
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
    });

    it('should include system prompt in messages', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }]
        })
      });

      await handler(mockReq, mockRes);

      const fetchCall = global.fetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages[0].role).toBe('system');
    });

    it('should handle OpenAI API errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'API error' })
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('conversation management', () => {
    it('should create new conversation when conversationId not provided', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = createClient();
      mockSupabase.from().insert.mockResolvedValue({
        data: { id: 'conv-123' },
        error: null
      });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.from).toHaveBeenCalledWith('ai_conversations');
    });

    it('should load conversation history', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = createClient();
      mockSupabase.from().single.mockResolvedValue({
        data: {
          messages: [
            { role: 'user', content: 'previous message' },
            { role: 'assistant', content: 'previous response' }
          ]
        },
        error: null
      });

      mockReq.body.conversationId = 'conv-123';

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', 'conv-123');
    });

    it('should save conversation after response', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = createClient();
      mockSupabase.from().update.mockResolvedValue({});

      mockReq.body.conversationId = 'conv-123';

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          response: 'Response',
          conversationId: expect.any(String)
        })
      );
    });
  });

  describe('RAG integration', () => {
    it('should perform smart search on user message', async () => {
      const { smartSearch } = await import('./_rag.js');

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }]
        })
      });

      mockReq.body.message = 'where are clubs in vauxhall?';
      await handler(mockReq, mockRes);

      expect(smartSearch).toHaveBeenCalled();
    });

    it('should include RAG context in prompt', async () => {
      const { formatKnowledgeForPrompt } = await import('./_rag.js');
      formatKnowledgeForPrompt.mockReturnValue('### Context\nVenue info');

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }]
        })
      });

      await handler(mockReq, mockRes);

      expect(formatKnowledgeForPrompt).toHaveBeenCalled();
    });
  });

  describe('tool/function calling', () => {
    it('should handle tool calls from OpenAI', async () => {
      const { executeTool } = await import('./_tools.js');

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                tool_calls: [{
                  id: 'call-1',
                  function: {
                    name: 'searchProducts',
                    arguments: '{"query":"lube"}'
                  }
                }]
              }
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: 'Here are some lube products' }
            }]
          })
        });

      mockReq.body.message = 'show me lube products';
      await handler(mockReq, mockRes);

      expect(executeTool).toHaveBeenCalledWith('searchProducts', { query: 'lube' }, expect.any(Object));
    });

    it('should make follow-up call with tool results', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                tool_calls: [{
                  id: 'call-1',
                  function: {
                    name: 'getUserStats',
                    arguments: '{}'
                  }
                }]
              }
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: { content: 'Your stats' }
            }]
          })
        });

      await handler(mockReq, mockRes);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('user authentication', () => {
    it('should work without authentication', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should load user context when authenticated', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = createClient();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { email: 'user@test.com' } }
      });

      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'user@test.com',
          subscription_tier: 'PREMIUM',
          xp_balance: 500
        },
        error: null
      });

      mockReq.headers.authorization = 'Bearer valid-token';

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('usage logging', () => {
    it('should log AI usage', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = createClient();
      mockSupabase.from().insert.mockResolvedValue({});

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }]
        })
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.from).toHaveBeenCalledWith('ai_usage_logs');
    });
  });

  describe('error handling', () => {
    it('should handle exceptions gracefully', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});