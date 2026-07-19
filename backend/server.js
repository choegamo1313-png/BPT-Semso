// Bikhar Phenday Tshokpa Management System — Backend API
// Pure Node.js (http + fs only, no external dependencies needed).
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function writeDB(db) {
  db.meta.generatedAt = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
function sum(arr, f) { return arr.reduce((a, x) => a + f(x), 0); }
function nextId(prefix, list, key) {
  const n = list.length + 1;
  return `${prefix}-${String(n).padStart(4, '0')}`;
}
function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}
function collectBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const segments = parsed.pathname.split('/').filter(Boolean); // e.g. ['api','members','MBR-1000']
  const method = req.method;

  if (method === 'OPTIONS') { return send(res, 204, {}); }
  if (segments[0] !== 'api') { return send(res, 404, { error: 'Not found' }); }

  let db;
  try { db = readDB(); } catch (e) { return send(res, 500, { error: 'DB read failed' }); }

  try {
    // ---------- /api/dashboard/stats ----------
    if (segments[1] === 'dashboard' && segments[2] === 'stats' && method === 'GET') {
      const activeMembers = db.members.filter(m => m.status === 'active');
      const resignedMembers = db.members.filter(m => m.status === 'resigned');
      const thisYear = new Date().getFullYear().toString();
      const newThisYear = db.members.filter(m => m.joined === thisYear).length;
      const totalSemso = db.semso.medical.length + db.semso.death.length + db.semso.other.length;
      return send(res, 200, {
        newMembers: newThisYear,
        activeMembers: activeMembers.length,
        resignedMembers: resignedMembers.length,
        totalAssetsValue: db.aggregates.totalAssetsValue,
        semsoRecords: totalSemso,
      });
    }

    // ---------- /api/members ----------
    if (segments[1] === 'members') {
      if (segments.length === 2 && method === 'GET') {
        const { q, status, dzongkhag } = parsed.query;
        let results = db.members;
        if (q) {
          const term = q.toLowerCase();
          results = results.filter(m =>
            m.name.toLowerCase().includes(term) ||
            m.id.toLowerCase().includes(term) ||
            m.cid.includes(term));
        }
        if (status) results = results.filter(m => m.status === status);
        if (dzongkhag) results = results.filter(m => m.dzongkhag === dzongkhag);
        return send(res, 200, results);
      }
      if (segments.length === 2 && method === 'POST') {
        const body = await collectBody(req);
        const newMember = {
          id: 'MBR-' + String(1000 + db.members.length),
          status: 'pending',
          photo: '', docs: [],
          ...body,
        };
        db.members.push(newMember);
        writeDB(db);
        return send(res, 201, newMember);
      }
      if (segments.length === 3 && method === 'GET') {
        const m = db.members.find(x => x.id === segments[2]);
        if (!m) return send(res, 404, { error: 'Member not found' });
        return send(res, 200, m);
      }
      if (segments.length === 3 && method === 'PUT') {
        const idx = db.members.findIndex(x => x.id === segments[2]);
        if (idx === -1) return send(res, 404, { error: 'Member not found' });
        const body = await collectBody(req);
        db.members[idx] = { ...db.members[idx], ...body };
        writeDB(db);
        return send(res, 200, db.members[idx]);
      }
    }

    // ---------- /api/contributions ----------
    if (segments[1] === 'contributions') {
      if (segments.length === 2 && method === 'GET') {
        return send(res, 200, db.contributions);
      }
      if (segments.length === 2 && method === 'POST') {
        const body = await collectBody(req);
        const entry = { id: nextId('CTB', db.contributions), status: 'pending', ...body };
        db.contributions.push(entry);
        writeDB(db);
        return send(res, 201, entry);
      }
      if (segments.length === 3 && method === 'PUT') {
        const idx = db.contributions.findIndex(c => c.id === segments[2]);
        if (idx === -1) return send(res, 404, { error: 'Contribution not found' });
        const body = await collectBody(req);
        db.contributions[idx] = { ...db.contributions[idx], ...body };
        writeDB(db);
        return send(res, 200, db.contributions[idx]);
      }
      if (segments.length === 3 && method === 'DELETE') {
        const idx = db.contributions.findIndex(c => c.id === segments[2]);
        if (idx === -1) return send(res, 404, { error: 'Contribution not found' });
        const removed = db.contributions.splice(idx, 1)[0];
        writeDB(db);
        return send(res, 200, removed);
      }
    }

    // ---------- /api/semso/:type (medical|death|other) ----------
    if (segments[1] === 'semso') {
      const type = segments[2];
      if (!['medical', 'death', 'other'].includes(type)) return send(res, 404, { error: 'Unknown semso type' });
      if (method === 'GET') return send(res, 200, db.semso[type]);
      if (method === 'POST') {
        const body = await collectBody(req);
        const prefix = type === 'medical' ? 'SMD' : type === 'death' ? 'SDT' : 'SOT';
        const entry = { id: nextId(prefix, db.semso[type]), status: 'pending', ...body };
        db.semso[type].push(entry);
        writeDB(db);
        return send(res, 201, entry);
      }
    }

    // ---------- /api/assets ----------
    if (segments[1] === 'assets') {
      if (segments[2] === 'categories' && method === 'GET') return send(res, 200, db.assets.categories);
      if (segments[2] === 'purchases' && method === 'GET') return send(res, 200, db.assets.purchases);
      if (segments[2] === 'purchases' && method === 'POST') {
        const body = await collectBody(req);
        db.assets.purchases.push(body);
        writeDB(db);
        return send(res, 201, body);
      }
      if (segments[2] === 'replacements' && method === 'GET') return send(res, 200, db.assets.replacements);
      if (segments[2] === 'replacements' && method === 'POST') {
        const body = await collectBody(req);
        db.assets.replacements.push(body);
        writeDB(db);
        return send(res, 201, body);
      }
      if (segments.length === 2 && method === 'GET') return send(res, 200, db.assets);
    }

    // ---------- /api/expenses ----------
    if (segments[1] === 'expenses') {
      const type = segments[2]; // staff | other
      if (['staff', 'other'].includes(type) && method === 'GET') return send(res, 200, db.expenses[type]);
      if (['staff', 'other'].includes(type) && method === 'POST') {
        const body = await collectBody(req);
        db.expenses[type].push(body);
        writeDB(db);
        return send(res, 201, body);
      }
    }

    // ---------- /api/management ----------
    if (segments[1] === 'management') {
      if (method === 'GET') return send(res, 200, db.management);
      if (method === 'POST') {
        const body = await collectBody(req);
        db.management.push(body);
        writeDB(db);
        return send(res, 201, body);
      }
    }

    // ---------- /api/forms ----------
    if (segments[1] === 'forms' && method === 'GET') return send(res, 200, db.forms);
    // ---------- /api/reports ----------
    if (segments[1] === 'reports' && method === 'GET') return send(res, 200, db.reports);

    // ---------- /api/statements/individual ----------
    if (segments[1] === 'statements' && segments[2] === 'individual' && method === 'GET') {
      const result = db.members.filter(m => m.status !== 'resigned').map(m => {
        const contribTotal = sum(db.contributions.filter(c => c.memberId === m.id), c => c.amount);
        const claimsTotal =
          sum(db.semso.medical.filter(c => c.memberId === m.id), c => c.amount) +
          sum(db.semso.other.filter(c => c.memberId === m.id), c => c.amount);
        return {
          memberId: m.id, cid: m.cid, member: m.name,
          contributions: contribTotal, claims: claimsTotal,
          balance: contribTotal - claimsTotal, status: m.status,
        };
      });
      return send(res, 200, result);
    }

    // ---------- /api/statements/overall ----------
    if (segments[1] === 'statements' && segments[2] === 'overall' && method === 'GET') {
      const a = db.aggregates;
      const claimsTotal = a.totalMedical + a.totalDeath + a.totalOther;
      return send(res, 200, [
        { category: 'Contributions', totalIn: a.totalContrib, totalOut: 0, balance: a.totalContrib, status: 'active' },
        { category: 'Semso Claims', totalIn: 0, totalOut: claimsTotal, balance: -claimsTotal, status: 'active' },
        { category: 'Assets', totalIn: 0, totalOut: a.totalAssetsValue, balance: -a.totalAssetsValue, status: 'active' },
        { category: 'Expenses', totalIn: 0, totalOut: a.totalStaffExpense + a.totalOtherExpense, balance: -(a.totalStaffExpense + a.totalOtherExpense), status: 'active' },
      ]);
    }

    return send(res, 404, { error: 'Not found', path: parsed.pathname });
  } catch (err) {
    return send(res, 500, { error: 'Server error', detail: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`BPT backend API running on http://localhost:${PORT}`);
});
