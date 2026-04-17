import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET;

export async function memberLogin(req, res, next) {
  try {
    const schema = z.object({
      email:    z.string().email(),
      password: z.string().min(1),
    });
    const { email, password } = schema.parse(req.body);

    const account = await prisma.memberAccount.findUnique({
      where:   { email },
      include: { membership: true },
    });

    if (!account) return res.status(401).json({ error: 'Invalid credentials' });
    if (account.membership.status !== 'active') {
      return res.status(403).json({ error: 'Membership is not active' });
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await prisma.memberAccount.update({
      where: { id: account.id },
      data:  { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      { accountId: account.id, membershipId: account.membershipId },
      SECRET,
      { expiresIn: '24h' }
    );

    const { passwordHash, ...accountSafe } = account;
    res.json({ token, mustChangePassword: account.mustChangePassword, account: accountSafe });
  } catch (err) {
    next(err);
  }
}

export async function getMemberMe(req, res, next) {
  try {
    const account = await prisma.memberAccount.findUnique({
      where:   { id: req.member.accountId },
      include: { membership: true },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const { passwordHash, ...safe } = account;
    res.json(safe);
  } catch (err) {
    next(err);
  }
}

export async function changeMemberPassword(req, res, next) {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(8),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);

    const account = await prisma.memberAccount.findUnique({
      where: { id: req.member.accountId },
    });
    const valid = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.memberAccount.update({
      where: { id: account.id },
      data:  { passwordHash, mustChangePassword: false },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function createMemberAccount(req, res, next) {
  try {
    const { id } = req.params; // membershipId
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);

    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    const existing = await prisma.memberAccount.findUnique({ where: { membershipId: id } });
    if (existing) {
      return res.status(409).json({ error: 'Portal account already exists for this membership' });
    }

    // 8-char uppercase hex temp password — easy to read aloud
    const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const account = await prisma.memberAccount.create({
      data: { email, passwordHash, membershipId: id },
    });

    res.status(201).json({
      account:      { id: account.id, email: account.email },
      tempPassword, // shown once — owner shares with client
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteMemberAccount(req, res, next) {
  try {
    const { id } = req.params; // membershipId
    const account = await prisma.memberAccount.findUnique({ where: { membershipId: id } });
    if (!account) return res.status(404).json({ error: 'No portal account for this membership' });
    await prisma.memberAccount.delete({ where: { membershipId: id } });
    res.json({ message: 'Portal access revoked' });
  } catch (err) {
    next(err);
  }
}
