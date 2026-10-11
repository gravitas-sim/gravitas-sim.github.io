// =============================================================================
// The lensing kernel (Roadmap II, Prompt 94), held to textbook and published
// values, closed forms and independent integrations
// -----------------------------------------------------------------------------
// Every tolerance is stated beside its check and comes from the method or the
// published precision, not from the result. Pinned values:
//   - the Sun's limb deflects light by 4GM/(c^2 R) = 1.75 arcsec (Einstein
//     1915; Eddington's 1919 eclipse measured 1.98 +- 0.12 and 1.61 +- 0.30,
//     the SAO/Dyson-Eddington-Davidson values; the app's constants give 1.7517);
//   - theta_E^2 = kappa M pi_rel with kappa = 4G/(c^2 AU) = 8.14 mas per solar
//     mass (Gould 2000), so 1 Msun at 4 kpc before a source at 8 kpc is 1.009 mas;
//   - an SIS of 200 km/s lensing a source behind it at Dls/Ds = 1 has
//     theta_E = 4 pi (sigma/c)^2 = 1.153 arcsec;
//   - a point lens at u = 1 magnifies 3/sqrt(5) = 1.342 (Paczynski 1986), and
//     the image magnifications are signed so that mu+ + mu- = 1.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  ARCSEC,
  MAS,
  deflectionAngle,
  einsteinAngle,
  einsteinRadiusM,
  massFromEinstein,
  pointImages,
  pointMagnification,
  pointTimeDelay,
  schwarzschildRadius,
  sisDispersion,
  sisEinsteinAngle,
  sisImages,
  weakFieldRatio,
  finiteSourceMagnification,
  massForTimescale,
  microlensingFlux,
  peakFlux,
  timescale,
  fitMicrolensing,
  syntheticEvent,
} from '../js/kernels/lensing/index.js';
import { runForward } from '../js/forward/index.js';
import {
  C_SI,
  G_SI,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
  AU_METERS,
  PARSEC_M,
} from '../js/constants.js';

const KPC = 1000 * PARSEC_M;
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

describe('deflection of light', () => {
  test("the Sun's limb: 1.75 arcsec, within 0.01 (the constants' precision)", () => {
    const a = deflectionAngle(SOLAR_MASS_KG, SOLAR_RADIUS_M) / ARCSEC;
    expect(Math.abs(a - 1.75)).toBeLessThan(0.01);
  });
  test('inverse in the impact parameter, linear in the mass', () => {
    const a = deflectionAngle(SOLAR_MASS_KG, SOLAR_RADIUS_M);
    expect(deflectionAngle(SOLAR_MASS_KG, 4 * SOLAR_RADIUS_M)).toBeCloseTo(
      a / 4,
      18
    );
    expect(deflectionAngle(10 * SOLAR_MASS_KG, SOLAR_RADIUS_M) / a).toBeCloseTo(
      10,
      12
    );
  });
  test('the weak field at the Sun is 2.4e5 Schwarzschild radii; the Schwarzschild radius is 2.95 km', () => {
    expect(schwarzschildRadius(SOLAR_MASS_KG)).toBeGreaterThan(2940);
    expect(schwarzschildRadius(SOLAR_MASS_KG)).toBeLessThan(2960);
    expect(
      rel(weakFieldRatio(SOLAR_MASS_KG, SOLAR_RADIUS_M), 2.36e5)
    ).toBeLessThan(0.01);
  });
});

describe('Einstein radii', () => {
  test('theta_E^2 = kappa M pi_rel, kappa 8.14 mas per solar mass (Gould 2000), to 0.5 percent', () => {
    const th = einsteinAngle(SOLAR_MASS_KG, 4 * KPC, 8 * KPC) / MAS;
    const piRel = 1 / 4 - 1 / 8; // mas, in AU per kpc
    expect(rel(th * th, 8.14 * 1 * piRel)).toBeLessThan(0.005);
    expect(rel(th, 1.009)).toBeLessThan(0.005);
  });
  test('the Einstein radius at the lens: 0.9 mas at 4 kpc is 4 AU', () => {
    const rE = einsteinRadiusM(SOLAR_MASS_KG, 4 * KPC, 8 * KPC) / AU_METERS;
    expect(rel(rE, 1.009 * 4)).toBeLessThan(0.005);
  });
  test('the mass inverse round-trips; the galaxy-scale value is arcseconds', () => {
    const m = 3.3 * SOLAR_MASS_KG;
    const th = einsteinAngle(m, 2 * KPC, 7 * KPC);
    expect(rel(massFromEinstein(th, 2 * KPC, 7 * KPC), m)).toBeLessThan(1e-12);
    // 1e11 Msun at 1 Gpc before a source at 2 Gpc (flat, Dls = Ds - Dl):
    // theta_E = sqrt(4GM/c^2 * Dls/(Dl Ds)) = 0.64 arcsec by hand.
    const GPC = 1e9 * PARSEC_M;
    const big = einsteinAngle(1e11 * SOLAR_MASS_KG, GPC, 2 * GPC) / ARCSEC;
    expect(Math.abs(big - 0.638)).toBeLessThan(0.005);
  });
  test('an SIS of 200 km/s with Dls/Ds = 1: 1.153 arcsec (4 pi (sigma/c)^2), to 0.2 percent', () => {
    expect(rel(sisEinsteinAngle(200e3, 1, 1) / ARCSEC, 1.153)).toBeLessThan(
      0.002
    );
  });
  test('the SIS inverse round-trips', () => {
    expect(
      rel(sisDispersion(sisEinsteinAngle(250e3, 2, 1.3), 2, 1.3), 250e3)
    ).toBeLessThan(1e-12);
  });
});

describe('the point-mass lens', () => {
  const ys = [0.01, 0.3, 1, 2.5];
  test.each(ys)(
    'y = %p: both images solve the lens equation y = x - 1/x to rounding',
    y => {
      const { x } = pointImages(y);
      for (const xi of x)
        expect(Math.abs(xi - 1 / xi - y)).toBeLessThan(
          1e-12 * (1 + Math.abs(xi))
        );
    }
  );
  test.each(ys)(
    'y = %p: mu+ + mu- = 1 and |mu+| + |mu-| is the total (u^2+2)/(u sqrt(u^2+4))',
    y => {
      const im = pointImages(y);
      expect(Math.abs(im.mu[0] + im.mu[1] - 1)).toBeLessThan(1e-12);
      expect(rel(im.total, pointMagnification(y))).toBeLessThan(1e-12);
    }
  );
  test('magnification: 3/sqrt(5) at u = 1; 10.04 at u = 0.1; unity far away', () => {
    expect(Math.abs(pointMagnification(1) - 3 / Math.sqrt(5))).toBeLessThan(
      1e-14
    );
    expect(Math.abs(pointMagnification(0.1) - 10.0375)).toBeLessThan(1e-3);
    expect(Math.abs(pointMagnification(100) - 1)).toBeLessThan(1e-3);
  });
  test('the magnification is the inverse Jacobian of the lens map at each image', () => {
    // mu = 1 / (1 - 1/x^4) for the map y = x - 1/x, checked by finite differences.
    const y = 0.4;
    for (const x of pointImages(y).x) {
      const h = 1e-6;
      const dydx = (x + h - 1 / (x + h) - (x - h - 1 / (x - h))) / (2 * h);
      const mu = x / y / dydx; // image area over source area: (x/y)(dx/dy)
      expect(
        rel(
          Math.abs(mu),
          Math.abs(pointImages(y).mu[pointImages(y).x.indexOf(x)])
        )
      ).toBeLessThan(1e-6);
    }
  });
  test('the time delay is the difference of the Fermat potentials at the two images', () => {
    const y = 0.7;
    const { x } = pointImages(y);
    const phi = xi => 0.5 * (xi - y) ** 2 - Math.log(Math.abs(xi));
    const m = 5 * SOLAR_MASS_KG;
    const k = (4 * G_SI * m) / C_SI ** 3;
    expect(rel(pointTimeDelay(m, y), k * (phi(x[1]) - phi(x[0])))).toBeLessThan(
      1e-12
    );
  });
  test('time delay: 4.1e-5 s for 1 Msun at y = 1; scales with the mass and with 1 + z', () => {
    const d = pointTimeDelay(SOLAR_MASS_KG, 1);
    expect(rel(d, 4.1e-5)).toBeLessThan(0.02);
    expect(rel(pointTimeDelay(2 * SOLAR_MASS_KG, 1), 2 * d)).toBeLessThan(
      1e-12
    );
    expect(rel(pointTimeDelay(SOLAR_MASS_KG, 1, 1), 2 * d)).toBeLessThan(1e-12);
  });
});

describe('the singular isothermal sphere', () => {
  test('inside the Einstein radius: two images at y+1 and y-1, total 2/y', () => {
    const im = sisImages(0.5);
    expect(im.x).toEqual([1.5, -0.5]);
    expect(im.mu).toEqual([3, -1]);
    expect(im.total).toBe(4);
  });
  test('outside: one image at y+1, magnification 1 + 1/y', () => {
    const im = sisImages(2);
    expect(im.x).toEqual([3]);
    expect(Math.abs(im.total - 1.5)).toBeLessThan(1e-14);
  });
  test('each image solves y = x - sign(x)', () => {
    for (const y of [0.1, 0.9, 1.7])
      for (const x of sisImages(y).x)
        expect(Math.abs(x - Math.sign(x) - y)).toBeLessThan(1e-14);
  });
});

describe('the microlensing light curve', () => {
  test('the Paczynski curve: peak A(u0) at t0, symmetric, A(sqrt(u0^2 + 1)) at one tE', () => {
    const p = { t0: 10, u0: 0.2, tE: 20 };
    const f = microlensingFlux([10, -10, 30, 50], p);
    expect(Math.abs(f[0] - pointMagnification(0.2))).toBeLessThan(1e-12);
    expect(Math.abs(f[1] - f[2] - 0 * f[3])).toBeLessThan(1e-12);
    expect(
      Math.abs(f[1] - pointMagnification(Math.sqrt(0.04 + 1)))
    ).toBeLessThan(1e-12);
  });
  test('blending: F = fs A + (1 - fs); the peak excess shrinks in proportion to fs', () => {
    const p = { t0: 0, u0: 0.1, tE: 10 };
    const full = peakFlux(p) - 1;
    expect(Math.abs(peakFlux({ ...p, fs: 0.4 }) - 1 - 0.4 * full)).toBeLessThan(
      1e-12
    );
    expect(microlensingFlux([1000], { ...p, fs: 0.4 })[0]).toBeCloseTo(1, 3);
  });
  test('finite source at u = 0 has the closed form sqrt(rho^2+4)/rho, to 1e-12', () => {
    for (const rho of [0.05, 0.1, 0.5, 2])
      expect(
        rel(finiteSourceMagnification(0, rho), Math.sqrt(rho * rho + 4) / rho)
      ).toBeLessThan(1e-12);
  });
  test('finite source against a brute-force two-dimensional average of the disk (2e-3: the grid cannot resolve the 1/r point)', () => {
    const brute = (u, rho, n = 1200) => {
      let s = 0;
      let c = 0;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const x = -rho + ((i + 0.5) * 2 * rho) / n;
          const y = -rho + ((j + 0.5) * 2 * rho) / n;
          if (x * x + y * y > rho * rho) continue;
          s += pointMagnification(Math.hypot(u + x, y));
          c++;
        }
      return s / c;
    };
    for (const [u, rho] of [
      [0.3, 0.5],
      [0.7, 0.5],
      [1.5, 0.3],
    ])
      expect(
        rel(finiteSourceMagnification(u, rho), brute(u, rho))
      ).toBeLessThan(2e-3);
  });
  test('finite source tends to the point source as rho -> 0, and caps the peak', () => {
    expect(
      rel(finiteSourceMagnification(0.4, 1e-4), pointMagnification(0.4))
    ).toBeLessThan(1e-6);
    expect(finiteSourceMagnification(0.01, 0.1)).toBeLessThan(
      pointMagnification(0.01)
    );
    expect(finiteSourceMagnification(0.01, 0.1)).toBeLessThan(21);
  });
  test('a typical bulge event: 0.3 Msun at 6 kpc before 8 kpc at 200 km/s crosses its Einstein radius in 16 to 17 days', () => {
    const tE = timescale(0.3 * SOLAR_MASS_KG, 6 * KPC, 8 * KPC, 200e3);
    expect(tE).toBeGreaterThan(16);
    expect(tE).toBeLessThan(17.2);
  });
  test('the degeneracy: three different lenses with the same tE draw the same light curve', () => {
    const ds = 8 * KPC;
    const tE = 20;
    const a = { dl: 4 * KPC, v: 150e3 };
    const b = { dl: 6 * KPC, v: 150e3 };
    const c = { dl: 4 * KPC, v: 300e3 };
    const ms = [a, b, c].map(s => massForTimescale(tE, s.dl, ds, s.v));
    expect(new Set(ms.map(m => m.toExponential(2))).size).toBe(3);
    const ts = [a, b, c].map((s, i) => timescale(ms[i], s.dl, ds, s.v));
    for (const t of ts) expect(rel(t, tE)).toBeLessThan(1e-12);
  });
});

describe('the forward model', () => {
  const SETUP = (over = {}) => ({
    format: 'gravitas.observing-setup',
    formatVersion: 1,
    seed: 'ml',
    epochs: { kind: 'regular', duration: 100, count: 400 },
    noise: {},
    instrument: { kind: 'photometer' },
    ...over,
  });
  test('noise-free it is the kernel curve exactly, and the truth manifest names the fit parameters', () => {
    const state = { event: { t0: 50, u0: 0.15, tE: 12, fs: 0.8 } };
    const o = runForward('microlensing', state, SETUP());
    const t = Object.fromEntries(
      o.synthetic.truth.parameters.map(p => [p.id, p.value])
    );
    const times = o.columns.find(c => c.id === 'time').values;
    const flux = o.columns.find(c => c.id === 'value').values;
    expect(Array.from(flux)).toEqual(
      Array.from(microlensingFlux(times, state.event))
    );
    expect([t.t0, t.u0, t.tE, t.fs]).toEqual([50, 0.15, 12, 0.8]);
    expect(o.origin).toBe('synthetic');
  });
  test('a lens geometry gives tE and theta_E as truth', () => {
    const lens = { massSun: 0.3, dlKpc: 6, dsKpc: 8, vKms: 200 };
    const o = runForward(
      'microlensing',
      { event: { t0: 50, u0: 0.3 }, lens },
      SETUP()
    );
    const t = Object.fromEntries(
      o.synthetic.truth.parameters.map(p => [p.id, p.value])
    );
    expect(
      rel(t.tE, timescale(0.3 * SOLAR_MASS_KG, 6 * KPC, 8 * KPC, 200e3))
    ).toBeLessThan(1e-12);
    expect(
      rel(t.thetaE, einsteinAngle(0.3 * SOLAR_MASS_KG, 6 * KPC, 8 * KPC) / MAS)
    ).toBeLessThan(1e-12);
  });
  test('refuses a state without a time scale, and the wrong instrument', () => {
    expect(() =>
      runForward('microlensing', { event: { t0: 1, u0: 0.1 } }, SETUP())
    ).toThrow(/tE/);
    expect(() =>
      runForward(
        'microlensing',
        { event: { t0: 1, u0: 0.1, tE: 5 } },
        SETUP({ instrument: { kind: 'spectrograph' } })
      )
    ).toThrow();
  });
});

describe('the fit recovers the truth over many seeds', () => {
  const times = Array.from({ length: 241 }, (_, i) => -60 + i * 0.5);
  const pulls = (truth, blend, n = 30) => {
    const out = { t0: [], u0: [], tE: [], chi: [], sigmaTE: [] };
    for (let s = 0; s < n; s++) {
      const d = syntheticEvent({ seed: `ml-${s}`, times, truth, noise: 0.01 });
      const f = fitMicrolensing(d, { blend });
      for (const k of ['t0', 'u0', 'tE'])
        out[k].push((f[k] - truth[k]) / f.sigma[k]);
      out.chi.push(f.chi2 / f.dof);
      out.sigmaTE.push(f.sigma.tE / truth.tE);
    }
    return out;
  };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const sd = a =>
    Math.sqrt(a.reduce((x, y) => x + (y - mean(a)) ** 2, 0) / a.length);

  // With 30 seeds the mean pull has a standard error of 0.18 and the spread
  // of the pull an error near 0.13: the limits are 0.5 and 0.7..1.4, about
  // 2.7 standard errors, fixed before the run.
  test('no blending in truth or model: pulls are unit normal, chi-square per degree of freedom near 1', () => {
    const p = pulls({ t0: 0, u0: 0.2, tE: 20, fs: 1 }, 'none');
    for (const k of ['t0', 'u0', 'tE']) {
      expect(Math.abs(mean(p[k]))).toBeLessThan(0.5);
      expect(sd(p[k])).toBeGreaterThan(0.7);
      expect(sd(p[k])).toBeLessThan(1.4);
    }
    expect(Math.abs(mean(p.chi) - 1)).toBeLessThan(0.1);
  });
  test('blending free in a blended event: pulls are still unit normal, the blend share is recovered, and tE is less certain than with the blend held', () => {
    const truth = { t0: 0, u0: 0.2, tE: 20, fs: 0.5 };
    const free = pulls(truth, 'free');
    for (const k of ['t0', 'u0', 'tE']) {
      expect(Math.abs(mean(free[k]))).toBeLessThan(0.5);
      expect(sd(free[k])).toBeLessThan(1.4);
    }
    const held = pulls({ ...truth, fs: 1 }, 'none');
    expect(mean(free.sigmaTE)).toBeGreaterThan(1.5 * mean(held.sigmaTE));
    const d = syntheticEvent({ seed: 'fs', times, truth, noise: 0.01 });
    expect(
      Math.abs(fitMicrolensing(d, { blend: 'free' }).fs - 0.5)
    ).toBeLessThan(0.15);
  });
  test('a wrong assumption is visible: holding blending at none for a blended event leaves chi-square far above 1 and a biased tE', () => {
    const truth = { t0: 0, u0: 0.2, tE: 20, fs: 0.5 };
    const wrong = pulls(truth, 'none', 10);
    expect(mean(wrong.chi)).toBeGreaterThan(2);
    expect(Math.abs(mean(wrong.tE))).toBeGreaterThan(5);
  });
});
