const express = require('express');
const bcrypt  = require('bcrypt');
const router  = express.Router();
const db      = require('../db');

const SALT_ROUNDS = 12;

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateSignup({ username, email, password }) {
  if (!username || username.trim().length < 2)
    return 'Username must be at least 2 characters.';
  if (username.trim().length > 30)
    return 'Username must be 30 characters or fewer.';
  if (!/^[a-zA-Z0-9_.-]+$/.test(username))
    return 'Username may only contain letters, numbers, underscores, dots, or hyphens.';
  if (!email || !email.includes('@'))
    return 'A valid email address is required.';
  if (!password || password.length < 6)
    return 'Password must be at least 6 characters.';
  return null;
}

function validateLogin({ identifier, password }) {
  if (!identifier || !identifier.trim()) return 'Email or username is required.';
  if (!password)                          return 'Password is required.';
  return null;
}

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  const err = validateSignup({ username, email, password });
  if (err) return res.status(400).json({ error: err });

  const cleanUsername = username.trim();
  const cleanEmail    = email.trim().toLowerCase();

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      const info = db.prepare(
        `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`
      ).run(cleanUsername, cleanEmail, hash);

      // Auto-login
      req.session.userId   = info.lastInsertRowid;
      req.session.username = cleanUsername;

      return res.status(201).json({
        user: { id: info.lastInsertRowid, username: cleanUsername },
      });
    } catch (dbErr) {
      if (dbErr.message.includes('UNIQUE constraint failed: users.username'))
        return res.status(409).json({ error: 'Username already taken.' });
      if (dbErr.message.includes('UNIQUE constraint failed: users.email'))
        return res.status(409).json({ error: 'An account with that email already exists.' });
      console.error('Signup DB error:', dbErr.message);
      return res.status(500).json({ error: 'Database error during signup.' });
    }
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  const err = validateLogin({ identifier, password });
  if (err) return res.status(400).json({ error: err });

  const clean = identifier.trim().toLowerCase();

  try {
    // Look up by email OR username (both COLLATE NOCASE in schema)
    const user = db.prepare(
      `SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1`
    ).get(clean, clean);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    req.session.userId   = user.id;
    req.session.username = user.username;

    return res.json({
      user: { id: user.id, username: user.username },
    });
  } catch (dbErr) {
    console.error('Login DB error:', dbErr.message);
    return res.status(500).json({ error: 'Database error.' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Session destroy error:', err);
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  console.log("SESSION USER:", req.session.userId);
  
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  if (!req.session.userId) {
    return res.json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user: {
      id:       req.session.userId,
      username: req.session.username,
    },
  });
});

module.exports = router;
