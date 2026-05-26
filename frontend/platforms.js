/**
 * platforms.js — Shared platform normalization utility
 * Loaded as a plain <script> before script.js and library.js.
 * Exposes: RAWG_PLATFORM_MAP, ALL_PLATFORMS, getSupportedPlatforms(), populatePlatformDropdown()
 */

// ── RAWG name → internal { value, label } ────────────────────────────────────
// Keys must match exactly what RAWG returns in platform.name.
// Values must be in the validPlatforms list in user-games.js.

const RAWG_PLATFORM_MAP = {
  // PC family
  'PC':                    { value: 'pc',          label: 'PC' },
  'macOS':                 { value: 'mac',          label: 'Mac' },
  'Linux':                 { value: 'linux',        label: 'Linux' },
  'Steam':                 { value: 'pc',           label: 'PC' },      // Steam = PC
  'Steam Deck':            { value: 'steam_deck',   label: 'Steam Deck' },
  'Web':                   { value: 'pc',           label: 'PC (Browser)' },

  // PlayStation
  'PlayStation 5':         { value: 'ps5',          label: 'PS5' },
  'PlayStation 4':         { value: 'ps4',          label: 'PS4' },
  'PlayStation 3':         { value: 'ps3',          label: 'PS3' },
  'PlayStation 2':         { value: 'ps2',          label: 'PS2' },
  'PlayStation':           { value: 'ps1',          label: 'PS1' },
  'PSP':                   { value: 'psp',          label: 'PSP' },
  'PS Vita':               { value: 'ps_vita',      label: 'PS Vita' },

  // Xbox
  'Xbox Series S/X':       { value: 'xbox_series',  label: 'Xbox Series X/S' },
  'Xbox One':              { value: 'xbox_one',     label: 'Xbox One' },
  'Xbox 360':              { value: 'xbox_360',     label: 'Xbox 360' },
  'Xbox':                  { value: 'xbox_360',     label: 'Xbox (Classic)' },

  // Nintendo
  'Nintendo Switch':       { value: 'switch',       label: 'Switch' },
  'Wii U':                 { value: 'wii_u',        label: 'Wii U' },
  'Wii':                   { value: 'wii',          label: 'Wii' },
  'Nintendo 3DS':          { value: '3ds',          label: '3DS' },
  'Nintendo DS':           { value: 'ds',           label: 'DS' },
  'Game Boy Advance':      { value: 'gba',          label: 'GBA' },
  'Nintendo 64':           { value: 'other',        label: 'N64' },
  'SNES':                  { value: 'other',        label: 'SNES' },
  'NES':                   { value: 'other',        label: 'NES' },

  // Mobile
  'Android':               { value: 'mobile',       label: 'Mobile (Android)' },
  'iOS':                   { value: 'mobile',       label: 'Mobile (iOS)' },
  'Apple Macintosh':       { value: 'mac',          label: 'Mac' },

  // Classic / retro (catch-all)
  'Atari 2600':            { value: 'other',        label: 'Classic (Atari)' },
  'Commodore / Amiga':     { value: 'other',        label: 'Classic (Amiga)' },
  '3DO':                   { value: 'other',        label: 'Classic (3DO)' },
  'Sega Genesis':          { value: 'other',        label: 'Classic (Sega)' },
  'Game Boy':              { value: 'other',        label: 'Game Boy' },
  'Dreamcast':             { value: 'other',        label: 'Dreamcast' },
};

// ── Full platform list (used in edit modal where RAWG data is unavailable) ────
// Grouped by family, shown in order.

const ALL_PLATFORMS = [
  // PC
  { value: 'pc',         label: 'PC' },
  { value: 'mac',        label: 'Mac' },
  { value: 'linux',      label: 'Linux' },
  { value: 'steam_deck', label: 'Steam Deck' },
  // PlayStation
  { value: 'ps5',        label: 'PS5' },
  { value: 'ps4',        label: 'PS4' },
  { value: 'ps3',        label: 'PS3' },
  { value: 'ps2',        label: 'PS2' },
  { value: 'ps1',        label: 'PS1' },
  { value: 'psp',        label: 'PSP' },
  { value: 'ps_vita',    label: 'PS Vita' },
  // Xbox
  { value: 'xbox_series', label: 'Xbox Series X/S' },
  { value: 'xbox_one',   label: 'Xbox One' },
  { value: 'xbox_360',   label: 'Xbox 360' },
  // Nintendo
  { value: 'switch',     label: 'Switch' },
  { value: 'wii_u',      label: 'Wii U' },
  { value: 'wii',        label: 'Wii' },
  { value: '3ds',        label: '3DS' },
  { value: 'ds',         label: 'DS' },
  { value: 'gba',        label: 'GBA' },
  // Mobile
  { value: 'mobile',     label: 'Mobile' },
  // Other
  { value: 'other',      label: 'Other / Classic' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract and normalize platforms from a RAWG game object.
 * Deduplicates by internal value (e.g. Android + iOS → one 'mobile' entry).
 *
 * @param {Object} game  Game object with a `platforms` array of RAWG name strings
 * @returns {{ value: string, label: string }[]}
 */
function getSupportedPlatforms(game) {
  const rawNames = Array.isArray(game.platforms) ? game.platforms : [];
  if (rawNames.length === 0) return [{ value: 'other', label: 'Unknown Platform' }];

  const seen   = new Set();
  const result = [];

  for (const name of rawNames) {
    const mapped = RAWG_PLATFORM_MAP[name];
    const entry  = mapped || { value: 'other', label: name }; // preserve unknown names
    if (!seen.has(entry.value)) {
      seen.add(entry.value);
      result.push(entry);
    }
  }

  return result.length > 0 ? result : [{ value: 'other', label: 'Unknown Platform' }];
}

/**
 * Clear and repopulate a <select> element with platform options.
 * Auto-selects if only one option exists.
 *
 * @param {HTMLSelectElement} selectEl
 * @param {{ value: string, label: string }[]} platforms
 * @param {string|null} selectedValue   Pre-select this value (for edit mode)
 */
function populatePlatformDropdown(selectEl, platforms, selectedValue = null) {
  selectEl.innerHTML = '';

  for (const { value, label } of platforms) {
    const opt = document.createElement('option');
    opt.value       = value;
    opt.textContent = label;
    if (selectedValue && value === selectedValue) opt.selected = true;
    selectEl.appendChild(opt);
  }

  // Auto-select sole option (don't leave user guessing)
  if (platforms.length === 1) {
    selectEl.options[0].selected = true;
  }
}
