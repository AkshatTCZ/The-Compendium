const express = require('express');
const axios   = require('axios');
const router  = express.Router();
const db      = require('../db');

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE_URL = 'https://api.rawg.io/api';

// Shared mapper — keeps both list endpoints consistent
function mapGame(game) {
  return {
    id:               game.id,
    name:             game.name,
    background_image: game.background_image,
    rating:           game.rating,
    playtime:         game.playtime,
    genres:           game.genres ? game.genres.map(g => g.name) : [],
    released:         game.released || null,
    platforms:        game.platforms ? game.platforms.map(p => p.platform.name) : [],
  };
}

// ── GET /api/games?search=query ───────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    if (!RAWG_API_KEY) return res.status(500).json({ error: 'RAWG API key not configured' });

    const params = { key: RAWG_API_KEY };
    if (search) params.search = search;

    const response = await axios.get(`${RAWG_BASE_URL}/games`, { params });
    res.json(response.data.results.map(mapGame));
  } catch (error) { next(error); }
});

// ── GET /api/games/discover?ordering=&dates=&page_size= ───────────────────────
router.get('/discover', async (req, res, next) => {
  try {
    if (!RAWG_API_KEY) return res.status(500).json({ error: 'RAWG API key not configured' });

    const { ordering = '-rating', dates = '', page_size = '12' } = req.query;
    const params = {
      key:        RAWG_API_KEY,
      ordering,
      page_size:  Math.min(Number(page_size), 20),
      metacritic: '70,100',
    };
    if (dates) params.dates = dates;

    const response = await axios.get(`${RAWG_BASE_URL}/games`, { params });
    res.json(response.data.results.map(mapGame));
  } catch (error) { next(error); }
});

// ── GET /api/games/:id — full game detail + screenshots + local DB stats ──────
router.get('/:id', async (req, res, next) => {
  try {
    if (!RAWG_API_KEY) return res.status(500).json({ error: 'RAWG API key not configured' });

    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid game ID' });

    console.log("DETAILS ROUTE HIT", req.params.id);
    console.log("Fetching RAWG details...");

    // Fetch game detail and screenshots in parallel
    const [detailRes, screenshotsRes] = await Promise.all([
      axios.get(`${RAWG_BASE_URL}/games/${id}`,             { params: { key: RAWG_API_KEY } }),
      axios.get(`${RAWG_BASE_URL}/games/${id}/screenshots`, { params: { key: RAWG_API_KEY } }),
    ]);

    console.log("RAWG details fetched");
    console.log("Screenshots fetched");

    const g = detailRes.data;

    const game = {
      id:               g.id,
      name:             g.name,
      description_raw:  g.description_raw || '',
      background_image: g.background_image,
      metacritic:       g.metacritic || null,
      rating:           g.rating,
      ratings_count:    g.ratings_count,
      released:         g.released,
      playtime:         g.playtime,
      genres:           (g.genres        || []).map(x => x.name),
      platforms:        (g.platforms      || []).map(p => p.platform.name),
      developers:       (g.developers     || []).map(x => x.name),
      publishers:       (g.publishers     || []).map(x => x.name),
      stores:           (g.stores         || []).map(s => ({
        name: s.store.name,
        slug: s.store.slug,
        url:  s.url,
      })),
      screenshots: (screenshotsRes.data.results || []).slice(0, 8).map(s => s.image),
      clip:         g.clip ? g.clip.clip : null,
    };

    let gameData = { game, stats: { usersAdded: 0, averageUserScore: null } };

    try {
      const row = db.prepare(
        `SELECT COUNT(*) AS usersAdded, ROUND(AVG(rating),1) AS averageUserScore
         FROM user_games WHERE game_id = ?`
      ).get(id);

      console.log("DB stats fetched");

      if (row) {
        gameData.stats = {
          usersAdded: row.usersAdded || 0,
          averageUserScore: row.averageUserScore || null
        };
      }
    } catch (dbErr) {
      console.error('Local stats error:', dbErr.message);
      // Ignore DB errors, just fall through
    }
    
    console.log("Sending response");
    res.json(gameData);
  } catch (error) { 
    console.error("GAME DETAILS ERROR:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
