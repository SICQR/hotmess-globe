import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from './cadence-apply.js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    },
    rpc: vi.fn()
  }))
}));

describe('cadence-apply API', () => {
  let mockReq;
  let mockRes;
  let mockSupabase;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock request object
    mockReq = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token'
      },
      body: {
        cityId: 'test-city-123'
      }
    };

    // Mock response object
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    // Get mocked Supabase instance
    const { createClient } = await import('@supabase/supabase-js');
    mockSupabase = createClient();
  });

  describe('method validation', () => {
    it('should reject non-POST requests', async () => {
      mockReq.method = 'GET';
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });

    it('should accept POST requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@test.com' } }
      });
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true },
        error: null
      });

      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('authentication', () => {
    it('should reject requests without authorization header', async () => {
      delete mockReq.headers.authorization;
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should reject requests with malformed authorization header', async () => {
      mockReq.headers.authorization = 'InvalidFormat token';
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should reject requests with invalid token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      });
      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('should extract token from Bearer header correctly', async () => {
      mockReq.headers.authorization = 'Bearer my-secret-token';
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      });
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      await handler(mockReq, mockRes);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('my-secret-token');
    });
  });

  describe('cadence escalation approval', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@test.com' } }
      });
    });

    it('should call approve_cadence_escalation RPC with correct parameters', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { approved: true },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('approve_cadence_escalation', {
        p_city_id: 'test-city-123',
        p_admin_id: 'admin-123'
      });
    });

    it('should return success response with RPC data', async () => {
      const mockData = {
        approved: true,
        city_id: 'test-city-123',
        timestamp: '2024-01-01T00:00:00Z'
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockData,
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockData);
    });

    it('should handle RPC errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });

    it('should handle RPC throwing exceptions', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Connection timeout'));

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Connection timeout' });
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      });
    });

    it('should handle missing cityId in request body', async () => {
      mockReq.body = {};
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      await handler(mockReq, mockRes);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('approve_cadence_escalation', {
        p_city_id: undefined,
        p_admin_id: 'admin-123'
      });
    });

    it('should handle null cityId', async () => {
      mockReq.body.cityId = null;
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      await handler(mockReq, mockRes);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('approve_cadence_escalation', {
        p_city_id: null,
        p_admin_id: 'admin-123'
      });
    });

    it('should handle auth.getUser throwing exception', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Auth service down'));

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});