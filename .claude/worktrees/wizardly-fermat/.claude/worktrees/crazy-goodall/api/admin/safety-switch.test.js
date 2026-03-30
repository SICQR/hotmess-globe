import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from './safety-switch.js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      upsert: vi.fn(),
      insert: vi.fn()
    }))
  }))
}));

describe('safety-switch API', () => {
  let mockReq;
  let mockRes;
  let mockSupabase;
  let mockFromChain;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockReq = {
      method: 'GET',
      body: {}
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    const { createClient } = await import('@supabase/supabase-js');
    mockSupabase = createClient();
    mockFromChain = mockSupabase.from();
  });

  describe('GET endpoint', () => {
    beforeEach(() => {
      mockReq.method = 'GET';
    });

    it('should return default safety state when no settings exist', async () => {
      mockFromChain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        disabled_cities: [],
        disabled_categories: [],
        global_disabled: false
      });
    });

    it('should return existing safety state', async () => {
      const savedState = {
        category: 'safety_switch',
        value: {
          disabled_cities: ['london', 'berlin'],
          disabled_categories: ['nightlife'],
          global_disabled: false
        }
      };

      mockFromChain.single.mockResolvedValue({
        data: savedState,
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(savedState.value);
    });

    it('should query system_settings with correct parameters', async () => {
      mockFromChain.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.from).toHaveBeenCalledWith('system_settings');
      expect(mockFromChain.select).toHaveBeenCalledWith('*');
      expect(mockFromChain.eq).toHaveBeenCalledWith('category', 'safety_switch');
    });

    it('should handle database errors', async () => {
      mockFromChain.single.mockResolvedValue({
        data: null,
        error: { code: 'CONNECTION_ERROR', message: 'Connection failed' }
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to get safety state' });
    });

    it('should handle exceptions', async () => {
      mockFromChain.single.mockRejectedValue(new Error('Unexpected error'));

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('POST endpoint - authentication', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
    });

    it('should reject requests without admin_id', async () => {
      mockReq.body = {
        action: 'disable_city',
        target: 'london'
      };

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Admin authentication required' });
    });

    it('should accept requests with admin_id', async () => {
      mockReq.body = {
        action: 'disable_city',
        target: 'london',
        admin_id: 'admin-123'
      };

      mockFromChain.single.mockResolvedValue({ data: null, error: null });
      mockFromChain.upsert.mockResolvedValue({ error: null });
      mockFromChain.insert.mockResolvedValue({ error: null });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('POST endpoint - disable_city action', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.body = {
        action: 'disable_city',
        target: 'london',
        admin_id: 'admin-123',
        reason: 'Safety concern'
      };
    });

    it('should add city to disabled list', async () => {
      mockFromChain.single.mockResolvedValue({
        data: {
          value: {
            disabled_cities: [],
            disabled_categories: [],
            global_disabled: false
          }
        },
        error: null
      });
      mockFromChain.upsert.mockResolvedValue({ error: null });
      mockFromChain.insert.mockResolvedValue({ error: null });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        state: expect.objectContaining({
          disabled_cities: ['london']
        })
      });
    });

    it('should convert city name to lowercase', async () => {
      mockReq.body.target = 'LONDON';
      mockFromChain.single.mockResolvedValue({
        data: { value: { disabled_cities: [], disabled_categories: [], global_disabled: false } },
        error: null
      });
      mockFromChain.upsert.mockResolvedValue({ error: null });
      mockFromChain.insert.mockResolvedValue({ error: null });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        state: expect.objectContaining({
          disabled_cities: ['london']
        })
      });
    });

    it('should not add duplicate cities', async () => {
      mockFromChain.single.mockResolvedValue({
        data: {
          value: {
            disabled_cities: ['london'],
            disabled_categories: [],
            global_disabled: false
          }
        },
        error: null
      });
      mockFromChain.upsert.mockResolvedValue({ error: null });
      mockFromChain.insert.mockResolvedValue({ error: null });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        state: expect.objectContaining({
          disabled_cities: ['london']
        })
      });
    });

    it('should log action to audit_log', async () => {
      mockFromChain.single.mockResolvedValue({
        data: { value: { disabled_cities: [], disabled_categories: [], global_disabled: false } },
        error: null
      });
      mockFromChain.upsert.mockResolvedValue({ error: null });
      mockFromChain.insert.mockResolvedValue({ error: null });

      await handler(mockReq, mockRes);

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_log');
      expect(mockFromChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'safety_switch',
          action: 'disable_city',
          target: 'london',
          reason: 'Safety concern',
          admin_id: 'admin-123'
        })
      );
    });
  });

  describe('POST endpoint - enable_city action', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.body = {
        action: 'enable_city',
        target: 'london',
        admin_id: 'admin-123'
      };
    });

    it('should remove city from disabled list', async () => {
      mockFromChain.single.mockResolvedValue({
        data: {
          value: {
            disabled_cities: ['london', 'berlin'],
            disabled_categories: [],
            global_disabled: false
          }
        },
        error: null
      });
      mockFromChain.upsert.mockResolvedValue({ error: null });
      mockFromChain.insert.mockResolvedValue({ error: null });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        state: expect.objectContaining({
          disabled_cities: ['berlin']
        })
      });
    });

    it('should handle enabling city that is not disabled', async () => {
      mockFromChain.single.mockResolvedValue({
        data: {
          value: {
            disabled_cities: ['berlin'],
            disabled_categories: [],
            global_disabled: false
          }
        },
        error: null
      });
      mockFromChain.upsert.mockResolvedValue({ error: null });
      mockFromChain.insert.mockResolvedValue({ error: null });

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        state: expect.objectContaining({
          disabled_cities: ['berlin']
        })
      });
    });
  });

  describe('POST endpoint - category actions', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockFromChain.single.mockResolvedValue({
        data: { value: { disabled_cities: [], disabled_categories: [], global_disabled: false } },
        error: null
      });
      mockFromChain.upsert.mockResolvedValue({ error: null });
      mockFromChain.insert.mockResolvedValue({ error: null });
    });

    it('should disable category', async () => {
      mockReq.body = {
        action: 'disable_category',
        target: 'nightlife',
        admin_id: 'admin-123'
      };

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        state: expect.objectContaining({
          disabled_categories: ['nightlife']
        })
      });
    });

    it('should enable category', async () => {
      mockFromChain.single.mockResolvedValue({
        data: {
          value: {
            disabled_cities: [],
            disabled_categories: ['nightlife', 'events'],
            global_disabled: false
          }
        },
        error: null
      });

      mockReq.body = {
        action: 'enable_category',
        target: 'nightlife',
        admin_id: 'admin-123'
      };

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        state: expect.objectContaining({
          disabled_categories: ['events']
        })
      });
    });
  });

  describe('POST endpoint - global actions', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockFromChain.single.mockResolvedValue({
        data: { value: { disabled_cities: [], disabled_categories: [], global_disabled: false } },
        error: null
      });
      mockFromChain.upsert.mockResolvedValue({ error: null });
      mockFromChain.insert.mockResolvedValue({ error: null });
    });

    it('should set global_disabled to true', async () => {
      mockReq.body = {
        action: 'disable_global',
        admin_id: 'admin-123',
        reason: 'Emergency maintenance'
      };

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        state: expect.objectContaining({
          global_disabled: true
        })
      });
    });

    it('should set global_disabled to false', async () => {
      mockFromChain.single.mockResolvedValue({
        data: {
          value: {
            disabled_cities: [],
            disabled_categories: [],
            global_disabled: true
          }
        },
        error: null
      });

      mockReq.body = {
        action: 'enable_global',
        admin_id: 'admin-123'
      };

      await handler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        state: expect.objectContaining({
          global_disabled: false
        })
      });
    });
  });

  describe('POST endpoint - error handling', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.body = {
        action: 'disable_city',
        target: 'london',
        admin_id: 'admin-123'
      };
    });

    it('should reject invalid action', async () => {
      mockReq.body.action = 'invalid_action';

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid action' });
    });

    it('should handle upsert errors', async () => {
      mockFromChain.single.mockResolvedValue({
        data: { value: { disabled_cities: [], disabled_categories: [], global_disabled: false } },
        error: null
      });
      mockFromChain.upsert.mockResolvedValue({
        error: { message: 'Database write failed' }
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to apply safety switch' });
    });

    it('should handle exceptions during POST', async () => {
      mockFromChain.single.mockRejectedValue(new Error('Unexpected error'));

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('method validation', () => {
    it('should reject unsupported methods', async () => {
      mockReq.method = 'DELETE';

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });

    it('should handle PUT method', async () => {
      mockReq.method = 'PUT';

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
    });
  });

  describe('timestamp handling', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockFromChain.single.mockResolvedValue({
        data: { value: { disabled_cities: [], disabled_categories: [], global_disabled: false } },
        error: null
      });
      mockFromChain.upsert.mockResolvedValue({ error: null });
      mockFromChain.insert.mockResolvedValue({ error: null });
    });

    it('should use provided timestamp in audit log', async () => {
      const customTimestamp = '2024-01-01T12:00:00Z';
      mockReq.body = {
        action: 'disable_city',
        target: 'london',
        admin_id: 'admin-123',
        timestamp: customTimestamp
      };

      await handler(mockReq, mockRes);

      expect(mockFromChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: customTimestamp
        })
      );
    });

    it('should generate timestamp when not provided', async () => {
      mockReq.body = {
        action: 'disable_city',
        target: 'london',
        admin_id: 'admin-123'
      };

      await handler(mockReq, mockRes);

      expect(mockFromChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });
  });
});