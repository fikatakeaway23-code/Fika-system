import { z } from 'zod';
import { prisma } from '../lib/prisma.ts';

const menuSchema = z.object({
  name:        z.string().min(1),
  category:    z.enum(['espresso','filter','cold','matcha','tea','smoothie','food','other']),
  price:       z.number().positive(),
  description: z.string().optional(),
  available:   z.boolean().optional(),
  sortOrder:   z.number().int().optional(),
});

export async function getMenuItems(req, res, next) {
  try {
    const { category, available } = req.query;
    const where = {};
    if (category) where.category = category;
    if (available !== undefined) where.available = available === 'true';
    const items = await prisma.menuItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    res.json({ data: items });
  } catch (err) { next(err); }
}

export async function createMenuItem(req, res, next) {
  try {
    const data = menuSchema.parse(req.body);
    const item = await prisma.menuItem.create({ data });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
}

export async function updateMenuItem(req, res, next) {
  try {
    const data = menuSchema.partial().parse(req.body);
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ data: item });
  } catch (err) { next(err); }
}

export async function deleteMenuItem(req, res, next) {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function toggleAvailability(req, res, next) {
  try {
    const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const updated = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { available: !item.available },
    });
    res.json({ data: updated });
  } catch (err) { next(err); }
}
