// Frames the scene in what a lesson's panels leave clear: sheets up to 900 px
// (so the inset has a top and a bottom), the side panels beyond. A fit is asked
// for and taken on the panel's tick; a reader who touches the view owns it.

import { SETTINGS, state } from './appState.js';
import { allBodies, boundRoles, roleBody } from './lessonScene.js';
import {
  SHEET_MAX_WIDTH,
  fitCamera,
  insetFromBoxes,
  placedOf,
} from './lesson/stage.js';
import { getLocale } from './i18n/index.js';
import { stagedStars } from './lesson/stageGate.js';

const MAX_FIT_ATTEMPTS = 24;

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

function boxesOf(selectors) {
  const out = [];
  for (const el of document.querySelectorAll(selectors.join(','))) {
    if (el.hidden || getComputedStyle(el).visibility === 'hidden') continue;
    const b = el.getBoundingClientRect();
    if (b.width > 8 && b.height > 8) out.push(b);
  }
  return out;
}

/** What the lesson's furniture covers of the window, in CSS pixels. */
export function lessonInset() {
  const view = { width: window.innerWidth, height: window.innerHeight };
  if (view.width <= SHEET_MAX_WIDTH)
    return insetFromBoxes(boxesOf(SHEET_PARTS), view);
  let left = 0;
  let right = 0;
  for (const b of boxesOf([
    '#investigationPanel',
    '#investigationTool',
    '#mainControls',
  ])) {
    if (b.bottom < view.height * 0.5) continue;
    if (b.left < view.width * 0.5) left = Math.max(left, b.right);
    else right = Math.max(right, view.width - b.left);
  }
  // What spans the free region (light curve, plot, bar) takes a band, not a side.
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
  if (on) state.cameraTouchedAt = 0;
  else fitted = false;
}

/** Put the points in the clear region, in the canvas's own pixels, y up. */
export function fitNow(points) {
  const canvas = document.getElementById('simulationCanvas');
  const scale = canvas?.clientWidth ? canvas.width / canvas.clientWidth : 1;
  const inset = lessonInset();
  const off = state.frameOffset || { x: 0, y: 0 };
  const camera = fitCamera(
    points.map(p => ({ x: p.x - off.x, y: p.y - off.y, radius: p.radius })),
    { width: window.innerWidth * scale, height: window.innerHeight * scale },
    {
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
  return true;
}

const framed = () => {
  const stars = stagedStars();
  return stars.length ? placedOf(stars) : boundPoints();
};

/** Perform a fit that was asked for, once the panels can be measured. */
export function takeFit() {
  if (!pending) return false;
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
  const done = fitNow(framed());
  applied = done ? { zoom: state.zoom, pan: { ...state.pan } } : null;
  return done;
}

export function frameScene() {
  requestFit();
}

export function refit() {
  if (fitted && !state.cameraTouchedAt) requestFit();
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
  refit();
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
