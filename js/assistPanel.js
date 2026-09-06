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
import { simToAu, velocityUnitToMs } from './units.js';
import { SOLAR_MASS_UNIT as SOLAR_MASS } from './physics.js';
import { t } from './i18n/index.js';

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
      const probe = Math.hypot(run.probeDeltaP.x, run.probeDeltaP.y);
      const planet = Math.hypot(run.planetDeltaP.x, run.planetDeltaP.y);
      const mismatch = probe > 0 ? Math.abs(planet - probe) / probe : 0;
      e.ledger.textContent = t('assist.ledger', {
        probe: formatNumber(probe, { sig: 3 }),
        planet: formatNumber(planet, { sig: 3 }),
        mismatch: formatNumber(mismatch * 100, { sig: 2 }),
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

/** Wire the panel up. Called once at boot. */
export function initAssist() {
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

  // There is no rail chip for this panel, and that is deliberate: it is an
  // instrument for two scenarios rather than a general tool, and the rail's
  // chip grid is full. So it shows itself when one of its scenarios loads and
  // stays out of the way everywhere else. Without this the panel is not
  // reachable at all, which is how the e2e suite found it missing.
  let lastScenario = null;
  window.addEventListener('gravitasSimulationReset', () => {
    stopAssistWatch();
    // A rebuilt world is a new encounter, and the frame pointed at the old
    // planet is pointing at an id that now means something else.
    setFrame(WORLD);

    const mode = activeMode();
    if (current_scenario_name !== lastScenario) {
      lastScenario = current_scenario_name;
      dismissed = false;
    }
    if (mode && !dismissed) {
      setAssistEnabled(true);
      if (e.impact) e.impact.value = String(SETTINGS.assist_impact_parameter);
      armAssistRun();
      return;
    }
    if (!mode && enabled) {
      setAssistEnabled(false);
      return;
    }
    if (enabled) {
      if (e.impact) e.impact.value = String(SETTINGS.assist_impact_parameter);
      armAssistRun();
    } else {
      render();
    }
  });

  e.container.style.display = 'none';
}
