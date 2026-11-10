// =============================================================================
// A pair of runs of the perturbed Lagrange triangle, on A8b's settings
// -----------------------------------------------------------------------------
// NUMERICS_INSTRUMENTS.md, instrument I3 (the data half). EXPERIMENT_ENSEMBLES.md
// validated one ensemble statement about the engine's three-body kind: leg A8b,
// the kind with the validation lab's settings (no orbit decay, a softening
// floor of 1e-6, the application's G = 2), 1000 steps pinned at 0.05 s. This
// builds that trial twice for a seed, the second with one star moved by a
// small `delta` of the triangle's radius, and returns how far apart the two
// runs are at each sample. Run A is A8b's trial: same scenario, same draws,
// same arithmetic as js/experiments/ensemble/kinds.js threeBodyTrial.
//
// The step is the kind's own (THREE_BODY.dt), never the frame rate. The realm
// (the engine's modules), buildScenario and applyLabSettings are handed in, as
// they are to threeBodyTrial; this module imports no engine. Imported by no
// shipped module.
// =============================================================================
import { THREE_BODY } from '../../experiments/ensemble/kinds.js';
import { stream } from '../../random/streams.js';
import { separationOf } from './divergenceRate.js';

const { Math } = globalThis;

function run(m, buildScenario, applyLab, seed, shift, every) {
  const c = THREE_BODY;
  buildScenario(m, { scenario: c.scenario, seed: 'ensemble' });
  const { physics } = m;
  applyLab(physics, {
    gravitational_constant: 2,
    mutual_gravity: true,
    star_only_gravity: false,
    enable_star_merging: false,
  });
  const stars = physics.stars;
  if (stars.length !== 3) throw new Error('the world has not three stars');
  const draw = stream('experiments', seed);
  const G = 2;
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
  stars[0].pos.x += shift;
  physics.bumpWorldGeneration?.();
  physics.resetSimulationTime?.();
  physics.resetConservationBaseline?.();
  physics.resetPotentialCache?.();
  const before = physics.conservedQuantities();
  // physics.js reassigns its body lists, so the list is read at every sample.
  const sample = () => physics.stars.flatMap(s => [s.pos.x, s.pos.y]);
  const positions = [sample()];
  for (let k = 1; k <= c.steps; k++) {
    physics.updatePhysics(c.dt);
    if (k % every === 0) positions.push(sample());
  }
  const after = physics.conservedQuantities();
  return {
    positions,
    count: physics.stars.length,
    energyDrift: Math.abs((after.energy - before.energy) / before.energy),
  };
}

/**
 * @param {object} m - The realm's modules (js/experiments/ensemble/trial.js loadRealm)
 * @param {Function} buildScenario - js/experiments/trialRunner.js
 * @param {Function} applyLab - js/validation/harness.js applyLabSettings
 * @param {number} seed - The trial's seed in the 'experiments' stream
 * @param {{delta?: number, every?: number}} [opts] - The second run's shift of
 *   star 0 in x, as a fraction of the triangle's radius; a sample every so many steps
 * @returns {{series: Array<{t: number, d: number}>, energyDrift: number,
 *   a: number[][], b: number[][], settings: object}}
 */
export function threeBodyPair(
  m,
  buildScenario,
  applyLab,
  seed,
  { delta = 1e-8, every = 10 } = {}
) {
  const c = THREE_BODY;
  const A = run(m, buildScenario, applyLab, seed, 0, every);
  const B = run(m, buildScenario, applyLab, seed, delta * c.radius, every);
  if (A.count !== 3 || B.count !== 3)
    throw new Error('a star merged or was removed; the pair has no separation');
  const series = A.positions.map((p, i) => ({
    t: i * every * c.dt,
    d: separationOf(p, B.positions[i]),
  }));
  return {
    series,
    energyDrift: A.energyDrift,
    a: A.positions,
    b: B.positions,
    settings: {
      scenario: c.scenario,
      physics: 'validation-lab',
      G: 2,
      steps: c.steps,
      dt: c.dt,
      perturbation: c.perturbation,
      delta,
      every,
    },
  };
}
