const express = require('express');
const { db } = require('./db');
const { requireAuth } = require('./authMiddleware');

const router = express.Router();

function countRows(table) {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
}
function all(table) {
  return db.prepare(`SELECT data FROM ${table}`).all().map(r => JSON.parse(r.data));
}

router.get('/', requireAuth, (req, res) => {
  const members = all('members');
  const currentYear = new Date().getFullYear();
  const newMembers = members.filter(m => (m.joined || m.dateJoined || '').includes(String(currentYear))).length;
  const activeMembers = members.filter(m => (m.status || 'active') === 'active').length;
  const resignedMembers = members.filter(m => m.status === 'resigned').length;

  const totalAssetsValue = all('assets_categories')
    .reduce((sum, a) => sum + (Number(a.value) || 0), 0);

  const semsoRecords = countRows('semso_medical') + countRows('semso_death') + countRows('semso_other');

  res.json({ newMembers, activeMembers, resignedMembers, totalAssetsValue, semsoRecords });
});

module.exports = router;
