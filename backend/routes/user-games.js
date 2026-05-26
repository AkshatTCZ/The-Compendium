const express = require('express');
const router  = express.Router();
const db      = require('../db');

function validateUserGame(p) {
  const validStatus     = ["playing", "completed", "dropped", "on_hold", "plan_to_play"];
  const validCompletion = ["none", "story", "100%"];
  const validPlatforms  = [
    "pc", "mac", "linux", "steam_deck",
    "ps5", "ps4", "ps3", "ps2", "ps1", "psp", "ps_vita",
    "xbox_series", "xbox_one", "xbox_360",
    "switch", "wii_u", "wii", "3ds", "ds", "gba",
    "mobile",
    "other",
  ];

  if (p.status     && !validStatus.includes(p.status))         return "Invalid status";
  if (p.completion && !validCompletion.includes(p.completion)) return "Invalid completion";
  if (p.platform   && !validPlatforms.includes(p.platform))    return "Invalid platform";

  if (p.rating !== null && p.rating !== undefined && (p.rating < 1 || p.rating > 10))
    return "Invalid rating";
  if (p.hours_played !== null && p.hours_played !== undefined && p.hours_played < 0)
    return "Hours played cannot be negative";
  if (p.times_completed !== null && p.times_completed !== undefined && p.times_completed < 0)
    return "Times completed cannot be negative";

  if (p.status === "plan_to_play" && p.completion && p.completion !== "none")
    return "Planned games cannot have completion progress";

  return null;
}

// ── POST /api/user-games ──────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const user_id = req.session.userId;   // set by requireAuth middleware

  let {
    game_id, game_name, cover_image,
    status, rating, hours_played, completion, platform, times_completed
  } = req.body;

  if (!game_id || !game_name) {
    return res.status(400).json({ error: 'game_id and game_name are required' });
  }

  status     = status     || 'plan_to_play';
  completion = completion || 'none';
  platform   = platform   || 'pc';

  rating          = rating          === "" || rating          == null ? null : Number(rating);
  hours_played    = hours_played    === "" || hours_played    == null ? 0    : Number(hours_played);
  times_completed = times_completed === "" || times_completed == null ? 0    : Number(times_completed);

  if (completion === "100%" && times_completed === 0) times_completed = 1;

  const validationError = validateUserGame({ status, completion, platform, rating, hours_played, times_completed });
  if (validationError) return res.status(400).json({ error: validationError });

  db.run(
    `INSERT INTO user_games
       (user_id, game_id, game_name, cover_image, status, rating, hours_played, completion, platform, times_completed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, game_id, game_name, cover_image, status, rating, hours_played, completion, platform, times_completed],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('UNIQUE constraint failed'))
          return res.status(409).json({ error: 'Game already exists in library' });
        console.error(err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ success: true, user_game_id: this.lastID });
    }
  );
});

// ── PUT /api/user-games/:id ───────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const { id }  = req.params;
  const user_id = req.session.userId;

  let { status, rating, hours_played, completion, platform, times_completed } = req.body;

  status     = status     || 'plan_to_play';
  completion = completion || 'none';
  platform   = platform   || 'pc';

  rating          = rating          === "" || rating          == null ? null : Number(rating);
  hours_played    = hours_played    === "" || hours_played    == null ? 0    : Number(hours_played);
  times_completed = times_completed === "" || times_completed == null ? 0    : Number(times_completed);

  if (completion === "100%" && times_completed === 0) times_completed = 1;

  const validationError = validateUserGame({ status, completion, platform, rating, hours_played, times_completed });
  if (validationError) return res.status(400).json({ error: validationError });

  db.run(
    `UPDATE user_games
     SET status=?, rating=?, hours_played=?, completion=?, platform=?,
         times_completed=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND user_id=?`,
    [status, rating, hours_played, completion, platform, times_completed, id, user_id],
    function(err) {
      if (err) { console.error(err.message); return res.status(500).json({ error: 'Database error' }); }
      if (this.changes === 0) return res.status(404).json({ error: 'Game not found in library' });
      res.json({ success: true });
    }
  );
});

// ── GET /api/user-games ───────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const user_id = req.session.userId;

  db.all(
    `SELECT * FROM user_games WHERE user_id = ? ORDER BY created_at DESC`,
    [user_id],
    (err, rows) => {
      if (err) { console.error(err.message); return res.status(500).json({ error: 'Database error' }); }
      res.json({
        games: rows.map(r => ({
          id:             r.id,
          gameId:         r.game_id,
          name:           r.game_name,
          cover:          r.cover_image,
          status:         r.status,
          rating:         r.rating,
          hours:          r.hours_played,
          completion:     r.completion,
          platform:       r.platform,
          timesCompleted: r.times_completed ?? 0,
          createdAt:      r.created_at,
        }))
      });
    }
  );
});

// ── DELETE /api/user-games/:id ────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const { id }  = req.params;
  const user_id = req.session.userId;

  db.run(
    `DELETE FROM user_games WHERE id = ? AND user_id = ?`,
    [id, user_id],
    function(err) {
      if (err) { console.error(err.message); return res.status(500).json({ error: 'Database error' }); }
      if (this.changes === 0) return res.status(404).json({ error: 'Game not found in library' });
      res.json({ success: true });
    }
  );
});

module.exports = router;
