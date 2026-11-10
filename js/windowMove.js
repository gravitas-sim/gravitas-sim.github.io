// =============================================================================
// A window a drag moves, moved without one
// -----------------------------------------------------------------------------
// The object inspector, a pinned card and the spacetime view are moved by
// dragging their header, and the spacetime view is sized by dragging its
// corner. A drag needs a pointer that can hold a path; this gives the same
// outcome to one press at a time and to the keyboard (Prompt 278; WCAG 2.5.7
// and 2.1.1; INTERACTION.md, the drag `window.move`).
//
// A Move button is added to the window's header. Pressing it arms a placement:
// the next press anywhere on the page puts the window's top left corner there.
// While the button has focus the arrow keys move the window a step, by the
// contract's three sizes (Alt a quarter, none one, Shift four), and Escape
// disarms. A Size button does the same for the corner a drag would pull.
//
// The press lands on a veil that covers the page while a placement is armed,
// so it cannot also place a body, pick an object or press a control.
//
// Loaded on demand by the three windows, with the words for the one locale in
// use read straight from js/i18n/*.interaction.js (the file js/motionControl.js
// reads the same way), so nothing here is fetched until a window opens.
// =============================================================================

import { announce } from './notify.js';
import { nudgeScale } from './shortcuts.js';

/** One step of an arrow key, in CSS pixels, before the modifier's scale. */
export const STEP = 16;

const ARROWS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

let words = null;

/** The words for the locale in use. */
async function loadWords() {
  const es = document.documentElement.lang === 'es';
  const module = es
    ? await import('./i18n/es.interaction.js')
    : await import('./i18n/en.interaction.js');
  words = module.ES_INTERACTION || module.EN_INTERACTION;
  return words;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, Math.max(lo, hi)));

/**
 * Put a window's top left corner at a point, inside the viewport.
 * @param {HTMLElement} panel
 * @param {number} left - CSS pixels
 * @param {number} top - CSS pixels
 */
export function moveTo(panel, left, top) {
  const rect = panel.getBoundingClientRect();
  panel.style.left = `${Math.round(clamp(left, 0, window.innerWidth - rect.width))}px`;
  panel.style.top = `${Math.round(clamp(top, 0, window.innerHeight - 40))}px`;
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  panel.style.transform = 'none';
}

/**
 * Size a window whose bottom left corner stays put, as a drag of its top right
 * corner does.
 * @param {HTMLElement} panel
 * @param {number} width - CSS pixels
 * @param {number} height - CSS pixels
 * @param {{minWidth?: number, minHeight?: number}} [limits]
 */
export function sizeTo(
  panel,
  width,
  height,
  { minWidth = 300, minHeight = 240 } = {}
) {
  const rect = panel.getBoundingClientRect();
  const w = clamp(width, minWidth, window.innerWidth - rect.left - 20);
  const h = clamp(height, minHeight, window.innerHeight - 20);
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  panel.style.left = `${Math.round(rect.left)}px`;
  panel.style.top = `${Math.round(Math.max(0, rect.bottom - h))}px`;
  panel.style.width = `${Math.round(w)}px`;
  panel.style.height = `${Math.round(h)}px`;
}

/**
 * Add one button that arms a press and answers the arrow keys.
 * @param {HTMLElement} host - Where the button goes
 * @param {object} o
 * @param {string} o.kind - 'move' or 'size': the words and the data attribute
 * @param {string} o.glyph - What the button shows
 * @param {string} [o.className] - The header's own button class
 * @param {(x: number, y: number) => void} o.press - A press at a point
 * @param {(dx: number, dy: number) => void} o.nudge - An arrow, in pixels
 * @returns {HTMLButtonElement}
 */
function armButton(host, { kind, glyph, className, press, nudge }) {
  const button = document.createElement('button');
  button.type = 'button';
  if (className) button.className = className;
  button.dataset.window = kind;
  button.setAttribute('aria-pressed', 'false');
  button.textContent = glyph;
  const name = () => {
    button.setAttribute('aria-label', words[`window.${kind}.label`]);
    button.title = words[`window.${kind}.label`];
  };
  if (words) name();
  else loadWords().then(name);

  let veil = null;
  const disarm = () => {
    veil?.remove();
    veil = null;
    button.setAttribute('aria-pressed', 'false');
  };
  const arm = () => {
    veil = document.createElement('div');
    veil.dataset.windowVeil = kind;
    veil.style.cssText =
      'position:fixed;inset:0;z-index:2147483000;cursor:crosshair;touch-action:none';
    veil.addEventListener('click', e => {
      press(e.clientX, e.clientY);
      disarm();
      button.focus();
      announce(words[`window.${kind}.done`]);
    });
    document.body.append(veil);
    button.setAttribute('aria-pressed', 'true');
    announce(words[`window.${kind}.arm`]);
  };
  button.addEventListener('click', () => {
    if (veil) disarm();
    else if (words) arm();
    else loadWords().then(arm);
  });
  button.addEventListener('keydown', e => {
    if (e.key === 'Escape' && veil) {
      disarm();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const way = ARROWS[e.key];
    if (!way || e.metaKey || e.ctrlKey) return;
    const step = STEP * nudgeScale(e);
    nudge(way[0] * step, way[1] * step);
    e.preventDefault();
    e.stopPropagation();
  });
  // Before the header's own buttons, so Close stays last.
  const first = host.querySelector('button:not([data-window])');
  if (first) first.before(button);
  else host.append(button);
  return button;
}

/**
 * Give a draggable window its Move button, and a Size button if it is sized by
 * a drag. Safe to call again for the same window: it adds nothing twice.
 *
 * @param {HTMLElement} panel - The window
 * @param {HTMLElement} host - The header element that takes the buttons
 * @param {object} [o]
 * @param {string} [o.className] - Class for the buttons
 * @param {() => void} [o.onMove] - After any move (a drag would have set the same marks)
 * @param {() => void} [o.onSize] - After any resize; its presence adds the Size button
 */
export function movable(panel, host, { className, onMove, onSize } = {}) {
  if (!panel || !host || host.querySelector('[data-window]')) return;
  armButton(host, {
    kind: 'move',
    glyph: '✥',
    className,
    press(x, y) {
      moveTo(panel, x, y);
      onMove?.();
    },
    nudge(dx, dy) {
      const r = panel.getBoundingClientRect();
      moveTo(panel, r.left + dx, r.top + dy);
      onMove?.();
    },
  });
  if (onSize)
    armButton(host, {
      kind: 'size',
      glyph: '⤢',
      className,
      press(x, y) {
        const r = panel.getBoundingClientRect();
        sizeTo(panel, x - r.left, r.bottom - y);
        onSize();
      },
      nudge(dx, dy) {
        const r = panel.getBoundingClientRect();
        sizeTo(panel, r.width + dx, r.height - dy);
        onSize();
      },
    });
}
