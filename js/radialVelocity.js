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
  getInterventionEpoch,
  getWorldGeneration,
} from './physics.js';
import { velocityUnitToMs, timeUnitSeconds } from './units.js';
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
import { orbitalElements } from './orbital.js';
import { current_scenario_name } from './appState.js';
import {
  decideSampling,
  dropInvalidatedSamples,
  sessionChange,
  sessionKey,
} from './observingSession.js';
import { isScrubbing } from './timeline.js';
import { currentTimeDays } from './lightCurve.js';
import { t } from './i18n/index.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';
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

/**
 * Snapshot everything about the run that the world could change later.
 *
 * Taken once, when the run starts. A student can record a schedule, load a
 * different scenario, tilt the observer, switch units and only then press
 * Analyse or Export; every fact below would be a different fact by then, and
 * a file describing the run has to describe the run.
 *
 * The generating parameters are captured here too, for the same reason and one
 * more: the reveal is supposed to show what produced these measurements, and
 * recomputing it from the current world would show what would produce
 * different ones.
 *
 * @returns {object} The frozen description of the run
 */
function captureProvenance() {
  const star = observedStar();
  return {
    target: star ? { id: star.id, name: star.name || null } : null,
    inclinationDeg: getInclination(),
    positionAngleDeg: observerGeometry()?.positionAngleDeg ?? null,
    worldGeneration: getWorldGeneration(),
    interventionEpoch: getInterventionEpoch(),
    scenario: current_scenario_name,
    // Both scales the measurements were expressed in. A recording read back
    // under a different unit mode would otherwise be silently rescaled.
    units: {
      velocityUnitToMs: velocityUnitToMs(),
      timeUnitSeconds: timeUnitSeconds(),
      velocity: 'm/s',
      time: 'days',
    },
    startedAt: new Date().toISOString(),
    truth: computeTruth(),
  };
}

/**
 * The parameters actually generating the signal, or null when there is no
 * single honest answer.
 *
 * Computed from the orbital elements of the observed star and whatever it is
 * most strongly bound to. Two things this refuses to do:
 *
 * It does not use the circular expression on an eccentric orbit. The star's
 * radial-velocity semi-amplitude is
 *
 *   K = 2 pi a1 sin i / (P sqrt(1 - e^2))
 *
 * and dropping the eccentricity factor understates K by 15% at e = 0.5 and by
 * a factor of two at e = 0.87 - which a student would read as their fit being
 * wrong.
 *
 * It does not answer at all for a system where one companion is not the whole
 * story. If a second body would produce a comparable wobble, the single-planet
 * number is not the truth about anything and the workspace shows "nothing to
 * reveal" instead, which is also what a real observation would give.
 *
 * @returns {?object} period, K, gamma and a note, or null
 */
function computeTruth() {
  const star = observedStar();
  if (!star) return null;
  const others = [...stars, ...gas_giants, ...planets].filter(b => b !== star);
  if (!others.length) return null;

  const G = getPhysicsSetting('gravitational_constant');
  const inclination = (getInclination() * Math.PI) / 180;

  /** The star's reflex semi-amplitude from one companion, in m/s. */
  const amplitudeFrom = body => {
    const el = orbitalElements(star, body, G);
    if (!el?.period || !(el.period > 0) || !(el.a > 0)) return null;
    if (!(el.e >= 0) || el.e >= 1) return null;
    const total = star.mass + body.mass;
    const aStar = (el.a * body.mass) / total;
    const k =
      (2 * Math.PI * aStar * Math.sin(inclination)) /
      (el.period * Math.sqrt(1 - el.e * el.e));
    return { el, k: k * velocityUnitToMs() };
  };

  const ranked = others
    .map(b => ({ body: b, ...(amplitudeFrom(b) || {}) }))
    .filter(r => Number.isFinite(r.k))
    .sort((a, b) => b.k - a.k);
  if (!ranked.length) return null;

  const [first, second] = ranked;
  // A tenth is the line. Below it the second companion is a perturbation the
  // fit will absorb into its residuals; above it the signal is not one
  // sinusoid and quoting a single K would be inventing a system.
  if (second && second.k > 0.1 * first.k) {
    return {
      period: null,
      K: null,
      gamma: null,
      note: 'multipleCompanions',
      companions: ranked.length,
    };
  }

  return {
    period: (first.el.period * timeUnitSeconds()) / 86400,
    K: first.k,
    eccentricity: first.el.e,
    // The observing mode measures against the system barycentre, so there is
    // no systemic offset to recover.
    gamma: 0,
    note: first.el.e > 1e-3 ? 'eccentricOrbit' : 'circularOrbit',
    companions: ranked.length,
  };
}

/**
 * The recording, as the analysis workspace wants it.
 *
 * Assembled from the frozen provenance rather than from the world, so opening
 * the analysis an hour and three scenarios later describes the run that
 * produced the numbers.
 *
 * @param {object} run - From radialVelocitySurvey()
 * @returns {object} The payload
 */
function recordingPayload(run) {
  const p = run.provenance || {};
  return {
    points: run.measurements,
    target: p.target?.name ?? null,
    targetId: p.target?.id ?? null,
    scenario: p.scenario ?? null,
    seed: run.config.seed ?? null,
    config: {
      cadenceDays: run.config.cadenceDays,
      baselineDays: run.config.baselineDays,
      sigma: run.config.sigmaMs,
      // Null for a plain cadence run, which is the honest answer: it had no
      // plan beyond its spacing.
      scheduleKind: run.config.kind ?? null,
      scheduleEpochs: run.config.plan?.planned ?? null,
    },
    // What the workspace and the notebook stamp into a saved result. Two
    // analyses of "the same star" that carry different fingerprints were not
    // observed at the same instants, and nothing else in the payload says so.
    scheduleFingerprint: run.config.scheduleId ?? null,
    geometry: {
      inclinationDeg: p.inclinationDeg ?? null,
      positionAngleDeg: p.positionAngleDeg ?? null,
    },
    units: p.units ?? null,
    worldGeneration: p.worldGeneration ?? null,
    recordedAt: p.startedAt ?? null,
    openedAt: new Date().toISOString(),
    truth: p.truth ?? null,
  };
}

let surveyLib = null;
/** js/rvSchedule.js, loaded with the survey. */
let scheduleLib = null;
/** js/rvScheduleControls.js, loaded with the survey. */
let controlsLib = null;
/** js/rvCompare.js, loaded only when a comparison is asked for. */
let compareLib = null;
/**
 * The second arm of a controlled comparison.
 *
 * A second survey observing the SAME star over the same frames as the first,
 * at its own times. Nothing else differs: same count, same baseline, same
 * noise level, same seed. That is what makes the two recordings comparable,
 * and it is why the second arm is another survey rather than a re-run - a
 * re-run would be a different noise draw as well as a different schedule, and
 * the reader could not tell which one moved the answer.
 */
let compareSurvey = null;
/** The comparison as last computed, or null. */
let compareReport = null;
/** The period range both arms were searched over, for the readout. */
let compareBounds = null;
/** Whether the comparison has been computed for the recordings now in hand. */
let compareStale = true;

/** @returns {Promise<object>} The survey module */
async function loadSurveyLib() {
  if (!surveyLib) surveyLib = await import('./rvSurvey.js');
  // The schedule shapes come with it. They are what the survey builds its plan
  // from, so a run that has the survey has already paid for them, and the
  // panel needs the parsers synchronously once the reader starts typing times.
  if (!scheduleLib) scheduleLib = await import('./rvSchedule.js');
  // The schedule fields' prose and the shape rules, which are only needed once
  // somebody has switched the run on. See js/rvScheduleControls.js.
  if (!controlsLib) controlsLib = await import('./rvScheduleControls.js');
  return surveyLib;
}

/**
 * The comparison, which is heavier again: it fits.
 *
 * Only the reader who ticks Compare pays for js/rvCompare.js and the period
 * search underneath it.
 *
 * @returns {Promise<object>} The module
 */
async function loadCompareLib() {
  if (!compareLib) compareLib = await import('./rvCompare.js');
  return compareLib;
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
    interventionEpoch: getInterventionEpoch(),
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
    analyse: document.getElementById('rvAnalyse'),
    surveyStatus: document.getElementById('rvSurveyStatus'),
    surveyShape: document.getElementById('rvSurveyShape'),
    surveyEpochs: document.getElementById('rvSurveyEpochs'),
    surveyEpochsField: document.getElementById('rvSurveyEpochsField'),
    surveyJitter: document.getElementById('rvSurveyJitter'),
    surveyJitterField: document.getElementById('rvSurveyJitterField'),
    surveyClusters: document.getElementById('rvSurveyClusters'),
    surveyClustersField: document.getElementById('rvSurveyClustersField'),
    surveyEpochList: document.getElementById('rvSurveyEpochList'),
    surveyEpochListField: document.getElementById('rvSurveyEpochListField'),
    surveyGaps: document.getElementById('rvSurveyGaps'),
    surveyScheduleNote: document.getElementById('rvSurveyScheduleNote'),
    compareEnabled: document.getElementById('rvSurveyCompareEnabled'),
    compareShape: document.getElementById('rvSurveyShapeB'),
    compareShapeField: document.getElementById('rvSurveyShapeBField'),
    compareReport: document.getElementById('rvSurveyCompareReport'),
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
    // The comparison arm sees exactly the same frames and the same velocity.
    // Anything else - a second pass, a replay, a re-run - would change the
    // noise draw as well as the times, and the comparison would no longer be
    // about scheduling.
    const addedB = compareSurvey ? compareSurvey.observe(simTime, rv) : [];
    if (addedB.length) compareStale = true;
    if (added.length || addedB.length) {
      if (added.length && chart)
        chart.data.datasets[1].data = surveyChartPoints();
      renderSurveyStatus();
      maybeCompare();
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
  if (reason === 'maneuver') return t('observing.session.maneuver');
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
    // The whole frozen block, so callers stop rebuilding it from live state.
    provenance,
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
function readSurveyControls(kindOverride = null) {
  const e = cacheElements();
  const base = {
    cadenceDays: Number(e.surveyCadence?.value ?? 0.32),
    baselineDays: Number(e.surveyBaseline?.value ?? 3.52),
    sigmaMs: Number(e.surveySigma?.value ?? 8),
    seed: String(e.surveySeed?.value ?? 'survey-1'),
  };

  const kind = kindOverride ?? (e.surveyShape?.value || 'regular');
  const gapsText = String(e.surveyGaps?.value ?? '').trim();

  // The original form, and still the default one. A regular cadence with no
  // gaps and no comparison is the run this panel has always done, and it takes
  // the path it has always taken - no plan, no epoch count, nothing for a
  // share link or an existing lesson to have to know about.
  const plain =
    kind === 'regular' && !gapsText && !comparisonWanted() && !kindOverride;
  if (plain || !scheduleLib) return base;

  const gaps = scheduleLib.parseGaps(gapsText).gaps;
  const explicit = scheduleLib.parseEpochList(
    String(e.surveyEpochList?.value ?? '')
  ).offsets;

  return {
    ...base,
    kind,
    epochs: epochCountControl(),
    jitter: Number(e.surveyJitter?.value),
    clusters: Number(e.surveyClusters?.value),
    explicit,
    gaps,
  };
}

/** @returns {boolean} Whether the reader has asked for a second schedule */
function comparisonWanted() {
  const e = cacheElements();
  return Boolean(e.compareEnabled?.checked);
}

/**
 * How many observations a shaped schedule makes.
 *
 * Defaults to the number the cadence and baseline in the other fields would
 * have produced, which is what makes switching shape a controlled change: the
 * reader gets the same number of observations over the same span, placed
 * differently, rather than a different programme entirely.
 *
 * @returns {number} The count
 */
function epochCountControl() {
  const e = cacheElements();
  const typed = Number(e.surveyEpochs?.value);
  if (Number.isFinite(typed) && typed >= 2) return Math.trunc(typed);
  return cadenceEpochCount();
}

/** @returns {number} What the cadence and baseline would have produced */
function cadenceEpochCount() {
  const e = cacheElements();
  const cadence = Number(e.surveyCadence?.value ?? 0.32);
  const baseline = Number(e.surveyBaseline?.value ?? 3.52);
  if (!(cadence > 0) || !(baseline >= 0)) return 12;
  return Math.max(2, Math.floor(baseline / cadence) + 1);
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

  // The second arm, built from the same numbers with one field changed. Both
  // are created here, together, so neither can start against a world the other
  // did not see.
  compareReport = null;
  compareStale = true;
  if (comparisonWanted()) {
    const e = cacheElements();
    await loadCompareLib();
    compareSurvey = lib.createSurvey(
      readSurveyControls(e.compareShape?.value || 'irregular')
    );
  } else {
    compareSurvey = null;
  }
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
  compareSurvey?.reset();
  compareReport = null;
  compareStale = true;
  if (chart) chart.data.datasets[1].data = [];
  renderSurveyStatus();
  renderCompareReport();
}

/** Stop observing on a schedule and go back to the continuous curve. */
function stopSurvey() {
  survey = null;
  compareSurvey = null;
  compareReport = null;
  compareStale = true;
  surveyProvenance = null;
  applySurveyStyling();
  renderSurveyStatus();
  renderCompareReport();
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

/**
 * Compute the comparison, once both arms have finished observing.
 *
 * Not before: a fit to half a schedule is a fit to a different schedule, and
 * showing one while the run is still going would have the numbers moving under
 * the reader for reasons that have nothing to do with what they are comparing.
 *
 * @returns {void}
 */
function maybeCompare() {
  if (!compareSurvey || !survey || !compareStale) return;
  if (!survey.isComplete() || !compareSurvey.isComplete()) return;
  compareStale = false;

  loadCompareLib()
    .then(lib => {
      const bounds = controlsLib.comparisonBounds([
        survey.measurements(),
        compareSurvey.measurements(),
      ]);
      compareBounds = bounds;
      if (!bounds) {
        compareReport = null;
        renderCompareReport();
        return;
      }
      const a = survey.config;
      const b = compareSurvey.config;
      compareReport = lib.compareSchedules(
        {
          label: 'A',
          kind: a.kind ?? 'regular',
          plan: a.plan,
          measurements: survey.measurements(),
        },
        {
          label: 'B',
          kind: b.kind ?? 'regular',
          plan: b.plan,
          measurements: compareSurvey.measurements(),
        },
        {
          ...bounds,
          held: {
            sigmaMs: { a: a.sigmaMs, b: b.sigmaMs },
            seed: { a: a.seed, b: b.seed },
            // Both arms observed the same frames of the same world, so the
            // system is the same by construction; it is stated rather than
            // assumed so the check is a check.
            system: {
              a: surveyProvenance?.target?.id ?? null,
              b: surveyProvenance?.target?.id ?? null,
            },
          },
        }
      );
      renderCompareReport();
    })
    .catch(() => {
      compareReport = null;
      renderCompareReport();
    });
}

/**
 * Everything the comparison knows, for the lesson, the export and the tests.
 *
 * @returns {?object} The report, or null when no comparison is running
 */
export function radialVelocityComparison() {
  if (!compareSurvey) return null;
  const b = compareSurvey.config;
  return {
    running: true,
    complete: Boolean(survey?.isComplete() && compareSurvey.isComplete()),
    second: {
      kind: b.kind ?? 'regular',
      scheduleId: b.scheduleId ?? null,
      planned: compareSurvey.plannedCount,
      taken: compareSurvey.count(),
      measurements: compareSurvey.measurements(),
    },
    report: compareReport,
  };
}

/**
 * Draw the schedule note.
 *
 * The prose and the plan arithmetic live in js/rvScheduleControls.js, which
 * arrives with the survey; before that there is nothing to say, because the
 * fields it describes are hidden.
 *
 * @returns {void}
 */
function renderScheduleNote() {
  const e = cacheElements();
  if (!e.surveyScheduleNote) return;
  if (!controlsLib || !e.surveyShape) {
    e.surveyScheduleNote.textContent = '';
    return;
  }
  const note = controlsLib.scheduleNote({
    kind: e.surveyShape.value || 'regular',
    epochList: e.surveyEpochList?.value ?? '',
    gapsText: e.surveyGaps?.value ?? '',
    config: readSurveyControls(),
  });
  e.surveyScheduleNote.textContent = note.text;
  e.surveyScheduleNote.dataset.state = note.state;
}

/** Draw the comparison, or say why there is nothing to draw yet. */
function renderCompareReport() {
  const e = cacheElements();
  if (!e.compareReport) return;
  if (!compareSurvey || !controlsLib) {
    e.compareReport.textContent = '';
    return;
  }
  const out = controlsLib.comparisonText({
    report: compareReport,
    bounds: compareBounds,
    progress: {
      a: survey ? survey.count() : 0,
      b: compareSurvey.count(),
      planned: compareSurvey.plannedCount,
    },
  });
  e.compareReport.textContent = out.text;
  e.compareReport.dataset.state = out.state;
}

/** Show only the fields the chosen shapes use. */
function syncScheduleFields() {
  const e = cacheElements();
  if (!e.surveyShape || !controlsLib) return;
  const hidden = controlsLib.fieldVisibility({
    kind: e.surveyShape.value || 'regular',
    kindB: e.compareShape?.value || '',
    comparing: comparisonWanted(),
    gapsText: e.surveyGaps?.value ?? '',
  });
  if (e.surveyEpochsField) e.surveyEpochsField.hidden = hidden.epochs;
  if (e.surveyJitterField) e.surveyJitterField.hidden = hidden.jitter;
  if (e.surveyClustersField) e.surveyClustersField.hidden = hidden.clusters;
  if (e.surveyEpochListField) e.surveyEpochListField.hidden = hidden.epochList;
  if (e.compareShapeField) e.compareShapeField.hidden = hidden.compareShape;

  // Filled in from the cadence the reader already set, so switching shape
  // holds the number of observations constant instead of inventing one.
  if (e.surveyEpochs && !e.surveyEpochs.value)
    e.surveyEpochs.value = String(cadenceEpochCount());

  renderScheduleNote();
}

/** Wire the schedule controls up. Called once, from initRadialVelocity(). */
function initSurveyControls() {
  const e = cacheElements();
  if (!e.surveyEnabled) return;

  e.surveyEnabled.addEventListener('change', () => {
    if (e.surveyFields) e.surveyFields.hidden = !e.surveyEnabled.checked;
    // The schedule controls' strings are not in the start-up catalogue: this
    // section is opt-in, and its labels are message ids until it is asked for.
    // Registering them here is the moment they become visible.
    if (e.surveyEnabled.checked) ensureDeferredMessages().catch(() => {});
    if (e.surveyEnabled.checked)
      restartSurvey()
        .then(() => syncScheduleFields())
        .catch(() => stopSurvey());
    else stopSurvey();
  });

  // Any change to the schedule is a different programme, so it starts over.
  for (const input of [
    e.surveyCadence,
    e.surveyBaseline,
    e.surveySigma,
    e.surveySeed,
    e.surveyEpochs,
    e.surveyJitter,
    e.surveyClusters,
    e.surveyEpochList,
    e.surveyGaps,
  ]) {
    input?.addEventListener('change', () => {
      syncScheduleFields();
      if (survey) restartSurvey().catch(() => {});
    });
  }

  // A shape change moves the fields as well as the plan.
  for (const select of [e.surveyShape, e.compareShape]) {
    select?.addEventListener('change', () => {
      syncScheduleFields();
      if (survey) restartSurvey().catch(() => {});
    });
  }

  e.compareEnabled?.addEventListener('change', () => {
    syncScheduleFields();
    // Turning the comparison on mid-run would leave the second arm having
    // missed everything the first already saw, which is not a comparison. Both
    // arms start again, together.
    if (survey) restartSurvey().catch(() => {});
    else renderCompareReport();
  });

  e.surveyIdeal?.addEventListener('change', () => {
    showIdeal = Boolean(e.surveyIdeal.checked);
    applySurveyStyling();
  });

  e.surveyRestart?.addEventListener('click', () => {
    if (survey) restartSurvey().catch(() => {});
  });

  // Registered here, once, as a sibling of every other control.
  //
  // It was nested inside the Restart handler, which had two consequences and
  // both of them shipped: a first recording could not be analysed at all until
  // Restart had been pressed, and every press after that added another
  // listener, so the fourth restart opened the workspace four times.
  e.analyse?.addEventListener('click', openWorkspaceOnCurrentRun);
}

/**
 * Hand the current recording to the analysis workspace.
 *
 * The workspace is the heaviest thing in the observing feature and most
 * visitors never take a recording, so it arrives through a bridge that imports
 * it on the first press rather than at start-up.
 *
 * Everything handed over is read from the recording's own frozen provenance
 * rather than from the world as it stands now. A student can record a run,
 * change the scenario, tilt the observer and then press Analyse; the file that
 * comes out has to describe the run that produced the numbers, not whatever is
 * on screen at the moment they asked.
 *
 * @returns {Promise<void>}
 */
async function openWorkspaceOnCurrentRun() {
  const run = radialVelocitySurvey();
  if (!run.measurements.length) return;
  const { openRvWorkspace } = await import('./rvWorkspaceBridge.js');
  await openRvWorkspace(recordingPayload(run));
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
