import { Router } from 'express';
import {
  createMembership,
  getMemberships,
  getMembershipById,
  updateMembership,
  deleteMembership,
  incrementDrinks,
} from '../controllers/membership.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, requireOwner);

router.post('/',               createMembership);
router.get('/',                getMemberships);
router.get('/:id',             getMembershipById);
router.put('/:id',             updateMembership);
router.delete('/:id',          deleteMembership);
router.post('/:id/drinks',     incrementDrinks);

export default router;
