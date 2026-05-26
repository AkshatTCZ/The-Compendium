/* ═══════════════════════════════════════════════════════════════════════════
   The Compendium — script.js
   ═══════════════════════════════════════════════════════════════════════════ */

// ── DOM refs ──────────────────────────────────────────────────────────────────

const searchForm    = document.getElementById('search-form');
const searchInput   = document.getElementById('search-input');

// Views
const homeView      = document.getElementById('home-view');
const searchView    = document.getElementById('search-view');
const homeLoading   = document.getElementById('home-loading');
const homeSections  = document.getElementById('home-sections');

// Search results (inside search-view)
const resultsGrid     = document.getElementById('results-grid');
const loadingIndicator = document.getElementById('loading');
const errorMessage    = document.getElementById('error-message');

// Modal
const libraryModal  = document.getElementById('library-modal');
const modalCloseBtn = document.getElementById('modal-close');
const libraryForm   = document.getElementById('library-form');
const modalGameTitle = document.getElementById('modal-game-title');
const modalGameCover = document.getElementById('modal-game-cover');
const toastContainer = document.getElementById('toast-container');
const modalError    = document.getElementById('modal-error');

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE_URL      = 'http://localhost:3000/api/games';
const DISCOVER_URL      = 'http://localhost:3000/api/games/discover';
const USER_GAMES_API_URL = 'http://localhost:3000/api/user-games';

// ── State ─────────────────────────────────────────────────────────────────────

let currentSearchResults = [];    // games from the active search
let allDiscoveryGames    = [];    // flat pool from all discovery sections (for modal lookup)
let selectedGame         = null;  // game open in the Add-to-Library modal
let homeDataLoaded       = false; // fetch discovery only once

// ── Discovery section definitions ─────────────────────────────────────────────

const DISCOVERY_SECTIONS = [
  {
    id:       'trending',
    title:    '🔥 Trending Now',
    params:   { ordering: '-added', page_size: 12 },
  },
  {
    id:       'top-rated',
    title:    '⭐ All-Time Top Rated',
    params:   { ordering: '-metacritic', page_size: 12 },
  },
  {
    id:       'recent',
    title:    '🗓 Recent Releases',
    params: {
      ordering:  '-released',
      dates:     '2024-01-01,2025-12-31',
      page_size: 12,
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  showHomeView();
  loadDiscoverySections();
  wireSearchEvents();
  wireModalEvents();
});

// ═══════════════════════════════════════════════════════════════════════════
// VIEW SWITCHER
// ═══════════════════════════════════════════════════════════════════════════

function showHomeView() {
  homeView.classList.remove('hidden');
  searchView.classList.add('hidden');
}

function showSearchView() {
  searchView.classList.remove('hidden');
  homeView.classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════════════

function wireSearchEvents() {
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) {
      // Empty submit → go back home
      showHomeView();
      return;
    }
    showSearchView();
    await fetchGames(query);
  });

  // Live clear detection: if input is blanked, restore home immediately
  searchInput.addEventListener('input', () => {
    if (searchInput.value.trim() === '') {
      showHomeView();
      resultsGrid.innerHTML = '';
      errorMessage.classList.add('hidden');
    }
  });
}

async function fetchGames(query) {
  resultsGrid.innerHTML = '';
  errorMessage.classList.add('hidden');
  loadingIndicator.classList.remove('hidden');

  try {
    const response = await fetch(`${API_BASE_URL}?search=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`${response.status}`);

    const data = await response.json();
    currentSearchResults = data;

    if (data.length === 0) {
      errorMessage.textContent = 'No games found. Try a different search term.';
      errorMessage.classList.remove('hidden');
    } else {
      renderGameCards(data, resultsGrid, 'search');
    }
  } catch (err) {
    console.error('Search error:', err);
    errorMessage.textContent = 'Failed to fetch games. Make sure the server is running.';
    errorMessage.classList.remove('hidden');
  } finally {
    loadingIndicator.classList.add('hidden');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DISCOVERY SECTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function loadDiscoverySections() {
  if (homeDataLoaded) return;

  // Show skeletons while loading
  renderSkeletons();

  const results = await Promise.allSettled(
    DISCOVERY_SECTIONS.map(section => fetchSection(section))
  );

  // Hide skeletons
  homeLoading.classList.add('hidden');
  homeLoading.innerHTML = '';

  // Render each resolved section
  results.forEach((result, i) => {
    const section = DISCOVERY_SECTIONS[i];
    if (result.status === 'fulfilled' && result.value.length > 0) {
      allDiscoveryGames.push(...result.value);
      renderSection(section, result.value);
    }
    // Silently skip failed sections — don't block the rest
  });

  homeDataLoaded = true;
}

async function fetchSection(section) {
  const params = new URLSearchParams(section.params).toString();
  const response = await fetch(`${DISCOVER_URL}?${params}`);
  if (!response.ok) throw new Error(`Section ${section.id} failed: ${response.status}`);
  return response.json();
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function renderSkeletons() {
  homeLoading.classList.remove('hidden');
  homeLoading.innerHTML = DISCOVERY_SECTIONS.map(() => `
    <div class="discovery-section">
      <div class="skeleton-heading"></div>
      <div class="carousel-track">
        ${Array(6).fill('<div class="skeleton-card"></div>').join('')}
      </div>
    </div>
  `).join('');
}

// ── Section renderer ──────────────────────────────────────────────────────────

function renderSection(section, games) {
  const el = document.createElement('div');
  el.className = 'discovery-section';
  el.id = `section-${section.id}`;

  const track = document.createElement('div');
  track.className = 'carousel-track';

  const fragment = document.createDocumentFragment();
  games.forEach(game => {
    const card = buildCard(game, 'discovery');
    fragment.appendChild(card);
  });
  track.appendChild(fragment);

  el.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">${section.title}</h2>
    </div>
  `;
  el.appendChild(track);
  homeSections.appendChild(el);
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD BUILDER (shared by search + discovery)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {Object} game
 * @param {'search'|'discovery'} source  – affects which pool the modal looks up
 */
function buildCard(game, source) {
  const card = document.createElement('div');
  card.className = source === 'discovery' ? 'card discovery-card' : 'card';
  card.dataset.gameId = game.id;
  card.dataset.source = source;

  const imageUrl  = game.background_image || 'https://placehold.co/400x220/1d2130/6b7490?text=No+Image';
  const ratingStr = game.rating ? game.rating.toFixed(1) : 'N/A';
  const playStr   = game.playtime ? `${game.playtime}h avg` : null;
  const genres    = (game.genres || []).slice(0, 3).map(g => `<span class="genre-tag">${g}</span>`).join('');

  card.innerHTML = `
    <div class="card-img-wrapper">
      <img src="${imageUrl}" alt="${escHtml(game.name)}" class="card-img" loading="lazy" />
    </div>
    <div class="card-content">
      <h3 class="card-title">${escHtml(game.name)}</h3>
      <div class="card-stats">
        <div class="stat-row">
          <span class="stat-label">Rating</span>
          <span class="stat-value">⭐ ${ratingStr}</span>
        </div>
        ${playStr ? `<div class="stat-row">
          <span class="stat-label">Playtime</span>
          <span class="stat-value">⏱ ${playStr}</span>
        </div>` : ''}
        <div class="genres">${genres}</div>
      </div>
      <button class="add-lib-btn" data-game-id="${game.id}" data-source="${source}">
        + Add to Library
      </button>
    </div>
  `;

  card.querySelector('.add-lib-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openLibraryModal(parseInt(e.currentTarget.dataset.gameId, 10), e.currentTarget.dataset.source);
  });

  // Click anywhere else on the card → open game details modal
  wireCardDetailsClick(card, game, source);

  return card;
}

// Legacy wrapper used by search (renders into a container)
function renderGameCards(games, container, source) {
  const fragment = document.createDocumentFragment();
  games.forEach(game => fragment.appendChild(buildCard(game, source)));
  container.appendChild(fragment);
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL — Add to Library
// ═══════════════════════════════════════════════════════════════════════════

function wireModalEvents() {
  modalCloseBtn.addEventListener('click', closeLibraryModal);

  libraryModal.addEventListener('click', (e) => {
    if (e.target === libraryModal) closeLibraryModal();
  });

  libraryForm.addEventListener('submit', handleLibrarySubmit);
}

function openLibraryModal(gameId, source) {
  // Look in search results first, then discovery pool
  const pool = source === 'search' ? currentSearchResults : allDiscoveryGames;
  selectedGame = pool.find(g => g.id === gameId)
              ?? allDiscoveryGames.find(g => g.id === gameId)
              ?? currentSearchResults.find(g => g.id === gameId);

  if (!selectedGame) return;

  modalGameTitle.textContent = selectedGame.name;
  modalGameCover.src = selectedGame.background_image || 'https://placehold.co/600x300/1d2130/6b7490?text=No+Cover';
  modalGameCover.alt = selectedGame.name;

  // Dynamically populate platform dropdown from RAWG data
  const platformSelect = document.getElementById('platform');
  const supportedPlatforms = getSupportedPlatforms(selectedGame);
  populatePlatformDropdown(platformSelect, supportedPlatforms);

  modalError.classList.add('hidden');
  libraryForm.reset();
  // reset() clears the dynamically set platform — re-apply after reset
  populatePlatformDropdown(platformSelect, supportedPlatforms);

  libraryModal.classList.remove('hidden');
  requestAnimationFrame(() => libraryModal.classList.add('modal-visible'));
}

function closeLibraryModal() {
  libraryModal.classList.remove('modal-visible');
  libraryModal.addEventListener('transitionend', () => {
    libraryModal.classList.add('hidden');
    libraryForm.reset();
    modalError.classList.add('hidden');
    selectedGame = null;
  }, { once: true });
}

async function handleLibrarySubmit(e) {
  e.preventDefault();
  modalError.classList.add('hidden');
  if (!selectedGame) return;

  const fd = new FormData(libraryForm);
  const payload = {
    game_id:        selectedGame.id,
    game_name:      selectedGame.name,
    cover_image:    selectedGame.background_image || null,
    status:         fd.get('status'),
    rating:         fd.get('rating'),
    hours_played:   fd.get('hours_played'),
    completion:     fd.get('completion'),
    platform:       fd.get('platform'),
    times_completed: fd.get('times_completed'),
  };

  const submitBtn = document.getElementById('modal-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    const response = await fetch(USER_GAMES_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok) {
      modalError.textContent = response.status === 409
        ? 'Already in your library.'
        : (body.error || 'Failed to save game.');
      modalError.classList.remove('hidden');
      return;
    }

    closeLibraryModal();
    showToast('Game added to library!', 'success');
  } catch (err) {
    console.error('Save error:', err);
    modalError.textContent = 'Network error while saving.';
    modalError.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save to Library';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════════════════

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


/* ═══════════════════════════════════════════════════════════════════════════
   GAME DETAILS MODAL
   ═══════════════════════════════════════════════════════════════════════════ */

// ── DOM refs ──
const gdOverlay      = document.getElementById('game-details-modal');
const gdShell        = gdOverlay.querySelector('.gd-shell');
const gdClose        = document.getElementById('gd-close');
const gdSkeleton     = document.getElementById('gd-skeleton');
const gdHeroImg      = document.getElementById('gd-hero-img');
const gdGenres       = document.getElementById('gd-genres');
const gdTitle        = document.getElementById('gd-title');
const gdReleased     = document.getElementById('gd-released');
const gdMetacritic   = document.getElementById('gd-metacritic');
const gdAddBtn       = document.getElementById('gd-add-btn');
const gdStores       = document.getElementById('gd-stores');
const gdRating       = document.getElementById('gd-rating');
const gdUserScore    = document.getElementById('gd-user-score');
const gdUsersAdded   = document.getElementById('gd-users-added');
const gdPlaytime     = document.getElementById('gd-playtime');
const gdMedia        = document.getElementById('gd-media');
const gdMediaInner   = document.getElementById('gd-media-inner');
const gdDescWrap     = document.getElementById('gd-desc-wrap');
const gdDescription  = document.getElementById('gd-description');
const gdReadMore     = document.getElementById('gd-read-more');
const gdPlatformsWrap = document.getElementById('gd-platforms-wrap');
const gdPlatforms    = document.getElementById('gd-platforms');
const gdCredits      = document.getElementById('gd-credits');
const gdDevs         = document.getElementById('gd-devs');
const gdPubs         = document.getElementById('gd-pubs');

// ── In-memory cache: gameId → { game, stats } ──
const detailsCache = new Map();

// ── Game whose card triggered the GD modal (used by the hero Add btn) ──
let gdActiveGame = null;

// ── Store slug → display info ──
const STORE_META = {
  steam:             { label: 'Steam',          emoji: '🎮' },
  'playstation-store':{ label: 'PlayStation',   emoji: '🎮' },
  'xbox-store':      { label: 'Xbox',           emoji: '🟢' },
  'epic-games':      { label: 'Epic Games',     emoji: '🔲' },
  gog:               { label: 'GOG',            emoji: '🪐' },
  nintendo:          { label: 'Nintendo',        emoji: '🔴' },
  'apple-appstore':  { label: 'App Store',       emoji: '🍎' },
  'google-play':     { label: 'Google Play',     emoji: '▶️' },
  itch:              { label: 'itch.io',         emoji: '🎲' },
};

// ── Wire events ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  gdClose.addEventListener('click', closeGdModal);

  gdOverlay.addEventListener('click', (e) => {
    if (e.target === gdOverlay) closeGdModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !gdOverlay.classList.contains('hidden')) closeGdModal();
  });

  gdAddBtn.addEventListener('click', () => {
    if (!gdActiveGame) return;
    closeGdModal();
    // Small delay so GD modal finishes closing before Add modal opens
    setTimeout(() => openLibraryModal(gdActiveGame.id, gdActiveGame._source), 250);
  });

  gdReadMore.addEventListener('click', () => {
    gdDescription.classList.toggle('expanded');
    gdReadMore.textContent = gdDescription.classList.contains('expanded')
      ? 'Show less ↑'
      : 'Read more ↓';
  });
});

// ── Card click wiring — called after buildCard() ─────────────────────────────

function wireCardDetailsClick(card, game, source) {
  card.style.cursor = 'pointer';
  card.addEventListener('click', (e) => {
    // Ignore clicks that originated on the Add button (it stops propagation)
    if (e.target.closest('.add-lib-btn')) return;
    openGdModal(game, source);
  });
}

// ── Open ─────────────────────────────────────────────────────────────────────

async function openGdModal(game, source) {
  gdActiveGame = { ...game, _source: source };

  // Show overlay + skeleton immediately
  gdOverlay.classList.remove('hidden');
  gdSkeleton.classList.remove('gd-skel-hidden');
  resetGdBody();
  requestAnimationFrame(() => gdOverlay.classList.add('gd-visible'));

  // Prefill hero with what we already know (no wait)
  gdHeroImg.src = game.background_image || '';
  gdHeroImg.alt = game.name;
  gdTitle.textContent = game.name;
  document.body.style.overflow = 'hidden';

  // Fetch detail (cached)
  let detail;
  if (detailsCache.has(game.id)) {
    detail = detailsCache.get(game.id);
  } else {
    try {
      const res = await fetch(`${API_BASE_URL}/${game.id}`);
      if (!res.ok) throw new Error(res.status);
      detail = await res.json();
      detailsCache.set(game.id, detail);
    } catch (err) {
      console.error('GD fetch error:', err);
      // Still hide skeleton so the prefilled hero is at least visible
      gdSkeleton.classList.add('gd-skel-hidden');
      return;
    }
  }

  populateGdModal(detail);
  gdSkeleton.classList.add('gd-skel-hidden');
}

// ── Close ────────────────────────────────────────────────────────────────────

function closeGdModal() {
  gdOverlay.classList.remove('gd-visible');
  document.body.style.overflow = '';
  gdOverlay.addEventListener('transitionend', () => {
    gdOverlay.classList.add('hidden');
    gdMediaInner.innerHTML = '';   // stop any video
  }, { once: true });
}

// ── Reset body before populating ─────────────────────────────────────────────

function resetGdBody() {
  gdGenres.innerHTML      = '';
  gdTitle.textContent     = '';
  gdReleased.textContent  = '';
  gdMetacritic.textContent = '';
  gdMetacritic.className  = 'gd-metacritic hidden';
  gdStores.innerHTML      = '';
  gdStores.classList.add('hidden');
  gdRating.textContent    = '—';
  gdUserScore.textContent = '—';
  gdUsersAdded.textContent= '—';
  gdPlaytime.textContent  = '—';
  gdMedia.classList.add('hidden');
  gdMediaInner.innerHTML  = '';
  gdDescWrap.classList.add('hidden');
  gdDescription.classList.remove('expanded');
  gdDescription.textContent = '';
  gdReadMore.classList.add('hidden');
  gdReadMore.textContent    = 'Read more ↓';
  gdPlatformsWrap.classList.add('hidden');
  gdPlatforms.innerHTML     = '';
  gdCredits.classList.add('hidden');
  gdDevs.innerHTML = '';
  gdPubs.innerHTML = '';
}

// ── Populate ─────────────────────────────────────────────────────────────────

function populateGdModal({ game, stats }) {
  // ── Hero
  gdHeroImg.src  = game.background_image || '';
  gdTitle.textContent = game.name;

  game.genres.slice(0, 4).forEach(g => {
    const chip = document.createElement('span');
    chip.className   = 'gd-genre-chip';
    chip.textContent = g;
    gdGenres.appendChild(chip);
  });

  if (game.released) {
    gdReleased.textContent = new Date(game.released).getFullYear();
  }

  if (game.metacritic) {
    gdMetacritic.textContent = `MC ${game.metacritic}`;
    gdMetacritic.classList.remove('hidden');
    if (game.metacritic >= 75)      gdMetacritic.classList.add('mc-green');
    else if (game.metacritic >= 50) gdMetacritic.classList.add('mc-yellow');
    else                            gdMetacritic.classList.add('mc-red');
  }

  // ── Stores
  if (game.stores && game.stores.length > 0) {
    game.stores.forEach(s => {
      const meta  = STORE_META[s.slug] || { label: s.name, emoji: '🛒' };
      const a     = document.createElement('a');
      a.href      = s.url || '#';
      a.target    = '_blank';
      a.rel       = 'noopener noreferrer';
      a.className = `gd-store-btn store-${s.slug}`;
      a.innerHTML = `<span>${meta.emoji}</span> ${meta.label}`;
      gdStores.appendChild(a);
    });
    gdStores.classList.remove('hidden');
  }

  // ── Stats
  gdRating.textContent      = game.rating       ? `${game.rating.toFixed(1)} ★` : '—';
  gdUserScore.textContent   = stats.averageUserScore ? `${stats.averageUserScore}/10` : '—';
  gdUsersAdded.textContent  = stats.usersAdded  ? String(stats.usersAdded)     : '0';
  gdPlaytime.textContent    = game.playtime     ? `${game.playtime}h`          : '—';

  // ── Media: clip > screenshots
  if (game.clip) {
    gdMediaInner.innerHTML = `
      <div class="gd-video-wrap">
        <video src="${escHtml(game.clip)}" controls preload="none" poster="${escHtml(game.background_image || '')}"></video>
      </div>`;
    gdMedia.classList.remove('hidden');
  } else if (game.screenshots && game.screenshots.length > 0) {
    const track = document.createElement('div');
    track.className = 'gd-screenshots';
    game.screenshots.forEach(url => {
      const img = document.createElement('img');
      img.src   = url;
      img.alt   = game.name;
      img.className  = 'gd-screenshot';
      img.loading    = 'lazy';
      track.appendChild(img);
    });
    gdMediaInner.appendChild(track);
    gdMedia.classList.remove('hidden');
  }

  // ── Description
  if (game.description_raw && game.description_raw.trim()) {
    gdDescription.textContent = game.description_raw.trim();
    gdDescWrap.classList.remove('hidden');
    // Show "Read more" only if text is actually long
    if (game.description_raw.length > 400) {
      gdReadMore.classList.remove('hidden');
    }
  }

  // ── Platforms
  if (game.platforms && game.platforms.length > 0) {
    const supported = getSupportedPlatforms({ platforms: game.platforms });
    // Dedupe labels
    const seen = new Set();
    supported.forEach(p => {
      if (seen.has(p.label)) return;
      seen.add(p.label);
      const badge = document.createElement('span');
      badge.className   = 'gd-platform-badge';
      badge.textContent = p.label;
      gdPlatforms.appendChild(badge);
    });
    gdPlatformsWrap.classList.remove('hidden');
  }

  // ── Credits
  const hasDev = game.developers && game.developers.length > 0;
  const hasPub = game.publishers && game.publishers.length > 0;

  if (hasDev || hasPub) {
    if (hasDev) {
      gdDevs.innerHTML = `
        <h3 class="gd-section-heading">Developer${game.developers.length > 1 ? 's' : ''}</h3>
        <p class="gd-credit-names">${game.developers.join(', ')}</p>`;
    }
    if (hasPub) {
      gdPubs.innerHTML = `
        <h3 class="gd-section-heading">Publisher${game.publishers.length > 1 ? 's' : ''}</h3>
        <p class="gd-credit-names">${game.publishers.join(', ')}</p>`;
    }
    gdCredits.classList.remove('hidden');
  }
}
