import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getQueue,
  enqueue,
  dequeue,
  updateQueueItem,
  clearQueue,
  getQueueStats,
  processQueue,
  withOfflineSupport,
  hasPendingItems,
  getPendingForEntity,
  setupOfflineSync,
} from './offlineQueue';

describe('offlineQueue', () => {
  const originalLocalStorage = global.localStorage;
  const originalNavigator = global.navigator;
  let store = {};

  beforeEach(() => {
    vi.clearAllMocks();
    store = {};

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
    };

    // Mock navigator.onLine
    Object.defineProperty(global, 'navigator', {
      value: {
        onLine: true,
        serviceWorker: {
          ready: Promise.resolve({
            sync: {
              register: vi.fn(),
            },
          }),
        },
      },
      writable: true,
    });

    // Mock window.SyncManager
    global.window = {
      SyncManager: vi.fn(),
      addEventListener: vi.fn(),
    };
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    global.navigator = originalNavigator;
  });

  describe('getQueue', () => {
    it('should return empty array when queue is empty', () => {
      const queue = getQueue();
      expect(queue).toEqual([]);
    });

    it('should return stored queue items', () => {
      const items = [
        { id: '1', type: 'create', entity: 'message', data: { text: 'Hello' } },
      ];
      store['hotmess_offline_queue'] = JSON.stringify(items);

      const queue = getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entity).toBe('message');
    });

    it('should handle corrupted storage gracefully', () => {
      store['hotmess_offline_queue'] = 'invalid json';

      const queue = getQueue();
      expect(queue).toEqual([]);
    });
  });

  describe('enqueue', () => {
    it('should add item to queue', () => {
      const item = {
        type: 'create',
        entity: 'message',
        data: { text: 'Hello' },
      };

      const id = enqueue(item);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const queue = getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('create');
      expect(queue[0].entity).toBe('message');
      expect(queue[0].retries).toBe(0);
    });

    it('should add timestamp to queue item', () => {
      const item = {
        type: 'update',
        entity: 'beacon',
        data: { status: 'active' },
      };

      enqueue(item);

      const queue = getQueue();
      expect(queue[0].timestamp).toBeDefined();
    });

    it('should add multiple items', () => {
      enqueue({ type: 'create', entity: 'message', data: {} });
      enqueue({ type: 'update', entity: 'profile', data: {} });
      enqueue({ type: 'delete', entity: 'beacon', data: {} });

      const queue = getQueue();
      expect(queue).toHaveLength(3);
    });
  });

  describe('dequeue', () => {
    it('should remove item from queue', () => {
      const id = enqueue({ type: 'create', entity: 'message', data: {} });

      expect(getQueue()).toHaveLength(1);

      dequeue(id);

      expect(getQueue()).toHaveLength(0);
    });

    it('should only remove specified item', () => {
      const id1 = enqueue({ type: 'create', entity: 'message', data: {} });
      enqueue({ type: 'update', entity: 'profile', data: {} });

      dequeue(id1);

      const queue = getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entity).toBe('profile');
    });

    it('should handle non-existent id gracefully', () => {
      enqueue({ type: 'create', entity: 'message', data: {} });

      dequeue('non-existent-id');

      expect(getQueue()).toHaveLength(1);
    });
  });

  describe('updateQueueItem', () => {
    it('should update item properties', () => {
      const id = enqueue({ type: 'create', entity: 'message', data: {} });

      updateQueueItem(id, { retries: 1, error: 'Network error' });

      const queue = getQueue();
      expect(queue[0].retries).toBe(1);
      expect(queue[0].error).toBe('Network error');
    });

    it('should not affect other items', () => {
      const id1 = enqueue({ type: 'create', entity: 'message', data: {} });
      const id2 = enqueue({ type: 'update', entity: 'profile', data: {} });

      updateQueueItem(id1, { retries: 5 });

      const queue = getQueue();
      const item2 = queue.find((i) => i.id === id2);
      expect(item2.retries).toBe(0);
    });
  });

  describe('clearQueue', () => {
    it('should remove all items from queue', () => {
      enqueue({ type: 'create', entity: 'message', data: {} });
      enqueue({ type: 'update', entity: 'profile', data: {} });

      clearQueue();

      expect(getQueue()).toHaveLength(0);
    });
  });

  describe('getQueueStats', () => {
    it('should return correct statistics', () => {
      enqueue({ type: 'create', entity: 'message', data: {} });
      enqueue({ type: 'create', entity: 'message', data: {} });
      enqueue({ type: 'update', entity: 'profile', data: {} });
      enqueue({ type: 'delete', entity: 'beacon', data: {} });

      const stats = getQueueStats();

      expect(stats.total).toBe(4);
      expect(stats.byEntity.message).toBe(2);
      expect(stats.byEntity.profile).toBe(1);
      expect(stats.byEntity.beacon).toBe(1);
      expect(stats.byType.create).toBe(2);
      expect(stats.byType.update).toBe(1);
      expect(stats.byType.delete).toBe(1);
    });

    it('should return empty stats for empty queue', () => {
      const stats = getQueueStats();

      expect(stats.total).toBe(0);
      expect(stats.byEntity).toEqual({});
      expect(stats.byType).toEqual({});
    });

    it('should track failed items', () => {
      const id = enqueue({ type: 'create', entity: 'message', data: {} });
      updateQueueItem(id, { retries: 1 });

      const stats = getQueueStats();

      expect(stats.failedItems).toBe(1);
    });
  });

  describe('processQueue', () => {
    it('should process all items successfully', async () => {
      enqueue({ type: 'create', entity: 'message', data: { text: '1' } });
      enqueue({ type: 'create', entity: 'message', data: { text: '2' } });

      const processor = vi.fn().mockResolvedValue(true);

      const result = await processQueue(processor);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
      expect(processor).toHaveBeenCalledTimes(2);
    });

    it('should handle failed processing', async () => {
      enqueue({ type: 'create', entity: 'message', data: {} });

      const processor = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await processQueue(processor);

      expect(result.failed).toBe(1);
      expect(result.remaining).toBe(1);

      const queue = getQueue();
      expect(queue[0].retries).toBe(1);
      expect(queue[0].error).toBe('Network error');
    });

    it('should remove items after max retries', async () => {
      const id = enqueue({ type: 'create', entity: 'message', data: {} });
      // Set retries to 5 (already at max, so next failure will remove it)
      updateQueueItem(id, { retries: 5 });

      const processor = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await processQueue(processor);

      // Item should be removed after reaching max retries
      expect(getQueue()).toHaveLength(0);
    });

    it('should return early for empty queue', async () => {
      const processor = vi.fn();

      const result = await processQueue(processor);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
      expect(processor).not.toHaveBeenCalled();
    });
  });

  describe('withOfflineSupport', () => {
    it('should execute mutation when online', async () => {
      const mutationFn = vi.fn().mockResolvedValue({ success: true });
      const data = { text: 'Hello' };

      const result = await withOfflineSupport(mutationFn, {
        entity: 'message',
        type: 'create',
        data,
      });

      expect(mutationFn).toHaveBeenCalledWith(data);
      expect(result).toEqual({ success: true });
    });

    it('should queue mutation when offline', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      const mutationFn = vi.fn();
      const data = { text: 'Hello' };

      const result = await withOfflineSupport(mutationFn, {
        entity: 'message',
        type: 'create',
        data,
      });

      expect(mutationFn).not.toHaveBeenCalled();
      expect(result.queued).toBe(true);
      expect(result.queueId).toBeDefined();
      expect(result.message).toContain('queued');
    });

    it('should call onQueued callback when offline', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      const mutationFn = vi.fn();
      const onQueued = vi.fn();

      await withOfflineSupport(mutationFn, {
        entity: 'message',
        type: 'create',
        data: {},
        onQueued,
      });

      expect(onQueued).toHaveBeenCalled();
    });
  });

  describe('hasPendingItems', () => {
    it('should return false for empty queue', () => {
      expect(hasPendingItems()).toBe(false);
    });

    it('should return true when items exist', () => {
      enqueue({ type: 'create', entity: 'message', data: {} });
      expect(hasPendingItems()).toBe(true);
    });
  });

  describe('getPendingForEntity', () => {
    it('should return items for specific entity', () => {
      enqueue({ type: 'create', entity: 'message', data: { id: 1 } });
      enqueue({ type: 'create', entity: 'message', data: { id: 2 } });
      enqueue({ type: 'update', entity: 'profile', data: {} });

      const pending = getPendingForEntity('message');

      expect(pending).toHaveLength(2);
      expect(pending.every((i) => i.entity === 'message')).toBe(true);
    });

    it('should return empty array when no items for entity', () => {
      enqueue({ type: 'create', entity: 'message', data: {} });

      const pending = getPendingForEntity('beacon');

      expect(pending).toHaveLength(0);
    });
  });
});
