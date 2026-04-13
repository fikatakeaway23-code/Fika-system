import { Router } from 'express';
import {
  createExpense,
  getExpenses,
  getMonthlyExpenses,
  updateExpense,
  deleteExpense,
} from '../controllers/expense.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.post('/',                      createExpense);
router.get('/',                       getExpenses);
router.get('/monthly/:month/:year',   getMonthlyExpenses);
router.put('/:id',                    requireOwner, updateExpense);
router.delete('/:id',                 requireOwner, deleteExpense);

export default router;
