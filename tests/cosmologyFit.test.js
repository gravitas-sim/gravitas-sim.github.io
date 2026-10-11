// =============================================================================
// Hubble-diagram fits through the inference core (Roadmap II, Prompt 91)
// -----------------------------------------------------------------------------
// Every bar is the gate's (COSMOLOGY_GATE.md section 4, spike/cosmo/THRESHOLDS.md
// Part 3, fixed before the prototype): a low-redshift straight line against an
// independent weighted least squares to 1e-6; three starts reaching one
// chi-square to 1e-6; Omega_m within 0.08 of the published flat value; the H0
// profile flat when the offset is free; and the 68% interval covering the truth
// 60% to 76% of the time over 200 seeded draws. The 200-seed run is
// `npm run cosmology:validate`, which prints the table; this suite runs the same
// 200 draws on the synthetic diagram (the integration loop is bound out of
// Jest's global lookups, which took the run from 43 s to 4).
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { loadCosmologyData } from '../js/cosmologyData.js';
import {
  createCosmology,
  fitHubbleLaw,
  fitSupernovae,
  h0Degeneracy,
  syntheticHubbleDiagram,
  distanceFromModulus,
  C_KMS,
} from '../js/kernels/cosmology/index.js';
import { runForward } from '../js/forward/index.js';
import { validateObservation } from '../js/observatory/schema.js';

const fetchFile = async url => {
  const text = readFileSync(new URL(`..${url}`, import.meta.url), 'utf8');
  return { ok: true, json: async () => JSON.parse(text) };
};
let data;
beforeAll(async () => {
  data = await loadCosmologyData(fetchFile);
});
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

describe('the Hubble law (the first rung)', () => {
  test('exact data return the slope and a zero error is refused to be invented', () => {
    const x = Float64Array.from({ length: 30 }, (_, i) => 1 + i);
    const fit = fitHubbleLaw({
      x,
      y: x.map(d => 70 * d),
      sigma: x.map(() => 10),
    });
    expect(fit.H0).toBeCloseTo(70, 8);
    expect(fit.chi2).toBeLessThan(1e-12);
  });

  test('DES low-redshift supernovae: H0 against an independent weighted least squares, 1e-6', () => {
    const s = data.supernovae;
    const idx = [...s.z.keys()].filter(i => s.z[i] < 0.1);
    // cz = H0 d, with d from the modulus and sigma_cz = cz ln10/5 sigma_mu.
    const d = idx.map(i => distanceFromModulus(s.mu[i]));
    const v = idx.map(i => C_KMS * s.z[i]);
    const sg = idx.map((i, k) => (v[k] * Math.LN10 * s.err[i]) / 5);
    // The closed form: H0 = sum(w d v) / sum(w d^2), w = 1/sigma^2.
    let num = 0;
    let den = 0;
    idx.forEach((_, k) => {
      const w = 1 / sg[k] ** 2;
      num += w * d[k] * v[k];
      den += w * d[k] * d[k];
    });
    const fit = fitHubbleLaw({ x: d, y: v, sigma: sg });
    expect(idx.length).toBeGreaterThan(150);
    expect(rel(fit.H0, num / den)).toBeLessThan(1e-6);
    // The release's scale is H0 = 70: a low-z fit lands within a few km/s of it.
    expect(fit.H0).toBeGreaterThan(60);
    expect(fit.H0).toBeLessThan(75);
  });

  test("Hubble's own table gives a slope near 500, seven times the modern value", () => {
    const h = data.hubble;
    const sigma = Float64Array.from(h.r, () => 100);
    const origin = fitHubbleLaw({ x: h.r, y: h.v, sigma });
    const line = fitHubbleLaw({ x: h.r, y: h.v, sigma }, { intercept: true });
    // Through the origin: sum(r v)/sum(r^2), the gate's 424.
    let a = 0;
    let b = 0;
    h.r.forEach((r, i) => {
      a += r * h.v[i];
      b += r * r;
    });
    expect(rel(origin.H0, a / b)).toBeLessThan(1e-6);
    expect(origin.H0).toBeGreaterThan(400);
    expect(origin.H0).toBeLessThan(450);
    // With an intercept: 454 +- 75, within the paper's 465 +- 50.
    expect(Math.abs(line.H0 - 454.16)).toBeLessThan(0.05);
    expect(Math.abs(line.H0 - 465)).toBeLessThan(Math.hypot(75, 50));
    expect(origin.H0 / 70).toBeGreaterThan(5);
  });
});

describe('the supernova fit on the DES table', () => {
  let fit;
  beforeAll(() => {
    const s = data.supernovae;
    fit = fitSupernovae({ x: s.z, y: s.mu, sigma: s.err });
  });
  test("Omega_m is the gate's 0.361, within 0.08 of the published 0.352", () => {
    expect(fit.converged).toBe(true);
    expect(Math.abs(fit.Om - 0.3607)).toBeLessThan(2e-3);
    expect(Math.abs(fit.Om - 0.352)).toBeLessThan(0.08);
    expect(fit.dof).toBe(1827);
  });
  test('its profile interval is finite, inside [0, 1], and holds the best fit', () => {
    const [lo, hi] = fit.omInterval;
    expect(lo).not.toBeNull();
    expect(hi).not.toBeNull();
    expect(lo).toBeGreaterThan(0.3);
    expect(hi).toBeLessThan(0.45);
    expect(lo).toBeLessThan(fit.Om);
    expect(fit.Om).toBeLessThan(hi);
    expect(fit.omProfile.some(p => p.value === fit.Om)).toBe(true);
  });
  test('three starts reach the same chi-square, 1e-6', () => {
    const s = data.supernovae;
    // Same problem, different Omega_m start, through the same API.
    for (const grid of [9, 29]) {
      const other = fitSupernovae({ x: s.z, y: s.mu, sigma: s.err }, { grid });
      expect(rel(other.chi2, fit.chi2)).toBeLessThan(1e-6);
    }
  });
  test('the H0 profile is flat with the offset free: supernovae alone do not give the scale', () => {
    const s = data.supernovae;
    const deg = h0Degeneracy({ x: s.z, y: s.mu, sigma: s.err }, [50, 70, 90]);
    expect(deg.range).toBeLessThan(1e-6);
    const both = fitSupernovae(
      { x: s.z, y: s.mu, sigma: s.err },
      { freeH0: true }
    );
    expect(both.degenerate).toBe(true);
  });
  test('with the scale given (offset none) H0 is a parameter the data constrain', () => {
    const s = data.supernovae;
    const at = fitSupernovae(
      { x: s.z, y: s.mu, sigma: s.err },
      { offset: 'none', freeH0: true }
    );
    expect(at.degenerate).toBe(false);
    expect(Math.abs(at.H0 - 69.1)).toBeLessThan(0.3);
    expect(at.sigmaH0).toBeGreaterThan(0);
  });
});

describe('synthetic Hubble diagrams, through the forward model, over many seeds', () => {
  const setup = seed => ({
    format: 'gravitas.observing-setup',
    formatVersion: 1,
    seed,
    instrument: {
      kind: 'catalogue',
      survey: { count: 200, zMin: 0.02, zMax: 1.0, sigmaMag: 0.15 },
    },
  });
  const state = { cosmology: { H0: 70, Om: 0.3, OL: 0.7 }, offset: 0.1 };

  test('the observation is a valid synthetic table with the truth manifest, and refuses nonsense in words', () => {
    const o = runForward('hubble-diagram', state, setup('one'));
    expect(validateObservation(o)).toEqual([]);
    expect(o.origin).toBe('synthetic');
    const truth = id =>
      o.synthetic.truth.parameters.find(p => p.id === id).value;
    expect(truth('Om')).toBe(0.3);
    expect(truth('offset')).toBe(0.1);
    expect(o.columns.find(c => c.id === 'z').values).toHaveLength(200);
    expect(() => runForward('hubble-diagram', {}, setup('x'))).toThrow(
      /state.cosmology/
    );
    expect(() =>
      runForward('hubble-diagram', state, {
        ...setup('x'),
        instrument: { kind: 'catalogue', survey: { zMin: 0.5, zMax: 0.2 } },
      })
    ).toThrow(/redshift range/);
  });

  test('the same seed gives the same diagram, a different one a different diagram', () => {
    const a = runForward('hubble-diagram', state, setup('s1'));
    const b = runForward('hubble-diagram', state, setup('s1'));
    const c = runForward('hubble-diagram', state, setup('s2'));
    const mu = o => o.columns.find(k => k.id === 'mu').values;
    expect(Array.from(mu(a))).toEqual(Array.from(mu(b)));
    expect(Array.from(mu(a))).not.toEqual(Array.from(mu(c)));
  });

  test("noiseless: the modulus is the kernel's plus the offset, exactly", () => {
    const d = syntheticHubbleDiagram({
      n: 50,
      sigma: 0,
      offset: 0.25,
      seed: 'exact',
    });
    const cos = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
    d.z.forEach((z, i) =>
      expect(d.mu[i]).toBeCloseTo(cos.distanceModulus(z) + 0.25, 12)
    );
  });

  test('Omega_m is recovered: no bias beyond 3 standard errors of the mean, 68% interval covers 60 to 76% over 200 seeds', () => {
    const seeds = 200;
    let covered = 0;
    let finite = 0;
    const diffs = [];
    const widths = [];
    for (let k = 0; k < seeds; k++) {
      const o = runForward('hubble-diagram', state, setup(`rec-${k}`));
      const z = o.columns.find(c => c.id === 'z').values;
      const mu = o.columns.find(c => c.id === 'mu').values;
      const sg = o.columns.find(c => c.id === 'mu-sigma').values;
      const fit = fitSupernovae({ x: z, y: mu, sigma: sg }, { grid: 12 });
      diffs.push(fit.Om - 0.3);
      const [lo, hi] = fit.omInterval;
      if (lo !== null && hi !== null) {
        finite++;
        widths.push(hi - lo);
        if (lo <= 0.3 && 0.3 <= hi) covered++;
      }
    }
    const mean = diffs.reduce((s, v) => s + v, 0) / seeds;
    const sd = Math.sqrt(
      diffs.reduce((s, v) => s + (v - mean) ** 2, 0) / (seeds - 1)
    );
    expect(Math.abs(mean)).toBeLessThan(3 * (sd / Math.sqrt(seeds)));
    expect(finite).toBeGreaterThan(0.8 * seeds);
    expect(covered / seeds).toBeGreaterThanOrEqual(0.6);
    expect(covered / seeds).toBeLessThanOrEqual(0.76);
    // The interval's width is the scatter of the estimate, to a factor of two.
    const w = widths.reduce((s, v) => s + v, 0) / widths.length;
    expect(w / 2).toBeGreaterThan(0.5 * sd);
    expect(w / 2).toBeLessThan(2 * sd);
  }, 120000);
});
