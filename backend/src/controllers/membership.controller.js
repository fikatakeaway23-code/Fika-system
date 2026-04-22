import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const TIER_ROLLOVER_CAPS = {
  daily_pass: 5,
  team_pack: 8,
  office_bundle: 10,
};

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
    const adjustSchema = z.object({
      delta: z.number().int().positive().default(1),
    });
    const { delta } = adjustSchema.parse(req.body);
    const membership = await prisma.membership.findUnique({ where: { id: req.params.id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    if (membership.drinksRemaining !== null && membership.drinksRemaining < delta) {
      return res.status(400).json({
        error: 'Insufficient balance',
        drinksRemaining: membership.drinksRemaining,
      });
    }

    const updated = await prisma.membership.update({
      where: { id: req.params.id },
      data: {
        drinksUsed: { increment: delta },
        ...(membership.drinksRemaining !== null && {
          drinksRemaining: { decrement: delta },
        }),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function redeemDrink(req, res, next) {
  try {
    const { id } = req.params;
    const redeemSchema = z.object({
      count:     z.number().int().min(1).max(10).default(1),
      notes:     z.string().optional(),
      drinkType: z.string().optional(),
    });
    const { count, notes, drinkType } = redeemSchema.parse(req.body);

    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });
    if (membership.status !== 'active') {
      return res.status(400).json({ error: 'Membership is not active' });
    }
    if (membership.drinksRemaining !== null && membership.drinksRemaining < count) {
      return res.status(400).json({
        error: 'Insufficient balance',
        drinksRemaining: membership.drinksRemaining,
      });
    }

    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();
    const startOfDay = new Date(now);
    const endOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    endOfDay.setHours(23, 59, 59, 999);

    const { redemption, updated } = await prisma.$transaction(async (tx) => {
      if (membership.tier === 'daily_pass') {
        const dailyLimit = membership.drinksPerDay ?? membership.staffCount;
        const redeemedToday = await tx.drinkRedemption.aggregate({
          where: {
            membershipId: id,
            redeemedAt: { gte: startOfDay, lte: endOfDay },
          },
          _sum: { count: true },
        });
        const totalToday = redeemedToday._sum.count ?? 0;

        if (totalToday + count > dailyLimit) {
          throw Object.assign(new Error('Daily pass limit exceeded'), {
            status: 400,
            details: { dailyLimit, redeemedToday: totalToday },
          });
        }
      }

      const redemption = await tx.drinkRedemption.create({
        data: {
          membershipId:     id,
          count,
          notes,
          drinkType,
          redeemedByUserId: req.user.id,
          month,
          year,
        },
      });

      const updated = await tx.membership.update({
        where: { id },
        data: {
          drinksUsed: { increment: count },
          ...(membership.drinksRemaining !== null && {
            drinksRemaining: { decrement: count },
          }),
        },
      });

      return { redemption, updated };
    });

    res.json({ redemption, membership: updated });
  } catch (err) {
    if (err.status === 400 && err.message === 'Daily pass limit exceeded') {
      return res.status(400).json({
        error: err.message,
        ...err.details,
      });
    }
    next(err);
  }
}

export async function getUsage(req, res, next) {
  try {
    const { id } = req.params;
    const querySchema = z.object({
      month:  z.coerce.number().int().min(1).max(12).optional(),
      year:   z.coerce.number().int().min(2020).optional(),
      limit:  z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    });
    const { month, year, limit, offset } = querySchema.parse(req.query);

    const where = { membershipId: id };
    if (month !== undefined) where.month = month;
    if (year  !== undefined) where.year  = year;

    const [records, total] = await Promise.all([
      prisma.drinkRedemption.findMany({
        where,
        include: { redeemedBy: { select: { name: true } } },
        orderBy: { redeemedAt: 'desc' },
        take:    limit,
        skip:    offset,
      }),
      prisma.drinkRedemption.count({ where }),
    ]);

    res.json({ records, total, limit, offset });
  } catch (err) {
    next(err);
  }
}

export async function getUsageSummary(req, res, next) {
  try {
    const { id } = req.params;
    const now = new Date();
    const querySchema = z.object({
      month: z.coerce.number().int().min(1).max(12).default(now.getMonth() + 1),
      year:  z.coerce.number().int().min(2020).default(now.getFullYear()),
    });
    const { month, year } = querySchema.parse(req.query);

    const redemptions = await prisma.drinkRedemption.findMany({
      where:   { membershipId: id, month, year },
      include: { redeemedBy: { select: { id: true, name: true } } },
    });

    const totalDrinks = redemptions.reduce((sum, r) => sum + r.count, 0);

    const byDay = {};
    for (const r of redemptions) {
      const day = new Date(r.redeemedAt).getDate();
      byDay[day] = (byDay[day] || 0) + r.count;
    }

    const byBarista = {};
    for (const r of redemptions) {
      const name = r.redeemedBy?.name ?? 'Unknown';
      byBarista[name] = (byBarista[name] || 0) + r.count;
    }

    res.json({ month, year, totalDrinks, byDay, byBarista });
  } catch (err) {
    next(err);
  }
}

export async function renewMembership(req, res, next) {
  try {
    const { id } = req.params;
    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    const TIER_DRINK_LIMITS = { daily_pass: null, team_pack: 30, office_bundle: null };
    const drinkLimit = membership.drinksPerDay ?? TIER_DRINK_LIMITS[membership.tier];

    const rolloverCap = membership.rolloverCap ?? TIER_ROLLOVER_CAPS[membership.tier] ?? 5;
    const rolloverEarned =
      membership.drinksRemaining !== null
        ? Math.min(membership.drinksRemaining, rolloverCap)
        : 0;

    const newDrinksRemaining =
      drinkLimit !== null ? drinkLimit + rolloverEarned : null;
    const newConsecutive = membership.consecutiveRenewals + 1;

    const updated = await prisma.membership.update({
      where: { id },
      data: {
        drinksUsed:            0,
        drinksRemaining:       newDrinksRemaining,
        rolloverDrinks:        rolloverEarned,
        consecutiveRenewals:   newConsecutive,
        loyaltyDiscountActive: newConsecutive >= 3,
        monthsActive:          { increment: 1 },
        totalRevenue:          { increment: membership.monthlyFee ?? 0 },
      },
    });

    res.json({ membership: updated, rolloverEarned, newConsecutive });
  } catch (err) {
    next(err);
  }
}
