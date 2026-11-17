// =============================================================================
// Framing the scene in what a lesson leaves clear
// -----------------------------------------------------------------------------
// The lesson's panels float over the canvas. Up to 900 px wide they stand
// across the bottom as sheets, so the scene has to be framed in the strip
// above them (or beside them on a tablet); wider than that, in what is left
// of the width. The inset is measured from the page here; its arithmetic is
// js/lesson/inset.js, and the orbit's extent is tested without a page.
//
// A fit is asked for and taken on the panel's tick, as the stage's always was:
// the boot resets the camera some way after the lesson has opened, and a reader
// who has touched the view owns it.
// =============================================================================

import { SETTINGS, state } from './appState.js';
import { allBodies, boundRoles, roleBody } from './lessonScene.js';
import { dominantPrimary, orbitalElements } from './orbital.js';
import { insetFromBoxes, SHEET_MAX_WIDTH } from './lesson/inset.js';
import { fitCamera, placedOf } from './lesson/stage.js';
import { stagedStars } from './lesson/stageGate.js';

/** Ticks a fit may wait for the boot to stop moving the camera (6 s). */
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

/** The painted, sizeable box of each element a selector matches. */
function boxesOf(selectors) {
  const out = [];
  for (const el of document.querySelectorAll(selectors.join(','))) {
    if (el.hidden || getComputedStyle(el).visibility === 'hidden') continue;
    const b = el.getBoundingClientRect();
    if (b.width > 8 && b.height > 8) out.push(b);
  }
  return out;
}

/**
 * How much of the window the lesson's furniture is covering, in CSS pixels.
 *
 * Wider than a sheet: the side panels and the control rail, as ever. A panel
 * stacked below the canvas covers the bottom, not a side.
 *
 * @returns {{left: number, right: number, top: number, bottom: number}}
 */
export function lessonInset() {
  if (typeof document === 'undefined') return {};
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

/**
 * The points an orbit sweeps, so the frame holds the whole ellipse and not just
 * where the body happens to be now: its bounding box about the primary.
 *
 * @param {object} body - The orbiting body
 * @param {object} primary - What it orbits
 * @param {number} G - Gravitational constant
 * @returns {Array<{x: number, y: number, radius: number}>}
 */
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

/** What the step binds, with the orbits its bodies are on. */
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

/** Whether the camera is still where a fit put it. */
const sameCamera = was =>
  Math.abs(state.zoom - was.zoom) < 1e-6 &&
  Math.abs(state.pan.x - was.pan.x) < 0.5 &&
  Math.abs(state.pan.y - was.pan.y) < 0.5;

/**
 * Ask for a fit on the next tick, or cancel one. Asking forgets that the
 * reader moved the view, because it is asked for at the start of a step.
 *
 * @param {boolean} [on] - Defaults to yes
 */
export function requestFit(on = true) {
  pending = Boolean(on);
  attempts = 0;
  applied = null;
  if (on) state.cameraTouchedAt = 0;
  else fitted = false;
}

/**
 * Put the points in the clear region, in the canvas's own pixels (the renderer's
 * zoom and pan are in them, and on a high-density screen they are not CSS
 * pixels), with the world's y running up.
 *
 * @param {Array<{x: number, y: number, radius: number}>} points
 * @returns {boolean} Whether the camera moved
 */
export function fitNow(points) {
  const canvas = document.getElementById('simulationCanvas');
  const scale = canvas?.clientWidth ? canvas.width / canvas.clientWidth : 1;
  const inset = lessonInset();
  const off = state.frameOffset || { x: 0, y: 0 };
  const camera = fitCamera(
    points.map(p => ({ x: p.x - off.x, y: p.y - off.y, radius: p.radius })),
    { width: window.innerWidth * scale, height: window.innerHeight * scale },
    {
      // A sheet leaves a small window: spend less of it on air.
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

/** What a fit frames: the stage's stars where a stage stands, else what the step binds. */
const framed = () => {
  const stars = stagedStars();
  return stars.length ? placedOf(stars) : boundPoints();
};

/**
 * Perform a fit that was asked for, once the panels are there to measure.
 * Returns false when there is nothing pending or nothing to measure yet, so it
 * can be polled from a tick that already exists.
 *
 * @returns {boolean} Whether a fit was performed
 */
export function takeFit() {
  if (!pending || typeof document === 'undefined') return false;
  if (state.cameraTouchedAt || ++attempts > MAX_FIT_ATTEMPTS) {
    pending = false;
    applied = null;
    return false;
  }
  const panel = document.getElementById('investigationPanel');
  if (!panel || panel.hidden || !panel.getBoundingClientRect().width)
    return false;
  // Did the last attempt survive? The world's build resets the camera, and on a
  // first load that happens after the lesson has opened.
  if (applied && sameCamera(applied)) {
    pending = false;
    applied = null;
    return false;
  }
  const done = fitNow(framed());
  applied = done ? { zoom: state.zoom, pan: { ...state.pan } } : null;
  return done;
}

/** A step built its own scene: frame its bodies, where the panels are sheets. */
export function frameScene() {
  if (window.innerWidth <= SHEET_MAX_WIDTH) requestFit();
}

/** Frame the scene again (the sheet moved) unless the reader has the camera. */
export function refit() {
  if (fitted && !state.cameraTouchedAt) requestFit();
}
