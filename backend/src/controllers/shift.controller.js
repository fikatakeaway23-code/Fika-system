import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const createShiftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftType: z.enum(['am', 'pm']),
  openingFloat: z.number().nonnegative().optional(),
});

const updateShiftSchema = z.object({
  openingFloat:    z.number().nonnegative().optional(),
  cashSales:       z.number().nonnegative().optional(),
  digitalSales:    z.number().nonnegative().optional(),
  closingCash:     z.number().nonnegative().optional(),
  drinksCount:     z.number().int().nonnegative().optional(),
  popularDrink:    z.string().optional(),
  pastriesSold:    z.number().int().nonnegative().optional(),
  openingPhoto:    z.string().optional(),
  closingPhoto:    z.string().optional(),
  equipmentIssue:  z.boolean().optional(),
  equipmentNotes:  z.string().optional(),
  complaintFlag:   z.boolean().optional(),
  complaintNotes:  z.string().optional(),
  shiftNotes:      z.string().optional(),
});

export async function createShift(req, res, next) {
  try {
    const { date, shiftType, openingFloat } = createShiftSchema.parse(req.body);

    const shift = await prisma.shift.create({
      data: {
        userId:       req.user.id,
        date:         new Date(date),
        shiftType,
        openingFloat,
        status:       'in_progress',
      },
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    res.status(201).json(shift);
  } catch (err) {
    next(err);
  }
}

export async function getShifts(req, res, next) {
  try {
    const { limit = 50, offset = 0, date, userId } = req.query;

    const where = {};
    if (req.user.role !== 'owner') where.userId = req.user.id;
    if (userId && req.user.role === 'owner') where.userId = userId;
    if (date) where.date = new Date(date);

    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        orderBy: [{ date: 'desc' }, { shiftType: 'asc' }],
        skip: parseInt(offset),
        take: parseInt(limit),
        include: {
          user:         { select: { id: true, name: true, role: true } },
          inventoryLog: true,
          wasteLog:     true,
          espressoLog:  true,
        },
      }),
      prisma.shift.count({ where }),
    ]);

    res.json({ shifts, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    next(err);
  }
}

export async function getShiftByDate(req, res, next) {
  try {
    const { date } = req.params;
    const shifts = await prisma.shift.findMany({
      where: { date: new Date(date) },
      include: {
        user:         { select: { id: true, name: true, role: true } },
        inventoryLog: true,
        wasteLog:     true,
        espressoLog:  true,
      },
    });
    res.json(shifts);
  } catch (err) {
    next(err);
  }
}

export async function getShiftById(req, res, next) {
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: req.params.id },
      include: {
        user:         { select: { id: true, name: true, role: true } },
        inventoryLog: true,
        wasteLog:     true,
        espressoLog:  true,
      },
    });

    if (!shift) return res.status(404).json({ error: 'Shift not found' });

    // Baristas can only see their own shifts
    if (req.user.role !== 'owner' && shift.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(shift);
  } catch (err) {
    next(err);
  }
}

export async function updateShift(req, res, next) {
  try {
    const data = updateShiftSchema.parse(req.body);

    const existing = await prisma.shift.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Shift not found' });

    if (req.user.role !== 'owner' && existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existing.status === 'submitted' && req.user.role !== 'owner') {
      return res.status(400).json({ error: 'Cannot edit a submitted shift' });
    }

    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data,
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    res.json(shift);
  } catch (err) {
    next(err);
  }
}

export async function submitShift(req, res, next) {
  try {
    const existing = await prisma.shift.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Shift not found' });

    if (req.user.role !== 'owner' && existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (existing.status === 'submitted') {
      return res.status(400).json({ error: 'Shift already submitted' });
    }

    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: { status: 'submitted', submittedAt: new Date() },
      include: {
        user:         { select: { id: true, name: true, role: true } },
        inventoryLog: true,
        wasteLog:     true,
        espressoLog:  true,
      },
    });

    res.json(shift);
  } catch (err) {
    next(err);
  }
}
