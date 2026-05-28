const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const dbPath = path.resolve(__dirname, 'database.sqlite');

let db;
try {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  console.log('Connected to the SQLite database via better-sqlite3.');

  // ── user_games ────────────────────────────────────────────────────────
  db.exec(`
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
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_user_games_user_id ON user_games(user_id)');

  // Migrate existing databases: add times_completed if it doesn't exist
  try {
    db.exec(`ALTER TABLE user_games ADD COLUMN times_completed INTEGER DEFAULT 0 CHECK(times_completed >= 0)`);
  } catch (err) {
    // SQLITE_ERROR means column already exists — safe to ignore
    if (!err.message.includes('duplicate column name')) {
      console.error('Migration error:', err.message);
    }
  }

  // Migrate existing databases: add genres if it doesn't exist
  try {
    db.exec(`ALTER TABLE user_games ADD COLUMN genres TEXT DEFAULT '[]'`);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.error('Migration error (genres):', err.message);
    }
  }

  // ── users ─────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      username         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      email            TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash    TEXT    NOT NULL,
      favorite_game_id INTEGER REFERENCES user_games(id) ON DELETE SET NULL,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate existing databases: add favorite_game_id if it doesn't exist
  try {
    db.exec(`ALTER TABLE users ADD COLUMN favorite_game_id INTEGER REFERENCES user_games(id) ON DELETE SET NULL`);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) {
      console.error('Migration error (favorite_game_id):', err.message);
    }
  }
} catch (err) {
  console.error('Error initializing database:', err.message);
}

module.exports = db;
