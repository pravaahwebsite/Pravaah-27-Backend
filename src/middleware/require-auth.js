import { getFirebaseAuth } from '../config/firebase.js';

export async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ ok: false, error: 'Sign-in required' });
  }

  try {
    // Check revocation because leaked ID tokens can otherwise remain valid
    // until their normal expiry even after their refresh token is revoked.
    const decoded = await getFirebaseAuth().verifyIdToken(match[1], true);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      emailVerified: Boolean(decoded.email_verified),
      fullName: decoded.name || null,
      photoUrl: decoded.picture || null,
    };
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Invalid or expired sign-in token' });
  }
}

