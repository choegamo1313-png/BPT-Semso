const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

/* ---------- real, permanent storage ----------
   This connects to a hosted Postgres database (e.g. a free Neon or
   Supabase project) instead of a local file. A local file only lives on
   the disk of whatever machine/container is running the server — on
   Render's free tier that disk is wiped every time the service restarts
   or redeploys. A hosted Postgres database lives on its own server and
   keeps its data no matter what happens to the backend process, which is
   what "the data is stored permanently" actually requires.
------------------------------------------------------------------- */
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set. Copy .env.example to .env, create a free Postgres database (see README), and paste its connection string in as DATABASE_URL.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  // Hosted Postgres providers (Neon, Supabase, Render Postgres, etc.) require
  // SSL. Local Postgres for testing usually doesn't have/need a cert, so
  // skip this for a plain localhost connection string.
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

/* ---------- generic resource tables ----------
   Each business-data resource (members, contributions, assets, etc.) is
   stored as a row of JSON. This keeps the schema simple while still being
   a real, persistent, queryable database — every record has a real id and
   survives restarts/redeploys.
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

/* Creates all tables if they don't exist yet, and seeds the default admin
   account on first run. Safe to call every time the server starts —
   CREATE TABLE IF NOT EXISTS and the "does an admin exist" check make it
   a no-op on every run after the first. */
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
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

  for (const table of RESOURCE_TABLES) {
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table} (id SERIAL PRIMARY KEY, data TEXT NOT NULL)`);
  }

  const { rows } = await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  if (rows.length === 0) {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(defaultPassword, 10);
    await pool.query(
      `INSERT INTO users (role, username, password_hash, name, ref_id, status, authorized, issued)
       VALUES ('admin', 'admin', $1, 'Administrator', NULL, 'active', 1, $2)`,
      [hash, new Date().toISOString().slice(0, 10)]
    );
    console.log('Seeded default admin account (username: admin). Change the password after first login.');
  }
}

module.exports = { pool, RESOURCE_TABLES, initDb };
