import { z } from 'zod';
import { prisma } from '../lib/prisma.ts';

const targetSchema = z.object({
  period:       z.enum(['daily','monthly']),
  targetAmount: z.number().positive(),
  drinksTarget: z.number().int().optional().nullable(),
  month:        z.number().int().min(1).max(12).optional().nullable(),
  year:         z.number().int(),
  day:          z.string().optional().nullable(),
  notes:        z.string().optional().nullable(),
});

export async function getTargets(req, res, next) {
  try {
    const { year, month, period } = req.query;
    const where = {};
    if (year)   where.year = parseInt(year);
    if (month)  where.month = parseInt(month);
    if (period) where.period = period;
    const targets = await prisma.salesTarget.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json({ data: targets });
  } catch (err) { next(err); }
}

export async function createTarget(req, res, next) {
  try {
    const data = targetSchema.parse(req.body);
    const target = await prisma.salesTarget.create({
      data: {
        ...data,
        day: data.day ? new Date(data.day) : null,
      },
    });
    res.status(201).json({ data: target });
  } catch (err) { next(err); }
}

export async function updateTarget(req, res, next) {
  try {
    const data = targetSchema.partial().parse(req.body);
    const target = await prisma.salesTarget.update({
      where: { id: req.params.id },
      data: {
        ...data,
        day: data.day !== undefined ? (data.day ? new Date(data.day) : null) : undefined,
      },
    });
    res.json({ data: target });
  } catch (err) { next(err); }
}

export async function deleteTarget(req, res, next) {
  try {
    await prisma.salesTarget.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function getTargetProgress(req, res, next) {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const [monthlyTarget, monthlyFinance, dailyTargets, todayFinance] = await Promise.all([
      prisma.salesTarget.findFirst({ where: { period: 'monthly', month, year } }),
      prisma.financeRecord.aggregate({
        where: { month, year },
        _sum: { posTotal: true },
      }),
      prisma.salesTarget.findMany({ where: { period: 'daily', year } }),
      prisma.financeRecord.findFirst({ where: { date: { gte: new Date(now.setHours(0,0,0,0)) } } }),
    ]);

    const actualRevenue = monthlyFinance._sum.posTotal ?? 0;
    const targetAmount  = monthlyTarget?.targetAmount ?? 0;
    const progress      = targetAmount > 0 ? Math.round((actualRevenue / targetAmount) * 100) : null;

    res.json({
      data: {
        monthly: { target: monthlyTarget, actual: actualRevenue, progress },
        todayActual: todayFinance?.posTotal ?? 0,
      },
    });
  } catch (err) { next(err); }
}
