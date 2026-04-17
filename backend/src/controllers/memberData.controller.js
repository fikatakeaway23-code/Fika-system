import { prisma } from '../lib/prisma.ts';
import { z } from 'zod';
import { sendPushToOwner } from '../services/push.service.js';

export async function getMemberDashboard(req, res, next) {
  try {
    const membership = await prisma.membership.findUnique({
      where: { id: req.member.membershipId },
      select: {
        id:                    true,
        companyName:           true,
        tier:                  true,
        status:                true,
        drinksUsed:            true,
        drinksRemaining:       true,
        rolloverDrinks:        true,
        consecutiveRenewals:   true,
        loyaltyDiscountActive: true,
        monthlyFee:            true,
        renewalDate:           true,
        paymentStatus:         true,
      },
    });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const usedThisMonth = await prisma.drinkRedemption.aggregate({
      where: { membershipId: membership.id, month, year },
      _sum:  { count: true },
    });

    const startOfMonth = new Date(year, month - 1, 1);
    let workingDays = 0;
    for (let d = new Date(startOfMonth); d <= now; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
    }
    const totalUsed = usedThisMonth._sum.count ?? 0;
    const avgPerDay = workingDays > 0 ? +(totalUsed / workingDays).toFixed(1) : 0;

    res.json({ membership, usedThisMonth: totalUsed, avgPerDay, workingDays });
  } catch (err) {
    next(err);
  }
}

export async function getMemberUsage(req, res, next) {
  try {
    const querySchema = z.object({
      month:  z.coerce.number().int().min(1).max(12).optional(),
      year:   z.coerce.number().int().min(2020).optional(),
      page:   z.coerce.number().int().min(1).default(1),
    });
    const { month, year, page } = querySchema.parse(req.query);
    const limit  = 20;
    const offset = (page - 1) * limit;

    const where = { membershipId: req.member.membershipId };
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

    res.json({ records, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

export async function getMemberUsageChart(req, res, next) {
  try {
    const now = new Date();
    const querySchema = z.object({
      month: z.coerce.number().int().min(1).max(12).default(now.getMonth() + 1),
      year:  z.coerce.number().int().min(2020).default(now.getFullYear()),
    });
    const { month, year } = querySchema.parse(req.query);

    const redemptions = await prisma.drinkRedemption.findMany({
      where:  { membershipId: req.member.membershipId, month, year },
      select: { redeemedAt: true, count: true },
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, drinks: 0 }));

    for (const r of redemptions) {
      const day = new Date(r.redeemedAt).getDate() - 1;
      data[day].drinks += r.count;
    }

    res.json({ month, year, data });
  } catch (err) {
    next(err);
  }
}

export async function getMemberProfile(req, res, next) {
  try {
    const account = await prisma.memberAccount.findUnique({
      where:   { id: req.member.accountId },
      include: {
        membership: {
          select: {
            companyName:           true,
            contactPerson:         true,
            whatsapp:              true,
            tier:                  true,
            staffCount:            true,
            monthlyFee:            true,
            renewalDate:           true,
            consecutiveRenewals:   true,
            loyaltyDiscountActive: true,
          },
        },
      },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const { passwordHash, ...safe } = account;
    res.json(safe);
  } catch (err) {
    next(err);
  }
}

export async function submitTopUp(req, res, next) {
  try {
    const schema = z.object({ message: z.string().max(500).optional() });
    const { message } = schema.parse(req.body);

    const request = await prisma.topUpRequest.create({
      data: { membershipId: req.member.membershipId, message, status: 'pending' },
    });

    // Push notify owner about top-up request
    const membership = await prisma.membership.findUnique({
      where: { id: req.member.membershipId },
      select: { companyName: true },
    });
    sendPushToOwner(
      '🔄 Top-up request',
      `${membership?.companyName ?? 'A member'} has requested a package top-up.`,
      { screen: 'Memberships' }
    );

    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
}
