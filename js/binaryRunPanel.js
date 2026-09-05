// =============================================================================
// The binary planet run panel
// -----------------------------------------------------------------------------
// The interface over js/binaryWatch.js and js/binaryStability.js. Those two
// stay free of the DOM so the recording can be driven by a test harness and the
// judging can be checked against published systems; this layer owns the inputs,
// the units, and the wording.
//
// The wording is most of the work, and it is not decoration. Three rules the
// readout follows and the modules below it enforce:
//
//   Nothing is ever called stable. A finished run says "survived this
//   integration", with the number of binary periods in the same sentence, so
//   the claim cannot be quoted without its own limit attached.
//
//   A numerical failure is not an outcome. When the energy drift screen trips,
//   the panel does not say what happened to the planet, because it does not
//   know: it says the run cannot be believed and offers to repeat it at half
//   the step.
//
//   The published boundary is shown with its source, its assumptions and its
//   range, and it declines to answer inside its own uncertainty. A student
//   comparing a run against it should be able to see immediately that it is a
//   fit to somebody's integrations and not a law.
// =============================================================================

import { state, onPhysicsStep, planets, stars } from './physics.js';
import { SETTINGS, current_scenario_name } from './appState.js';
import {
  boundaryVerdict,
  classifyRun,
  ENERGY_DRIFT_LIMIT,
  OUTCOME,
} from './binaryStability.js';
import { binaryFacts, CIRCUMBINARY, CIRCUMSTELLAR } from './binaryOrbits.js';
import {
  currentRun,
  startBinaryWatch,
  stopBinaryWatch,
} from './binaryWatch.js';
import {
  layoutObservationPanels,
  noteObservationPanelUsed,
} from './observationLayout.js';
import { formatNumber } from './format.js';
import { t } from './i18n/index.js';

let enabled = false;
let els = null;
let tickUnsub = null;
/** The previous finished run, kept so a halved-step repeat can be compared. */
let previous = null;

/** The two scenarios this panel is for. */
const SCENARIOS = {
  'Binary Planet Lab': CIRCUMSTELLAR,
  'Circumbinary Planet Lab': CIRCUMBINARY,
};

/**
 * The mode for the loaded scenario, or null when this panel has nothing to do.
 *
 * From current_scenario_name rather than SETTINGS.preset_scenario, which is a
 * request rather than a record: the loader clears it to 'None' once it has
 * acted on it, so reading it after a build always says no scenario is loaded.
 * The exported binding is live, so this follows the reassignment.
 *
 * @returns {?string} 'circumstellar', 'circumbinary', or null
 */
const activeMode = () => SCENARIOS[current_scenario_name] ?? null;

/** Cache the DOM once. @returns {object} The elements */
function cacheElements() {
  if (els) return els;
  els = {
    container: document.getElementById('binaryRunContainer'),
    status: document.getElementById('binaryRunStatus'),
    planetA: document.getElementById('binaryRunPlanetA'),
    periods: document.getElementById('binaryRunPeriods'),
    timestep: document.getElementById('binaryRunTimestep'),
    start: document.getElementById('binaryRunStart'),
    halve: document.getElementById('binaryRunHalve'),
    progress: document.getElementById('binaryRunProgress'),
    drift: document.getElementById('binaryRunDrift'),
    step: document.getElementById('binaryRunStep'),
    encounters: document.getElementById('binaryRunEncounters'),
    closest: document.getElementById('binaryRunClosest'),
    farthest: document.getElementById('binaryRunFarthest'),
    orbit: document.getElementById('binaryRunOrbit'),
    maxEcc: document.getElementById('binaryRunMaxEcc'),
    outcome: document.getElementById('binaryRunOutcome'),
    boundary: document.getElementById('binaryRunBoundary'),
    close: document.getElementById('binaryRunClose'),
    toggle: document.getElementById('toggleBinaryRun'),
  };
  return els;
}

/** The three bodies, in the order the builder created them. */
const bodies = () =>
  stars.length >= 2 && planets.length >= 1
    ? { star1: stars[0], star2: stars[1], planet: planets[0] }
    : null;

/**
 * Rebuild the world from the current settings and start recording.
 *
 * The rebuild is the point. An experiment that changes the planet's starting
 * radius has to start over - moving a planet mid-flight is not the same
 * experiment with one variable changed, it is a different and undefined one -
 * and the world builder is deterministic, so starting over lands on exactly
 * the same stars every time.
 *
 * @returns {void}
 */
function beginRun() {
  const mode = activeMode();
  if (!mode) return;
  const e = cacheElements();

  const planetA = Number(e.planetA?.value);
  const periods = Number(e.periods?.value);
  const timestep = Number(e.timestep?.value);
  if (planetA > 0) SETTINGS.binary_lab_planet_a = planetA;
  if (periods >= 1) SETTINGS.binary_lab_periods = Math.round(periods);
  if (timestep > 0) SETTINGS.max_timestep = timestep;

  // Rebuilding fires gravitasSimulationReset, which clears the watch. Start
  // recording after it, not before.
  window.dispatchEvent(new CustomEvent('gravitasRequestRebuild'));
}

/**
 * Arm the watcher against the world as it now stands.
 *
 * Split from beginRun so the scenario loader can call it too: a student who
 * simply picks the scenario off the gallery and presses play should get a
 * recorded run without having found this panel first.
 *
 * @returns {void}
 */
export function armBinaryRun() {
  const mode = activeMode();
  if (!mode) return;
  const G = SETTINGS.gravitational_constant;
  const m1 = SETTINGS.binary_lab_m1;
  const m2 = SETTINGS.binary_lab_m2;
  const separation = SETTINGS.binary_lab_separation * 100;
  const facts = binaryFacts({
    m1: m1 * 1000,
    m2: m2 * 1000,
    separation,
    eccentricity: SETTINGS.binary_lab_eccentricity,
    G,
  });

  startBinaryWatch(
    {
      mode,
      periods: SETTINGS.binary_lab_periods,
      binaryPeriod: facts.period,
      separation,
      planetA: SETTINGS.binary_lab_planet_a,
      mu: facts.mu,
      eccentricity: SETTINGS.binary_lab_eccentricity,
    },
    {
      onStep: onPhysicsStep,
      bodies,
      G,
      onFinish: run => {
        previous = run;
        state.paused = true;
        render();
      },
    }
  );
  render();
}

/** Repeat the run exactly, at half the integration step. */
function halveAndRepeat() {
  const e = cacheElements();
  const current = Number(e.timestep?.value) || SETTINGS.max_timestep || 1;
  if (e.timestep) e.timestep.value = String(current / 2);
  beginRun();
}

/**
 * One line of prose for what the run did.
 *
 * @param {object} run - From currentRun()
 * @param {object} verdict - From classifyRun()
 * @returns {string} The sentence
 */
function outcomeText(run, verdict) {
  const periods = formatNumber(run.periodsDone, { sig: 3 });
  switch (verdict.outcome) {
    case OUTCOME.SURVIVED:
      return t('binaryRun.outcome.survived', { periods });
    case OUTCOME.EJECTED:
      return t('binaryRun.outcome.ejected', { periods });
    case OUTCOME.COLLIDED:
      return t('binaryRun.outcome.collided', { periods });
    case OUTCOME.RUNNING:
      return t('binaryRun.outcome.running', {
        periods,
        asked: run.periodsAsked,
      });
    default:
      return verdict.reason === 'vanished'
        ? t('binaryRun.outcome.vanished')
        : t('binaryRun.outcome.unreliable', {
            drift: formatNumber(run.energyDrift * 100, { sig: 2 }),
            limit: formatNumber(ENERGY_DRIFT_LIMIT * 100, { sig: 2 }),
          });
  }
}

/**
 * What the published fit says about this configuration, hedged as the paper
 * hedges it.
 *
 * @param {object} run - From currentRun()
 * @returns {string} The sentence, or '' when there is nothing to say
 */
function boundaryText(run) {
  const v = boundaryVerdict(run.mode, run.planetA, run.mu, run.eccentricity);
  if (!v) return '';
  const critical = formatNumber(v.critical, { sig: 3 });
  const key =
    v.side === 'tooCloseToCall'
      ? 'binaryRun.boundary.tooClose'
      : v.side === 'expectedSurvive'
        ? 'binaryRun.boundary.inside'
        : 'binaryRun.boundary.outside';
  const main = t(key, { critical, a: formatNumber(run.planetA, { sig: 3 }) });
  const range = v.inRange ? '' : ` ${t('binaryRun.boundary.extrapolated')}`;
  return `${main}${range} ${t('binaryRun.boundary.source')}`;
}

/** Repaint everything from the current run. */
function render() {
  const e = cacheElements();
  if (!e.container || !enabled) return;

  const run = currentRun();
  if (!run) {
    if (e.status) e.status.textContent = t('binaryRun.status.idle');
    for (const cell of [
      e.progress,
      e.drift,
      e.step,
      e.encounters,
      e.closest,
      e.farthest,
      e.orbit,
      e.maxEcc,
    ]) {
      if (cell) cell.textContent = '—';
    }
    if (e.outcome) e.outcome.textContent = t('binaryRun.outcome.notStarted');
    if (e.boundary) e.boundary.textContent = '';
    return;
  }

  const verdict = classifyRun(run);

  if (e.status) {
    e.status.textContent = run.finished
      ? t('binaryRun.status.finished')
      : t('binaryRun.status.running');
  }
  if (e.progress) {
    e.progress.textContent = t('binaryRun.progress.value', {
      done: formatNumber(run.periodsDone, { sig: 3 }),
      asked: run.periodsAsked,
      steps: run.steps.toLocaleString(),
    });
  }
  if (e.drift) {
    e.drift.textContent = `${formatNumber(run.energyDrift * 100, { sig: 2 })}%`;
    // The screen, made visible. A reader should be able to see that this
    // number crossed a line without having to remember where the line is.
    e.drift.classList.toggle('over-limit', !verdict.trustworthy);
  }
  if (e.step) {
    const same =
      run.dtMin !== null && run.dtMax !== null && run.dtMin === run.dtMax;
    e.step.textContent =
      run.dtMean === null
        ? '—'
        : same
          ? formatNumber(run.dtMax, { sig: 3 })
          : t('binaryRun.step.varied', {
              mean: formatNumber(run.dtMean, { sig: 3 }),
              max: formatNumber(run.dtMax, { sig: 3 }),
            });
  }
  if (e.encounters) e.encounters.textContent = String(run.encounters);
  if (e.closest) {
    e.closest.textContent =
      run.closestApproach === null
        ? '—'
        : `${formatNumber(run.closestApproach, { sig: 3 })} a`;
  }
  if (e.farthest) {
    e.farthest.textContent = `${formatNumber(run.maxDistance, { sig: 3 })} a`;
  }
  // The planet's own orbit, from js/orbital.js. Worth a row of its own because
  // it is the mechanism rather than the outcome: a planet being driven out by
  // resonant forcing has its eccentricity walked up over several periods while
  // its semi-major axis barely moves, so this row says what is happening to it
  // some time before the distance row says it has gone.
  if (e.orbit) {
    if (run.planetEccentricity === null) {
      e.orbit.textContent = '—';
    } else if (run.planetSemiMajor === null) {
      // Open orbit: there is no semi-major axis, and saying so is the result.
      e.orbit.textContent = t('binaryRun.orbit.open', {
        e: formatNumber(run.planetEccentricity, { sig: 3 }),
      });
    } else {
      e.orbit.textContent = t('binaryRun.orbit.value', {
        a: formatNumber(run.planetSemiMajor, { sig: 3 }),
        e: formatNumber(run.planetEccentricity, { sig: 2 }),
      });
    }
  }
  if (e.maxEcc) {
    e.maxEcc.textContent = run.steps
      ? formatNumber(run.planetMaxEccentricity, { sig: 2 })
      : '—';
  }
  if (e.outcome) {
    e.outcome.textContent = outcomeText(run, verdict);
    e.outcome.dataset.outcome = verdict.outcome;
  }
  if (e.boundary)
    e.boundary.textContent = run.finished ? boundaryText(run) : '';
  if (e.halve) e.halve.disabled = !run.finished;
}

/** Load the form from the settings the scenario arrived with. */
function syncForm() {
  const e = cacheElements();
  if (e.planetA) e.planetA.value = String(SETTINGS.binary_lab_planet_a);
  if (e.periods) e.periods.value = String(SETTINGS.binary_lab_periods);
  if (e.timestep) e.timestep.value = String(SETTINGS.max_timestep || 1);
}

/**
 * Open or close the panel.
 * @param {boolean} on - Whether to show it
 * @returns {void}
 */
export function setBinaryRunEnabled(on) {
  const e = cacheElements();
  enabled = Boolean(on);
  if (e.container) e.container.style.display = enabled ? '' : 'none';
  if (enabled) noteObservationPanelUsed('binaryRunContainer');
  if (e.toggle) {
    e.toggle.setAttribute('aria-pressed', String(enabled));
    e.toggle.classList.toggle('active', enabled);
  }

  if (enabled) {
    syncForm();
    if (!currentRun()) armBinaryRun();
    // Repaint on a timer rather than on every integration step: the readout is
    // for a person, and a hundred thousand repaints of a number that changes
    // in the fourth decimal is a frame budget spent on nothing.
    if (!tickUnsub) {
      const id = setInterval(render, 200);
      tickUnsub = () => clearInterval(id);
    }
    render();
  } else {
    tickUnsub?.();
    tickUnsub = null;
  }
  layoutObservationPanels();
}

/** @returns {boolean} Whether the panel is open */
export const isBinaryRunEnabled = () => enabled;

/** @returns {?object} The last finished run, for the lesson and the bench */
export const lastFinishedRun = () => (previous ? { ...previous } : null);

/** Wire the panel up. Called once at boot. */
export function initBinaryRun() {
  const e = cacheElements();
  if (!e.container) return;

  e.toggle?.addEventListener('click', () => setBinaryRunEnabled(!enabled));
  e.close?.addEventListener('click', () => setBinaryRunEnabled(false));
  e.start?.addEventListener('click', beginRun);
  e.halve?.addEventListener('click', halveAndRepeat);

  // A rebuilt world is a new experiment. The old recording refers to bodies
  // that no longer exist, and keeping it would let a student read the previous
  // configuration's outcome beside the new configuration's inputs.
  window.addEventListener('gravitasSimulationReset', () => {
    stopBinaryWatch();
    if (enabled && activeMode()) {
      syncForm();
      armBinaryRun();
    } else {
      render();
    }
  });

  e.container.style.display = 'none';
}
