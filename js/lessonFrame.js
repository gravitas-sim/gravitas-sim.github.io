// Frames the scene in what a lesson's panels leave clear: sheets up to 900 px
// (so the inset has a top and a bottom), the side panels beyond. A fit is asked
// for and taken on the panel's tick; a reader who touches the view owns it.

import { SETTINGS, state } from './appState.js';
import { allBodies, boundRoles, roleBody } from './lessonScene.js';
import { dominantPrimary, orbitalElements } from './orbital.js';
import { insetFromBoxes, SHEET_MAX_WIDTH } from './lesson/inset.js';
import { fitCamera, placedOf } from './lesson/stage.js';
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
  return { left, right, top: 0, bottom: 0 };
}

/** The bounding box of the ellipse a body sweeps about its primary, as points. */
export function orbitPoints(body, primary, G) {
  const here = { x: body.pos.x, y: body.pos.y, radius: body.radius };
  const el = primary && orbitalElements(body, primary, G);
  if (!el?.bound || !(el.a > 0) || el.e >= 1) return [here];
  const phi =
    Math.atan2(body.pos.y - primary.pos.y, body.pos.x - primary.pos.x) -
    el.trueAnomaly;
  const b = el.a * Math.sqrt(1 - el.e * el.e);
  const cx = primary.pos.x - el.a * el.e * Math.cos(phi);
  const cy = primary.pos.y - el.a * el.e * Math.sin(phi);
  const hx = Math.hypot(el.a * Math.cos(phi), b * Math.sin(phi));
  const hy = Math.hypot(el.a * Math.sin(phi), b * Math.cos(phi));
  return [
    here,
    { x: cx - hx, y: cy - hy, radius: 0 },
    { x: cx + hx, y: cy + hy, radius: 0 },
  ];
}

export function boundPoints() {
  const everything = allBodies();
  const out = [];
  for (const role of boundRoles()) {
    const body = roleBody(role);
    if (!body) continue;
    const primary = dominantPrimary(body, everything);
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
  if (window.innerWidth <= SHEET_MAX_WIDTH) requestFit();
}

export function refit() {
  if (fitted && !state.cameraTouchedAt) requestFit();
}
