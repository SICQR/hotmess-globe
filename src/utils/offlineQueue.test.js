import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getQueue,
  enqueue,
  dequeue,
  updateQueueItem,
  clearQueue,
  getQueueStats,
  processQueue,
  hasPendingItems,
  getPendingForEntity,
  withOfflineSupport,
} from './offlineQueue';

describe('offlineQueue', () => {
  let mockLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockLocalStorage[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockLocalStorage[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete mockLocalStorage[key];
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearQueue();
  });

  describe('getQueue', () => {
    it('returns empty array when no queue exists', () => {
      const queue = getQueue();
      expect(queue).toEqual([]);
    });

    it('returns parsed queue from localStorage', () => {
      const items = [{ id: '1', type: 'create', entity: 'message', data: {} }];
      mockLocalStorage['hotmess_offline_queue'] = JSON.stringify(items);

      const queue = getQueue();
      expect(queue).toEqual(items);
    });

    it('returns empty array on parse error', () => {
      mockLocalStorage['hotmess_offline_queue'] = 'invalid json';

      const queue = getQueue();
      expect(queue).toEqual([]);
    });
  });

  describe('enqueue', () => {
    it('adds item to queue', () => {
      const id = enqueue({
        type: 'create',
        entity: 'message',
        data: { text: 'Hello' },
      });

      expect(id).toBeDefined();
      const queue = getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('create');
      expect(queue[0].entity).toBe('message');
      expect(queue[0].data).toEqual({ text: 'Hello' });
    });

    it('generates unique IDs', () => {
      const id1 = enqueue({ type: 'create', entity: 'a', data: {} });
      const id2 = enqueue({ type: 'create', entity: 'b', data: {} });

      expect(id1).not.toBe(id2);
    });

    it('sets timestamp and default values', () => {
      enqueue({ type: 'update', entity: 'profile', data: {} });

      const queue = getQueue();
      expect(queue[0].timestamp).toBeDefined();
      expect(queue[0].retries).toBe(0);
      expect(queue[0].error).toBeNull();
    });
  });

  describe('dequeue', () => {
    it('removes item from queue by id', () => {
      const id = enqueue({ type: 'create', entity: 'message', data: {} });
      expect(getQueue()).toHaveLength(1);

      dequeue(id);
      expect(getQueue()).toHaveLength(0);
    });

    it('does nothing for non-existent id', () => {
      enqueue({ type: 'create', entity: 'message', data: {} });

      dequeue('non-existent');
      expect(getQueue()).toHaveLength(1);
    });
  });

  describe('updateQueueItem', () => {
    it('updates item properties', () => {
      const id = enqueue({ type: 'create', entity: 'message', data: {} });

      updateQueueItem(id, { retries: 2, error: 'Network error' });

      const queue = getQueue();
      expect(queue[0].retries).toBe(2);
      expect(queue[0].error).toBe('Network error');
    });

    it('preserves other properties', () => {
      const id = enqueue({ type: 'create', entity: 'message', data: { text: 'Hi' } });

      updateQueueItem(id, { retries: 1 });

      const queue = getQueue();
      expect(queue[0].type).toBe('create');
      expect(queue[0].data).toEqual({ text: 'Hi' });
    });
  });

  describe('clearQueue', () => {
    it('removes all items', () => {
      enqueue({ type: 'create', entity: 'a', data: {} });
      enqueue({ type: 'update', entity: 'b', data: {} });

      clearQueue();

      expect(getQueue()).toEqual([]);
    });
  });

  describe('getQueueStats', () => {
    it('returns correct statistics', () => {
      enqueue({ type: 'create', entity: 'message', data: {} });
      enqueue({ type: 'create', entity: 'message', data: {} });
      enqueue({ type: 'update', entity: 'profile', data: {} });

      const stats = getQueueStats();

      expect(stats.total).toBe(3);
      expect(stats.byEntity.message).toBe(2);
      expect(stats.byEntity.profile).toBe(1);
      expect(stats.byType.create).toBe(2);
      expect(stats.byType.update).toBe(1);
    });

    it('returns zero stats for empty queue', () => {
      const stats = getQueueStats();

      expect(stats.total).toBe(0);
      expect(stats.byEntity).toEqual({});
      expect(stats.byType).toEqual({});
    });

    it('tracks failed items', () => {
      const id = enqueue({ type: 'create', entity: 'message', data: {} });
      updateQueueItem(id, { retries: 2 });

      const stats = getQueueStats();
      expect(stats.failedItems).toBe(1);
    });
  });

  describe('processQueue', () => {
    it('processes all items successfully', async () => {
      enqueue({ type: 'create', entity: 'message', data: {} });
      enqueue({ type: 'update', entity: 'profile', data: {} });

      const processor = vi.fn().mockResolvedValue(undefined);

      const result = await processQueue(processor);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
      expect(processor).toHaveBeenCalledTimes(2);
    });

    it('handles failed items', async () => {
      enqueue({ type: 'create', entity: 'message', data: {} });

      const processor = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await processQueue(processor);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.remaining).toBe(1);

      const queue = getQueue();
      expect(queue[0].retries).toBe(1);
      expect(queue[0].error).toBe('Network error');
    });

    it('removes items after max retries', async () => {
      const id = enqueue({ type: 'create', entity: 'message', data: {} });
      updateQueueItem(id, { retries: 5 }); // Already at max

      const processor = vi.fn().mockRejectedValue(new Error('Error'));

      await processQueue(processor);

      expect(getQueue()).toHaveLength(0);
    });

    it('returns early for empty queue', async () => {
      const processor = vi.fn();

      const result = await processQueue(processor);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
      expect(processor).not.toHaveBeenCalled();
    });
  });

  describe('hasPendingItems', () => {
    it('returns false for empty queue', () => {
      expect(hasPendingItems()).toBe(false);
    });

    it('returns true when items exist', () => {
      enqueue({ type: 'create', entity: 'message', data: {} });
      expect(hasPendingItems()).toBe(true);
    });
  });

  describe('getPendingForEntity', () => {
    it('returns items for specific entity', () => {
      enqueue({ type: 'create', entity: 'message', data: { id: 1 } });
      enqueue({ type: 'update', entity: 'profile', data: { id: 2 } });
      enqueue({ type: 'create', entity: 'message', data: { id: 3 } });

      const messageItems = getPendingForEntity('message');

      expect(messageItems).toHaveLength(2);
      expect(messageItems[0].data.id).toBe(1);
      expect(messageItems[1].data.id).toBe(3);
    });

    it('returns empty array for non-existent entity', () => {
      enqueue({ type: 'create', entity: 'message', data: {} });

      const items = getPendingForEntity('profile');
      expect(items).toEqual([]);
    });
  });

  describe('withOfflineSupport', () => {
    it('executes mutation when online', async () => {
      const mutationFn = vi.fn().mockResolvedValue({ id: 1 });

      const result = await withOfflineSupport(mutationFn, {
        entity: 'message',
        type: 'create',
        data: { text: 'Hello' },
      });

      expect(result).toEqual({ id: 1 });
      expect(mutationFn).toHaveBeenCalledWith({ text: 'Hello' });
    });

    it('queues mutation when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const mutationFn = vi.fn();
      const onQueued = vi.fn();

      const result = await withOfflineSupport(mutationFn, {
        entity: 'message',
        type: 'create',
        data: { text: 'Hello' },
        onQueued,
      });

      expect(result.queued).toBe(true);
      expect(result.queueId).toBeDefined();
      expect(mutationFn).not.toHaveBeenCalled();
      expect(onQueued).toHaveBeenCalledWith(result.queueId);
      expect(getQueue()).toHaveLength(1);
    });
  });
});
