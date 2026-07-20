const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Copy .env.example to .env and set a real secret.');
  process.exit(1);
}

/* Requires a valid login token. Attaches the decoded user to req.user. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in.' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

/* Requires the logged-in user to be an admin. */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

/* Requires the user to be allowed to make changes: an admin, or a
   staff/member account an admin has explicitly authorized. This is the
   server-side enforcement of the same rule the frontend UI hints at —
   the difference is this one can't be bypassed from the browser console. */
function requireEditAccess(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not logged in.' });
  if (req.user.role === 'admin' || req.user.authorized) return next();
  return res.status(403).json({ error: 'Your account is view-only. Ask an admin to authorize edits.' });
}

module.exports = { requireAuth, requireAdmin, requireEditAccess, SECRET };
