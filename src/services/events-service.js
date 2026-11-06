import { supabaseRequest } from '../config/database.js';

const eventFields = 'id,slug,name,category,description,what_you_learn,rules,venue,starts_at,ends_at,min_team_size,max_team_size,prize_amount_paise,is_published,registration_open,created_at,updated_at';

export async function listPublishedEvents() {
  return supabaseRequest(`events?is_published=eq.true&select=${eventFields}&order=starts_at.asc.nullslast`);
}

export async function findPublishedEventBySlug(slug) {
  const rows = await supabaseRequest(`events?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&select=${eventFields}&limit=1`);
  return rows[0] || null;
}

export async function createEvent(event) {
  const rows = await supabaseRequest(`events?select=${eventFields}`, { method: 'POST', body: event });
  return rows[0];
}

export async function updateEventById(id, event) {
  const rows = await supabaseRequest(`events?id=eq.${encodeURIComponent(id)}&select=${eventFields}`, { method: 'PATCH', body: event });
  return rows[0] || null;
}
