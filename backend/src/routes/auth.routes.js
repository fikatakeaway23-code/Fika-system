import { Router } from 'express';
import { login, changePin, refreshToken, logout } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/auth/login  — PIN login, returns JWT + refresh token
router.post('/login', login);

// POST /api/auth/change-pin  — change any user's PIN (owner only)
router.post('/change-pin', authenticate, changePin);

// POST /api/auth/refresh  — exchange refresh token for new JWT
router.post('/refresh', refreshToken);

// POST /api/auth/logout  — revoke refresh token
router.post('/logout', logout);

export default router;
