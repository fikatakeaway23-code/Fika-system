import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

const scheduleSchema = z.object({
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftType: z.enum(['am','pm']),
  staffName: z.string().min(1),
  notes:     z.string().optional().nullable(),
  confirmed: z.boolean().optional(),
});

export async function getSchedule(req, res, next) {
  try {
    const { month, year } = req.query;
    const m = parseInt(month || new Date().getMonth() + 1);
    const y = parseInt(year  || new Date().getFullYear());
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0);

    const entries = await prisma.shiftSchedule.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: [{ date: 'asc' }, { shiftType: 'asc' }],
    });
    res.json({ data: entries });
  } catch (err) { next(err); }
}

export async function upsertSchedule(req, res, next) {
  try {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() });

    const { date, shiftType, ...rest } = parsed.data;
    const dateObj = new Date(date);

    const entry = await prisma.shiftSchedule.upsert({
      where: { date_shiftType: { date: dateObj, shiftType } },
      update: rest,
      create: { date: dateObj, shiftType, ...rest },
    });
    res.json({ data: entry });
  } catch (err) { next(err); }
}

export async function deleteSchedule(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.shiftSchedule.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}
