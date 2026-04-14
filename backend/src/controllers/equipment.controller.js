import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const equipmentSchema = z.object({
  equipment:      z.string().min(1),
  issue:          z.string().min(1),
  status:         z.enum(['open','in_progress','resolved']).optional(),
  repairCost:     z.number().optional().nullable(),
  technicianName: z.string().optional().nullable(),
  notes:          z.string().optional().nullable(),
  resolvedAt:     z.string().optional().nullable(),
  resolvedBy:     z.string().optional().nullable(),
});

export async function getEquipmentLogs(req, res, next) {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const logs = await prisma.equipmentLog.findMany({
      where,
      orderBy: [{ status: 'asc' }, { reportedAt: 'desc' }],
    });
    res.json({ data: logs });
  } catch (err) { next(err); }
}

export async function createEquipmentLog(req, res, next) {
  try {
    const data = equipmentSchema.parse(req.body);
    const log = await prisma.equipmentLog.create({
      data: {
        ...data,
        reportedBy: req.user.id,
        resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : null,
      },
    });
    res.status(201).json({ data: log });
  } catch (err) { next(err); }
}

export async function updateEquipmentLog(req, res, next) {
  try {
    const data = equipmentSchema.partial().parse(req.body);
    const updateData = { ...data };
    if (data.resolvedAt !== undefined) updateData.resolvedAt = data.resolvedAt ? new Date(data.resolvedAt) : null;
    if (data.status === 'resolved' && !updateData.resolvedAt) {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = req.user.id;
    }
    const log = await prisma.equipmentLog.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ data: log });
  } catch (err) { next(err); }
}

export async function deleteEquipmentLog(req, res, next) {
  try {
    await prisma.equipmentLog.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
