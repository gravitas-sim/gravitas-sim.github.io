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
import { MONO } from './widgetCanvas.js';
import { t, onLocaleChange } from './i18n/index.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';

let enabled = false;
let els = null;
let tickUnsub = null;
// Whether the reader has dismissed the panel for the scenario they are in.
// Reset on a scenario change, so closing it once does not hide it for ever,
// and honoured within a scenario so it does not reappear on every rebuild
// after being told to go away.
let dismissed = false;
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
    sweepSection: document.getElementById('binarySweepSection'),
    sweepRun: document.getElementById('binarySweepRun'),
    sweepCancel: document.getElementById('binarySweepCancel'),
    sweepRecheck: document.getElementById('binarySweepRecheck'),
    sweepRecheckRun: document.getElementById('binarySweepRecheckRun'),
    sweepStatus: document.getElementById('binarySweepStatus'),
    sweepTable: document.getElementById('binarySweepTable'),
    sweepPlot: document.getElementById('binarySweepPlot'),
    sweepCaveat: document.getElementById('binarySweepCaveat'),
    sweepKeep: document.getElementById('binarySweepKeep'),
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

/**
 * Match the panel to whatever scenario is loaded now.
 *
 * Called on a world rebuild, and again when the chunk arrives late for the
 * rebuild that imported it. Arming is conditional on there being nothing to
 * arm over: the rebuild path has just stopped the watch, so the guard is free
 * there, and the late-arrival path must not throw away a run that finished
 * while the chunk was still being fetched.
 *
 * @returns {void}
 */
function showForCurrentScenario() {
  const mode = activeMode();
  if (current_scenario_name !== lastScenario) {
    lastScenario = current_scenario_name;
    dismissed = false;
  }
  if (mode && !dismissed) {
    setBinaryRunEnabled(true);
    syncForm();
    if (!currentRun()) armBinaryRun();
    render();
    return;
  }
  if (!mode && enabled) {
    setBinaryRunEnabled(false);
    return;
  }
  if (enabled) {
    syncForm();
    if (!currentRun()) armBinaryRun();
  }
  render();
}

/** The scenario the panel last matched itself to. */
let lastScenario = null;

// =============================================================================
// The sweep
// -----------------------------------------------------------------------------
// Five starting radii, one at a time, with everything else held fixed, each
// one watched by the same js/binaryWatch.js the manual runs use and classified
// by the same js/binaryStability.js. It replaces the repetitive half of the
// boundary hunt and nothing else: a student reaches it having already run two
// configurations by hand and read the diagnostics off the panel.
//
// The machinery underneath is the bench's, borrowed rather than reimplemented -
// world capture and restoration, cancellation, simulated-progress measurement,
// the trial statuses - with an observer supplying the one thing it cannot know,
// which is what happened to the planet.
// =============================================================================

/** The sweep in flight, or null. */
let sweepRunning = false;
/** The trials of the last sweep, as the lesson reports them. */
let sweepTrials = [];
/** Which configuration they came from, and what it asked for. */
let sweepConfig = null;
/** The convergence check on one of them, when a reader has run it. */
let sweepRecheck = null;

/** @returns {?string} Which sweep this scenario offers, if any */
function sweepKindFor(scenario) {
  if (scenario === 'Binary Planet Lab') return 'circumstellar';
  if (scenario === 'Circumbinary Planet Lab') return 'circumbinary';
  return null;
}

/** @returns {object} Everything the sweep must hold fixed, read once */
function heldFixed() {
  return {
    m1: SETTINGS.binary_lab_m1,
    m2: SETTINGS.binary_lab_m2,
    separation: SETTINGS.binary_lab_separation,
    eccentricity: SETTINGS.binary_lab_eccentricity,
    integrator: SETTINGS.integrator,
    maxTimestep: SETTINGS.max_timestep,
    simSpeed: SETTINGS.sim_speed,
    gravitationalConstant: SETTINGS.gravitational_constant,
  };
}

/**
 * How much simulated time a frame really advances, against what it should.
 *
 * Measured rather than predicted. The runner sizes its frame budget from the
 * arithmetic - one sixtieth of a second at the current speed - and in these
 * scenarios the engine advances about a quarter of that, so a budget taken
 * from the arithmetic cut every trial off long before its window finished and
 * the sweep reported five incomplete observations. Ten frames is enough to see
 * the rate and short enough that nobody notices it happening.
 *
 * @returns {Promise<number>} How many times slower the world is than the plan
 */
async function measureFrameRatio() {
  const timestep = await import('./timestep.js');
  const { getSimClock } = await import('./timeline.js');
  const { DT } = await import('./physics.js');
  const wanted = timestep.frameAdvance(1 / 60, SETTINGS.sim_speed, DT);
  if (!(wanted > 0)) return 1;

  const wasPaused = state.paused;
  state.paused = false;
  const before = getSimClock();
  const frames = 10;
  await new Promise(resolve => {
    let n = 0;
    const tick = () =>
      ++n >= frames ? resolve() : requestAnimationFrame(tick);
    requestAnimationFrame(tick);
  });
  const advanced = (getSimClock() - before) / frames;
  state.paused = wasPaused;
  if (!(advanced > 0)) return 1;
  return Math.max(1, wanted / advanced);
}

/** @returns {number} The binary period of the pair now on screen */
function binaryPeriodNow() {
  const facts = binaryFacts({
    m1: SETTINGS.binary_lab_m1 * 1000,
    m2: SETTINGS.binary_lab_m2 * 1000,
    separation: SETTINGS.binary_lab_separation * 100,
    eccentricity: SETTINGS.binary_lab_eccentricity,
    G: SETTINGS.gravitational_constant,
  });
  return facts.period;
}

/**
 * Run the sweep, or a one-value rerun of it at a smaller step.
 *
 * @param {object} [opts] - `values` and `timestep` for a convergence rerun
 * @returns {Promise<void>}
 */
async function runBinarySweep(opts = {}) {
  const e = cacheElements();
  const kind = sweepKindFor(current_scenario_name);
  if (!kind || sweepRunning) return;

  // The bench runs this, and the bench has to be wired to the application
  // first. Its bridge is what does that, and it is the same call the
  // experiment panel makes - so a student who reaches the sweep from this
  // lesson without ever opening the bench gets a working one.
  const [{ bench }, binarySweep] = await Promise.all([
    import('./experimentsBridge.js').then(m => m.ensureBench()),
    import('./experiments/binarySweep.js'),
  ]);

  const periods = binarySweep.CONFIGURATIONS[kind].periods;
  const spec = binarySweep.sweepSpec(kind, {
    values: opts.values,
    binaryPeriod: binaryPeriodNow(),
    frameRatio: await measureFrameRatio(),
  });
  if (!spec) return;

  // The window is the same for every trial, and it is the panel's own field
  // that the watcher reads, so it is set here rather than assumed.
  const savedPeriods = SETTINGS.binary_lab_periods;
  const savedStep = SETTINGS.max_timestep;
  SETTINGS.binary_lab_periods = periods;
  if (opts.timestep) SETTINGS.max_timestep = opts.timestep;

  sweepRunning = true;
  if (e.sweepRun) e.sweepRun.disabled = true;
  if (e.sweepRecheckRun) e.sweepRecheckRun.disabled = true;
  if (e.sweepCancel) e.sweepCancel.hidden = false;
  renderSweep();

  let result = null;
  try {
    result = await bench.runSweep(spec, {
      observer: binarySweep.binaryObserver({ armRun: armBinaryRun }),
      onProgress: ({ trial, total }) => {
        if (!e.sweepStatus) return;
        e.sweepStatus.textContent = t('binarySweep.running', {
          done: trial + 1,
          total,
        });
      },
    });
  } catch (err) {
    console.warn('[binary] the sweep did not finish:', err);
  } finally {
    SETTINGS.binary_lab_periods = savedPeriods;
    SETTINGS.max_timestep = savedStep;
    sweepRunning = false;
    if (e.sweepRun) e.sweepRun.disabled = false;
    if (e.sweepCancel) e.sweepCancel.hidden = true;
  }

  if (!result?.ok) {
    if (e.sweepStatus) {
      e.sweepStatus.textContent = t('binarySweep.refused', {
        reason: result?.reason ?? 'unknown',
      });
    }
    renderSweep();
    return;
  }

  const trials = result.trials.map(binarySweep.describeTrial);

  // A rerun of one value is a convergence check on that value, not a new
  // sweep: the table stays and the verdict is added beside it.
  if (opts.values && sweepTrials.length) {
    const at = trials[0];
    const before = sweepTrials.find(tr => tr.value === at?.value) ?? null;
    sweepRecheck = before
      ? {
          value: at.value,
          timestep: opts.timestep ?? null,
          coarse: before,
          fine: at,
          verdict: binarySweep.resolutionVerdict(before, at),
        }
      : null;
  } else {
    sweepTrials = trials;
    sweepRecheck = null;
    sweepConfig = {
      kind,
      periods,
      seed: result.seed,
      values: spec.values,
      held: heldFixed(),
      numerics: result.numerics,
      wallMs: result.wallMs,
      cancelled: result.cancelled,
      ranAt: result.ranAt,
    };
  }
  renderSweep();
}

/** The colour an outcome is drawn and tinted in. */
const OUTCOME_INK = {
  survived: '#7fe3a0',
  ejected: '#ff9f7f',
  collided: '#ff7f9f',
  unreliable: '#c0a0ff',
  incomplete: '#ffd27f',
  notRun: '#8892a6',
};

/** Draw the table, the plot and everything that has to be said about them. */
function renderSweep() {
  const e = cacheElements();
  if (!e.sweepTable) return;

  // Only the sweep's own progress line is rewritten here. A refusal is a
  // message this function did not write and must not erase: clearing it left
  // the panel silent about a sweep that never started.
  if (e.sweepStatus && !sweepRunning && sweepTrials.length) {
    e.sweepStatus.textContent = t('binarySweep.done', {
      n: sweepTrials.length,
      periods: sweepConfig?.periods ?? 0,
      seconds: ((sweepConfig?.wallMs ?? 0) / 1000).toFixed(0),
    });
  }

  e.sweepTable.innerHTML = '';
  if (sweepTrials.length) {
    const table = document.createElement('table');
    table.className = 'experiment-table';
    const head = document.createElement('tr');
    for (const label of [
      t('binarySweep.col.radius'),
      t('binarySweep.col.outcome'),
      t('binarySweep.col.periods'),
      t('binarySweep.col.farthest'),
      t('binarySweep.col.encounters'),
      t('binarySweep.col.drift'),
    ]) {
      const th = document.createElement('th');
      th.textContent = label;
      head.appendChild(th);
    }
    table.appendChild(head);

    for (const tr of sweepTrials) {
      const row = document.createElement('tr');
      row.dataset.outcome = tr.outcome;
      const first = document.createElement('th');
      first.scope = 'row';
      first.textContent = formatNumber(tr.value, { sig: 3 });
      row.appendChild(first);

      // The outcome in words, never a status. "ok" is a statement about the
      // trial running; it is not a statement about the planet.
      const cells = [
        t(`binarySweep.outcome.${tr.outcome}`),
        // Achieved against asked, on every row, so a short run cannot read as
        // a complete one.
        `${formatNumber(tr.periodsDone, { sig: 3 })} / ${tr.periodsAsked ?? '—'}`,
        tr.maxDistance === null
          ? '—'
          : formatNumber(tr.maxDistance, { sig: 3 }),
        tr.encounters === null ? '—' : String(tr.encounters),
        tr.energyDrift === null
          ? '—'
          : formatNumber(Math.abs(tr.energyDrift), { sig: 2 }),
      ];
      for (const [i, text] of cells.entries()) {
        const td = document.createElement('td');
        td.textContent = text;
        if (i === 0) td.style.color = OUTCOME_INK[tr.outcome] ?? '';
        row.appendChild(td);
      }
      table.appendChild(row);
    }
    e.sweepTable.appendChild(table);
  }

  renderSweepPlot();
  renderSweepCaveat();
  syncRecheckChoices();
}

/**
 * Outcome against starting radius, and nothing else.
 *
 * Deliberately not a line. Joining these points would draw a boundary through
 * five samples of a system that does not have to be monotone in radius, and
 * the whole lesson is about how much less than that the evidence supports. Each
 * trial is one mark at its own radius, in its outcome's colour.
 */
function renderSweepPlot() {
  const e = cacheElements();
  const canvas = e.sweepPlot;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!sweepTrials.length) return;

  const pad = { left: 34, right: 12, top: 14, bottom: 26 };
  const values = sweepTrials.map(tr => tr.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const x = v => pad.left + ((v - lo) / span) * (w - pad.left - pad.right);

  // One row per outcome, so the vertical axis is a category and cannot be read
  // as a magnitude.
  const rows = ['survived', 'incomplete', 'unreliable', 'ejected', 'collided'];
  const present = rows.filter(r => sweepTrials.some(tr => tr.outcome === r));
  const lanes = present.length || 1;
  const y = outcome =>
    pad.top +
    ((present.indexOf(outcome) + 0.5) / lanes) * (h - pad.top - pad.bottom);

  ctx.font = `10px ${MONO}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  for (const outcome of present) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(pad.left, y(outcome));
    ctx.lineTo(w - pad.right, y(outcome));
    ctx.stroke();
    ctx.fillStyle = OUTCOME_INK[outcome] ?? '#9aa3b5';
    ctx.fillText(t(`binarySweep.short.${outcome}`), 2, y(outcome));
  }

  for (const tr of sweepTrials) {
    if (!present.includes(tr.outcome)) continue;
    ctx.fillStyle = OUTCOME_INK[tr.outcome] ?? '#9aa3b5';
    ctx.beginPath();
    ctx.arc(x(tr.value), y(tr.outcome), 4, 0, Math.PI * 2);
    ctx.fill();
    // A trial nobody can draw a conclusion from is drawn hollow.
    if (!tr.trustworthy) {
      ctx.fillStyle = '#0b1020';
      ctx.beginPath();
      ctx.arc(x(tr.value), y(tr.outcome), 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = '#9aa3b5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const v of [lo, hi]) {
    ctx.fillText(formatNumber(v, { sig: 3 }), x(v), h - 8);
  }
  ctx.fillText(t('binarySweep.axis'), (pad.left + w - pad.right) / 2, h);
}

/** Everything that has to be said beside the table, in both languages. */
function renderSweepCaveat() {
  const e = cacheElements();
  if (!e.sweepCaveat) return;
  if (!sweepTrials.length) {
    e.sweepCaveat.textContent = '';
    return;
  }
  const parts = [];

  const short = sweepTrials.filter(tr => tr.outcome === 'incomplete');
  if (short.length) {
    parts.push(t('binarySweep.caveat.incomplete', { n: short.length }));
  }
  const bad = sweepTrials.filter(tr => tr.outcome === 'unreliable');
  if (bad.length)
    parts.push(t('binarySweep.caveat.unreliable', { n: bad.length }));
  if (sweepConfig?.cancelled) parts.push(t('binarySweep.caveat.cancelled'));

  // The one that is always true.
  parts.push(
    t('binarySweep.caveat.window', { periods: sweepConfig?.periods ?? 0 })
  );

  if (sweepRecheck) {
    const v = sweepRecheck.verdict;
    parts.push(
      v.converged
        ? t('binarySweep.recheck.agreed', {
            value: formatNumber(sweepRecheck.value, { sig: 3 }),
            outcome: t(`binarySweep.outcome.${v.outcome}`),
          })
        : t('binarySweep.recheck.disagreed', {
            value: formatNumber(sweepRecheck.value, { sig: 3 }),
            reason: t(`binarySweep.recheck.reason.${v.reason}`),
          })
    );
  }

  e.sweepCaveat.textContent = parts.join(' ');
}

/** Offer the trials as rerun choices, nearest a change of outcome first. */
function syncRecheckChoices() {
  const e = cacheElements();
  if (!e.sweepRecheck) return;
  const chosen = e.sweepRecheck.value;
  e.sweepRecheck.innerHTML = '';
  for (const tr of sweepTrials) {
    const option = document.createElement('option');
    option.value = String(tr.value);
    // Marked where the outcome changes from the trial before it: that is where
    // rerunning at a smaller step actually settles something.
    const index = sweepTrials.indexOf(tr);
    const changed = index > 0 && sweepTrials[index - 1].outcome !== tr.outcome;
    option.textContent = changed
      ? t('binarySweep.recheck.atChange', {
          value: formatNumber(tr.value, { sig: 3 }),
        })
      : formatNumber(tr.value, { sig: 3 });
    e.sweepRecheck.appendChild(option);
  }
  if (chosen) e.sweepRecheck.value = chosen;
  if (e.sweepRecheckRun) {
    e.sweepRecheckRun.disabled = sweepRunning || !sweepTrials.length;
  }
  if (e.sweepKeep) e.sweepKeep.disabled = sweepRunning || !sweepTrials.length;
}

/** What the panel is holding, for the notebook, the export and the tests. */
export function binarySweepReport() {
  if (!sweepTrials.length) return null;
  return {
    ...sweepConfig,
    trials: sweepTrials.map(tr => ({ ...tr })),
    recheck: sweepRecheck
      ? {
          value: sweepRecheck.value,
          timestep: sweepRecheck.timestep,
          verdict: { ...sweepRecheck.verdict },
          coarse: { ...sweepRecheck.coarse },
          fine: { ...sweepRecheck.fine },
        }
      : null,
  };
}

/** @returns {boolean} Whether a sweep is running */
export const isBinarySweeping = () => sweepRunning;

/** For the lesson and the tests: run the sweep as the button does. */
export const startBinarySweep = opts => runBinarySweep(opts);

/** Wire the panel up. Called once at boot. */
export function initBinaryRun() {
  // This panel's strings are not in the start-up catalogue, so it registers
  // them itself rather than trusting whoever opened it to have done so. The
  // bridge does register them first in the normal path; a lesson, a share link
  // or a test that drives the panel directly does not, and a panel that renders
  // message ids because of who called it is a panel with a bug.
  ensureDeferredMessages()
    .then(() => render())
    .catch(() => {});

  // The catalogue can arrive after this panel does. These strings are not in
  // the start-up bundle, and although the bridge registers them before it
  // imports this module, anything that drives the panel directly - a lesson, a
  // share link, a test - can render before that await resolves and paint
  // message ids. Redrawing when the catalogue changes removes the race rather
  // than narrowing it, and is the same subscription a language switch needs.
  onLocaleChange(() => render());

  const e = cacheElements();
  if (!e.container) return;

  e.toggle?.addEventListener('click', () => setBinaryRunEnabled(!enabled));
  e.close?.addEventListener('click', () => {
    dismissed = true;
    setBinaryRunEnabled(false);
  });
  e.start?.addEventListener('click', beginRun);
  e.halve?.addEventListener('click', halveAndRepeat);

  e.sweepRun?.addEventListener('click', () => {
    runBinarySweep().catch(() => {});
  });
  e.sweepCancel?.addEventListener('click', () => {
    import('./experiments/bench.js')
      .then(bench => bench.cancelSweep())
      .catch(() => {});
  });
  // The whole sweep into the notebook: the prediction the lesson asked for,
  // the five outcomes, the settings they were run at, the seed, and the
  // limitation that outlives all of them. Dynamic, so a reader who never keeps
  // anything never downloads the notebook.
  e.sweepKeep?.addEventListener('click', async () => {
    const report = binarySweepReport();
    if (!report) return;
    const { captureToNotebook } = await import('./notebookBridge.js');
    await captureToNotebook((capture, provenance) =>
      capture.fromBinarySweep({ report, provenance })
    );
  });

  e.sweepRecheckRun?.addEventListener('click', () => {
    const value = Number(e.sweepRecheck?.value);
    if (!Number.isFinite(value)) return;
    // Half the step the sweep itself ran at, which is the check the lesson
    // already makes by hand for a single configuration.
    const step = (sweepConfig?.held?.maxTimestep ?? SETTINGS.max_timestep) / 2;
    runBinarySweep({ values: [value], timestep: step }).catch(() => {});
  });

  // A rebuilt world is a new experiment. The old recording refers to bodies
  // that no longer exist, and keeping it would let a student read the previous
  // configuration's outcome beside the new configuration's inputs.
  // There is no rail chip for this panel, and that is deliberate: it is an
  // instrument for two scenarios rather than a general tool, and the rail's
  // chip grid is full. So it shows itself when one of its scenarios loads and
  // stays out of the way everywhere else.
  window.addEventListener('gravitasSimulationReset', () => {
    stopBinaryWatch();
    showForCurrentScenario();
  });

  e.container.style.display = 'none';
}

/**
 * Show the panel for a scenario that has already finished loading.
 *
 * The chunk is fetched by js/scenarioPanelBridge.js in response to the reset
 * event, so by the time init() subscribes to that event it has been and gone.
 * This is the one-off catch-up for the load that caused the import; every
 * later rebuild is handled by the subscription. It shows the panel directly
 * rather than dispatching a reset event: no world was rebuilt, and every other
 * listener on that event - the bench, the watches, the notebook - would act on
 * a rebuild that never happened. Locally it also discarded a run that had
 * finished while this chunk was still in flight.
 *
 * @returns {void}
 */
export function notifyScenarioReady() {
  showForCurrentScenario();
}
