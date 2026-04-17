import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { Request, Response, NextFunction } from 'express';

const loginSchema = z.object({
  role: z.enum(['barista_am', 'barista_pm', 'owner']),
  pin: z.string().length(4).regex(/^\d{4}$/, 'PIN must be 4 digits'),
  pushToken: z.string().optional(),
});

const changePinSchema = z.object({
  targetUserId: z.string(),
  currentPin: z.string().length(4).regex(/^\d{4}$/),
  newPin: z.string().length(4).regex(/^\d{4}$/),
});

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { role, pin, pushToken } = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({ where: { role } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) {
      // Consistent timing to prevent enumeration
      await bcrypt.compare('0000', user.pinHash);
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_EXPIRY || '8h') as any }
    );

    // Generate refresh token (7-day expiry, one-time use)
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { token: rawRefreshToken, userId: user.id, expiresAt: refreshExpiresAt },
    });

    // Store push token if provided (mobile clients)
    if (pushToken) {
      await prisma.user.update({ where: { id: user.id }, data: { pushToken } });
    }

    res.json({
      token,
      refreshToken: rawRefreshToken,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

export async function changePin(req: Request, res: Response, next: NextFunction) {
  try {
    // Only owner can change any PIN; baristas can only change their own
    const requestingUser = req.user;

    const { targetUserId, currentPin, newPin } = changePinSchema.parse(req.body);

    if (requestingUser?.role !== 'owner' && requestingUser?.id !== targetUserId) {
      return res.status(403).json({ error: 'You can only change your own PIN' });
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Owner can bypass current PIN check when resetting others
    if (requestingUser?.id === targetUserId) {
      const valid = await bcrypt.compare(currentPin, user.pinHash);
      if (!valid) {
        return res.status(401).json({ error: 'Current PIN is incorrect' });
      }
    }

    const pinHash = await bcrypt.hash(newPin, 12);
    await prisma.user.update({ where: { id: targetUserId }, data: { pinHash } });

    res.json({ message: 'PIN updated successfully' });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: raw } = req.body;
    if (!raw) return res.status(400).json({ error: 'refreshToken required' });

    const stored = await prisma.refreshToken.findUnique({ where: { token: raw } });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { token: raw } });
      return res.status(401).json({ error: 'Refresh token expired or invalid' });
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Rotate: delete old, create new
    await prisma.refreshToken.delete({ where: { token: raw } });
    const newRaw = crypto.randomBytes(40).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { token: newRaw, userId: user.id, expiresAt: newExpiresAt },
    });

    const newAccessToken = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_EXPIRY || '8h') as any }
    );

    res.json({ token: newAccessToken, refreshToken: newRaw });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: raw } = req.body;
    if (raw) {
      await prisma.refreshToken.deleteMany({ where: { token: raw } });
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}
