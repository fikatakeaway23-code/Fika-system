import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const SECRET = process.env.JWT_SECRET as string;

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      member?: {
        accountId: string;
        membershipId: string;
      };
    }
  }
}

interface MemberPayload extends JwtPayload {
  accountId?: string;
  membershipId?: string;
}

export function authMember(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Member authentication required' });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, SECRET) as MemberPayload;
    // Member tokens carry accountId + membershipId (not id + role like staff tokens)
    if (!payload.accountId || !payload.membershipId) {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    req.member = { accountId: payload.accountId, membershipId: payload.membershipId };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired member token' });
  }
}
