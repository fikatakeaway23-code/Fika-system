import { Router } from 'express';
import {
  createMembership,
  getMemberships,
  getMembershipById,
  updateMembership,
  deleteMembership,
  incrementDrinks,
  redeemDrink,
  getUsage,
  getUsageSummary,
  renewMembership,
} from '../controllers/membership.controller.js';
import {
  createMemberAccount,
  deleteMemberAccount,
} from '../controllers/memberAuth.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';

const router = Router();

// Owner-only routes
router.post('/',      authenticate, requireOwner, createMembership);
router.get('/',       authenticate, requireOwner, getMemberships);
router.get('/:id',    authenticate, requireOwner, getMembershipById);
router.put('/:id',    authenticate, requireOwner, updateMembership);
router.delete('/:id', authenticate, requireOwner, deleteMembership);

// Legacy increment (keep for backwards compat — deprecated)
router.post('/:id/drinks', authenticate, requireOwner, incrementDrinks);

// New: any authenticated staff can redeem (barista or owner)
router.post('/:id/redeem', authenticate, redeemDrink);

// Owner-only: usage reports and management
router.get('/:id/usage',             authenticate, requireOwner, getUsage);
router.get('/:id/usage/summary',     authenticate, requireOwner, getUsageSummary);
router.post('/:id/renew',            authenticate, requireOwner, renewMembership);
router.post('/:id/member-account',   authenticate, requireOwner, createMemberAccount);
router.delete('/:id/member-account', authenticate, requireOwner, deleteMemberAccount);

export default router;
