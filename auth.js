const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');
const { requireAuth, requireAdmin, SECRET } = require('./authMiddleware');

const router = express.Router();

/* POST /api/auth/login
   Checks the submitted username/password against the hashed password
   stored in the database (never compared or stored in plain text) and,
   on success, issues a signed session token. */
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const { rows } = await pool.query(`SELECT * FROM users WHERE username = $1`, [username]);
  const user = rows[0];
  if (!user || user.status !== 'active') {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const payload = {
    id: user.id,
    role: user.role,
    authorized: !!user.authorized,
    name: user.name,
    username: user.username,
    refId: user.ref_id
  };
  const token = jwt.sign(payload, SECRET, { expiresIn: '12h' });
  res.json({ token, ...payload });
});

/* POST /api/auth/admin  (admin only)
   Changes the admin's own username/password. Requires the caller to
   already be authenticated as an admin. */
router.post('/admin', requireAuth, requireAdmin, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username cannot be empty.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const { rows: clash } = await pool.query(
    `SELECT id FROM users WHERE username = $1 AND id != $2`,
    [username.trim(), req.user.id]
  );
  if (clash[0]) {
    return res.status(409).json({ error: 'That username is already in use.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  await pool.query(
    `UPDATE users SET username = $1, password_hash = $2 WHERE id = $3`,
    [username.trim(), hash, req.user.id]
  );

  res.json({ ok: true, username: username.trim() });
});

module.exports = router;
