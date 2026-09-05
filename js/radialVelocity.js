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
  getWorldGeneration,
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
/**
 * The star and geometry the current run is *of*, fixed when it started.
 *
 * A recording is a measurement of one star from one direction. Reading either
 * from live state at export time would relabel a finished run with whatever is
 * selected now - a file of HD 209458's velocities headed with the name of a
 * star the reader happened to click afterwards, which is worse than no header.
 */
let surveyProvenance = null;

/** Snapshot who is being observed and from where, for the run to keep. */
function captureProvenance() {
  const star = observedStar();
  return {
    target: star ? { id: star.id, name: star.name || null } : null,
    inclinationDeg: getInclination(),
    positionAngleDeg: observerGeometry()?.positionAngleDeg ?? null,
    worldGeneration: getWorldGeneration(),
  };
}

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

/**
 * The conditions a recording is made under, as one comparable object.
 *
 * Built here rather than at each call site so no axis can be forgotten by one
 * of them: the world it belongs to, the star, the line of sight, the ruler its
 * numbers were converted with, and the instrument's own settings. See
 * js/observingSession.js for why each one invalidates a recording.
 *
 * @returns {object} The descriptor
 */
function currentSessionKey() {
  const star = observedStar();
  return sessionKey({
    starId: star ? star.id : null,
    geometry: observerGeometry(),
    worldGeneration: getWorldGeneration(),
    velocityScale: velocityUnitToMs(),
    config: survey ? surveyConfigLabel(surveyConfig) : null,
  });
}

/** A configuration as a string, so two schedules can be compared for equality. */
const surveyConfigLabel = cfg =>
  cfg
    ? `c=${cfg.cadenceDays};b=${cfg.baselineDays};s=${cfg.sigmaMs};seed=${cfg.seed}`
    : null;

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
 * @returns {{halfRange: number, bracketedBothExtremes: boolean, min: number,
 *   max: number, midlineCrossings: number}|null} The estimate, or null before there is one
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
  recordedSession = currentSessionKey();
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
  // carrying a parenthetical. Until the curve has turned at both ends the
  // number is certainly a lower bound, and "half-range observed so far" is the
  // only honest description of it. Afterwards it stays "half-range": for a
  // single Keplerian component the half-range *is* K at any eccentricity, so
  // the caveat is not about the orbit's shape but about whether this run saw
  // the whole curve - which bracketing two turning points does not establish.
  // See halfRangeOfSeries() in js/exoplanetObservables.js.
  if (e.amplitudeLabel) {
    e.amplitudeLabel.textContent = amp?.bracketedBothExtremes
      ? t('rv.halfRange')
      : t('rv.halfRangeSoFar');
  }
  if (e.amplitudeCell) {
    e.amplitudeCell.title = amp?.bracketedBothExtremes
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

  const star = observedStar();
  const current = currentSessionKey();
  const simTime = currentTimeDays();

  const decision = decideSampling({
    recordedSession,
    currentSession: current,
    lastSampleTime,
    simTime,
    paused: Boolean(state?.paused),
    scrubbing: isScrubbing(),
  });

  // What is already recorded, first. This happens whether or not the clock is
  // running: a reader who switches stars while paused must not come back to the
  // old star's curve still on screen.
  if (decision.invalidate === 'rewound') {
    // Rewound and resumed. Everything recorded at or after the new clock
    // reading is a future that is not going to happen again; the rest stands.
    const before = series.length;
    series = dropInvalidatedSamples(series, simTime, p => p.x);
    const dropped = before - series.length;
    lastSampleTime = series.length ? series[series.length - 1].x : null;
    // Same reasoning for the schedule: a partially rewound run is not a
    // programme either. It starts over.
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
  } else if (decision.invalidate) {
    // A different star, a different direction, a different world, a different
    // ruler. The samples already taken measure something else, so they are not
    // continued and not mixed in - the recording starts again and says why.
    startNewSession(current, decision.invalidate, star);
  }

  // Only now, and separately, whether a measurement may be taken. Nothing above
  // grants permission: a restart while paused clears the old curve and records
  // nothing, because no time has passed to record.
  if (!decision.sample) {
    renderReadout();
    return;
  }

  const rv = currentRadialVelocity();
  if (rv === null) {
    renderReadout();
    return;
  }

  // --- Scientific sampling, every frame ---------------------------------------
  // The schedule decides which instants are measurements, and it is given the
  // simulation clock. It must see every frame: the value at a scheduled epoch
  // is interpolated between the readings either side of it, so thinning the
  // readings for the sake of drawing would coarsen the measurements. Render
  // throttling is a decision about a picture and has no business here.
  if (survey) {
    const added = survey.observe(simTime, rv);
    if (added.length) {
      if (chart) chart.data.datasets[1].data = surveyChartPoints();
      renderSurveyStatus();
    }
  }

  // --- The drawn curve, throttled ----------------------------------------------
  // Sixty samples a second is a slower chart and not a better one, and this
  // series is a picture of the signal rather than a measurement of it.
  const now = performance.now();
  if (now - lastSampleAt < SAMPLE_INTERVAL_MS) {
    renderReadout();
    return;
  }
  lastSampleAt = now;

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

  if (chart) {
    chart.data.datasets[0].data = series;
    chart.update('none');
  }
  renderReadout();
}

/**
 * Why a recording was abandoned, in the reader's language.
 *
 * @param {?string} reason - From sessionChange()
 * @param {?object} star - The star now observed, for the target message
 * @returns {string} The sentence to show
 */
function sessionNoticeFor(reason, star) {
  if (reason === 'target') {
    return t('observing.session.newTarget', {
      name: star?.name || t('observing.session.unnamedStar'),
    });
  }
  if (reason === 'world') return t('observing.session.newWorld');
  if (reason === 'units') return t('observing.session.newUnits');
  if (reason === 'config') return t('observing.session.newConfig');
  return t('observing.session.newGeometry');
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
  sessionNotice = !discarded ? null : sessionNoticeFor(reason, star);
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
  const measurements = survey ? survey.measurements() : [];
  // A run in progress reports what it is a recording of; with no run there is
  // nothing to describe but what the controls are currently showing.
  const provenance = surveyProvenance ?? (survey ? captureProvenance() : null);
  const live = provenance ?? captureProvenance();
  return {
    running: survey !== null,
    // Before a run there is no schedule, only whatever the controls are showing.
    config: { ...(surveyConfig ?? readSurveyControls()) },
    target: live.target,
    inclinationDeg: live.inclinationDeg,
    positionAngleDeg: live.positionAngleDeg,
    worldGeneration: live.worldGeneration,
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
  // Who and how, captured when the run starts and never re-read. What a file
  // says it observed has to be what was observed, not what the panel happens
  // to be pointed at when somebody presses Export.
  surveyProvenance = captureProvenance();
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
  surveyProvenance = null;
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
    const current = currentSessionKey();
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
        startNewSession(currentSessionKey(), 'geometry', now);
        renderReadout();
      });
    }
    renderReadout();
  } else {
    // A run does not end when the panel is hidden, but observing stops. Epochs
    // that fall due before it reopens are recorded as missed rather than
    // reconstructed from the two readings either side of the gap.
    survey?.suspend(currentTimeDays());

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
