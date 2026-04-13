import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const membershipSchema = z.object({
  companyName:   z.string().min(1).max(200),
  contactPerson: z.string().min(1),
  whatsapp:      z.string().min(1),
  address:       z.string().optional(),
  distance:      z.string().optional(),
  tier:          z.enum(['daily_pass', 'team_pack', 'office_bundle']),
  staffCount:    z.number().int().positive(),
  drinksPerDay:  z.number().int().nonnegative().optional(),
  monthlyFee:    z.number().positive(),
  paymentStatus: z.enum(['paid', 'unpaid', 'overdue']).optional(),
  paymentDate:   z.string().optional(),
  renewalDate:   z.string().optional(),
  preferredTime: z.string().optional(),
  usualOrder:    z.string().optional(),
  notes:         z.string().optional(),
  status:        z.enum(['active', 'pending', 'expired', 'cancelled']).optional(),
  joinedDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const tierDrinkLimits = {
  daily_pass:    null,   // 1/day per person
  team_pack:     30,
  office_bundle: null,   // unlimited
};

function getDrinksAllotment(tier, staffCount) {
  if (tier === 'daily_pass') return null;
  if (tier === 'team_pack')  return 30;
  return null; // unlimited
}

export async function createMembership(req, res, next) {
  try {
    const input = membershipSchema.parse(req.body);

    const membership = await prisma.membership.create({
      data: {
        ...input,
        joinedDate:  input.joinedDate  ? new Date(input.joinedDate)  : new Date(),
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : undefined,
        renewalDate: input.renewalDate ? new Date(input.renewalDate) : undefined,
        drinksRemaining: getDrinksAllotment(input.tier, input.staffCount),
      },
    });

    res.status(201).json(membership);
  } catch (err) {
    next(err);
  }
}

export async function getMemberships(req, res, next) {
  try {
    const { status, tier, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (tier)   where.tier   = tier;
    if (search) where.companyName = { contains: search, mode: 'insensitive' };

    const memberships = await prisma.membership.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(memberships);
  } catch (err) {
    next(err);
  }
}

export async function getMembershipById(req, res, next) {
  try {
    const membership = await prisma.membership.findUnique({
      where: { id: req.params.id },
    });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });
    res.json(membership);
  } catch (err) {
    next(err);
  }
}

export async function updateMembership(req, res, next) {
  try {
    const input = membershipSchema.partial().parse(req.body);
    if (input.joinedDate)  input.joinedDate  = new Date(input.joinedDate);
    if (input.paymentDate) input.paymentDate = new Date(input.paymentDate);
    if (input.renewalDate) input.renewalDate = new Date(input.renewalDate);

    const membership = await prisma.membership.update({
      where: { id: req.params.id },
      data: input,
    });

    res.json(membership);
  } catch (err) {
    next(err);
  }
}

export async function deleteMembership(req, res, next) {
  try {
    await prisma.membership.delete({ where: { id: req.params.id } });
    res.json({ message: 'Membership deleted' });
  } catch (err) {
    next(err);
  }
}

export async function incrementDrinks(req, res, next) {
  try {
    const { delta = 1 } = req.body; // +1 or -1
    const membership = await prisma.membership.findUnique({ where: { id: req.params.id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    const newUsed = Math.max(0, membership.drinksUsed + delta);
    const newRemaining = membership.drinksRemaining !== null
      ? Math.max(0, membership.drinksRemaining - delta)
      : null;

    const updated = await prisma.membership.update({
      where: { id: req.params.id },
      data: { drinksUsed: newUsed, drinksRemaining: newRemaining },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
