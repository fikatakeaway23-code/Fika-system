import { Router } from 'express';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';
import { getAnnouncements, getAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcement.controller.js';

const router = Router();

router.get('/',     authenticate, getAnnouncements);
router.get('/all',  authenticate, requireOwner, getAllAnnouncements);
router.post('/',    authenticate, requireOwner, createAnnouncement);
router.put('/:id',  authenticate, requireOwner, updateAnnouncement);
router.delete('/:id', authenticate, requireOwner, deleteAnnouncement);

export default router;
