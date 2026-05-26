/* ═══════════════════════════════════════════════════════════════════════════
   auth.js — Shared authentication utility
   Loaded on every page. Checks session, populates navbar, guards library.
   ═══════════════════════════════════════════════════════════════════════════ */

const AUTH_API = '/api/auth';

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
    const res = await fetch(`${AUTH_API}/me`);
    if (!res.ok) return { authenticated: false };
    return await res.json();
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
    await fetch(`${AUTH_API}/logout`, { method: 'POST' });
  } catch { /* ignore network errors */ }
  window.location.href = '/index.html';
}

// ── Main init — runs as soon as script is parsed ──────────────────────────────
// Exposed on window so library.js can await it instead of making a second fetch.
window.__authReady = fetchAuthState().then(auth => {
  // Run nav update after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => renderNavAuth(auth));
  } else {
    renderNavAuth(auth);
  }
  return auth;
});
