import { z } from 'zod';
import { prisma } from '../lib/prisma.ts';

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

export async function upsertInventory(req, res, next) {
  try {
    const { type, ...rest } = req.body;

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
