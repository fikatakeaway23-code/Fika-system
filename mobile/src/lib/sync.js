import { storage } from './storage.js';
import { shiftApi, inventoryApi } from './api.js';

/**
 * Offline Sync Manager
 * Iterates through the pending sync queue and attempts to replay operations.
 */
export const syncManager = {
  isProcessing: false,

  async processQueue() {
    if (this.isProcessing) return;
    
    const queue = await storage.getPendingSync();
    if (queue.length === 0) return;

    this.isProcessing = true;
    console.log(`[SYNC] Processing queue: ${queue.length} items remaining`);

    // Work on a copy to avoid concurrent modification issues if we were to add items while processing
    const currentQueue = [...queue];

    for (const op of currentQueue) {
      try {
        await this.replayOperation(op);
        // If success, remove from queue using the queuedAt timestamp as the ID
        await storage.removeFromPendingSync(op.queuedAt);
      } catch (err) {
        console.warn(`[SYNC] Failed to replay operation: ${op.type}`, err.message);
        // Stop processing if we hit a network error (likely still offline)
        break;
      }
    }

    this.isProcessing = false;
    await storage.setLastSync(new Date().toISOString());
  },

  async replayOperation(op) {
    switch (op.type) {
      case 'SHIFT_CREATE':
        return shiftApi.create(op.data);
      case 'SHIFT_UPDATE':
        return shiftApi.update(op.id, op.data);
      case 'SHIFT_SUBMIT':
        return shiftApi.submit(op.id);
      case 'INVENTORY_UPSERT':
        return inventoryApi.upsert(op.data);
      default:
        console.error(`[SYNC] Unknown operation type: ${op.type}`);
    }
  }
};
