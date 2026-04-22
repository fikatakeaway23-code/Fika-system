import { Router } from 'express';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';
import { getAllWaste, createWaste, deleteWaste, getWasteSummary } from '../controllers/waste.controller.js';

const router = Router();
router.use(authenticate);

router.get('/summary', getWasteSummary);
router.get('/',        getAllWaste);
router.post('/',       createWaste);
router.delete('/:id',  requireOwner, deleteWaste);

export default router;
