// =============================================================================
// The forward models, each held to an analytic limit
// -----------------------------------------------------------------------------
// One block per model: a noise-free setup returns the model exactly (against
// an independent computation or a closed form), the observation validates in
// the app and in the schema, and the truth manifest names what made it.
// Tolerances are stated beside each check and come from the method (a closed
// form to rounding, a quadrature to its stated order), not from the result.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { valid } from './jsonSchemaSubset.js';
import {
  FORWARD_MODELS,
  compareWithTruth,
  gradeAgainstTruth,
  elementsFromBodies,
  runForward,
} from '../js/forward/index.js';
import { validateObservation } from '../js/observatory/schema.js';
import { observationDigest } from '../js/observatory/identity.js';
import { observationJson } from '../js/observatory/export.js';
import { read as readObservation } from '../js/observatory/import.js';
import {
  limbDarkening,
  transitFlux,
  halfDuration,
} from '../js/inference/transit.js';
import { rvCurve } from '../js/inference/rv.js';
import { dataFrom, fitOnce } from '../js/inference/infer.js';
import { rvSemiAmplitudeFromMasses } from '../js/exoplanetObservables.js';
import {
  G_SI,
  EARTH_MASS_KG,
  SOLAR_MASS_KG,
  SECONDS_PER_DAY,
} from '../js/constants.js';
import { synthesisePopulation } from '../js/stellar/population.js';
import { BANDS } from '../js/data/radiation/bandpasses.js';
import { decodeBand } from '../js/kernels/radiation/photometry.js';
import { zFromVelocity } from '../js/kernels/radiation/doppler.js';
import { planckLambda } from '../js/kernels/radiation/planck.js';
import { skyOf } from '../js/observatory/wcs.js';
import { semiAmplitude } from '../js/forward/models/radialVelocity.js';
import { transitParameters } from '../js/forward/models/transit.js';
import { signatureMas } from '../js/forward/models/astrometry.js';
import { eclipsingFlux } from '../js/forward/models/periodic.js';
import { observedLine, wavelengthGrid } from '../js/forward/models/spectrum.js';
import { starMagnitude } from '../js/forward/models/catalogue.js';

// The observation digest is WebCrypto; Node supplies what the Jest realm lacks.
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const obsSchema = JSON.parse(
  readFileSync(path.join(REPO, 'sdk/schemas/observation-1.schema.json'))
);

const SETUP = (over = {}) => ({
  format: 'gravitas.observing-setup',
  formatVersion: 1,
  seed: 'fm',
  epochs: { kind: 'regular', duration: 7, count: 200 },
  noise: {},
  instrument: { kind: 'photometer' },
  ...over,
});
const STATE = (over = {}) => ({
  star: {
    massSun: 1.148,
    radiusSun: 1.155,
    teffK: 6065,
    distancePc: 48.3,
    limb: { q1: 0.36, q2: 0.3 },
  },
  planets: [
    {
      id: 'b',
      massEarth: 220,
      radiusEarth: 15.1,
      periodDays: 3.5247,
      e: 0,
      omegaDeg: 0,
      meanAnomalyDeg: 30,
    },
  ],
  geometry: { positionAngleDeg: 40, inclinationDeg: 87 },
  ...over,
});
const col = (o, id) => o.columns.find(c => c.id === id).values;
const truthOf = o =>
  Object.fromEntries(o.synthetic.truth.parameters.map(p => [p.id, p.value]));
/** The observation as the workspace writes it: what a file and the schema see. */
const saved = o => observationJson(o, { source: o, changes: [] });
const accepted = o => {
  expect(validateObservation(o)).toEqual([]);
  expect(valid(obsSchema, JSON.parse(saved(o)))).toBe(true);
  expect(o.origin).toBe('synthetic');
  expect(o.synthetic.truth.parameters.length).toBeGreaterThan(0);
};

describe('the registry', () => {
  test('lists the seven models and refuses an unknown one in words', () => {
    expect(Object.keys(FORWARD_MODELS).sort()).toEqual([
      'astrometry',
      'catalogue',
      'image',
      'periodic',
      'radial-velocity',
      'spectrum',
      'transit',
    ]);
    expect(() => runForward('nope', {}, SETUP())).toThrow(
      /no forward model "nope"/
    );
  });
  test('refuses an invalid setup, naming the problems, and the wrong instrument', () => {
    expect(() => runForward('transit', STATE(), SETUP({ seed: '' }))).toThrow(
      /seed/
    );
    expect(() =>
      runForward(
        'transit',
        STATE(),
        SETUP({ instrument: { kind: 'spectrograph' } })
      )
    ).toThrow(/photometer/);
  });
});

describe('transit', () => {
  test("noise-free: the inference core's own model, exactly, and the truth manifest names its parameters", () => {
    const state = STATE();
    const o = runForward('transit', state, SETUP());
    accepted(o);
    const p = transitParameters(state);
    const { u1, u2 } = limbDarkening(p.q1, p.q2);
    const ref = transitFlux(
      col(o, 'time'),
      { ...p, u1, u2 },
      { exposure: 0, supersample: 11, annuli: 96 }
    );
    expect(Array.from(col(o, 'value'))).toEqual(Array.from(ref));
    expect(o.columns.some(c => c.role === 'uncertainty')).toBe(false);
    const t = truthOf(o);
    expect(t.P).toBe(3.5247);
    expect(t.b).toBeCloseTo(t.aRs * Math.cos((87 * Math.PI) / 180), 12);
  });

  test('uniform disk, central transit: the depth is k squared; mid-transit is at t0; the duration is the analytic one', () => {
    // q1 = q2 = 0 is u1 = u2 = 0. The occultation integral uses 96 annuli, so
    // the depth is held to 2e-4 of k^2 (the integral's own order of accuracy).
    const state = STATE({
      star: { ...STATE().star, limb: { q1: 0, q2: 0 } },
      geometry: { positionAngleDeg: 0, inclinationDeg: 90 },
      planets: [
        {
          id: 'b',
          massEarth: 220,
          radiusEarth: 15.1,
          periodDays: 3.5247,
          meanAnomalyDeg: 0,
        },
      ],
    });
    const p = transitParameters(state);
    expect(p.b).toBeCloseTo(0, 12);
    expect(p.t0).toBeCloseTo(0, 9);
    const half = halfDuration(p);
    const times = [p.t0, p.t0 + 0.5 * half, p.t0 + 1.5 * half, p.t0 + p.P / 2];
    const o = runForward(
      'transit',
      state,
      SETUP({ epochs: { kind: 'listed', list: times } })
    );
    // Listed epochs are offsets from the start, which is 0 here.
    const flux = col(o, 'value');
    expect(Math.abs(1 - flux[0] - p.k ** 2) / p.k ** 2).toBeLessThan(2e-4);
    expect(flux[2]).toBe(1);
    expect(flux[3]).toBe(1);
  });

  test('a tilted orbit that never crosses gives a flat light curve; an eccentric one is refused', () => {
    const flat = runForward(
      'transit',
      STATE({ geometry: { positionAngleDeg: 0, inclinationDeg: 60 } }),
      SETUP()
    );
    expect(new Set(col(flat, 'value'))).toEqual(new Set([1]));
    const ecc = STATE();
    ecc.planets[0].e = 0.2;
    expect(() => runForward('transit', ecc, SETUP())).toThrow(/circular/);
  });

  test('two planets: the deficits add', () => {
    const one = STATE();
    const two = STATE();
    two.planets.push({
      id: 'c',
      massEarth: 20,
      radiusEarth: 4,
      periodDays: 7.3,
      meanAnomalyDeg: 100,
    });
    const a = col(runForward('transit', one, SETUP()), 'value');
    const b = col(runForward('transit', two, SETUP()), 'value');
    expect(Math.min(...b)).toBeLessThanOrEqual(Math.min(...a));
    expect(b.some((v, i) => v !== a[i])).toBe(true);
  });
});

describe('radial velocity', () => {
  const rv = (
    state,
    setup = SETUP({
      epochs: { kind: 'regular', duration: 20, count: 4000 },
      instrument: { kind: 'spectrograph' },
    })
  ) => runForward('radial-velocity', state, setup);

  test('the half range is K, which matches the closed form from the masses', () => {
    for (const e of [0, 0.3, 0.6]) {
      const state = STATE();
      state.planets[0].e = e;
      state.planets[0].omegaDeg = 70;
      const o = rv(
        state,
        SETUP({
          epochs: { kind: 'regular', duration: 3.5247, count: 40000 },
          instrument: { kind: 'spectrograph' },
        })
      );
      accepted(o);
      const v = col(o, 'value');
      const half = (Math.max(...v) - Math.min(...v)) / 2;
      const K = semiAmplitude(state);
      // 40000 samples over one period (a step of 9e-5 d): the peak of even the
      // e = 0.6 curve is sampled to under 1e-5 K.
      expect(Math.abs(half - K) / K).toBeLessThan(1e-5);
      const pl = state.planets[0];
      const closed = rvSemiAmplitudeFromMasses(
        G_SI,
        pl.periodDays * SECONDS_PER_DAY,
        state.star.massSun * SOLAR_MASS_KG,
        pl.massEarth * EARTH_MASS_KG,
        Math.sin((87 * Math.PI) / 180),
        e
      );
      expect(Math.abs(K / closed - 1)).toBeLessThan(1e-9);
    }
  });

  test("equals the inference core's Keplerian curve to rounding, circular and eccentric", () => {
    // Independent implementation: js/inference/rv.js rvCurve, with the truth
    // manifest's own parameters. 1e-9 m/s on a 25 to 90 m/s curve.
    for (const e of [0, 0.3]) {
      const state = STATE();
      state.planets[0].e = e;
      state.planets[0].omegaDeg = 70;
      const o = rv(
        state,
        SETUP({
          epochs: { kind: 'regular', duration: 7, count: 60 },
          instrument: { kind: 'spectrograph' },
        })
      );
      const t = truthOf(o);
      const ref = rvCurve(col(o, 'time'), {
        P: t.P,
        tc: t.tc,
        K: t.K,
        sqrtEcosw: t.sqrtEcosw,
        sqrtEsinw: t.sqrtEsinw,
      });
      col(o, 'value').forEach((v, i) =>
        expect(Math.abs(v - ref[i])).toBeLessThan(1e-9)
      );
    }
  });

  test('the systemic velocity is added; an observer face-on sees no reflex', () => {
    const state = STATE();
    state.star.systemicKmS = 12;
    const v = col(rv(state), 'value');
    expect((Math.max(...v) + Math.min(...v)) / 2).toBeCloseTo(12000, 0);
    const face = STATE({
      geometry: { positionAngleDeg: 0, inclinationDeg: 0 },
    });
    expect(Math.max(...col(rv(face), 'value').map(Math.abs))).toBeLessThan(
      1e-9
    );
  });

  test('a noisy run states its white sigma and recovers the truth within its uncertainty', () => {
    const state = STATE({
      geometry: { positionAngleDeg: 0, inclinationDeg: 90 },
    });
    state.planets[0].massEarth = 600;
    const setup = SETUP({
      seed: 'truth-1',
      epochs: { kind: 'irregular', duration: 12, count: 40 },
      noise: { white: { sigma: 3, unit: 'm/s' } },
      instrument: { kind: 'spectrograph' },
    });
    const o = runForward('radial-velocity', state, setup);
    accepted(o);
    expect(col(o, 'value-sigma').every(s => s === 3)).toBe(true);
    const t = truthOf(o);
    const request = {
      model: { id: 'rv-keplerian' },
      parameters: {
        P: { mode: 'fitted', lo: t.P * 0.9, hi: t.P * 1.1 },
        tc: { mode: 'fitted', lo: t.tc - 1, hi: t.tc + 1 },
        K: { mode: 'fitted' },
        sqrtEcosw: { mode: 'fixed', value: 0 },
        sqrtEsinw: { mode: 'fixed', value: 0 },
        jitter: { mode: 'fixed', value: 0 },
      },
      settings: {},
      algorithm: { profile: { points: 11 } },
    };
    const data = dataFrom(o, { x: 'time', y: 'value', sigma: 'value-sigma' });
    const fit = fitOnce(request, data);
    const cmp = compareWithTruth(o, fit);
    const byId = Object.fromEntries(cmp.rows.map(r => [r.id, r]));
    // Fixed seed; each recovered parameter within four of its own sigmas (a
    // bound stated before the run), and K within 10 percent.
    for (const id of ['P', 'K', 'tc']) {
      expect(byId[id]).toBeDefined();
      expect(Math.abs(byId[id].pull)).toBeLessThan(4);
    }
    expect(Math.abs(byId.K.recovered / t.K - 1)).toBeLessThan(0.1);
    expect(cmp.rows.length + cmp.unfitted.length).toBe(
      o.synthetic.truth.parameters.length
    );
    expect(compareWithTruth({ origin: 'observed' }, fit)).toBeNull();
  });
});

describe('astrometry', () => {
  test('face-on and circular: a circle of the reflex radius; edge-on: a line of the same amplitude', () => {
    const sig = signatureMas(STATE());
    const face = runForward(
      'astrometry',
      STATE({ geometry: { positionAngleDeg: 0, inclinationDeg: 0 } }),
      SETUP({ instrument: { kind: 'astrometer' } })
    );
    accepted(face);
    const dx = col(face, 'dx');
    const dy = col(face, 'dy');
    // Closed form to rounding: 1e-9 of the radius.
    dx.forEach((x, i) =>
      expect(Math.abs(Math.hypot(x, dy[i]) / sig - 1)).toBeLessThan(1e-9)
    );
    const edge = runForward(
      'astrometry',
      STATE({ geometry: { positionAngleDeg: 0, inclinationDeg: 90 } }),
      SETUP({
        epochs: { kind: 'regular', duration: 7, count: 400 },
        instrument: { kind: 'astrometer' },
      })
    );
    expect(Math.max(...col(edge, 'dy').map(Math.abs))).toBeLessThan(1e-9 * sig);
    expect(Math.abs(Math.max(...col(edge, 'dx')) / sig - 1)).toBeLessThan(1e-3);
  });

  test('the signature is a1 over the distance, and proper motion is a straight line', () => {
    const state = STATE();
    state.star.properMotionMasPerYr = [10, -5];
    const o = runForward(
      'astrometry',
      state,
      SETUP({
        epochs: { kind: 'listed', list: [0, 365.25] },
        instrument: { kind: 'astrometer' },
      })
    );
    const dx = col(o, 'dx');
    const noPm = runForward(
      'astrometry',
      STATE(),
      SETUP({
        epochs: { kind: 'listed', list: [0, 365.25] },
        instrument: { kind: 'astrometer' },
      })
    );
    expect(
      dx[1] - dx[0] - (col(noPm, 'dx')[1] - col(noPm, 'dx')[0])
    ).toBeCloseTo(10, 9);
  });
});

describe('periodic models', () => {
  const photo = over =>
    SETUP({ epochs: { kind: 'regular', duration: 3, count: 600 }, ...over });
  test('a Fourier series is exact', () => {
    const state = {
      periodic: {
        kind: 'harmonic',
        periodDays: 1.5,
        t0: 0.2,
        mean: 1,
        harmonics: [
          { amplitude: 0.01, phaseDeg: 30 },
          { amplitude: 0.004, phaseDeg: 80 },
        ],
      },
    };
    const o = runForward('periodic', state, photo());
    accepted(o);
    col(o, 'time').forEach((t, i) => {
      const w = (2 * Math.PI * (t - 0.2)) / 1.5;
      const f =
        1 +
        0.01 * Math.sin(w + (30 * Math.PI) / 180) +
        0.004 * Math.sin(2 * w + (80 * Math.PI) / 180);
      expect(Math.abs(col(o, 'value')[i] - f)).toBeLessThan(1e-12);
    });
  });

  test('an eclipsing binary: total secondary and annular primary depths are the closed forms; out of eclipse is 1', () => {
    const p = {
      kind: 'eclipsing',
      periodDays: 2,
      t0: 0,
      r1: 0.25,
      r2: 0.1,
      surfaceBrightnessRatio: 0.6,
      inclinationDeg: 90,
    };
    const L1 = p.r1 ** 2;
    const L2 = p.surfaceBrightnessRatio * p.r2 ** 2;
    // Primary mid-eclipse: star 2 wholly inside star 1's disk.
    expect(
      Math.abs(1 - eclipsingFlux(p, 0) - (L1 * (p.r2 / p.r1) ** 2) / (L1 + L2))
    ).toBeLessThan(1e-12);
    // Secondary mid-eclipse: star 2 wholly behind star 1.
    expect(Math.abs(1 - eclipsingFlux(p, 1) - L2 / (L1 + L2))).toBeLessThan(
      1e-12
    );
    // Quadrature: no overlap.
    expect(eclipsingFlux(p, 0.5)).toBe(1);
    const o = runForward(
      'periodic',
      { periodic: p },
      photo({ epochs: { kind: 'regular', duration: 4, count: 801 } })
    );
    accepted(o);
    expect(Math.min(...col(o, 'value'))).toBeCloseTo(
      1 - (L1 * (p.r2 / p.r1) ** 2) / (L1 + L2),
      4
    );
  });

  test('a grazing eclipse is between none and the full overlap, and symmetric about mid-eclipse', () => {
    const p = {
      kind: 'eclipsing',
      periodDays: 2,
      t0: 0,
      r1: 0.25,
      r2: 0.2,
      inclinationDeg: 80,
    };
    const f = eclipsingFlux(p, 0);
    expect(f).toBeLessThan(1);
    expect(f).toBeGreaterThan(0.5);
    expect(
      Math.abs(eclipsingFlux(p, 0.03) - eclipsingFlux(p, -0.03))
    ).toBeLessThan(1e-12);
  });

  test('refuses what it cannot draw', () => {
    expect(() => runForward('periodic', {}, photo())).toThrow(
      /state\.periodic/
    );
    expect(() =>
      runForward(
        'periodic',
        {
          periodic: {
            kind: 'eclipsing',
            periodDays: 1,
            t0: 0,
            r1: 0.7,
            r2: 0.5,
          },
        },
        photo()
      )
    ).toThrow(/radii/);
  });
});

describe('spectrum', () => {
  const spec = (o = {}) => ({
    spectrum: {
      teffK: 5800,
      velocityKmS: 45,
      lines: [
        { restNm: 656.28, ewNm: 0.12, fwhmNm: 0.05 },
        { restNm: 589.0, ewNm: 0.05, fwhmNm: 0.04 },
      ],
      ...o,
    },
  });
  const setup = (inst = {}, over = {}) =>
    SETUP({
      epochs: undefined,
      instrument: {
        kind: 'spectrograph',
        window: [580, 670],
        resolvingPower: 50000,
        ...inst,
      },
      ...over,
    });

  test("a noise-free spectrum conserves each line's equivalent width and centres it at rest times (1 + z)", () => {
    const o = runForward('spectrum', spec(), setup());
    accepted(o);
    const lam = col(o, 'wavelength');
    const f = col(o, 'flux');
    const cont = Float64Array.from(lam, l => planckLambda(l * 1e-9, 5800));
    const mean = cont.reduce((a, b) => a + b, 0) / cont.length;
    const z = zFromVelocity(45);
    for (const [rest, ew] of [
      [656.28, 0.12],
      [589.0, 0.05],
    ]) {
      const centre = rest * (1 + z);
      let area = 0;
      let moment = 0;
      for (let i = 1; i < lam.length; i++) {
        if (Math.abs(lam[i] - centre) > 1) continue;
        const d = 1 - f[i] / (cont[i] / mean);
        area += d * (lam[i] - lam[i - 1]);
        moment += d * lam[i] * (lam[i] - lam[i - 1]);
      }
      // A Gaussian sampled at 3 points per resolution element integrates to a
      // part in 1e-3 (the sum of a Gaussian converges geometrically); the
      // centroid is held to a tenth of a pixel.
      expect(Math.abs(area / (ew * (1 + z)) - 1)).toBeLessThan(1e-3);
      const step = lam[1] - lam[0];
      expect(Math.abs(moment / area - centre)).toBeLessThan(0.1 * step);
    }
  });

  test('the line is as wide as the instrument and the line itself say, and the depth follows', () => {
    const inst = { resolvingPower: 20000 };
    const l = observedLine({ restNm: 600, ewNm: 0.1, fwhmNm: 0.02 }, 0, {
      resolvingPower: 20000,
    });
    expect(l.fwhmNm).toBeCloseTo(Math.hypot(0.02, 600 / 20000), 12);
    const o = runForward(
      'spectrum',
      {
        spectrum: {
          teffK: 6000,
          lines: [{ restNm: 600, ewNm: 0.1, fwhmNm: 0.02 }],
        },
      },
      setup({ ...inst, window: [596, 604], dispersion: 0.002 })
    );
    const lam = col(o, 'wavelength');
    const f = col(o, 'flux');
    const cont = Float64Array.from(lam, x => planckLambda(x * 1e-9, 6000));
    const mean = cont.reduce((a, b) => a + b, 0) / cont.length;
    const deepest = Math.max(...f.map((v, i) => 1 - v / (cont[i] / mean)));
    const sigma = l.fwhmNm / (2 * Math.sqrt(2 * Math.LN2));
    expect(
      Math.abs(deepest / (0.1 / (sigma * Math.sqrt(2 * Math.PI))) - 1)
    ).toBeLessThan(1e-3);
  });

  test('white noise is added in relative flux; a grid needs a window and a resolution', () => {
    const o = runForward(
      'spectrum',
      spec(),
      setup({}, { noise: { white: { sigma: 0.01 } } })
    );
    expect(col(o, 'flux-sigma')[0]).toBe(0.01);
    expect(() => wavelengthGrid({ kind: 'spectrograph' })).toThrow(/window/);
    expect(() => wavelengthGrid({ window: [500, 600] })).toThrow(
      /dispersion or resolvingPower/
    );
  });
});

describe('photometric catalogue', () => {
  const population = synthesisePopulation({ count: 80, seed: 'cat-1' });
  const bandOf = id => decodeBand(BANDS.find(b => b.id === id));
  const bands = { B: bandOf('B'), V: bandOf('V') };
  const state = (dist = { kind: 'fixed', pc: 100 }) => ({
    population,
    distance: dist,
  });
  const cat = (over = {}) =>
    SETUP({
      epochs: undefined,
      instrument: { kind: 'catalogue', bandpass: ['B', 'V'], ...over },
    });

  test('the magnitude difference between two distances is the distance modulus, and colour does not depend on distance', () => {
    const s = population.stars[5];
    const near = starMagnitude(bands.V, s.teffK, s.radiusSun, 10);
    const far = starMagnitude(bands.V, s.teffK, s.radiusSun, 1000);
    // The flux scales as d^-2 exactly; the integral is linear in it: 1e-9 mag.
    expect(Math.abs(far - near - 10)).toBeLessThan(1e-9);
    const c1 = starMagnitude(bands.B, s.teffK, s.radiusSun, 10) - near;
    const c2 =
      starMagnitude(bands.B, s.teffK, s.radiusSun, 4000) -
      starMagnitude(bands.V, s.teffK, s.radiusSun, 4000);
    expect(Math.abs(c1 - c2)).toBeLessThan(1e-9);
  });

  test('noise-free: one row per star, equal to the blackbody magnitude, with the truth per row', () => {
    const o = runForward('catalogue', state(), cat(), { bands });
    accepted(o);
    expect(col(o, 'id').length).toBe(population.stars.length);
    const i = 7;
    const s = population.stars[i];
    expect(col(o, 'mag-V')[i]).toBe(
      starMagnitude(bands.V, s.teffK, s.radiusSun, 100)
    );
    expect(o.synthetic.truth.columns.teffK[i]).toBe(s.teffK);
    expect(o.synthetic.truth.columns.distancePc[i]).toBe(100);
  });

  test('a limiting magnitude removes the faint stars and lists them in the truth', () => {
    const full = runForward(
      'catalogue',
      state({ kind: 'volume', maxPc: 400 }),
      cat(),
      { bands }
    );
    const v = col(full, 'mag-B');
    const limit = [...v].sort((a, b) => a - b)[Math.floor(v.length * 0.7)];
    const cut = runForward(
      'catalogue',
      state({ kind: 'volume', maxPc: 400 }),
      cat({ limitingMagnitude: limit }),
      { bands }
    );
    accepted(cut);
    expect(col(cut, 'mag-B').every(m => m <= limit)).toBe(true);
    expect(col(cut, 'id').length + cut.synthetic.truth.missing.length).toBe(
      population.stars.length
    );
    expect(cut.synthetic.truth.missing.length).toBeGreaterThan(0);
  });

  test('noise in magnitudes is stated per band, and a missing band is refused in words', () => {
    const o = runForward(
      'catalogue',
      state(),
      { ...cat(), noise: { white: { sigma: 0.02, unit: 'mag' } } },
      { bands }
    );
    expect(col(o, 'mag-V-sigma')[0]).toBe(0.02);
    expect(() =>
      runForward('catalogue', state(), cat(), { bands: { B: bands.B } })
    ).toThrow(/no decoded band "V"/);
  });
});

describe('image', () => {
  const frame = (over = {}) =>
    SETUP({
      epochs: undefined,
      instrument: {
        kind: 'imager',
        width: 40,
        height: 32,
        pixelScale: 0.5,
        psfFwhm: 1.5,
        ...over,
      },
    });
  const state = {
    background: 100,
    sources: [{ x: 14.3, y: 17.8, counts: 50000 }],
    center: { ra: 150, dec: 2 },
  };

  test("noise-free: the background plus the source's counts, centred where it was put", () => {
    const o = runForward('image', state, frame());
    accepted(o);
    const v = col(o, 'counts');
    const x = col(o, 'x');
    const y = col(o, 'y');
    let total = 0;
    let mx = 0;
    let my = 0;
    v.forEach((c, i) => {
      const s = c - 100;
      total += s;
      mx += s * x[i];
      my += s * y[i];
    });
    // The error function is good to 1.5e-7 and the source is 7 sigma from every
    // edge: the flux to 1e-6, the centroid to 1e-4 pixel.
    expect(Math.abs(total / 50000 - 1)).toBeLessThan(1e-6);
    expect(Math.abs(mx / total - 14.3)).toBeLessThan(1e-4);
    expect(Math.abs(my / total - 17.8)).toBeLessThan(1e-4);
    expect(o.image).toMatchObject({ width: 40, height: 32 });
    const sky = skyOf(o.image.wcs, 20.5, 16.5);
    expect(sky.ra).toBeCloseTo(150, 9);
    expect(sky.dec).toBeCloseTo(2, 9);
  });

  test('the noisy frame states its sigma per pixel, and a frame without a PSF is refused', () => {
    const o = runForward('image', state, {
      ...frame(),
      noise: { white: { sigma: 4, unit: 'count' } },
    });
    expect(col(o, 'counts-sigma')[0]).toBe(4);
    expect(() =>
      runForward('image', state, frame({ psfFwhm: undefined }))
    ).toThrow(/psfFwhm/);
  });
});

describe('a synthetic observation travels like any other', () => {
  test('it is saved with its truth, and the workspace reads the file back as the same observation', async () => {
    const o = runForward(
      'transit',
      STATE(),
      SETUP({ noise: { white: { sigma: 0.001 } } })
    );
    const back = readObservation(saved(o));
    expect(back.ok).toBe(true);
    expect(back.observation.origin).toBe('synthetic');
    expect(await observationDigest(back.observation)).toBe(
      await observationDigest(o)
    );
    expect(back.observation.synthetic.setup.seed).toBe('fm');
    expect(back.observation.synthetic.truth.parameters).toEqual(
      o.synthetic.truth.parameters
    );
  });
  test('the same state, setup and seed give the same observation; another seed gives other noise', () => {
    const s = SETUP({ noise: { white: { sigma: 0.001 } } });
    const a = runForward('transit', STATE(), s);
    const b = runForward('transit', STATE(), s);
    const c = runForward('transit', STATE(), { ...s, seed: 'other' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });
  test('validation refuses a synthetic origin that carries no truth, and truth on an observed one', () => {
    const o = runForward('transit', STATE(), SETUP());
    const noTruth = JSON.parse(JSON.stringify(o));
    delete noTruth.synthetic;
    expect(validateObservation(noTruth).map(p => p.path)).toContain(
      'synthetic'
    );
    const observed = {
      ...JSON.parse(JSON.stringify(o)),
      origin: 'observed',
      source: { kind: 'pack', id: 'x', version: '1' },
    };
    expect(validateObservation(observed).map(p => p.path)).toContain(
      'synthetic'
    );
  });
});

describe('a system written down as bodies', () => {
  test('a circular two-body state gives its period and no eccentricity', () => {
    const G = 2;
    const mass = 1000;
    const a = 100;
    const v = Math.sqrt((G * mass) / a);
    const el = elementsFromBodies({
      G,
      mass,
      rel: { x: a, y: 0, vx: 0, vy: v },
      timeUnitDays: 0.01,
    });
    expect(el.e).toBeLessThan(1e-9);
    // P = 2 pi sqrt(a^3 / GM), then times the time unit: closed form to rounding.
    expect(
      Math.abs(
        el.periodDays / (2 * Math.PI * Math.sqrt(a ** 3 / (G * mass)) * 0.01) -
          1
      )
    ).toBeLessThan(1e-12);
  });
  test('an eccentric state reproduces its eccentricity and periapsis; unbound and clockwise are refused', () => {
    // At periapsis (x = q, moving +y) with speed above circular: e = q v^2 / GM - 1.
    const G = 1;
    const mass = 1;
    const q = 1;
    const v = Math.sqrt(1.4);
    const el = elementsFromBodies({
      G,
      mass,
      rel: { x: q, y: 0, vx: 0, vy: v },
    });
    expect(Math.abs(el.e - 0.4)).toBeLessThan(1e-12);
    expect(el.omegaDeg).toBeCloseTo(0, 9);
    expect(Math.abs(el.meanAnomalyDeg % 360)).toBeLessThan(1e-9);
    expect(
      elementsFromBodies({ G, mass, rel: { x: 1, y: 0, vx: 0, vy: 2 } })
    ).toBeNull();
    expect(
      elementsFromBodies({ G, mass, rel: { x: 1, y: 0, vx: 0, vy: -1 } })
    ).toBeNull();
  });
  test('the elements, run through the radial-velocity model, give a curve of the stated period', () => {
    const el = elementsFromBodies({
      G: 1,
      mass: 1,
      rel: { x: 1, y: 0, vx: 0, vy: 1 },
      timeUnitDays: 0.5,
    });
    const state = STATE();
    state.planets[0] = { ...state.planets[0], ...el, massEarth: 100 };
    const o = runForward(
      'radial-velocity',
      state,
      SETUP({ instrument: { kind: 'spectrograph' } })
    );
    expect(truthOf(o).P).toBeCloseTo(el.periodDays, 12);
  });
});

describe('the exoplanet suite agrees with the forward model', () => {
  test("its simulated HD 209458 radius ratio is the forward model's truth for the same system", async () => {
    // The guide keeps its own arithmetic: importing the forward model there
    // would put the radial-velocity planner into the instructor bundle's inputs
    // and make it stale, which only the passphrase can repair. The agreement is
    // held here instead.
    const G = await import('../js/observatory/guides/exoplanet.js');
    const answers = Object.values(G).find(
      v => v && typeof v === 'object' && v.simulationRadiusRatio
    );
    const sim = { stellarRadius: 1.155, planetRadius: 1.38, period: 3.5247 };
    const k = transitParameters({
      star: { massSun: 1.148, radiusSun: sim.stellarRadius },
      planets: [
        {
          massEarth: 220,
          radiusEarth: (sim.planetRadius * 7.1492e7) / 6.371e6,
          periodDays: sim.period,
        },
      ],
    }).k;
    expect(Math.abs(k / answers.simulationRadiusRatio() - 1)).toBeLessThan(
      1e-12
    );
  });
});

describe('lesson-declared forward sources', () => {
  test('the declared steps are valid and their measurement reproduces the truth', async () => {
    const { FORWARD_STEPS, forwardFindings, forwardModels } =
      await import('../tools/authoring/forwardSources.mjs');
    expect(forwardFindings()).toEqual([]);
    const key = 'transit-photometry/from-a-depth-to-a';
    expect(Object.keys(FORWARD_STEPS)).toContain(key);
    // The step's literal is 0.1: the truth manifest's radius ratio.
    expect(forwardModels()[key].value()).toBeCloseTo(0.1, 12);
  });
  test('a declaration with a bad setup, an unknown truth or a measurement that misses is refused', async () => {
    const { FORWARD_STEPS, forwardFindings } =
      await import('../tools/authoring/forwardSources.mjs');
    const d = FORWARD_STEPS['transit-photometry/from-a-depth-to-a'];
    const msgs = steps =>
      forwardFindings(steps)
        .map(f => f.message)
        .join(' | ');
    expect(msgs({ 'x/y': { ...d, setup: { ...d.setup, seed: '' } } })).toMatch(
      /not valid: seed/
    );
    expect(msgs({ 'x/y': { ...d, truth: 'nope' } })).toMatch(
      /no parameter "nope"/
    );
    expect(msgs({ 'x/y': { ...d, measure: () => 0.2 } })).toMatch(
      /does not reproduce/
    );
    expect(msgs({ 'x/y': { ...d, model: 'nothing' } })).toMatch(/refused/);
  });
  test('gradeAgainstTruth marks an answer inside the tolerance and outside it', () => {
    const o = runForward('transit', STATE(), SETUP());
    const k = truthOf(o).k;
    expect(gradeAgainstTruth(o, 'k', k * 1.01, 0.02)).toMatchObject({
      ok: true,
      truth: k,
    });
    expect(gradeAgainstTruth(o, 'k', k * 1.2, 0.02).ok).toBe(false);
    expect(gradeAgainstTruth(o, 'zzz', 1, 0.1)).toBeNull();
    expect(gradeAgainstTruth({ origin: 'observed' }, 'k', 1, 0.1)).toBeNull();
  });
});
