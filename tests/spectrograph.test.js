// =============================================================================
// The spectrograph model and wavelength calibration (Roadmap III, Prompt 213)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/spectrograph/thresholds.json, committed
// before the kernel existed. Groups (a) to (f) run live through
// tools/spectrograph-validate.mjs, in a child process (the ensembles are hundreds of
// arcs and a Jest VM runs them an order of magnitude slower), against the
// independent oracle's pinned results. The quick tests below hold the kernel's public
// contract: the states of a solution, the media rule, the refusals, determinism.
// =============================================================================

/* global process */
import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as K from '../js/kernels/spectrograph/index.js';
import { LINES } from '../js/data/radiation/lines.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/spectrograph/thresholds.json');
const FAILED = read('tests/fixtures/spectrograph/failed-legs.json');

describe('the committed thresholds', () => {
  test('every check of the contract is present and the amendments are recorded, none moving a bound', () => {
    expect(THR.checks.map(c => c.id)).toEqual([
      'A1.lsf',
      'A2.pixel.integral',
      'A3.sampling',
      'A4.line.flux',
      'A5.absorption',
      'A6.continuum',
      'A7.doppler.media',
      'A8.recovery.noise-free',
      'B1.convolution',
      'B2.line.fit',
      'B3.solution.pinned',
      'B4.pipeline',
      'C1.centre.coverage',
      'C2.solution.coverage',
      'C3.velocity.coverage',
      'C4.resolving.power.coverage',
      'C5.misspecified',
      'D1.not.constrained',
      'D2.blend',
      'D3.undersampled',
      'F1.line.snr',
      'F2.slit.throughput',
      'F3.trade',
      'E1.authentic.sdss',
      'E2.authentic.sampling',
      'P1.speed',
    ]);
    expect(THR.amendments.map(a => a.id)).toEqual([
      'AM1',
      'AM2',
      'AM3',
      'AM4',
      'AM5',
    ]);
    expect(THR.amendments.every(a => a.boundMoved === false)).toBe(true);
    expect(
      THR.checks.find(c => c.id === 'C1.centre.coverage').limits.oneSigma
    ).toEqual([0.6, 0.76]);
  });
  test('the oracle ran before the kernel and its hashes are recorded', () => {
    const p = read('tests/fixtures/spectrograph/oracle-provenance.json');
    expect(Object.values(p.files).every(h => /^[0-9a-f]{64}$/.test(h))).toBe(
      true
    );
  });
});

describe('the validation table', () => {
  let rows;
  beforeAll(() => {
    const out = execFileSync(
      process.execPath,
      ['tools/spectrograph-validate.mjs', '--json'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );
    rows = JSON.parse(out);
  }, 300000);
  test('every row passes except the ones recorded as failed legs', () => {
    const failing = rows.filter(r => r.status === 'fail').map(r => r.id);
    expect(failing).toEqual(FAILED.failed.map(f => f.id));
    expect(rows.length).toBe(THR.checks.length);
  });
  test('the ensemble rows report what they measured', () => {
    const c1 = rows.find(r => r.id === 'C1.centre.coverage');
    expect(c1.measured.n).toBe(400 * 14);
    expect(c1.measured.oneSigma).toBeGreaterThanOrEqual(0.6);
    expect(c1.measured.oneSigma).toBeLessThanOrEqual(0.76);
    const c5 = rows.find(r => r.id === 'C5.misspecified');
    expect(c5.measured.lineFlagged).toBeGreaterThanOrEqual(0.95);
    const e1 = rows.find(r => r.id === 'E1.authentic.sdss');
    expect(e1.measured.of).toBe(4);
  });
});

describe('the kernel’s public contract', () => {
  const spec = K.referenceSpectrograph();
  test('a resolving power is the wavelength over the FWHM and changes along a constant-width instrument', () => {
    expect(spec.resolvingPowerAt(450)).toBeCloseTo(1500, 9);
    expect(spec.resolvingPowerAt(600)).toBeCloseTo(2000, 9);
    expect(K.resolvingPower(500, 0.25)).toBe(2000);
  });
  test('sampling and resolving power are different quantities: finer pixels do not change R', () => {
    const fine = K.makeSpectrograph({
      coefficients: [380, 0.0525],
      nPixels: 4096,
      lsfFwhmNm: 0.3,
    });
    expect(fine.samplingAt(10)).toBeCloseTo(2 * spec.samplingAt(10), 3);
    expect(fine.resolvingPowerAt(450)).toBe(spec.resolvingPowerAt(450));
    // two lines 0.6 FWHM apart are one broadened line at either sampling
    const lamp = sep => ({
      continuum: { perPixel: 20, density: () => 0, slope: () => 0 },
      lines: [-sep, sep].map(s =>
        K.emissionLine({ centreNm: 450 + (s * 0.3) / 2, fluxE: 3e4 })
      ),
    });
    for (const sp of [spec, fine]) {
      const x0 = Math.round(sp.pixelOf(450));
      const ex = K.exposure(sp, lamp(0.6), { seed: 7 });
      const xs = Float64Array.from({ length: sp.nPixels }, (_, i) => i);
      const f = K.fitLine(xs, ex.counts, ex.sigma, {
        guess: x0,
        halfWidth: Math.ceil(4 * sp.fwhmPxAt(x0)),
        lsfFwhmPx: sp.fwhmPxAt(x0),
      });
      expect(f.broadened).toBe(true);
    }
  });
  test('a solution says which of three states it is in and what each means', () => {
    const t = K.truthSolution(K.REFERENCE.coefficients);
    const mk = xs =>
      xs.map(x => ({ x, sigmaX: 0.02, wavelengthNm: t.at(x), id: `l${x}` }));
    const L = mk([100, 500, 900, 1300, 1800]);
    expect(K.fitSolution(L.slice(0, 2), 3).status).toBe('not-constrained');
    const ex = K.fitSolution(L.slice(0, 4), 3);
    expect(ex.status).toBe('exactly-determined');
    expect(ex.message).toMatch(/no residual/);
    expect(ex.reducedChi2).toBeNull();
    const c = K.fitSolution(L, 3);
    expect(c.status).toBe('constrained');
    expect(c.dof).toBe(1);
    expect(c.wavelengthOf(3000, 0).extrapolated).toBe(true);
    expect(c.wavelengthOf(1000, 0.02).sigmaNm).toBeGreaterThan(c.sigmaAt(1000));
  });
  test('a velocity needs its media stated and equal; a mix-up is refused, not converted', () => {
    const ha = LINES.find(l => l.id === 'h-alpha');
    const ok = K.radialVelocity({
      observedNm: ha.air * 1.0004,
      sigmaNm: 0.005,
      restNm: ha.air,
      observedMedium: 'air',
      restMedium: 'air',
    });
    expect(ok.velocityKmS).toBeGreaterThan(119);
    expect(ok.velocityKmS).toBeLessThan(121);
    expect(ok.sigmaKmS).toBeCloseTo((299792.458 * 0.005) / ha.air, 1);
    expect(
      K.radialVelocity({
        observedNm: 656.5,
        restNm: ha.air,
        observedMedium: 'vacuum',
        restMedium: 'air',
      }).reason
    ).toBe('medium-mismatch');
    expect(K.mediaOffsetKmS(ha)).toBeCloseTo(82.82, 2);
  });
  test('the same seed gives the same exposure and a fork never moves its parent', () => {
    const lamp = K.arcLamp(spec, LINES, 'air');
    const a = K.exposure(spec, lamp, { seed: 'repeat' });
    const b = K.exposure(spec, lamp, { seed: 'repeat' });
    const c = K.exposure(spec, lamp, { seed: 'repeat', labels: ['x'] });
    expect(Array.from(a.counts.slice(0, 50))).toEqual(
      Array.from(b.counts.slice(0, 50))
    );
    expect(Array.from(c.counts.slice(0, 50))).not.toEqual(
      Array.from(a.counts.slice(0, 50))
    );
  });
  test('the lamp holds the pack’s lines that fall on the detector, and H-alpha does not', () => {
    const lamp = K.arcLamp(spec, LINES, 'air');
    expect(lamp.lines).toHaveLength(22);
    expect(lamp.lines.some(l => l.id === 'h-alpha')).toBe(false);
    const vac = K.arcLamp(spec, LINES, 'vacuum');
    const hb = vac.lines.find(l => l.id === 'h-beta');
    expect(hb.centreNm).toBeCloseTo(486.2708, 6);
  });
  test('a bad instrument is refused', () => {
    expect(() =>
      K.makeSpectrograph({
        coefficients: [500, -0.1],
        nPixels: 100,
        lsfFwhmNm: 0.3,
      })
    ).toThrow(RangeError);
    expect(() =>
      K.makeSpectrograph({
        coefficients: [500, 0.1],
        nPixels: 100,
        lsfFwhmNm: 0,
      })
    ).toThrow(RangeError);
  });
});
