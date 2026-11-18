// Orbit geometry check (c): the Kepler's 2nd Law scenario's Eccentric Orbiter,
// built through the page's builder under seed 1 and stepped as the page steps
// it, stays within 0.5 percent of a of the ellipse the overlay draws at the
// start, for one period. The bound was committed in
// tests/fixtures/orbit-geometry-tolerances.json before this file existed; the
// integrator is the unmodified engine's.
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import * as physics from '../js/physics.js';
import { build } from '../tools/tides-scenarios.mjs';
import { frameAdvance, substepPlan } from '../js/timestep.js';
import { twoBodySettings } from '../js/engine/forces.js';
import { orbitGeometry } from '../js/orbitGeometry.js';
import { engine } from '../js/random/streams.js';

const TOL = JSON.parse(
  readFileSync(
    new URL('./fixtures/orbit-geometry-tolerances.json', import.meta.url),
    'utf8'
  )
);
// Bound once: free globals are slow in Jest's vm context.
const { Math } = globalThis;
const RATES = { 120: 1 / 120, 60: 1 / 60, 30: 1 / 30, clamp: 0.2 };

/**
 * Shortest distance from q to the ellipse g. The nearest point is found on a
 * grid the first time and then followed: a body moves a small fraction of a
 * turn per step, so the search starts from the last answer.
 */
function ellipseDistance(g) {
  const { a, e, omega, sense } = g;
  const b = a * Math.sqrt(1 - e * e);
  const c = g.foci['focus-primary'];
  const co = Math.cos(omega);
  const si = Math.sin(omega);
  let last = null;
  return q => {
    // In the ellipse's own frame, centred on its centre.
    const dx = q.x - c.x;
    const dy = q.y - c.y;
    const lx = dx * co + dy * si + a * e;
    const ly = sense * (-dx * si + dy * co);
    const d2 = E => (a * Math.cos(E) - lx) ** 2 + (b * Math.sin(E) - ly) ** 2;
    let lo;
    let hi;
    if (last === null) {
      const N = 3600;
      let best = 0;
      for (let i = 1; i < N; i++)
        if (d2((2 * Math.PI * i) / N) < d2((2 * Math.PI * best) / N)) best = i;
      lo = (2 * Math.PI * (best - 1)) / N;
      hi = (2 * Math.PI * (best + 1)) / N;
    } else {
      lo = last - 0.25;
      hi = last + 0.25;
    }
    for (let k = 0; k < 80; k++) {
      const m1 = lo + (hi - lo) / 3;
      const m2 = hi - (hi - lo) / 3;
      if (d2(m1) < d2(m2)) hi = m2;
      else lo = m1;
    }
    last = (lo + hi) / 2;
    return Math.sqrt(d2(last));
  };
}

function runAt(rate) {
  const settings = build(TOL.c.scenario, TOL.c.seed);
  const body = physics.planets.find(p => p.name === TOL.c.body);
  physics.barycenterBodies();
  const g = orbitGeometry(
    body,
    physics.gravitySourcesFor(body),
    twoBodySettings()
  );
  expect(g.ok).toBe(true);
  const dtSim = frameAdvance(RATES[rate], settings.sim_speed, physics.DT);
  const plan = substepPlan(dtSim, settings.max_timestep);
  const distance = ellipseDistance(g);
  let worst = 0;
  let steps = 0;
  const t0 = physics.getSimulationTime();
  // Inside the engine's seeded stream, as the reference runner steps it.
  engine(TOL.c.seed, () => {
    while (physics.getSimulationTime() - t0 < g.period) {
      for (let i = 0; i < plan.substeps; i++) {
        physics.updatePhysics(plan.step);
        steps++;
        worst = Math.max(worst, distance(body.pos) / g.a);
      }
    }
  });
  return { g, worst, steps, step: plan.step };
}

describe('(c) the eccentric orbiter keeps to the ellipse drawn at the start', () => {
  test('60 frames a second, one period: within 0.5 percent of a', () => {
    const { g, worst, steps, step } = runAt(TOL.c.rate);
    expect(g.model.pairClass).toBe('one-way');
    expect(g.e).toBeCloseTo(0.65, 2);
    expect(g.a).toBeGreaterThan(140);
    expect(g.a).toBeLessThan(146);
    console.log(
      `orbit geometry (c) @60: a ${g.a.toFixed(3)}, e ${g.e.toFixed(5)}, ${steps} steps of ${step.toPrecision(6)}, worst ${(100 * worst).toFixed(4)}% of a (bound ${100 * TOL.c.bound}%)`
    );
    expect(worst).toBeLessThanOrEqual(TOL.c.bound);
  });

  test('the other rates, reported and not judged', () => {
    for (const rate of TOL.c.reportedOnly) {
      const { worst, steps } = runAt(rate);
      console.log(
        `orbit geometry (c) @${rate} (reported): ${steps} steps, worst ${(100 * worst).toFixed(4)}% of a`
      );
      expect(Number.isFinite(worst)).toBe(true);
    }
  });
});
