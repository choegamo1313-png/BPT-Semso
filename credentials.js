const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');
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
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE role IN ('member','staff') ORDER BY id DESC`
  );
  res.json(rows.map(toSafeShape));
});

/* POST /api/credentials  (admin only)
   Issues a new member/staff login. The generated password is returned
   ONCE in this response so the admin can hand it to the person — after
   this, only its hash is stored and it can never be retrieved again. */
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, type, refId, username } = req.body || {};
  if (!name || !username) {
    return res.status(400).json({ error: 'Name and username are required.' });
  }
  const role = type === 'Staff' ? 'staff' : 'member';
  const password = generatePassword();
  const hash = bcrypt.hashSync(password, 10);
  const issued = new Date().toISOString().slice(0, 10);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (role, username, password_hash, name, ref_id, status, authorized, issued)
       VALUES ($1, $2, $3, $4, $5, 'active', 0, $6)
       RETURNING *`,
      [role, username.trim(), hash, name, refId || null, issued]
    );
    res.status(201).json({ ...toSafeShape(rows[0]), password }); // password included only in this one response
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'That username is already taken.' });
    }
    throw err;
  }
});

/* POST /api/credentials/authorize  (admin only) — grant/revoke edit access. */
router.post('/authorize', requireAuth, requireAdmin, async (req, res) => {
  const { id, authorized } = req.body || {};
  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Account not found.' });
  const { rows: updated } = await pool.query(
    `UPDATE users SET authorized = $1 WHERE id = $2 RETURNING *`,
    [authorized ? 1 : 0, id]
  );
  res.json(toSafeShape(updated[0]));
});

/* POST /api/credentials/status  (admin only) — active/revoked toggle. */
router.post('/status', requireAuth, requireAdmin, async (req, res) => {
  const { id, status } = req.body || {};
  if (!['active', 'revoked'].includes(status)) {
    return res.status(400).json({ error: 'Status must be active or revoked.' });
  }
  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Account not found.' });
  const { rows: updated } = await pool.query(
    `UPDATE users SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  res.json(toSafeShape(updated[0]));
});

/* POST /api/credentials/reset  (admin only) — issues a new password, shown once. */
router.post('/reset', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.body || {};
  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Account not found.' });
  const password = generatePassword();
  const hash = bcrypt.hashSync(password, 10);
  const { rows: updated } = await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *`,
    [hash, id]
  );
  res.json({ ...toSafeShape(updated[0]), password });
});

module.exports = router;
