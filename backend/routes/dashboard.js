const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ── GET /api/dashboard/stats ──────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const user_id = req.session.userId;

  try {
    const dbStats = {
      totalGames: 0,
      totalHours: 0,
      averageRating: 0,
      completedGames: 0,
      droppedGames: 0,
      currentlyPlaying: 0,
      backlogCount: 0,
      totalReplays: 0,
      mostReplayedGame: null,
      platformBreakdown: [],
      genreBreakdown: [],
      recentGames: [],
      recommendationGames: [],
      featuredFavoriteGame: null,
      playerArchetype: 'Newcomer'
    };

    // 1. Basic Aggregations
    const aggRow = db.prepare(`
      SELECT 
        COUNT(*) as totalGames,
        SUM(hours_played) as totalHours,
        AVG(rating) as averageRating,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedGames,
        SUM(CASE WHEN status = 'dropped' THEN 1 ELSE 0 END) as droppedGames,
        SUM(CASE WHEN status = 'playing' THEN 1 ELSE 0 END) as currentlyPlaying,
        SUM(CASE WHEN status IN ('plan_to_play', 'on_hold') THEN 1 ELSE 0 END) as backlogCount,
        SUM(times_completed) as totalReplays
      FROM user_games 
      WHERE user_id = ?
    `).get(user_id);

    if (aggRow) {
      dbStats.totalGames = aggRow.totalGames || 0;
      dbStats.totalHours = aggRow.totalHours || 0;
      dbStats.averageRating = aggRow.averageRating ? parseFloat(aggRow.averageRating.toFixed(1)) : 0;
      dbStats.completedGames = aggRow.completedGames || 0;
      dbStats.droppedGames = aggRow.droppedGames || 0;
      dbStats.currentlyPlaying = aggRow.currentlyPlaying || 0;
      dbStats.backlogCount = aggRow.backlogCount || 0;
      dbStats.totalReplays = aggRow.totalReplays || 0;
    }

    // 2. Most Replayed Game
    dbStats.mostReplayedGame = db.prepare(`
      SELECT game_name, cover_image, times_completed 
      FROM user_games 
      WHERE user_id = ? AND times_completed > 0 
      ORDER BY times_completed DESC, updated_at DESC LIMIT 1
    `).get(user_id) || null;

    // 3. Platform Breakdown
    dbStats.platformBreakdown = db.prepare(`
      SELECT platform, COUNT(*) as count 
      FROM user_games 
      WHERE user_id = ? 
      GROUP BY platform 
      ORDER BY count DESC
    `).all(user_id);

    // 4. Genre Breakdown
    const genreRows = db.prepare(`SELECT genres FROM user_games WHERE user_id = ?`).all(user_id);
    const genreCounts = {};
    genreRows.forEach(row => {
      if (row.genres) {
        try {
          const parsed = JSON.parse(row.genres);
          parsed.forEach(g => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          });
        } catch (e) {
          // invalid json, ignore
        }
      }
    });
    dbStats.genreBreakdown = Object.keys(genreCounts)
      .map(k => ({ genre: k, count: genreCounts[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // top 10 genres

    // 5. Player Archetype Logic
    const calculateArchetype = () => {
      if (dbStats.totalGames === 0) return 'Newcomer';
      
      const completionRate = dbStats.totalGames > 0 ? (dbStats.completedGames / dbStats.totalGames) : 0;
      
      if (dbStats.totalReplays >= 5 && dbStats.mostReplayedGame && dbStats.mostReplayedGame.times_completed >= 3) return 'Replay Addict';
      if (completionRate >= 0.8 && dbStats.totalGames >= 10) return 'Completionist';
      if (dbStats.backlogCount > 20 && dbStats.backlogCount > dbStats.completedGames * 2) return 'Backlog Hoarder';
      if (dbStats.totalHours > 1000) return 'Action Veteran';
      
      const topGenre = dbStats.genreBreakdown.length > 0 ? dbStats.genreBreakdown[0].genre.toLowerCase() : '';
      if (topGenre.includes('rpg') || topGenre.includes('role-playing')) return 'RPG Enthusiast';
      if (topGenre.includes('indie')) return 'Indie Wanderer';
      if (topGenre.includes('action')) return 'Action Veteran';
      if (topGenre.includes('story') || topGenre.includes('adventure')) return 'Story Explorer';

      return 'Casual Gamer';
    };
    dbStats.playerArchetype = calculateArchetype();

    // 6. Recent Games
    dbStats.recentGames = db.prepare(`
      SELECT id, game_id, game_name, cover_image, status 
      FROM user_games 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `).all(user_id);

    // 7. Featured Favorite Game
    const userRow = db.prepare(`SELECT favorite_game_id FROM users WHERE id = ?`).get(user_id);
    if (userRow && userRow.favorite_game_id) {
      dbStats.featuredFavoriteGame = db.prepare(`
        SELECT id, game_id, game_name, cover_image, status, rating, hours_played, times_completed, completion 
        FROM user_games 
        WHERE id = ? AND user_id = ?
      `).get(userRow.favorite_game_id, user_id) || null;
    }

    // 8. Recommendations (V1 Collaborative Filtering via SQL)
    // Find games highly rated by users who also highly rated the same games as current user
    dbStats.recommendationGames = db.prepare(`
      SELECT g2.game_id, g2.game_name, g2.cover_image, AVG(g2.rating) as avg_rating, COUNT(DISTINCT g2.user_id) as overlap_count
      FROM user_games g1
      JOIN user_games g2 ON g1.user_id = g2.user_id
      WHERE g1.game_id IN (
        SELECT game_id FROM user_games WHERE user_id = ? AND rating >= 8
      )
      AND g2.user_id != ?
      AND g2.rating >= 8
      AND g2.game_id NOT IN (
        SELECT game_id FROM user_games WHERE user_id = ?
      )
      GROUP BY g2.game_id, g2.game_name, g2.cover_image
      ORDER BY overlap_count DESC, avg_rating DESC
      LIMIT 10
    `).all(user_id, user_id, user_id);

    // Fallback recommendations if empty
    if (dbStats.recommendationGames.length === 0) {
      dbStats.recommendationGames = db.prepare(`
        SELECT game_id, game_name, cover_image, AVG(rating) as avg_rating, COUNT(*) as overlap_count
        FROM user_games
        WHERE user_id != ? AND rating >= 8
        AND game_id NOT IN (SELECT game_id FROM user_games WHERE user_id = ?)
        GROUP BY game_id, game_name, cover_image
        ORDER BY overlap_count DESC, avg_rating DESC
        LIMIT 10
      `).all(user_id, user_id);
    }

    res.json(dbStats);

  } catch (err) {
    console.error('Dashboard Stats Error:', err);
    res.status(500).json({ error: 'Failed to generate dashboard stats' });
  }
});

// ── PUT /api/dashboard/favorite-game ──────────────────────────────────────────
router.put('/favorite-game', (req, res) => {
  const user_id = req.session.userId;
  const { gameId } = req.body; // This is the user_games id

  try {
    if (gameId === null) {
      db.prepare(`UPDATE users SET favorite_game_id = NULL WHERE id = ?`).run(user_id);
      return res.json({ success: true, message: 'Favorite game removed' });
    }

    // Verify user owns this game in user_games
    const game = db.prepare(`SELECT id FROM user_games WHERE id = ? AND user_id = ?`).get(gameId, user_id);
    
    if (!game) {
      return res.status(403).json({ error: 'Game not found in your library.' });
    }

    db.prepare(`UPDATE users SET favorite_game_id = ? WHERE id = ?`).run(gameId, user_id);
    res.json({ success: true, message: 'Favorite game updated' });
  } catch (err) {
    console.error('Favorite Game Update Error:', err);
    res.status(500).json({ error: 'Failed to update favorite game' });
  }
});

module.exports = router;
