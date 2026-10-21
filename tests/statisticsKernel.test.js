// =============================================================================
// The statistics kernel's validation group, and the promises around it
// (Prompt 154)
// -----------------------------------------------------------------------------
// tools/statistics-cases.mjs holds the cases (analytic, oracle, ensemble,
// negative, authentic); `npm run validate:statistics` prints them. This runs
// them in the suite, holds STATISTICS.md to what they say (an export table with
// a row for every export, a validation table with a row for every measure), keeps
// the modules pure, shows the two adoptions are equivalent to what they would
// replace, and holds the install to its word: nothing in the kernel is
// installed until a shipped module imports it.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { CASES, runCase, TOL } from '../tools/statistics-cases.mjs';
import * as special from '../js/kernels/statistics/special.js';
import { crossing } from '../js/inference/fit.js';
import { fitOnce, profileTask } from '../js/inference/infer.js';
import { gaussian } from '../js/inference/synthetic.js';
import { profileInterval } from '../js/kernels/statistics/intervals.js';
import {
  selection,
  logisticCompleteness,
  malmquistShift,
} from '../js/kernels/statistics/selection.js';
import { makeUniverse, observe, malmquistFormula } from '../js/survey/model.js';
import { stream } from '../js/random/streams.js';
import { mulberry32 } from '../js/rng.js';
import {
  NEVER_PRECACHED,
  buildManifest,
} from '../tools/build-service-worker.mjs';

const doc = readFileSync('STATISTICS.md', 'utf8');
const block = name => {
  const a = doc.indexOf(`<!-- ${name}:begin -->`);
  const b = doc.indexOf(`<!-- ${name}:end -->`);
  expect(a).toBeGreaterThan(0);
  expect(b).toBeGreaterThan(a);
  return doc.slice(a, b);
};
const KERNEL = 'js/kernels/statistics';
const modules = readdirSync(KERNEL).filter(f => f.endsWith('.js'));
const exportsOf = file =>
  [
    ...readFileSync(`${KERNEL}/${file}`, 'utf8').matchAll(
      /^export (?:async )?(?:function|const|class) (\w+)/gm
    ),
  ].map(m => m[1]);
const walk = dir =>
  readdirSync(dir).flatMap(name => {
    const p = path.posix.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });

describe('the validation group', () => {
  const results = CASES.map(runCase);

  test('holds the five kinds of case the validation contract asks for', () => {
    const kinds = new Set(CASES.map(c => c.kind));
    expect([...kinds].sort()).toEqual(
      ['analytic', 'authentic', 'ensemble', 'negative', 'oracle'].sort()
    );
    expect(new Set(CASES.map(c => c.id)).size).toBe(CASES.length);
    // Every kind of case the contract asks of a kernel is in every area of the
    // statistics that has a stated method: intervals, diagnostics, comparison
    // and selection each have analytic and negative cases at least.
    for (const family of [
      'intervals',
      'diagnostics',
      'comparison',
      'selection',
    ])
      for (const kind of ['analytic', 'ensemble', 'negative', 'authentic'])
        expect(CASES.some(c => c.family === family && c.kind === kind)).toBe(
          true
        );
  });

  for (const c of results)
    test(`${c.id}: ${c.title}`, () => {
      for (const m of c.measures)
        expect([m.name, m.ok, m.value]).toEqual([m.name, true, m.value]);
    });
});

describe('the continued fractions', () => {
  test('converge far under the cap on a grid of shapes and arguments', () => {
    const scales = [0.5, 1, 2.5, 10, 100, 1e3, 1e4];
    for (const a of scales)
      for (const f of [0.01, 0.5, 0.9, 1, 1.1, 2, 10, 100]) {
        const x = a * f;
        const p = special.gammaP(a, x);
        const q = special.gammaQ(a, x);
        expect(Math.abs(p + q - 1)).toBeLessThan(1e-12);
        for (const b of scales)
          for (const u of [1e-3, 0.1, 0.5, 0.9, 0.999]) {
            const v = special.betaI(u, a, b);
            expect(Math.abs(v + special.betaI(1 - u, b, a) - 1)).toBeLessThan(
              1e-11
            );
          }
      }
    for (let z = 0; z <= 38; z += 0.5) special.normalSf(z);
    special.fQuantile(0.95, 1e3, 1e3);
    special.tQuantile(0.975, 1e5);
    special.chi2Quantile(0.99, 5e3);
    const used = special.iterationStats;
    expect(special.ITERATION_CAP).toBeGreaterThanOrEqual(
      50 * TOL.cfIterationBound
    );
    for (const [name, n] of Object.entries(used))
      expect([name, n < TOL.cfIterationBound]).toEqual([name, true]);
  });
});

describe('the modules', () => {
  test('are the kernel named in the roadmap', () => {
    expect(modules.sort()).toEqual([
      'check.js',
      'compare.js',
      'diagnostics.js',
      'index.js',
      'intervals.js',
      'resample.js',
      'selection.js',
      'special.js',
    ]);
  });

  test('import only the fitter, the seeding API, linalg and each other', () => {
    const allowed = new Set([
      '../../inference/fit.js',
      '../../random/streams.js',
      '../../numeric/linalg.js',
    ]);
    for (const f of modules) {
      const src = readFileSync(`${KERNEL}/${f}`, 'utf8');
      for (const m of src.matchAll(
        /^(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/gm
      ))
        expect([f, m[1].startsWith('./') || allowed.has(m[1])]).toEqual([
          f,
          true,
        ]);
      expect(src).not.toMatch(/\bimport\(/);
    }
  });

  test('draw no unseeded random number and read no clock', () => {
    for (const f of modules)
      expect(readFileSync(`${KERNEL}/${f}`, 'utf8')).not.toMatch(
        /Math\.random|Date\.now|performance\.now|new Date/
      );
  });
});

describe('STATISTICS.md', () => {
  test('the export table has a row for every export, and only those', () => {
    const listed = block('statistics-exports')
      .split('\n')
      .filter(l => l.startsWith('| `'))
      .flatMap(l => {
        const c = l.split('|').map(x => x.trim());
        return c[2]
          .split(',')
          .map(e => `${c[1].replace(/`/g, '')}:${e.replace(/`/g, '').trim()}`);
      });
    const actual = modules
      .filter(f => f !== 'index.js')
      .flatMap(f => exportsOf(f).map(e => `${f}:${e}`));
    expect(listed.sort()).toEqual(actual.sort());
  });

  test('the validation table has a row for every case and measure, all passing', () => {
    const text = block('statistics-validation');
    for (const c of CASES) expect(text).toContain(`**${c.id}** ${c.title}`);
    const rows = text
      .split('\n')
      .filter(l => /^\| .* \| (pass|\*\*FAIL\*\*) \|$/.test(l));
    expect(rows.length).toBe(CASES.reduce((n, c) => n + c.run().length, 0));
    expect(rows.filter(l => /FAIL/.test(l))).toEqual([]);
  });
});

describe('the adoptions, held to what they replace', () => {
  test("profileInterval is the inference core's crossing, bit for bit, on 300 seeded profiles", () => {
    const u = mulberry32(154);
    let compared = 0;
    for (let k = 0; k < 300; k++) {
      const n = 5 + Math.floor(u() * 20);
      const centre = u() * 4 - 2;
      const skew = 0.5 + u();
      const pts = Array.from({ length: n }, (_, i) => {
        const v = centre + (i - n / 2) * 0.3 * (0.5 + u() * 0.1);
        return {
          value: v,
          chi2:
            3 +
            (((v - centre) * (v > centre ? skew : 1)) / 0.4) ** 2 +
            0.01 * u(),
        };
      }).sort((a, b) => a.value - b.value);
      const minimum = Math.min(...pts.map(p => p.chi2));
      for (const delta of [1, 2.7055434540954, 4]) {
        const want = crossing(pts, minimum, delta);
        const got = profileInterval(pts, minimum, { deltaChi2: delta });
        expect(Object.is(got.lo, want[0])).toBe(true);
        expect(Object.is(got.hi, want[1])).toBe(true);
        compared++;
      }
    }
    expect(compared).toBe(900);
  });

  test("on a real profile the interval the core reports is the kernel's to 1e-12", () => {
    const xs = Array.from({ length: 20 }, (_, i) => i);
    const g = gaussian('statistics-adoption');
    const ys = xs.map(v => 5 + 0.25 * (v - 9.5) + 0.8 * g());
    const frame = {
      x: Float64Array.from(xs),
      y: Float64Array.from(ys),
      sigma: null,
      groups: null,
      rows: xs.map((_, i) => i),
      counts: {
        total: 20,
        used: 20,
        masked: 0,
        missing: 0,
        withoutUncertainty: 0,
      },
      columns: { x: 'x', y: 'y', sigma: null },
      units: { x: 's', y: 'm' },
      perDay: null,
    };
    const request = {
      model: { id: 'poly-1' },
      parameters: {
        c0: { mode: 'fitted', lo: -1e3, hi: 1e3 },
        c1: { mode: 'fitted', lo: -1e3, hi: 1e3 },
      },
      settings: { x0: 3 },
      algorithm: { profile: { points: 11 } },
    };
    const fit = fitOnce(request, frame);
    const pr = profileTask(request, frame, fit, 'c1');
    const iv = profileInterval(
      pr.points.map(p => ({ value: p.value, chi2: p.dchi2 })),
      0,
      { deltaChi2: 1 }
    );
    const sigma = fit.parameters.find(p => p.name === 'c1').sigma;
    expect(iv.method).toBe('profile');
    expect(iv.open).toEqual([false, false]);
    expect(Math.abs(iv.lo - pr.interval[0]) / sigma).toBeLessThan(1e-12);
    expect(Math.abs(iv.hi - pr.interval[1]) / sigma).toBeLessThan(1e-12);
  });

  test("the selection object is the survey suite's detection on eight universes, flag for flag", () => {
    let checked = 0;
    for (const seed of ['a', 'b', 'c', 'd'])
      for (const inst of [
        { limit: 13.5, completeness: { m50: 13.0, width: 0.35 } },
        { limit: 14.2, completeness: null },
      ]) {
        const u = makeUniverse({
          kind: 'gaussian',
          count: 500,
          seed: `st-${seed}`,
        });
        const obs = observe(u, inst);
        const sel = selection({
          name: 'survey',
          observable: 'm',
          cut: { max: inst.limit },
          probability: inst.completeness
            ? logisticCompleteness(inst.completeness)
            : null,
        });
        const key = `${u.seed}:obs`;
        const res = sel.apply(
          Array.from({ length: u.n }, (_, i) => ({ m: obs.mObs[i] })),
          i => stream('injection', key, 'detect', i)()
        );
        for (let i = 0; i < u.n; i++)
          if (res.flags[i] !== obs.detected[i])
            throw new Error(`${seed} star ${i}`);
        expect(obs.count).toBeGreaterThan(20);
        checked++;
      }
    expect(checked).toBe(8);
  });

  test("malmquistShift equals the suite's formula to rounding", () => {
    for (const s of [0.1, 0.5, 0.7, 1.3])
      expect(
        Math.abs(malmquistShift({ sigma: s }) / malmquistFormula(s) - 1)
      ).toBeLessThan(1e-15);
  });
});

describe('the install', () => {
  const kernelFiles = walk(KERNEL);
  // Modules a page can fetch: the rest of js/ that the install carries.
  const shipped = walk('js').filter(
    f =>
      !f.startsWith(`${KERNEL}/`) &&
      !NEVER_PRECACHED.some(re => re.test(f)) &&
      !f.startsWith('js/validation/')
  );
  const importers = shipped.filter(f =>
    /['"][./]*\/kernels\/statistics\//.test(readFileSync(f, 'utf8'))
  );

  test('no module the install carries imports the kernel: the first adopter deletes the NEVER_PRECACHED entry and this test', async () => {
    expect(NEVER_PRECACHED.some(re => re.test(`${KERNEL}/index.js`))).toBe(
      true
    );
    expect(importers).toEqual([]);
    const { paths } = await buildManifest();
    for (const f of kernelFiles) expect(paths).not.toContain(f);
  });

  test('the kernel is at its documented size', () => {
    expect(kernelFiles.length).toBe(8);
  });
});
