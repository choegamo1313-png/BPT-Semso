const express = require('express');
const { db } = require('../db');
const { requireAuth, requireEditAccess } = require('../middleware/auth');

const router = express.Router();

function listAll(table) {
  return db.prepare(`SELECT id, data FROM ${table} ORDER BY id ASC`).all()
    .map(r => ({ id: r.id, ...JSON.parse(r.data) }));
}

/* GET /api/assets -> { purchases, replacements, categories } in one call,
   matching what the frontend's loadAllData() expects. */
router.get('/', requireAuth, (req, res) => {
  res.json({
    purchases: listAll('assets_purchases'),
    replacements: listAll('assets_replacements'),
    categories: listAll('assets_categories')
  });
});

function makeSubRoute(table) {
  router.post(`/${table.replace('assets_', '')}`, requireAuth, requireEditAccess, (req, res) => {
    const info = db.prepare(`INSERT INTO ${table} (data) VALUES (?)`).run(JSON.stringify(req.body || {}));
    res.status(201).json({ id: info.lastInsertRowid, ...req.body });
  });
}
makeSubRoute('assets_purchases');
makeSubRoute('assets_replacements');
makeSubRoute('assets_categories');

module.exports = router;
