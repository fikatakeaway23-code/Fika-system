import { Router } from 'express';
import {
  memberLogin,
  getMemberMe,
  changeMemberPassword,
} from '../controllers/memberAuth.controller.js';
import { authMember } from '../middleware/authMember.middleware.js';

const router = Router();

router.post('/auth/login',            memberLogin);
router.get('/auth/me',    authMember, getMemberMe);
router.patch('/auth/change-password', authMember, changeMemberPassword);

export default router;
