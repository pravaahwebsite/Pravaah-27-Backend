import { findProfile, syncFirebaseProfile, updateProfile } from '../services/profile-service.js';

export async function syncProfile(req, res) {
  if (!req.user.email) return res.status(400).json({ ok: false, error: 'Your Firebase account must have an email address' });
  try {
    const profile = await syncFirebaseProfile(req.user);
    return res.status(200).json({ ok: true, profile });
  } catch (error) {
    if (error.message.includes('23505')) return res.status(409).json({ ok: false, error: 'This email is already linked to another profile' });
    console.error('Profile sync failed:', error.message);
    return res.status(500).json({ ok: false, error: 'Could not sync your profile' });
  }
}

export async function getMyProfile(req, res) {
  try {
    const profile = await findProfile(req.user.uid);
    if (!profile) return res.status(404).json({ ok: false, error: 'Profile not found; call POST /api/profile/sync after sign-in' });
    return res.status(200).json({ ok: true, profile });
  } catch (error) {
    console.error('Profile lookup failed:', error.message);
    return res.status(500).json({ ok: false, error: 'Could not load your profile' });
  }
}

export async function updateMyProfile(req, res) {
  const allowed = ['fullName', 'phone', 'college', 'photoUrl'];
  const supplied = Object.keys(req.body || {});
  if (!supplied.length || supplied.some((key) => !allowed.includes(key))) {
    return res.status(400).json({ ok: false, error: 'Send only fullName, phone, college, or photoUrl' });
  }
  const limits = { fullName: 120, phone: 30, college: 160, photoUrl: 2048 };
  const columns = { fullName: 'full_name', phone: 'phone', college: 'college', photoUrl: 'photo_url' };
  const body = {};
  for (const key of supplied) {
    const value = req.body[key];
    if (value !== null && typeof value !== 'string') return res.status(400).json({ ok: false, error: `${key} must be a string or null` });
    const normalized = typeof value === 'string' ? value.trim() : null;
    if (normalized && normalized.length > limits[key]) return res.status(400).json({ ok: false, error: `${key} is too long` });
    body[columns[key]] = normalized || null;
  }
  try {
    const profile = await updateProfile(req.user.uid, body);
    if (!profile) return res.status(404).json({ ok: false, error: 'Profile not found; call POST /api/profile/sync after sign-in' });
    return res.status(200).json({ ok: true, profile });
  } catch (error) {
    console.error('Profile update failed:', error.message);
    return res.status(500).json({ ok: false, error: 'Could not update your profile' });
  }
}
