import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const saveSchema = z.object({
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftType:     z.enum(['am', 'pm']),
  checklistType: z.enum(['opening', 'closing']),
  items:         z.record(z.boolean()),
});

export async function saveChecklist(req, res, next) {
  try {
    const parsed = saveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() });
    }

    const { date, shiftType, checklistType, items } = parsed.data;
    const dateObj = new Date(date);

    const record = await prisma.checklistCompletion.upsert({
      where: {
        date_shiftType_checklistType_completedBy: {
          date:          dateObj,
          shiftType,
          checklistType,
          completedBy:   req.user.id,
        },
      },
      update:  { items, submittedAt: new Date() },
      create:  { date: dateObj, shiftType, checklistType, completedBy: req.user.id, items },
    });

    res.json({ data: record });
  } catch (err) {
    next(err);
  }
}

export async function getChecklist(req, res, next) {
  try {
    const { date, shiftType, checklistType } = req.query;

    const record = await prisma.checklistCompletion.findFirst({
      where: {
        date:          date ? new Date(date) : undefined,
        shiftType:     shiftType || undefined,
        checklistType: checklistType || undefined,
        completedBy:   req.user.id,
      },
    });

    res.json({ data: record });
  } catch (err) {
    next(err);
  }
}

export async function getChecklistHistory(req, res, next) {
  try {
    const rawLimit = parseInt(req.query.limit, 10);
    const take = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

    const records = await prisma.checklistCompletion.findMany({
      where:   { completedBy: req.user.id },
      orderBy: { submittedAt: 'desc' },
      take,
    });
    res.json({ data: records });
  } catch (err) {
    next(err);
  }
}
