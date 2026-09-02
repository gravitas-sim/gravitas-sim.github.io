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

let enabled = false;
let chart = null;
let els = null;
let series = [];
let lastSampleAt = 0;
let unsubscribeObserver = null;
let teardownControls = null;
let targetStarId = null;

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
 * Semi-amplitude of whatever has been recorded so far.
 *
 * Half the peak-to-peak range, which is the definition of K and the thing
 * students most often get wrong by a factor of two. Reported only once enough
 * of a curve exists for the extremes to mean anything.
 *
 * @returns {{K: number, complete: boolean}|null} The estimate
 */
export function measuredSemiAmplitude() {
  if (series.length < 12) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of series) {
    lo = Math.min(lo, p.y);
    hi = Math.max(hi, p.y);
  }
  // A run that has not yet turned around reports a K that is too small. The
  // test for "enough" is that the curve has visited both signs.
  return { K: (hi - lo) / 2, complete: lo < 0 && hi > 0 };
}

/** @returns {Array<{x: number, y: number}>} A copy of the recorded series */
export const radialVelocitySeries = () => series.map(p => ({ ...p }));

/** Discard the observing run. */
export function clearRadialVelocity() {
  series = [];
  lastSampleAt = 0;
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
    time: document.getElementById('rvTime'),
    controls: document.getElementById('rvObserverControls'),
    clear: document.getElementById('rvClear'),
    close: document.getElementById('rvClose'),
    toggle: document.getElementById('toggleRadialVelocity'),
    notice: document.getElementById('rvNotice'),
    line: document.getElementById('rvLine'),
    lineShift: document.getElementById('rvLineShift'),
  };
  return els;
}

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
        {
          data: [],
          borderColor: t.accent,
          backgroundColor: t.accentSoft,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
          fill: false,
        },
      ],
    },
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

  const amp = measuredSemiAmplitude();
  if (e.amplitude) {
    e.amplitude.textContent = amp
      ? `${withUnit(amp.K, 'm/s')}${amp.complete ? '' : ' (so far)'}`
      : 'Keep observing…';
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
    const pinned = star && starIsHeldFixed();
    e.notice.hidden = !pinned;
    if (pinned) {
      e.notice.textContent =
        'This scenario holds its star still, so there is no wobble to measure. That is a simplification in the scenario, not a fact about planets. Load the Exoplanet Characterization Lab to see a star that moves.';
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

  // A paused simulation is not producing new measurements. Sampling it anyway
  // would pile identical points on top of each other and invent a flat stretch
  // of curve that was never observed.
  if (state?.paused) {
    renderReadout();
    return;
  }

  const rv = currentRadialVelocity();
  if (rv === null) {
    renderReadout();
    return;
  }

  series.push({ x: currentTimeDays(), y: rv });
  if (series.length > MAX_SAMPLES) series.shift();

  if (chart) {
    chart.data.datasets[0].data = series;
    chart.update('none');
  }
  renderReadout();
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
    targetStarId = star ? star.id : null;
    buildChart();
    if (e.controls && !teardownControls) {
      teardownControls = mountObserverControls(e.controls);
    }
    if (!unsubscribeObserver) {
      // Moving the observer invalidates everything already recorded: those
      // samples describe a geometry nobody is standing in any more.
      unsubscribeObserver = onObserverChange(() => clearRadialVelocity());
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

  // A rebuilt world is a different star. Anything recorded from the old one is
  // not evidence about the new one.
  window.addEventListener('gravitasSimulationReset', () =>
    clearRadialVelocity()
  );

  if (e.container) e.container.style.display = 'none';
}

/** @returns {number} Current inclination, for panels that report geometry */
export const observerInclination = () => getInclination();
