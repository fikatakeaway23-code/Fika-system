import { Router } from 'express';
import {
  getMemberDashboard,
  getMemberUsage,
  getMemberUsageChart,
  getMemberProfile,
  submitTopUp,
} from '../controllers/memberData.controller.js';
import { authMember } from '../middleware/authMember.middleware.js';

const router = Router();
router.use(authMember);

router.get('/dashboard',   getMemberDashboard);
router.get('/usage',       getMemberUsage);
router.get('/usage/chart', getMemberUsageChart);
router.get('/profile',     getMemberProfile);
router.post('/topup',      submitTopUp);

export default router;
