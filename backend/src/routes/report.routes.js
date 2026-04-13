import { Router } from 'express';
import {
  getMonthlyReport,
  getWeeklyReport,
  getDrinksReport,
} from '../controllers/report.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, requireOwner);

router.get('/monthly/:month/:year', getMonthlyReport);
router.get('/weekly',               getWeeklyReport);
router.get('/drinks',               getDrinksReport);

export default router;
