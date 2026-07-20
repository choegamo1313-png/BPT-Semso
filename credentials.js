const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const { requireAuth, requireAdmin } = require('./authMiddleware');

const router = express.Router();

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function toSafeShape(row) {
  // Never send password_hash to the browser.
  return {
    id: row.id,
    name: row.name,
    type: row.role === 'staff' ? 'Staff' : 'Member',
    refId: row.ref_id,
    username: row.username,
    issued: row.issued,
    status: row.status,
    authorized: !!row.authorized
  };
}

/* GET /api/credentials  (admin only) — list issued logins, no password data. */
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(`SELECT * FROM users WHERE role IN ('member','staff') ORDER BY id DESC`).all();
  res.json(rows.map(toSafeShape));
});

/* POST /api/credentials  (admin only)
   Issues a new member/staff login. The generated password is returned
   ONCE in this response so the admin can hand it to the person — after
   this, only its hash is stored and it can never be retrieved again. */
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name, type, refId, username } = req.body || {};
  if (!name || !username) {
    return res.status(400).json({ error: 'Name and username are required.' });
  }
  const role = type === 'Staff' ? 'staff' : 'member';
  const password = generatePassword();
  const hash = bcrypt.hashSync(password, 10);
  const issued = new Date().toISOString().slice(0, 10);

  try {
    const info = db.prepare(`
      INSERT INTO users (role, username, password_hash, name, ref_id, status, authorized, issued)
      VALUES (?, ?, ?, ?, ?, 'active', 0, ?)
    `).run(role, username.trim(), hash, name, refId || null, issued);

    const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json({ ...toSafeShape(row), password }); // password included only in this one response
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }
    throw err;
  }
});

/* POST /api/credentials/authorize  (admin only) — grant/revoke edit access. */
router.post('/authorize', requireAuth, requireAdmin, (req, res) => {
  const { id, authorized } = req.body || {};
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: 'Account not found.' });
  db.prepare(`UPDATE users SET authorized = ? WHERE id = ?`).run(authorized ? 1 : 0, id);
  res.json(toSafeShape(db.prepare(`SELECT * FROM users WHERE id = ?`).get(id)));
});

/* POST /api/credentials/status  (admin only) — active/revoked toggle. */
router.post('/status', requireAuth, requireAdmin, (req, res) => {
  const { id, status } = req.body || {};
  if (!['active', 'revoked'].includes(status)) {
    return res.status(400).json({ error: 'Status must be active or revoked.' });
  }
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: 'Account not found.' });
  db.prepare(`UPDATE users SET status = ? WHERE id = ?`).run(status, id);
  res.json(toSafeShape(db.prepare(`SELECT * FROM users WHERE id = ?`).get(id)));
});

/* POST /api/credentials/reset  (admin only) — issues a new password, shown once. */
router.post('/reset', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.body || {};
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: 'Account not found.' });
  const password = generatePassword();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, id);
  res.json({ ...toSafeShape({ ...row, password_hash: hash }), password });
});

module.exports = router;
