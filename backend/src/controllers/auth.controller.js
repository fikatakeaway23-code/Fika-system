import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const loginSchema = z.object({
  role: z.enum(['barista_am', 'barista_pm', 'owner']),
  pin: z.string().length(4).regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

const changePinSchema = z.object({
  targetUserId: z.string(),
  currentPin: z.string().length(4).regex(/^\d{4}$/),
  newPin: z.string().length(4).regex(/^\d{4}$/),
});

export async function login(req, res, next) {
  try {
    const { role, pin } = loginSchema.parse(req.body);

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
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '8h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

export async function changePin(req, res, next) {
  try {
    // Only owner can change any PIN; baristas can only change their own
    const requestingUser = req.user;

    const { targetUserId, currentPin, newPin } = changePinSchema.parse(req.body);

    if (requestingUser.role !== 'owner' && requestingUser.id !== targetUserId) {
      return res.status(403).json({ error: 'You can only change your own PIN' });
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Owner can bypass current PIN check when resetting others
    if (requestingUser.id === targetUserId) {
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
