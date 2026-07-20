# BPT backend

A real backend for the Bikhar Phenday Tshokpa Management System: hashed
passwords, JWT-based login, server-enforced permissions, and a persistent
SQLite database. This replaces the earlier version where the admin
password and all data lived only in the browser.

## What this fixes

- Passwords are hashed with bcrypt and never stored or compared in plain
  text. The old hardcoded `admin123` in the page source is gone.
- Login happens on the server (`POST /api/auth/login`) — the browser
  never has the password to check against.
- View-only vs edit-authorized access is enforced by the server on every
  write request, not just hidden by the browser UI (which anyone with
  dev tools could previously bypass).
- Data (members, contributions, claims, assets, etc.) is stored in a
  real SQLite database and survives restarts and redeploys, instead of
  resetting every time the page reloads.

## 1. Local setup

```
cd backend
npm install
cp .env.example .env
```

Open `.env` and set a real `JWT_SECRET` — generate one with:
```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Leave `ADMIN_DEFAULT_PASSWORD` as-is or change it — this is only used the
very first time the server starts, to create the initial admin account.

Then:
```
npm run seed    # populates demo data (safe to skip — server also runs fine empty)
npm start
```

The API is now running at `http://localhost:4000/api`. Default admin
login: username `admin`, password whatever you set in `.env`
(`admin123` unless changed) — **change this immediately** via
Administrator → Login Settings once you're logged in.

## 2. Point the frontend at it

In `index.html`, the frontend already reads `window.BPT_API_BASE`. For
local testing, add this line right before the closing `</body>` tag (or
anywhere before the main `<script>` block runs):
```html
<script>window.BPT_API_BASE = 'http://localhost:4000/api';</script>
```
For production, set it to your deployed backend's URL (see below).

## 3. Deploy the backend on Render

1. Push the `backend/` folder to a GitHub repo (can be the same repo as
   your frontend, or a separate one).
2. In the Render dashboard: **New +** → **Web Service** → connect the repo.
3. Settings:
   - **Root directory**: `backend` (if it's in the same repo as the frontend)
   - **Build command**: `npm install`
   - **Start command**: `npm start`
4. Under **Environment**, add:
   - `JWT_SECRET` — your generated secret
   - `ADMIN_DEFAULT_PASSWORD` — a password for first login
   - `FRONTEND_ORIGINS` — your static site's URL, e.g. `https://your-site.onrender.com`
5. Deploy. Render gives you a URL like `https://bpt-backend.onrender.com`.
6. Back in your frontend's `index.html`, set:
   ```html
   <script>window.BPT_API_BASE = 'https://bpt-backend.onrender.com/api';</script>
   ```
   Commit and push — Render redeploys the static site automatically.

### Important: persistent storage on Render

SQLite writes to a file on local disk. Render's **free** web services have
an *ephemeral* filesystem — the database file is wiped on every redeploy.
For real production use, do one of:

- Attach a **persistent disk** to the backend service (requires a paid
  instance type) and point the SQLite file at that disk's mount path, or
- Migrate to **Render Postgres** (a managed database) instead of SQLite —
  more involved, but the right call if this will hold real member/financial
  data long-term. Ask me and I can help convert `db.js` to Postgres.

For now (testing/demo), the free ephemeral setup is fine — just know that
data resets on each backend redeploy until one of the above is in place.

## API overview

- `POST /api/auth/login` — public. Returns a session token.
- `POST /api/auth/admin` — admin only. Changes admin username/password.
- `GET/POST /api/credentials*` — admin only. Issue/manage member & staff logins.
- `GET /api/dashboard/stats` — any logged-in user.
- `GET /api/members`, `/management`, `/contributions`, `/semso/*`,
  `/assets`, `/expenses/*`, `/forms`, `/reports`, `/statements/*`,
  `/vision-mission`, `/announcements`, `/photos` — any logged-in user (read),
  admin or authorized staff/member (write via POST).

Every write endpoint requires a valid token AND (admin OR
`authorized: true` on that account) — enforced in
`middleware/auth.js`, not just in the browser.
