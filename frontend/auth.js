/* ═══════════════════════════════════════════════════════════════════════════
   auth.js — Shared authentication utility
   Loaded on every page. Checks session, populates navbar, guards library.
   ═══════════════════════════════════════════════════════════════════════════ */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3000' 
  : 'https://the-compendium.onrender.com';
window.API_BASE = API_BASE;

const AUTH_API = `${API_BASE}/api/auth`;

// ── Escape helper (avoid XSS in username display) ─────────────────────────────
function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Fetch current session state ───────────────────────────────────────────────
async function fetchAuthState() {
  try {
    const res = await fetch(`${AUTH_API}/me`, {
      credentials: 'include',
      cache: 'no-store'
    });
    if (!res.ok) return { authenticated: false };
    const data = await res.json();
    console.log("ME RESPONSE:", data);
    return data;
  } catch {
    return { authenticated: false };
  }
}

// ── Render auth section in navbar ─────────────────────────────────────────────
function renderNavAuth(auth) {
  const slot = document.getElementById('nav-auth');
  if (!slot) return;

  if (auth.authenticated) {
    const initial = _esc(auth.user.username[0].toUpperCase());
    const uname   = _esc(auth.user.username);
    slot.innerHTML = `
      <div class="nav-user-chip">
        <span class="nav-avatar">${initial}</span>
        <span class="nav-uname">${uname}</span>
      </div>
      <button id="nav-logout-btn" class="nav-logout-btn">Logout</button>
    `;
    document.getElementById('nav-logout-btn').addEventListener('click', handleLogout);
  } else {
    slot.innerHTML = `
      <a href="/login.html"  class="nav-link">Login</a>
      <a href="/signup.html" class="nav-auth-cta">Sign Up</a>
    `;
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
async function handleLogout() {
  try {
    await fetch(`${AUTH_API}/logout`, { 
      method: 'POST',
      credentials: 'include'
    });
  } catch { /* ignore network errors */ }
  window.location.href = '/index.html';
}

// ── Main init — runs as soon as script is parsed ──────────────────────────────
window.__authReady = fetchAuthState().then(auth => {
  // Run nav update after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => renderNavAuth(auth));
  } else {
    renderNavAuth(auth);
  }
  return auth;
});

// ── Fetch user library game IDs for quick checking ────────────────────────────
window.__libraryReady = window.__authReady.then(async auth => {
  if (!auth.authenticated) return new Set();
  try {
    const res = await fetch(`${API_BASE}/api/user-games`, { credentials: 'include' });
    if (!res.ok) return new Set();
    const games = await res.json();
    return new Set(games.map(g => g.game_id));
  } catch {
    return new Set();
  }
});
