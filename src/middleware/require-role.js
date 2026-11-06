import { supabaseRequest } from '../config/database.js';

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user?.uid) {
      return res.status(401).json({ ok: false, error: 'Sign-in required' });
    }

    try {
      const rows = await supabaseRequest(
        `user_roles?firebase_uid=eq.${encodeURIComponent(req.user.uid)}&select=role`,
      );
      const roles = rows.map((row) => row.role);
      if (!roles.some((role) => allowedRoles.includes(role))) {
        return res.status(403).json({ ok: false, error: 'You do not have permission for this action' });
      }
      req.user.roles = roles;
      return next();
    } catch (error) {
      console.error('Role lookup failed:', error.message);
      return res.status(500).json({ ok: false, error: 'Could not verify your permissions' });
    }
  };
}
