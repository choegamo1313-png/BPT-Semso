require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initDb } = require('./db');
const { resourceRouter } = require('./resource');

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: false
}));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./auth'));
app.use('/api/credentials', require('./credentials'));
app.use('/api/dashboard/stats', require('./dashboard'));
app.use('/api/assets', require('./assets'));

app.use('/api/members', resourceRouter('members'));
app.use('/api/management', resourceRouter('management'));
app.use('/api/contributions', resourceRouter('contributions'));
app.use('/api/semso/medical', resourceRouter('semso_medical'));
app.use('/api/semso/death', resourceRouter('semso_death'));
app.use('/api/semso/other', resourceRouter('semso_other'));
app.use('/api/expenses/staff', resourceRouter('expenses_staff'));
app.use('/api/expenses/other', resourceRouter('expenses_other'));
app.use('/api/forms', resourceRouter('forms'));
app.use('/api/reports', resourceRouter('reports'));
app.use('/api/statements/individual', resourceRouter('stmt_individual'));
app.use('/api/statements/overall', resourceRouter('stmt_overall'));
app.use('/api/vision-mission', resourceRouter('vision_mission'));
app.use('/api/announcements', resourceRouter('announcements'));
app.use('/api/photos', resourceRouter('photos'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

const PORT = process.env.PORT || 4000;

/* Create tables (if they don't exist yet) and seed the default admin
   account BEFORE accepting any requests, then start listening. */
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`BPT backend listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize the database:', err);
    process.exit(1);
  });
