// =============================================================================
// Keyboard shortcuts and the help overlay
// -----------------------------------------------------------------------------
// One registry drives both the key handling and the "?" cheatsheet, so the two
// cannot drift apart.
// =============================================================================

const registry = [];
let overlayEl = null;
let enabled = true;

/**
 * Register a shortcut.
 * @param {Object} spec
 * @param {string} spec.keys - Display form, e.g. 'Shift + ←'
 * @param {string} spec.match - Lowercased event.key this responds to
 * @param {string} spec.group - Cheatsheet section
 * @param {string} spec.label - What it does
 * @param {Function} [spec.run] - Handler; omit for keys handled elsewhere
 * @param {Function} [spec.when] - Guard
 * @param {boolean} [spec.shift] - Require shift
 */
export function registerShortcut(spec) {
  registry.push(spec);
}

/** @returns {Array} All registered shortcuts */
export const getShortcuts = () => registry.slice();

/** Enable or disable global shortcut handling. */
export const setShortcutsEnabled = v => {
  enabled = !!v;
};

/**
 * True when the event came from somewhere that owns the keyboard: * a text field, a select, or anything contenteditable.
 */
function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable === true
  );
}

function handleKey(e) {
  if (!enabled) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (isTypingTarget(e.target)) return;

  const key = e.key.toLowerCase();
  for (const s of registry) {
    if (!s.run) continue;
    if (s.match !== key) continue;
    if (s.shift && !e.shiftKey) continue;
    if (!s.shift && e.shiftKey) continue;
    if (s.when && !s.when()) continue;
    e.preventDefault();
    s.run(e);
    return;
  }
}

/** Start listening. Safe to call once, from init. */
export function initShortcuts() {
  window.addEventListener('keydown', handleKey);
}

// --- Cheatsheet ---------------------------------------------------------------

function buildOverlay() {
  const el = document.createElement('div');
  el.id = 'shortcutOverlay';
  el.className = 'shortcut-overlay';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Keyboard shortcuts');
  el.hidden = true;

  const groups = new Map();
  for (const s of registry) {
    if (!groups.has(s.group)) groups.set(s.group, []);
    groups.get(s.group).push(s);
  }

  const sections = [...groups.entries()]
    .map(
      ([group, items]) => `
      <section class="shortcut-group">
        <h3>${group}</h3>
        <dl>
          ${items
            .map(
              s => `<div class="shortcut-row">
                  <dt><kbd>${s.keys}</kbd></dt>
                  <dd>${s.label}</dd>
                </div>`
            )
            .join('')}
        </dl>
      </section>`
    )
    .join('');

  el.innerHTML = `
    <div class="shortcut-sheet">
      <header class="shortcut-header">
        <h2>Keyboard shortcuts</h2>
        <button type="button" class="is-quiet" data-close aria-label="Close">✕</button>
      </header>
      <div class="shortcut-body">${sections}</div>
      <footer class="shortcut-footer">
        Press <kbd>?</kbd> any time to reopen this list.
      </footer>
    </div>`;

  el.addEventListener('click', ev => {
    if (ev.target === el || ev.target.closest('[data-close]'))
      hideShortcutHelp();
  });

  document.body.appendChild(el);
  return el;
}

/** Show the shortcut cheatsheet. */
export function showShortcutHelp() {
  if (!overlayEl) overlayEl = buildOverlay();
  overlayEl.hidden = false;
  overlayEl.querySelector('[data-close]')?.focus();
}

/** Hide the shortcut cheatsheet. */
export function hideShortcutHelp() {
  if (overlayEl) overlayEl.hidden = true;
}

/** @returns {boolean} True while the cheatsheet is open */
export const isShortcutHelpOpen = () => !!overlayEl && !overlayEl.hidden;

/** Toggle the cheatsheet. */
export function toggleShortcutHelp() {
  if (isShortcutHelpOpen()) hideShortcutHelp();
  else showShortcutHelp();
}
