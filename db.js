const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.sqlite'));
db.pragma('journal_mode = WAL');

/* ---------- users: real accounts with hashed passwords ----------
   role       'admin' | 'staff' | 'member'
   authorized 0/1 — whether a staff/member account may make changes.
              Admins are always treated as authorized.
------------------------------------------------------------------- */
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  ref_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  authorized INTEGER NOT NULL DEFAULT 0,
  issued TEXT NOT NULL
);
`);

/* ---------- generic resource tables ----------
   Each business-data resource (members, contributions, assets, etc.) is
   stored as a row of JSON. This keeps the schema simple while still being
   a real, persistent, queryable database — every record has a real id and
   survives restarts/redeploys, unlike the old in-browser-memory version.
------------------------------------------------------------------- */
const RESOURCE_TABLES = [
  'members', 'management', 'contributions',
  'semso_medical', 'semso_death', 'semso_other',
  'assets_purchases', 'assets_replacements', 'assets_categories',
  'expenses_staff', 'expenses_other',
  'forms', 'reports',
  'stmt_individual', 'stmt_overall',
  'vision_mission', 'announcements', 'photos'
];
RESOURCE_TABLES.forEach(t => {
  db.exec(`CREATE TABLE IF NOT EXISTS ${t} (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL)`);
});

/* ---------- seed the default admin account on first run ---------- */
const adminExists = db.prepare(`SELECT id FROM users WHERE role = 'admin'`).get();
if (!adminExists) {
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(defaultPassword, 10);
  db.prepare(`
    INSERT INTO users (role, username, password_hash, name, ref_id, status, authorized, issued)
    VALUES ('admin', 'admin', ?, 'Administrator', NULL, 'active', 1, ?)
  `).run(hash, new Date().toISOString().slice(0, 10));
  console.log('Seeded default admin account (username: admin). Change the password after first login.');
}

module.exports = { db, RESOURCE_TABLES };
