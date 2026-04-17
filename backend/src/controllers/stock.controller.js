import { prisma } from '../lib/prisma.ts';
import { z } from 'zod';

const CATEGORIES = ['beans','milk','syrup','food','packaging','cleaning','other'];

const stockSchema = z.object({
  name:           z.string().min(1),
  category:       z.enum(CATEGORIES),
  unit:           z.string().min(1),
  quantity:       z.coerce.number().min(0).default(0),
  reorderLevel:   z.coerce.number().min(0).default(0),
  costPerUnit:    z.coerce.number().optional().nullable(),
  notes:          z.string().optional().nullable(),
});

export async function getAllStock(req, res, next) {
  try {
    const { category } = req.query;
    const where = category ? { category } : {};
    const items = await prisma.stockItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: items });
  } catch (err) { next(err); }
}

export async function createStock(req, res, next) {
  try {
    const parsed = stockSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() });
    const item = await prisma.stockItem.create({ data: parsed.data });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
}

export async function updateStock(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = stockSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() });
    const item = await prisma.stockItem.update({ where: { id }, data: parsed.data });
    res.json({ data: item });
  } catch (err) { next(err); }
}

export async function adjustStock(req, res, next) {
  try {
    const { id } = req.params;
    const { delta } = req.body;
    if (typeof delta !== 'number') return res.status(400).json({ message: 'delta must be a number' });

    const current = await prisma.stockItem.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: 'Not found' });

    const newQty = Math.max(0, current.quantity + delta);
    const updateData = { quantity: newQty };
    if (delta > 0) updateData.lastRestockedAt = new Date();

    const item = await prisma.stockItem.update({ where: { id }, data: updateData });
    res.json({ data: item });
  } catch (err) { next(err); }
}

export async function deleteStock(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.stockItem.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

export async function getLowStock(req, res, next) {
  try {
    const all = await prisma.stockItem.findMany({ orderBy: { quantity: 'asc' } });
    const low = all.filter(i => i.reorderLevel > 0 && i.quantity <= i.reorderLevel);
    res.json({ data: low });
  } catch (err) { next(err); }
}
