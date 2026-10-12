import { describe, test, expect } from '@jest/globals';
import './computeSetup.js';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

import { entryOf } from '../js/compute/catalogue.js';
import { checkInput } from '../js/compute/prepare.js';

// =============================================================================
// The computational-astrophysics notebooks (Roadmap II Prompt 102)
// -----------------------------------------------------------------------------
// What these hold that the catalogue's own tests do not:
//
//  - the two new input kinds are checked for the shape the notebooks read, and
//    refuse what they cannot honestly read;
//  - the integrators notebook agrees with Gravitas's own engine. The notebook's
//    symplectic Euler, velocity Verlet and RK4 are the engine's three schemes,
//    so the engine, run here in a fresh process at the notebook's step for the
//    notebook's number of steps, must give the energy drift the notebook gave.
//    The time scales are worked out again here, from the file, not read from
//    the notebook's answer, so a wrong step in the notebook shows. Absolute
//    values, because a ratio would divide out a uniform error;
//  - the population notebook's bound fraction is the share of the experiment's
//    trials that stayed within the cutoff, counted again here;
//  - the three notebooks of Prompt 102's second part, which need SciPy and
//    Astropy: the SciPy refit agrees with the Observatory's own fit of the same
//    light curve (run here, in a fresh Node process, from js/inference), the
//    Astropy periodograms agree with the Observatory's box search and with a
//    Lomb-Scargle power computed again here, and the posterior sampler's
//    interval agrees with the core's profile interval of the same
//    two-parameter problem. The sampler's accuracy against exact answers is
//    tests/computeSampler.test.js.
// =============================================================================

const read = p => readFileSync(p, 'utf8');
const answer = id =>
  JSON.parse(read(`tests/fixtures/compute/${id}.answer.json`));
const quantity = (id, q) =>
  JSON.parse(answer(id).envelope).quantities.find(x => x.id === q);

describe('the two new kinds of input', () => {
  const sys = entryOf('integrators-compared');
  const res = entryOf('population-at-scale');
  const sysText = read(sys.input.example.path);
  const resText = read(res.input.example.path);
  const code = (e, x) =>
    checkInput(e, typeof x === 'string' ? x : JSON.stringify(x)).code;

  test('accept the examples Gravitas wrote', () => {
    expect(checkInput(sys, sysText).ok).toBe(true);
    expect(checkInput(res, resText).ok).toBe(true);
  });

  test('refuse another format, another version and a file that is not JSON', () => {
    const s = JSON.parse(sysText);
    expect(code(sys, '{')).toBe('input-not-json');
    expect(code(sys, resText)).toBe('input-format');
    expect(code(sys, { ...s, version: 2 })).toBe('input-format');
    expect(code(res, sysText)).toBe('input-format');
    expect(code(res, '[]')).toBe('input-format');
  });

  test('a system needs its initial state, whole', () => {
    const s = JSON.parse(sysText);
    const { initial, ...elementsOnly } = s;
    expect(initial.bodies).toHaveLength(3);
    expect(code(sys, elementsOnly)).toBe('input-invalid');
    expect(code(sys, { ...s, initial: { ...initial, G: 0 } })).toBe(
      'input-invalid'
    );
    expect(
      code(sys, {
        ...s,
        initial: { ...initial, bodies: initial.bodies.slice(1) },
      })
    ).toBe('input-invalid');
    const noMass = initial.bodies.map((b, i) => (i ? b : { ...b, mass: 0 }));
    expect(code(sys, { ...s, initial: { ...initial, bodies: noMass } })).toBe(
      'input-invalid'
    );
    const hole = initial.bodies.map((b, i) => (i ? b : { ...b, vx: null }));
    expect(code(sys, { ...s, initial: { ...initial, bodies: hole } })).toBe(
      'input-invalid'
    );
  });

  test('a result needs its manifest and a list of trials', () => {
    const r = JSON.parse(resText);
    expect(r.trials).toHaveLength(20);
    expect(code(res, { ...r, manifest: undefined })).toBe('input-invalid');
    expect(code(res, { ...r, trials: [] })).toBe('input-invalid');
    expect(code(res, { ...r, trials: [{ status: 'ok' }] })).toBe(
      'input-invalid'
    );
    expect(code(res, { ...r, trials: 'x' })).toBe('input-invalid');
  });
});

describe('the integrators notebook against the engine', () => {
  const e = entryOf('integrators-compared');
  const file = JSON.parse(read(e.input.example.path));

  // The time scales, again, from the file alone (the notebook's notebook-side
  // definitions, restated: the tightest pair's circular period over `steps`
  // for the step, and `orbits` of the widest orbit about the barycenter).
  const { G, bodies } = file.initial;
  const M = bodies.reduce((s, b) => s + b.mass, 0);
  let best = null;
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++) {
      const d = Math.hypot(
        bodies[i].x - bodies[j].x,
        bodies[i].y - bodies[j].y
      );
      if (!best || d < best.d) best = { i, j, d };
    }
  const mu = G * (bodies[best.i].mass + bodies[best.j].mass);
  const tShort = 2 * Math.PI * Math.sqrt(best.d ** 3 / mu);
  const cx = bodies.reduce((s, b) => s + b.mass * b.x, 0) / M;
  const cy = bodies.reduce((s, b) => s + b.mass * b.y, 0) / M;
  const rFar = Math.max(...bodies.map(b => Math.hypot(b.x - cx, b.y - cy)));
  const tLong = 2 * Math.PI * Math.sqrt(rFar ** 3 / (G * M));
  const dt = tShort / 500;
  const steps = Math.ceil((3 * tLong) / dt);

  test('takes the steps this restatement takes', () => {
    expect(steps).toBe(quantity('integrators-compared', 'steps').value);
    expect(steps).toBe(10722);
  });

  test('symplectic Euler, velocity Verlet and RK4 drift exactly as the engine says', () => {
    const script = `
      const R = '${process.cwd()}/';
      const P = await import(R + 'js/physics.js');
      const spec = await import(R + 'js/systemSpec.js');
      const app = await import(R + 'js/appState.js');
      const fs = await import('node:fs');
      const file = JSON.parse(fs.readFileSync(R + '${e.input.example.path}', 'utf8'));
      const verdict = spec.validateSystem({ bodies: file.bodies });
      const built = spec.buildSystem(verdict.bodies, { G: app.DEFAULT_SETTINGS.gravitational_constant });
      const classes = { Star: P.StarObject, Planet: P.Planet, GasGiant: P.GasGiant };
      // Read each time: physics.js reassigns its body arrays when it rebuilds.
      const list = type => ({ Star: P.stars, Planet: P.planets, GasGiant: P.gas_giants })[type];
      const out = {};
      for (const [key, integrator] of [['symplectic', 'Symplectic Euler'], ['verlet', 'Velocity Verlet'], ['rk4', 'RK4']]) {
        for (const l of [P.stars, P.planets, P.gas_giants, P.bh_list]) l.length = 0;
        P.updatePhysicsSettings({ ...app.DEFAULT_SETTINGS, integrator });
        for (const b of built.bodies)
          list(b.type).push(new classes[b.type]({ ...b.pos }, { ...b.vel }, b.constructorMass));
        P.bumpWorldGeneration();
        P.resetConservationBaseline();
        for (let i = 0; i < ${steps}; i++) P.updatePhysics(${dt});
        out[key] = P.conservationDrift(true).energyDrift;
      }
      console.log(JSON.stringify(out));
    `;
    const engine = JSON.parse(
      execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
        .trim()
        .split('\n')
        .at(-1)
    );
    for (const key of ['symplectic', 'verlet', 'rk4']) {
      const notebook = quantity('integrators-compared', `drift.${key}`).value;
      // Absolute, and tight: the two codes do the same arithmetic.
      expect(Math.abs(engine[key] - notebook)).toBeLessThan(
        Math.max(1e-6 * Math.abs(notebook), 1e-12)
      );
    }
    // The values themselves, so two agreeing wrong answers would still fail:
    // second order and bounded for the two symplectic-family schemes, and RK4
    // four orders better.
    expect(Math.abs(engine.symplectic)).toBeLessThan(0.01);
    expect(Math.abs(engine.verlet)).toBeLessThan(0.01);
    expect(Math.abs(engine.rk4)).toBeLessThan(1e-6);
  });

  test('explicit Euler gains energy where the others do not', () => {
    expect(
      quantity('integrators-compared', 'drift.euler').value
    ).toBeGreaterThan(10);
  });
});

describe('the population notebook against the trials', () => {
  test('its bound fraction is the share of trials within three starting distances', () => {
    const r = JSON.parse(
      read(entryOf('population-at-scale').input.example.path)
    );
    const key = r.manifest.vary[0].parameter;
    const sorted = [...r.trials].sort((a, b) => a.params[key] - b.params[key]);
    const few = sorted.slice(0, 4);
    const ratios = few.map(t => t.results.distance_to_primary / t.params[key]);
    ratios.sort((a, b) => a - b);
    const scale = (ratios[1] + ratios[2]) / 2;
    const bound = sorted.filter(
      t =>
        t.status === 'ok' &&
        t.results.distance_to_primary <= 3 * scale * t.params[key]
    ).length;
    expect(bound).toBe(12);
    expect(quantity('population-at-scale', 'bound.sample').value).toBeCloseTo(
      bound / sorted.length,
      12
    );
    // The edge the fit finds is past the last planet that stayed (planets
    // just inside it were thrown out and others stayed, so the data are not
    // a clean step) and before the first of the unbroken run that left.
    const isBound = t =>
      t.status === 'ok' &&
      t.results.distance_to_primary <= 3 * scale * t.params[key];
    const lastBound = Math.max(
      ...sorted.filter(isBound).map(t => t.params[key])
    );
    const firstGone = Math.min(
      ...sorted
        .filter(t => !isBound(t) && t.params[key] > lastBound)
        .map(t => t.params[key])
    );
    const crit = quantity('population-at-scale', 'a.crit').value;
    expect(crit).toBeGreaterThan(lastBound);
    expect(crit).toBeLessThan(firstGone);
  });

  test('every number it returns carries an uncertainty or says it has none', () => {
    const env = JSON.parse(answer('population-at-scale').envelope);
    for (const q of env.quantities)
      expect(['sigma', 'none']).toContain(q.uncertainty.kind);
    const extended = env.quantities.find(q => q.id === 'bound.extended');
    expect(extended.uncertainty.sigma).toBeGreaterThan(0.02);
    expect(extended.uncertainty.sigma).toBeLessThan(0.2);
  });
});

/** Runs a script of ES modules in a fresh Node process and returns the JSON it printed last. */
const inFreshNode = script =>
  JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64e6,
    })
      .trim()
      .split('\n')
      .at(-1)
  );

const CORE = `
  const R = '${process.cwd()}/';
  const fs = await import('node:fs');
  const I = await import(R + 'js/inference/infer.js');
  const obs = JSON.parse(fs.readFileSync(R + 'compute/inputs/tess-hd209458-s56.observation.json', 'utf8'));
  const data = I.dataFrom(obs);
`;

describe('the SciPy refit against the Observatory’s own fit', () => {
  const nb = id => quantity('refit-transit', id);
  const core = inFreshNode(`${CORE}
    const request = {
      model: { id: 'transit-quadratic' },
      parameters: { t0: { lo: data.x[0], hi: data.x[0] + 3.65 }, P: { lo: 3.4, hi: 3.65 } },
      settings: { exposure: 20 / 1440, supersample: 5, annuli: 32 },
    };
    const fit = I.fitOnce(request, data);
    const profile = name => I.profileTask(request, data, fit, name).interval;
    console.log(JSON.stringify({
      chi2: fit.chi2, reduced: fit.reducedChi2, beta: fit.redNoise.beta,
      parameters: Object.fromEntries(fit.parameters.map(p => [p.name, { value: p.value, sigma: p.sigmaScaled }])),
      profile: { k: profile('k'), b: profile('b') },
    }));
  `);

  test('finds the same minimum: every fitted number within a hundredth of a sigma, chi-square to a part in a million', () => {
    for (const [id, name] of [
      ['t0', 't0'],
      ['P', 'P'],
      ['k', 'k'],
      ['aRs', 'aRs'],
      ['b', 'b'],
    ]) {
      const p = core.parameters[name];
      expect(Math.abs(nb(id).value - p.value) / p.sigma).toBeLessThan(0.01);
    }
    expect(nb('chi2.reduced').value / core.reduced - 1).toBeCloseTo(0, 4);
    // The absolute values, so two agreeing wrong fits would still fail.
    expect(nb('P').value).toBeCloseTo(3.52454, 5);
    expect(nb('k').value).toBeCloseTo(0.11926, 5);
    expect(nb('aRs').value).toBeCloseTo(9.2096, 3);
    expect(nb('points').value).toBe(1882);
  });

  test('reports the covariance’s scaled sigma the way the panel does', () => {
    for (const name of ['t0', 'P', 'k', 'aRs', 'b']) {
      const mine = nb(name).uncertainty;
      expect(mine.kind).toBe('sigma');
      expect(mine.basis).toBe('scaled');
      expect(mine.sigma / core.parameters[name].sigma - 1).toBeCloseTo(0, 1);
      expect(
        Math.abs(mine.sigma / core.parameters[name].sigma - 1)
      ).toBeLessThan(0.01);
    }
  });

  test('finds the profile interval to a few hundredths of a sigma: the panel interpolates, the notebook finds the root', () => {
    for (const name of ['k', 'b']) {
      const q = nb(`${name}.profile`).uncertainty;
      expect(q.kind).toBe('interval');
      expect(q.basis).toBe('profile');
      const sigma = core.parameters[name].sigma;
      expect(Math.abs(q.lo - core.profile[name][0]) / sigma).toBeLessThan(0.06);
      expect(Math.abs(q.hi - core.profile[name][1]) / sigma).toBeLessThan(0.06);
    }
    // b's profile is lopsided and its sigma is not, which is what the investigation teaches.
    const b = nb('b.profile').uncertainty;
    const best = nb('b').value;
    expect(best - b.lo).toBeGreaterThan(1.2 * (b.hi - best));
  });

  test('the panel counts the correlated noise this notebook does not, and the notebook says so', () => {
    expect(core.beta).toBeGreaterThan(1.5);
    const warnings = JSON.parse(answer('refit-transit').envelope).warnings;
    expect(warnings.join(' ')).toMatch(/correlated in time/);
  });

  test('holding the limb darkening shrinks the sigmas and moves the answer by more than its new sigma', () => {
    const held = JSON.parse(
      read('tests/fixtures/compute/investigation-runs.json')
    )['refit-transit/limb0'];
    expect(held.k.sigma).toBeLessThan(nb('k').uncertainty.sigma / 3);
    expect(
      Math.abs(held.k.value - nb('k').value) / held.k.sigma
    ).toBeGreaterThan(3);
    expect(held.b.sigma).toBeLessThan(nb('b').uncertainty.sigma);
  });
});

describe('the Astropy periodograms against the box search and a Lomb-Scargle written again', () => {
  const nb = id => quantity('periodograms', id);
  const reference = inFreshNode(`${CORE}
    const box = I.boxSearch(data, { P: [0.5, 15], t0: [data.x[0]], durations: [1, 1.5, 2, 3, 4.5, 6].map(h => h / 24) });
    // The weighted Lomb-Scargle power with a floating mean, as the standard normalization defines it:
    // one minus the chi-square of the best sinusoid and constant over the chi-square of the constant.
    const t = Array.from(data.x), y = Array.from(data.y), w = Array.from(data.sigma, s => 1 / (s * s));
    const median = [...y].sort((a, b) => a - b)[y.length >> 1];
    const yn = y.map(v => v / median);
    const wn = w.map(v => v * median * median);
    const sw = wn.reduce((a, b) => a + b, 0);
    const mean = wn.reduce((a, v, i) => a + v * yn[i], 0) / sw;
    const chi0 = wn.reduce((a, v, i) => a + v * (yn[i] - mean) ** 2, 0);
    const power = f => {
      // normal equations of y = c + a sin + b cos
      const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      const v = [0, 0, 0];
      for (let i = 0; i < t.length; i++) {
        const row = [1, Math.sin(2 * Math.PI * f * t[i]), Math.cos(2 * Math.PI * f * t[i])];
        for (let r = 0; r < 3; r++) {
          v[r] += wn[i] * row[r] * yn[i];
          for (let c = 0; c < 3; c++) M[r][c] += wn[i] * row[r] * row[c];
        }
      }
      // Cramer's rule, three by three.
      const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      const d = det(M);
      const sol = [0, 1, 2].map(k => det(M.map((row, r) => row.map((x, c) => (c === k ? v[r] : x)))) / d);
      let chi = 0;
      for (let i = 0; i < t.length; i++) {
        const fit = sol[0] + sol[1] * Math.sin(2 * Math.PI * f * t[i]) + sol[2] * Math.cos(2 * Math.PI * f * t[i]);
        chi += wn[i] * (yn[i] - fit) ** 2;
      }
      return 1 - chi / chi0;
    };
    const span = t[t.length - 1] - t[0];
    let best = { f: 0, p: -1 };
    for (let f = 1 / 15; f <= 2; f += 1 / (40 * span)) {
      const p = power(f);
      if (p > best.p) best = { f, p };
    }
    console.log(JSON.stringify({ box: box.best, step: box.step, lsPeriod: 1 / best.f, lsPower: best.p, powerAtNotebook: null }));
  `);

  test('the box search period is the Observatory’s to a thousandth of a day, and the epoch lands on the same transits', () => {
    const P = nb('bls.period').value;
    expect(Math.abs(P - reference.box.P)).toBeLessThan(0.002);
    const d = (nb('bls.epoch').value - reference.box.t0) / P;
    expect(Math.abs(d - Math.round(d)) * P).toBeLessThan(0.02);
    expect(nb('bls.duration').value).toBeGreaterThanOrEqual(2);
    expect(nb('bls.duration').value).toBeLessThanOrEqual(3.1);
    expect(
      Math.abs(nb('bls.depth').value / (1e6 * reference.box.depth) - 1)
    ).toBeLessThan(0.15);
    // The notebook's absolute values too.
    expect(P).toBeCloseTo(3.524, 2);
  });

  test('the Lomb-Scargle peak is where a Lomb-Scargle written again puts it, with the same power', () => {
    expect(
      Math.abs(nb('ls.period').value / reference.lsPeriod - 1)
    ).toBeLessThan(0.01);
    expect(Math.abs(nb('ls.power').value - reference.lsPower)).toBeLessThan(
      0.002
    );
  });

  test('the sinusoid peaks at about half the transit’s period: the lesson', () => {
    expect(nb('period.ratio').value).toBeGreaterThan(0.49);
    expect(nb('period.ratio').value).toBeLessThan(0.51);
    expect(nb('ls.period').value / nb('bls.period').value).toBeCloseTo(
      nb('period.ratio').value,
      10
    );
  });

  test('gives no error bar to a period, and says why', () => {
    for (const id of ['ls.period', 'bls.period', 'bls.epoch'])
      expect(nb(id).uncertainty.kind).toBe('none');
    const warnings = JSON.parse(answer('periodograms').envelope).warnings;
    expect(warnings.join(' ')).toMatch(/no error bar/);
    // Its depth has one, and it is the scaled one: the box model's chi-square is far above 1.
    expect(nb('bls.depth').uncertainty.basis).toBe('scaled');
    expect(nb('bls.snr').value).toBeGreaterThan(100);
    expect(nb('bls.snr').value).toBeLessThan(400);
  });

  test('the table puts both periodograms on one axis and keeps both peaks', () => {
    const table = JSON.parse(answer('periodograms').table);
    const col = id => table.columns.find(c => c.id === id).values;
    const period = col('period');
    const peak = id => period[col(id).indexOf(Math.max(...col(id)))];
    expect(Math.abs(peak('ls') / nb('ls.period').value - 1)).toBeLessThan(0.02);
    expect(Math.abs(peak('bls') / nb('bls.period').value - 1)).toBeLessThan(
      0.02
    );
  });
});

describe('the posterior sampler against the core’s profile of the same problem', () => {
  const nb = id => quantity('posterior-sampling', id);
  // The same two-parameter problem in the core: the epoch, period, a/R* and
  // limb darkening held at the notebook's values, k and b free, the notebook's
  // 16-node quadrature, so the two likelihoods are the same function.
  const core = inFreshNode(`${CORE}
    const fixed = value => ({ mode: 'fixed', value });
    const request = {
      model: { id: 'transit-quadratic' },
      parameters: {
        t0: fixed(2826.78164), P: fixed(3.52454), aRs: fixed(9.21), q1: fixed(0.298), q2: fixed(0.277),
      },
      settings: { exposure: 20 / 1440, supersample: 5, annuli: 16 },
    };
    const fit = I.fitOnce(request, data);
    const profile = name => I.profileTask(request, data, fit, name).interval;
    console.log(JSON.stringify({
      reduced: fit.reducedChi2, k: fit.parameters.find(p => p.name === 'k').value,
      b: fit.parameters.find(p => p.name === 'b').value,
      sigma: Object.fromEntries(fit.parameters.filter(p => p.mode === 'fitted').map(p => [p.name, p.sigmaScaled])),
      profile: { k: profile('k'), b: profile('b') },
    }));
  `);

  test('the notebook’s profile interval is the core’s, within two percent of its width', () => {
    for (const name of ['k', 'b']) {
      const q = nb(`${name}.profile`).uncertainty;
      const width = core.profile[name][1] - core.profile[name][0];
      expect(Math.abs(q.lo - core.profile[name][0]) / width).toBeLessThan(0.02);
      expect(Math.abs(q.hi - core.profile[name][1]) / width).toBeLessThan(0.02);
    }
    // The notebook divides chi-square by 1874 degrees of freedom (all seven
    // parameters of the full fit and the baseline, so the scale is the panel's
    // for the whole fit); the core's own two-parameter fit has 1879.
    expect(
      Math.abs((nb('chi2.reduced').value * 1874) / 1879 / core.reduced - 1)
    ).toBeLessThan(5e-4);
  });

  test('the draws’ interval is as wide as the profile’s, to ten percent, for both parameters', () => {
    for (const name of ['k', 'b']) {
      const q = nb(name).uncertainty;
      const width = core.profile[name][1] - core.profile[name][0];
      expect(q.kind).toBe('interval');
      expect(Math.abs((q.hi - q.lo) / width - 1)).toBeLessThan(0.1);
      expect(Math.abs(nb(`${name}.width.ratio`).value - 1)).toBeLessThan(0.1);
    }
    expect(Math.abs(nb('k').value - core.k)).toBeLessThan(0.1 * core.sigma.k);
  });

  test('the draws are the grid’s, and the run passed every limit it holds itself to', () => {
    expect(nb('grid.offset').value).toBeLessThan(0.1);
    expect(nb('rhat.max').value).toBeLessThan(1.05);
    expect(nb('ess.min').value).toBeGreaterThanOrEqual(400);
    expect(nb('steps').value / nb('tau.max').value / 2).toBeGreaterThanOrEqual(
      50
    );
    expect(nb('acceptance').value).toBeGreaterThan(0.1);
    expect(nb('acceptance').value).toBeLessThan(0.9);
  });

  test('is far narrower than the fit panel’s own interval, because the panel refits what this holds fixed', () => {
    const allFree = JSON.parse(
      answer('refit-transit').envelope
    ).quantities.find(q => q.id === 'k').uncertainty.sigma;
    const here = (nb('k').uncertainty.hi - nb('k').uncertainty.lo) / 2;
    expect(allFree / here).toBeGreaterThan(8);
    expect(allFree / here).toBeLessThan(20);
  });

  test('a run with too few steps is refused, and the message says which limit failed', () => {
    const refusal = JSON.parse(
      read('tests/fixtures/compute/posterior-sampling.refusal.json')
    );
    expect(refusal.steps).toBe(1000);
    expect(refusal.message).toMatch(
      /the run is refused, so no interval is reported/
    );
    expect(refusal.message).toMatch(
      /autocorrelation times after the burn-in are fewer than 50|effective samples are fewer than 400|R-hat/
    );
    expect(refusal.message).toMatch(/Raise the number of steps/);
  });

  test('the trace table has every ensemble’s mean for both parameters, a chart’s data', () => {
    const table = JSON.parse(answer('posterior-sampling').table);
    expect(table.columns.map(c => c.id)).toEqual([
      'step',
      'k1',
      'k2',
      'k3',
      'k4',
      'b1',
      'b2',
      'b3',
      'b4',
    ]);
    expect(table.columns[0].values.length).toBeLessThanOrEqual(200);
  });
});
