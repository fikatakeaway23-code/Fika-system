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

    const withDays = memberships
      .filter((m) => m.renewalDate !== null)
      .map((m) => {
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
        status: { in: ['submitted', 'reviewed'] },
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
        byUser[s.userId] = { userId: s.userId, name: s.user?.name ?? 'Unknown', drinks: 0, shifts: 0 };
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

// GET /api/analytics/waste-trend
// Returns waste cost grouped by month for the last 6 calendar months
export async function getWasteTrend(req, res, next) {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const entries = await prisma.wasteEntry.findMany({
      where:   { date: { gte: sixMonthsAgo } },
      select:  { date: true, category: true, cost: true },
      orderBy: { date: 'asc' },
    });

    const buckets = {};
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      buckets[key] = {
        month:      d.getMonth() + 1,
        year:       d.getFullYear(),
        label:      d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
        totalCost:  0,
        byCategory: {},
      };
    }

    for (const e of entries) {
      const d   = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!buckets[key]) continue;
      buckets[key].totalCost += e.cost ?? 0;
      buckets[key].byCategory[e.category] =
        (buckets[key].byCategory[e.category] ?? 0) + (e.cost ?? 0);
    }

    res.json({ trend: Object.values(buckets) });
  } catch (err) {
    next(err);
  }
}

// GET /api/analytics/stock-health
// Returns items at or below reorder level, sorted by urgency
export async function getStockHealth(req, res, next) {
  try {
    const all = await prisma.stockItem.findMany({ orderBy: { quantity: 'asc' } });

    const critical = all
      .filter((s) => s.reorderLevel > 0 && s.quantity <= s.reorderLevel)
      .map((s) => ({
        id:           s.id,
        name:         s.name,
        category:     s.category,
        unit:         s.unit,
        quantity:     s.quantity,
        reorderLevel: s.reorderLevel,
        costPerUnit:  s.costPerUnit,
        pct:          Math.round((s.quantity / s.reorderLevel) * 100),
      }))
      .sort((a, b) => a.pct - b.pct);

    res.json({ critical, totalItems: all.length, criticalCount: critical.length });
  } catch (err) {
    next(err);
  }
}
