import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OfflineSyncManager,
  OfflineSyncAction,
  SyncActionProcessor,
} from '../src/data/sync/offline-sync-manager';

const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

describe('OfflineSyncManager Data Protection Suite', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createMockLocalStorage();
    OfflineSyncManager.registerActionProcessor(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    OfflineSyncManager.registerActionProcessor(null);
  });

  describe('1. Empty Queue Handling', () => {
    it('returns truthful empty result when queue has no pending actions', async () => {
      expect(OfflineSyncManager.getPendingQueue()).toEqual([]);

      const result = await OfflineSyncManager.flushPendingQueue();

      expect(result.processedCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.success).toBe(true);
      expect(result.message).toContain('already empty');
      expect(OfflineSyncManager.getPendingQueue()).toHaveLength(0);
    });
  });

  describe('2. Retained Queue Without Processor (Data Loss Safeguard)', () => {
    it('safely retains all queued actions when no genuine processor is registered', async () => {
      OfflineSyncManager.enqueueAction('srs_review', { cardId: 'card-1', rating: 3 });
      OfflineSyncManager.enqueueAction('lesson_progress', { lessonId: 'n5.l01', stage: 5 });

      const initialQueue = OfflineSyncManager.getPendingQueue();
      expect(initialQueue).toHaveLength(2);

      const result = await OfflineSyncManager.flushPendingQueue();

      // Must NOT report success or pretend items were synchronized
      expect(result.processedCount).toBe(0);
      expect(result.failedCount).toBe(2);
      expect(result.success).toBe(false);
      expect(result.message).toContain('No active persistence processor configured');
      expect(result.message).toContain('safely retained 2 pending action(s)');

      // Critical assertion: Queue must NOT be wiped
      const retainedQueue = OfflineSyncManager.getPendingQueue();
      expect(retainedQueue).toHaveLength(2);
      expect(retainedQueue[0].type).toBe('srs_review');
      expect(retainedQueue[1].type).toBe('lesson_progress');
    });
  });

  describe('3. Successful Processing with Real Processor', () => {
    it('processes and removes items from queue only when genuine processor confirms persistence', async () => {
      OfflineSyncManager.enqueueAction('study_event', { eventType: 'stage_complete', score: 100 });
      OfflineSyncManager.enqueueAction('assessment_submit', { testId: 'n2.l01.t1', score: 95 });

      expect(OfflineSyncManager.getPendingQueue()).toHaveLength(2);

      const mockProcessor = vi.fn().mockResolvedValue(true);
      const result = await OfflineSyncManager.flushPendingQueue(mockProcessor);

      expect(mockProcessor).toHaveBeenCalledTimes(2);
      expect(result.processedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully processed and verified 2');

      // Processed actions are safely cleared
      expect(OfflineSyncManager.getPendingQueue()).toHaveLength(0);
    });

    it('works when processor is registered via registerActionProcessor', async () => {
      OfflineSyncManager.enqueueAction('srs_review', { cardId: 'card-2', rating: 4 });

      const registeredProcessor: SyncActionProcessor = vi.fn().mockResolvedValue(true);
      OfflineSyncManager.registerActionProcessor(registeredProcessor);

      const result = await OfflineSyncManager.flushPendingQueue();

      expect(registeredProcessor).toHaveBeenCalledTimes(1);
      expect(result.processedCount).toBe(1);
      expect(result.success).toBe(true);
      expect(OfflineSyncManager.getPendingQueue()).toHaveLength(0);
    });
  });

  describe('4. Failed Processing and Retry Behavior', () => {
    it('retains failed actions and increments their retry counter', async () => {
      OfflineSyncManager.enqueueAction('srs_review', { cardId: 'card-fail', rating: 1 });

      const initialQueue = OfflineSyncManager.getPendingQueue();
      expect(initialQueue[0].retries).toBe(0);

      // Processor returns false (simulating persistence rejection)
      const rejectingProcessor = vi.fn().mockResolvedValue(false);
      const result = await OfflineSyncManager.flushPendingQueue(rejectingProcessor);

      expect(result.processedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.success).toBe(false);
      expect(result.message).toContain('failed and retained in queue');

      // The action must still be in the queue with retries = 1
      const afterFirstFail = OfflineSyncManager.getPendingQueue();
      expect(afterFirstFail).toHaveLength(1);
      expect(afterFirstFail[0].retries).toBe(1);

      // Second failure increments to 2
      await OfflineSyncManager.flushPendingQueue(rejectingProcessor);
      const afterSecondFail = OfflineSyncManager.getPendingQueue();
      expect(afterSecondFail).toHaveLength(1);
      expect(afterSecondFail[0].retries).toBe(2);
    });

    it('retains action and increments retry counter when processor throws an exception', async () => {
      OfflineSyncManager.enqueueAction('lesson_progress', { lessonId: 'n4.l10', stage: 15 });

      const throwingProcessor = vi.fn().mockRejectedValue(new Error('IndexedDB Transaction Aborted'));
      const result = await OfflineSyncManager.flushPendingQueue(throwingProcessor);

      expect(result.processedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.success).toBe(false);

      const queue = OfflineSyncManager.getPendingQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].retries).toBe(1);
    });

    it('handles mixed batches where succeeded items are cleared while failed items remain queued', async () => {
      OfflineSyncManager.enqueueAction('srs_review', { cardId: 'good-card' });
      OfflineSyncManager.enqueueAction('srs_review', { cardId: 'bad-card' });

      const mixedProcessor = vi.fn().mockImplementation(async (action: OfflineSyncAction) => {
        return action.payload.cardId === 'good-card';
      });

      const result = await OfflineSyncManager.flushPendingQueue(mixedProcessor);

      expect(result.processedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.success).toBe(false);

      const remaining = OfflineSyncManager.getPendingQueue();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].payload.cardId).toBe('bad-card');
      expect(remaining[0].retries).toBe(1);
    });
  });

  describe('5. Consumer UI Contract Verification', () => {
    it('provides truthful success: false status and message for UI notification routing when unpersisted actions exist', async () => {
      OfflineSyncManager.enqueueAction('srs_review', { cardId: 'test-card' });

      // Simulate UI calling flushPendingQueue without processor
      const res = await OfflineSyncManager.flushPendingQueue();

      // UI should use res.success to differentiate success from error notification
      expect(res.success).toBe(false);
      expect(res.processedCount).toBe(0);
      expect(res.failedCount).toBe(1);
      expect(res.message).toBe('No active persistence processor configured; safely retained 1 pending action(s) in queue.');

      // Check notification mapping contract
      const notificationType = res.success ? 'success' : 'error';
      expect(notificationType).toBe('error');
    });

    it('provides truthful success: true status when queue is empty or fully processed', async () => {
      const emptyRes = await OfflineSyncManager.flushPendingQueue();
      expect(emptyRes.success).toBe(true);
      const emptyNotificationType = emptyRes.success ? 'success' : 'error';
      expect(emptyNotificationType).toBe('success');

      OfflineSyncManager.enqueueAction('srs_review', { cardId: 'test-card-2' });
      const successProcessor = vi.fn().mockResolvedValue(true);
      const successRes = await OfflineSyncManager.flushPendingQueue(successProcessor);
      expect(successRes.success).toBe(true);
      expect(successRes.processedCount).toBe(1);
      expect(successRes.failedCount).toBe(0);
      const successNotificationType = successRes.success ? 'success' : 'error';
      expect(successNotificationType).toBe('success');
    });
  });
});
