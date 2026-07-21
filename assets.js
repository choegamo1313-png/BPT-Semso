const express = require('express');
const { pool } = require('./db');
const { requireAuth, requireEditAccess } = require('./authMiddleware');

const router = express.Router();

async function listAll(table) {
  const { rows } = await pool.query(`SELECT id, data FROM ${table} ORDER BY id ASC`);
  return rows.map(r => ({ id: r.id, ...JSON.parse(r.data) }));
}

/* GET /api/assets -> { purchases, replacements, categories } in one call,
   matching what the frontend's loadAllData() expects. */
router.get('/', requireAuth, async (req, res) => {
  res.json({
    purchases: await listAll('assets_purchases'),
    replacements: await listAll('assets_replacements'),
    categories: await listAll('assets_categories')
  });
});

function makeSubRoute(table) {
  router.post(`/${table.replace('assets_', '')}`, requireAuth, requireEditAccess, async (req, res) => {
    const { rows } = await pool.query(
      `INSERT INTO ${table} (data) VALUES ($1) RETURNING id`,
      [JSON.stringify(req.body || {})]
    );
    res.status(201).json({ id: rows[0].id, ...req.body });
  });
}
makeSubRoute('assets_purchases');
makeSubRoute('assets_replacements');
makeSubRoute('assets_categories');

module.exports = router;
