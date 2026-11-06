import { Router } from 'express';
import { createEvent, getPublishedEvent, listPublishedEvents, updateEvent } from '../controllers/events-controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireRole } from '../middleware/require-role.js';

const router = Router();
router.get('/', listPublishedEvents);
router.get('/:slug', getPublishedEvent);
router.post('/', requireAuth, requireRole('Admin', 'SuperAdmin'), createEvent);
router.patch('/:id', requireAuth, requireRole('Admin', 'SuperAdmin'), updateEvent);

export default router;
