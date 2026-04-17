import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate, requireOwner, requireBarista } from '../src/middleware/auth.middleware.ts';

vi.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('authenticate', () => {
    it('returns 401 if no authorization header', () => {
      authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 if header does not start with Bearer', () => {
      req.headers.authorization = 'Basic token';
      authenticate(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing or invalid Authorization header' });
    });

    it('calls next and attaches user on valid token', () => {
      req.headers.authorization = 'Bearer valid-token';
      const payload = { id: '1', name: 'Test', role: 'owner' };
      vi.mocked(jwt.verify).mockReturnValue(payload);

      authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(req.user).toEqual(payload);
      expect(next).toHaveBeenCalled();
    });

    it('returns 401 with specific message on expired token', () => {
      req.headers.authorization = 'Bearer expired-token';
      const error = new Error('Expired');
      error.name = 'TokenExpiredError';
      vi.mocked(jwt.verify).mockImplementation(() => { throw error; });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token expired. Please log in again.' });
    });

    it('returns 401 on invalid token', () => {
      req.headers.authorization = 'Bearer invalid-token';
      vi.mocked(jwt.verify).mockImplementation(() => { throw new Error('Invalid'); });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });
  });

  describe('requireOwner', () => {
    it('calls next if user is owner', () => {
      req.user = { role: 'owner' };
      requireOwner(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('returns 403 if user is not owner', () => {
      req.user = { role: 'barista_am' };
      requireOwner(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Owner access required' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireBarista', () => {
    it('calls next if user is barista or owner', () => {
      ['barista_am', 'barista_pm', 'owner'].forEach((role) => {
        req.user = { role };
        const localNext = vi.fn();
        requireBarista(req, res, localNext);
        expect(localNext).toHaveBeenCalled();
      });
    });

    it('returns 403 if user is none of the allowed roles', () => {
      req.user = { role: 'customer' };
      requireBarista(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
