import { Router } from 'express';
import { upsertInventory, getInventory } from '../controllers/inventory.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.post('/',          upsertInventory);
router.get('/shift/:id',  getInventory);

export default router;
