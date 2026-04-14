import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const announcementSchema = z.object({
  title:     z.string().min(1),
  body:      z.string().min(1),
  priority:  z.enum(['normal','important','urgent']).optional(),
  pinned:    z.boolean().optional(),
  expiresAt: z.string().optional().nullable(),
});

export async function getAnnouncements(req, res, next) {
  try {
    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: [{ pinned: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ data: announcements });
  } catch (err) { next(err); }
}

export async function getAllAnnouncements(req, res, next) {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json({ data: announcements });
  } catch (err) { next(err); }
}

export async function createAnnouncement(req, res, next) {
  try {
    const data = announcementSchema.parse(req.body);
    const announcement = await prisma.announcement.create({
      data: {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy: req.user.id,
      },
    });
    res.status(201).json({ data: announcement });
  } catch (err) { next(err); }
}

export async function updateAnnouncement(req, res, next) {
  try {
    const data = announcementSchema.partial().parse(req.body);
    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: {
        ...data,
        expiresAt: data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : undefined,
      },
    });
    res.json({ data: announcement });
  } catch (err) { next(err); }
}

export async function deleteAnnouncement(req, res, next) {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
}
