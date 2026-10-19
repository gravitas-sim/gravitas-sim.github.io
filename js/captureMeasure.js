// =============================================================================
// Capture, measurement and the transport buttons (Prompt 107, slice 10)
// -----------------------------------------------------------------------------
// What a reader does to the running simulation without rebuilding it: the
// area-sweep wedges, speed, screenshot and clip buttons, ruler, protractor and
// stopwatch, demo mode, and the bottom dock (the transport bar and footer
// sharing one edge; it was js/bottomDock.js, folded in to keep the request
// count). Nothing here imports ui.js. Context object: initCaptureMeasure(ctx)
// takes {canvas, starfieldCanvas}; the demo cycle asks for world rebuilding
// through command(). ui.js calls it where these statements ran, so listener
// order is unchanged; the pure functions need no init.
// =============================================================================

import {
  planets,
  asteroids,
  comets,
  gas_giants,
  bh_list,
  stars,
  neutron_stars,
  white_dwarfs,
} from './physics.js';
import { canRecordClips } from './utils.js';
import { state, SETTINGS, current_scenario_name, command } from './appState.js';
import { keplerNewton } from './orbital.js';
import { t, registerMessages, onLocaleChange } from './i18n/index.js';
import { scenarioTitle } from './i18n/scenario.js';
import {
  SCENARIO_SOURCES,
  setCaptureMode,
  isToolActive,
  stopwatchTarget,
  toggleTool,
  latchStopwatchTo,
  stopwatch,
} from './sandboxTools.js';
import { lastEvent } from './pauseAtEventBridge.js';
import { toast } from './notify.js';
import { SCENARIO_INFO } from './data/scenarioInfo.js';
import { resetFollowCamera } from './followCamera.js';
import { EV_LOCALE_CHANGED } from './names.js';

/** The two canvases, handed in by initCaptureMeasure. */
let canvas = null;
let starfieldCanvas = null;

// ---- Area sweep (Kepler's second law) ---------------------------------------
// How many equal-time slices the area-sweep overlay is cut into. Exposed so a
// lesson can let a student change it and watch the areas stay equal.
let areaSweepWedges = 8;

/**
 * Set the number of equal-area wedges and rebuild the overlay.
 * @param {number} n - Wedge count
 */
export const setAreaSweepWedges = n => {
  areaSweepWedges = Math.max(2, Math.min(24, Math.round(n)));
  const ov = state.areaSweepOverlay;
  if (!ov.active || !ov.objectId) return;
  const body = [...planets, ...asteroids, ...comets, ...gas_giants].find(
    o => o.id === ov.objectId
  );
  if (!body) return;
  const data = computeAreaSweep(body, areaSweepWedges);
  if (data) Object.assign(state.areaSweepOverlay, data, { active: true });
};

/** @returns {number} Current wedge count */
export const getAreaSweepWedges = () => areaSweepWedges;

/**
 * Draw the equal-area wedges for a given body.
 *
 * Normally this is reached through the inspector's toggle, which a lesson
 * hides. A lesson that asks a student to click planets and compare their
 * orbits needs the overlay to follow the selection instead.
 *
 * @param {Object} obj - Body to draw the sweep for
 * @returns {boolean} True if an overlay was produced
 */
export const showAreaSweepFor = obj => {
  if (!obj || areaSweepSuppressed) return false;
  const data = computeAreaSweep(obj, areaSweepWedges);
  if (!data) return false;
  Object.assign(state.areaSweepOverlay, data, { active: true });
  return true;
};

// The Kepler's 2nd Law scenario switches the wedges on when it builds, a fifth
// of a second after the rest of it. That is right for the lesson that scenario
// was made for and wrong for any other lesson borrowing the same star and
// planets, so a caller can refuse them outright rather than racing that timer
// to switch them off again.
let areaSweepSuppressed = false;

/**
 * Refuse or allow the equal-area wedges.
 * @param {boolean} on - True to keep them off the screen
 */
export const setAreaSweepSuppressed = on => {
  areaSweepSuppressed = Boolean(on);
  if (areaSweepSuppressed) state.areaSweepOverlay.active = false;
};

/** @returns {boolean} True while the wedges are being refused */
export const isAreaSweepSuppressed = () => areaSweepSuppressed;

/**
 * Build the equal-area wedges for a body's orbit.
 *
 * The orbit is constructed analytically from the orbital elements rather than
 * by integrating. Integrating stepped for exactly one analytic period, but
 * symplectic Euler's own period differs from the analytic one by a fraction of
 * a percent, so the path never quite closed: the wedges spanned 359.3 degrees
 * and left a thin unfilled remainder at periapsis, where the angular rate is
 * highest and the gap is most visible. Solving Kepler's equation instead closes
 * the ellipse exactly and divides it into intervals of exactly equal time,
 * which by conservation of angular momentum are intervals of exactly equal
 * area.
 *
 * @param {Object} obj - The orbiting body
 * @param {number} [wedgeCount] - How many equal-time segments to cut
 * @returns {Object|null} Overlay data, or null if the orbit is not bound
 */
export function computeAreaSweep(obj, wedgeCount = areaSweepWedges) {
  const G = SETTINGS.gravitational_constant;
  const candidates = [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...gas_giants,
  ];
  let parent = null;
  let maxInfluence = -Infinity;
  for (const b of candidates) {
    if (!b || !b.alive || b === obj) continue;
    const dx = obj.pos.x - b.pos.x;
    const dy = obj.pos.y - b.pos.y;
    const r2 = Math.max(1e-6, dx * dx + dy * dy);
    const influence = (G * b.mass) / r2;
    if (influence > maxInfluence) {
      maxInfluence = influence;
      parent = b;
    }
  }
  if (!parent) return null;

  const rx = obj.pos.x - parent.pos.x;
  const ry = obj.pos.y - parent.pos.y;
  const vx = obj.vel.x - parent.vel.x;
  const vy = obj.vel.y - parent.vel.y;

  const r = Math.hypot(rx, ry);
  if (!(r > 0)) return null;
  const mu = G * (parent.mass + (obj.mass || 0));
  const energy = (vx * vx + vy * vy) / 2 - mu / r;
  if (!(energy < 0)) return null; // unbound: no closed orbit to divide

  const a = -mu / (2 * energy);
  const h = rx * vy - ry * vx;
  // Eccentricity vector, which points from the focus toward periapsis.
  const ex = (vy * h) / mu - rx / r;
  const ey = (-vx * h) / mu - ry / r;
  const e = Math.min(0.999, Math.hypot(ex, ey));
  const omega = Math.atan2(ey, ex);
  // Sign of the angular momentum sets the direction of travel.
  const dir = h >= 0 ? 1 : -1;

  // Where the body is now, as a mean anomaly, so the wedges start from it.
  const cosNu = (ex * rx + ey * ry) / (Math.max(e, 1e-9) * r);
  const nu0 =
    Math.sign(rx * ey - ry * ex) === 0
      ? Math.acos(Math.max(-1, Math.min(1, cosNu)))
      : -Math.sign(rx * ey - ry * ex) *
        Math.acos(Math.max(-1, Math.min(1, cosNu)));
  const E0 =
    2 *
    Math.atan2(
      Math.sqrt(1 - e) * Math.sin(nu0 / 2),
      Math.sqrt(1 + e) * Math.cos(nu0 / 2)
    );
  const M0 = E0 - e * Math.sin(E0);

  const N = Math.max(2, Math.min(24, Math.round(wedgeCount)));
  const PER_WEDGE = 90;
  const b = a * Math.sqrt(1 - e * e);
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);

  const at = M => {
    const E = keplerNewton(M, e, e < 0.8 ? M : Math.PI, 1e-13, 40);
    // Perifocal coordinates, then rotated into the simulation frame.
    const xp = a * (Math.cos(E) - e);
    const yp = b * Math.sin(E) * dir;
    return { x: xp * cosW - yp * sinW, y: xp * sinW + yp * cosW };
  };

  const wedges = [];
  const orbitPoints = [];
  for (let w = 0; w < N; w++) {
    const wedge = [];
    for (let k = 0; k <= PER_WEDGE; k++) {
      const M = M0 + 2 * Math.PI * ((w + k / PER_WEDGE) / N);
      const pt = at(M);
      wedge.push(pt);
      if (k < PER_WEDGE || w === N - 1) orbitPoints.push(pt);
    }
    wedges.push(wedge);
  }
  // Close the outline exactly on the point it started from.
  orbitPoints.push({ ...orbitPoints[0] });

  const period = 2 * Math.PI * Math.sqrt((a * a * a) / mu);
  return {
    parentId: parent.id,
    parent,
    objectId: obj.id,
    wedges,
    orbitPoints,
    wedgeCount: N,
    period,
    wedgeTime: period / N,
    a,
    e,
  };
}

// ---- Speed ------------------------------------------------------------------

// Utility functions
/**
 * Update the speed display in the UI to show current simulation speed
 */
export const updateSpeedDisplay = () => {
  const speedDisplay = document.getElementById('speedDisplay');
  if (speedDisplay) {
    // One decimal reads any speed below 0.05 as "0.0x", which looks like the
    // simulation is stopped. A compact scenario can legitimately run at 0.01.
    const v = SETTINGS.sim_speed;
    const shown = v === 0 ? '0' : v < 0.1 ? v.toFixed(2) : v.toFixed(1);
    speedDisplay.textContent = `${shown}\u00d7`;
  }
};

/**
 * Adjust simulation speed with custom stepping:
 * - From <=0.5x downward: 0.5 -> 0.3 -> 0.1 -> 0.0 (pause)
 * - From <=0.5x upward: 0.0 -> 0.1 -> 0.3 -> 0.5
 * - Above 0.5x: steps of 0.5x up to 5.0x
 */
export const adjustSimSpeed = (current, direction) => {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const epsilon = 1e-9;
  const stepsBelow = [0.0, 0.1, 0.3, 0.5]; // ascending

  // Normalize very small values to exact 0
  if (Math.abs(current) < epsilon) current = 0.0;

  // Handle <= 0.5x region with special stepping
  if (current < 0.5 - epsilon) {
    if (direction > 0) {
      for (let i = 0; i < stepsBelow.length; i++) {
        if (stepsBelow[i] > current + epsilon) return stepsBelow[i];
      }
      return 0.5;
    }
    if (direction < 0) {
      for (let i = stepsBelow.length - 1; i >= 0; i--) {
        if (stepsBelow[i] < current - epsilon) return stepsBelow[i];
      }
      return 0.0;
    }
    return current;
  }
  // If exactly ~0.5x, go up to 1.0 or down to 0.3
  if (Math.abs(current - 0.5) <= epsilon) {
    if (direction > 0) return 1.0;
    if (direction < 0) return 0.3;
    return current;
  }

  // Above 0.5x: increments of 0.5
  const next = current + (direction > 0 ? 0.5 : -0.5);
  return clamp(Number(next.toFixed(1)), 0.0, 5.0);
};

/**
 * What a captured frame should call itself.
 *
 * The scenario's translated title, or 'Sandbox' when the user has built the
 * scene by hand and there is no scenario to name. Either way the exported
 * image says which run it is a picture of, which - with the scale bar and the
 * clock beside it - is what makes it citable rather than decorative.
 *
 * @returns {string} The caption to burn into the frame
 */
const captureCaption = () => {
  const named = current_scenario_name && current_scenario_name !== 'None';
  if (!named) return t('capture.caption.sandbox');
  const title = scenarioTitle(current_scenario_name) || current_scenario_name;
  // A scenario built on a real system says where its numbers come from, and
  // when some are approximate (js/data/realSystemSources.js). Its words are a
  // small catalog of their own, loaded before the first capture
  // (ensureCaptureStrings below), so no page that never captures pays for them.
  const cited = captureStringsReady && SCENARIO_SOURCES[current_scenario_name];
  if (!cited) return title;
  const approximate =
    cited.approximate === 'all'
      ? t('capture.caption.approximate.all')
      : cited.approximate === 'some'
        ? t('capture.caption.approximate.some')
        : '';
  const sources = [cited.cites, approximate].filter(Boolean).join('; ');
  // Drawn as a second, smaller line under the title (js/sandboxTools.js).
  return `${title}\n${t('capture.caption.sources', { sources })}`;
};

/** The provenance line's words (js/i18n/en.capture.js), once loaded. */
let captureStringsReady = false;
let captureLoad = null;
/**
 * Load them, both languages, once. Never rejects: a caption without its
 * sources line is still a caption.
 * @returns {Promise<void>}
 */
const ensureCaptureStrings = () =>
  (captureLoad ??= Promise.all([
    import('./i18n/en.capture.js'),
    import('./i18n/es.capture.js'),
  ])
    .then(([en, es]) => {
      registerMessages('en', en.EN_CAPTURE);
      registerMessages('es', es.ES_CAPTURE);
      captureStringsReady = true;
    })
    .catch(() => {
      captureLoad = null;
    }));

/**
 * Take a screenshot of the current simulation
 * Combines the starfield and simulation canvases into a single image
 */
export const takeScreenshot = async () => {
  await ensureCaptureStrings();
  // Ask for the provenance line - the simulated clock, the stopwatch, the
  // vector key - to be painted on the canvas, then let one frame be drawn
  // before reading the pixels back. Live, those readings are in the readout
  // panel and painting them over the simulation as well would say the same
  // thing twice; a saved image has no readout panel, so it needs them.
  // A pause-at-event stop can carry the reader's own note, and an exported
  // figure is exactly where that belongs: the picture shows the moment, the
  // note says what they were looking at.
  setCaptureMode(true, {
    caption: captureCaption(),
    note: lastEvent()?.note || '',
  });
  const capture = () => {
    try {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      tempCtx.drawImage(starfieldCanvas, 0, 0);
      tempCtx.drawImage(canvas, 0, 0);

      const link = document.createElement('a');
      link.download = `gravitas-screenshot-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
      toast(t('capture.screenshotFailed'));
    } finally {
      // A recording holds capture mode on for its whole length. A still taken
      // during one must not switch the burned-in caption and clock off in the
      // middle of the clip.
      if (isRecording()) setCaptureMode(true, { caption: captureCaption() });
      else setCaptureMode(false);
    }
  };
  // Two frames: the first is the one that repaints with the flag set, the
  // second is where it is certainly on the canvas.
  requestAnimationFrame(() => requestAnimationFrame(capture));
};

// ---- Icon buttons -----------------------------------------------------------

/**
 * Point a button that is an icon and a label at another icon and message.
 *
 * The label is a span carrying data-i18n, so moving the id as well as the
 * text keeps a language change mid-recording on the right words; textContent
 * on the button itself would have erased the icon.
 * @param {HTMLElement} btn - The button
 * @param {string} icon - A name from css/icons.css, without the icon- prefix
 * @param {string} id - The message the label should carry
 */
const setIconLabel = (btn, icon, id) => {
  btn.querySelector('.icon')?.setAttribute('class', `icon icon-${icon}`);
  const label = btn.querySelector('[data-i18n]') || btn;
  if (label !== btn) label.dataset.i18n = id;
  label.textContent = t(id);
};

// ---- Demo mode --------------------------------------------------------------
const initializeSimulation = command('initialize_simulation');
const showEnhancedScenarioInfo = command('show_enhanced_scenario_info');
// Demo mode functionality
let demoModeInterval = null;
let demoModeActive = false;
let demoScenarios = Object.keys(SCENARIO_INFO).filter(key => key !== 'None');
let currentDemoIndex = 0;

const startDemoMode = () => {
  if (demoModeActive) return;

  demoModeActive = true;
  const demoBtn = document.getElementById('demoModeBtn');
  demoBtn.classList.add('active');
  setIconLabel(demoBtn, 'stop', 'settings.demoMode.stop');

  // Start with a random scenario
  currentDemoIndex = Math.floor(Math.random() * demoScenarios.length);

  const cycleScenario = () => {
    if (!demoModeActive) return;

    const scenario = demoScenarios[currentDemoIndex];
    SETTINGS.preset_scenario = scenario;
    initializeSimulation();
    state.paused = false;
    showEnhancedScenarioInfo(scenario);
    updateSpeedDisplay();

    // Move to next scenario (randomly)
    currentDemoIndex = Math.floor(Math.random() * demoScenarios.length);
  };

  // Start cycling every 20 seconds
  demoModeInterval = setInterval(cycleScenario, 20000);

  // Start immediately
  cycleScenario();
};

const stopDemoMode = () => {
  if (!demoModeActive) return;

  demoModeActive = false;
  const demoBtn = document.getElementById('demoModeBtn');
  demoBtn.classList.remove('active');
  setIconLabel(demoBtn, 'clapper', 'settings.demoMode');

  if (demoModeInterval) {
    clearInterval(demoModeInterval);
    demoModeInterval = null;
  }
};

// ---- Screenshot and clip recording ------------------------------------------
// --- Clip recording -----------------------------------------------------------
//
// A screenshot documents a moment and most of what this simulation shows is
// motion, so the same Capture group also records a stretch of the run to a
// video file. The recorder itself - the compositing, the container choice, the
// byte and time budgets - is in js/capture.js; what is here is the button, the
// indicator and the save, which are the parts that have to know about this
// page.
//
// js/capture.js is fetched on the first press of the button. Most visits never
// record, and it was 11 KB and a request of every start-up. Until it is here
// nothing is recording, which is all the rest of this module asks of it.

/** js/capture.js, once the record button has fetched it. */
let recorder = null;
function isRecording() {
  return Boolean(recorder?.isRecording());
}

let recordBtn = null;
let recordingBadge = null;
let recordingReadout = null;

/** mm:ss, for the indicator. @param {number} s - Seconds @returns {string} */
const clockText = s => {
  const whole = Math.max(0, Math.floor(s));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/**
 * Paint the button and the indicator from the recorder's own counters, so the
 * two can never disagree with what is actually being written.
 * @param {object|null} status - recordingStatus(), or null when idle
 */
const paintRecordingState = status => {
  const on = Boolean(status?.recording);
  if (recordBtn) {
    recordBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    setIconLabel(
      recordBtn,
      on ? 'stop' : 'video',
      on ? 'rail.record.stop' : 'rail.record'
    );
    recordBtn.title = on ? t('rail.record.stop.hint') : t('rail.record.hint');
  }
  if (!recordingBadge || !recordingReadout) return;
  recordingBadge.hidden = !on;
  if (!on) {
    recordingBadge.removeAttribute('data-nearly');
    return;
  }
  const mb = status.bytes / (1024 * 1024);
  const capMb = status.maxBytes / (1024 * 1024);
  recordingReadout.textContent = `REC ${clockText(status.seconds)}  ${mb.toFixed(0)}/${capMb.toFixed(0)} MB`;
  // Within a tenth of either budget the recording is about to stop itself,
  // which is worth a color rather than a surprise.
  const nearly =
    status.seconds > status.maxSeconds * 0.9 ||
    status.bytes > status.maxBytes * 0.9;
  if (nearly) recordingBadge.setAttribute('data-nearly', 'true');
  else recordingBadge.removeAttribute('data-nearly');
};

/**
 * Save a finished clip, and say why it ended when it was not the user who
 * ended it.
 * @param {Blob|null} blob - The assembled recording
 * @param {object} meta - {reason, seconds, bytes, type}
 */
const saveRecording = (blob, meta) => {
  setCaptureMode(false);
  paintRecordingState(null);
  if (!blob || !blob.size) {
    toast(t('capture.record.failed'));
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `gravitas-clip-${Date.now()}.${recorder.extensionFor(meta.type)}`;
  link.href = url;
  link.click();
  // The Blob is the last thing holding the recording; the URL keeps it alive
  // until it is revoked, so it is revoked as soon as the download has taken
  // its reference.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  const mb = (meta.bytes / (1024 * 1024)).toFixed(1);
  if (meta.reason === 'size') toast(t('capture.record.cappedSize', { mb }));
  else if (meta.reason === 'duration')
    toast(t('capture.record.cappedTime', { mb }));
  else toast(t('capture.record.saved', { s: clockText(meta.seconds), mb }));
};

const toggleRecording = async () => {
  try {
    recorder ??= await import('./capture.js');
  } catch {
    toast(t('capture.record.failed'));
    return;
  }
  if (isRecording()) {
    recorder.stopRecording('user');
    return;
  }
  // The clip carries the same provenance a still does: the scenario title, the
  // scale bar and the simulated clock, burned in for every frame of it.
  await ensureCaptureStrings();
  setCaptureMode(true, { caption: captureCaption() });
  const started = recorder.startRecording({
    sources: [starfieldCanvas, canvas],
    onTick: status => {
      // Re-read the caption rather than holding the one the take started with:
      // a lecturer who loads a second scenario mid-clip would otherwise have
      // the rest of the recording labeled with the first one's name.
      setCaptureMode(true, { caption: captureCaption() });
      paintRecordingState(status);
    },
    onStop: saveRecording,
  });
  if (!started) {
    setCaptureMode(false);
    toast(t('capture.record.unsupported'));
    return;
  }
  paintRecordingState(recorder.recordingStatus());
};

// ---- Measurement tools ------------------------------------------------------
// --- Measurement tools --------------------------------------------------------
//
// The buttons only toggle state; every tool draws itself from the render loop
// and reads the world through the same transform the bodies are drawn with. See
// js/sandboxTools.js for why the handles are stored in world coordinates.

let stopwatchControls = null;
let stopwatchLatchBtn = null;

/** Push the tools' state back onto their buttons. */
const syncToolButtons = () => {
  const pairs = [
    ['toggleRuler', 'ruler'],
    ['toggleProtractor', 'protractor'],
    ['toggleStopwatch', 'stopwatch'],
  ];
  for (const [id, name] of pairs) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('aria-pressed', String(isToolActive(name)));
  }
  if (stopwatchControls) stopwatchControls.hidden = !isToolActive('stopwatch');
  if (stopwatchLatchBtn) {
    stopwatchLatchBtn.setAttribute('aria-pressed', String(!!stopwatchTarget()));
  }
};

// ---- Wiring ----------------------------------------------------------------
/**
 * Bind the buttons. Called once by ui.js, at the point in its start-up where
 * these statements used to run.
 *
 * @param {{canvas: HTMLCanvasElement, starfieldCanvas: HTMLCanvasElement}} ctx
 */
export function initCaptureMeasure(ctx) {
  ({ canvas, starfieldCanvas } = ctx);

  document.getElementById('demoModeBtn').onclick = () => {
    if (demoModeActive) {
      stopDemoMode();
    } else {
      startDemoMode();
    }
  };

  // Cleanup demo mode on page unload
  window.addEventListener('beforeunload', () => {
    if (demoModeActive) {
      stopDemoMode();
    }
  });

  // Speed control functionality
  document.getElementById('slowDownBtn').onclick = () => {
    SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, -1);
    updateSpeedDisplay();
  };

  document.getElementById('speedUpBtn').onclick = () => {
    SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, +1);
    updateSpeedDisplay();
  };

  // Reset view functionality - improved to center on main objects
  document.getElementById('resetViewBtn').onclick = () => {
    // Collect all objects to find the center of mass
    const allObjects = [
      ...bh_list,
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
      ...gas_giants,
      ...planets,
      ...asteroids,
      // Comets belong here for the same reason asteroids do: they are bodies a
      // reader placed or a scenario built, and a view that frames everything
      // except them frames the wrong thing. Debris and particles stay out - they
      // are ejecta, they scatter, and including them would zoom the view out to
      // fit a spray of fragments.
      ...comets,
    ].filter(obj => obj.alive);

    if (allObjects.length > 0) {
      // Calculate center of mass
      let totalMass = 0;
      let centerX = 0;
      let centerY = 0;

      for (const obj of allObjects) {
        totalMass += obj.mass;
        centerX += obj.pos.x * obj.mass;
        centerY += obj.pos.y * obj.mass;
      }

      if (totalMass > 0) {
        centerX /= totalMass;
        centerY /= totalMass;
      }

      // Calculate bounds to determine appropriate zoom level
      let minX = Infinity,
        maxX = -Infinity;
      let minY = Infinity,
        maxY = -Infinity;

      for (const obj of allObjects) {
        minX = Math.min(minX, obj.pos.x);
        maxX = Math.max(maxX, obj.pos.x);
        minY = Math.min(minY, obj.pos.y);
        maxY = Math.max(maxY, obj.pos.y);
      }

      // Add some padding around the objects
      const padding = 50;
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding * 2;

      // Calculate zoom to fit all objects on screen
      const zoomX = canvas.width / width;
      const zoomY = canvas.height / height;
      const newZoom = Math.min(zoomX, zoomY, 2.0); // Cap zoom at 2.0x

      // Set the view to center on the objects
      state.zoom = Math.max(0.1, newZoom);
      state.pan.x = -centerX * state.zoom;
      state.pan.y = centerY * state.zoom;
    } else {
      // Fallback to default view if no objects
      state.zoom = 1.0;
      state.pan = { x: 0.0, y: 0.0 };
    }
    // Reset view is a command, not a drag. Without this, Follow mode's next step
    // would measure the difference it just made and fold it into the very offset
    // this button exists to clear.
    resetFollowCamera(state);
  };

  // Screenshot functionality
  document.getElementById('screenshotBtn').onclick = takeScreenshot;

  recordBtn = document.getElementById('recordBtn');
  recordingBadge = document.getElementById('recordingBadge');
  recordingReadout = document.getElementById('recordingReadout');
  if (recordBtn) {
    // Nothing to offer where MediaRecorder or captureStream is missing: a button
    // that can only apologize is worse than no button.
    if (!canRecordClips()) recordBtn.hidden = true;
    else recordBtn.onclick = toggleRecording;
  }

  // A language change rewrites every data-i18n element from its key, which would
  // put "Record Clip" back on a button that is currently recording.
  onLocaleChange(() => {
    if (isRecording()) paintRecordingState(recorder.recordingStatus());
  });

  // Leaving the page mid-take releases the encoder and the chunks it is holding.
  // The file is lost - a download cannot be started from a page that is going
  // away - but a take that is abandoned should not also leave a recorder running
  // against a canvas that is about to be torn down.
  window.addEventListener('pagehide', () => {
    if (isRecording()) recorder.stopRecording('user');
  });

  stopwatchControls = document.getElementById('stopwatchControls');
  stopwatchLatchBtn = document.getElementById('stopwatchLatch');
  const wireToolToggle = (id, name) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.onclick = () => {
      toggleTool(name, canvas);
      syncToolButtons();
    };
  };
  wireToolToggle('toggleRuler', 'ruler');
  wireToolToggle('toggleProtractor', 'protractor');
  wireToolToggle('toggleStopwatch', 'stopwatch');

  const wireStopwatch = (id, fn) => {
    const el = document.getElementById(id);
    if (el) {
      el.onclick = () => {
        fn();
        syncToolButtons();
      };
    }
  };
  wireStopwatch('stopwatchMark', () => {
    // A manual mark takes the clock off the latch: the two would otherwise both
    // be resetting the same interval and the reading would be whichever fired
    // last, which is not a measurement of anything.
    latchStopwatchTo(null);
    stopwatch().mark();
  });
  wireStopwatch('stopwatchStop', () => stopwatch().stop());
  wireStopwatch('stopwatchReset', () => {
    latchStopwatchTo(null);
    stopwatch().reset();
  });
  wireStopwatch('stopwatchLatch', () => {
    if (stopwatchTarget()) {
      latchStopwatchTo(null);
      stopwatch().reset();
      return;
    }
    const selected = state.selectedObject && state.selectedObject.object;
    if (!selected) {
      toast(t('stopwatch.needBody'));
      return;
    }
    stopwatch().reset();
    latchStopwatchTo(selected);
  });
  syncToolButtons();
}

// ---- Bottom dock ------------------------------------------------------------
// The footer's width, the rail's reach and the transport bar's height depend on
// language, fonts and open sections, so they are measured (ResizeObserver, a
// resize listener and the locale event) and published as custom properties that
// css/chrome.css lays out from: --attribution-width, --attribution-height,
// --rail-footer-inset, --transport-max, --transport-reserve, --footer-reserve,
// and the body class dock-banded (the bar centers beside the footer, not in the
// window, when centering would squeeze it past MIN_BAR).

/* global ResizeObserver */

/** The gap kept between the bar and the footer, and between footer and rail. */
const GAP = 16;

/**
 * The narrowest transport bar still worth having.
 *
 * Three buttons, a slider and a clock. Below this the slider is too short to
 * scrub with, at which point centring the bar has cost more than it bought and
 * the layout falls back to centring it in the space that is actually free.
 */
const MIN_BAR = 420;

let observer = null;
/** The pending coalesced measurement, so a burst of triggers costs one. */
let frame = 0;

/**
 * Measure the footer and the rail, and publish what the layout needs.
 *
 * @param {HTMLElement} footer - The attribution line
 * @param {HTMLElement|null} rail - The control rail, if this page has one
 * @param {HTMLElement|null} bar - The transport bar, whose height is not fixed
 */
function publish(footer, rail, bar) {
  const root = document.documentElement;
  const set = (name, value) => root.style.setProperty(name, value);

  // --- How much of the bottom edge does the transport bar occupy? ----------
  // The investigation panel (side column or bottom sheet) must stop short of
  // it. A constant was short once the bar wrapped to a second row (62px tall,
  // roughly 640-1000px of window): the bar covered the sheet's footer and
  // swallowed the clicks on Back and Next. The bar is laid out even while
  // faded out, so this reads the same before and after it appears.
  const barRect = bar?.getBoundingClientRect();
  const barReserve =
    barRect && barRect.height > 0
      ? Math.ceil(window.innerHeight - barRect.top) + GAP
      : 0;
  set('--transport-reserve', `${barReserve}px`);

  const first = footer.getBoundingClientRect();
  // A hidden footer reserves nothing (it fades in after the splash).
  const visible = first.width > 0 && first.height > 0;
  const footerHeight = visible ? Math.ceil(first.height) : 0;

  set('--attribution-width', visible ? `${Math.ceil(first.width)}px` : '0px');
  set('--attribution-height', `${footerHeight ? footerHeight + GAP : 0}px`);

  // --- Does the footer have to step aside for the rail? --------------------
  // The rail grows downward from the top; on a short window with a section
  // open it can reach the footer's corner. Reserving its width always pushed
  // the footer a quarter of the way across every screen.
  const footerTop = window.innerHeight - footerHeight;
  let railInset = 0;
  if (rail) {
    const r = rail.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > footerTop - GAP) {
      railInset = Math.ceil(r.width) + GAP;
    }
  }
  set('--rail-footer-inset', `${railInset}px`);

  // --- How much room is left for the bar? ----------------------------------
  // Measured after the inset above, not calculated from the design tokens
  // (declared in rem: `0.75rem` once parsed as 0.75 pixels, eleven short).
  const f = visible ? footer.getBoundingClientRect() : first;
  const footerLeftFromRight = visible
    ? Math.ceil(window.innerWidth - f.left)
    : 0;

  // A window-centered bar overruns the footer once half of it reaches the
  // footer's left edge, so the room it has is symmetric: what it gives up on
  // the right it also gives up on the left.
  const centeredMax = Math.max(
    0,
    Math.floor(window.innerWidth - 2 * (footerLeftFromRight + GAP))
  );
  set('--transport-max', `${centeredMax}px`);
  set('--footer-reserve', `${footerLeftFromRight + GAP}px`);

  document.body.classList.toggle('dock-banded', centeredMax < MIN_BAR);
}

/**
 * Start watching the bottom edge. Safe to call once, from init.
 *
 * @returns {boolean} True if there was a footer to watch
 */
export function initBottomDock() {
  const footer = document.getElementById('attribution');
  if (!footer) return false;
  const rail = document.getElementById('mainControls');
  const bar = document.getElementById('timelineBar');

  /** Measure now. Forces a layout, so it reads text as it currently stands. */
  const measure = () => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    publish(footer, rail, bar);
  };

  /**
   * Measure on the next frame, at most once however many times this is called.
   *
   * The observer path uses this rather than measuring inline: publish() moves
   * the elements being observed, which from inside the callback starts a loop.
   */
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      publish(footer, rail, bar);
    });
  };

  measure();

  if (typeof ResizeObserver === 'function') {
    observer?.disconnect();
    observer = new ResizeObserver(schedule);
    observer.observe(footer);
    observer.observe(document.documentElement);
    // The rail changes height when a section opens, which can bring its foot
    // down into the footer's corner.
    if (rail) observer.observe(rail);
    // The bar wraps onto a second row at some widths, which changes how much of
    // the bottom edge it occupies without any window resize having happened.
    if (bar) observer.observe(bar);
  }

  // Kept beside the observer, not only as its fallback: the root's box does not
  // always change when the viewport does (a scrollbar appearing, a resize that
  // leaves the document the same size) and the layout reads window.innerWidth.
  // The two paths coalesce into one frame.
  window.addEventListener('resize', schedule);

  // A language change rewrites the footer (Spanish is longer). Measure at once:
  // the new text is already in the DOM, and deferring a frame left the bar sized
  // for English beside a Spanish footer (11px gap, not 16, on WebKit at 1700px).
  // The scheduled follow-up stays for a font that loads a frame or two later.
  window.addEventListener(EV_LOCALE_CHANGED, () => {
    measure();
    schedule();
  });

  return true;
}
