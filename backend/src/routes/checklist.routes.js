import { Router } from 'express';
import { saveChecklist, getChecklist, getChecklistHistory } from '../controllers/checklist.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.post('/',         saveChecklist);
router.get('/',          getChecklist);
router.get('/history',   getChecklistHistory);

export default router;
