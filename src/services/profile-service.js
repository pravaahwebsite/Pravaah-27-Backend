import { supabaseRequest } from '../config/database.js';

const profileFields = 'firebase_uid,email,email_verified,full_name,phone,college,photo_url,created_at,updated_at';

export async function syncFirebaseProfile(user) {
  const rows = await supabaseRequest(`profiles?on_conflict=firebase_uid&select=${profileFields}`, {
    method: 'POST',
    body: {
      firebase_uid: user.uid,
      email: user.email,
      email_verified: user.emailVerified,
      full_name: user.fullName,
      photo_url: user.photoUrl,
    },
  });
  return rows[0];
}

export async function findProfile(uid) {
  const rows = await supabaseRequest(`profiles?firebase_uid=eq.${encodeURIComponent(uid)}&select=${profileFields}`);
  return rows[0] || null;
}

export async function updateProfile(uid, updates) {
  const rows = await supabaseRequest(`profiles?firebase_uid=eq.${encodeURIComponent(uid)}&select=${profileFields}`, {
    method: 'PATCH',
    body: { ...updates, updated_at: new Date().toISOString() },
  });
  return rows[0] || null;
}
