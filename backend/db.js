const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');

    db.serialize(() => {
      // Create table with full schema including times_completed
      db.run(`
        CREATE TABLE IF NOT EXISTS user_games (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id         INTEGER DEFAULT 1,
          game_id         INTEGER NOT NULL,
          game_name       TEXT NOT NULL,
          cover_image     TEXT,
          status          TEXT NOT NULL DEFAULT 'plan_to_play',
          rating          INTEGER CHECK(rating IS NULL OR (rating >= 1 AND rating <= 10)),
          hours_played    INTEGER DEFAULT 0 CHECK(hours_played >= 0),
          completion      TEXT DEFAULT 'none',
          platform        TEXT DEFAULT 'pc',
          times_completed INTEGER DEFAULT 0 CHECK(times_completed >= 0),
          created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, game_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating user_games table', err.message);
        } else {
          db.run('CREATE INDEX IF NOT EXISTS idx_user_games_user_id ON user_games(user_id)');

          // Migrate existing databases: add times_completed if it doesn't exist
          db.run(`ALTER TABLE user_games ADD COLUMN times_completed INTEGER DEFAULT 0 CHECK(times_completed >= 0)`, (err) => {
            // SQLITE_ERROR means column already exists — safe to ignore
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Migration error:', err.message);
            }
          });
        }
      });

      // ── users ─────────────────────────────────────────────────────────────
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
          email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
          password_hash TEXT    NOT NULL,
          created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Error creating users table', err.message);
      });
    });
  }
});

module.exports = db;
