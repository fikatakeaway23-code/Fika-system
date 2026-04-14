import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getAllWaste, createWaste, deleteWaste, getWasteSummary } from '../controllers/waste.controller.js';

const router = Router();
router.use(authenticate);

router.get('/summary', getWasteSummary);
router.get('/',        getAllWaste);
router.post('/',       createWaste);
router.delete('/:id',  deleteWaste);

export default router;
