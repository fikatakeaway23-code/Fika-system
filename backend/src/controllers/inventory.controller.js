import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const inventorySchema = z.object({
  shiftId:         z.string(),
  beansOpening:    z.number().nonnegative().optional(),
  beansClosing:    z.number().nonnegative().optional(),
  milkOpening:     z.number().nonnegative().optional(),
  milkClosing:     z.number().nonnegative().optional(),
  syrupsOk:        z.boolean().optional(),
  iceCreamTubs:    z.number().int().nonnegative().optional(),
  bobaOk:          z.boolean().optional(),
  cupsRemaining:   z.number().int().nonnegative().optional(),
  lidsRemaining:   z.number().int().nonnegative().optional(),
  strawsOk:        z.boolean().optional(),
  bakeryRemaining: z.number().int().nonnegative().optional(),
});

const wasteSchema = z.object({
  shiftId:          z.string(),
  calibrationShots: z.number().int().nonnegative().optional(),
  milkWasted:       z.number().nonnegative().optional(),
  remadeDrinks:     z.number().int().nonnegative().optional(),
  unsoldPastries:   z.number().int().nonnegative().optional(),
  notes:            z.string().optional(),
});

const espressoSchema = z.object({
  shiftId:         z.string(),
  dose:            z.number().nonnegative().optional(),
  yield:           z.number().nonnegative().optional(),
  extractionTime:  z.number().int().nonnegative().optional(),
  tasteAssessment: z.enum(['sour', 'balanced', 'bitter', 'flat']).optional(),
});

async function getAccessibleShift(shiftId, user) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { id: true, userId: true, status: true },
  });

  if (!shift) {
    return { error: { status: 404, body: { error: 'Shift not found' } } };
  }

  if (user.role !== 'owner' && shift.userId !== user.id) {
    return { error: { status: 403, body: { error: 'Access denied' } } };
  }

  if (user.role !== 'owner' && shift.status === 'submitted') {
    return {
      error: {
        status: 400,
        body: { error: 'Cannot edit records for a submitted shift' },
      },
    };
  }

  return { shift };
}

export async function upsertInventory(req, res, next) {
  try {
    const { type, ...rest } = req.body;
    const shiftId = rest.shiftId;

    if (!shiftId) {
      return res.status(400).json({ error: 'shiftId is required' });
    }

    const access = await getAccessibleShift(shiftId, req.user);
    if (access.error) {
      return res.status(access.error.status).json(access.error.body);
    }

    if (type === 'waste') {
      const data = wasteSchema.parse(rest);
      const record = await prisma.wasteLog.upsert({
        where: { shiftId: data.shiftId },
        update: data,
        create: data,
      });
      return res.json(record);
    }

    if (type === 'espresso') {
      const data = espressoSchema.parse(rest);
      const record = await prisma.espressoLog.upsert({
        where: { shiftId: data.shiftId },
        update: data,
        create: data,
      });
      return res.json(record);
    }

    // Default: inventory log
    const data = inventorySchema.parse(rest);
    const record = await prisma.inventoryLog.upsert({
      where: { shiftId: data.shiftId },
      update: data,
      create: data,
    });
    res.json(record);
  } catch (err) {
    next(err);
  }
}

export async function getInventory(req, res, next) {
  try {
    const { id } = req.params;
    const shift = await prisma.shift.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    if (req.user.role !== 'owner' && shift.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [inventory, waste, espresso] = await Promise.all([
      prisma.inventoryLog.findUnique({ where: { shiftId: id } }),
      prisma.wasteLog.findUnique({ where: { shiftId: id } }),
      prisma.espressoLog.findUnique({ where: { shiftId: id } }),
    ]);
    res.json({ inventory, waste, espresso });
  } catch (err) {
    next(err);
  }
}
