import { Router } from 'express';
import { getMrr, getRenewals, getLeaderboard } from '../controllers/analytics.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, requireOwner);

router.get('/mrr',         getMrr);
router.get('/renewals',    getRenewals);
router.get('/leaderboard', getLeaderboard);

export default router;
