import { Router } from 'express';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';
import { getTargets, createTarget, updateTarget, deleteTarget, getTargetProgress } from '../controllers/target.controller.js';

const router = Router();

router.get('/progress', authenticate, getTargetProgress);
router.get('/',         authenticate, getTargets);
router.post('/',        authenticate, requireOwner, createTarget);
router.put('/:id',      authenticate, requireOwner, updateTarget);
router.delete('/:id',   authenticate, requireOwner, deleteTarget);

export default router;
