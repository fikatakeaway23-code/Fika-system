import { prisma } from '../lib/prisma.js';

// Shift start times (24h hour)
const SHIFT_START = { am: 8, pm: 14 };

function calcLateness(shiftType, arrivalTime) {
  const start = SHIFT_START[shiftType] ?? 8;
  const arrivalHour = arrivalTime.getHours();
  const arrivalMin  = arrivalTime.getMinutes();
  const minutesLate = (arrivalHour - start) * 60 + arrivalMin;

  if (minutesLate <= 0)  return 'on_time';
  if (minutesLate <= 15) return 'minor';
  if (minutesLate <= 30) return 'moderate';
  return 'severe';
}

export async function checkIn(req, res, next) {
  try {
    const user = req.user;
    const now  = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Determine shift type from role
    const shiftType = user.role === 'barista_am' ? 'am'
                    : user.role === 'barista_pm' ? 'pm'
                    : null;

    // Check if already checked in today
    const existing = await prisma.hRRecord.findFirst({
      where: {
        staffMember: user.id,
        recordType:  'attendance',
        date:        today,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'Already checked in today',
        record: existing,
      });
    }

    const latenessCategory = shiftType ? calcLateness(shiftType, now) : 'on_time';

    const record = await prisma.hRRecord.create({
      data: {
        staffMember:      user.id,
        shift:            shiftType,
        recordType:       'attendance',
        date:             today,
        arrivalTime:      now,
        latenessCategory,
        loggedBy:         user.id,
      },
    });

    res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
}

export async function getMyAttendance(req, res, next) {
  try {
    const { limit = 30 } = req.query;
    const records = await prisma.hRRecord.findMany({
      where: {
        staffMember: req.user.id,
        recordType:  'attendance',
      },
      orderBy: { date: 'desc' },
      take:    parseInt(limit),
    });
    res.json({ data: records });
  } catch (err) {
    next(err);
  }
}
