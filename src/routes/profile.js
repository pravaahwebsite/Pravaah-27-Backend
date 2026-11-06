import { Router } from 'express';
import { getMyProfile, syncProfile, updateMyProfile } from '../controllers/profile-controller.js';
import { requireAuth } from '../middleware/require-auth.js';

const router = Router();
router.post('/sync', requireAuth, syncProfile);
router.get('/me', requireAuth, getMyProfile);
router.patch('/me', requireAuth, updateMyProfile);

export default router;
