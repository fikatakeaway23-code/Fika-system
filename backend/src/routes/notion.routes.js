import { Router } from 'express';
import { syncRecord, syncAll, getSyncStatus } from '../controllers/notion.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, requireOwner);

router.post('/sync/:recordType/:recordId', syncRecord);
router.post('/sync-all',                   syncAll);
router.get('/status',                      getSyncStatus);

export default router;
