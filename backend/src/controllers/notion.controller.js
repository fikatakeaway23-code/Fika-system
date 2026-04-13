import { syncOne, syncAllPending, getRecentSyncs } from '../services/notion.service.js';

export async function syncRecord(req, res, next) {
  try {
    const { recordType, recordId } = req.params;
    const result = await syncOne(recordType, recordId, req.user.id);
    res.json({ message: 'Synced successfully', ...result });
  } catch (err) {
    next(err);
  }
}

export async function syncAll(req, res, next) {
  try {
    const results = await syncAllPending(req.user.id);
    res.json({
      message: `Sync complete: ${results.success.length} succeeded, ${results.failed.length} failed`,
      ...results,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSyncStatus(req, res, next) {
  try {
    const syncs = await getRecentSyncs(50);
    const lastSuccess = syncs.find((s) => s.success);
    const lastFailure = syncs.find((s) => !s.success);

    res.json({
      recentSyncs: syncs,
      lastSyncAt:  lastSuccess?.syncedAt ?? null,
      lastError:   lastFailure ? { at: lastFailure.syncedAt, message: lastFailure.errorMessage } : null,
    });
  } catch (err) {
    next(err);
  }
}
