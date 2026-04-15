import { Router } from 'express';
import { checkIn, getMyAttendance } from '../controllers/attendance.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.post('/checkin', checkIn);
router.get('/',         getMyAttendance);

export default router;
