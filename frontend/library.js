const libraryContainer  = document.getElementById('library-container');
const loadingIndicator  = document.getElementById('loading');
const errorMessage      = document.getElementById('error-message');
const libraryCount      = document.getElementById('library-count');
const btnGridView       = document.getElementById('btn-grid-view');
const btnListView       = document.getElementById('btn-list-view');

// Details modal: shared
const detailsModal      = document.getElementById('details-modal');
const detailsClose      = document.getElementById('details-close');   // ✕ overlay btn
// View panel
const viewPanel         = document.getElementById('details-view-panel');
const detailsCover      = document.getElementById('details-cover');
const detailsTitle      = document.getElementById('details-title');
const detailsStatus     = document.getElementById('details-status');
const detailsRating     = document.getElementById('details-rating');
const detailsHours      = document.getElementById('details-hours');
const detailsCompletion = document.getElementById('details-completion');
const detailsPlatform   = document.getElementById('details-platform');
const detailsDate       = document.getElementById('details-date');
const detailsTimesCompleted = document.getElementById('details-times-completed');
const detailsEditBtn    = document.getElementById('details-edit-btn');
const detailsCloseBtn   = document.getElementById('details-close-btn');
// Edit panel
const editPanel         = document.getElementById('details-edit-panel');
const editTitle         = document.getElementById('details-edit-title');
const editError         = document.getElementById('details-edit-error');
const editForm          = document.getElementById('details-edit-form');
const editStatus        = document.getElementById('edit-status');
const editRating        = document.getElementById('edit-rating');
const editHours         = document.getElementById('edit-hours');
const editCompletion    = document.getElementById('edit-completion');
const editTimesCompleted = document.getElementById('edit-times-completed');
const editPlatform      = document.getElementById('edit-platform');
const detailsSaveBtn    = document.getElementById('details-save-btn');
const detailsCancelBtn  = document.getElementById('details-cancel-btn');
// Delete section
const detailsDeleteBtn        = document.getElementById('details-delete-btn');
const deleteConfirmPanel      = document.getElementById('delete-confirm-panel');
const detailsConfirmDeleteBtn = document.getElementById('details-confirm-delete-btn');
const detailsCancelDeleteBtn  = document.getElementById('details-cancel-delete-btn');
const deleteError             = document.getElementById('delete-error');

const USER_GAMES_API_URL = 'http://localhost:3000/api/user-games';

// ── Shared state ─────────────────────────────────────────────────────────────
let cachedGames    = [];
let currentView    = localStorage.getItem('libraryView') || 'grid';
let activeGame     = null;   // game object currently open in modal

const STATUS_COLORS = {
  plan_to_play: '#9ca3af',
  playing:      '#6366f1',
  completed:    '#10b981',
  on_hold:      '#f59e0b',
  dropped:      '#ef4444'
};

const STATUS_LABELS = {
  plan_to_play: 'Plan to Play',
  playing:      'Playing',
  completed:    'Completed',
  on_hold:      'On Hold',
  dropped:      'Dropped'
};

const COMPLETION_LABELS = {
  none:  'Not Completed',
  story: 'Story Complete',
  '100%': '100% Complete'
};

// Returns override label when game is in a "replaying" state, null otherwise
function replayLabel(game) {
  if (game.status === 'playing' && game.completion === '100%') return 'Replaying';
  return null;
}

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // ── Auth guard: redirect to login if no session ──────────────────────────
  const auth = await window.__authReady;
  if (!auth.authenticated) {
    window.location.href = '/login.html?next=library';
    return;
  }

  applyViewState();
  fetchLibrary();

  btnGridView.addEventListener('click', () => setView('grid'));
  btnListView.addEventListener('click', () => setView('list'));

  // Modal: close triggers
  detailsClose.addEventListener('click', closeDetailsModal);
  detailsCloseBtn.addEventListener('click', closeDetailsModal);
  detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) closeDetailsModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!editPanel.classList.contains('hidden')) {
        switchToView();       // Escape in edit → back to view, don't close
      } else {
        closeDetailsModal();
      }
    }
  });

  // Modal: edit mode triggers
  detailsEditBtn.addEventListener('click', switchToEdit);
  detailsCancelBtn.addEventListener('click', switchToView);

  // Modal: save handler
  editForm.addEventListener('submit', handleSave);

  // Modal: delete handlers
  detailsDeleteBtn.addEventListener('click', () => {
    resetDeleteUI();
    deleteConfirmPanel.classList.remove('hidden');
    detailsDeleteBtn.classList.add('hidden');
  });
  detailsCancelDeleteBtn.addEventListener('click', () => {
    resetDeleteUI();
  });
  detailsConfirmDeleteBtn.addEventListener('click', deleteGame);
});

// ── View toggle ───────────────────────────────────────────────────────────────

function setView(view) {
  currentView = view;
  localStorage.setItem('libraryView', view);
  applyViewState();
  if (cachedGames.length > 0) renderLibrary(cachedGames);
}

function applyViewState() {
  btnGridView.classList.toggle('active', currentView === 'grid');
  btnListView.classList.toggle('active', currentView === 'list');
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchLibrary() {
  libraryContainer.innerHTML = '';
  errorMessage.classList.add('hidden');
  loadingIndicator.classList.remove('hidden');

  try {
    const response = await fetch(USER_GAMES_API_URL);
    if (!response.ok) throw new Error(`Server returned ${response.status}`);

    const data = await response.json();

    if (!data.games || data.games.length === 0) {
      errorMessage.innerHTML = `
        <strong>Your library is empty.</strong><br>
        <a href="index.html" style="color:#6366f1;text-decoration:underline">Search and add your first game →</a>
      `;
      errorMessage.classList.remove('hidden');
    } else {
      cachedGames = data.games;
      libraryCount.textContent = `${data.games.length} game${data.games.length !== 1 ? 's' : ''}`;
      renderLibrary(cachedGames);
    }
  } catch (err) {
    console.error('Fetch error:', err);
    errorMessage.textContent = 'Failed to load your library. Ensure the backend is running.';
    errorMessage.classList.remove('hidden');
  } finally {
    loadingIndicator.classList.add('hidden');
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderLibrary(games, preserveScroll = false) {
  const scrollY = preserveScroll ? window.scrollY : 0;
  libraryContainer.innerHTML = '';
  currentView === 'grid' ? renderGrid(games) : renderList(games);
  if (preserveScroll) window.scrollTo(0, scrollY);
}

function renderGrid(games) {
  const grid = document.createElement('div');
  grid.className = 'grid';
  const fragment = document.createDocumentFragment();

  games.forEach(game => {
    const card = document.createElement('div');
    card.className = 'card library-card';
    card.setAttribute('role', 'button');
    card.setAttribute('data-game-id', game.id);
    card.setAttribute('title', `View details for ${game.name}`);

    const imageUrl  = game.cover  || 'https://via.placeholder.com/400x220?text=No+Image';
    const ratingStr = game.rating ? `${game.rating}/10` : 'Unrated';
    const hoursStr  = game.hours  ? `${game.hours}h`    : '0h';
    const sColor    = STATUS_COLORS[game.status] || '#9ca3af';
    const sLabel    = replayLabel(game) || STATUS_LABELS[game.status] || 'Unknown';

    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${imageUrl}" alt="${game.name}" class="card-img" loading="lazy" />
        <span class="status-badge" style="background-color:${sColor}">${sLabel}</span>
      </div>
      <div class="card-content">
        <h3 class="card-title">${game.name}</h3>
        <div class="card-stats">
          <div class="stat-row">
            <span class="stat-label">Rating</span>
            <span class="stat-value">⭐ ${ratingStr}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Hours</span>
            <span class="stat-value">⏱ ${hoursStr}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Platform</span>
            <span class="stat-value platform-tag">${game.platform}</span>
          </div>
          <div class="stat-row" style="border:none">
            <span class="stat-label">Completion</span>
            <span class="stat-value">${game.completion}</span>
          </div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openGameDetails(game));
    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
  libraryContainer.appendChild(grid);
}

function renderList(games) {
  const list = document.createElement('div');
  list.className = 'list-view';
  const fragment = document.createDocumentFragment();

  games.forEach(game => {
    const row = document.createElement('div');
    row.className = 'list-row';
    row.setAttribute('role', 'button');
    row.setAttribute('data-game-id', game.id);
    row.setAttribute('title', `View details for ${game.name}`);

    const imageUrl  = game.cover  || 'https://via.placeholder.com/50x70?text=?';
    const ratingStr = game.rating ? `⭐ ${game.rating}/10` : '⭐ —';
    const hoursStr  = game.hours  ? `⏱ ${game.hours}h`   : '⏱ 0h';
    const sColor    = STATUS_COLORS[game.status] || '#9ca3af';
    const sLabel    = replayLabel(game) || STATUS_LABELS[game.status] || 'Unknown';

    row.innerHTML = `
      <img src="${imageUrl}" alt="${game.name}" class="list-cover" loading="lazy" />
      <div class="list-info">
        <div class="list-name">${game.name}</div>
        <div class="list-meta">
          <span class="list-status-badge" style="background-color:${sColor}">${sLabel}</span>
          <span class="list-meta-item">${ratingStr}</span>
          <span class="list-meta-item">${hoursStr}</span>
          <span class="list-meta-item platform-tag">${game.platform}</span>
          <span class="list-meta-item muted">${game.completion}</span>
        </div>
      </div>
      <svg class="list-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6,3 11,8 6,13"/>
      </svg>
    `;

    row.addEventListener('click', () => openGameDetails(game));
    fragment.appendChild(row);
  });

  list.appendChild(fragment);
  libraryContainer.appendChild(list);
}

// ── Details modal: VIEW mode ──────────────────────────────────────────────────

function openGameDetails(game) {
  activeGame = game;

  const sColor          = STATUS_COLORS[game.status] || '#9ca3af';
  const sLabel          = STATUS_LABELS[game.status] || 'Unknown';
  const completionLabel = COMPLETION_LABELS[game.completion] || game.completion;

  detailsCover.src = game.cover || 'https://via.placeholder.com/600x300?text=No+Cover';
  detailsCover.alt = game.name;
  detailsTitle.textContent = game.name;

  detailsStatus.innerHTML   = `<span class="inline-status-badge" style="background-color:${sColor}">${replayLabel(game) || sLabel}</span>`;
  detailsRating.textContent = game.rating ? `${game.rating} / 10` : '—';
  detailsHours.textContent  = game.hours  ? `${game.hours} hours`  : '0 hours';
  detailsCompletion.textContent = completionLabel;
  detailsPlatform.textContent   = game.platform ? game.platform.toUpperCase() : '—';
  detailsDate.textContent = game.createdAt
    ? new Date(game.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';
  // Times completed — show meaningful text
  const tc = game.timesCompleted ?? 0;
  detailsTimesCompleted.textContent = tc > 1 ? `${tc}×` : tc === 1 ? 'Once' : '—';

  // Always open in view mode
  showPanel('view');

  detailsModal.classList.remove('hidden');
  requestAnimationFrame(() => detailsModal.classList.add('modal-visible'));
}

function closeDetailsModal() {
  detailsModal.classList.remove('modal-visible');
  detailsModal.addEventListener('transitionend', () => {
    detailsModal.classList.add('hidden');
    switchToView(); // reset to view panel for next open
  }, { once: true });
}

// ── Details modal: panel switching ───────────────────────────────────────────

function showPanel(mode) {
  viewPanel.classList.toggle('hidden', mode !== 'view');
  editPanel.classList.toggle('hidden', mode !== 'edit');
}

function switchToView() {
  showPanel('view');
  resetDeleteUI();
}

function resetDeleteUI() {
  deleteConfirmPanel.classList.add('hidden');
  deleteError.classList.add('hidden');
  detailsDeleteBtn.classList.remove('hidden');
  detailsDeleteBtn.disabled = false;
  detailsDeleteBtn.textContent = 'Remove from Library';
  detailsConfirmDeleteBtn.disabled = false;
  detailsConfirmDeleteBtn.textContent = 'Yes, Remove';
}

function switchToEdit() {
  if (!activeGame) return;

  // Pre-fill the form from the current game object
  editTitle.textContent        = activeGame.name;
  editStatus.value             = activeGame.status      || 'plan_to_play';
  editRating.value             = activeGame.rating      ?? '';
  editHours.value              = activeGame.hours       ?? 0;
  editCompletion.value         = activeGame.completion  || 'none';
  editTimesCompleted.value     = activeGame.timesCompleted ?? 0;

  // Platform: use full list (RAWG data not available here), pre-select stored value
  populatePlatformDropdown(editPlatform, ALL_PLATFORMS, activeGame.platform || 'pc');

  editError.classList.add('hidden');

  showPanel('edit');
}

// ── PUT: save changes ─────────────────────────────────────────────────────────

async function handleSave(e) {
  e.preventDefault();
  editError.classList.add('hidden');

  const payload = {
    status:          editStatus.value,
    rating:          editRating.value         === '' ? null : Number(editRating.value),
    hours_played:    editHours.value          === '' ? 0    : Number(editHours.value),
    completion:      editCompletion.value,
    platform:        editPlatform.value,
    times_completed: editTimesCompleted.value === '' ? 0    : Number(editTimesCompleted.value)
  };

  detailsSaveBtn.disabled    = true;
  detailsSaveBtn.textContent = 'Saving…';

  try {
    const response = await fetch(`${USER_GAMES_API_URL}/${activeGame.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    const body = await response.json();

    if (!response.ok) {
      editError.textContent = body.error || 'Failed to save changes.';
      editError.classList.remove('hidden');
      return;
    }

    // ── Optimistic local update ─────────────────────────────────────────────
    const idx = cachedGames.findIndex(g => g.id === activeGame.id);
    if (idx !== -1) {
      cachedGames[idx] = {
        ...cachedGames[idx],
        status:         payload.status,
        rating:         payload.rating,
        hours:          payload.hours_played,
        completion:     payload.completion,
        platform:       payload.platform,
        timesCompleted: payload.times_completed
      };
      activeGame = cachedGames[idx];
    }

    // Re-render library preserving scroll, flip modal back to view mode
    renderLibrary(cachedGames, true);
    openGameDetails(activeGame);   // refreshes view panel with new values
    showToast('Changes saved!', 'success');
    highlightEntry(activeGame.id);

  } catch (err) {
    console.error('Save error:', err);
    editError.textContent = 'Network error. Please try again.';
    editError.classList.remove('hidden');
  } finally {
    detailsSaveBtn.disabled    = false;
    detailsSaveBtn.textContent = 'Save Changes';
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ── Post-save highlight ───────────────────────────────────────────────────────
// Briefly flashes the updated card or list row to confirm which entry changed.

function highlightEntry(gameId) {
  const el = libraryContainer.querySelector(`[data-game-id="${gameId}"]`);
  if (!el) return;
  el.classList.add('entry-highlight');
  setTimeout(() => el.classList.remove('entry-highlight'), 1200);
}

// ── DELETE: remove game ───────────────────────────────────────────────────────

async function deleteGame() {
  if (!activeGame) return;

  deleteError.classList.add('hidden');
  detailsConfirmDeleteBtn.disabled = true;
  detailsConfirmDeleteBtn.textContent = 'Removing…';
  detailsCancelDeleteBtn.disabled = true;

  try {
    console.log('[DELETE] activeGame:', activeGame.id, activeGame.name);
    const response = await fetch(`${USER_GAMES_API_URL}/${activeGame.id}`, {
      method: 'DELETE'
    });

    // Safely parse — response may not be JSON if route isn't registered
    let body = {};
    try { body = await response.json(); } catch (_) {}

    if (!response.ok) {
      deleteError.textContent = body.error || `Server error ${response.status}`;
      deleteError.classList.remove('hidden');
      return;
    }

    // Remove from local state (no refetch)
    const removedId = activeGame.id;
    cachedGames = cachedGames.filter(g => g.id !== removedId);
    libraryCount.textContent = `${cachedGames.length} game${cachedGames.length !== 1 ? 's' : ''}`;

    // Close modal first, then re-render
    closeDetailsModal();
    renderLibrary(cachedGames, true);
    showToast('Game removed from library.', 'success');

    // Show empty state if library is now empty
    if (cachedGames.length === 0) {
      libraryContainer.innerHTML = '';
      errorMessage.innerHTML = `
        <strong>Your library is empty.</strong><br>
        <a href="index.html" style="color:#6366f1;text-decoration:underline">Search and add your first game →</a>
      `;
      errorMessage.classList.remove('hidden');
    }

  } catch (err) {
    console.error('Delete error:', err);
    deleteError.textContent = 'Network error. Please try again.';
    deleteError.classList.remove('hidden');
  } finally {
    detailsConfirmDeleteBtn.disabled = false;
    detailsConfirmDeleteBtn.textContent = 'Yes, Remove';
    detailsCancelDeleteBtn.disabled = false;
  }
}
