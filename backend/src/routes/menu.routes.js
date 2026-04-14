import { Router } from 'express';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, toggleAvailability } from '../controllers/menu.controller.js';

const router = Router();

router.get('/',           authenticate, getMenuItems);
router.post('/',          authenticate, requireOwner, createMenuItem);
router.put('/:id',        authenticate, requireOwner, updateMenuItem);
router.delete('/:id',     authenticate, requireOwner, deleteMenuItem);
router.patch('/:id/toggle', authenticate, requireOwner, toggleAvailability);

export default router;
