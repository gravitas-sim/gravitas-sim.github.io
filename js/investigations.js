// =============================================================================
// Investigations: the guided-lesson engine and its panel
// -----------------------------------------------------------------------------
// Turns the lesson descriptions in data/investigations.js into a walkthrough a
// student can work through beside a live simulation, and collects what they
// write down.
//
// Two deliberate choices about assessment:
//
//   Nothing blocks on a correct answer. A student who cannot get a numeric
//   question right should still reach the end of the lesson; being stuck on
//   step 6 forever teaches nothing. Answers are checked and shown, attempts are
//   counted, and the count goes in the report: an instructor can see who
//   struggled without the software refusing to continue.
//
//   Predictions are recorded before the answer is revealed and are never
//   marked wrong in the report. Their value is the commitment, not the
//   correctness; grading them would teach students to skip ahead and look.
//
// Progress lives in localStorage, because the lesson outlives any one page load
//: a rebuild wipes the simulation, and a student will close the tab.
// =============================================================================

import { tickLabel } from './format.js';
import { t, onLocaleChange } from './i18n/index.js';
import { lessonText } from './i18n/lesson.js';
// The registry, not the barrel. ../data/investigations.js pulls all ten lessons
// in statically, which is right for a build script and wrong here: the browser
// draws ten cards from the manifest, and opening one lesson fetches that one.
import {
  MANIFEST,
  investigationMeta,
  hasInvestigation,
  loadInvestigation,
  gradedSteps,
  seriesPosition,
} from './data/investigations/registry.js';
// The thumbnail block and its fallback wiring are shared with the scenario
// gallery and the front door's featured cards, so a borrowed capture lazy-loads
// and degrades identically wherever it appears.
import { scenarioShotHtml, wireThumbnailFallbacks } from './scenarioBrowser.js';
import {
  applyShareState,
  state,
  SETTINGS,
  setInspectorSuppressed,
  hideObjectInspector,
  setAreaSweepWedges,
  getAreaSweepWedges,
  showAreaSweepFor,
  setAreaSweepSuppressed,
  syncPlacementAvailability,
} from './ui.js';
import {
  bh_list,
  stars,
  planets,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
  getSimulationTime,
} from './physics.js';
import { orbitalElements, dominantPrimary, pairEnergy } from './orbital.js';
import {
  formatDistance,
  formatSpeed,
  formatTime,
  formatMass,
  timeUnitSeconds,
} from './units.js';
import { getWidget, widgetDefaults } from './widgets.js';
import {
  rotationCurveState,
  clusterState,
  darkMatterHaloOn,
} from './rotationCurve.js';
import {
  setLightCurveEnabled,
  isLightCurveEnabled,
  setObserverAngle,
  getObserverAngle,
  currentBrightness,
  currentTimeDays,
  clearLightCurve,
  transitAnalysis,
} from './lightCurve.js';
import { encodePayload, shareUrl } from './shareState.js';
import { normalizeSeed, formatSeed } from './rng.js';
import { toast, announce } from './controls.js';
import { buildLabReport, downloadPdf } from './labReport.js';
// Lives in its own module so the instructor answer keys, which are generated
// in Node, can grade with the identical function this page grades with.
import { checkAnswer } from './answerCheck.js';
import { trapFocus } from './focusTrap.js';
import { frameState } from './referenceFrame.js';

export { checkAnswer };

const STORAGE_PREFIX = 'gravitas_investigation_';
const NAME_KEY = 'gravitas_student_name';

let active = null; // the investigation object
let stepIndex = 0;
let responses = {}; // stepId -> value
let attempts = {}; // stepId -> number of tries
let visited = new Set();
let startedAt = null;
let probeTimer = null;
let els = {};
let plotCanvas = null;
let plotTransformed = false;
let plotLog = false;
let toolValues = {};
let toolFrame = null;
let lastToolHtml = '';
let lightCurveOpenedByLesson = false;
// Which step's declarative setup the world on screen was built from.
let appliedSetup = null;
// Settings the lesson overrides while it runs, so they can be handed back.
let lockedSettings = null;

// --- Authoring preview --------------------------------------------------------
// Set by js/authoring/preview.js when ?author= is in the URL. While it is on,
// the lesson is a preview: nothing is read from a student's saved progress and
// nothing is written back to it.
let authoring = null;

/** @returns {boolean} True while the panel is an authoring preview */
export const isAuthoringPreview = () => authoring !== null;

// --- Persistence --------------------------------------------------------------

const storageKey = id => `${STORAGE_PREFIX}${id}`;

function save() {
  if (!active) return;
  // An author looking at step 30 of Tides must not overwrite the progress of
  // whoever is working through Tides on this machine.
  if (authoring) return;
  try {
    localStorage.setItem(
      storageKey(active.id),
      JSON.stringify({
        stepIndex,
        responses,
        attempts,
        visited: [...visited],
        startedAt,
      })
    );
  } catch {
    /* private mode, or the quota is full; progress is not worth an alert */
  }
}

function load(id) {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      stepIndex: Number(data.stepIndex) || 0,
      responses: data.responses || {},
      attempts: data.attempts || {},
      visited: new Set(data.visited || []),
      startedAt: data.startedAt || null,
    };
  } catch {
    return null;
  }
}

/** @returns {string} The student's saved name, if they have given one */
export function getStudentName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

function setStudentName(name) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

/**
 * How far through an investigation a student is.
 *
 * `done` counts steps seen, which is what the progress bar shows; `at` is the
 * step a resume would land on, which is not the same number once a student has
 * gone back to reread something.
 *
 * @param {string} id - Investigation id
 * @returns {{done:number, total:number, started:boolean, at:number}} Progress
 */
export function progressFor(id) {
  // From the manifest: the browser asks this for all ten lessons before any of
  // them is loaded, and a step count is a number the manifest already carries.
  const total = investigationMeta(id)?.stepCount || 0;
  const saved = load(id);
  return {
    done: saved ? saved.visited.size : 0,
    total,
    started: Boolean(saved),
    at: saved ? saved.stepIndex + 1 : 1,
  };
}

// --- Live simulation context --------------------------------------------------

const allBodies = () => [
  ...bh_list,
  ...stars,
  ...planets,
  ...gas_giants,
  ...asteroids,
  ...comets,
  ...neutron_stars,
  ...white_dwarfs,
];

/**
 * Build the object a step's probe reads from.
 *
 * Handing the lesson a prepared context, rather than letting it import the
 * simulation, is what keeps data/investigations.js a description of teaching
 * instead of a piece of the engine.
 */
function probeContext() {
  const G = SETTINGS.gravitational_constant;
  const selected = state.selectedObject?.object || null;
  const primaries = [...bh_list, ...stars, ...neutron_stars, ...white_dwarfs];

  const primaryOf = body =>
    dominantPrimary(
      body,
      primaries.filter(p => p !== body)
    );

  return {
    selected,
    bodies: allBodies(),
    G,
    elements: body => {
      const b = body || selected;
      if (!b) return null;
      const primary = primaryOf(b);
      return primary ? orbitalElements(b, primary, G) : null;
    },
    energy: body => {
      const b = body || selected;
      if (!b) return null;
      const primary = primaryOf(b);
      return primary ? pairEnergy(b, primary, G) : null;
    },
    distance: formatDistance,
    speed: formatSpeed,
    time: formatTime,
    mass: formatMass,
    // The simulated clock itself, in simulated seconds. An instrument that
    // measures anything over time - a period, a resonant angle, a libration -
    // needs the engine's own clock rather than wall time, because the two are
    // not proportional: the frame rate varies and the scenarios run at speeds
    // from one to seven and a half thousand.
    clock: () => getSimulationTime(),
    // Plain numbers, for steps that need to compute rather than display.
    years: simTime => (simTime * timeUnitSeconds()) / 3.15576e7,
    au: simDistance => simDistance * 0.01,
    // Photometry, for the steps that ask students to read a light curve rather
    // than an orbit. The clock is the one the light curve plots against, so a
    // time stamped here lands under the dip the student is looking at.
    flux: () => currentBrightness(),
    days: () => currentTimeDays(),
    observerAngle: () => getObserverAngle(),
    // What the recorded light curve contains: the baseline, every complete
    // transit in it and a running count. A transit that goes past in half a
    // second cannot be caught by hand, and a real measurement is not made that
    // way either.
    photometry: () => transitAnalysis(),
    // The rotation curve and the cluster measurements, so a step can ask a
    // student to read a slope or a dispersion and then check what they read.
    // Same functions the panel itself calls: a lesson and the instrument it
    // points at must not be able to disagree.
    rotationCurve: () => rotationCurveState(),
    cluster: () => clusterState(),
    haloOn: () => darkMatterHaloOn(),
    // Which reference frame the view is in, and where a body lies as seen from
    // its origin. A lesson about retrograde motion has to be able to say
    // "you have not switched frames yet" and to report the direction a body is
    // in, which is the observable the whole subject rests on.
    frame: () => frameState(),
    seenFrom: (body, originName) => {
      const origin = allBodies().find(b =>
        String(b.name || '')
          .toLowerCase()
          .includes(String(originName).toLowerCase())
      );
      if (!body || !origin || body === origin) return null;
      const dx = body.pos.x - origin.pos.x;
      const dy = body.pos.y - origin.pos.y;
      let lon = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (lon < 0) lon += 360;
      return { separation: Math.hypot(dx, dy), longitude: lon };
    },
    find: name =>
      allBodies().find(b =>
        String(b.name || '')
          .toLowerCase()
          .includes(String(name).toLowerCase())
      ),
    /**
     * The Experiment Bench's active experiment, if the bench has been opened.
     *
     * A getter rather than a value, and null rather than an import, because the
     * bench is lazily loaded: a lesson that never touches it must not pull its
     * chunk in, and a widget that reads it has to cope with it not being there
     * yet. The chaos lesson's divergence widget is the only consumer.
     */
    experiment: () => {
      try {
        return window.__gravitasBench?.activeExperiment?.() ?? null;
      } catch {
        return null;
      }
    },
  };
}

// --- Setting up a step's scenario ---------------------------------------------

/**
 * Convert a lesson's declarative setup into a shared-link payload.
 *
 * Reusing the link format means a lesson step and a shared link travel the same
 * code path, so a step cannot set up a state that could not also be handed out
 * as a URL, which is how the "open this exact state" links in the report stay
 * honest.
 *
 * @param {Object} setup - From a step definition
 * @returns {Object} Payload for applyShareState
 */
function payloadFromSetup(setup) {
  const payload = {
    v: 1,
    s: setup.scenario,
    seed: formatSeed(normalizeSeed(setup.seed ?? setup.scenario)),
  };
  if (setup.settings) payload.d = { ...setup.settings };
  if (setup.camera) {
    payload.c = [
      setup.camera.zoom ?? 1.5,
      setup.camera.pan?.x ?? 0,
      setup.camera.pan?.y ?? 0,
    ];
  }
  if (setup.paused) payload.p = 1;
  return payload;
}

function applySetup(setup) {
  if (!setup) return;
  appliedSetup = setup;
  try {
    applyShareState(payloadFromSetup(setup));
    // A rebuild resets settings to the scenario's own, so the lesson's locks
    // have to be reasserted every time rather than set once on open.
    applyLocks();
  } catch (err) {
    console.warn('Could not set up investigation step:', err);
    toast(t('inv.error.scenario'));
  }
}

/**
 * Hold the simulation still in the ways a lesson depends on.
 *
 * Clicking a planet to select it and dragging on empty space to place a new one
 * are the same gesture a few pixels apart, so a student aiming at a planet
 * regularly drops a star next to it instead, which silently changes the system
 * they are measuring. Placement is therefore off by default during a lesson,
 * and can be turned back on for the steps that ask for it.
 */
function applyLocks() {
  if (!active) return;
  const lock = active.lock || {};
  const step = currentStep();
  // A step can opt back in: the energy lesson asks students to launch things.
  const allowPlacement = step?.allowPlacement === true;
  if (lock.placement !== false && !allowPlacement) {
    SETTINGS.interactive_add = false;
  } else {
    SETTINGS.interactive_add = true;
  }
  // The rail button may be lit and the cursor a crosshair from before the
  // lesson opened. Placement is already refused, but the interface should not
  // keep offering it - and on a narrow window the picker would open over the
  // lesson panel itself.
  syncPlacementAvailability();
  // A step can hand the object card back for one screen, which is how the
  // TRAPPIST-1 step lets students click a planet and read its period off the
  // live system.
  const allowInspector = step?.allowInspector === true;
  setInspectorSuppressed(lock.inspector !== false && !allowInspector);
  // A lesson that borrows a scenario built for a different lesson can refuse
  // the overlay that scenario switches on for itself.
  setAreaSweepSuppressed(lock.areaSweep === false);
}

/** Hand the simulation back to the user when a lesson closes. */
function releaseLocks() {
  setInspectorSuppressed(false);
  setAreaSweepSuppressed(false);
  if (lockedSettings) {
    SETTINGS.interactive_add = lockedSettings.interactive_add;
    lockedSettings = null;
  } else {
    SETTINGS.interactive_add = true;
  }
  syncPlacementAvailability();
}

// --- Step helpers -------------------------------------------------------------

// How much a student has to write on a short-answer step before the model
// answer unlocks. Long enough to require a real sentence, short enough that a
// correct terse answer is not held hostage.
const SHORT_ANSWER_MIN = 40;

const stepId = index => `${active.id}:${index}`;
const currentStep = () => active?.steps[stepIndex] ?? null;

// --- Measured values ----------------------------------------------------------

/**
 * The numbers a student has typed into the current step, keyed by field id.
 * @param {Object} step - Step definition
 * @param {string} id - Step response-key prefix
 * @returns {Object} field id -> number (NaN where blank or unparseable)
 */
function fieldValues(step, id) {
  const out = {};
  for (const f of step.fields || []) {
    const raw = responses[`${id}:${f.id}`];
    out[f.id] = raw === undefined || raw === '' ? NaN : Number(raw);
    out[`${f.id}_text`] = raw ?? '';
  }
  return out;
}

/**
 * Fill in any field that is derived from the others.
 *
 * Arithmetic a student does on a calculator and copies back is arithmetic they
 * can get wrong in a way that has nothing to do with the astronomy. Computing
 * the derived value here keeps the assessment pointed at the concept, and it
 * gives the validator a number it can trust.
 *
 * @param {Object} step - Step definition
 * @param {string} id - Step response-key prefix
 * @returns {boolean} True if anything changed
 */
function recomputeFields(step, id) {
  let changed = false;
  const vals = fieldValues(step, id);
  for (const f of step.fields || []) {
    if (!f.compute) continue;
    let next;
    try {
      next = f.compute(vals);
    } catch {
      next = NaN;
    }
    const text = Number.isFinite(next) ? next.toFixed(f.decimals ?? 2) : '';
    if (responses[`${id}:${f.id}`] !== text) {
      responses[`${id}:${f.id}`] = text;
      changed = true;
    }
  }
  return changed;
}

/**
 * Run a step's sanity check over what has been entered.
 * @param {Object} step - Step definition
 * @param {string} id - Step response-key prefix
 * @returns {{level:string, message:string}|null} Feedback, or null
 */
function validateStep(step, id) {
  if (!step.validate) return null;
  try {
    return step.validate(fieldValues(step, id), probeContext()) || null;
  } catch (err) {
    console.warn('Step validation failed:', err);
    return null;
  }
}

// --- Ellipse explorer ---------------------------------------------------------

/**
 * Draw an ellipse with its anatomy labeled, at a chosen eccentricity.
 *
 * Kepler's first law is a statement about a shape, and the shape is the part a
 * student has no intuition for: "the Sun is at a focus" means nothing until you
 * have watched the focus slide out of the center as e grows. The slider is the
 * explanation.
 */
function drawEllipse(canvas, e) {
  if (!canvas) return;
  const css = getComputedStyle(document.documentElement);
  const tok = (n, f) => css.getPropertyValue(n).trim() || f;
  const ink = tok('--text-primary', '#e9edf7');
  const muted = tok('--text-muted', '#8a8f9e');
  const line = tok('--border-subtle', '#2a2f3d');
  // One color per quantity, matched by the key beneath the canvas.
  const C_A = '#5ec8f5';
  const C_B = '#8de08a';
  const C_C = '#f2a65a';
  const C_STAR = '#ffd34d';
  const C_EMPTY = '#9aa2b8';

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 420;
  const h = 330;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 6;
  // Fit the widest case (e -> 0, a circle) inside the canvas with room for
  // labels, so nothing is ever clipped as the slider moves.
  const a = Math.min(w * 0.4, (h - 96) / 2, 200);
  const b = a * Math.sqrt(Math.max(0, 1 - e * e));
  const c = a * e;

  ctx.font =
    '600 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Axes through the center
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx - a - 12, cy);
  ctx.lineTo(cx + a + 12, cy);
  ctx.moveTo(cx, cy - b - 12);
  ctx.lineTo(cx, cy + b + 12);
  ctx.stroke();
  ctx.setLineDash([]);

  // The ellipse
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2);
  ctx.stroke();

  // a: center to the left edge, above the axis
  const aY = cy - 20;
  ctx.strokeStyle = C_A;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, aY);
  ctx.lineTo(cx - a, aY);
  ctx.stroke();
  ctx.fillStyle = C_A;
  ctx.fillText('a', cx - a / 2, aY - 11);

  // b: center up to the top of the ellipse, to the right of the minor axis
  if (b > 26) {
    ctx.strokeStyle = C_B;
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy);
    ctx.lineTo(cx + 14, cy - b);
    ctx.stroke();
    ctx.fillStyle = C_B;
    ctx.textAlign = 'left';
    ctx.fillText('b', cx + 20, cy - b / 2);
    ctx.textAlign = 'center';
  }

  // c: center to the occupied focus, below the axis
  const cY = cy + 22;
  if (c > 10) {
    ctx.strokeStyle = C_C;
    ctx.beginPath();
    ctx.moveTo(cx, cY);
    ctx.lineTo(cx + c, cY);
    ctx.stroke();
    ctx.fillStyle = C_C;
    ctx.fillText('c', cx + c / 2, cY + 12);
  }

  // The two foci
  const focus = (x, filled, label, color) => {
    ctx.beginPath();
    ctx.arc(x, cy, filled ? 7 : 5, 0, Math.PI * 2);
    if (filled) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = color;
    // Below the axis so it never collides with a or c above it.
    ctx.fillText(label, x, cy + 44);
  };
  focus(cx + c, true, 'star', C_STAR);
  if (c > 10) focus(cx - c, false, 'empty', C_EMPTY);

  // Center marker
  ctx.fillStyle = muted;
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText('center', cx, cy - b - 24);

  // Readout, top left, clear of the figure
  ctx.textAlign = 'left';
  ctx.fillStyle = ink;
  ctx.fillText(`e = ${e.toFixed(3)}`, 6, 16);
  ctx.fillStyle = muted;
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(`b/a = ${(b / a).toFixed(3)}`, 6, 33);
}

// --- Plotting -----------------------------------------------------------------

/** Pick round axis bounds and a tick step that contain the data. */
function niceScale(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    const c = Number.isFinite(min) ? min : 0;
    return { lo: c - 1, hi: c + 1, step: 0.5 };
  }
  const span = max - min;
  const raw = span / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  return {
    lo: Math.floor(min / step) * step,
    hi: Math.ceil(max / step) * step,
    step,
  };
}

/** Format an axis tick without trailing noise. */
const tick = v => tickLabel(v);

/**
 * Least-squares fit through the origin.
 *
 * Forced through zero because the relation being tested has no constant term:
 * a planet with no orbit takes no time. Fitting an intercept would let a bad
 * data set look straight by sliding the line sideways.
 *
 * @param {Array} pts - [{x, y}]
 * @returns {number|null} Slope, or null when it is not determined
 */
function fitSlope(pts) {
  let sxy = 0;
  let sxx = 0;
  for (const p of pts) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    sxy += p.x * p.y;
    sxx += p.x * p.x;
  }
  return sxx > 0 ? sxy / sxx : null;
}

/**
 * Least-squares slope with a free intercept, for log-log axes.
 * @param {Array} pts - [{x, y}]
 * @returns {number|null} Slope
 */
function logSlope(pts) {
  const n = pts.length;
  if (n < 2) return null;
  const mx = pts.reduce((t, p) => t + p.x, 0) / n;
  const my = pts.reduce((t, p) => t + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

/**
 * Draw the step's scatter plot.
 *
 * The point of the toggle is that a power law is hard to judge by eye as a
 * curve and trivial to judge as a straight line, which is exactly the move
 * that turns four measurements into evidence for Kepler's third law.
 */
function drawPlot(step, id) {
  if (!plotCanvas || !step.plot) return;
  const spec = step.plot;
  const vals = fieldValues(step, id);
  let pts;
  try {
    pts = (spec.points(vals) || []).filter(
      p => Number.isFinite(p.x) && Number.isFinite(p.y)
    );
  } catch {
    pts = [];
  }
  const transform = plotTransformed && spec.transform ? spec.transform : null;
  let shown = transform ? pts.map(transform.map) : pts;
  // Log axes: with Mercury at 0.39 AU and Neptune at 30, a linear plot crushes
  // the inner planets into the corner. On log-log a power law is still a
  // straight line, and the spacing becomes readable.
  const useLog = plotLog && shown.every(p => p.x > 0 && p.y > 0);
  if (useLog) {
    shown = shown.map(p => ({
      x: Math.log10(p.x),
      y: Math.log10(p.y),
      label: p.label,
    }));
  }

  const css = getComputedStyle(document.documentElement);
  const token = (name, fallback) =>
    css.getPropertyValue(name).trim() || fallback;
  const ink = token('--text-primary', '#e9edf7');
  const muted = token('--text-muted', '#8a8f9e');
  const grid = token('--border-subtle', '#2a2f3d');
  const accent = token('--accent', '#38bdf8');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = plotCanvas.clientWidth || 320;
  const h = spec.height || 260;
  plotCanvas.width = w * dpr;
  plotCanvas.height = h * dpr;
  plotCanvas.style.height = `${h}px`;
  const ctx = plotCanvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const padL = 46;
  const padB = 30;
  const padT = 12;
  const padR = 10;
  const plotW = Math.max(10, w - padL - padR);
  const plotH = Math.max(10, h - padT - padB);

  const xs = shown.map(p => p.x);
  const ys = shown.map(p => p.y);
  // Always include the origin: the relation is anchored there, and a plot that
  // starts at the first data point hides how far the trend has to reach.
  const sx = useLog
    ? niceScale(Math.min(...xs), Math.max(...xs))
    : niceScale(Math.min(0, ...xs), Math.max(0, ...xs, 1));
  const sy = useLog
    ? niceScale(Math.min(...ys), Math.max(...ys))
    : niceScale(Math.min(0, ...ys), Math.max(0, ...ys, 1));
  const X = v => padL + ((v - sx.lo) / (sx.hi - sx.lo)) * plotW;
  const Y = v => padT + plotH - ((v - sy.lo) / (sy.hi - sy.lo)) * plotH;

  // Grid and ticks
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.strokeStyle = grid;
  ctx.lineWidth = 1;
  ctx.fillStyle = muted;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = sy.lo; v <= sy.hi + 1e-9; v += sy.step) {
    const y = Y(v);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.fillText(tick(v), padL - 6, y);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let v = sx.lo; v <= sx.hi + 1e-9; v += sx.step) {
    const x = X(v);
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    ctx.fillText(tick(v), x, padT + plotH + 6);
  }

  // Axis labels
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';
  const xLab = transform ? transform.xLabel : spec.xLabel;
  const yLab = transform ? transform.yLabel : spec.yLabel;
  ctx.fillText(useLog ? `log10( ${xLab} )` : xLab, padL + plotW / 2, h - 11);
  ctx.save();
  ctx.translate(11, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'middle';
  ctx.fillText(useLog ? `log10( ${yLab} )` : yLab, 0, 0);
  ctx.restore();

  // Fitted line, only in the transformed view where straightness is the claim
  if ((transform || useLog) && shown.length >= 2) {
    const slope = useLog ? logSlope(shown) : fitSlope(shown);
    if (slope !== null) {
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      if (useLog) {
        // y = slope*x + intercept in log space.
        const mx = shown.reduce((t, p) => t + p.x, 0) / shown.length;
        const my = shown.reduce((t, p) => t + p.y, 0) / shown.length;
        const b0 = my - slope * mx;
        ctx.moveTo(X(sx.lo), Y(slope * sx.lo + b0));
        ctx.lineTo(X(sx.hi), Y(slope * sx.hi + b0));
      } else {
        ctx.moveTo(X(sx.lo), Y(slope * sx.lo));
        ctx.lineTo(X(sx.hi), Y(slope * sx.hi));
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`slope ${slope.toFixed(3)}`, padL + 6, padT + 4);
    }
  }

  // Points
  for (const p of shown) {
    const x = X(p.x);
    const y = Y(p.y);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (p.label) {
      ctx.fillStyle = ink;
      // Flip the label to the left of the point when it would otherwise run off
      // the right edge, which is exactly where the outermost planet lands.
      const lw = ctx.measureText(p.label).width;
      const flip = x + 7 + lw > padL + plotW;
      ctx.textAlign = flip ? 'right' : 'left';
      ctx.textBaseline = y - 12 < padT ? 'top' : 'bottom';
      ctx.fillText(
        p.label,
        flip ? x - 7 : x + 7,
        ctx.textBaseline === 'top' ? y + 8 : y - 5
      );
    }
  }

  if (!shown.length) {
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t('inv.plot.placeholder'), padL + plotW / 2, padT + plotH / 2);
  }
}

// --- Panel rendering ----------------------------------------------------------

const escape = text =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Escape for use inside a double-quoted attribute. */
const attr = text => escape(text).replace(/"/g, '&quot;');

/** Lesson prose carries a little inline markup, but never arbitrary HTML. */
const prose = text =>
  escape(text)
    // [\s\S] rather than . : lesson prose is written in template literals that
    // wrap across lines, and a tag spanning a newline was left as raw markup on
    // screen.
    .replace(/&lt;strong&gt;([\s\S]*?)&lt;\/strong&gt;/g, '<strong>$1</strong>')
    .replace(/&lt;em&gt;([\s\S]*?)&lt;\/em&gt;/g, '<em>$1</em>')
    // Real subscripts and superscripts: R<sub>p</sub> rather than R_p, which a
    // student then has to translate back into the algebra they were taught.
    .replace(/&lt;sub&gt;([\s\S]*?)&lt;\/sub&gt;/g, '<sub>$1</sub>')
    .replace(/&lt;sup&gt;([\s\S]*?)&lt;\/sup&gt;/g, '<sup>$1</sup>')
    .replace(/\n\s*\n/g, '</p><p>')
    .replace(/\s+/g, ' ');

function renderStep() {
  const step = currentStep();
  if (!step || !els.body) return;
  const id = stepId(stepIndex);
  const saved = responses[id];

  const parts = [
    `<p class="inv-step-count">${escape(
      t('inv.step.counter', { n: stepIndex + 1, total: active.steps.length })
    )}
       <span class="inv-step-kind">${escape(t(`inv.step.kind.${step.type}`))}</span></p>`,
    `<h3 class="inv-step-title">${escape(step.title)}</h3>`,
    `<div class="inv-step-body"><p>${prose(step.body)}</p></div>`,
  ];

  if (step.type === 'wedges') {
    const n = getAreaSweepWedges();
    parts.push(
      `<div class="inv-wedge-control">
         <label class="inv-ecc-row" for="invWedgeCount">
           <span>Slices</span>
           <input type="range" id="invWedgeCount" data-wedges min="3" max="16"
                  step="1" value="${n}" />
           <output data-wedges-out>${n}</output>
         </label>
         <p class="inv-wedge-readout" data-wedges-readout></p>
       </div>`
    );
  }

  if (step.figure) {
    const f = step.figure;
    // Credit is part of the block rather than a footnote: these are other
    // people's photographs, used under licences that require naming them.
    const credit = [
      f.author
        ? `<a href="${attr(f.source)}" target="_blank" rel="noopener noreferrer">${escape(f.author)}</a>`
        : '',
      f.license
        ? `<a href="${attr(f.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(f.license)}</a>`
        : '',
      f.changes ? escape(f.changes) : '',
    ]
      .filter(Boolean)
      .join(', ');
    parts.push(
      `<figure class="inv-figure">
         <img src="${attr(f.src)}" alt="${attr(f.alt)}" loading="lazy" decoding="async" />
         <figcaption>
           <span class="inv-figure-caption">${prose(f.caption)}</span>
           ${credit ? `<span class="inv-figure-credit">${credit}</span>` : ''}
         </figcaption>
       </figure>`
    );
  }

  if (step.quote) {
    parts.push(
      `<figure class="inv-quote">
         <blockquote>${prose(step.quote.text)}</blockquote>
         <figcaption>${escape(step.quote.by)}</figcaption>
       </figure>`
    );
  }

  if (step.tip) {
    parts.push(
      `<p class="inv-tip"><span aria-hidden="true">💡</span> ${prose(step.tip)}</p>`
    );
  }

  if (step.type === 'explore' && step.checklist) {
    parts.push(
      `<ul class="inv-checklist">${step.checklist
        .map((c, i) => {
          const key = `${id}:check:${i}`;
          const on = responses[key] ? 'checked' : '';
          return `<li><label><input type="checkbox" data-check="${key}" ${on} /> <span>${prose(c)}</span></label></li>`;
        })
        .join('')}</ul>`
    );
  }

  if (step.type === 'predict' || step.kind === 'choice') {
    const locked = saved !== undefined;
    parts.push(`<p class="inv-prompt">${prose(step.prompt)}</p>`);
    parts.push(
      `<div class="inv-options" role="radiogroup" aria-label="${escape(step.prompt)}">${step.options
        .map((opt, i) => {
          const chosen = Number(saved) === i;
          const correct = locked && i === step.answer;
          const wrongPick = locked && chosen && i !== step.answer;
          const cls = [
            'inv-option',
            chosen ? 'is-chosen' : '',
            correct ? 'is-correct' : '',
            wrongPick ? 'is-wrong' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return `<button type="button" class="${cls}" data-option="${i}" role="radio"
                    aria-checked="${chosen}" ${locked ? 'disabled' : ''}>
                    <span class="inv-option-mark">${String.fromCharCode(65 + i)}</span>
                    <span>${prose(opt)}</span></button>`;
        })
        .join('')}</div>`
    );
    if (locked && step.because) {
      parts.push(`<p class="inv-because">${prose(step.because)}</p>`);
    }
  }

  if (step.kind === 'short') {
    parts.push(`<p class="inv-prompt">${prose(step.prompt)}</p>`);
    parts.push(
      `<textarea class="inv-answer" data-answer="${id}" rows="4"
         placeholder="Write your answer here…">${escape(saved || '')}</textarea>`
    );
    // A written answer no one ever sees an answer to is not an exercise, it is
    // a diary entry. The model answer is available, but only once the student
    // has written enough to have committed to something: reading it first and
    // then writing turns the step into a copying task.
    if (step.because) {
      const shown = responses[`${id}:shown`] === true;
      const ready = String(saved || '').trim().length >= SHORT_ANSWER_MIN;
      parts.push(
        `<div class="inv-short-reveal">
           <button type="button" class="ui-button" data-reveal="${id}"
                   ${shown ? 'hidden' : ''} ${ready ? '' : 'disabled'}>
             Compare with a model answer
           </button>
           <span class="inv-short-hint" data-reveal-hint ${shown || ready ? 'hidden' : ''}>
             Write your own answer first.
           </span>
           <div class="inv-because is-model" data-reveal-body ${shown ? '' : 'hidden'}>
             <strong>${escape(t('inv.answer.oneGood'))}</strong> ${prose(step.because)}
           </div>
         </div>`
      );
    }
  }

  if (step.kind === 'numeric') {
    const locked = saved !== undefined && saved !== '';
    const right = locked ? checkAnswer(step, saved) : null;
    parts.push(`<p class="inv-prompt">${prose(step.prompt)}</p>`);
    parts.push(
      `<div class="inv-numeric">
         <input type="text" inputmode="decimal" class="inv-answer-num" data-numeric="${id}"
                value="${escape(saved ?? '')}" placeholder="${attr(t('inv.answer.placeholder'))}" />
         ${step.unit ? `<span class="inv-unit">${escape(step.unit)}</span>` : ''}
         <button type="button" class="ui-button" data-check-numeric="${id}">${escape(t('inv.answer.check'))}</button>
       </div>`
    );
    if (right === true) {
      parts.push(
        `<p class="inv-feedback is-right">${escape(t('inv.answer.matches'))} ${prose(step.because || '')}</p>`
      );
    } else if (right === false) {
      parts.push(
        `<p class="inv-feedback is-wrong">${escape(t('inv.answer.notYet'))}
         ${attempts[id] >= 3 ? `<br /><em>${prose(step.because || '')}</em>` : ''}</p>`
      );
    }
  }

  if (step.type === 'measure' && step.fields) {
    recomputeFields(step, id);
    if (step.importFromSelection) {
      parts.push(
        `<div class="inv-import-row">
           <button type="button" class="inv-import-btn" data-import>
             ${escape(step.importLabel || t('inv.import.default'))}
           </button>
           <span class="inv-import-hint" data-import-hint></span>
         </div>`
      );
    }
    parts.push(
      `<div class="inv-fields">${step.fields
        .map(f => {
          const key = `${id}:${f.id}`;
          const derived = Boolean(f.compute);
          return `<label class="inv-field${derived ? ' is-derived' : ''}">
              <span class="inv-field-label">${prose(f.label)}${f.unit ? ` <span class="inv-field-unit">(${escape(f.unit)})</span>` : ''}${derived ? ' <span class="inv-field-auto">worked out for you</span>' : ''}</span>
              <input type="text" ${f.kind === 'text' ? '' : 'inputmode="decimal"'}
                     data-field="${key}" value="${escape(responses[key] ?? '')}"
                     ${derived ? 'readonly tabindex="-1"' : ''}
                     placeholder="${escape(f.hint || '')}" />
            </label>`;
        })
        .join('')}</div>`
    );
    parts.push('<div class="inv-check" data-check-slot></div>');
  }

  els.body.innerHTML = parts.join('');

  // Both classes are set before the panels are filled, not after: a widget
  // sizes its canvas from the space it is about to be given, and reads these
  // classes to know what that is. Toggling them afterwards left every
  // measurement screen drawing at full height and pushing its own controls out
  // of view.
  //
  // investigation-aux: a second panel is docked beside the lesson. The light
  // curve gives up height to it when both are on screen.
  document.body.classList.toggle(
    'investigation-aux',
    Boolean(step?.tool || step?.plot || step?.type === 'ellipse')
  );
  // investigation-split: a step carries an instrument and a plot at once, which
  // is what a measurement screen wants: read the value off the instrument, type
  // it in, watch the point land. The two panels dock to the same place, so they
  // are told to share the column.
  document.body.classList.toggle(
    'investigation-split',
    Boolean(step?.tool && step?.plot)
  );

  syncPlotPanel(step);
  syncEllipsePanel(step);
  syncToolPanel(step);
  syncLightCurve(step);
  renderProbe();
  renderFooter();
  bindStepInputs();
  refreshMeasurements();
}

/**
 * Show or hide the docked plot panel for the current step.
 * @param {Object} step - Step definition
 */
function syncPlotPanel(step) {
  if (!els.plotPanel) return;
  const spec = step?.plot;
  els.plotPanel.hidden = !spec;
  plotCanvas = spec ? els.plotCanvas : null;
  if (!spec) return;
  els.plotTitle.textContent = spec.title || t('inv.plot.title');
  els.plotNote.innerHTML = spec.note ? prose(spec.note) : '';
  els.plotNote.hidden = !spec.note;
  if (els.plotToggle) {
    els.plotToggle.hidden = !spec.transform;
    if (spec.transform) {
      els.plotToggle.textContent = spec.transform.label;
      els.plotToggle.setAttribute('aria-pressed', String(plotTransformed));
      els.plotToggle.classList.toggle('is-on', plotTransformed);
    }
  }
}

/**
 * Show or hide the ellipse explorer panel for the current step.
 * @param {Object} step - Step definition
 */
function syncEllipsePanel(step) {
  if (!els.ellipsePanel) return;
  const on = step?.type === 'ellipse';
  els.ellipsePanel.hidden = !on;
  if (!on) return;
  const id = stepId(stepIndex);
  const e = Number(responses[`${id}:e`] ?? step.start ?? 0.5);
  els.ecc.value = String(e);
  els.eccOut.textContent = e.toFixed(3);
  els.presets.innerHTML = (step.presets || [])
    .map(
      (pr, i) =>
        `<button type="button" class="inv-preset" data-preset="${i}">${escape(pr.label)}<span>${pr.e.toFixed(3)}</span></button>`
    )
    .join('');
  els.presets.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pr = currentStep().presets[Number(btn.dataset.preset)];
      els.ecc.value = String(pr.e);
      paintEllipse(pr.e);
      els.presetNote.innerHTML = prose(pr.note || '');
    });
  });
  els.presetNote.textContent = '';
  paintEllipse(e);
}

/**
 * Show or hide the interactive instrument for the current step.
 *
 * A widget is a canvas, some sliders and a readout, all described in
 * transitWidgets.js. Rendering them from one place means a lesson adds an
 * instrument by naming it, and the panel, the persistence and the redraw on a
 * theme change all come for free.
 *
 * @param {Object} step - Step definition
 */
function syncToolPanel(step) {
  if (!els.toolPanel) return;
  const spec = step?.tool;
  const widget = spec ? getWidget(spec.id) : null;
  stopToolLoop();
  els.toolPanel.hidden = !widget;
  if (!widget) return;

  const id = stepId(stepIndex);
  // Values persist per step, so moving back to a step finds the sliders where
  // they were left rather than reset to the lesson's opening position.
  toolValues = widgetDefaults(widget, spec.values);
  for (const c of widget.controls) {
    const saved = responses[`${id}:tool:${c.id}`];
    if (saved !== undefined && saved !== '' && Number.isFinite(Number(saved))) {
      toolValues[c.id] = Number(saved);
    }
  }

  els.toolTitle.textContent = spec.title || widget.title;
  els.toolNote.innerHTML = prose(spec.note ?? widget.note ?? '');
  els.toolNote.hidden = !els.toolNote.innerHTML;

  const shown = widget.controls.filter(c => !spec.hide?.includes(c.id));
  els.toolControls.innerHTML = shown
    .map(
      c => `<label class="inv-ecc-row" for="invTool-${escape(c.id)}">
              <span>${prose(c.label)}</span>
              <input type="range" id="invTool-${escape(c.id)}" data-tool="${escape(c.id)}"
                     min="${c.min}" max="${c.max}" step="${c.step}"
                     value="${toolValues[c.id]}" />
              <output data-tool-out="${escape(c.id)}"></output>
            </label>`
    )
    .join('');
  // An empty controls block is a bordered strip of nothing, so it is left out
  // rather than left blank.
  els.toolControls.hidden = shown.length === 0;

  // A widget can decide its buttons from the step: the binary instrument grows
  // a stopwatch on the step that asks for one and not before.
  const actions =
    (typeof widget.actions === 'function'
      ? widget.actions(spec)
      : widget.actions) || [];
  els.toolActions.innerHTML = actions
    .map(
      a =>
        `<button type="button" class="inv-tool-action" data-tool-action="${escape(a.id)}">${escape(a.label)}</button>`
    )
    .join('');
  els.toolActions.hidden = !actions.length;

  // Presets can depend on the step, the same way actions already can. A step
  // that hides a control has to be able to hide the presets that would set it:
  // the rotation-curve fitting instrument hides its halo sliders while a student
  // is asked to fit with stars alone, and a reachable "published decomposition"
  // button there would hand over the answer and, worse, show a good fit with no
  // visible reason for it.
  const declared =
    typeof widget.presets === 'function'
      ? widget.presets(spec)
      : widget.presets;
  const presets = spec.presets === false ? [] : declared || [];
  els.toolPresets.innerHTML = presets
    .map(
      (pr, i) =>
        `<button type="button" class="inv-preset" data-tool-preset="${i}">${escape(pr.label)}</button>`
    )
    .join('');
  els.toolPresets.hidden = presets.length === 0;
  els.toolPresetNote.textContent = '';

  const applied = () => {
    els.toolControls.querySelectorAll('[data-tool]').forEach(input => {
      input.value = String(toolValues[input.dataset.tool]);
    });
    // A widget that animates starts its run again from the new settings, which
    // is what makes the launch experiment feel like an experiment: change the
    // speed, watch it happen.
    widget.reset?.(toolValues, { autorun: true, spec });
    paintTool();
  };

  els.toolControls.querySelectorAll('[data-tool]').forEach(input => {
    input.addEventListener('input', () => {
      toolValues[input.dataset.tool] = Number(input.value);
      els.toolPresetNote.textContent = '';
      applied();
    });
  });
  els.toolPresets.querySelectorAll('[data-tool-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pr = presets[Number(btn.dataset.toolPreset)];
      Object.assign(toolValues, pr.values);
      els.toolPresetNote.innerHTML = prose(pr.note || '');
      applied();
    });
  });
  els.toolActions.querySelectorAll('[data-tool-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      try {
        widget.act?.(btn.dataset.toolAction, toolValues, spec);
      } catch (err) {
        console.warn('Widget action failed:', err);
      }
      paintTool();
    });
  });

  // A step can ask for the instrument to sit still until the student presses
  // Run, which is what a prediction step needs: showing them the answer while
  // asking them to predict it defeats the point of asking.
  widget.reset?.(toolValues, { autorun: spec.autorun !== false, spec });
  paintTool();
  if (widget.animated) startToolLoop(widget, spec);
}

/**
 * Run a widget that has to redraw itself continuously.
 *
 * Two kinds need it: one that animates a trajectory, and one that plots the
 * live simulation. Both are stopped the moment the step changes, so a lesson
 * never leaves a loop running behind a hidden panel.
 *
 * @param {Object} widget - The widget to drive
 */
function startToolLoop(widget, toolSpec) {
  let last = performance.now();
  const tick = now => {
    if (toolFrame === null) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    try {
      widget.step?.(toolValues, dt, toolSpec);
      paintTool({ quiet: true });
    } catch (err) {
      console.warn('Widget frame failed:', err);
      stopToolLoop();
      return;
    }
    toolFrame = requestAnimationFrame(tick);
  };
  toolFrame = requestAnimationFrame(tick);
}

/** Stop the widget repaint loop, if one is running. */
function stopToolLoop() {
  if (toolFrame !== null) cancelAnimationFrame(toolFrame);
  toolFrame = null;
}

/**
 * Redraw the current widget, refresh its readout and remember its settings.
 * @param {Object} [opts]
 * @param {boolean} [opts.quiet] - Skip the settings save, for animation frames
 */
function paintTool({ quiet = false } = {}) {
  const step = currentStep();
  const widget = step?.tool ? getWidget(step.tool.id) : null;
  if (!widget || !els.toolCanvas) return;
  const id = stepId(stepIndex);

  for (const c of widget.controls) {
    const out = els.toolControls.querySelector(`[data-tool-out="${c.id}"]`);
    if (out) {
      const value = Number(toolValues[c.id]);
      out.textContent = c.format
        ? c.format(value)
        : `${value.toFixed(c.decimals ?? 2)}${c.unit ? ` ${c.unit}` : ''}`;
    }
    if (!quiet) responses[`${id}:tool:${c.id}`] = String(toolValues[c.id]);
  }

  // Only widgets that ask for it are handed the simulation, so the rest stay
  // testable models that run with no world loaded.
  const ctx = widget.live ? probeContext() : undefined;
  try {
    widget.draw(els.toolCanvas, toolValues, ctx, step.tool);
    const html = widget
      .readout(toolValues, ctx, step.tool)
      .map(
        r =>
          `<div class="inv-tool-row${r.emphasis ? ' is-emphasis' : ''}">
             <span>${prose(r.label)}</span><span>${escape(r.value)}</span></div>`
      )
      .join('');
    if (html !== lastToolHtml) {
      els.toolReadout.innerHTML = html;
      // A widget can decide it has nothing to report, and an empty readout is a
      // bordered strip of nothing rather than a neutral absence.
      els.toolReadout.hidden = !html;
      lastToolHtml = html;
    }
  } catch (err) {
    console.warn('Widget draw failed:', err);
  }
  if (!quiet) save();
}

/**
 * Open or close the live light curve for the current step.
 *
 * Turned on from the lesson rather than left for the student to find in the
 * Tools menu, because a step that says "watch the dip" is useless if the plot
 * it means is three clicks away. It is only turned off again if the lesson was
 * the thing that opened it.
 *
 * @param {Object} step - Step definition
 */
function syncLightCurve(step) {
  if (step?.lightCurve === true) {
    if (!isLightCurveEnabled()) {
      setLightCurveEnabled(true);
      lightCurveOpenedByLesson = true;
    }
    if (Number.isFinite(step.observerAngle)) {
      setObserverAngle(step.observerAngle);
    }
    if (step.clearLightCurve) clearLightCurve();
  } else if (lightCurveOpenedByLesson && step?.lightCurve === false) {
    setLightCurveEnabled(false);
    lightCurveOpenedByLesson = false;
  }
  reflowForLightCurve();
}

/**
 * Tell the layout whether the light curve is on screen.
 *
 * Read from the tool's real state rather than from what the step asked for,
 * because a student can open or close it from the Tools menu at any point and
 * an instrument panel sized for the wrong answer either overlaps it or wastes
 * half the column.
 */
function reflowForLightCurve() {
  document.body.classList.toggle(
    'investigation-lightcurve',
    Boolean(active) && isLightCurveEnabled()
  );
}

/** Draw the ellipse and record the eccentricity as the step's answer. */
function paintEllipse(e) {
  if (!active) return;
  els.eccOut.textContent = Number(e).toFixed(3);
  drawEllipse(els.ellipseCanvas, Number(e));
  responses[`${stepId(stepIndex)}:e`] = String(e);
  save();
}

/**
 * Recompute derived fields, re-run the sanity check and redraw the plot.
 * Called on every keystroke in a measure step.
 */
function refreshMeasurements() {
  const step = currentStep();
  if (!step || step.type !== 'measure') return;
  const id = stepId(stepIndex);

  if (recomputeFields(step, id)) {
    for (const f of step.fields || []) {
      if (!f.compute) continue;
      const input = els.body.querySelector(`[data-field="${id}:${f.id}"]`);
      if (input) input.value = responses[`${id}:${f.id}`] ?? '';
    }
    save();
  }

  const slot = els.body.querySelector('[data-check-slot]');
  if (slot) {
    const result = validateStep(step, id);
    slot.className = `inv-check${result ? ` is-${result.level}` : ''}`;
    slot.innerHTML = result ? prose(lessonText(result.message)) : '';
    slot.hidden = !result;
  }

  drawPlot(step, id);
}

function renderFooter() {
  const step = currentStep();
  if (authoring?.render) authoring.render(active, stepIndex);
  els.prev.disabled = stepIndex === 0;
  els.next.textContent =
    stepIndex === active.steps.length - 1
      ? t('inv.action.finish')
      : t('inv.action.next');
  const pct = Math.round((visited.size / active.steps.length) * 100);
  els.progressBar.style.width = `${pct}%`;
  els.progressText.textContent = t('inv.progress.steps', {
    done: visited.size,
    total: active.steps.length,
  });
  els.probeWrap.hidden = !step?.probe;
}

let lastProbeHtml = '';
let lastSweepId = null;

function renderProbe() {
  const step = currentStep();

  // A step can ask for the equal-area wedges to follow whatever is selected,
  // so that clicking from planet to planet redraws them for each orbit.
  if (step?.showAreaSweep) {
    const sel = state.selectedObject?.object || null;
    if (sel && sel.id !== lastSweepId) {
      lastSweepId = sel.id;
      showAreaSweepFor(sel);
    }
  }

  if (!step?.probe || !els.probe) {
    lastProbeHtml = '';
    return;
  }
  let rows;
  try {
    rows = step.probe(probeContext());
  } catch (err) {
    console.warn('Probe failed:', err);
    rows = [{ label: t('inv.probe.unavailable'), value: '-' }];
  }
  const html = rows
    .map(
      r =>
        `<div class="inv-probe-row${r.emphasis ? ' is-emphasis' : ''}">
           <span>${escape(lessonText(r.label))}</span><span>${escape(lessonText(r.value))}</span></div>`
    )
    .join('');
  // Only touch the DOM when something changed: this runs several times a second
  // and rewriting it every tick makes the text unselectable, which matters when
  // the whole point is copying numbers out of it.
  if (html !== lastProbeHtml) {
    els.probe.innerHTML = html;
    lastProbeHtml = html;
  }
}

function bindStepInputs() {
  const id = stepId(stepIndex);

  els.body.querySelectorAll('[data-option]').forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = Number(btn.dataset.option);
      responses[id] = choice;
      attempts[id] = (attempts[id] || 0) + 1;
      save();
      renderStep();
      const step = currentStep();
      const right = checkAnswer(step, choice);
      announce(
        right
          ? t('inv.answer.correct')
          : `${t('inv.answer.recorded')} ${step.because ? step.because : ''}`
      );
    });
  });

  els.body.querySelectorAll('[data-answer]').forEach(area => {
    area.addEventListener('input', () => {
      responses[id] = area.value;
      save();
      const btn = els.body.querySelector('[data-reveal]');
      if (btn && !btn.hidden) {
        const ready = area.value.trim().length >= SHORT_ANSWER_MIN;
        btn.disabled = !ready;
        const hint = els.body.querySelector('[data-reveal-hint]');
        if (hint) hint.hidden = ready;
      }
    });
  });

  els.body.querySelectorAll('[data-reveal]').forEach(btn => {
    btn.addEventListener('click', () => {
      responses[`${btn.dataset.reveal}:shown`] = true;
      save();
      btn.hidden = true;
      const hint = els.body.querySelector('[data-reveal-hint]');
      if (hint) hint.hidden = true;
      const body = els.body.querySelector('[data-reveal-body]');
      if (body) {
        body.hidden = false;
        announce(t('inv.answer.model'));
      }
    });
  });

  els.body.querySelectorAll('[data-field]').forEach(input => {
    if (input.hasAttribute('readonly')) return;
    input.addEventListener('input', () => {
      responses[input.dataset.field] = input.value;
      save();
      refreshMeasurements();
    });
  });

  const wedgeSlider = els.body.querySelector('[data-wedges]');
  if (wedgeSlider) {
    const out = els.body.querySelector('[data-wedges-out]');
    const readout = els.body.querySelector('[data-wedges-readout]');
    const apply = () => {
      const n = Number(wedgeSlider.value);
      out.textContent = String(n);
      setAreaSweepWedges(n);
      const ov = state.areaSweepOverlay;
      if (readout && ov?.wedgeTime) {
        readout.innerHTML =
          `Each slice is <strong>${(100 / n).toFixed(1)}%</strong> of the orbit's area, ` +
          `and the planet spends <strong>${formatTime(ov.wedgeTime)}</strong> ` +
          `traversing every one of them.`;
      }
      responses[`${stepId(stepIndex)}:wedges`] = String(n);
      save();
    };
    wedgeSlider.addEventListener('input', apply);
    apply();
  }

  els.body.querySelector('[data-import]')?.addEventListener('click', () => {
    importSelection();
  });

  const numeric = els.body.querySelector('[data-numeric]');
  const checkBtn = els.body.querySelector('[data-check-numeric]');
  if (numeric && checkBtn) {
    const submit = () => {
      responses[id] = numeric.value;
      attempts[id] = (attempts[id] || 0) + 1;
      save();
      renderStep();
    };
    checkBtn.addEventListener('click', submit);
    numeric.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
  }
}

/**
 * Copy the selected object's measurements into the next empty row.
 *
 * Reading four numbers off a panel and retyping them is where transcription
 * errors come from, and they are indistinguishable in the report from a student
 * who misunderstood the physics. The click still requires them to have chosen
 * the object, which is the part that is actually being assessed.
 */
function importSelection() {
  const step = currentStep();
  if (!step?.importFromSelection) return;
  const id = stepId(stepIndex);
  const ctx = probeContext();
  let values;
  try {
    values = step.importFromSelection(ctx);
  } catch (err) {
    console.warn('Import failed:', err);
    values = null;
  }
  const hint = els.body.querySelector('[data-import-hint]');
  if (!values) {
    if (hint) hint.textContent = t('inv.import.needObject');
    return;
  }

  const groups = step.importGroups || [];

  // Refuse a row that is already recorded. Two clicks between one transit and
  // the next would otherwise stamp the same event twice and hand back a period
  // of zero, and the same click on the same planet would duplicate a row in a
  // measurement table.
  const already = groups.some(g =>
    g.every(
      (fid, i) =>
        String(responses[`${id}:${fid}`] ?? '').trim() === String(values[i])
    )
  );
  if (already) {
    if (hint) hint.textContent = t('inv.import.duplicate');
    return;
  }

  // Find the first row whose fields are all still empty.
  const target = groups.find(g =>
    g.every(fid => String(responses[`${id}:${fid}`] ?? '').trim() === '')
  );
  if (!target) {
    if (hint) hint.textContent = t('inv.import.full');
    return;
  }

  target.forEach((fid, i) => {
    if (values[i] !== undefined) responses[`${id}:${fid}`] = String(values[i]);
  });
  save();
  renderStep();
  const h = els.body.querySelector('[data-import-hint]');
  if (h) h.textContent = `Added ${values[0]}.`;
}

// --- Navigation ---------------------------------------------------------------

/**
 * The scenario a step runs against.
 *
 * Not every step carries its own setup: a lesson sets up a system once and
 * then asks several things about it. Walking backwards to the most recent one
 * is what makes resuming work: a student who closes the tab on step 6 and comes
 * back would otherwise return to whatever scenario happened to be loaded,
 * reading questions about a system that is no longer on screen.
 *
 * @param {number} index - Step index
 * @returns {Object|null} The setup in force at that step
 */
function setupInForceAt(index) {
  for (let i = index; i >= 0; i--) {
    if (active.steps[i]?.setup) return active.steps[i].setup;
  }
  return null;
}

/**
 * Move to a step.
 * @param {number} index - Step to show
 * @param {Object} [opts]
 * @param {boolean} [opts.rebuild] - Reload the scenario in force at that step
 */
function goToStep(index, { rebuild = false } = {}) {
  if (!active) return;
  stepIndex = Math.max(0, Math.min(active.steps.length - 1, index));
  visited.add(stepIndex);

  // Reload when the scenario the step belongs to is not the one on screen, and
  // only then, so work a student has done: objects placed, mass changed,
  // survives moving between questions about the same system.
  //
  // Comparing the setup in force rather than testing for a setup on this step
  // is what makes going backwards correct. The transit lesson swaps in a
  // blended binary near the end; stepping back to an earlier measurement used
  // to leave that binary loaded, so a student re-doing the measurement would
  // quietly be measuring the wrong system.
  const setup = setupInForceAt(stepIndex);
  if (rebuild || (setup && setup !== appliedSetup)) applySetup(setup);
  else applyLocks();

  // A lesson that leaves the inspector reachable, as the black hole one does,
  // can have its object card open when the student moves on. The card is a
  // 600px panel docked in exactly the place an instrument goes, so a step that
  // carries one would open with its picture completely hidden behind a card
  // about the previous step. Steps with nothing docked keep the card.
  const opened =
    active.lock?.inspector === false ||
    active.steps.some(x => x.allowInspector);
  if (opened && (currentStep()?.tool || currentStep()?.plot)) {
    hideObjectInspector();
  }

  save();
  renderStep();
  els.body.scrollTop = 0;
}

function next() {
  if (stepIndex === active.steps.length - 1) {
    openFinish();
    return;
  }
  goToStep(stepIndex + 1);
}

// --- Opening and closing ------------------------------------------------------

// Bumped by every open and every close. A lesson now arrives over the network,
// and a student who changes their mind while it is on the way - closes the
// browser, or picks a different card - must not have the abandoned one open on
// top of them when it lands.
let openGeneration = 0;

/**
 * Start or resume an investigation.
 * @param {string} id - Investigation id
 * @returns {Promise<void>} Resolves once the lesson is open, or abandoned
 */
export async function openInvestigation(id) {
  const generation = ++openGeneration;
  // The one await in the panel's life. Everything below it runs against a
  // lesson that is fully in hand, so no other code path had to learn that a
  // lesson might not be there yet.
  const inv = await loadInvestigation(id);
  if (!inv || generation !== openGeneration) return;
  active = inv;
  // In an authoring preview the saved progress is not read at all: an author is
  // shown a clean lesson rather than somebody's half-finished one, and reading
  // it would also mean the position they asked for could be silently overridden.
  const saved = authoring ? null : load(id);
  responses = saved?.responses || {};
  attempts = saved?.attempts || {};
  visited = saved?.visited || new Set();
  startedAt = saved?.startedAt || new Date().toISOString();
  stepIndex = saved?.stepIndex || 0;
  if (authoring?.step) {
    stepIndex = Math.min(Math.max(authoring.step - 1, 0), inv.steps.length - 1);
  }

  lockedSettings = { interactive_add: SETTINGS.interactive_add };
  els.panel.hidden = false;
  els.panel.classList.add('is-open');
  els.title.textContent = inv.title;
  els.subtitle.textContent = inv.subtitle;
  document.body.classList.add('investigation-open');
  closeBrowser({ restoreFocus: false });
  // Focus follows the choice into the panel. Without this, closing the browser
  // destroys the focused card and drops a keyboard user at the top of the
  // document, with the lesson they just started somewhere below them.
  els.title.focus?.();
  // A scenario introduction card left over from before the lesson opened lands
  // squarely on top of the instrument panel. New ones are suppressed for the
  // duration; this dismisses the one that may already be up.
  const infoBox = document.getElementById('scenarioInfoBox');
  if (infoBox) infoBox.classList.remove('showUI', 'show');
  // rebuild: the simulation on screen belongs to whatever the student was doing
  // before, not to the step they are resuming at.
  goToStep(stepIndex, { rebuild: true });
  startProbeLoop();
  announce(t('inv.announce.started', { title: inv.title }));
}

/** Close the investigation panel, keeping progress. */
export function closeInvestigation() {
  // Cancels a lesson still on its way, as well as closing one already here.
  openGeneration++;
  if (!els.panel) return;
  els.panel.hidden = true;
  els.panel.classList.remove('is-open');
  document.body.classList.remove('investigation-open');
  stopProbeLoop();
  releaseLocks();
  if (els.plotPanel) els.plotPanel.hidden = true;
  if (els.ellipsePanel) els.ellipsePanel.hidden = true;
  stopToolLoop();
  if (els.toolPanel) els.toolPanel.hidden = true;
  document.body.classList.remove('investigation-lightcurve');
  document.body.classList.remove('investigation-aux');
  if (lightCurveOpenedByLesson) {
    setLightCurveEnabled(false);
    lightCurveOpenedByLesson = false;
  }
  plotCanvas = null;
  active = null;
}

/** @returns {boolean} True while a lesson panel is open */
export const isInvestigationOpen = () => Boolean(active);

function startProbeLoop() {
  stopProbeLoop();
  // Four times a second: fast enough that a changing speed reads as live, slow
  // enough that a student can select the text and copy it.
  probeTimer = setInterval(renderProbe, 250);
}

function stopProbeLoop() {
  if (probeTimer) clearInterval(probeTimer);
  probeTimer = null;
}

// --- The lesson browser -------------------------------------------------------
//
// Visually a sibling of the scenario gallery: the same surface tokens, the same
// borrowed thumbnails, the same monospaced count line above the grid. It is not
// the same card, though, and the differences are the point. A scenario is a
// portrait tile you click on a whim; a lesson is an hour of work with a report
// at the end, so it gets a wide landscape card with room to say how long it
// takes, how many steps it is, what you will be able to do afterwards, and how
// far through it you already are. Eight of those read as a syllabus. Forty-odd
// small tiles read as a catalog. Each list looks like the thing it is.
//
// There is deliberately no search box and no filter chips here. Eight lessons
// fit on two scrolls, and a filter over eight items is furniture.

/** Minutes named in a `duration` string, as a [low, high] pair. */
function durationRange(text) {
  const nums = String(text || '').match(/\d+/g);
  if (!nums?.length) return [0, 0];
  const low = Number(nums[0]);
  return [low, nums.length > 1 ? Number(nums[1]) : low];
}

/**
 * The line above the grid: how much work the whole set is, and where the
 * student has got to in it.
 *
 * Nothing here is written down anywhere. Adding a lesson changes the sentence.
 *
 * @param {Array<Object>} list - The catalog
 * @returns {string} A sentence
 */
export function browserSummary(list = MANIFEST) {
  const steps = list.reduce((n, inv) => n + inv.stepCount, 0);
  const [low, high] = list.reduce(
    ([a, b], inv) => {
      const [l, h] = durationRange(inv.duration);
      return [a + l, b + h];
    },
    [0, 0]
  );
  const hours = (lo, hi) => {
    const l = Math.round(lo / 60);
    const h = Math.round(hi / 60);
    return l === h
      ? t('inv.summary.about', { h })
      : t('inv.summary.range', { l, h });
  };

  const parts = [
    t('inv.summary.lessons', { n: list.length }),
    t('inv.summary.steps', { n: steps }),
    t('inv.summary.work', { hours: hours(low, high) }),
  ];

  // Progress, only once there is some: eight "not started" markers say nothing.
  const progress = list.map(inv => progressFor(inv.id));
  const done = progress.filter(p => p.started && p.done >= p.total).length;
  const going = progress.filter(p => p.started && p.done < p.total).length;
  if (done) parts.push(t('inv.summary.complete', { n: done }));
  if (going) parts.push(t('inv.summary.going', { n: going }));

  return parts.join(' · ');
}

/**
 * The level to show on a card, if any.
 *
 * Every lesson currently reads "Introductory astronomy", and eight identical
 * pills are noise. So the shared level is stated once in the header and a card
 * carries one only when it is the odd one out.
 *
 * @param {Object} inv - Investigation
 * @param {string|null} shared - The level the whole catalog shares, or null
 * @returns {string} A level, or the empty string
 */
const cardLevel = (inv, shared) =>
  inv.level === shared ? '' : inv.level || '';

/** The one level the whole catalog shares, or null if they differ. */
function sharedLevel(list = MANIFEST) {
  const levels = new Set(list.map(inv => inv.level).filter(Boolean));
  return levels.size === 1 ? [...levels][0] : null;
}

function browserCardHtml(inv, index, shared) {
  const p = progressFor(inv.id);
  const complete = p.started && p.done >= p.total;
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  const series = seriesPosition(inv);
  const level = cardLevel(inv, shared);

  // What the card's one control promises. A student who left off at step 12 of
  // 35 wants to be told that, not "Start".
  const cta = complete
    ? t('inv.card.review')
    : p.started
      ? t('inv.card.resume', { n: p.at })
      : t('inv.card.start');

  const status = complete
    ? t('inv.card.complete')
    : p.started
      ? t('inv.card.seen', { done: p.done, total: p.total })
      : '';

  // The whole card is the control, so its accessible name has to carry
  // everything scanning it gives a sighted reader.
  const label = [
    inv.title,
    inv.subtitle,
    series
      ? t('inv.card.series', {
          label: series.label,
          index: series.index,
          of: series.of,
        })
      : '',
    t('inv.summary.steps', { n: inv.stepCount }),
    inv.duration,
    status,
    cta,
  ]
    .filter(Boolean)
    .join('. ');

  return `<button type="button" class="inv-card${complete ? ' is-complete' : ''}"
            data-investigation="${escape(inv.id)}"
            aria-label="${attr(label)}" title="${attr(inv.summary || inv.title)}">
      <span class="inv-card-shot">
        ${scenarioShotHtml(inv, inv.title)}
        <span class="inv-card-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
        <span class="inv-card-clock" aria-hidden="true">${escape(inv.duration)}</span>
      </span>
      <span class="inv-card-body">
        <span class="inv-card-flags${series || level ? '' : ' is-empty'}">
          ${
            series
              ? `<span class="inv-flag is-series">${escape(series.label)}
                   <b>${series.index}/${series.of}</b></span>`
              : ''
          }
          ${level ? `<span class="inv-flag">${escape(level)}</span>` : ''}
        </span>
        <span class="inv-card-title">${escape(inv.title)}</span>
        <span class="inv-card-sub">${escape(inv.subtitle)}</span>
        <span class="inv-card-summary">${escape(inv.summary)}</span>
        <span class="inv-card-meta">
          <span>${escape(t('inv.summary.steps', { n: inv.stepCount }))}</span>
          <span>${escape(t('inv.card.objectives', { n: inv.objectiveCount }))}</span>
          <span>${escape(t('inv.card.report'))}</span>
        </span>
        <span class="inv-card-foot">
          ${
            p.started
              ? `<span class="inv-card-progress">
                   <span class="inv-card-bar"><span style="width:${pct}%"></span></span>
                   <span class="inv-card-status${complete ? ' is-done' : ''}">${escape(status)}</span>
                 </span>`
              : ''
          }
          <span class="inv-card-cta">${escape(cta)}<span aria-hidden="true"> →</span></span>
        </span>
      </span>
    </button>`;
}

function renderBrowser() {
  if (!els.list) return;
  const shared = sharedLevel();

  if (els.count) {
    els.count.textContent = browserSummary();
  }
  // The level, said once, where it is a fact about the set rather than a pill
  // repeated eight times.
  if (els.level) {
    els.level.hidden = !shared;
    if (shared)
      els.level.textContent = t('inv.summary.level', {
        level: shared.toLowerCase(),
      });
  }

  els.list.innerHTML = MANIFEST.map((inv, i) =>
    browserCardHtml(inv, i, shared)
  ).join('');

  wireThumbnailFallbacks(els.list);

  els.list.querySelectorAll('[data-investigation]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Opening is a fetch now, so the card says so. On a warm cache this class
      // is added and removed within a frame and nobody sees it; on a phone on
      // campus wifi it is the difference between a considered wait and a card
      // that looks broken.
      btn.setAttribute('aria-busy', 'true');
      const cta = btn.querySelector('.inv-card-cta');
      const wasCta = cta?.textContent;
      if (cta) cta.textContent = t('inv.card.loading');
      openInvestigation(btn.dataset.investigation)
        .catch(() => toast(t('inv.load.failed')))
        .finally(() => {
          btn.removeAttribute('aria-busy');
          if (cta && wasCta) cta.textContent = wasCta;
        });
    });
  });
}

// Where focus was when the browser opened. The panel is an aria-modal dialog,
// so leaving focus behind it would let a keyboard user tab through the rail
// underneath, and closing it would drop them at the top of the document.
/** Releases the browser's focus trap while it is open. */
let releaseBrowserFocus = null;

let browserLastFocus = null;

/** Show the list of available investigations. */
export function openBrowser() {
  if (!els.browser) return;
  browserLastFocus = document.activeElement;
  renderBrowser();
  els.browser.classList.remove('hidden');
  // Both of them. #investigationBrowserScroll is the list, but the element that
  // actually scrolls is #investigationBrowserContent, and resetting only the
  // former left the panel wherever it had been.
  if (els.browserScroll) els.browserScroll.scrollTop = 0;
  if (els.browserContent) els.browserContent.scrollTop = 0;
  // The browser declares aria-modal="true"; without a trap, Tab left it for
  // the rail behind and a screen reader could browse the whole page under it.
  // The trap also marks the background inert and restores focus on release.
  releaseBrowserFocus = trapFocus(els.browserContent, {
    returnFocusTo: browserLastFocus,
    // Focus is placed on the first card below, after the panel has laid out.
    initialFocus: null,
  });
  // The first lesson, not the close button: the point of arriving here is to
  // choose one, and it puts the keyboard user at the top of the same list a
  // sighted user is reading. Deferred because a display change has to land
  // before the element can take focus.
  //
  // preventScroll, because the first card sits below the panel's heading and
  // its intro paragraph. Without it the browser scrolls the newly focused card
  // into view and drags the heading off the top: at 320x568 the panel opened
  // 137px down, so the first thing a reader saw was the second half of a
  // sentence and no title at all.
  setTimeout(() => {
    els.list?.querySelector('.inv-card')?.focus({ preventScroll: true });
    if (els.browserContent) els.browserContent.scrollTop = 0;
  }, 60);
}

/**
 * Hide the list of investigations.
 * @param {Object} [opts]
 * @param {boolean} [opts.restoreFocus] - Send focus back where it came from.
 *   False when a lesson is opening: the panel takes focus instead, and putting
 *   it back on the rail button first would be a visible detour.
 */
export function closeBrowser({ restoreFocus = true } = {}) {
  els.browser?.classList.add('hidden');
  if (releaseBrowserFocus) {
    const release = releaseBrowserFocus;
    releaseBrowserFocus = null;
    // The trap restores focus itself, so it is only released that way when the
    // caller wants focus back; otherwise the background is un-inerted without
    // moving focus, which is what opening a lesson from a card needs.
    if (restoreFocus) {
      release();
      browserLastFocus = null;
      return;
    }
    release();
  }
  if (
    restoreFocus &&
    browserLastFocus &&
    document.contains(browserLastFocus) &&
    browserLastFocus !== document.body
  ) {
    browserLastFocus.focus();
  }
  browserLastFocus = null;
}

const isBrowserOpen = () =>
  Boolean(els.browser) && !els.browser.classList.contains('hidden');

// --- Finishing and the report -------------------------------------------------

function openFinish() {
  if (!els.finish) return;
  const graded = gradedSteps(active);
  const answered = graded.filter(s => {
    const i = active.steps.indexOf(s);
    const id = stepId(i);
    if (s.type === 'measure') {
      return s.fields?.some(f =>
        String(responses[`${id}:${f.id}`] ?? '').trim()
      );
    }
    return String(responses[id] ?? '').trim() !== '';
  }).length;

  els.finishSummary.innerHTML = `
    <p>You have worked through <strong>${visited.size} of ${active.steps.length}</strong>
       steps and answered <strong>${answered} of ${graded.length}</strong> questions.</p>
    <p class="inv-finish-note">A report is only needed if you are submitting this for
       credit. If you are here for your own interest, you can simply close the panel: your progress is saved either way.</p>`;
  els.nameInput.value = getStudentName();
  els.finish.classList.remove('hidden');
  els.nameInput.focus();
}

function closeFinish() {
  els.finish?.classList.add('hidden');
}

async function generateReport() {
  const name = els.nameInput.value.trim();
  if (!name) {
    els.nameInput.focus();
    els.nameError.hidden = false;
    return;
  }
  els.nameError.hidden = true;
  setStudentName(name);

  els.downloadBtn.disabled = true;
  els.downloadBtn.textContent = t('inv.report.building');
  try {
    // The setup states are turned into real links here rather than at authoring
    // time, so a report always points at the encoding this build produces.
    const links = [];
    for (let i = 0; i < active.steps.length; i++) {
      const setup = active.steps[i].setup;
      if (!setup) continue;
      const fragment = await encodePayload(payloadFromSetup(setup));
      links.push({
        step: i + 1,
        title: active.steps[i].title,
        url: shareUrl(fragment),
      });
    }

    // The plot lives on whichever step owns it, so find it rather than relying
    // on the student being parked there when they press Download.
    let plot = null;
    const here = stepIndex;
    for (let i = 0; i < active.steps.length; i++) {
      if (!active.steps[i].plot) continue;
      stepIndex = i;
      plot = currentPlotData();
      if (plot) break;
    }
    stepIndex = here;

    const bytes = buildLabReport({
      investigation: active,
      plot,
      name,
      responses,
      attempts,
      visited,
      startedAt,
      links,
      stepIdFor: stepId,
      checkAnswer,
    });

    const slug = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${active.id}`;
    downloadPdf(bytes, `${slug}.pdf`);
    toast(t('inv.report.done'));
    announce(t('inv.report.done'));
  } catch (err) {
    console.error('Report generation failed:', err);
    toast(t('inv.report.failed'));
  } finally {
    els.downloadBtn.disabled = false;
    els.downloadBtn.textContent = t('inv.report.download');
  }
}

function resetProgress() {
  if (!active) return;
  responses = {};
  attempts = {};
  visited = new Set();
  startedAt = new Date().toISOString();
  try {
    if (!authoring) localStorage.removeItem(storageKey(active.id));
  } catch {
    /* ignore */
  }
  closeFinish();
  goToStep(0);
  toast(t('inv.progress.cleared'));
}

// --- Wiring -------------------------------------------------------------------

/**
 * The plot as it currently stands, for the lab report.
 * @returns {Object|null} {points, xLabel, yLabel, slope} or null
 */
export function currentPlotData() {
  const step = currentStep();
  if (!step?.plot) return null;
  const vals = fieldValues(step, stepId(stepIndex));
  let pts;
  try {
    pts = (step.plot.points(vals) || []).filter(
      p => Number.isFinite(p.x) && Number.isFinite(p.y)
    );
  } catch {
    return null;
  }
  if (!pts.length) return null;
  const t = step.plot.transform;
  const shown = t ? pts.map(t.map) : pts;
  return {
    points: shown,
    xLabel: t ? t.xLabel : step.plot.xLabel,
    yLabel: t ? t.yLabel : step.plot.yLabel,
    slope: fitSlope(shown),
  };
}

/** Wire up the investigations panel. Safe to call once, from init. */
/** Lesson id named in the address bar, if there is one. */
function investigationFromHash() {
  const m = /^#investigation=([\w-]+)$/.exec(window.location.hash || '');
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Open the lesson the URL names.
 *
 * Called at start-up and on every hash change, so a link handed out in an
 * assignment lands the student on the right lesson rather than on the browser.
 */
function openInvestigationFromHash() {
  const id = investigationFromHash();
  if (!id) return;
  if (!hasInvestigation(id)) {
    toast(t('inv.link.unknown'));
    return;
  }
  if (active?.id === id) return;
  openInvestigation(id).catch(() => toast(t('inv.load.failed')));
}

// A language change swaps the manifest the cards are drawn from, and rewrites
// every word of the panel's own chrome. Both are repainted rather than left to
// the next open: the browser may be on screen at the time.
onLocaleChange(() => {
  if (els?.browser && !els.browser.classList.contains('hidden'))
    renderBrowser();
  if (active && els?.panel && !els.panel.hidden) {
    els.title.textContent = active.title;
    els.subtitle.textContent = active.subtitle;
    renderStep();
  }
});

export function initInvestigations() {
  els = {
    browser: document.getElementById('investigationBrowser'),
    list: document.getElementById('investigationList'),
    browserScroll: document.getElementById('investigationBrowserScroll'),
    browserContent: document.getElementById('investigationBrowserContent'),
    count: document.getElementById('investigationBrowserCount'),
    level: document.getElementById('investigationBrowserLevel'),
    browserClose: document.getElementById('investigationBrowserClose'),
    browserChip: document.getElementById('investigationBrowserChip'),
    panel: document.getElementById('investigationPanel'),
    title: document.getElementById('investigationTitle'),
    subtitle: document.getElementById('investigationSubtitle'),
    body: document.getElementById('investigationBody'),
    probe: document.getElementById('investigationProbe'),
    probeWrap: document.getElementById('investigationProbeWrap'),
    prev: document.getElementById('investigationPrev'),
    next: document.getElementById('investigationNext'),
    close: document.getElementById('investigationClose'),
    progressBar: document.getElementById('investigationProgressBar'),
    progressText: document.getElementById('investigationProgressText'),
    finish: document.getElementById('investigationFinish'),
    finishSummary: document.getElementById('investigationFinishSummary'),
    nameInput: document.getElementById('investigationName'),
    nameError: document.getElementById('investigationNameError'),
    downloadBtn: document.getElementById('investigationDownload'),
    finishClose: document.getElementById('investigationFinishClose'),
    finishBack: document.getElementById('investigationFinishBack'),
    resetBtn: document.getElementById('investigationReset'),
    resetScenario: document.getElementById('investigationResetScenario'),
    plotPanel: document.getElementById('investigationPlot'),
    plotCanvas: document.getElementById('investigationPlotCanvas'),
    plotTitle: document.getElementById('investigationPlotTitle'),
    plotNote: document.getElementById('investigationPlotNote'),
    plotToggle: document.getElementById('investigationPlotToggle'),
    plotLog: document.getElementById('investigationPlotLog'),
    toolPanel: document.getElementById('investigationTool'),
    toolTitle: document.getElementById('investigationToolTitle'),
    toolCanvas: document.getElementById('investigationToolCanvas'),
    toolNote: document.getElementById('investigationToolNote'),
    toolReadout: document.getElementById('investigationToolReadout'),
    toolControls: document.getElementById('investigationToolControls'),
    toolActions: document.getElementById('investigationToolActions'),
    toolPresets: document.getElementById('investigationToolPresets'),
    toolPresetNote: document.getElementById('investigationToolPresetNote'),
    ellipsePanel: document.getElementById('investigationEllipse'),
    ellipseCanvas: document.getElementById('investigationEllipseCanvas'),
    ecc: document.getElementById('investigationEcc'),
    eccOut: document.getElementById('investigationEccOut'),
    presets: document.getElementById('investigationPresets'),
    presetNote: document.getElementById('investigationPresetNote'),
  };
  if (!els.panel || !els.browser) return;

  document
    .getElementById('investigationsBtn')
    ?.addEventListener('click', () => {
      isBrowserOpen() ? closeBrowser() : openBrowser();
    });
  els.browserClose?.addEventListener('click', closeBrowser);
  els.browserChip?.addEventListener('click', closeBrowser);
  els.browser.addEventListener('click', e => {
    if (e.target === els.browser) closeBrowser();
  });

  els.prev?.addEventListener('click', () => goToStep(stepIndex - 1));
  els.next?.addEventListener('click', next);
  els.close?.addEventListener('click', closeInvestigation);
  els.resetBtn?.addEventListener('click', resetProgress);
  els.ecc?.addEventListener('input', () => {
    paintEllipse(els.ecc.value);
    els.presetNote.textContent = '';
  });

  els.plotLog?.addEventListener('click', () => {
    plotLog = !plotLog;
    els.plotLog.setAttribute('aria-pressed', String(plotLog));
    els.plotLog.classList.toggle('is-on', plotLog);
    drawPlot(currentStep(), stepId(stepIndex));
  });

  els.plotToggle?.addEventListener('click', () => {
    plotTransformed = !plotTransformed;
    els.plotToggle.setAttribute('aria-pressed', String(plotTransformed));
    els.plotToggle.classList.toggle('is-on', plotTransformed);
    drawPlot(currentStep(), stepId(stepIndex));
  });

  els.resetScenario?.addEventListener('click', () => {
    // Left running, a scenario drifts: bodies merge, get flung out, or simply
    // leave the view. Putting the step's system back is a far more common need
    // than restarting the lesson, so it gets its own control.
    applySetup(setupInForceAt(stepIndex));
    toast(t('inv.scenario.reset'));
  });

  els.finishClose?.addEventListener('click', closeFinish);
  els.finishBack?.addEventListener('click', closeFinish);
  els.downloadBtn?.addEventListener('click', generateReport);
  els.finish?.addEventListener('click', e => {
    if (e.target === els.finish) closeFinish();
  });

  // The widget and plot canvases are sized from their panel's width, which is a
  // percentage of the viewport, so a resized window leaves them stretched.
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (!active) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const step = currentStep();
      if (step?.tool) paintTool();
      if (step?.plot) drawPlot(step, stepId(stepIndex));
      if (step?.type === 'ellipse') {
        paintEllipse(responses[`${stepId(stepIndex)}:e`] ?? step.start ?? 0.5);
      }
    }, 150);
  });

  window.addEventListener('gravitasEscape', () => {
    if (els.finish && !els.finish.classList.contains('hidden')) closeFinish();
    else if (isBrowserOpen()) closeBrowser();
  });

  // A lesson can be opened by URL: gravitas-sim.online/#investigation=<id>.
  // That is what makes an investigation assignable, and what the instructor
  // resources link to. Shared simulation links use a different hash shape
  // (digits followed by z or r), so the two cannot be confused.
  openInvestigationFromHash();
  window.addEventListener('hashchange', openInvestigationFromHash);

  // The authoring preview: ?author=<lesson>&step=<n>.
  //
  // Imported dynamically, and only when the URL asks for it, so that neither
  // this module nor the rule engine it pulls in reaches a student's download.
  // Everything in it - the bar, the diagnostics, the rules - is authoring
  // machinery, and the lazy boundary the lessons already use is the right
  // place for it.
  if (/[?&#]author=/.test(window.location.href)) {
    import('./authoring/preview.js')
      .then(preview => {
        const request = preview.authoringRequest();
        if (!request) return;
        if (!hasInvestigation(request.lesson)) {
          toast(t('inv.link.unknown'));
          return;
        }
        authoring = {
          step: request.step,
          render: (inv, index) => preview.renderAuthorBar(inv, index),
        };
        preview.mountAuthorBar(index => goToStep(index));
        openInvestigation(request.lesson).catch(() =>
          toast(t('inv.load.failed'))
        );
      })
      .catch(() => {
        /* the preview is a development aid; its absence is not a student's problem */
      });
  }

  // The plot reads its colors from the theme tokens, so it has to be redrawn
  // when the theme changes rather than keeping the old palette.
  window.addEventListener('gravitasLightCurveToggled', () => {
    if (active) reflowForLightCurve();
  });

  window.addEventListener('gravitasThemeChanged', () => {
    if (!active) return;
    drawPlot(currentStep(), stepId(stepIndex));
    if (currentStep()?.tool) paintTool();
  });

  // Arrow keys move through a lesson, but only when the student is not typing
  // into one of its own answer fields.
  window.addEventListener('keydown', e => {
    if (!active) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
      return;
    }
    if (e.key === 'ArrowRight' && e.shiftKey) {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft' && e.shiftKey) {
      e.preventDefault();
      goToStep(stepIndex - 1);
    }
  });
}
