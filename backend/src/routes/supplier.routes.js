import { Router } from 'express';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplier.controller.js';

const router = Router();

router.get('/',       authenticate, getSuppliers);
router.post('/',      authenticate, requireOwner, createSupplier);
router.put('/:id',    authenticate, requireOwner, updateSupplier);
router.delete('/:id', authenticate, requireOwner, deleteSupplier);

export default router;
