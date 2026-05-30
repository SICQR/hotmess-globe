import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from './cadence-suggest.js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn()
  }))
}));

describe('cadence-suggest API', () => {
  let mockReq;
  let mockRes;
  let mockSupabase;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockReq = {
      method: 'POST',
      body: {
        cityId: 'london-123'
      }
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

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
      mockSupabase.rpc.mockResolvedValue({
        data: { should_escalate: false },
        error: null
      });

      await handler(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('cadence escalation check', () => {
    it('should call check_cadence_escalation RPC with cityId', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { should_escalate: false },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_cadence_escalation', {
        p_city_id: 'london-123'
      });
    });

    it('should return check result when escalation not needed', async () => {
      const checkResult = {
        should_escalate: false,
        current_level: 'standard',
        usage_metrics: { requests: 100 }
      };

      mockSupabase.rpc.mockResolvedValue({
        data: checkResult,
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(checkResult);
    });

    it('should request escalation when should_escalate is true', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: { should_escalate: true, reason: 'high_usage' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { escalation_requested: true },
          error: null
        });

      await handler(mockReq, mockRes);

      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, 'check_cadence_escalation', {
        p_city_id: 'london-123'
      });
      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, 'request_cadence_escalation', {
        p_city_id: 'london-123'
      });
    });

    it('should return check result after requesting escalation', async () => {
      const checkResult = {
        should_escalate: true,
        reason: 'high_usage',
        threshold_exceeded: true
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: checkResult, error: null })
        .mockResolvedValueOnce({ data: { success: true }, error: null });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(checkResult);
    });

    it('should handle check RPC errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'City not found' }
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'City not found' });
    });

    it('should handle request escalation RPC errors', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: { should_escalate: true },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Escalation failed' }
        });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Escalation failed' });
    });

    it('should handle exceptions during check', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Database connection lost'));

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database connection lost' });
    });
  });

  describe('edge cases', () => {
    it('should handle missing cityId', async () => {
      mockReq.body = {};
      mockSupabase.rpc.mockResolvedValue({
        data: { should_escalate: false },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_cadence_escalation', {
        p_city_id: undefined
      });
    });

    it('should handle null cityId', async () => {
      mockReq.body.cityId = null;
      mockSupabase.rpc.mockResolvedValue({
        data: { should_escalate: false },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_cadence_escalation', {
        p_city_id: null
      });
    });

    it('should handle check returning null data with should_escalate false', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should not request escalation when data is null', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    });

    it('should handle should_escalate as falsy value', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { should_escalate: 0 },
        error: null
      });

      await handler(mockReq, mockRes);

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple escalation scenarios', () => {
    it('should handle sequential escalation checks', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: { should_escalate: true },
          error: null
        })
        .mockResolvedValueOnce({
          data: { escalation_id: 'esc-123' },
          error: null
        });

      await handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});