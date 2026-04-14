import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { format } from 'date-fns';

const CATEGORIES = ['beans','milk','syrup','food','packaging','cleaning','other'];
const REASONS    = ['expired','spilled','remade','overproduced','damaged','other'];

const wasteSchema = z.object({
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftType: z.enum(['am','pm']).optional().nullable(),
  item:      z.string().min(1),
  category:  z.enum(CATEGORIES),
  quantity:  z.coerce.number().positive(),
  unit:      z.string().min(1),
  reason:    z.enum(REASONS),
  cost:      z.coerce.number().optional().nullable(),
  notes:     z.string().optional().nullable(),
});

export async function getAllWaste(req, res, next) {
  try {
    const { from, to, month, year } = req.query;
    const where = {};

    if (from && to) {
      where.date = { gte: new Date(from), lte: new Date(to) };
    } else if (month && year) {
      const m = parseInt(month), y = parseInt(year);
      const start = new Date(y, m - 1, 1);
      const end   = new Date(y, m, 0);
      where.date  = { gte: start, lte: end };
    }

    const entries = await prisma.wasteEntry.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    res.json({ data: entries });
  } catch (err) { next(err); }
}

export async function createWaste(req, res, next) {
  try {
    const user = req.user;
    const parsed = wasteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() });

    const entry = await prisma.wasteEntry.create({
      data: {
        ...parsed.data,
        date: new Date(parsed.data.date),
        loggedBy: user.id,
      },
    });
    res.status(201).json({ data: entry });
  } catch (err) { next(err); }
}

export async function deleteWaste(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.wasteEntry.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

export async function getWasteSummary(req, res, next) {
  try {
    const { month, year } = req.query;
    const m = parseInt(month || new Date().getMonth() + 1);
    const y = parseInt(year  || new Date().getFullYear());
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0);

    const entries = await prisma.wasteEntry.findMany({
      where: { date: { gte: start, lte: end } },
    });

    const totalCost = entries.reduce((s, e) => s + (e.cost ?? 0), 0);
    const byCategory = {};
    const byReason   = {};
    entries.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
      byReason[e.reason]     = (byReason[e.reason]     ?? 0) + 1;
    });

    res.json({ data: { totalEntries: entries.length, totalCost, byCategory, byReason } });
  } catch (err) { next(err); }
}
