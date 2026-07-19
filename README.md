# Bikhar Phenday Tshokpa Management System — Backend + Data

This package adds a **real backend API** and **realistic sample data** to the
dashboard you built (`bikhar-phenday-tshokpa-dashboard.html`). The frontend now
fetches live data from the backend instead of using hardcoded arrays.

## What's included

```
bpt-system/
├── backend/
│   ├── server.js          ← REST API (pure Node.js, no npm install needed)
│   ├── generate-seed.js   ← regenerates data/db.json with fresh sample data
│   └── data/db.json       ← the "database" (JSON file), auto-created/updated
└── frontend/
    └── index.html         ← your dashboard, wired to call the backend
```

The backend has **zero external dependencies** — it only uses Node's built-in
`http` and `fs` modules, so `npm install` isn't required and it will run
anywhere Node.js is installed. Data is stored in `backend/data/db.json` and
updated in place whenever a record is added through the UI (new member,
contribution, management member, etc.) — so it persists across restarts.

## How to run it

**1. Start the backend** (from the `backend/` folder):

```bash
node server.js
```

You should see: `BPT backend API running on http://localhost:4000`

**2. Serve the frontend** (from the `frontend/` folder, in a second terminal):

```bash
python3 -m http.server 8080
# or: npx serve .
```

Then open **http://localhost:8080/index.html** in your browser and log in
(the login screen is cosmetic — any input works). The dashboard will fetch
live data from `http://localhost:4000/api` on login.

> If you serve the frontend from a different host/port than `localhost:8080`,
> or the backend from something other than `localhost:4000`, set
> `window.BPT_API_BASE = 'http://your-backend-host:4000/api';` in a
> `<script>` tag before the dashboard's main script runs.

## The data

`generate-seed.js` produced fictional but realistic sample data:

- **62 members** across 10 dzongkhags (Thimphu, Paro, Punakha, Wangdue
  Phodrang, Chukha, Samtse, Sarpang, Mongar, Trashigang, Bumthang) with full
  bio-data (CID, DOB, occupation, emergency contact, etc.)
- **156 contribution records** tied to real member IDs, with payment modes
  (mBOB, Mpay, DrukPay, ePay, Tpay, DK, Cash)
- **25 Semso claims** — 14 medical, 5 death, 6 other (disability, fire
  damage, natural calamity, education support)
- **Asset register** (office equipment, vehicles, land & building,
  furniture), recent purchases and replacements
- **Staff and other expense** records
- **5-person management committee**
- **Forms and reports** registry

Dashboard stat cards, statements (individual & overall), and every
placeholder table (contributions, semso, assets, expenses, forms, reports)
now pull from this same dataset — so numbers are internally consistent
(e.g. Overall Statement totals match the sum of individual contributions).

To regenerate a fresh random dataset at any time:

```bash
cd backend && node generate-seed.js
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/stats` | Dashboard stat cards |
| GET/POST | `/api/members` | List / add members (`?q=`, `?status=`, `?dzongkhag=` filters) |
| GET/PUT | `/api/members/:id` | Get / update one member |
| GET/POST | `/api/contributions` | List / add contributions |
| PUT/DELETE | `/api/contributions/:id` | Edit / remove a contribution |
| GET/POST | `/api/semso/:type` | `type` = `medical` \| `death` \| `other` |
| GET | `/api/assets` | All asset data |
| GET/POST | `/api/assets/purchases` | Purchases |
| GET/POST | `/api/assets/replacements` | Replacements |
| GET/POST | `/api/expenses/:type` | `type` = `staff` \| `other` |
| GET/POST | `/api/management` | Committee members |
| GET | `/api/forms` | Forms registry |
| GET | `/api/reports` | Reports registry |
| GET | `/api/statements/individual` | Per-member statement |
| GET | `/api/statements/overall` | Organization-wide statement |

## Notes / next steps

- This is an in-memory-JSON-file "database" — fine for a demo or single-user
  setup, but for real production use with multiple concurrent users, swap
  `backend/data/db.json` for a proper database (Postgres, SQLite via
  `better-sqlite3`, etc.) — the API surface in `server.js` is written so
  that swap only touches the `readDB`/`writeDB` functions.
- There's no authentication on the API yet — the login screen in the
  frontend is cosmetic. Add real auth (e.g. sessions or JWT) before
  exposing this beyond localhost.
- All names, CIDs, and figures are fictional/generated — replace with your
  Tshokpa's actual member records when you're ready to go live.
