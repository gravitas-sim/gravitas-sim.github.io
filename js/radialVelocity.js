// =============================================================================
// The radial-velocity instrument
// -----------------------------------------------------------------------------
// A spectrograph, roughly. It watches one star, projects that star's actual
// simulated velocity onto the shared line of sight, and plots the result
// against time. The number on screen is the same quantity an astronomer means
// by radial velocity: the component of the *star's* motion toward or away from
// us, not the planet's orbital speed and not the planet's mass.
//
// Two decisions worth stating, because both are places this could quietly
// teach something false:
//
// It measures the simulation, not a formula. The curve is sampled from the
// star's velocity as integrated, so if the scenario's star is pinned the panel
// says so rather than drawing a sine wave over a star that is not moving. That
// is why the Exoplanet Characterization Lab exists: Transit Lab holds its star
// fixed, which was harmless for photometry and is not harmless here.
//
// It plots velocity relative to the system's own barycenter. A real spectrum
// also carries the system's motion through the Galaxy, a constant offset called
// gamma that shifts the whole curve up or down without changing its shape.
// Subtracting it is what lets the wobble sit around zero where it can be read.
// The panel says as much in its help text rather than pretending gamma does not
// exist.
// =============================================================================

import {
  stars,
  gas_giants,
  planets,
  state,
  getPhysicsSetting,
} from './physics.js';
import { velocityUnitToMs } from './units.js';
import {
  projectVelocityLOS,
  observerGeometry,
  onObserverChange,
  getInclination,
} from './observerGeometry.js';
import { chartColors, observationAxis } from './observationChart.js';
import { mountObserverControls } from './observerControls.js';
import { ensureChartJs } from './chartjs.js';
import { formatNumber, withUnit } from './format.js';
import { halfRangeOfSeries } from './exoplanetObservables.js';
import {
  decideSampling,
  dropInvalidatedSamples,
  sessionChange,
  sessionKey,
} from './observingSession.js';
import { isScrubbing } from './timeline.js';
import { currentTimeDays } from './lightCurve.js';
import { t } from './i18n/index.js';
import {
  layoutObservationPanels,
  noteObservationPanelUsed,
} from './observationLayout.js';

// How often a sample is taken, in milliseconds of wall clock. A real
// spectrograph produces one measurement per exposure, not sixty per second, and
// a chart with 3600 points a minute is slower to draw than it is to read.
const SAMPLE_INTERVAL_MS = 60;

// The series is bounded. An observing run left open for an hour must not grow
// without limit; the oldest samples fall off the front.
const MAX_SAMPLES = 900;

/**
 * Fewest samples before a half-range is worth quoting at all.
 *
 * Separate from the coverage test below: this is about having enough points for
 * an extreme to be a feature rather than a single noisy sample.
 */
const MIN_SAMPLES_FOR_RANGE = 12;

let enabled = false;
let chart = null;
let els = null;
let series = [];
let lastSampleAt = 0;
let unsubscribeObserver = null;
let teardownControls = null;
let targetStarId = null;

/**
 * The conditions the recorded samples were taken under, and the time of the
 * last one. Together these are what makes the series one observing session
 * rather than a concatenation of several.
 */
let recordedSession = null;
let lastSampleTime = null;

/**
 * The synthetic observing run, when one is switched on.
 *
 * Null is the ordinary state: the panel draws the star's velocity continuously,
 * which is the right instrument for learning what a reflex curve looks like and
 * a poor model of how anyone found a planet. A run replaces that with the dozen
 * numbers a stated schedule would actually have brought home. See
 * js/rvSurvey.js for what a schedule is and why the noise is generated the way
 * it is.
 */
let survey = null;
/** The schedule the current run was built from; null before there is one. */
let surveyConfig = null;
/** Whether the continuous curve is drawn behind the measurements. */
let showIdeal = true;

/**
 * js/rvSurvey.js, loaded the first time somebody asks for a run.
 *
 * The panel itself is on the start-up path - it is one of the observing tools,
 * and its toggle has to exist before anyone clicks it - but the observing mode
 * is opt-in and most readers never open it. Importing its schedule machinery
 * eagerly would put it in the initial download for everybody to pay for and
 * almost nobody to use.
 */
let surveyLib = null;

/** @returns {Promise<object>} The survey module */
async function loadSurveyLib() {
  if (!surveyLib) surveyLib = await import('./rvSurvey.js');
  return surveyLib;
}
/** Why the current recording was started, when it was not simply the first. */
let sessionNotice = null;

/**
 * Which star the instrument is pointed at.
 *
 * A spectrograph observes one object. Summing the velocities of unrelated stars
 * would be meaningless - it is not what a blended light curve does, where
 * adding the light really is the measurement - so the rule is explicit: the
 * selected star if one is selected, otherwise the most luminous.
 *
 * @returns {object|null} The observed star
 */
export function observedStar() {
  const live = stars.filter(s => s.alive);
  if (!live.length) return null;
  const selected = state?.selectedObject?.object;
  if (selected && live.includes(selected)) return selected;
  const byId = live.find(s => s.id === targetStarId);
  if (byId) return byId;
  return live.reduce((best, s) =>
    (s.luminosityInSuns ?? s.massInSuns ?? 0) >
    (best.luminosityInSuns ?? best.massInSuns ?? 0)
      ? s
      : best
  );
}

/**
 * Point the instruments at a specific star, by id.
 *
 * Used when a share link restores an observing context: which star was being
 * watched is part of what the sender was demonstrating, and without it a link
 * to a binary reopens on whichever star happens to be brighter.
 *
 * A no-op when the id names nothing in this world - a hand-edited link, or a
 * body that has since merged - which leaves the panels on their own choice
 * rather than on nothing at all.
 *
 * @param {?number} id - Stable body id, or null to let the panels choose
 * @returns {boolean} True when a star with that id was found
 */
export function setObservedStar(id) {
  if (id === null || id === undefined) {
    targetStarId = null;
    return false;
  }
  const found = stars.some(s => s.alive && s.id === id);
  targetStarId = found ? id : null;
  return found;
}

/** @returns {?number} The id of the star the instruments are pointed at */
export const observedStarId = () => observedStar()?.id ?? null;

/**
 * The mass-weighted mean velocity of the whole system.
 *
 * Subtracted from the star's velocity so the plotted curve is centered on zero.
 * Measured rather than assumed: the scenarios are built with zero net momentum,
 * but absorption and integration error can leave a slow drift, and a baseline
 * that wanders is indistinguishable to a student from a real signal.
 *
 * @returns {{x: number, y: number}} Barycentric velocity in simulation units
 */
function barycenterVelocity() {
  const bodies = [...stars, ...gas_giants, ...planets].filter(b => b.alive);
  let m = 0;
  let px = 0;
  let py = 0;
  for (const b of bodies) {
    const bm = b.mass || 0;
    if (!Number.isFinite(bm) || !Number.isFinite(b.vel?.x)) continue;
    m += bm;
    px += bm * b.vel.x;
    py += bm * b.vel.y;
  }
  return m > 0 ? { x: px / m, y: py / m } : { x: 0, y: 0 };
}

/**
 * The star's current radial velocity, in metres per second.
 *
 * Positive is receding, negative is approaching.
 *
 * @returns {number|null} Radial velocity, or null with no star
 */
export function currentRadialVelocity() {
  const star = observedStar();
  if (!star) return null;
  // A pinned star has no reflex motion to report. Subtracting the barycenter
  // velocity from it would still produce a number - the barycenter moves
  // because the planet does - and that number looks exactly like a measurement
  // while being an artifact of a scenario that does not conserve momentum.
  // Reporting nothing, and saying why, is the honest answer.
  if (starIsHeldFixed()) return null;
  const bary = barycenterVelocity();
  const relative = {
    x: star.vel.x - bary.x,
    y: star.vel.y - bary.y,
  };
  return projectVelocityLOS(relative, observerGeometry()) * velocityUnitToMs();
}

/**
 * Half the range of whatever has been recorded so far, and whether the run has
 * seen enough of the curve for that number to describe the whole curve.
 *
 * The reasoning - why this is a half-range rather than a semi-amplitude K, and
 * what makes the coverage test defensible - lives with the implementation in
 * js/exoplanetObservables.js, beside the formulas it must not be confused with.
 *
 * @returns {{halfRange: number, complete: boolean, min: number, max: number,
 *   midlineCrossings: number}|null} The estimate, or null before there is one
 */
export function measuredHalfRange() {
  return halfRangeOfSeries(series, { minSamples: MIN_SAMPLES_FOR_RANGE });
}

/** @returns {Array<{x: number, y: number}>} A copy of the recorded series */
export const radialVelocitySeries = () => series.map(p => ({ ...p }));

/** Discard the observing run. */
export function clearRadialVelocity() {
  series = [];
  lastSampleAt = 0;
  resetSurvey();
  // A deliberate clear starts a fresh session under whatever conditions are in
  // force now, and carries no explanation: the reader asked for it.
  lastSampleTime = null;
  sessionNotice = null;
  const star = observedStar();
  recordedSession = sessionKey({
    starId: star ? star.id : null,
    geometry: observerGeometry(),
  });
  if (chart) {
    chart.data.datasets[0].data = [];
    chart.update('none');
  }
  renderReadout();
}

/** @returns {boolean} Whether the panel is open */
export const isRadialVelocityEnabled = () => enabled;

function cacheElements() {
  if (els) return els;
  els = {
    container: document.getElementById('rvContainer'),
    canvas: document.getElementById('rvCanvas'),
    status: document.getElementById('rvStatus'),
    target: document.getElementById('rvTarget'),
    current: document.getElementById('rvCurrent'),
    direction: document.getElementById('rvDirection'),
    amplitude: document.getElementById('rvAmplitude'),
    amplitudeLabel: document.getElementById('rvAmplitudeLabel'),
    amplitudeCell: document.getElementById('rvAmplitudeCell'),
    time: document.getElementById('rvTime'),
    controls: document.getElementById('rvObserverControls'),
    clear: document.getElementById('rvClear'),
    close: document.getElementById('rvClose'),
    toggle: document.getElementById('toggleRadialVelocity'),
    notice: document.getElementById('rvNotice'),
    line: document.getElementById('rvLine'),
    lineShift: document.getElementById('rvLineShift'),
    surveyEnabled: document.getElementById('rvSurveyEnabled'),
    surveyFields: document.getElementById('rvSurveyFields'),
    surveyCadence: document.getElementById('rvSurveyCadence'),
    surveyBaseline: document.getElementById('rvSurveyBaseline'),
    surveySigma: document.getElementById('rvSurveySigma'),
    surveySeed: document.getElementById('rvSurveySeed'),
    surveyIdeal: document.getElementById('rvSurveyIdeal'),
    surveyRestart: document.getElementById('rvSurveyRestart'),
    surveyStatus: document.getElementById('rvSurveyStatus'),
  };
  return els;
}

/**
 * Vertical error bars on the measurement dataset.
 *
 * Chart.js has no error bar, and the alternatives are a plugin package or
 * leaving them off. Leaving them off is not an option here: a scatter of points
 * with no uncertainty is exactly the picture that makes a nondetection look
 * like a detection, and the size of the bar against the size of the wobble is
 * the comparison the lesson is built on.
 *
 * Each point carries its own `sigma`, so a run whose precision changed mid-way
 * would draw correctly; today they are all the same.
 */
const errorBarPlugin = {
  id: 'rvErrorBars',
  afterDatasetsDraw(c) {
    const meta = c.getDatasetMeta(1);
    if (!meta || meta.hidden) return;
    const points = c.data.datasets[1]?.data || [];
    if (!points.length) return;
    const y = c.scales.y;
    const ctx = c.ctx;
    ctx.save();
    ctx.strokeStyle = c.data.datasets[1].borderColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const el = meta.data[i];
      if (!el || !Number.isFinite(p?.sigma) || p.sigma <= 0) continue;
      const top = y.getPixelForValue(p.y + p.sigma);
      const bottom = y.getPixelForValue(p.y - p.sigma);
      ctx.beginPath();
      ctx.moveTo(el.x, top);
      ctx.lineTo(el.x, bottom);
      ctx.moveTo(el.x - 3, top);
      ctx.lineTo(el.x + 3, top);
      ctx.moveTo(el.x - 3, bottom);
      ctx.lineTo(el.x + 3, bottom);
      ctx.stroke();
    }
    ctx.restore();
  },
};

async function buildChart() {
  const e = cacheElements();
  if (chart || !e.canvas) return;
  const Chart = await ensureChartJs();
  if (!Chart) return;
  const t = chartColors();
  chart = new Chart(e.canvas.getContext('2d'), {
    type: 'line',
    data: {
      datasets: [
        // 0: the continuous recording. On its own it is the measurement; with a
        // survey running it becomes the teaching overlay behind the points, and
        // is restyled and relabelled in applySurveyStyling() so the two can
        // never be confused for each other.
        {
          label: 'Radial velocity',
          data: [],
          borderColor: t.accent,
          backgroundColor: t.accentSoft,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
          fill: false,
        },
        // 1: the measurements a schedule produced. Points, never a line: a line
        // drawn between two measurements a month apart shows a student a curve
        // nobody observed, which is the exact error this whole mode exists to
        // teach against.
        {
          label: 'Measurements',
          data: [],
          showLine: false,
          borderColor: t.warm,
          backgroundColor: t.warm,
          pointRadius: 3,
          pointHoverRadius: 4,
          hidden: true,
        },
      ],
    },
    plugins: [errorBarPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      plugins: { legend: { display: false } },
      scales: {
        x: observationAxis('Time (days)', { type: 'linear' }),
        y: observationAxis('Radial velocity (m/s)', {
          // A zero line the eye can find: the systemic reference the wobble
          // swings about.
          grid: { color: t.grid, z: 1 },
        }),
      },
    },
  });
}

/**
 * Update the numeric readouts.
 *
 * Direction is stated in words as well as by sign and color. "AWAY FROM US"
 * survives a color-blind student, a screen reader and a printout; a red line
 * does not.
 */
function renderReadout() {
  const e = cacheElements();
  const star = observedStar();
  const rv = currentRadialVelocity();

  if (e.target) e.target.textContent = star ? star.name || 'Star' : 'No star';

  if (e.current) {
    e.current.textContent =
      rv === null
        ? '—'
        : withUnit(
            `${rv >= 0 ? '+' : '−'}${formatNumber(Math.abs(rv))}`,
            'm/s'
          );
  }
  if (e.direction) {
    if (rv === null) {
      e.direction.textContent = '';
      e.direction.className = 'rv-direction';
    } else if (Math.abs(rv) < 0.5) {
      e.direction.textContent = t('rv.crossingZero');
      e.direction.className = 'rv-direction is-zero';
    } else if (rv > 0) {
      e.direction.textContent = t('rv.movingAway');
      e.direction.className = 'rv-direction is-receding';
    } else {
      e.direction.textContent = t('rv.movingToward');
      e.direction.className = 'rv-direction is-approaching';
    }
  }

  const amp = measuredHalfRange();
  if (e.amplitude) {
    e.amplitude.textContent = amp
      ? withUnit(amp.halfRange, 'm/s')
      : t('rv.keepObserving');
  }
  // The label changes with the state of the measurement rather than the value
  // carrying a parenthetical. Until a full cycle has been observed this is a
  // lower bound on the range, and saying "half-range observed so far" is the
  // only honest description of it; once the curve has turned at both ends it
  // is the half-range of the whole curve, which is K for a circular
  // single-planet orbit and not K for anything else.
  if (e.amplitudeLabel) {
    e.amplitudeLabel.textContent = amp?.complete
      ? t('rv.halfRange')
      : t('rv.halfRangeSoFar');
  }
  if (e.amplitudeCell) {
    e.amplitudeCell.title = amp?.complete
      ? t('rv.halfRange.hint')
      : t('rv.halfRangeSoFar.hint');
  }
  if (e.time) {
    e.time.textContent = series.length
      ? withUnit(series[series.length - 1].x, 'd')
      : '—';
  }

  // The spectral line. Its displacement is magnified enormously - a real 84 m/s
  // shift is under a thousandth of a nanometre - and the panel says so, because
  // a student who thinks the star visibly changes color has learned the wrong
  // thing from a picture that was meant to help.
  if (e.lineShift && rv !== null) {
    const clamped = Math.max(-1, Math.min(1, rv / 120));
    e.lineShift.style.transform = `translateX(${(clamped * 42).toFixed(1)}px)`;
    e.lineShift.style.background =
      rv > 0 ? 'var(--danger, #e2725b)' : 'var(--info, #5b9bd5)';
  }

  if (e.status) {
    e.status.textContent = star
      ? `${series.length} sample${series.length === 1 ? '' : 's'}`
      : 'No star to observe';
  }

  if (e.notice) {
    // A pinned star is the more important thing to say, because it means the
    // panel can never measure anything at all; a restarted session only means
    // it is measuring something else now.
    const pinned = star && starIsHeldFixed();
    if (pinned) {
      e.notice.hidden = false;
      e.notice.textContent = t('rv.starHeldFixed');
    } else if (sessionNotice) {
      e.notice.hidden = false;
      e.notice.textContent = sessionNotice;
    } else {
      e.notice.hidden = true;
    }
  }
}

/**
 * Is this scenario one whose star is deliberately held still?
 *
 * Several teaching scenarios set star_only_gravity so the star stays put and
 * the camera stays pointed at it. That is harmless for photometry and actively
 * misleading here: the panel would read a flat zero, and a student would
 * reasonably conclude that planets do not move their stars.
 *
 * So the panel says so instead of quietly drawing a flat line.
 *
 * @returns {boolean} Whether the observed star is pinned
 */
export function starIsHeldFixed() {
  return Boolean(
    getPhysicsSetting('star_only_gravity') ||
    !getPhysicsSetting('mutual_gravity')
  );
}

/**
 * Sample the star, once per cadence. Called from the render loop.
 *
 * Does nothing at all when the panel is closed, which is the difference between
 * an instrument and a permanent tax on the frame budget.
 */
export function updateRadialVelocity() {
  if (!enabled) return;
  const now = performance.now();
  if (now - lastSampleAt < SAMPLE_INTERVAL_MS) return;
  lastSampleAt = now;

  const star = observedStar();
  const current = sessionKey({
    starId: star ? star.id : null,
    geometry: observerGeometry(),
  });
  const simTime = currentTimeDays();

  const decision = decideSampling({
    recordedSession,
    currentSession: current,
    lastSampleTime,
    simTime,
    paused: Boolean(state?.paused),
    scrubbing: isScrubbing(),
  });

  switch (decision.action) {
    case 'hold':
      renderReadout();
      return;

    case 'restart':
      // A different star, or a different direction. The samples already taken
      // are a measurement of something else, so they are not continued and
      // they are not mixed in - the recording starts again and says why.
      startNewSession(current, decision.reason, star);
      break;

    case 'truncate': {
      // Rewound and resumed. Everything recorded at or after the new clock
      // reading is a future that is not going to happen again.
      const before = series.length;
      series = dropInvalidatedSamples(series, simTime, p => p.x);
      const dropped = before - series.length;
      lastSampleTime = series.length ? series[series.length - 1].x : null;
      // Same reasoning for the schedule: measurements dated after the clock now
      // reads describe a future that is not going to happen again, and a
      // partially rewound run is not a programme either. It starts over.
      resetSurvey();
      recordedSession = current;
      if (dropped > 0) {
        sessionNotice = t('observing.session.rewound', {
          n: dropped,
          time: formatNumber(simTime, { sig: 3 }),
        });
      }
      if (chart) {
        chart.data.datasets[0].data = series;
        chart.update('none');
      }
      break;
    }

    default:
      break;
  }

  const rv = currentRadialVelocity();
  if (rv === null) {
    renderReadout();
    return;
  }

  series.push({ x: simTime, y: rv });
  if (series.length > MAX_SAMPLES) {
    // With a run in progress the continuous curve is the overlay behind the
    // measurements, so it has to keep covering the same span they do. Dropping
    // the oldest samples would leave the overlay trailing the points across a
    // long baseline; halving the resolution keeps the whole run in view and
    // costs only detail nobody is reading off a teaching overlay.
    if (survey) series = series.filter((_, i) => i % 2 === 0);
    else series.shift();
  }
  recordedSession = current;
  lastSampleTime = simTime;
  targetStarId = current.starId;

  // The schedule decides which of these instants was a measurement. It is given
  // the simulation clock rather than the wall clock, so what it records does
  // not depend on how fast this browser is drawing.
  if (survey) {
    const added = survey.observe(simTime, rv);
    if (added.length) {
      if (chart) chart.data.datasets[1].data = surveyChartPoints();
      renderSurveyStatus();
    }
  }

  if (chart) {
    chart.data.datasets[0].data = series;
    chart.update('none');
  }
  renderReadout();
}

/**
 * Abandon the recording and begin another, saying what moved.
 *
 * @param {object} session - The conditions now in force
 * @param {?string} reason - 'target' or 'geometry'
 * @param {?object} star - The star now being observed, for the message
 */
function startNewSession(session, reason, star) {
  // Nothing recorded means nothing lost, so nothing to announce. This is the
  // ordinary case at the start of a run: a scenario load clears the recording
  // while the world is still being rebuilt, so the session is captured with no
  // star at all, and acquiring one a moment later reads as a target change. It
  // is one - but there is no measurement it invalidated, and telling a reader
  // their recording was restarted before they had one is noise.
  const discarded = series.length;
  series = [];
  lastSampleTime = null;
  // A different star, or a different line of sight, is a different programme.
  // Measurements taken before it changed are not measurements of this one.
  resetSurvey();
  recordedSession = session;
  targetStarId = session.starId;
  sessionNotice = !discarded
    ? null
    : reason === 'target'
      ? t('observing.session.newTarget', {
          name: star?.name || t('observing.session.unnamedStar'),
        })
      : t('observing.session.newGeometry');
  if (chart) {
    chart.data.datasets[0].data = series;
    chart.update('none');
  }
}

// --- The synthetic observing run ---------------------------------------------

/** @returns {boolean} Whether a schedule is being observed rather than the star */
export const isSurveyRunning = () => survey !== null;

/**
 * Everything a run has produced, for the export and for the tests.
 *
 * Returned whether or not a run is active, so a caller can ask without first
 * having to ask whether there is anything to ask about.
 *
 * @returns {{running: boolean, config: object, target: ?object,
 *   measurements: Array<object>, planned: number, stats: ?object}} The run
 */
export function radialVelocitySurvey() {
  const star = observedStar();
  const measurements = survey ? survey.measurements() : [];
  return {
    running: survey !== null,
    // Before a run there is no schedule, only whatever the controls are showing.
    config: { ...(surveyConfig ?? readSurveyControls()) },
    target: star ? { id: star.id, name: star.name || null } : null,
    inclinationDeg: getInclination(),
    measurements,
    planned: survey ? survey.plannedCount : 0,
    // Measurements exist only if the module loaded, so this is never reached
    // before surveyLib is there to describe them.
    stats: measurements.length ? surveyLib.surveyStats(measurements) : null,
  };
}

/**
 * Read the schedule out of the controls.
 *
 * The fallbacks match the `value` attributes in index.html and exist for the
 * case where the panel is not in the document at all, which is how the tests
 * and the embed build see it. rvSurvey.js clamps whatever comes out.
 */
function readSurveyControls() {
  const e = cacheElements();
  return {
    cadenceDays: Number(e.surveyCadence?.value ?? 0.32),
    baselineDays: Number(e.surveyBaseline?.value ?? 3.52),
    sigmaMs: Number(e.surveySigma?.value ?? 8),
    seed: String(e.surveySeed?.value ?? 'survey-1'),
  };
}

/**
 * Start a run, or start it again.
 *
 * Always from nothing. A schedule half observed under one cadence and half
 * under another is not a programme anyone ran, and quietly continuing a run
 * across a change to its own definition would be the same mistake the observing
 * session machinery exists to prevent.
 */
async function restartSurvey() {
  const lib = await loadSurveyLib();
  survey = lib.createSurvey(readSurveyControls());
  surveyConfig = survey.config;
  applySurveyStyling();
  renderSurveyStatus();
}

/**
 * Abandon the measurements without rebuilding the run.
 *
 * What a session change calls. The schedule has not changed - the target or the
 * line of sight has - so there is nothing to re-read from the controls, and
 * this stays synchronous, which is what lets it be called from the sampling
 * loop and from the observer subscription.
 */
function resetSurvey() {
  if (!survey) return;
  survey.reset();
  if (chart) chart.data.datasets[1].data = [];
  renderSurveyStatus();
}

/** Stop observing on a schedule and go back to the continuous curve. */
function stopSurvey() {
  survey = null;
  applySurveyStyling();
  renderSurveyStatus();
}

/**
 * Make the chart say which line is data and which is teaching.
 *
 * The continuous curve does not disappear when a run starts - watching the
 * measurements land on the signal is most of the point - but it stops being the
 * measurement, so it is dashed, faded, pushed behind the points and renamed.
 * The legend is turned on for the same reason: two datasets that are different
 * kinds of thing have to be labelled.
 */
function applySurveyStyling() {
  if (!chart) return;
  const th = chartColors();
  const ideal = chart.data.datasets[0];
  const points = chart.data.datasets[1];
  const on = survey !== null;

  ideal.label = on ? t('rv.survey.idealLabel') : t('rv.survey.velocityLabel');
  ideal.borderDash = on ? [4, 4] : [];
  ideal.borderWidth = on ? 1.5 : 2;
  ideal.borderColor = on ? th.label : th.accent;
  ideal.order = 2;
  ideal.hidden = on && !showIdeal;

  points.label = t('rv.survey.measurementsLabel');
  points.hidden = !on;
  points.order = 1;
  points.data = on ? surveyChartPoints() : [];

  chart.options.plugins.legend.display = on;
  chart.update('none');
}

/** @returns {Array<object>} The measurements in the shape the chart parses */
function surveyChartPoints() {
  return survey
    ? survey.measurements().map(m => ({ x: m.day, y: m.rv, sigma: m.sigma }))
    : [];
}

/**
 * Say how the run is going, in the terms the schedule was set in.
 *
 * Deliberately not a verdict. It reports how many of the planned measurements
 * have been taken and how much of the baseline has elapsed; what the numbers
 * mean is the lesson's job and the reader's, and a panel that announced a
 * detection would be doing the part of the work that is worth doing.
 */
function renderSurveyStatus() {
  const e = cacheElements();
  if (!e.surveyStatus) return;
  if (!survey) {
    e.surveyStatus.textContent = '';
    e.surveyStatus.hidden = true;
    return;
  }
  e.surveyStatus.hidden = false;

  const taken = survey.count();
  const planned = survey.plannedCount;
  const parts = [t('rv.survey.progress', { taken, planned })];

  if (survey.isComplete()) parts.push(t('rv.survey.complete'));
  else if (survey.startedAt() === null) parts.push(t('rv.survey.waiting'));

  // The one warning worth interrupting for: at high simulation speeds the
  // render frames can be further apart than the signal's own turning points,
  // and every measurement between them is read off a straight line drawn across
  // a curve. The run is still honest about what it did; the reader needs to
  // know to slow down before believing the amplitudes.
  if (survey.anyCoarse()) parts.push(t('rv.survey.coarse'));

  e.surveyStatus.textContent = parts.join(' ');
  e.surveyStatus.dataset.state = survey.anyCoarse() ? 'warn' : 'ok';
}

/** Wire the schedule controls up. Called once, from initRadialVelocity(). */
function initSurveyControls() {
  const e = cacheElements();
  if (!e.surveyEnabled) return;

  e.surveyEnabled.addEventListener('change', () => {
    if (e.surveyFields) e.surveyFields.hidden = !e.surveyEnabled.checked;
    if (e.surveyEnabled.checked) restartSurvey().catch(() => stopSurvey());
    else stopSurvey();
  });

  // Any change to the schedule is a different programme, so it starts over.
  for (const input of [
    e.surveyCadence,
    e.surveyBaseline,
    e.surveySigma,
    e.surveySeed,
  ]) {
    input?.addEventListener('change', () => {
      if (survey) restartSurvey().catch(() => {});
    });
  }

  e.surveyIdeal?.addEventListener('change', () => {
    showIdeal = Boolean(e.surveyIdeal.checked);
    applySurveyStyling();
  });

  e.surveyRestart?.addEventListener('click', () => {
    if (survey) restartSurvey().catch(() => {});
  });
}

/**
 * Open or close the instrument.
 *
 * @param {boolean} on - Whether to observe
 */
export function setRadialVelocityEnabled(on) {
  const e = cacheElements();
  enabled = Boolean(on);
  if (e.container) e.container.style.display = enabled ? '' : 'none';
  // Just opened means just used: the panel a student reaches for should be the
  // one that is expanded, not the one that gets collapsed to make room.
  if (enabled) noteObservationPanelUsed('rvContainer');
  if (e.toggle) {
    e.toggle.setAttribute('aria-pressed', String(enabled));
    e.toggle.classList.toggle('active', enabled);
  }

  if (enabled) {
    const star = observedStar();
    // A recording survives the panel being closed, but only if nothing moved
    // while it was shut. The observer subscription below is released on close,
    // so a geometry change made with the panel hidden used to go unnoticed and
    // the stale samples were kept; the target was never checked at all.
    const current = sessionKey({
      starId: star ? star.id : null,
      geometry: observerGeometry(),
    });
    const changed = recordedSession
      ? sessionChange(recordedSession, current)
      : null;
    if (changed) startNewSession(current, changed, star);
    else recordedSession = recordedSession ?? current;
    targetStarId = current.starId;
    buildChart();
    if (e.controls && !teardownControls) {
      teardownControls = mountObserverControls(e.controls);
    }
    if (!unsubscribeObserver) {
      // Moving the observer invalidates everything already recorded: those
      // samples describe a geometry nobody is standing in any more.
      unsubscribeObserver = onObserverChange(() => {
        const now = observedStar();
        startNewSession(
          sessionKey({
            starId: now ? now.id : null,
            geometry: observerGeometry(),
          }),
          'geometry',
          now
        );
        renderReadout();
      });
    }
    renderReadout();
  } else {
    // Closed means closed: listeners released, so an unopened panel costs
    // nothing and reopening does not stack a second subscription.
    unsubscribeObserver?.();
    unsubscribeObserver = null;
    teardownControls?.();
    teardownControls = null;
  }

  // Last, so the layout measures the stack as it now is.
  layoutObservationPanels();
}

/** Wire the panel up. Called once at start-up. */
export function initRadialVelocity() {
  const e = cacheElements();
  e.toggle?.addEventListener('click', () => setRadialVelocityEnabled(!enabled));
  e.close?.addEventListener('click', () => setRadialVelocityEnabled(false));
  e.clear?.addEventListener('click', () => clearRadialVelocity());
  initSurveyControls();

  // A rebuilt world is a different star. Anything recorded from the old one is
  // not evidence about the new one.
  window.addEventListener('gravitasSimulationReset', () =>
    clearRadialVelocity()
  );

  if (e.container) e.container.style.display = 'none';
}

/** @returns {number} Current inclination, for panels that report geometry */
export const observerInclination = () => getInclination();
