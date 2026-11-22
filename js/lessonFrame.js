// Frames the scene in what a lesson's panels leave clear: sheets up to 900 px
// (so the inset has a top and a bottom), the side panels beyond. A fit is asked
// for and taken on the panel's tick; a reader who touches the view owns it.
// It also holds the reset control and the note that a scene is not kept.

import { SETTINGS, state } from './appState.js';
import { allBodies, boundRoles, roleBody } from './lessonScene.js';
import {
  SHEET_MAX_WIDTH,
  fitCamera,
  insetFromBoxes,
  placedOf,
} from './lesson/stage.js';
import { getLocale, onLocaleChange, t } from './i18n/index.js';
import { EV_OBJECT_PLACED } from './names.js';
import { getInterventionEpoch } from './engine/state.js';
import { stageKey, stagedStars } from './lesson/stageGate.js';

const MAX_FIT_ATTEMPTS = 24;

/** More bound or world points than this are a crowd. */
const CROWD_POINTS = 12;

const SHEET_PARTS = [
  '#investigationPanel',
  '#investigationTool',
  '#investigationPlot',
  '#investigationDockTabs',
  '#lightCurveContainer',
  '.obs-panel',
  '.experiment-panel',
  '#timelineBar',
  '.gs-shell',
];

function boxesOf(selectors, early = false) {
  const out = [];
  for (const el of document.querySelectorAll(selectors.join(','))) {
    if (el.hidden || (!early && getComputedStyle(el).visibility === 'hidden'))
      continue;
    const b = el.getBoundingClientRect();
    if (b.width > 8 && b.height > 8) out.push(b);
  }
  return out;
}

/** What the lesson's furniture covers of the window, in CSS pixels. */
export function lessonInset() {
  const view = { width: window.innerWidth, height: window.innerHeight };
  if (view.width <= SHEET_MAX_WIDTH)
    return insetFromBoxes(boxesOf([...SHEET_PARTS, '#overlay']), view);
  let left = 0;
  let right = 0;
  for (const b of boxesOf(
    ['#investigationPanel', '#investigationTool', '#mainControls'],
    true
  )) {
    if (b.bottom < view.height * 0.5) continue;
    if (b.left < view.width * 0.5) left = Math.max(left, b.right);
    else right = Math.max(right, view.width - b.left);
  }
  let top = 0;
  let bottom = 0;
  const free = view.width - left - right;
  for (const b of boxesOf(SHEET_PARTS)) {
    if (b.right <= left || b.left >= view.width - right || b.width < free * 0.6)
      continue;
    if (b.top + b.bottom < view.height) top = Math.max(top, b.bottom);
    else bottom = Math.max(bottom, view.height - b.top);
  }
  return { left, right, top, bottom };
}

/** The bounding box of the ellipse a body sweeps about its primary, as points. */
export function orbitPoints(body, primary, G) {
  const here = { x: body.pos.x, y: body.pos.y, radius: body.radius };
  if (!primary) return [here];
  const rx = body.pos.x - primary.pos.x;
  const ry = body.pos.y - primary.pos.y;
  const vx = body.vel.x - primary.vel.x;
  const vy = body.vel.y - primary.vel.y;
  const r = Math.hypot(rx, ry);
  const mu = G * (primary.mass + (body.mass || 0));
  const energy = (vx * vx + vy * vy) / 2 - mu / r;
  if (!(energy < 0) || !(r > 0)) return [here];
  const h = rx * vy - ry * vx;
  const ex = (vy * h) / mu - rx / r;
  const ey = (-vx * h) / mu - ry / r;
  const e = Math.hypot(ex, ey);
  const a = -mu / (2 * energy);
  if (!(e < 1)) return [here];
  const phi = Math.atan2(ey, ex);
  const b = a * Math.sqrt(1 - e * e);
  const cx = primary.pos.x - a * e * Math.cos(phi);
  const cy = primary.pos.y - a * e * Math.sin(phi);
  const hx = Math.hypot(a * Math.cos(phi), b * Math.sin(phi));
  const hy = Math.hypot(a * Math.sin(phi), b * Math.cos(phi));
  return [
    here,
    { x: cx - hx, y: cy - hy, radius: 0 },
    { x: cx + hx, y: cy + hy, radius: 0 },
  ];
}

/** The body that pulls hardest on another. */
function primaryOf(body, bodies) {
  let best = null;
  let pull = 0;
  for (const c of bodies) {
    if (c === body || !(c.mass > 0)) continue;
    const d2 = (c.pos.x - body.pos.x) ** 2 + (c.pos.y - body.pos.y) ** 2;
    if (d2 > 0 && c.mass / d2 > pull) [best, pull] = [c, c.mass / d2];
  }
  return best;
}

export function boundPoints() {
  const everything = allBodies();
  const out = [];
  for (const role of boundRoles()) {
    const body = roleBody(role);
    if (!body) continue;
    const primary = primaryOf(body, everything);
    out.push(
      ...orbitPoints(body, primary, SETTINGS.gravitational_constant),
      ...(primary
        ? [{ x: primary.pos.x, y: primary.pos.y, radius: primary.radius }]
        : [])
    );
  }
  return out;
}

let pending = false;
let attempts = 0;
// A scene's own fit is retaken at most this often as panels settle.
const MAX_REFITS = 4;
let refits = 0;
// Ticks after a fit in which late-opening panels are picked up.
const WATCH_TICKS = 24;
let watchTicks = 0;
// The shelf's stars at the last fit: a tool that resizes them asks for another.
let fittedStars = '';
const starsKey = () =>
  stagedStars()
    .map(e => [e.star.pos.x, e.star.pos.y, e.star.stageRadius, e.star.radius])
    .join('|');
let applied = null;
let fitted = false;

const sameCamera = was =>
  Math.abs(state.zoom - was.zoom) < 1e-6 &&
  Math.abs(state.pan.x - was.pan.x) < 0.5 &&
  Math.abs(state.pan.y - was.pan.y) < 0.5;

/** Whether a fit has been asked for and not yet performed. */
export const fitWanted = () => pending;

/** Ask for a fit on the next tick, or cancel one. */
export function requestFit(on = true) {
  pending = Boolean(on);
  attempts = 0;
  applied = null;
  refits = 0;
  if (on) state.cameraTouchedAt = 0;
  else {
    fitted = false;
    fittedStars = '';
  }
}

/** Put the points in the clear region, in the canvas's own pixels, y up. */
export function fitNow(points, maxZoom = 3) {
  const canvas = document.getElementById('simulationCanvas');
  const scale = canvas?.clientWidth ? canvas.width / canvas.clientWidth : 1;
  const inset = lessonInset();
  const off = state.frameOffset || { x: 0, y: 0 };
  const camera = fitCamera(
    points.map(p => ({ x: p.x - off.x, y: p.y - off.y, radius: p.radius })),
    { width: window.innerWidth * scale, height: window.innerHeight * scale },
    {
      maxZoom,
      ...(window.innerWidth <= SHEET_MAX_WIDTH && { margin: 0.1 }),
      inset: {
        left: (inset.left || 0) * scale,
        right: (inset.right || 0) * scale,
        top: (inset.top || 0) * scale,
        bottom: (inset.bottom || 0) * scale,
      },
    }
  );
  if (!camera) return false;
  state.zoom = camera.zoom;
  state.pan = camera.pan;
  fitted = true;
  watchTicks = WATCH_TICKS;
  watchLayout();
  return true;
}

// A panel that changes size after a fit asks for another (until the reader moves the view).
let watcher = null;
function watchLayout() {
  if (!window.ResizeObserver) return;
  watcher ??= new window.ResizeObserver(() => refit());
  for (const el of document.querySelectorAll(
    [...SHEET_PARTS, '#mainControls'].join(',')
  ))
    watcher.observe(el);
}

/** The nearest nine tenths of a crowd, so one far body does not set the view. */
function nearest(points) {
  if (points.length <= CROWD_POINTS) return points;
  const mid = k => {
    const v = points.map(p => p[k]).sort((x, y) => x - y);
    return v[Math.floor(v.length / 2)];
  };
  const [cx, cy] = [mid('x'), mid('y')];
  const near = [...points].sort(
    (p, q) => Math.hypot(p.x - cx, p.y - cy) - Math.hypot(q.x - cx, q.y - cy)
  );
  return near.slice(0, Math.ceil(points.length * 0.9));
}

/**
 * What to frame and how far in: staged stars stop at zoom 3; bound bodies fill
 * their room unless there is one role or they lie within a few radii of one
 * another (zoom 3); a step that binds nothing frames the world, less a far tenth.
 * @param {{stars: Array, bound: Array, roles: number, world: Array}} scene
 * @returns {{points: Array, maxZoom: number}}
 */
export function chooseFrame({ stars, bound, roles, world }) {
  if (stars.length) return { points: placedOf(stars), maxZoom: 3 };
  if (bound.length) {
    const xs = bound.map(p => p.x);
    const ys = bound.map(p => p.y);
    const spread = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys)
    );
    const reach = Math.max(...bound.map(p => p.radius || 0));
    return {
      points: bound,
      maxZoom: roles > 1 && spread >= 4 * reach ? 100 : 3,
    };
  }
  return { points: nearest(world), maxZoom: 100 };
}

const framed = () =>
  chooseFrame({
    stars: stagedStars(),
    bound: boundPoints(),
    roles: boundRoles().length,
    world: allBodies().map(b => ({ x: b.pos.x, y: b.pos.y, radius: b.radius })),
  });

/** Perform a fit that was asked for, once the panels can be measured. */
export function takeFit() {
  if (!pending) {
    if (fittedStars && fittedStars !== starsKey()) refit();
    if (watchTicks > 0) {
      watchTicks--;
      watchLayout();
    }
    return false;
  }
  if (state.cameraTouchedAt || ++attempts > MAX_FIT_ATTEMPTS) {
    pending = false;
    applied = null;
    return false;
  }
  const panel = document.getElementById('investigationPanel');
  if (!panel || panel.hidden || !panel.getBoundingClientRect().width)
    return false;
  // The world's build resets the camera after the lesson opens: retry if it did.
  if (applied && sameCamera(applied)) {
    pending = false;
    applied = null;
    return false;
  }
  const { points, maxZoom } = framed();
  const done = fitNow(points, maxZoom);
  fittedStars = done ? starsKey() : '';
  applied = done ? { zoom: state.zoom, pan: { ...state.pan } } : null;
  return done;
}

export function frameScene() {
  requestFit();
}

export function refit(byReader = false) {
  if (!fitted || state.cameraTouchedAt) return;
  if (!byReader && refits >= MAX_REFITS) return;
  const was = refits;
  requestFit();
  refits = byReader ? was : was + 1;
}

// The sheet handle (phone): `body.lesson-peek`; saved as `sheet: 'peek'`.

let peek = false;
let button = null;
let hooks = { announce() {}, save() {} };

const words = () =>
  button.dataset[getLocale() === 'es' ? 'es' : 'en'].split('|');

function paint() {
  document.body.classList.toggle('lesson-peek', peek);
  if (!button) return;
  const label = words()[peek ? 1 : 0];
  button.setAttribute('aria-expanded', String(!peek));
  button.setAttribute('aria-label', label);
}

export function setPeek(on, said = true) {
  if (peek === on) return;
  peek = on;
  paint();
  refit(true);
  if (said) hooks.announce(words()[peek ? 2 : 3]);
  hooks.save();
}

export const isPeek = () => peek;

/** Wire the handle once; focusing an answer box raises the sheet. */
export function initSheet(host, signal) {
  button = document.getElementById('investigationSheet');
  hooks = host;
  button?.addEventListener('click', () => setPeek(!peek), { signal });
  document.getElementById('investigationPanel')?.addEventListener(
    'focusin',
    e => {
      if (
        peek &&
        e.target.closest?.('#investigationBody :is(input, textarea, select)')
      )
        setPeek(false);
    },
    { signal }
  );
}

/** A lesson opens: the sheet as it was left, the readout folded to its chip. */
export function openSheet(saved) {
  peek = saved === 'peek';
  paint();
  const readout = document.getElementById('overlay');
  if (
    window.innerWidth <= 900 &&
    readout &&
    !readout.classList.contains('minimized')
  )
    document.getElementById('overlayMinimize')?.click();
}

export function closeSheet() {
  peek = false;
  paint();
}

// --- Reset the scene, and the note that a scene is not kept -------------------
// The control, the note and the rail speak from the base catalog; the other reset
// words (the toast, starting over, Spanish markup) are js/investigations/vocabulary.js.

const $ = id => document.getElementById(id);
const resetWords = () => import('./investigations/vocabulary.js');
/** Spanish takes the late words at once: the markup carries English until then. */
const lateWords = () =>
  getLocale() !== 'en' &&
  resetWords().then(
    m => m.activate(),
    () => {}
  );

/** The rail controls an open investigation does not own, by element id and message key. */
const RAIL = {
  refreshScenarioBtn: 'rail.refreshScenario',
  resetAllBtn: 'rail.resetAll',
  cleanSimBtn: 'rail.cleanSim',
};
/** What each was bound to, so closing hands it back exactly. */
const bound = new Map();
let leaving = false;

function railWords() {
  for (const [id, key] of Object.entries(RAIL)) {
    const el = $(id);
    if (!el) continue;
    if (!bound.has(id)) bound.set(id, { ...el.dataset });
    delete el.dataset.i18n;
    delete el.dataset.i18nTitle;
    el.textContent = t('reset.leave', { what: t(key) });
    el.title = t('reset.leave.hint', { what: t(`${key}.hint`) });
  }
}

/**
 * Name the rail's sandbox controls for what they do to an open investigation:
 * they leave its scene. Outside one they are as they always were.
 * @param {boolean} on - An investigation is open
 */
export function railLeavesScene(on) {
  leaving = on;
  // In memory only: whether the scene was altered when this one was left.
  if (!on && open) left.set(open, has && changed());
  if (on) {
    lateWords();
    return railWords();
  }
  for (const [id, key] of Object.entries(RAIL)) {
    const el = $(id);
    const was = bound.get(id);
    if (!el || !was) continue;
    Object.assign(el.dataset, { i18n: was.i18n, i18nTitle: was.i18nTitle });
    el.textContent = t(key);
    el.title = t(`${key}.hint`);
  }
  bound.clear();
}

/** Which investigation is open, how many steps it has seen, where it is (stepView.js hands it over). */
let sceneNow = () => ({});
export const bindSceneContext = fn => (sceneNow = fn);

// The scene as a step drew it: paused or not, how many bodies, whether the
// student placed one, and whether they touched anything outside the lesson
// panel since (a lesson that pauses the run, or bodies that merge, are not theirs).
let start = {
  paused: false,
  count: 0,
  mass: new Map(),
  key: '',
  epoch: 0,
  at: 0,
  placed: false,
  acted: false,
};
/** An instrument settling in puts bodies in the scene for a moment: only later changes are the student's. */
const SETTLE_MS = 3000;
const acted = e => {
  if (!e.target?.closest?.('#investigationPanel')) start.acted = true;
};
let armed = false;
const bodies = () => allBodies().length;
const massOf = () => new Map(allBodies().map(b => [b.id, b.mass]));
/**
 * Whether the student changed the bodies this step drew (placed, launched,
 * removed, burned or reweighed one), as opposed to running or pausing the
 * clock, which a measurement may need. Read when a reading is taken and once a
 * second by the note below, never per frame. The lesson standing a new stage
 * itself (an instrument) is not the student's change.
 * @returns {boolean} Whether a reading would be taken from an altered scene
 */
export function sceneAltered() {
  if (stageKey() !== start.key) rebase();
  return (
    start.placed ||
    getInterventionEpoch() !== start.epoch ||
    (start.acted &&
      Date.now() - start.at > SETTLE_MS &&
      (bodies() !== start.count ||
        [...massOf()].some(([id, m]) => start.mass.get(id) !== m)))
  );
}
const changed = () =>
  sceneAltered() || (start.acted && state.paused !== start.paused);
const rebase = () =>
  (start = {
    paused: state.paused,
    count: bodies(),
    mass: massOf(),
    key: stageKey(),
    epoch: getInterventionEpoch(),
    at: Date.now(),
    placed: false,
    acted: false,
  });

/** Investigations left in this tab, by id: was the scene altered when the student left (never stored). */
const left = new Map();
let timer = 0;
let open = null;
let at = -1;
let has = false;
let said = '';
let el = null;

/** Say a note by message id, or clear it with ''. */
const say = key => {
  said = key;
  if (!el?.isConnected)
    el = $('investigationSaveStatus')?.insertAdjacentElement(
      'afterend',
      Object.assign(document.createElement('p'), {
        className: 'inv-save-status',
        hidden: true,
      })
    );
  el?.setAttribute('role', 'status');
  el?.setAttribute('data-state', 'scene');
  draw();
};
/** The same action as Reset the scene, worded for a student who went exploring. */
const resetAction = (label, title) =>
  Object.assign(document.createElement('button'), {
    type: 'button',
    className: 'ui-button',
    textContent: label,
    title,
    onclick: () => $('investigationResetScenario')?.click(),
  });

const draw = () => {
  if (!el) return;
  el.textContent = said && t(said);
  el.hidden = !said;
  // Offered while the scene is altered: one way back, never done for them.
  if (said === 'saved.scene.leave')
    resetWords().then(() => {
      if (said === 'saved.scene.leave' && el && !el.querySelector('button'))
        el.append(' ', resetAction(t('scene.back'), t('reset.scene.hint')));
    });
};

/**
 * The line a measure step shows when a reading is taken from a scene the
 * student changed, with the one action that fixes it. Cleared when the scene is
 * as the step drew it. A polite live region; it never blocks the reading.
 * @param {?HTMLElement} slot - The step's live region for it
 * @returns {Promise<boolean>} Whether the line is showing
 */
export async function noteAltered(slot) {
  if (!slot) return false;
  const altered = sceneAltered();
  if (altered) await resetWords();
  const now = altered && sceneAltered();
  slot.hidden = !now;
  if (now)
    slot.replaceChildren(
      t('scene.altered'),
      ' ',
      resetAction(t('reset.scene'), t('scene.back'))
    );
  else slot.replaceChildren();
  return now;
}

function tick() {
  if (!sceneNow().id) {
    clearInterval(timer);
    timer = open = 0;
    say('');
  } else if (has && !said && changed()) say('saved.scene.leave');
  // The scene is back as it was drawn (a reset): nothing left to warn of.
  else if (said === 'saved.scene.leave' && !changed()) say('');
  if (Date.now() - start.at <= SETTLE_MS)
    [start.count, start.mass] = [bodies(), massOf()];
}

/**
 * A step was drawn: take its scene as the one to compare against, and say so
 * if this is a return to a step that has one. Drawn again (an instrument
 * arriving, a language) it is the same step: what was said stands.
 * @param {{scene: boolean}} step - What the step has
 */
function noteScene({ scene }) {
  if (!armed) {
    armed = true;
    window.addEventListener(EV_OBJECT_PLACED, () => (start.placed = true));
    window.addEventListener('pointerdown', acted, true);
    window.addEventListener('keydown', acted, true);
  }
  const { id, n, i } = sceneNow();
  const again = id === open && i === at;
  // Said on a return when the scene was altered on the way out, and when that
  // is unknown (a tab closed since: only the step is kept, never the scene).
  const back = id !== open && (i > 0 || n > 1) && left.get(id) !== false;
  if (id !== open) left.delete(id);
  open = id;
  at = i;
  has = scene;
  if (!again || !said) rebase();
  if (!again) say(scene && back ? 'saved.scene.back' : '');
  timer ||= setInterval(tick, 1000);
}

/** The last step state handed to syncReset, for a change of language. */
let shown = null;

/**
 * Name the reset control for the step in force; off, with the reason as text,
 * where there is nothing to rebuild (no scene and no instrument).
 * @param {{scene: boolean, tool: boolean, kind?: string}} step - what the step has
 */
export function syncReset(step) {
  shown = step;
  noteScene(step);
  paintReset(step);
}

function paintReset(step) {
  const button = $('investigationResetScenario');
  const why = $('investigationResetWhy');
  if (!button) return;
  // Resetting the scene puts it back as drawn: nothing left to warn of.
  if (!button.dataset.noted) {
    button.dataset.noted = 1;
    button.addEventListener('click', () => (rebase(), say('')));
  }
  const off = !step.scene && !step.tool;
  button.disabled = off;
  const kind = step.kind === 'portrait' || step.kind === 'quiet';
  button.title = t(kind ? `inv.canvas.reset.${step.kind}` : 'reset.scene.hint');
  button.querySelector('[data-i18n]').textContent = t('reset.scene');
  if (off) button.setAttribute('aria-describedby', 'investigationResetWhy');
  else button.removeAttribute('aria-describedby');
  if (why) {
    why.textContent = off ? t('reset.scene.none') : '';
    why.hidden = !off;
  }
}

/**
 * The toast that says what a reset did: the scene, the instrument or both.
 * @param {{scene: boolean, tool: boolean}} step - What the reset rebuilt
 * @returns {Promise<string>} The words, once they have arrived
 */
export const resetSaid = step => resetWords().then(m => m.resetSaid(step));

onLocaleChange(() => {
  draw();
  if (shown) paintReset(shown);
  if (leaving) railWords();
  lateWords();
});
