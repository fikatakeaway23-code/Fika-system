import jwt from 'jsonwebtoken';

/**
 * Verifies JWT from Authorization header.
 * Attaches decoded user payload to req.user.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
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
export function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }
  next();
}

/**
 * Restricts access to baristas and owner (any authenticated user).
 */
export function requireBarista(req, res, next) {
  const allowedRoles = ['barista_am', 'barista_pm', 'owner'];
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}
