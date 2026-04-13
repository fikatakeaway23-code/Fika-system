import { Router } from 'express';
import {
  createShift,
  getShifts,
  getShiftByDate,
  getShiftById,
  updateShift,
  submitShift,
} from '../controllers/shift.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.post('/',           createShift);
router.get('/',            getShifts);
router.get('/date/:date',  getShiftByDate);
router.get('/:id',         getShiftById);
router.put('/:id',         updateShift);
router.post('/:id/submit', submitShift);

export default router;
