const express = require('express');
const cors    = require('cors');
const path    = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
require('dotenv').config();

const gamesRouter     = require('./routes/games');
const userGamesRouter = require('./routes/user-games');
const authRouter      = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');
require('./db'); // Initialize DB on startup

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// Session — stored in SQLite so sessions survive server restarts (dev-friendly)
app.use(session({
  store: new SQLiteStore({
    db:  'sessions.sqlite',
    dir: __dirname,          // stores next to server.js
  }),
  secret:            process.env.SESSION_SECRET || 'compendium-dev-secret-change-in-production',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// ── Serve frontend static files ───────────────────────────────────────────────

app.use(express.static(path.join(__dirname, '../frontend')));

// ── API Routes ────────────────────────────────────────────────────────────────

app.use('/api/auth',       authRouter);
app.use('/api/games',      gamesRouter);
app.use('/api/user-games', requireAuth, userGamesRouter); // 🔒 protected

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open your app at: http://localhost:${PORT}/index.html`);
});
