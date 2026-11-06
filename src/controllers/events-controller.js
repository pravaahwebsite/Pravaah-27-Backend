import { z } from 'zod';
import { createEvent as saveEvent, findPublishedEventBySlug, listPublishedEvents as loadPublishedEvents, updateEventById } from '../services/events-service.js';

const eventSchema = z.object({
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  description: z.string().max(10000).optional(),
  what_you_learn: z.string().max(5000).optional(),
  rules: z.array(z.string().max(1000)).max(100).optional(),
  venue: z.string().max(250).nullable().optional(),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
  min_team_size: z.number().int().min(1).max(100).optional(),
  max_team_size: z.number().int().min(1).max(100).optional(),
  prize_amount_paise: z.number().int().nonnegative().nullable().optional(),
  is_published: z.boolean().optional(),
  registration_open: z.boolean().optional(),
}).strict();

export async function listPublishedEvents(_req, res) {
  try {
    const events = await loadPublishedEvents();
    return res.status(200).json({ ok: true, events });
  } catch (error) {
    console.error('Events list failed:', error.message);
    return res.status(500).json({ ok: false, error: 'Could not load events' });
  }
}

export async function getPublishedEvent(req, res) {
  try {
    const event = await findPublishedEventBySlug(req.params.slug);
    if (!event) return res.status(404).json({ ok: false, error: 'Event not found' });
    return res.status(200).json({ ok: true, event });
  } catch (error) {
    console.error('Event lookup failed:', error.message);
    return res.status(500).json({ ok: false, error: 'Could not load event' });
  }
}

export async function createEvent(req, res) {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'Invalid event data', details: parsed.error.issues });
  const event = parsed.data;
  if (event.min_team_size && event.max_team_size && event.max_team_size < event.min_team_size) {
    return res.status(400).json({ ok: false, error: 'max_team_size must be at least min_team_size' });
  }
  try {
    const saved = await saveEvent(event);
    return res.status(201).json({ ok: true, event: saved });
  } catch (error) {
    if (error.message.includes('23505')) return res.status(409).json({ ok: false, error: 'An event with that slug already exists' });
    console.error('Event create failed:', error.message);
    return res.status(500).json({ ok: false, error: 'Could not create event' });
  }
}

export async function updateEvent(req, res) {
  const parsed = eventSchema.partial().safeParse(req.body);
  if (!parsed.success || !Object.keys(req.body || {}).length) {
    return res.status(400).json({ ok: false, error: 'Invalid event update', details: parsed.success ? undefined : parsed.error.issues });
  }
  const event = parsed.data;
  if (event.min_team_size && event.max_team_size && event.max_team_size < event.min_team_size) {
    return res.status(400).json({ ok: false, error: 'max_team_size must be at least min_team_size' });
  }
  try {
    const saved = await updateEventById(req.params.id, event);
    if (!saved) return res.status(404).json({ ok: false, error: 'Event not found' });
    return res.status(200).json({ ok: true, event: saved });
  } catch (error) {
    console.error('Event update failed:', error.message);
    return res.status(500).json({ ok: false, error: 'Could not update event' });
  }
}
