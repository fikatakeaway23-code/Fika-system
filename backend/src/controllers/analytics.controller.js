import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

// GET /api/analytics/mrr
export async function getMrr(req, res, next) {
  try {
    const memberships = await prisma.membership.findMany({
      where: { status: 'active' },
      select: { monthlyFee: true, tier: true },
    });

    const totalMrr = memberships.reduce((s, m) => s + (m.monthlyFee ?? 0), 0);
    const byTier = {};
    for (const m of memberships) {
      byTier[m.tier] = (byTier[m.tier] ?? 0) + (m.monthlyFee ?? 0);
    }

    res.json({
      totalMrr,
      memberCount: memberships.length,
      avgFee: memberships.length > 0 ? totalMrr / memberships.length : 0,
      byTier,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/renewals?days=30
export async function getRenewals(req, res, next) {
  try {
    const { days = 30 } = z.object({
      days: z.coerce.number().int().min(1).max(365).default(30),
    }).parse(req.query);

    const now    = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() + days);

    const memberships = await prisma.membership.findMany({
      where: {
        status: 'active',
        renewalDate: { lte: cutoff },
      },
      orderBy: { renewalDate: 'asc' },
      select: {
        id: true,
        companyName: true,
        whatsapp: true,
        renewalDate: true,
        monthlyFee: true,
        tier: true,
        paymentStatus: true,
      },
    });

    const withDays = memberships.map((m) => {
      const diffMs   = new Date(m.renewalDate).getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...m, daysLeft };
    });

    res.json({ renewals: withDays, count: withDays.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/leaderboard?month=4&year=2026
export async function getLeaderboard(req, res, next) {
  try {
    const now = new Date();
    const { month, year } = z.object({
      month: z.coerce.number().int().min(1).max(12).default(now.getMonth() + 1),
      year:  z.coerce.number().int().min(2020).default(now.getFullYear()),
    }).parse(req.query);

    const shifts = await prisma.shift.findMany({
      where: {
        status: 'submitted',
        date: {
          gte: new Date(year, month - 1, 1),
          lt:  new Date(year, month, 1),
        },
      },
      include: { user: { select: { id: true, name: true } } },
    });

    const byUser = {};
    for (const s of shifts) {
      if (!byUser[s.userId]) {
        byUser[s.userId] = { userId: s.userId, name: s.user.name, drinks: 0, shifts: 0 };
      }
      byUser[s.userId].drinks += s.drinksCount ?? 0;
      byUser[s.userId].shifts += 1;
    }

    const leaderboard = Object.values(byUser).sort((a, b) => b.drinks - a.drinks);

    res.json({ month, year, leaderboard });
  } catch (err) {
    next(err);
  }
}
