document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard
  const auth = await window.__authReady;
  if (!auth.authenticated) {
    window.location.href = '/login.html?next=dashboard';
    return;
  }

  fetchDashboardStats();
});

const API_DASHBOARD = window.API_BASE + '/api/dashboard/stats';

async function fetchDashboardStats() {
  const loading = document.getElementById('dashboard-loading');
  const content = document.getElementById('dashboard-content');
  const errorEl = document.getElementById('dashboard-error');

  try {
    const res = await fetch(API_DASHBOARD, { credentials: 'include' });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    
    const stats = await res.json();
    renderDashboard(stats);
    
    loading.classList.add('hidden');
    content.classList.remove('hidden');
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    loading.classList.add('hidden');
    errorEl.textContent = 'Failed to load dashboard data. Ensure backend is running.';
    errorEl.classList.remove('hidden');
  }
}

function renderDashboard(stats) {
  // ── 1. Favorite Game Showcase ──
  const heroShowcase = document.getElementById('hero-showcase');
  const emptyShowcase = document.getElementById('empty-showcase');
  
  if (stats.featuredFavoriteGame) {
    const game = stats.featuredFavoriteGame;
    document.getElementById('fav-bg').src = game.cover_image || 'https://via.placeholder.com/1200x500?text=No+Image';
    document.getElementById('fav-title').textContent = game.game_name;
    document.getElementById('fav-rating').textContent = game.rating ? `⭐ ${game.rating}/10` : 'Unrated';
    document.getElementById('fav-hours').textContent = `⏱ ${game.hours_played}h`;
    document.getElementById('fav-completion').textContent = game.completion === '100%' ? '🏆 100%' : (game.completion === 'story' ? '📚 Story' : '');
    heroShowcase.classList.remove('hidden');
  } else {
    emptyShowcase.classList.remove('hidden');
  }

  // ── 2. Top Stats ──
  document.getElementById('stat-archetype').textContent = stats.playerArchetype;
  document.getElementById('stat-total-games').textContent = stats.totalGames;
  document.getElementById('stat-total-hours').textContent = `${stats.totalHours}h`;
  document.getElementById('stat-avg-rating').textContent = `${stats.averageRating} ★`;

  // ── 3. Platform Breakdown ──
  const platformBars = document.getElementById('platform-bars');
  if (stats.platformBreakdown.length > 0) {
    const maxCount = Math.max(...stats.platformBreakdown.map(p => p.count));
    stats.platformBreakdown.forEach(p => {
      const pct = Math.round((p.count / maxCount) * 100);
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML = `
        <div class="bar-label">${p.platform.toUpperCase()} <span class="bar-count">(${p.count})</span></div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%"></div>
        </div>
      `;
      platformBars.appendChild(row);
    });
  } else {
    platformBars.innerHTML = '<p class="muted">No platform data</p>';
  }

  // ── 4. Genre Breakdown ──
  const genreChips = document.getElementById('genre-chips');
  if (stats.genreBreakdown.length > 0) {
    stats.genreBreakdown.forEach(g => {
      const chip = document.createElement('div');
      chip.className = 'dash-genre-chip';
      chip.innerHTML = `${g.genre} <span class="chip-count">${g.count}</span>`;
      genreChips.appendChild(chip);
    });
  } else {
    genreChips.innerHTML = '<p class="muted">No genre data</p>';
  }

  // ── 5. Completion Analytics ──
  const completionBar = document.getElementById('completion-bar');
  const completionLegend = document.getElementById('completion-legend');
  const cTotal = stats.totalGames;
  
  const cStats = [
    { key: 'completed', label: 'Completed', count: stats.completedGames, color: '#10b981' },
    { key: 'playing', label: 'Playing', count: stats.currentlyPlaying, color: '#6366f1' },
    { key: 'backlog', label: 'Backlog', count: stats.backlogCount, color: '#f59e0b' },
    { key: 'dropped', label: 'Dropped', count: stats.droppedGames, color: '#ef4444' }
  ];

  if (cTotal > 0) {
    cStats.forEach(s => {
      if (s.count > 0) {
        const pct = (s.count / cTotal) * 100;
        
        // Segments
        const seg = document.createElement('div');
        seg.className = 'seg-slice';
        seg.style.width = `${pct}%`;
        seg.style.backgroundColor = s.color;
        seg.title = `${s.label}: ${s.count} (${Math.round(pct)}%)`;
        completionBar.appendChild(seg);

        // Legend
        const leg = document.createElement('div');
        leg.className = 'leg-item';
        leg.innerHTML = `<span class="leg-dot" style="background-color:${s.color}"></span>${s.label} (${s.count})`;
        completionLegend.appendChild(leg);
      }
    });
  } else {
    completionBar.innerHTML = '<div class="seg-slice" style="width:100%;background-color:#374151"></div>';
    completionLegend.innerHTML = '<p class="muted">No completion data</p>';
  }

  // ── 6. Replay Analytics ──
  document.getElementById('stat-total-replays').textContent = stats.totalReplays;
  document.getElementById('stat-most-replayed').textContent = stats.mostReplayedGame ? `${stats.mostReplayedGame.game_name} (${stats.mostReplayedGame.times_completed}x)` : 'None';

  // ── 7. Recent Games ──
  const recentGamesEl = document.getElementById('recent-games');
  if (stats.recentGames.length > 0) {
    stats.recentGames.forEach(g => {
      recentGamesEl.appendChild(createMiniCard(g));
    });
  } else {
    recentGamesEl.innerHTML = '<p class="muted">No recent games</p>';
  }

  // ── 8. Recommendations ──
  const recGamesEl = document.getElementById('recommendation-games');
  if (stats.recommendationGames.length > 0) {
    stats.recommendationGames.forEach(g => {
      recGamesEl.appendChild(createRecCard(g));
    });
  } else {
    recGamesEl.innerHTML = '<p class="muted">Not enough data to recommend games yet.</p>';
  }
}

function createMiniCard(game) {
  const card = document.createElement('div');
  card.className = 'mini-card';
  card.style.cursor = 'pointer';
  const imgUrl = game.cover_image || 'https://via.placeholder.com/150x200?text=No+Cover';
  card.innerHTML = `
    <img src="${imgUrl}" alt="${game.game_name}">
    <div class="mini-card-title">${game.game_name}</div>
  `;
  
  card.addEventListener('click', () => {
    const normalizedGame = {
      id: game.game_id,
      name: game.game_name,
      background_image: game.cover_image
    };
    if (window.openGameDetails) window.openGameDetails(normalizedGame, 'dashboard');
  });

  return card;
}

function createRecCard(game) {
  const card = document.createElement('div');
  card.className = 'mini-card';
  card.style.cursor = 'pointer';
  const imgUrl = game.cover_image || 'https://via.placeholder.com/150x200?text=No+Cover';
  const avg = game.avg_rating ? game.avg_rating.toFixed(1) : '?';
  card.innerHTML = `
    <img src="${imgUrl}" alt="${game.game_name}">
    <div class="mini-card-title">${game.game_name}</div>
    <div class="mini-card-meta">⭐ ${avg}</div>
    <div style="padding: 0 0.8rem 0.8rem;">
      <button class="add-lib-btn" style="width:100%; font-size:0.75rem; padding:6px; margin-top:0;">+ Add to Library</button>
    </div>
  `;

  card.addEventListener('click', () => {
    const normalizedGame = {
      id: game.game_id,
      name: game.game_name,
      background_image: game.cover_image,
      rating: game.avg_rating || 0
    };
    if (window.openGameDetails) window.openGameDetails(normalizedGame, 'dashboard');
  });

  const addBtn = card.querySelector('.add-lib-btn');
  if (addBtn) {
    if (window.__libraryReady) {
      window.__libraryReady.then(libSet => {
        if (libSet.has(game.game_id)) {
          addBtn.textContent = '✓ In Library';
          addBtn.disabled = true;
          addBtn.style.opacity = '0.7';
          addBtn.style.cursor = 'default';
        }
      });
    }

    addBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent opening Game Details modal
      if (typeof openLibraryModal === 'function') {
        const normalizedGame = {
          id: game.game_id,
          name: game.game_name,
          background_image: game.cover_image
        };
        // Temporarily assign to gdActiveGame so openLibraryModal fallback can find it
        window.gdActiveGame = normalizedGame; 
        openLibraryModal(game.game_id, 'dashboard');
      }
    });
  }

  return card;
}
