import { Router } from 'express';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';
import { getSchedule, upsertSchedule, deleteSchedule } from '../controllers/schedule.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',       getSchedule);
router.post('/',      requireOwner, upsertSchedule);
router.delete('/:id', requireOwner, deleteSchedule);

export default router;
