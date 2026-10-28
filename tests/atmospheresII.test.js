/**
 * @jest-environment jsdom
 */
// =============================================================================
// Atmospheres II: the eclipse and phase slice (Roadmap III, Prompt 202)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/atmospheres-ii/thresholds.json,
// committed before the kernel was promoted from the Prompt 201 spike. (a) to (d)
// run live through tools/atmospheres-ii-validate.mjs against the independent
// oracle's pinned results; (e), authentic data, is not measured and says so.
// The bounds carried from the gate are compared field by field with the gate's own
// file, so a production run cannot restate one. P1 (the two plots) and the
// kernel's bytes are measured here.
// =============================================================================

/* global document, window, process, URL */
import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as K from '../js/kernels/atmospheres/index.js';
import {
  runChecks,
  claimViolations,
  CLAIM_FILES,
} from '../tools/atmospheres-ii-validate.mjs';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/atmospheres-ii/thresholds.json');
const GATE = read('tests/fixtures/atmospheres-gate-ii/thresholds.json');
const byId = Object.fromEntries(THR.checks.map(c => [c.id, c]));
const gateById = Object.fromEntries(GATE.checks.map(c => [c.id, c]));
const MICRON = 1e-6;

describe('the committed thresholds', () => {
  test('every bound carried from the gate is a verbatim copy of the gate’s own', () => {
    const carried = THR.checks.filter(c =>
      /carried unchanged/.test(c.from ?? '')
    );
    expect(carried.map(c => c.id)).toEqual([
      'U1.constants',
      'E1.planck',
      'E2.eclipse',
      'E3.slab',
      'E4.lambert',
      'E5.albedo',
      'E6.btemp',
      'N1.misfit',
      'N2.reflected',
      'R1.refusals',
      'C1.claims',
    ]);
    for (const c of carried) {
      expect(c.limits).toEqual(gateById[c.id].limits);
      expect(c.bound).toBe(gateById[c.id].bound);
      expect(c.group).toBe(gateById[c.id].group);
    }
    expect(THR.claimRule).toEqual(GATE.claimRule);
    expect(THR.seeds.oracle).toBe(GATE.seeds.oracle);
    expect(THR.seeds.harness).toBe(GATE.seeds.harness);
  });

  test('the slice’s own bounds are stated, the byte bound keeps Carl’s kernel line, and the authentic-data row is not-measured', () => {
    expect(byId['T1.ep.deferred'].limits.kernelGzipMax).toBe(
      gateById['T1.ep.deferred'].limits.kernelGzipMax
    );
    expect(byId['T1.ep.deferred'].limits.deferredGzipMax).toBe(
      gateById['T1.ep.deferred'].limits.deferredGzipMax
    );
    expect(byId['A1.authentic'].limits.status).toBe('not-measured');
    expect(byId['P1.plot'].limits).toEqual({ vertexPxMax: 0.1, plots: 2 });
    expect(THR.amendments.map(a => a.id)).toEqual(['AM-S1']);
    expect(THR.scope.notBuilt).toMatch(/transmission/);
  });
});

describe('the validation contract, run against the production kernel', () => {
  let rows;
  beforeAll(() => {
    rows = runChecks();
  });

  test('every row the validator measures passes its committed bound, and the authentic-data row is not measured', () => {
    const failing = rows.filter(r => r.status === 'fail');
    expect(failing.map(r => r.id)).toEqual([]);
    expect(rows.filter(r => r.status === 'pass').map(r => r.id)).toEqual([
      'U1.constants',
      'E1.planck',
      'E2.eclipse',
      'E3.slab',
      'E4.lambert',
      'E5.albedo',
      'N1.misfit',
      'E6.btemp',
      'N2.reflected',
      'R1.refusals',
      'C1.claims',
      'S1.synthetic',
    ]);
    expect(rows.find(r => r.id === 'A1.authentic').status).toBe('not-measured');
  });

  test('the measured values state their margins (the kernel agrees with the independent oracle far inside the bound)', () => {
    const m = id => rows.find(r => r.id === id).measured;
    expect(m('E1.planck').relErrMax).toBeLessThan(1e-9);
    expect(m('E2.eclipse').relErrMax).toBeLessThan(1e-12);
    expect(m('E4.lambert').absErrMax).toBeLessThan(1e-8);
    expect(m('E5.albedo').coverage).toBeGreaterThan(0.93);
    expect(m('E6.btemp').coverage).toBeLessThan(0.97);
    expect(m('R1.refusals').hostileInputs).toBeGreaterThanOrEqual(40);
  });

  test('every id of the thresholds file is accounted for: measured here, measured by another test below, or not-measured', () => {
    const here = new Set(rows.map(r => r.id));
    const elsewhere = new Set(['P1.plot', 'T1.ep.deferred']);
    for (const c of THR.checks)
      expect(here.has(c.id) || elsewhere.has(c.id)).toBe(true);
  });
});

describe('the models, by hand', () => {
  test('an eclipse in the Rayleigh-Jeans limit follows the temperature ratio, and equal temperatures give the radius ratio squared', () => {
    const rj = K.eclipseDepth({
      radiusRatio: 0.1,
      tPlanet: 2000,
      tStar: 6000,
      band: [5e-4, 5.1e-4],
    });
    expect(rj.depth).toBeGreaterThan(0.01 * (2000 / 6000) * 0.97);
    expect(rj.depth).toBeLessThan(0.01 * (2000 / 6000) * 1.03);
    expect(
      K.eclipseDepth({
        radiusRatio: 0.1,
        tPlanet: 4000,
        tStar: 4000,
        band: [1e-6, 2e-6],
      }).depth
    ).toBeCloseTo(0.01, 14);
  });

  test('a band that absorbs reads cooler: its skin is at the one-layer temperature, 2^(-1/4) of the planet’s', () => {
    const base = {
      radiusRatio: 0.12,
      tPlanet: 2100,
      tStar: 6000,
      band: [3.2e-6, 4e-6],
    };
    const clear = K.eclipseDepth(base).depth;
    const thick = K.eclipseDepth({ ...base, bandTau: 50 }).depth;
    const skin = K.eclipseDepth({ ...base, tPlanet: 2100 / 2 ** 0.25 }).depth;
    expect(thick).toBeLessThan(clear);
    expect(thick).toBeCloseTo(skin, 12);
  });

  test('the Lambert curve is 1 at full phase and 0 at 180 degrees, and the Bond albedo is 3/2 of the geometric', () => {
    expect(K.lambertPhase(0)).toBe(1);
    expect(K.lambertPhase(Math.PI)).toBeCloseTo(0, 15);
    expect(K.bondFromGeometric(0.35)).toBeCloseTo(0.525, 15);
    expect(K.geometricFromBond(0.3)).toBeCloseTo(0.2, 15);
  });

  test('a reflected-light share that could matter refuses with a reason and no temperature', () => {
    const r = K.brightnessTemperature({
      radiusRatio: 0.12,
      tStar: 6000,
      band: [3.2e-6, 4e-6],
      semiMajorOverRp: 8,
      depth: 2.8e-3,
    });
    expect(r.refused).toBe(true);
    expect(r.temperature).toBeUndefined();
    expect(r.reason).toMatch(/reflected light/);
  });
});

describe('the synthetic data, each with its truth manifest', () => {
  test('the same seed gives identical bytes; another seed does not', () => {
    expect(JSON.stringify(K.syntheticEclipse())).toBe(
      JSON.stringify(K.syntheticEclipse())
    );
    expect(JSON.stringify(K.syntheticPhase({ seed: 1 }))).not.toBe(
      JSON.stringify(K.syntheticPhase({ seed: 2 }))
    );
    expect(K.SYNTHETIC_SEED).toBe(THR.seeds.synthetic);
  });

  test('each set says it is synthetic, carries its truth and the sentence "no published table was compared"', () => {
    for (const s of [
      K.syntheticEclipse(),
      K.syntheticEclipse({ absorbingBand: 'C' }),
      K.syntheticPhase(),
      K.syntheticPhase({ shape: 'lommel-seeliger' }),
    ]) {
      expect(s.synthetic).toBe(true);
      expect(s.truth).toBeTruthy();
      expect(s.note).toMatch(/no published table was compared/);
      expect(s.sigma).toBeGreaterThan(0);
    }
  });

  test('the published-table comparison is not available and the synthetic sets never pose as one', () => {
    const e = K.syntheticEclipse();
    expect(e.kind).toBe('eclipse-depths');
    expect(JSON.stringify(e)).not.toMatch(/Spitzer|JWST|Hubble|HD ?\d/);
  });

  test('the Lambert curve gives its albedo back, the Lommel-Seeliger curve is flagged, and an absorbing band reads cooler', () => {
    const lam = K.syntheticPhase();
    const f = K.fitAlbedo({
      alphas: lam.alphas,
      flux: lam.fluxPpm.map(x => x * 1e-6),
      sigma: lam.sigma * 1e-6,
      semiMajorOverRp: lam.truth.semiMajorOverRp,
    });
    expect(f.flagged).toBe(false);
    expect(Math.abs(f.albedo - lam.truth.albedo)).toBeLessThan(0.02);
    const ls = K.syntheticPhase({ shape: 'lommel-seeliger' });
    expect(
      K.fitAlbedo({
        alphas: ls.alphas,
        flux: ls.fluxPpm.map(x => x * 1e-6),
        sigma: ls.sigma * 1e-6,
        semiMajorOverRp: ls.truth.semiMajorOverRp,
      }).flagged
    ).toBe(true);
    const bt = e =>
      e.bands.map(
        (b, i) =>
          K.brightnessTemperature({
            radiusRatio: e.truth.radiusRatio,
            tStar: e.truth.tStar,
            band: [b.lo * MICRON, b.hi * MICRON],
            semiMajorOverRp: 1e6,
            depth: e.depthsPpm[i] * 1e-6,
          }).temperature
      );
    const clear = bt(K.syntheticEclipse());
    const dipped = bt(K.syntheticEclipse({ absorbingBand: 'C' }));
    expect(dipped[2]).toBeLessThan(clear[2] - 200);
    expect(dipped[0]).toBe(clear[0]);
  });
});

describe('the claim rule over the strings', () => {
  test('the scan covers this prompt’s files and finds no violation; the controls still discriminate', () => {
    const { violations, scanned } = claimViolations();
    expect(violations).toEqual([]);
    for (const f of [
      'js/atmosphereWidgets.js',
      'js/i18n/en.atmospheres.js',
      'js/i18n/es.atmospheres.js',
      'js/kernels/atmospheres/synthetic.js',
    ])
      expect(scanned).toContain(f);
    expect(CLAIM_FILES.length).toBeGreaterThan(14);
    const bad = claimViolations([
      'tests/fixtures/atmospheres-gate-ii/thresholds.json',
    ]);
    expect(bad.violations.length).toBeGreaterThan(0);
  });
});

describe('the kernel’s bytes (T1.ep.deferred, kernel alone)', () => {
  test('quadrature, emission and phase minified and gzipped the way build.js counts a chunk stay within the gate’s line as Carl reset it', () => {
    // esbuild refuses jsdom's TextEncoder, so the measurement runs in its own node.
    const script = `
      import { build } from 'esbuild';
      import { gzipSync } from 'node:zlib';
      const dir = process.argv[1];
      const entry = ['quadrature.js', 'emission.js', 'phase.js'].map(f => "export * from '" + dir + f + "';").join('\\n');
      const r = await build({ stdin: { contents: entry, resolveDir: dir }, bundle: true, minify: true, format: 'esm',
        target: ['es2022'], charset: 'utf8', legalComments: 'none', write: false, logLevel: 'silent',
        plugins: [{ name: 'ext', setup: b => b.onResolve({ filter: /\\/constants\\.js$/ }, a => ({ path: a.path, external: true })) }] });
      console.log(gzipSync(r.outputFiles[0].contents).length);
    `;
    const dir = new URL('../js/kernels/atmospheres/', import.meta.url).pathname;
    const out = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', script, dir],
      { cwd: process.cwd(), encoding: 'utf8' }
    );
    expect(Number(out.trim())).toBeLessThanOrEqual(
      byId['T1.ep.deferred'].limits.kernelGzipMax
    );
  });
});

describe('P1: the two plots, through the plot component', () => {
  let W;
  beforeAll(async () => {
    W = await import('../js/atmosphereWidgets.js');
  });

  const tn = x => parseFloat(x.textContent.replace(/[,\u202f\u00a0 ]/g, ''));

  for (const id of ['atmosphere-eclipse', 'atmosphere-phase']) {
    test(`${id}: every path vertex is where its data is (0.1 px), the legend toggles from the keyboard, the readout is in words, the axes carry units`, () => {
      const w = W.ATMOSPHERE_WIDGETS.find(x => x.id === id);
      for (const dataset of [0, 1]) {
        document.body.innerHTML = '';
        const canvas = document.createElement('canvas');
        const mount = document.createElement('div');
        mount.append(canvas);
        document.body.append(mount);
        const values = {
          ...Object.fromEntries(w.controls.map(c => [c.id, c.value])),
          dataset,
        };
        const spec = w.draw(canvas, values);
        const svg = mount.querySelector('svg[role=group]');
        const host = canvas.nextElementSibling;
        const texts = [...svg.querySelectorAll('text')];
        const ticks = texts.filter(
          x =>
            Number.isFinite(tn(x)) &&
            /^[-\d.,\u202f\u00a0 ]+$/.test(x.textContent)
        );
        const xt = ticks
          .filter(x => x.getAttribute('text-anchor') === 'middle')
          .map(x => [tn(x), +x.getAttribute('x')]);
        const yt = ticks
          .filter(x => x.getAttribute('text-anchor') === 'end')
          .map(x => [tn(x), +x.getAttribute('y')]);
        const slope = pts =>
          (pts[pts.length - 1][1] - pts[0][1]) /
          (pts[pts.length - 1][0] - pts[0][0]);
        const sx = slope(xt);
        const bx = xt[0][1] - sx * xt[0][0];
        const sy = slope(yt);
        const lines = spec.series.filter(q => (q.mode ?? 'line') !== 'points');
        const paths = [...svg.querySelectorAll('path')].filter(p =>
          p.getAttribute('d')
        );
        let worstX = 0;
        const offs = [];
        lines.forEach(q => {
          const all = paths.map(p => [
            ...p.getAttribute('d').matchAll(/[ML]([-\d.]+),([-\d.]+)/g),
          ]);
          const found = all.find(a => a.length === q.x.length);
          expect(found).toBeTruthy();
          const v = found.map(m => [+m[1], +m[2]]);
          v.forEach((p, i) => {
            worstX = Math.max(worstX, Math.abs(p[0] - (sx * q.x[i] + bx)));
            offs.push(p[1] - sy * q.y[i]);
          });
        });
        const med = offs.slice().sort((a, b) => a - b)[
          Math.floor(offs.length / 2)
        ];
        const worstY = Math.max(...offs.map(o => Math.abs(o - med)));
        expect(worstX).toBeLessThanOrEqual(
          THR.checks.find(c => c.id === 'P1.plot').limits.vertexPxMax
        );
        expect(worstY).toBeLessThanOrEqual(
          THR.checks.find(c => c.id === 'P1.plot').limits.vertexPxMax
        );
        // the keyboard readout speaks the values
        svg.focus();
        svg.dispatchEvent(
          new window.KeyboardEvent('keydown', {
            key: 'ArrowRight',
            bubbles: true,
          })
        );
        expect(
          host.querySelector('[role=status]').textContent.length
        ).toBeGreaterThan(5);
        // the legend toggles from the keyboard
        const button = host.querySelector('ul button');
        const was = button.getAttribute('aria-pressed');
        button.click();
        expect(button.getAttribute('aria-pressed')).not.toBe(was);
        // units in the axis titles
        expect(spec.xTitle).toMatch(/\(.+\)/);
        expect(spec.yTitle).toMatch(/\(.+\)/);
        for (const r of w.readout(values)) {
          expect(String(r.value)).not.toMatch(/NaN|undefined/);
          expect(String(r.label)).not.toMatch(/^atmW\./);
        }
      }
    });
  }

  test('neither the instruments nor the kernel draw: no canvas call and no hand-built axis outside js/plot/', () => {
    const files = [
      'js/atmosphereWidgets.js',
      ...['quadrature', 'emission', 'phase', 'synthetic', 'index'].map(
        f => `js/kernels/atmospheres/${f}.js`
      ),
    ];
    const src = files.map(f => readFileSync(f, 'utf8')).join('\n');
    expect(src).not.toMatch(
      /getContext|strokeText|fillText|moveTo|lineTo|createElementNS/
    );
  });

  test('the eclipse readout names its model, converts with the reflected-light assumption said and refuses when it is not', () => {
    const w = W.ATMOSPHERE_WIDGETS.find(x => x.id === 'atmosphere-eclipse');
    const on = w.readout({ dataset: 0, tPlanet: 2100, reflected: 1 });
    expect(on.some(r => /\d K \(95 percent/.test(r.value))).toBe(true);
    const off = w.readout({ dataset: 0, tPlanet: 2100, reflected: 0 });
    expect(off.filter(r => /not converted/.test(r.value))).toHaveLength(4);
    expect(on.some(r => /no published table was compared/.test(r.value))).toBe(
      true
    );
  });

  test('the phase readout gives the albedo and its Bond value for a Lambert curve and refuses both for the other', () => {
    const w = W.ATMOSPHERE_WIDGETS.find(x => x.id === 'atmosphere-phase');
    const a = w.readout({ dataset: 0, albedo: 0.2 });
    expect(a.some(r => /95 percent/.test(r.value))).toBe(true);
    expect(a.some(r => /3\/2 times/.test(r.value))).toBe(true);
    const b = w.readout({ dataset: 1, albedo: 0.2 });
    expect(b.some(r => /does not describe/.test(r.value))).toBe(true);
    expect(b.some(r => /No solution/.test(r.value))).toBe(true);
  });
});
