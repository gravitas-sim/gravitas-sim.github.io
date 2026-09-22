// =============================================================================
// Two claims, and the checks that keep them true
// -----------------------------------------------------------------------------
// The model page now says two things a reader could act on. The first is that
// symplectic Euler does not come back and velocity Verlet does. The second is
// that the table of operations which destroy information is generated from
// js/physics.js rather than remembered, so it cannot fall behind the engine.
//
// Both are checked here. The integrator claim is checked by actually running
// the engine forwards and backwards, because a claim about numerical behaviour
// that is verified by reading the source is not verified.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { substepPlan, MAX_SUBSTEPS } from '../js/timestep.js';
import { IRREVERSIBLE, IRREVERSIBLE_SOURCE } from '../js/data/irreversible.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = f => readFileSync(path.join(root, f), 'utf8');

describe('a step plan has a direction', () => {
  test('a backward step is capped the same way a forward one is', () => {
    // This tested `dtSim > cap` directly, so a negative advance was never
    // greater than a positive cap and came back as one uncapped leap. The
    // scenarios that set a cap set it precisely to stop symplectic Euler
    // wrecking a packed system, and backwards they were getting none of it.
    const forward = substepPlan(0.5, 0.1);
    const backward = substepPlan(-0.5, 0.1);
    expect(backward.substeps).toBe(forward.substeps);
    expect(backward.step).toBeCloseTo(-forward.step, 12);
    expect(backward.substeps * backward.step).toBeCloseTo(-0.5, 12);
  });

  test('an uncapped plan passes the step through unchanged, either way', () => {
    for (const dt of [0.2, -0.2]) {
      const plan = substepPlan(dt, 0);
      expect(plan).toEqual({ substeps: 1, step: dt, capped: false });
    }
  });

  test('the substep ceiling applies in both directions', () => {
    const plan = substepPlan(-1000, 0.001);
    expect(plan.substeps).toBe(MAX_SUBSTEPS);
    expect(plan.capped).toBe(true);
    expect(plan.step).toBeLessThan(0);
  });
});

describe('the engine can be asked to step backwards, and refuses nonsense', () => {
  test('zero and non-finite do nothing', async () => {
    const { installDomShim } = await import('../tools/dom-shim.mjs');
    installDomShim();
    const P = await import('../js/physics.js');
    P.stars.length = 0;
    const s = new P.StarObject({ x: 10, y: 0 }, { x: 0, y: 1 }, 0.001);
    s.mass = 1;
    s.radius = 0.5;
    s.intact = true;
    s.persistent = true;
    P.stars.push(s);
    P.updatePhysicsSettings({
      gravitational_constant: 1,
      mutual_gravity: true,
      enable_star_merging: false,
      integrator: 'Velocity Verlet',
      max_timestep: 0,
    });
    P.setStateReference({ frame_count: 0, zoom: 1, pan: { x: 0, y: 0 } });
    P.bumpWorldGeneration();
    const before = { x: s.pos.x, y: s.pos.y };
    // NaN used to pass this guard, because NaN <= 0 is false, and was then
    // added to every position in the scene.
    P.updatePhysics(0);
    P.updatePhysics(NaN);
    P.updatePhysics(Infinity);
    expect(s.pos.x).toBe(before.x);
    expect(s.pos.y).toBe(before.y);
  });
});

describe('symplectic is not the same property as reversible', () => {
  // One run of the probe, reused by the assertions below: it takes a few
  // seconds and there is no reason to pay for it three times.
  const probe = JSON.parse(
    execFileSync(
      process.execPath,
      [path.join(root, 'tools', 'reversibility-probe.mjs'), '--json'],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
    )
  ).results;

  const pick = (system, integrator, dt, steps) =>
    probe.find(
      r =>
        r.system === system &&
        r.integrator === integrator &&
        r.dt === dt &&
        r.steps === steps
    );

  test('velocity Verlet returns to the floating-point floor', () => {
    for (const system of ['two-body', 'three-body-chaotic']) {
      const r = pick(system, 'Velocity Verlet', 0.1, 50);
      expect(r.moved).toBe(true);
      expect(r.dx).toBeLessThan(1e-10);
    }
  });

  test('symplectic Euler does not, by a margin nobody could miss', () => {
    const r = pick('two-body', 'Symplectic Euler', 0.1, 50);
    expect(r.moved).toBe(true);
    // Five hundredths of a length unit on a 100-unit orbit, against Verlet's
    // 1e-15 on the same run. Thirteen orders of magnitude apart.
    expect(r.dx).toBeGreaterThan(1e-3);
    expect(
      r.dx / pick('two-body', 'Velocity Verlet', 0.1, 50).dx
    ).toBeGreaterThan(1e9);
  });

  test("symplectic Euler's return error falls as the square of the step", () => {
    // The prediction, and the reason: the per-step error is dt*(a(x') - a(x))
    // and a(x') - a(x) is itself O(dt). Halving the step should divide the
    // miss by about four.
    const at = dt => pick('two-body', 'Symplectic Euler', dt, 50).dx;
    for (const [big, small] of [
      [0.2, 0.1],
      [0.1, 0.05],
      [0.05, 0.025],
    ]) {
      expect(at(big) / at(small)).toBeGreaterThan(3.2);
      expect(at(big) / at(small)).toBeLessThan(5);
    }
  });

  test('RK4 returns well and not exactly, which is a third thing again', () => {
    const r = pick('two-body', 'RK4', 0.1, 50);
    // Far better than Euler, because it is fourth order; not exact, because it
    // is not symmetric.
    expect(r.dx).toBeLessThan(pick('two-body', 'Symplectic Euler', 0.1, 50).dx);
    expect(r.dx).toBeGreaterThan(0);
  });
});

describe('the audit is generated, not remembered', () => {
  test('it is current with the source it scans', () => {
    // Fails if js/physics.js grew or lost an irreversible operation and the
    // generated module was not rebuilt.
    execFileSync(
      process.execPath,
      [path.join(root, 'tools', 'build-irreversibility-audit.mjs'), '--check'],
      { stdio: 'pipe' }
    );
  });

  test('every operation names a real line of the file it came from', () => {
    const source = read(IRREVERSIBLE_SOURCE).split('\n');
    expect(IRREVERSIBLE.length).toBeGreaterThan(10);
    for (const op of IRREVERSIBLE) {
      expect(op.line).toBeGreaterThan(0);
      expect(op.line).toBeLessThanOrEqual(source.length);
      expect(String(op.detail.what || '').length).toBeGreaterThan(20);
    }
  });

  test('the cull family is there with its own buffer each', () => {
    const culls = IRREVERSIBLE.filter(o => o.kind === 'cull');
    expect(culls.length).toBeGreaterThanOrEqual(10);
    const buffers = Object.fromEntries(
      culls.map(c => [c.detail.list, c.detail.buffer])
    );
    // The three the model page calls out, plus the one that keeps holes.
    expect(buffers.asteroids).toBe(5);
    expect(buffers.debris).toBe(3);
    expect(buffers.planets).toBe(20);
    expect(buffers.bh_list).toBe(50);
  });

  test('merging, collapse, damping and fragmentation are all named', () => {
    const kinds = new Set(IRREVERSIBLE.map(o => o.kind));
    for (const kind of ['merge', 'collapse', 'damping', 'fragment', 'cull']) {
      expect([...kinds]).toContain(kind);
    }
  });

  test('the fragmentation entry records how much randomness it draws', () => {
    const frag = IRREVERSIBLE.find(o => o.kind === 'fragment');
    // The one operation that could not be undone even with perfect arithmetic
    // and a complete record, because the state after it is one of an unbounded
    // family the state before could have produced.
    expect(frag.detail.draws).toBeGreaterThan(0);
    expect(frag.detail.what).toMatch(/Math\.random/);
  });
});

describe('the model page says it', () => {
  const html = read('model/index.html');

  test('it has a row for every audited operation', () => {
    for (const op of IRREVERSIBLE) {
      expect(html).toContain(`${IRREVERSIBLE_SOURCE}:${op.line}`);
    }
  });

  test('it distinguishes the two reasons rather than blaming the scheme', () => {
    expect(html).toMatch(/Symplectic and reversible are different properties/);
    expect(html).toMatch(/nothing to do with the integrator/i);
  });

  test('it does not offer running the simulation backwards', () => {
    // The audit is an honesty instrument. If a control for this ever appears,
    // this is the test that should be argued with first.
    expect(html).not.toMatch(/\b(rewind|time travel|scrub backwards)\b/i);
  });
});
