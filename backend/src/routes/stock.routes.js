import { Router } from 'express';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';
import { getAllStock, createStock, updateStock, adjustStock, deleteStock, getLowStock } from '../controllers/stock.controller.js';

const router = Router();
router.use(authenticate);

router.get('/low',       getLowStock);
router.get('/',          getAllStock);
router.post('/',         requireOwner, createStock);
router.put('/:id',       requireOwner, updateStock);
router.patch('/:id/adjust', requireOwner, adjustStock);
router.delete('/:id',    requireOwner, deleteStock);

export default router;
