// =============================================================================
// The gravity assist panel
// -----------------------------------------------------------------------------
// One job: put the same encounter's numbers side by side in two frames, because
// that juxtaposition is the entire explanation and no other panel in the
// application does it. Everything else here defers to something that already
// exists - the frame itself is js/referenceFrame.js, the trajectory is the
// ordinary renderer, the export is the ordinary export dialog, and the
// two-body predictions are js/gravityAssist.js.
//
// The layout is deliberately two columns rather than one list. A student who
// reads "0.35 before, 0.63 after" in one column and "0.46 before, 0.46 after"
// in the other has the whole of the gravity assist in front of them, and the
// question the lesson asks - how can both of those be true at once - is a
// question they can ask because the panel put the two answers next to each
// other rather than one after the other.
// =============================================================================

import { onPhysicsStep, planets, gas_giants, state } from './physics.js';
import { SETTINGS, current_scenario_name } from './appState.js';
import {
  deflectionAngle,
  maximumDeltaV,
  periapsisDistance,
} from './gravityAssist.js';
import {
  currentAssist,
  startAssistWatch,
  stopAssistWatch,
} from './assistWatch.js';
import { OBJECT, WORLD, setFrame, frameState } from './referenceFrame.js';
import {
  layoutObservationPanels,
  noteObservationPanelUsed,
} from './observationLayout.js';
import { formatNumber } from './format.js';
import { MONO } from './widgetCanvas.js';
import { simToAu, velocityUnitToMs } from './units.js';
import { SOLAR_MASS_UNIT as SOLAR_MASS } from './physics.js';
import { t, onLocaleChange } from './i18n/index.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';

let enabled = false;
let els = null;
let tick = null;
// Whether the reader has dismissed the panel for the scenario they are in.
// Reset on a scenario change, honoured within one.
let dismissed = false;

/** The scenarios this panel has anything to say about. */
const SCENARIOS = {
  'Gravity Assist Lab': 'isolated',
  'Gravity Assist: Heliocentric': 'heliocentric',
};

/** @returns {?string} 'isolated', 'heliocentric', or null */
const activeMode = () => SCENARIOS[current_scenario_name] ?? null;

/** Cache the DOM once. @returns {object} The elements */
function cacheElements() {
  if (els) return els;
  const id = s => document.getElementById(s);
  els = {
    container: id('assistContainer'),
    status: id('assistStatus'),
    impact: id('assistImpact'),
    run: id('assistRun'),
    flip: id('assistFlip'),
    planetFrame: id('assistPlanetFrame'),
    side: id('assistSide'),
    closest: id('assistClosest'),
    deflection: id('assistDeflection'),
    relBefore: id('assistRelBefore'),
    relAfter: id('assistRelAfter'),
    relChange: id('assistRelChange'),
    inertBefore: id('assistInertBefore'),
    inertAfter: id('assistInertAfter'),
    inertChange: id('assistInertChange'),
    recoil: id('assistRecoil'),
    ledger: id('assistLedger'),
    caveat: id('assistCaveat'),
    close: id('assistClose'),
    toggle: id('toggleAssist'),
    // The retained comparison, and the optional sweep beneath it.
    compareSection: id('assistCompareSection'),
    compareRun: id('assistCompareRun'),
    compareCancel: id('assistCompareCancel'),
    compareStatus: id('assistCompareStatus'),
    compareTable: id('assistCompareTable'),
    compareCaveat: id('assistCompareCaveat'),
    compareKeep: id('assistCompareKeep'),
    sweepSection: id('assistSweepSection'),
    sweepRun: id('assistSweepRun'),
    sweepCancel: id('assistSweepCancel'),
    sweepStatus: id('assistSweepStatus'),
    sweepTable: id('assistSweepTable'),
    sweepPlot: id('assistSweepPlot'),
    sweepCaveat: id('assistSweepCaveat'),
    sweepKeep: id('assistSweepKeep'),
  };
  return els;
}

/** The planet and the probe, in the order the builder created them. */
const bodies = () =>
  gas_giants.length >= 1 && planets.length >= 1
    ? { planet: gas_giants[0], probe: planets[0] }
    : null;

/** Speeds are shown in km/s, which is the unit anybody discussing a flyby uses. */
const kms = v => formatNumber(v * (velocityUnitToMs() / 1000), { sig: 4 });

/**
 * Rebuild the world and start recording.
 *
 * A rebuild rather than a nudge, for the same reason the binary lab rebuilds:
 * changing the impact parameter means launching a different encounter, and
 * moving a spacecraft that is already halfway through one is not the same
 * experiment with one variable changed.
 *
 * @returns {void}
 */
function beginRun() {
  if (!activeMode()) return;
  const e = cacheElements();
  const b = Number(e.impact?.value);
  if (Number.isFinite(b) && b !== 0) SETTINGS.assist_impact_parameter = b;
  window.dispatchEvent(new CustomEvent('gravitasRequestRebuild'));
}

/** Send the spacecraft past the other side of the planet. */
function flipSide() {
  const e = cacheElements();
  const b = Number(e.impact?.value) || SETTINGS.assist_impact_parameter;
  if (e.impact) e.impact.value = String(-b);
  beginRun();
}

/**
 * Arm the recorder against the world as it stands.
 *
 * Exported so the scenario loader can call it: a student who picks the
 * scenario off the gallery and presses play should get a recorded encounter
 * without having found this panel first.
 *
 * @returns {void}
 */
export function armAssistRun() {
  const mode = activeMode();
  if (!mode) return;
  const parts = bodies();
  if (!parts) return;

  const G = SETTINGS.gravitational_constant;
  startAssistWatch(
    {
      gate: SETTINGS.assist_gate,
      mu: G * parts.planet.mass,
      impactParameter: SETTINGS.assist_impact_parameter,
    },
    {
      onStep: onPhysicsStep,
      bodies,
      onFinish: () => {
        state.paused = true;
        render();
      },
    }
  );
  render();
}

/** Put the view into the planet's frame, or back into the world's. */
function togglePlanetFrame() {
  const parts = bodies();
  if (!parts) return;
  const now = frameState();
  const on = now.mode === OBJECT && now.objectId === parts.planet.id;
  setFrame(on ? WORLD : OBJECT, on ? null : parts.planet.id);
  render();
}

/**
 * The line about how far this encounter's frame can be trusted.
 *
 * Only the heliocentric scenario gets one, and it gets one because it needs
 * one: with a star present the planet's frame is accelerating, the encounter
 * is only approximately two-body, and the numbers in the left-hand column are
 * therefore only approximately equal. Saying how approximately is the
 * difference between teaching the patched-conic approximation and teaching a
 * result that happens to be slightly wrong.
 *
 * @param {object} run - From currentAssist()
 * @returns {string} The sentence, or '' when there is nothing to qualify
 */
function caveatText(run) {
  if (activeMode() !== 'heliocentric') return '';
  if (!run?.vInfBefore || !run?.vInfAfter) return t('assist.caveat.pending');
  const residual = Math.abs((run.vInfAfter - run.vInfBefore) / run.vInfBefore);

  // The Hill radius is the honest boundary of "the planet is what matters
  // here": beyond it the star's pull on the spacecraft wins and treating the
  // encounter as two bodies stops being defensible. Computed rather than
  // stored, because it follows from three settings and a stored copy would be
  // a fourth thing to keep in step with them.
  const parts = bodies();
  const a = SETTINGS.assist_orbit_radius;
  const hill =
    parts && a > 0
      ? a *
        Math.cbrt(parts.planet.mass / (3 * (SOLAR_MASS + parts.planet.mass)))
      : 0;

  return t('assist.caveat.helio', {
    residual: formatNumber(residual * 100, { sig: 2 }),
    hill: formatNumber(simToAu(hill), { sig: 2 }),
    gate: formatNumber(simToAu(run.gate), { sig: 2 }),
  });
}

/** Repaint from the current recording. */
function render() {
  const e = cacheElements();
  if (!e.container || !enabled) return;

  // Which scenario is loaded decides whether the experiments are offered, and
  // that is true whether or not an encounter has been recorded yet. Below the
  // no-run branch returns early, and this used to sit after it - so loading
  // the heliocentric scenario left both sections on screen offering a
  // comparison that scenario cannot honestly run.
  syncExperimentSections();

  const run = currentAssist();
  const parts = bodies();
  const blank = [
    e.side,
    e.closest,
    e.deflection,
    e.relBefore,
    e.relAfter,
    e.relChange,
    e.inertBefore,
    e.inertAfter,
    e.inertChange,
    e.recoil,
  ];

  if (e.planetFrame && parts) {
    const now = frameState();
    const on = now.mode === OBJECT && now.objectId === parts.planet.id;
    e.planetFrame.setAttribute('aria-pressed', String(on));
    e.planetFrame.classList.toggle('active', on);
  }

  if (!run) {
    if (e.status) e.status.textContent = t('assist.status.idle');
    for (const cell of blank) if (cell) cell.textContent = '—';
    if (e.ledger) e.ledger.textContent = '';
    if (e.caveat) e.caveat.textContent = '';
    return;
  }

  if (e.status) {
    e.status.textContent = run.lost
      ? t('assist.status.lost')
      : run.phase === 'done'
        ? t('assist.status.done')
        : t(`assist.status.${run.phase}`);
  }

  if (e.side) {
    e.side.textContent = run.side ? t(`assist.side.${run.side}`) : '—';
  }
  if (e.closest) {
    const radii = parts?.planet?.radius
      ? run.closest / parts.planet.radius
      : null;
    e.closest.textContent =
      run.closest === null
        ? '—'
        : radii
          ? t('assist.closest.value', {
              au: formatNumber(simToAu(run.closest), { sig: 3 }),
              radii: formatNumber(radii, { sig: 2 }),
            })
          : formatNumber(simToAu(run.closest), { sig: 3 });
  }
  if (e.deflection) {
    if (run.deflection === null) {
      e.deflection.textContent = '—';
    } else {
      // The two-body prediction beside the measurement, always. In the
      // isolated scenario they agree to a hundredth of a degree and the point
      // is that the theory is exact; with a star present they differ by a few
      // per cent and the point is that it is not.
      const mu = parts
        ? SETTINGS.gravitational_constant * parts.planet.mass
        : 0;
      const predicted = deflectionAngle(
        mu,
        run.impactParameter,
        run.vInfBefore ?? 0
      );
      e.deflection.textContent = t('assist.deflection.value', {
        measured: formatNumber(Math.abs((run.deflection * 180) / Math.PI), {
          sig: 4,
        }),
        predicted:
          predicted === null
            ? '—'
            : formatNumber((predicted * 180) / Math.PI, { sig: 4 }),
      });
    }
  }

  // The two columns. Left: what the planet sees. Right: what everything else
  // sees. Same encounter, same instant, different answers.
  if (e.relBefore) {
    e.relBefore.textContent =
      run.vInfBefore === null ? '—' : kms(run.vInfBefore);
  }
  if (e.relAfter) {
    e.relAfter.textContent = run.vInfAfter === null ? '—' : kms(run.vInfAfter);
  }
  if (e.relChange) {
    e.relChange.textContent =
      run.vInfBefore === null || run.vInfAfter === null
        ? '—'
        : t('assist.change.value', {
            delta: kms(run.vInfAfter - run.vInfBefore),
            percent: formatNumber(
              (100 * (run.vInfAfter - run.vInfBefore)) / run.vInfBefore,
              { sig: 2 }
            ),
          });
  }
  if (e.inertBefore) {
    e.inertBefore.textContent =
      run.inertialBefore === null ? '—' : kms(run.inertialBefore);
  }
  if (e.inertAfter) {
    e.inertAfter.textContent =
      run.inertialAfter === null ? '—' : kms(run.inertialAfter);
  }
  if (e.inertChange) {
    if (run.speedChange === null) {
      e.inertChange.textContent = '—';
    } else {
      e.inertChange.textContent = t('assist.change.value', {
        delta: kms(run.speedChange),
        percent: formatNumber((100 * run.speedChange) / run.inertialBefore, {
          sig: 2,
        }),
      });
      e.inertChange.dataset.sign = run.speedChange >= 0 ? 'gain' : 'loss';
    }
  }

  if (e.recoil) {
    e.recoil.textContent = run.planetDeltaVMagnitude
      ? t('assist.recoil.value', {
          dv: formatNumber(
            run.planetDeltaVMagnitude * velocityUnitToMs() * 1000,
            { sig: 3 }
          ),
          ratio: formatNumber(
            run.planetSpeed > 0
              ? run.planetDeltaVMagnitude / run.planetSpeed
              : 0,
            { sig: 2 }
          ),
        })
      : '—';
  }

  // The books, balanced. Not decoration: an assist looks like free energy
  // until somebody shows that the planet paid, and this is that line.
  if (e.ledger) {
    if (!run.probeDeltaP || !run.planetDeltaP) {
      e.ledger.textContent = '';
    } else {
      // The mismatch comes from the watcher rather than from here. It is the
      // same encounter the comparison, the sweep, the notebook and the export
      // report, and a second definition of "how closely the books balance"
      // living in the panel is a second answer waiting to differ from theirs.
      const probe = Math.hypot(run.probeDeltaP.x, run.probeDeltaP.y);
      const planet = Math.hypot(run.planetDeltaP.x, run.planetDeltaP.y);
      e.ledger.textContent = t('assist.ledger', {
        probe: formatNumber(probe, { sig: 3 }),
        planet: formatNumber(planet, { sig: 3 }),
        mismatch: formatNumber((run.ledgerMismatch ?? 0) * 100, { sig: 2 }),
      });
    }
  }

  if (e.caveat) e.caveat.textContent = caveatText(run);

  // The ceiling, so a measured change can be read against what was possible.
  if (e.run) {
    e.run.title = run.vInfBefore
      ? t('assist.maxDeltaV', { max: kms(maximumDeltaV(run.vInfBefore)) })
      : '';
  }
}

/**
 * Open or close the panel.
 * @param {boolean} on - Whether to show it
 * @returns {void}
 */
export function setAssistEnabled(on) {
  const e = cacheElements();
  enabled = Boolean(on);
  if (e.container) e.container.style.display = enabled ? '' : 'none';
  if (enabled) noteObservationPanelUsed('assistContainer');
  if (e.toggle) {
    e.toggle.setAttribute('aria-pressed', String(enabled));
    e.toggle.classList.toggle('active', enabled);
  }

  if (enabled) {
    if (e.impact) e.impact.value = String(SETTINGS.assist_impact_parameter);
    if (!currentAssist()) armAssistRun();
    renderExperiments();
    if (!tick) {
      const id = setInterval(render, 200);
      tick = () => clearInterval(id);
    }
    render();
  } else {
    tick?.();
    tick = null;
  }
  layoutObservationPanels();
}

/** @returns {boolean} Whether the panel is open */
export const isAssistEnabled = () => enabled;

/** The predicted closest approach, for the lesson and for tests. */
export const predictedPeriapsis = () => {
  const parts = bodies();
  if (!parts) return null;
  return periapsisDistance(
    SETTINGS.gravitational_constant * parts.planet.mass,
    SETTINGS.assist_impact_parameter,
    SETTINGS.assist_v_infinity
  );
};

/** The scenario the panel last matched itself to. */
let lastScenario = null;

/**
 * Match the panel to whatever scenario is loaded now.
 *
 * Shared by the rebuild subscription and by the late-arrival catch-up below.
 * Arming is conditional: the rebuild path has just stopped the watch, so the
 * guard costs it nothing, and the catch-up must not discard an encounter that
 * was recorded while this chunk was still being fetched.
 *
 * @returns {void}
 */
function showForCurrentScenario() {
  const e = cacheElements();
  const mode = activeMode();
  if (current_scenario_name !== lastScenario) {
    lastScenario = current_scenario_name;
    dismissed = false;
  }
  if (mode && !dismissed) {
    setAssistEnabled(true);
    if (e.impact) e.impact.value = String(SETTINGS.assist_impact_parameter);
    if (!currentAssist()) armAssistRun();
    render();
    return;
  }
  if (!mode && enabled) {
    setAssistEnabled(false);
    return;
  }
  if (enabled) {
    if (e.impact) e.impact.value = String(SETTINGS.assist_impact_parameter);
    if (!currentAssist()) armAssistRun();
  }
  render();
}

// =============================================================================
// The retained comparison, and the optional sweep
// -----------------------------------------------------------------------------
// Both run on the bench: the same runner the binary lesson's sweep uses, with
// the same world capture and restoration, the same cancellation and the same
// per-trial statuses. What is local is which values, what is held, and how the
// result is read - and the reading is done by js/experiments/assistSweep.js
// against js/assistWatch.js, so the numbers here are the same numbers the
// panel above shows for a hand-flown pass.
//
// Both sections belong to the isolated laboratory and are hidden with a star
// present. That is not tidiness. The comparison's claim is that A and B differ
// in one number, and running it in a scenario where the planet's frame is
// accelerating would put a second difference into every row of the table.
// =============================================================================

/** True while either experiment is running; both share the one bench. */
let experimentRunning = false;
/** The two passes, as the lesson reports them. */
let comparison = null;
/** The five, likewise. */
let sweepEncounters = [];
/** What each was run at. */
let comparisonConfig = null;
let sweepConfig = null;

/** @returns {object} Everything both experiments hold fixed, read once. */
function heldFixed() {
  return {
    vInfinity: SETTINGS.assist_v_infinity,
    gate: SETTINGS.assist_gate,
    approachDeg: SETTINGS.assist_approach_deg,
    planetMassJupiters: SETTINGS.assist_planet_mass,
    planetSpeed: SETTINGS.assist_planet_speed,
    probeMassRatio: SETTINGS.assist_probe_mass_ratio,
    orbitRadius: SETTINGS.assist_orbit_radius,
    integrator: SETTINGS.integrator,
    maxTimestep: SETTINGS.max_timestep,
    simSpeed: SETTINGS.sim_speed,
    gravitationalConstant: SETTINGS.gravitational_constant,
  };
}

/**
 * Run one of the two experiments.
 *
 * The approach speed is set to the laboratory's own baseline first and put
 * back afterwards. Without that, a comparison run after somebody had changed
 * it would be two passes that agree with each other and disagree with every
 * number the lesson quotes - and the one thing this experiment claims is that
 * its two arms differ in exactly one input.
 *
 * @param {string} which - 'comparison' or 'sweep'
 * @returns {Promise<void>}
 */
async function runAssistExperiment(which) {
  const e = cacheElements();
  if (activeMode() !== 'isolated' || experimentRunning) return;

  // The bench has to be wired to the application before it can run anything,
  // and its bridge is what does that. Same call the experiment panel makes, so
  // a student who reaches this from the lesson without ever having opened the
  // bench gets a working one.
  const [{ bench }, assist, frameRate] = await Promise.all([
    import('./experimentsBridge.js').then(m => m.ensureBench()),
    import('./experiments/assistSweep.js'),
    import('./experiments/frameRate.js'),
  ]);

  const savedVInf = SETTINGS.assist_v_infinity;
  SETTINGS.assist_v_infinity = assist.BASELINE.vInfinity;

  const over = {
    gate: SETTINGS.assist_gate,
    vInf: assist.BASELINE.vInfinity,
    frameRatio: await frameRate.measureFrameRatio({
      settings: SETTINGS,
      state,
    }),
  };
  const spec =
    which === 'comparison'
      ? assist.comparisonSpec(over)
      : assist.sweepSpec(over);

  experimentRunning = true;
  const buttons = [e.compareRun, e.sweepRun, e.compareKeep, e.sweepKeep];
  for (const b of buttons) if (b) b.disabled = true;
  const cancel = which === 'comparison' ? e.compareCancel : e.sweepCancel;
  if (cancel) cancel.hidden = false;
  const status = which === 'comparison' ? e.compareStatus : e.sweepStatus;

  let result = null;
  try {
    result = await bench.runSweep(spec, {
      observer: assist.assistObserver({ armRun: armAssistRun }),
      onProgress: ({ trial, total }) => {
        if (status) {
          status.textContent = t('assist.exp.running', {
            done: trial + 1,
            total,
          });
        }
      },
    });
  } catch (err) {
    console.warn('[assist] the experiment did not finish:', err);
  } finally {
    SETTINGS.assist_v_infinity = savedVInf;
    experimentRunning = false;
    for (const b of buttons) if (b) b.disabled = false;
    if (cancel) cancel.hidden = true;
    // The bench put the reader's own world back, which rebuilt it - so the
    // recording the panel above was showing now refers to bodies that no
    // longer exist. Re-arm on the world that is actually there.
    stopAssistWatch();
    armAssistRun();
  }

  if (!result?.ok) {
    if (status) {
      status.textContent = t('assist.exp.refused', {
        reason: result?.reason ?? 'unknown',
      });
    }
    return;
  }

  const encounters = result.trials.map(assist.describeEncounter);
  const config = {
    seed: result.seed,
    values: spec.values,
    gate: SETTINGS.assist_gate,
    held: heldFixed(),
    numerics: result.numerics,
    duration: result.duration,
    wallMs: result.wallMs,
    cancelled: result.cancelled,
    ranAt: result.ranAt,
  };

  if (which === 'comparison') {
    // Presented gaining pass first, whatever order the runner took them in:
    // the lesson has already flown the gaining one, and a table that opens
    // with the pass they have not seen is a table they have to reorder.
    const find = v => encounters.find(enc => enc.value === v) ?? null;
    comparison = {
      gaining: find(assist.COMPARISON.gaining),
      losing: find(assist.COMPARISON.losing),
      sides: null,
      audit: null,
    };
    comparison.sides = assist.compareSides(
      comparison.gaining,
      comparison.losing
    );
    comparison.audit = assist.frameAudit(comparison.gaining);
    comparisonConfig = config;
  } else {
    sweepEncounters = encounters;
    sweepConfig = {
      ...config,
      verdict: assist.strongestTurnGainsMost(encounters),
    };
  }
  renderExperiments();
}

/** The colour a row and a point are drawn in, by what the encounter was. */
const ENCOUNTER_INK = {
  complete: '#7fe3a0',
  incomplete: '#ffd27f',
  noBefore: '#ffd27f',
  lost: '#ff7f9f',
  notRun: '#8892a6',
};

/** A cell, with the outcome's colour when it is one. */
function cell(row, text, { head = false, ink = null } = {}) {
  const td = document.createElement(head ? 'th' : 'td');
  if (head) td.scope = 'row';
  td.textContent = text;
  if (ink) td.style.color = ink;
  row.appendChild(td);
  return td;
}

/** Draw both experiments, whatever state they are in. */
function renderExperiments() {
  renderComparison();
  renderSweep();
}

/**
 * The two passes, side by side.
 *
 * Transposed against the usual arrangement - quantities down, passes across -
 * because the comparison the lesson wants is between two numbers on the SAME
 * row, and a table with ten columns and two rows makes that a scroll.
 */
function renderComparison() {
  const e = cacheElements();
  if (!e.compareTable) return;

  if (e.compareStatus && !experimentRunning && comparison) {
    const done = [comparison.gaining, comparison.losing].filter(
      enc => enc?.usable
    ).length;
    e.compareStatus.textContent = t('assist.ab.done', {
      done,
      seconds: ((comparisonConfig?.wallMs ?? 0) / 1000).toFixed(0),
    });
  }

  e.compareTable.innerHTML = '';
  if (comparison) {
    const table = document.createElement('table');
    table.className = 'experiment-table';
    const head = document.createElement('tr');
    for (const label of [
      '',
      t('assist.ab.col.gaining', { b: fmt(comparison.gaining?.value) }),
      t('assist.ab.col.losing', { b: fmt(comparison.losing?.value) }),
    ]) {
      const th = document.createElement('th');
      th.textContent = label;
      head.appendChild(th);
    }
    table.appendChild(head);

    const pair = [comparison.gaining, comparison.losing];
    /** One row of the table: a label and the same reading from both passes. */
    const row = (label, read, outcome = null) => {
      const tr = document.createElement('tr');
      if (outcome) tr.dataset.outcome = outcome;
      cell(tr, label, { head: true });
      for (const enc of pair) {
        cell(tr, enc ? read(enc) : '—', {
          ink: outcome ? (ENCOUNTER_INK[enc?.outcome] ?? null) : null,
        });
      }
      table.appendChild(tr);
    };

    row(t('assist.ab.row.side'), enc =>
      enc.side ? t(`assist.side.${enc.side}`) : '—'
    );
    row(t('assist.ab.row.closest'), enc =>
      enc.closest === null ? '—' : `${fmt(simToAu(enc.closest), 3)} AU`
    );
    row(t('assist.ab.row.deflection'), enc =>
      enc.deflectionDeg === null
        ? '—'
        : `${fmt(Math.abs(enc.deflectionDeg), 4)}°`
    );
    row(t('assist.ab.row.relBefore'), enc =>
      enc.relBefore === null ? '—' : kms(enc.relBefore)
    );
    row(t('assist.ab.row.relAfter'), enc =>
      enc.relAfter === null ? '—' : kms(enc.relAfter)
    );
    row(t('assist.ab.row.inertBefore'), enc =>
      enc.inertBefore === null ? '—' : kms(enc.inertBefore)
    );
    row(t('assist.ab.row.inertAfter'), enc =>
      enc.inertAfter === null ? '—' : kms(enc.inertAfter)
    );
    // Signed, and the sign is the result. A magnitude here would erase the
    // difference between the two columns.
    row(t('assist.ab.row.speedChange'), enc =>
      enc.speedChange === null
        ? '—'
        : `${enc.speedChange >= 0 ? '+' : '−'}${kms(Math.abs(enc.speedChange))}`
    );
    row(t('assist.ab.row.deltaV'), enc =>
      enc.deltaVMagnitude === null ? '—' : kms(enc.deltaVMagnitude)
    );
    // Last, and never omitted: a pass with no outgoing reading is not a
    // measurement of a flyby, and every number above it is then half a story.
    row(
      t('assist.ab.row.encounter'),
      enc => t(`assist.encounter.${enc.outcome}`),
      'encounter'
    );

    e.compareTable.appendChild(table);
  }

  renderComparisonCaveat();
}

/** Everything that has to be said beside the comparison. */
function renderComparisonCaveat() {
  const e = cacheElements();
  if (!e.compareCaveat) return;
  if (!comparison) {
    e.compareCaveat.textContent = '';
    return;
  }
  const parts = [];
  const bad = [comparison.gaining, comparison.losing].filter(
    enc => enc && !enc.usable
  );
  if (bad.length) {
    parts.push(
      t('assist.ab.caveat.incomplete', {
        n: bad.length,
        which: bad.map(enc => fmt(enc.value)).join(', '),
      })
    );
  }
  if (comparisonConfig?.cancelled) parts.push(t('assist.ab.caveat.cancelled'));

  const sides = comparison.sides;
  if (sides) {
    // The one thing that IS the same on both sides, and the one thing that is
    // not. Stated as measurements rather than as a rule, and stated in that
    // order, because the order is the argument.
    parts.push(
      t('assist.ab.caveat.deltaV', {
        percent: fmt((sides.deltaVMismatch ?? 0) * 100, 2),
        deflection: fmt((sides.deflectionMismatch ?? 0) * 100, 2),
        closest: fmt((sides.closestMismatch ?? 0) * 100, 2),
      })
    );
    parts.push(
      t('assist.ab.caveat.notMirrored', {
        gain: kms(Math.abs(sides.gain)),
        loss: kms(Math.abs(sides.loss)),
        ratio: fmt(sides.speedChangeRatio ?? 0, 2),
      })
    );
  }

  const audit = comparison.audit;
  if (audit) {
    // The finite spacecraft, said out loud. The recoil is not a rounding: it
    // is the reason "the planet's frame" names two frames rather than one.
    parts.push(
      t('assist.ab.caveat.recoil', {
        recoil: fmt(audit.planetRecoil * velocityUnitToMs() * 1000, 3),
        ratio: fmt(audit.recoilRatio, 3),
        mass: fmt(audit.massRatio, 3),
        agree: audit.recoilMatchesMass
          ? t('assist.ab.caveat.agree')
          : t('assist.ab.caveat.disagree'),
      })
    );
    parts.push(
      t('assist.ab.caveat.conserved', {
        residual: fmt(Math.abs(audit.relativeResidual ?? 0) * 100, 2),
        ledger: fmt(Math.abs(audit.ledgerMismatch ?? 0) * 100, 2),
      })
    );
  }

  parts.push(
    t('assist.ab.caveat.held', {
      vinf: kms(comparisonConfig?.held?.vInfinity ?? 0),
      gate: fmt(simToAu(comparisonConfig?.gate ?? 0), 3),
      step: fmt(comparisonConfig?.numerics?.step ?? 0, 3),
      seed: comparisonConfig?.seed ?? '—',
    })
  );

  e.compareCaveat.textContent = parts.join(' ');
}

/** The five, as a table. */
function renderSweep() {
  const e = cacheElements();
  if (!e.sweepTable) return;

  if (e.sweepStatus && !experimentRunning && sweepEncounters.length) {
    e.sweepStatus.textContent = t('assist.sweep.done', {
      n: sweepEncounters.length,
      seconds: ((sweepConfig?.wallMs ?? 0) / 1000).toFixed(0),
    });
  }

  e.sweepTable.innerHTML = '';
  if (sweepEncounters.length) {
    const table = document.createElement('table');
    table.className = 'experiment-table';
    const head = document.createElement('tr');
    for (const label of [
      t('assist.sweep.col.b'),
      t('assist.sweep.col.deflection'),
      t('assist.sweep.col.speedChange'),
      t('assist.sweep.col.closest'),
      t('assist.sweep.col.encounter'),
    ]) {
      const th = document.createElement('th');
      th.textContent = label;
      head.appendChild(th);
    }
    table.appendChild(head);

    for (const enc of sweepEncounters) {
      const tr = document.createElement('tr');
      tr.dataset.outcome = enc.outcome;
      cell(tr, fmt(enc.value), { head: true });
      cell(
        tr,
        enc.deflectionDeg === null
          ? '—'
          : `${fmt(Math.abs(enc.deflectionDeg), 4)}°`
      );
      cell(
        tr,
        enc.speedChange === null
          ? '—'
          : `${enc.speedChange >= 0 ? '+' : '−'}${kms(Math.abs(enc.speedChange))}`
      );
      cell(
        tr,
        enc.closest === null ? '—' : `${fmt(simToAu(enc.closest), 3)} AU`
      );
      cell(tr, t(`assist.encounter.${enc.outcome}`), {
        ink: ENCOUNTER_INK[enc.outcome] ?? null,
      });
      table.appendChild(tr);
    }
    e.sweepTable.appendChild(table);
  }

  renderSweepPlot();
  renderSweepCaveat();
}

/**
 * Deflection and speed change against impact parameter, as points.
 *
 * Two quantities in two units on one pair of axes, which is only honest if the
 * axes are labelled and the marks are distinguishable - so the turn is drawn
 * as an open circle read against the left axis and the speed change as a
 * filled square read against the right one. No line through either. Five
 * points do not establish the shape of a curve, and the question the lesson
 * asks about them is a question about which point is highest, not about what
 * happens between them.
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
  const usable = sweepEncounters.filter(enc => enc.usable);
  if (!usable.length) return;

  const pad = { left: 30, right: 32, top: 16, bottom: 26 };
  const xs = usable.map(enc => Math.abs(enc.value));
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  const spanX = hi - lo || 1;
  const x = v => pad.left + ((v - lo) / spanX) * (w - pad.left - pad.right);

  const turns = usable.map(enc => Math.abs(enc.deflectionDeg));
  const gains = usable.map(
    enc => enc.speedChange * (velocityUnitToMs() / 1000)
  );
  const axis = values => {
    const min = Math.min(0, ...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return v =>
      h - pad.bottom - ((v - min) / span) * (h - pad.top - pad.bottom);
  };
  const yTurn = axis(turns);
  const yGain = axis(gains);

  ctx.font = `10px ${MONO}`;
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, h - pad.bottom);
  ctx.lineTo(w - pad.right, h - pad.bottom);
  ctx.stroke();

  for (const [i, enc] of usable.entries()) {
    const px = x(Math.abs(enc.value));
    ctx.strokeStyle = '#7fb2ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, yTurn(turns[i]), 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffc57f';
    ctx.fillRect(px - 3, yGain(gains[i]) - 3, 6, 6);
  }

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7fb2ff';
  ctx.fillText(t('assist.sweep.plot.turn'), 2, 2);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffc57f';
  ctx.fillText(t('assist.sweep.plot.gain'), w - 2, 2);

  ctx.fillStyle = '#9aa3b5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const v of [lo, hi]) ctx.fillText(fmt(v), x(v), h - 10);
  ctx.fillText(t('assist.sweep.plot.axis'), (pad.left + w - pad.right) / 2, h);
}

/** Everything that has to be said beside the sweep. */
function renderSweepCaveat() {
  const e = cacheElements();
  if (!e.sweepCaveat) return;
  if (!sweepEncounters.length) {
    e.sweepCaveat.textContent = '';
    return;
  }
  const parts = [];
  const bad = sweepEncounters.filter(enc => !enc.usable);
  if (bad.length) {
    parts.push(
      t('assist.sweep.caveat.incomplete', {
        n: bad.length,
        which: bad.map(enc => fmt(enc.value)).join(', '),
      })
    );
  }
  if (sweepConfig?.cancelled) parts.push(t('assist.ab.caveat.cancelled'));

  const verdict = sweepConfig?.verdict;
  if (verdict) {
    parts.push(
      verdict.same
        ? t('assist.sweep.caveat.sameTrial', {
            b: fmt(verdict.mostTurned),
            n: verdict.n,
          })
        : t('assist.sweep.caveat.differentTrials', {
            turned: fmt(verdict.mostTurned),
            gained: fmt(verdict.mostGained),
          })
    );
    // The reason the answer is not a rule. True whichever way the five came
    // out, which is why it is said whichever way they came out.
    parts.push(t('assist.sweep.caveat.notALaw'));
  }

  parts.push(
    t('assist.sweep.caveat.held', {
      vinf: kms(sweepConfig?.held?.vInfinity ?? 0),
      step: fmt(sweepConfig?.numerics?.step ?? 0, 3),
      seed: sweepConfig?.seed ?? '—',
    })
  );

  e.sweepCaveat.textContent = parts.join(' ');
}

/** Four significant figures by default; the panel's one number formatter. */
const fmt = (v, sig = 3) =>
  Number.isFinite(v) ? formatNumber(v, { sig }) : '—';

/** What the panel is holding, for the notebook, the export and the tests. */
export function assistComparisonReport() {
  if (!comparison?.gaining && !comparison?.losing) return null;
  return {
    kind: 'comparison',
    ...comparisonConfig,
    gaining: comparison.gaining ? { ...comparison.gaining } : null,
    losing: comparison.losing ? { ...comparison.losing } : null,
    sides: comparison.sides ? { ...comparison.sides } : null,
    audit: comparison.audit ? { ...comparison.audit } : null,
  };
}

/** The same, for the sweep. */
export function assistSweepReport() {
  if (!sweepEncounters.length) return null;
  return {
    kind: 'sweep',
    ...sweepConfig,
    encounters: sweepEncounters.map(enc => ({ ...enc })),
  };
}

/** @returns {boolean} Whether either experiment is running */
export const isAssistExperimentRunning = () => experimentRunning;

/** For the lesson and the tests: run either experiment as the button does. */
export const startAssistComparison = () => runAssistExperiment('comparison');
export const startAssistSweep = () => runAssistExperiment('sweep');

/**
 * Show the experiments only where they mean something.
 *
 * The isolated laboratory, and nowhere else. With a star present the planet's
 * frame is accelerating and the encounter is only approximately two bodies, so
 * a comparison run there would differ from this one in two ways rather than
 * one - and the lesson's follow-up on the patched-conic approximation is
 * exactly the place to meet that, deliberately, one screen at a time.
 *
 * @returns {void}
 */
function syncExperimentSections() {
  const e = cacheElements();
  const isolated = activeMode() === 'isolated';
  for (const section of [e.compareSection, e.sweepSection]) {
    if (section) section.hidden = !isolated;
  }
  if (e.compareKeep) e.compareKeep.disabled = experimentRunning || !comparison;
  if (e.sweepKeep) {
    e.sweepKeep.disabled = experimentRunning || !sweepEncounters.length;
  }
}

/** Wire the panel up. Called once at boot. */
export function initAssist() {
  // This panel's strings are not in the start-up catalogue, so it registers
  // them itself rather than trusting whoever opened it to have done so. The
  // bridge does register them first in the normal path; a lesson, a share link
  // or a test that drives the panel directly does not, and a panel that renders
  // message ids because of who called it is a panel with a bug.
  ensureDeferredMessages()
    .then(() => {
      render();
      renderExperiments();
    })
    .catch(() => {});

  // The catalogue can arrive after this panel does. These strings are not in
  // the start-up bundle, and although the bridge registers them before it
  // imports this module, anything that drives the panel directly - a lesson, a
  // share link, a test - can render before that await resolves and paint
  // message ids. Redrawing when the catalogue changes removes the race rather
  // than narrowing it, and is the same subscription a language switch needs.
  onLocaleChange(() => {
    render();
    // The retained tables are built from strings too, and a reader who
    // switches language with two passes on screen should not be left holding
    // an English table.
    renderExperiments();
  });

  const e = cacheElements();
  if (!e.container) return;

  e.toggle?.addEventListener('click', () => setAssistEnabled(!enabled));
  e.close?.addEventListener('click', () => {
    dismissed = true;
    setAssistEnabled(false);
  });
  e.run?.addEventListener('click', beginRun);
  e.flip?.addEventListener('click', flipSide);
  e.planetFrame?.addEventListener('click', togglePlanetFrame);

  e.compareRun?.addEventListener('click', () => {
    runAssistExperiment('comparison').catch(() => {});
  });
  e.sweepRun?.addEventListener('click', () => {
    runAssistExperiment('sweep').catch(() => {});
  });
  for (const button of [e.compareCancel, e.sweepCancel]) {
    button?.addEventListener('click', () => {
      import('./experiments/bench.js')
        .then(bench => bench.cancelSweep())
        .catch(() => {});
    });
  }
  // Into the notebook: the passes, what was held, the seed, the settings they
  // were actually integrated at, and the limits that outlive them. Dynamic, so
  // a reader who never keeps anything never downloads the notebook.
  e.compareKeep?.addEventListener('click', async () => {
    const report = assistComparisonReport();
    if (!report) return;
    const { captureToNotebook } = await import('./notebookBridge.js');
    await captureToNotebook((capture, provenance) =>
      capture.fromAssistComparison({ report, provenance })
    );
  });
  e.sweepKeep?.addEventListener('click', async () => {
    const report = assistSweepReport();
    if (!report) return;
    const { captureToNotebook } = await import('./notebookBridge.js');
    await captureToNotebook((capture, provenance) =>
      capture.fromAssistSweep({ report, provenance })
    );
  });

  // There is no rail chip for this panel, and that is deliberate: it is an
  // instrument for two scenarios rather than a general tool, and the rail's
  // chip grid is full. So it shows itself when one of its scenarios loads and
  // stays out of the way everywhere else. Without this the panel is not
  // reachable at all, which is how the e2e suite found it missing.
  window.addEventListener('gravitasSimulationReset', () => {
    stopAssistWatch();
    // A rebuilt world is a new encounter, and the frame pointed at the old
    // planet is pointing at an id that now means something else.
    setFrame(WORLD);
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
 * rather than dispatching a reset event: nothing was rebuilt, and a synthetic
 * reset would have every other listener on that event act on a rebuild that
 * never happened - including this app's reference frame, which the handler
 * above deliberately returns to the world frame.
 *
 * @returns {void}
 */
export function notifyScenarioReady() {
  showForCurrentScenario();
}
