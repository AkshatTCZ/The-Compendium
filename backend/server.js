const express = require('express');
const cors    = require('cors');
const path    = require('path');
const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const Database = require('better-sqlite3');
require('dotenv').config();

const gamesRouter     = require('./routes/games');
const userGamesRouter = require('./routes/user-games');
const authRouter      = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');
require('./db'); // Initialize DB on startup

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────

app.set('trust proxy', 1);

app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "https://the-compendium-track.vercel.app"
  ],
  credentials: true
}));
app.use(express.json());

const sessionDb = new Database(path.join(__dirname, 'sessions.sqlite'));

// Session — stored in SQLite so sessions survive server restarts (dev-friendly)
app.use(session({
  name: "__Secure-connect.sid",
  proxy: true,
  store: new SqliteStore({
    client: sessionDb,
    expired: {
      clear: true,
      intervalMs: 900000 //ms = 15min
    }
  }),
  secret:            process.env.SESSION_SECRET || 'compendium-dev-secret-change-in-production',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   true,
    sameSite: "none",
    httpOnly: true,
    partitioned: true,
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
