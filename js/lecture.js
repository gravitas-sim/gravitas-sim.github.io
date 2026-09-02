// =============================================================================
// Lecture mode: the simulation projected on a wall
// -----------------------------------------------------------------------------
// Not a fullscreen sandbox. The constraint is a 1024x768 projector and a
// student in the back row of a lecture theatre, which is a different design
// problem from a laptop at arm's length: type has to be larger than a desktop
// interface would ever justify, controls have to be hittable while the lecturer
// is looking at the room rather than the screen, and the palette has to survive
// a projector's washed-out black point.
//
// The last of those is why entering switches to Daylight. A near-black chrome
// on a projector in a lit room is a grey rectangle; the light theme already
// exists for exactly this and is documented as such in the theme picker. It is
// borrowed, not imposed: the previous theme is remembered on the way in and
// restored on the way out, so a lecturer who prefers Observatory still has it
// afterwards. Nothing here defines a palette.
//
// The prepared sequence
// -----------------------------------------------------------------------------
// A lecture is a list of share links. Right Arrow goes forward, Left Arrow back,
// and each step is applied with the existing share codec - the same decode path
// a student following a link uses - so there is no second serialization of a
// scenario anywhere in this feature and a link that works in an email works in
// a lecture.
//
// The arrow keys already pan the view, so this module claims them in the
// capture phase and only when a sequence is loaded. It defers to focused text
// fields, so typing into the sequence box or the seed field is unaffected.
// =============================================================================

import { t, onLocaleChange } from './i18n/index.js';
import { getTheme, setTheme } from './theme.js';
import { setPresentationMode, isLecture } from './presentation.js';

/**
 * Say something, through the application's toast and live region.
 *
 * Loaded on demand rather than imported at the top. js/controls.js pulls in the
 * whole control surface and, through it, the renderer and the canvas; this
 * module needs two functions out of it and is otherwise a text parser, a theme
 * borrow and a class on <body>. Keeping the static import graph to i18n, theme
 * and presentation is what lets the sequence parser be tested without a DOM,
 * and keeps Lecture Mode off the start-up path until somebody enters it.
 *
 * Fire and forget: nothing here waits on a message being shown.
 *
 * @param {'toast'|'announce'} kind - Which channel
 * @param {string} message - What to say
 */
const notify = (kind, message) => {
  import('./controls.js')
    .then(controls => controls[kind](message))
    .catch(() => {
      /* a message is never worth failing a lecture step over */
    });
};

const STORAGE_KEY = 'gravitas_lecture_sequence';

/** The theme in force before Lecture Mode borrowed Daylight. */
let themeBeforeLecture = null;

/** Whether the readout was collapsed before Lecture Mode opened it. */
let readoutWasCollapsed = null;

/**
 * Collapse or expand the readout panel.
 *
 * On a 1024px screen the readout starts collapsed to its chip, because on a
 * laptop at that width it covers most of the simulation. Projected, it does
 * not: the lecture layout gives it a corner and the object counts, the zoom and
 * the run state are exactly what a lecturer refers to out loud. So it is opened
 * on the way in and put back on the way out, the same borrow-and-return the
 * theme gets.
 *
 * @param {boolean} collapsed - Target state
 */
function setReadoutCollapsed(collapsed) {
  const overlay = document.getElementById('overlay');
  const btn = document.getElementById('overlayMinimize');
  if (!overlay || !btn) return;
  if (overlay.classList.contains('minimized') === collapsed) return;
  btn.click();
}

/** Ordered share links, and where we are in them. */
let sequence = [];
let position = -1;

let spotlightOn = false;
let spotlightEl = null;
let els = {};

// Applying a step changes the fragment, which the hashchange listener in
// share.js also reacts to. Without this the state would be applied twice.
let stepping = false;

// --- The prepared sequence ----------------------------------------------------

/**
 * Pull the Gravitas links out of pasted text.
 *
 * Accepts whole URLs and bare fragments, one per line, and ignores anything
 * else - a lecturer pasting from a document will bring blank lines, numbering
 * and the occasional stray word with them, and rejecting the whole paste
 * because of a "3." at the start of a line would be unusable.
 *
 * The test for a link is the share codec's own: a fragment that begins with a
 * version digit and a compression marker. Nothing here parses the payload.
 *
 * @param {string} text - Pasted text
 * @returns {{links: Array<string>, rejected: number}} Fragments, and the count
 *   of non-blank lines that were not links
 */
export function parseSequence(text) {
  const links = [];
  let rejected = 0;
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const hash = trimmed.includes('#')
      ? trimmed.slice(trimmed.indexOf('#'))
      : trimmed.startsWith('#')
        ? trimmed
        : `#${trimmed}`;
    if (/^#\d+[zr]./.test(hash)) links.push(hash);
    else rejected++;
  }
  return { links, rejected };
}

/** @returns {Array<string>} The loaded sequence, as fragments */
export const getSequence = () => sequence.slice();

/** @returns {number} Index of the current step, or -1 */
export const getPosition = () => position;

/**
 * Replace the prepared sequence.
 *
 * Persisted, because a lecturer prepares a sequence before class and the
 * browser will have been closed in between. It is a presentation preference,
 * not simulation state: loading one changes nothing on screen until a step is
 * taken.
 *
 * @param {Array<string>} links - Fragments in presentation order
 */
export function setSequence(links) {
  sequence = Array.isArray(links) ? links.filter(Boolean) : [];
  position = -1;
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(sequence));
  } catch {
    /* storage unavailable */
  }
  renderSequenceState();
}

/** Restore a sequence prepared in an earlier session. */
function loadStoredSequence() {
  try {
    const saved = window.localStorage?.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed))
      sequence = parsed.filter(s => typeof s === 'string');
  } catch {
    /* a corrupt sequence is not worth failing start-up over */
  }
}

/**
 * Apply one step of the sequence.
 *
 * The fragment is written to the address bar and the existing share codec is
 * asked to open it, which is the same path a pasted link takes. Lecture Mode is
 * untouched by that: applying a share state rebuilds the *simulation*, and the
 * presentation shell is a separate concern that no share payload can reach.
 *
 * @param {number} index - Step to show
 * @returns {Promise<boolean>} True if the state was applied
 */
export async function goToStep(index) {
  if (!sequence.length) return false;
  const clamped = Math.max(0, Math.min(sequence.length - 1, index));
  const fragment = sequence[clamped];
  if (!fragment) return false;

  stepping = true;
  try {
    const { applySharedLinkFromUrl } = await import('./share.js');
    history.replaceState(
      null,
      '',
      location.pathname + location.search + fragment
    );
    const ok = await applySharedLinkFromUrl();
    if (!ok) {
      notify('toast', t('lecture.sequence.failed'));
      return false;
    }
    position = clamped;
    renderSequenceState();
    notify(
      'announce',
      t('lecture.sequence.position', {
        n: position + 1,
        total: sequence.length,
      })
    );
    return true;
  } catch {
    notify('toast', t('lecture.sequence.failed'));
    return false;
  } finally {
    stepping = false;
  }
}

/** Advance one step. @returns {Promise<boolean>} True if it moved */
export async function nextStep() {
  if (!sequence.length) return false;
  if (position >= sequence.length - 1) {
    notify('toast', t('lecture.sequence.atEnd'));
    return false;
  }
  return goToStep(position + 1);
}

/** Go back one step. @returns {Promise<boolean>} True if it moved */
export async function previousStep() {
  if (!sequence.length) return false;
  if (position <= 0) {
    notify('toast', t('lecture.sequence.atStart'));
    return false;
  }
  return goToStep(position - 1);
}

// --- The spotlight ------------------------------------------------------------

/**
 * A circle of normal brightness in a dimmed screen, following the pointer.
 *
 * Implemented as one absolutely-positioned element with a radial gradient and
 * `pointer-events: none`, which is what keeps it from touching the simulation:
 * it cannot receive a click, it is not on the canvas, and nothing about it is
 * read by the physics. Turning it off removes the element entirely rather than
 * hiding it, so there is no invisible layer over the page when it is not in use.
 *
 * @param {boolean} [on] - Explicit state; toggles when omitted
 * @returns {boolean} The new state
 */
export function setSpotlight(on) {
  const next = on === undefined ? !spotlightOn : !!on;
  spotlightOn = next;

  if (!next) {
    spotlightEl?.remove();
    spotlightEl = null;
    window.removeEventListener('pointermove', onPointerMove);
    document.body.classList.remove('lecture-spotlight');
  } else {
    if (!spotlightEl) {
      spotlightEl = document.createElement('div');
      spotlightEl.className = 'lecture-spotlight-layer';
      spotlightEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(spotlightEl);
      // Start under the pointer's last known position rather than at the
      // origin, so switching it on does not put the circle in a corner.
      moveSpotlight(lastPointer.x, lastPointer.y);
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.body.classList.add('lecture-spotlight');
  }
  els.spotlight?.setAttribute('aria-pressed', String(spotlightOn));
  return spotlightOn;
}

/** @returns {boolean} True while the spotlight is on */
export const isSpotlightOn = () => spotlightOn;

const lastPointer = { x: 0, y: 0 };

function moveSpotlight(x, y) {
  if (!spotlightEl) return;
  spotlightEl.style.setProperty('--spot-x', `${x}px`);
  spotlightEl.style.setProperty('--spot-y', `${y}px`);
}

function onPointerMove(e) {
  lastPointer.x = e.clientX;
  lastPointer.y = e.clientY;
  moveSpotlight(e.clientX, e.clientY);
}

// --- Entering and leaving -----------------------------------------------------

/**
 * Enter Lecture Mode.
 *
 * The theme is borrowed here and returned in exit(). Storing the previous id
 * before switching is the whole of "restore the user's preference": setTheme
 * persists, so without this a lecturer would find their theme permanently
 * changed by having given one class.
 */
export function enterLecture() {
  if (isLecture()) return;
  themeBeforeLecture = getTheme();
  readoutWasCollapsed =
    document.getElementById('overlay')?.classList.contains('minimized') ?? null;
  setPresentationMode('lecture');
  setTheme('daylight');
  setReadoutCollapsed(false);
  renderSequenceState();
  els.exit?.focus();
  notify('announce', t('lecture.action.enter'));
}

/**
 * Leave Lecture Mode and put everything back.
 *
 * The spotlight goes first: leaving it on would dim the sandbox with no visible
 * control to turn it off.
 */
export function exitLecture() {
  if (!isLecture()) return;
  setSpotlight(false);
  closeSequenceEditor();
  setPresentationMode('normal');
  if (themeBeforeLecture) setTheme(themeBeforeLecture);
  themeBeforeLecture = null;
  if (readoutWasCollapsed !== null) setReadoutCollapsed(readoutWasCollapsed);
  readoutWasCollapsed = null;
  notify('announce', t('lecture.action.exit'));
  document.getElementById('lectureBtn')?.focus();
}

/** Toggle Lecture Mode. */
export function toggleLecture() {
  isLecture() ? exitLecture() : enterLecture();
}

/** @returns {?string} The theme Lecture Mode is holding, for tests */
export const borrowedFrom = () => themeBeforeLecture;

// --- The sequence editor ------------------------------------------------------

function openSequenceEditor() {
  if (!els.sheet) return;
  els.sheet.hidden = false;
  els.textarea.value = sequence.join('\n');
  els.textarea.focus();
}

function closeSequenceEditor() {
  if (els.sheet) els.sheet.hidden = true;
}

const isSequenceEditorOpen = () => Boolean(els.sheet) && !els.sheet.hidden;

/** Repaint the step counter and the enabled state of the arrows. */
function renderSequenceState() {
  if (!els.position) return;
  const total = sequence.length;
  els.position.textContent = total
    ? t('lecture.sequence.position', {
        n: Math.max(1, position + 1),
        total,
      })
    : t('lecture.sequence.empty');
  const atStart = !total || position <= 0;
  const atEnd = !total || position >= total - 1;
  if (els.prev) els.prev.disabled = atStart;
  if (els.next) els.next.disabled = atEnd;
}

function applyTypedSequence() {
  const { links, rejected } = parseSequence(els.textarea.value);
  setSequence(links);
  if (links.length) {
    notify('toast', t('lecture.sequence.loaded', { n: links.length }));
    goToStep(0);
  }
  if (rejected)
    notify('toast', t('lecture.sequence.rejected', { n: rejected }));
  closeSequenceEditor();
}

// --- Keyboard -----------------------------------------------------------------

/**
 * True when the keyboard belongs to something else.
 *
 * The same test shortcuts.js uses. Without it, Left Arrow inside the sequence
 * textarea would advance the lecture instead of moving the caret, which is the
 * exact failure the brief warns about.
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

/**
 * Claim the arrow keys, but only when they are genuinely ours.
 *
 * Capture phase, because ui.js binds the same keys to panning on `window` and
 * the two must not both fire. Every guard below is a case where the key is not
 * ours: outside lecture mode, with no sequence to step through, inside a text
 * field, on a focused control that uses arrows itself (a select, a slider),
 * with a modifier held, or while the sequence editor is open.
 */
function onKeyDown(e) {
  if (!isLecture()) return;

  if (e.key === 'Escape') {
    if (isSequenceEditorOpen()) {
      closeSequenceEditor();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    exitLecture();
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
  if (isTypingTarget(e.target)) return;
  // A focused range slider moves with the arrow keys and that is the correct
  // behaviour for it; stealing them would make the speed control unusable with
  // the keyboard.
  if (
    typeof e.target?.matches === 'function' &&
    e.target.matches('input[type="range"]')
  )
    return;
  if (!sequence.length) return;
  if (stepping) {
    e.preventDefault();
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  if (e.key === 'ArrowRight') nextStep();
  else previousStep();
}

// --- Wiring -------------------------------------------------------------------

/** Wire Lecture Mode. Safe to call once, from init. */
export function initLecture() {
  els = {
    bar: document.getElementById('lectureBar'),
    exit: document.getElementById('lectureExitBtn'),
    spotlight: document.getElementById('lectureSpotlightBtn'),
    prev: document.getElementById('lecturePrevBtn'),
    next: document.getElementById('lectureNextBtn'),
    position: document.getElementById('lecturePosition'),
    sequenceBtn: document.getElementById('lectureSequenceBtn'),
    sheet: document.getElementById('lectureSequenceSheet'),
    textarea: document.getElementById('lectureSequenceText'),
    load: document.getElementById('lectureSequenceLoad'),
    clear: document.getElementById('lectureSequenceClear'),
  };

  loadStoredSequence();

  document
    .getElementById('lectureBtn')
    ?.addEventListener('click', enterLecture);
  els.exit?.addEventListener('click', exitLecture);
  els.spotlight?.addEventListener('click', () => setSpotlight());
  els.next?.addEventListener('click', () => nextStep());
  els.prev?.addEventListener('click', () => previousStep());
  els.sequenceBtn?.addEventListener('click', openSequenceEditor);
  els.load?.addEventListener('click', applyTypedSequence);
  els.clear?.addEventListener('click', () => {
    els.textarea.value = '';
    setSequence([]);
  });
  els.sheet?.addEventListener('click', e => {
    if (e.target === els.sheet) closeSequenceEditor();
  });

  // Capture phase: ui.js's pan handler is on window in the bubble phase, and
  // whichever of the two runs first must be able to stop the other.
  window.addEventListener('keydown', onKeyDown, true);

  // The step counter is rendered text - "Step 2 of 3" - so it has to be redrawn
  // when the language changes and not only when the position does.
  onLocaleChange(renderSequenceState);

  renderSequenceState();
}
