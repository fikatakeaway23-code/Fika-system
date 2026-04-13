import { Router } from 'express';
import {
  createHRRecord,
  getHRRecords,
  getHRByStaff,
  updateHRRecord,
} from '../controllers/hr.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, requireOwner);

router.post('/',              createHRRecord);
router.get('/',               getHRRecords);
router.get('/staff/:staffId', getHRByStaff);
router.put('/:id',            updateHRRecord);

export default router;
