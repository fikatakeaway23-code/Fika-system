import { Router } from 'express';
import { login, changePin } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/auth/login  — PIN login, returns JWT
router.post('/login', login);

// POST /api/auth/change-pin  — change any user's PIN (owner only)
router.post('/change-pin', authenticate, changePin);

export default router;
