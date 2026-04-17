import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { login, changePin } from '../src/controllers/auth.controller.ts';
import { prisma } from '../src/lib/prisma.ts';

vi.mock('bcryptjs');
vi.mock('jsonwebtoken');
vi.mock('crypto', () => ({
  default: {
    randomBytes: () => ({ toString: () => 'fake-refresh-token' })
  }
}));
vi.mock('../src/lib/prisma.ts', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
    }
  }
}));

describe('Auth Controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('returns 401 on invalid credentials (user not found)', async () => {
      req.body = { role: 'owner', pin: '1234' };
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('returns 401 on incorrect PIN', async () => {
      req.body = { role: 'owner', pin: '1234' };
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: '1', pinHash: 'hash' });
      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid PIN' });
    });

    it('returns tokens on successful login', async () => {
      req.body = { role: 'owner', pin: '1234' };
      const user = { id: '1', name: 'Admin', role: 'owner', pinHash: 'hash' };
      
      vi.mocked(prisma.user.findFirst).mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      vi.mocked(jwt.sign).mockReturnValue('fake-jwt');
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({});

      await login(req, res, next);

      expect(jwt.sign).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        token: 'fake-jwt',
        refreshToken: 'fake-refresh-token',
        user: { id: '1', name: 'Admin', role: 'owner' }
      }));
    });
  });

  describe('changePin', () => {
    it('returns 403 if barista tries to change another users PIN', async () => {
      req.user = { id: 'barista-id', role: 'barista_am' };
      req.body = { targetUserId: 'other-id', currentPin: '1111', newPin: '2222' };

      await changePin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'You can only change your own PIN' });
    });

    it('returns 404 if user not found', async () => {
      req.user = { id: 'owner-id', role: 'owner' };
      req.body = { targetUserId: 'target-id', currentPin: '1111', newPin: '2222' };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await changePin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('updates PIN if valid', async () => {
      req.user = { id: 'owner-id', role: 'owner' };
      req.body = { targetUserId: 'owner-id', currentPin: '1111', newPin: '2222' };
      
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'owner-id', pinHash: 'hash' });
      vi.mocked(bcrypt.compare).mockResolvedValue(true);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hash');

      await changePin(req, res, next);

      expect(bcrypt.hash).toHaveBeenCalledWith('2222', 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'owner-id' },
        data: { pinHash: 'new-hash' }
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'PIN updated successfully' });
    });
  });
});
