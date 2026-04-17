import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        role: string;
      };
    }
  }
}

interface StaffPayload extends JwtPayload {
  id?: string;
  name?: string;
  role?: string;
}

/**
 * Verifies JWT from Authorization header.
 * Attaches decoded user payload to req.user.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as StaffPayload;
    if (payload.id && payload.name && payload.role) {
      req.user = { id: payload.id, name: payload.name, role: payload.role };
    }
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Restricts access to owner role only.
 * Must be used after authenticate().
 */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }
  next();
}

/**
 * Restricts access to baristas and owner (any authenticated user).
 */
export function requireBarista(req: Request, res: Response, next: NextFunction) {
  const allowedRoles = ['barista_am', 'barista_pm', 'owner'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}
