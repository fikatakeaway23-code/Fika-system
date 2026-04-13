import { Router } from 'express';
import {
  createFinanceRecord,
  getFinanceRecords,
  getMonthlyFinance,
  getDiscrepancies,
  getFinanceByDate,
} from '../controllers/finance.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, requireOwner);

router.post('/',                        createFinanceRecord);
router.get('/',                         getFinanceRecords);
router.get('/date/:date',               getFinanceByDate);
router.get('/monthly/:month/:year',     getMonthlyFinance);
router.get('/discrepancy',              getDiscrepancies);

export default router;
