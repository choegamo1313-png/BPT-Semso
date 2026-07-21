const express = require('express');
const { pool } = require('./db');
const { requireAuth, requireEditAccess } = require('./authMiddleware');

/* Builds a router backed by one of the generic resource tables.
   GET /            -> list every record (any logged-in user)
   POST /           -> create a record (admin, or an authorized staff/member) */
function resourceRouter(table) {
  const router = express.Router();

  router.get('/', requireAuth, async (req, res) => {
    const { rows } = await pool.query(`SELECT id, data FROM ${table} ORDER BY id ASC`);
    res.json(rows.map(r => ({ id: r.id, ...JSON.parse(r.data) })));
  });

  router.post('/', requireAuth, requireEditAccess, async (req, res) => {
    const data = JSON.stringify(req.body || {});
    const { rows } = await pool.query(
      `INSERT INTO ${table} (data) VALUES ($1) RETURNING id`,
      [data]
    );
    res.status(201).json({ id: rows[0].id, ...req.body });
  });

  return router;
}

module.exports = { resourceRouter };
