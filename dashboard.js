const express = require('express');
const { pool } = require('./db');
const { requireAuth } = require('./authMiddleware');

const router = express.Router();

async function countRows(table) {
  const { rows } = await pool.query(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(rows[0].n);
}
async function all(table) {
  const { rows } = await pool.query(`SELECT data FROM ${table}`);
  return rows.map(r => JSON.parse(r.data));
}

router.get('/', requireAuth, async (req, res) => {
  const members = await all('members');
  const currentYear = new Date().getFullYear();
  const newMembers = members.filter(m => (m.joined || m.dateJoined || '').includes(String(currentYear))).length;
  const activeMembers = members.filter(m => (m.status || 'active') === 'active').length;
  const resignedMembers = members.filter(m => m.status === 'resigned').length;

  const assetCategories = await all('assets_categories');
  const totalAssetsValue = assetCategories.reduce((sum, a) => sum + (Number(a.value) || 0), 0);

  const semsoRecords =
    (await countRows('semso_medical')) +
    (await countRows('semso_death')) +
    (await countRows('semso_other'));

  res.json({ newMembers, activeMembers, resignedMembers, totalAssetsValue, semsoRecords });
});

module.exports = router;
