import { Router } from 'express';
import { checkIn, getMyAttendance } from '../controllers/attendance.controller.js';
import { authenticate, requireBarista } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.post('/checkin', requireBarista, checkIn);
router.get('/',         getMyAttendance);

export default router;
