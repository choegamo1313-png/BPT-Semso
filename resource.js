const express = require('express');
const { db } = require('./db');
const { requireAuth, requireEditAccess } = require('./authMiddleware');

/* Builds a router backed by one of the generic resource tables.
   GET /            -> list every record (any logged-in user)
   POST /           -> create a record (admin, or an authorized staff/member) */
function resourceRouter(table) {
  const router = express.Router();

  router.get('/', requireAuth, (req, res) => {
    const rows = db.prepare(`SELECT id, data FROM ${table} ORDER BY id ASC`).all();
    res.json(rows.map(r => ({ id: r.id, ...JSON.parse(r.data) })));
  });

  router.post('/', requireAuth, requireEditAccess, (req, res) => {
    const data = JSON.stringify(req.body || {});
    const info = db.prepare(`INSERT INTO ${table} (data) VALUES (?)`).run(data);
    res.status(201).json({ id: info.lastInsertRowid, ...req.body });
  });

  return router;
}

module.exports = { resourceRouter };
