// =============================================================================
// The experiment kinds of the ensemble runner (Prompt 265, EXPERIMENT_ENSEMBLES.md)
// -----------------------------------------------------------------------------
// A kind says four things: which named streams its trials draw from, which
// kernels it uses (and their versions, which the record keeps), whether a trial
// needs the engine in its realm, and the trial itself: a function of the kind's
// config and ONE stream, the trial's own fork, that returns the quantities that
// trial measured. Nothing here reads a clock, Math.random or another trial.
//
//   ensemble   the same world run many times with a small seeded change: the
//              'analytic-draw' world (synthetic, closed-form) and the 'three-body'
//              world (the engine's Lagrange triangle, every coordinate nudged)
//   injection  a campaign: a signal of known strength is injected and the
//              search's recovery is drawn (Prompt 229's matched filter)
//   bootstrap  one resample of the values a finished result carries
//   sweep      the existing parameter sweep, a trial of js/experiments/
//              trialRunner.js, with the legacy draws its recorded results used
//
// A quantity is {id, value, unit, origin}: units are ids of js/units/registry.js
// (or null, not stated), the origin is always 'synthetic' (a forward model's
// output, not an observation). A trial that cannot give a finite number returns
// a status and no value; it is counted and never averaged in.
// =============================================================================

import {
  gaussian,
  ALGORITHM,
  VERSION as STREAM_VERSION,
} from '../../random/streams.js';
import { STATUS } from '../status.js';

export const ENSEMBLE_VERSION = 1;
/** The statistics kernel's methods the summary uses (Prompt 154, STATISTICS.md). */
export const STATISTICS_METHODS = 'student-t+percentile+case-bootstrap@154';

const { Math } = globalThis;

const q = (id, value, unit) => ({ id, value, unit, origin: 'synthetic' });
const finite = list => list.every(x => Number.isFinite(x.value));

/** Names of the worlds of the 'ensemble' kind, and of the clients of 'injection'. */
export const WORLDS = Object.freeze(['analytic-draw', 'three-body']);
export const CLIENTS = Object.freeze(['matched-filter-229']);
export const BOOTSTRAP_STATISTICS = Object.freeze(['mean', 'median']);

// --- ensemble: analytic-draw (synthetic, closed form) ---------------------------

function analyticDraw(config, draw) {
  const u = draw();
  const z = gaussian(draw)();
  return {
    status: STATUS.OK,
    quantities: [q('u', u, null), q('z', z, null)],
    outcome: u >= 0.5 ? 'high' : 'low',
  };
}

// --- ensemble: three-body (the engine's Lagrange triangle) ----------------------

export const THREE_BODY = Object.freeze({
  scenario: 'three-body-sensitivity-lab',
  perturbation: 0.01,
  steps: 1000,
  dt: 0.05,
  radius: 50,
  escapeRadii: 3,
});

/**
 * One trial of the perturbed Lagrange triangle on the engine of this realm: every
 * coordinate and velocity component of each star nudged by up to `perturbation` of
 * its scale (the nudges are `2 * draw() - 1`, in the order x, y, vx, vy per star),
 * `steps` steps of `dt`, then the relative energy drift, the closest pair
 * separation, the largest distance from the centre of mass and the outcome by
 * that distance. The arithmetic of the setup is that of js/validation/groups/
 * long-term-regression.js (Prompt 137), which this is the ensemble form of.
 * @param {object} m - The realm's modules (physics, build, scenarios, appState,
 *   rng, timestep, units); `buildScenario` from ../trialRunner.js is passed in
 * @param {Function} [applyLab] - js/validation/harness.js applyLabSettings, for config.physics 'validation-lab'
 */
export function threeBodyTrial(m, buildScenario, config, draw, applyLab) {
  const c = { ...THREE_BODY, ...config };
  const settings = buildScenario(m, { scenario: c.scenario, seed: 'ensemble' });
  const { physics } = m;
  // The validation lab's world (js/validation/harness.js LAB_SETTINGS) on the built
  // stars: no orbit decay, a softening floor of 1e-6, the application's G.
  if (c.physics === 'validation-lab')
    applyLab(physics, {
      gravitational_constant: 2,
      mutual_gravity: true,
      star_only_gravity: false,
      enable_star_merging: false,
    });
  const stars = physics.stars;
  if (stars.length !== 3)
    return {
      status: STATUS.BUILD_FAILED,
      error: 'the world has not three stars',
    };
  const G =
    c.physics === 'validation-lab' ? 2 : settings.gravitational_constant;
  const MASS = stars[0].mass;
  const R = c.radius;
  const SIDE = R * Math.sqrt(3);
  const OMEGA = Math.sqrt((G * 3 * MASS) / SIDE ** 3);
  for (let i = 0; i < 3; i++) {
    const cc = [1, -0.5, -0.5][i];
    const sn = [0, 0.8660254037844386, -0.8660254037844386][i];
    const x = R * cc;
    const y = R * sn;
    stars[i].pos.x = x + R * c.perturbation * (2 * draw() - 1);
    stars[i].pos.y = y + R * c.perturbation * (2 * draw() - 1);
    stars[i].vel.x = -OMEGA * y + OMEGA * R * c.perturbation * (2 * draw() - 1);
    stars[i].vel.y = OMEGA * x + OMEGA * R * c.perturbation * (2 * draw() - 1);
  }
  physics.bumpWorldGeneration?.();
  physics.resetSimulationTime?.();
  physics.resetConservationBaseline?.();
  physics.resetPotentialCache?.();
  const before = physics.conservedQuantities();
  let closest = Infinity;
  for (let k = 0; k < c.steps; k++) {
    physics.updatePhysics(c.dt);
    for (let a = 0; a < 3; a++)
      for (let b = a + 1; b < 3; b++)
        closest = Math.min(
          closest,
          Math.hypot(
            stars[a].pos.x - stars[b].pos.x,
            stars[a].pos.y - stars[b].pos.y
          )
        );
  }
  const after = physics.conservedQuantities();
  let cx = 0;
  let cy = 0;
  let mass = 0;
  for (const s of stars) {
    cx += s.mass * s.pos.x;
    cy += s.mass * s.pos.y;
    mass += s.mass;
  }
  cx /= mass;
  cy /= mass;
  let far = 0;
  let beyond = 0;
  for (const s of stars) {
    const r = Math.hypot(s.pos.x - cx, s.pos.y - cy);
    far = Math.max(far, r);
    if (r > c.escapeRadii * R) beyond++;
  }
  const quantities = [
    q(
      'energy_drift',
      Math.abs((after.energy - before.energy) / before.energy),
      null
    ),
    q('closest_separation', closest, 'sim'),
    q('largest_radius', far, 'sim'),
  ];
  return {
    status: finite(quantities) ? STATUS.OK : STATUS.NOT_FINITE,
    quantities,
    outcome: ['bound', 'one-escaper', 'dispersed'][Math.min(beyond, 2)],
  };
}

// --- injection: Prompt 229's matched filter as the client -----------------------

async function injectionTrial(config, draw) {
  const { recover } = await import('../../kernels/occurrence/injection.js');
  const c = { S: 7.1, N: 5, sigma: 1, threshold: 7.1, ...config };
  // A signal whose noise-free statistic is S, recovered by the search's own rule.
  const r = recover(
    { N: c.N, s2: (c.S * c.sigma) ** 2 },
    { sigma: c.sigma },
    draw,
    {
      threshold: c.threshold,
    }
  );
  const quantities = [
    q('statistic', r.statistic, null),
    q('recovered', r.detected ? 1 : 0, 'count'),
  ];
  return {
    status: finite(quantities) ? STATUS.OK : STATUS.NOT_FINITE,
    quantities,
    outcome: r.detected ? 'recovered' : 'missed',
  };
}

// --- bootstrap: one resample of the values a result carries ----------------------

function bootstrapTrial(config, draw) {
  const v = config.source.values;
  const n = v.length;
  let sum = 0;
  const pick = [];
  for (let i = 0; i < n; i++) {
    const x = v[Math.floor(draw() * n)];
    sum += x;
    pick.push(x);
  }
  let value = sum / n;
  if (config.statistic === 'median') {
    pick.sort((a, b) => a - b);
    const h = (n - 1) * 0.5;
    const lo = Math.floor(h);
    value = pick[lo] + (h - lo) * ((pick[lo + 1] ?? pick[lo]) - pick[lo]);
  }
  return {
    status: Number.isFinite(value) ? STATUS.OK : STATUS.NOT_FINITE,
    quantities: [
      q(
        `${config.source.metric}_${config.statistic}`,
        value,
        config.source.unit ?? null
      ),
    ],
  };
}

/**
 * The kinds: the stream identity each draws from, what to record about its
 * kernels, and whether a trial needs the engine. `streams(ens)` and `kernels(ens)`
 * are what the record lists; `check(ens)` returns the config's problems.
 */
export const KINDS = Object.freeze({
  ensemble: {
    stream: 'experiments',
    needsEngine: ens => ens.config?.world === 'three-body',
    kernels: ens =>
      ens.config?.world === 'three-body'
        ? { 'engine-three-body': String(ENSEMBLE_VERSION) }
        : {},
    check(ens) {
      const out = [];
      if (!WORLDS.includes(ens.config?.world))
        out.push(['config.world', `one of ${WORLDS.join(', ')}`]);
      if (![undefined, 'validation-lab'].includes(ens.config?.physics))
        out.push(['config.physics', 'absent, or "validation-lab"']);
      return out;
    },
  },
  injection: {
    stream: 'injection',
    needsEngine: () => false,
    kernels: () => ({ 'occurrence-injection': 'prompt-229' }),
    check(ens) {
      const out = [];
      if (!CLIENTS.includes(ens.config?.client))
        out.push(['config.client', `one of ${CLIENTS.join(', ')}`]);
      const S = ens.config?.S;
      if (S !== undefined && !(Number.isFinite(S) && S >= 0 && S <= 30))
        out.push(['config.S', 'a number from 0 to 30']);
      return out;
    },
  },
  bootstrap: {
    stream: 'experiments',
    needsEngine: () => false,
    kernels: () => ({}),
    check(ens) {
      const out = [];
      const s = ens.config?.source;
      const good = Array.isArray(s?.values)
        ? s.values.filter(Number.isFinite)
        : [];
      if (!(typeof s?.metric === 'string' && s.metric))
        out.push(['config.source.metric', 'is required']);
      if (good.length < 2 || good.length !== s?.values?.length)
        out.push(['config.source.values', 'at least 2 numbers, all finite']);
      if (!BOOTSTRAP_STATISTICS.includes(ens.config?.statistic))
        out.push([
          'config.statistic',
          `one of ${BOOTSTRAP_STATISTICS.join(', ')}`,
        ]);
      return out;
    },
  },
  sweep: {
    stream: 'engine',
    needsEngine: () => true,
    kernels: () => ({ 'sweep-trial': String(ENSEMBLE_VERSION) }),
    check: () => [],
  },
});

export const KIND_IDS = Object.freeze(Object.keys(KINDS));
export const STREAM_ALGORITHM = Object.freeze({
  algorithm: ALGORITHM,
  version: STREAM_VERSION,
});

/** A trial of a non-engine kind, from its stream. Engine kinds go through ./trial.js. */
export async function plainTrial(ens, draw) {
  if (ens.kind === 'ensemble' && ens.config.world === 'analytic-draw')
    return analyticDraw(ens.config, draw);
  if (ens.kind === 'injection') return injectionTrial(ens.config, draw);
  if (ens.kind === 'bootstrap') return bootstrapTrial(ens.config, draw);
  throw new Error(`not a trial without an engine: ${ens.kind}`);
}
