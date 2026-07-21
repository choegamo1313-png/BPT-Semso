# Bikhar Phenday Tshokpa Management System — Backend

A real REST API (Node.js + Express) backed by a **permanent, hosted Postgres
database**, plus the dashboard frontend (`index.html`) wired to call it.

## Files

```
server.js            ← starts the API, mounts every route
db.js                 ← connects to Postgres, creates tables, seeds the admin account
authMiddleware.js     ← JWT verification, admin/edit-access checks
auth.js               ← login, admin password change
credentials.js        ← admin: issue/reset/revoke member & staff logins
dashboard.js          ← dashboard stat cards
assets.js             ← assets (purchases / replacements / categories)
resource.js           ← generic list/create routes reused by most resources
seed.js               ← inserts sample data (only into empty tables)
package.json
.env.example          ← copy to .env and fill in
index.html             ← the frontend (calls the API at window.BPT_API_BASE)
```

## Why this stores data permanently now

Data lives in a **hosted Postgres database**, not a file on the server's
local disk. That distinction matters if you deploy the backend to a
platform like Render: on Render's free web-service tier, the local
filesystem is wiped every time the service restarts or redeploys (which
happens automatically after ~15 minutes of inactivity). A file-based
database (a `.sqlite` file, a JSON file) sitting on that disk gets reset
right along with it. A hosted Postgres database runs on its own separate
server, so it keeps every record no matter how many times your backend
process restarts, sleeps, or redeploys — which is what "real" permanent
storage means in practice.

## 1. Get a free permanent database

Pick one (both have a free tier that doesn't expire, unlike Render's own
free Postgres which auto-deletes after 30 days):

- **[Neon](https://neon.tech)** — create a project, copy the connection
  string shown on the dashboard (starts with `postgresql://`).
- **[Supabase](https://supabase.com)** — create a project, go to
  Project Settings → Database → Connection string → "URI".

Either way you'll get a string like:
```
postgresql://user:password@host/dbname?sslmode=require
```

## 2. Configure the backend

```bash
cp .env.example .env
```

Fill in `.env`:
- `DATABASE_URL` — the connection string from step 1.
- `JWT_SECRET` — a long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
- `ADMIN_DEFAULT_PASSWORD` — password for the first-run admin account (username `admin`). Change it after first login via Administrator → Login Settings.
- `FRONTEND_ORIGINS` — comma-separated list of origins allowed to call the API.

## 3. Run it

```bash
npm install
npm start
```

You should see `BPT backend listening on port 4000`. On first run it
creates all tables in your Postgres database and seeds a default admin
account. Optionally load sample data:

```bash
npm run seed
```

## 4. Serve the frontend

`index.html` already points at a deployed backend
(`window.BPT_API_BASE` near the top of the file). For local testing,
change that to `http://localhost:4000/api`, then open the file or serve
it with:

```bash
python3 -m http.server 8080
```

## Deploying (e.g. to Render)

1. Push this backend to a GitHub repo, create a **Web Service** on Render
   pointing at it (build command `npm install`, start command
   `node server.js`).
2. In the service's Environment settings, add `DATABASE_URL`,
   `JWT_SECRET`, `ADMIN_DEFAULT_PASSWORD`, and `FRONTEND_ORIGINS` (same
   values as your `.env`).
3. No disk needed — the database lives outside Render entirely, so the
   free web-service tier is fine and your data survives every
   restart/redeploy.
4. Point `window.BPT_API_BASE` in `index.html` at your Render service's
   URL (`https://your-service.onrender.com/api`) and deploy/serve the
   frontend wherever you like (Render Static Site, GitHub Pages, etc.).

## API endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Log in, get a session token |
| POST | `/api/auth/admin` | Admin: change own username/password |
| GET/POST | `/api/credentials` | Admin: list / issue member & staff logins |
| POST | `/api/credentials/authorize` | Admin: grant/revoke edit access |
| POST | `/api/credentials/status` | Admin: activate/revoke a login |
| POST | `/api/credentials/reset` | Admin: reset a login's password |
| GET | `/api/dashboard/stats` | Dashboard stat cards |
| GET/POST | `/api/members` | List / add members |
| GET/POST | `/api/management` | Committee members |
| GET/POST | `/api/contributions` | Contributions |
| GET/POST | `/api/semso/:type` | `type` = `medical` \| `death` \| `other` |
| GET | `/api/assets` | Purchases, replacements, categories in one call |
| POST | `/api/assets/purchases` \| `/replacements` \| `/categories` | Add an asset record |
| GET/POST | `/api/expenses/:type` | `type` = `staff` \| `other` |
| GET/POST | `/api/forms` | Forms registry |
| GET/POST | `/api/reports` | Reports registry |
| GET/POST | `/api/statements/individual` | Per-member statement |
| GET/POST | `/api/statements/overall` | Organization-wide statement |
| GET/POST | `/api/vision-mission`, `/api/announcements`, `/api/photos` | Misc content |

Every route except `/api/health` and `/api/auth/login` requires a
`Authorization: Bearer <token>` header from a successful login. Routes
that create records additionally require the account to be an admin or
an explicitly authorized member/staff account (enforced server-side in
`authMiddleware.js`, not just hidden in the UI).

## Notes

- All names, CIDs, and figures in `seed.js` are fictional/generated —
  replace with your Tshokpa's actual member records when you're ready to
  go live, and skip `npm run seed` in production.
- Passwords are hashed with bcrypt and never stored or returned in plain
  text (except once, at creation/reset time, so the admin can hand it to
  the person it belongs to).
