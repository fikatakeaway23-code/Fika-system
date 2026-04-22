import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

const SECRET = process.env.JWT_SECRET;

export function authMember(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Member authentication required' });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, SECRET);
    // Member tokens carry accountId + membershipId (not id + role like staff tokens)
    if (!payload.accountId) {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    req.member = { accountId: payload.accountId, membershipId: payload.membershipId };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired member token' });
  }
}

export async function enforceMemberPasswordChange(req, res, next) {
  try {
    const account = await prisma.memberAccount.findUnique({
      where: { id: req.member.accountId },
      select: { mustChangePassword: true },
    });

    if (!account) {
      return res.status(401).json({ error: 'Account not found' });
    }

    if (account.mustChangePassword) {
      return res.status(403).json({ error: 'Password change required' });
    }

    next();
  } catch (err) {
    next(err);
  }
}
