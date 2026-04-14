import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getEquipmentLogs, createEquipmentLog, updateEquipmentLog, deleteEquipmentLog } from '../controllers/equipment.controller.js';

const router = Router();

router.get('/',       authenticate, getEquipmentLogs);
router.post('/',      authenticate, createEquipmentLog);
router.put('/:id',    authenticate, updateEquipmentLog);
router.delete('/:id', authenticate, deleteEquipmentLog);

export default router;
