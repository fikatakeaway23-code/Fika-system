import { useEffect, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus.js';
import { storage } from '../lib/storage.js';
import { api } from '../lib/api.js';

export function useOfflineSync() {
  const isOnline = useNetworkStatus();

  const processQueue = useCallback(async () => {
    if (!isOnline) return;

    const queue = await storage.getPendingSync();
    if (queue.length === 0) return;

    for (const op of queue) {
      try {
        await api({ method: op.method, url: op.url, data: op.data });
        await storage.removeFromPendingSync(op.id);
      } catch (err) {
        // Keep in queue if server error; remove if auth/validation error
        if (err.response?.status === 400 || err.response?.status === 401) {
          await storage.removeFromPendingSync(op.id);
        }
      }
    }

    await storage.setLastSync(new Date().toISOString());
  }, [isOnline]);

  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  return { isOnline, processQueue };
}
