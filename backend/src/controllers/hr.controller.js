import { z } from 'zod';
import { prisma } from '../lib/prisma.ts';

export const hrSchema = z.object({
  staffMember:         z.string(),
  shift:               z.enum(['am', 'pm']).optional(),
  recordType:          z.enum(['attendance', 'leave', 'incident', 'salary_change', 'performance']),
  date:                z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  // Attendance
  arrivalTime:         z.string().optional(),
  latenessCategory:    z.enum(['on_time', 'minor', 'moderate', 'severe']).optional(),

  // Leave
  leaveType:           z.enum(['sick', 'casual', 'annual', 'unpaid']).optional(),
  leaveDays:           z.number().int().positive().optional(),
  leaveApproved:       z.boolean().optional(),

  // Incident
  incidentDescription: z.string().optional(),
  incidentType:        z.enum(['customer_complaint', 'breakage', 'cash_shortage', 'misconduct', 'other']).optional(),
  damageCost:          z.number().nonnegative().optional(),
  deductionApplied:    z.number().nonnegative().optional(),
  warningIssued:       z.boolean().optional(),

  // Salary
  salaryBefore:        z.number().nonnegative().optional(),
  incrementType:       z.enum(['merit', 'annual', 'probation_pass', 'other']).optional(),
  salaryAfter:         z.number().nonnegative().optional(),

  // Performance
  performanceRating:   z.number().int().min(1).max(5).optional(),

  // Common
  notes:               z.string().optional(),
  followUpRequired:    z.boolean().optional(),
  followUpDate:        z.string().optional(),
  resolved:            z.boolean().optional(),
});

export async function createHRRecord(req, res, next) {
  try {
    const input = hrSchema.parse(req.body);

    const record = await prisma.hRRecord.create({
      data: {
        ...input,
        date:         new Date(input.date),
        arrivalTime:  input.arrivalTime  ? new Date(`${input.date}T${input.arrivalTime}`) : undefined,
        followUpDate: input.followUpDate ? new Date(input.followUpDate) : undefined,
        loggedBy:     req.user.id,
      },
    });

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

export async function getHRRecords(req, res, next) {
  try {
    const { recordType, staffMember, resolved, limit = 100, offset = 0 } = req.query;
    const where = {};
    if (recordType)   where.recordType  = recordType;
    if (staffMember)  where.staffMember = staffMember;
    if (resolved !== undefined) where.resolved = resolved === 'true';

    const [records, total] = await Promise.all([
      prisma.hRRecord.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: parseInt(offset),
        take: parseInt(limit),
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
      prisma.hRRecord.count({ where }),
    ]);

    res.json({ records, total });
  } catch (err) {
    next(err);
  }
}

export async function getHRByStaff(req, res, next) {
  try {
    const records = await prisma.hRRecord.findMany({
      where: { staffMember: req.params.staffId },
      orderBy: { date: 'desc' },
    });
    res.json(records);
  } catch (err) {
    next(err);
  }
}

export async function updateHRRecord(req, res, next) {
  try {
    const data = hrSchema.partial().parse(req.body);
    if (data.date)         data.date         = new Date(data.date);
    if (data.followUpDate) data.followUpDate = new Date(data.followUpDate);

    const record = await prisma.hRRecord.update({
      where: { id: req.params.id },
      data,
    });

    res.json(record);
  } catch (err) {
    next(err);
  }
}
