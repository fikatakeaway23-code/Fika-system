import { Router } from 'express';
import {
  getMemberDashboard,
  getMemberUsage,
  getMemberUsageChart,
  getMemberProfile,
  submitTopUp,
} from '../controllers/memberData.controller.js';
import { authMember, enforceMemberPasswordChange } from '../middleware/authMember.middleware.js';

const router = Router();
router.use(authMember);

router.get('/profile', getMemberProfile);

router.use(enforceMemberPasswordChange);

router.get('/dashboard',   getMemberDashboard);
router.get('/usage',       getMemberUsage);
router.get('/usage/chart', getMemberUsageChart);
router.post('/topup',      submitTopUp);

export default router;
