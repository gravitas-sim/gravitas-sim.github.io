// The stellar-structure kernel (Roadmap II Prompt 95): Lane-Emden polytropes
// against published tables, the closed forms and convergence; Eddington's
// standard model of the Sun; homology algebra and the MIST zero-age models;
// the white-dwarf relation and the limit that emerges from it; the Worker.
import {
  solvePolytrope,
  polytrope,
  polytropeTable,
  analyticTheta,
  indexFromConcentration,
  polytropeStar,
  polytropeProfile,
  interiorOf,
  homologyExponents,
  structureScaling,
  OPACITY,
  ENERGY,
  nuclearTimescaleYr,
  kelvinHelmholtzYr,
  dynamicalSeconds,
  zeroAgeModels,
  fitPowerLaw,
  whiteDwarf,
  degeneratePressure,
  degenerateDensity,
  fermiX,
  chandrasekharMassSun,
  centralXForMass,
  createStellarClient,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
  H_PLANCK,
  G_SI,
  M_ELECTRON_KG,
  M_UNIT_KG,
} from '../js/kernels/stellar/index.js';
import { handle } from '../js/kernels/stellar/workerCore.js';

const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

// Chandrasekhar (1939) Table 4, as reproduced by Horedt (2004): n, xi1,
// -xi1^2 theta'(xi1), rho_c / rho_mean. Six or five digits are pinned.
const PUBLISHED = [
  [0, 2.44949, 4.89898, 1.0],
  [0.5, 2.7527, 3.78865, 1.83511],
  [1, 3.14159, 3.14159, 3.28987],
  [1.5, 3.65375, 2.71406, 5.99071],
  [2, 4.35287, 2.41105, 11.40254],
  [2.5, 5.35528, 2.1872, 23.40649],
  [3, 6.89685, 2.01824, 54.1825],
  [3.5, 9.53581, 1.89056, 152.884],
  [4, 14.97155, 1.79723, 622.408],
  [4.5, 31.83646, 1.7378, 6189.47],
];

describe('Lane-Emden polytropes', () => {
  test.each(PUBLISHED)(
    'n = %s matches the published table',
    (n, xi1, mass, ratio) => {
      const s = solvePolytrope(n, { points: 5 });
      expect(rel(s.xi1, xi1)).toBeLessThan(2e-5);
      expect(rel(s.mass, mass)).toBeLessThan(2e-5);
      expect(rel(s.rhoRatio, ratio)).toBeLessThan(2e-5);
    }
  );

  test('the closed forms of n = 0 and 1 are reproduced to integrator accuracy', () => {
    const z = solvePolytrope(0, { points: 300 });
    expect(Math.abs(z.xi1 - Math.sqrt(6))).toBeLessThan(1e-9);
    const o = solvePolytrope(1, { points: 300 });
    expect(Math.abs(o.xi1 - Math.PI)).toBeLessThan(1e-9);
    for (const s of [z, o]) {
      let worst = 0;
      s.xi.forEach((x, i) => {
        worst = Math.max(worst, Math.abs(s.theta[i] - analyticTheta(s.n, x)));
      });
      expect(worst).toBeLessThan(1e-9);
    }
  });

  test('n = 5 has an infinite radius and a finite mass, from the closed form', () => {
    const s = solvePolytrope(5);
    expect(s.xi1).toBe(Infinity);
    expect(s.mass).toBeCloseTo(Math.sqrt(3), 12);
    expect(s.theta[0]).toBe(1);
    expect(s.theta[s.theta.length - 1]).toBeGreaterThan(0);
    // The n = 5 closed form really does satisfy the equation (finite differences).
    const f = x => analyticTheta(5, x);
    const x = 2;
    const e = 1e-4;
    const d2 = (f(x + e) - 2 * f(x) + f(x - e)) / (e * e);
    const d1 = (f(x + e) - f(x - e)) / (2 * e);
    expect(Math.abs(d2 + (2 / x) * d1 + f(x) ** 5)).toBeLessThan(1e-6);
  });

  test('indices outside [0, 5] are refused', () => {
    expect(() => solvePolytrope(-0.1)).toThrow(RangeError);
    expect(() => solvePolytrope(5.5)).toThrow(RangeError);
  });

  test('halving the step moves the surface by less than 1e-8 (n = 3)', () => {
    const a = solvePolytrope(3, { h: 5e-4, points: 3 });
    const b = solvePolytrope(3, { h: 2.5e-4, points: 3 });
    expect(Math.abs(a.xi1 - b.xi1)).toBeLessThan(1e-8);
  });

  test('the profile runs from the centre to the surface and the mass fraction rises to 1', () => {
    const s = solvePolytrope(3);
    expect(s.xi[0]).toBe(0);
    expect(s.xi[s.xi.length - 1]).toBe(s.xi1);
    expect(s.theta[s.theta.length - 1]).toBe(0);
    const star = polytropeStar(3, SOLAR_MASS_KG, SOLAR_RADIUS_M);
    const rows = polytropeProfile(star, 40);
    expect(rows[0].m).toBe(0);
    expect(rows[39].m).toBeCloseTo(1, 12);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].m).toBeGreaterThanOrEqual(rows[i - 1].m);
      expect(rows[i].rho).toBeLessThanOrEqual(rows[i - 1].rho);
    }
    expect(rows[0].rho).toBeCloseTo(star.rhoCentral, 6);
  });

  test('the table, and indexFromConcentration as its inverse', () => {
    expect(polytropeTable().map(r => r.n)).toEqual(PUBLISHED.map(r => r[0]));
    expect(
      Math.abs(indexFromConcentration(polytrope(3).rhoRatio) - 3)
    ).toBeLessThan(0.02);
    expect(indexFromConcentration(0.5)).toBe(0);
  });
});

describe("Eddington's standard model of the Sun (n = 3, mu = 0.6)", () => {
  const sun = polytropeStar(3, SOLAR_MASS_KG, SOLAR_RADIUS_M);
  test('central density, pressure and temperature', () => {
    expect(rel(sun.rhoCentral / 1000, 76.4)).toBeLessThan(0.005); // g/cm^3
    expect(rel(sun.pCentral, 1.245e16)).toBeLessThan(0.01); // Pa
    expect(rel(sun.tCentral, 1.18e7)).toBeLessThan(0.01); // K
  });
  test('the real Sun is more concentrated than n = 3', () => {
    // About 150 g/cm^3 against a mean 1.41: an index near 3.3.
    const n = indexFromConcentration(150 / 1.41);
    expect(n).toBeGreaterThan(3.2);
    expect(n).toBeLessThan(3.5);
  });
  test('the pressure of the n = 0 star is the classic 3GM^2/(8 pi R^4)', () => {
    const s = polytropeStar(0, SOLAR_MASS_KG, SOLAR_RADIUS_M);
    expect(
      rel(
        s.pCentral,
        (3 * G_SI * SOLAR_MASS_KG ** 2) / (8 * Math.PI * SOLAR_RADIUS_M ** 4)
      )
    ).toBeLessThan(1e-9);
  });
  test('the interior approximation of a Stellar Lab star', () => {
    expect(
      interiorOf({
        phase: 'main-sequence',
        currentMassSun: 0.2,
        radiusSun: 0.22,
      }).n
    ).toBe(1.5);
    expect(
      interiorOf({ phase: 'main-sequence', currentMassSun: 1, radiusSun: 1 }).n
    ).toBe(3);
    expect(
      interiorOf({ phase: 'red-giant', currentMassSun: 1, radiusSun: 100 })
        .model
    ).toBe('none');
    expect(
      interiorOf({
        phase: 'white-dwarf',
        currentMassSun: 0.6,
        radiusSun: 0.013,
      }).model
    ).toBe('white-dwarf');
  });
});

describe('Homology', () => {
  test('the exponents reproduce the textbook cases', () => {
    const es = homologyExponents(OPACITY.electron, ENERGY.cno);
    expect(es.luminosityMass).toBeCloseTo(3, 12);
    expect(es.luminosityMu).toBe(4);
    const kr = homologyExponents(OPACITY.kramers, ENERGY.pp);
    expect(kr.radiativeM).toBeCloseTo(5.5, 12);
    expect(kr.radiativeR).toBeCloseTo(-0.5, 12);
    expect(kr.luminosityMu).toBeCloseTo(7.5, 12);
  });
  test('the radius exponent satisfies both luminosity laws at once', () => {
    for (const o of Object.values(OPACITY))
      for (const e of Object.values(ENERGY)) {
        const h = homologyExponents(o, e);
        const transport = h.radiativeM + h.radiativeR * h.x;
        const nuclear = 1 + e.lambda + e.nu - (3 * e.lambda + e.nu) * h.x;
        expect(transport).toBeCloseTo(nuclear, 10);
      }
  });
  test('structure scales as M/R^3, M^2/R^4 and M/R', () => {
    const s = structureScaling(2, 1.5);
    expect(s.density).toBeCloseTo(2 / 1.5 ** 3, 12);
    expect(s.pressure).toBeCloseTo(4 / 1.5 ** 4, 12);
    expect(s.temperature).toBeCloseTo(2 / 1.5, 12);
  });
  test("the Sun's timescales", () => {
    expect(rel(nuclearTimescaleYr(1, 1), 1.04e10)).toBeLessThan(0.02);
    expect(rel(kelvinHelmholtzYr(1, 1, 1), 3.14e7)).toBeLessThan(0.01);
    expect(rel(dynamicalSeconds(1, 1), 1593)).toBeLessThan(0.005);
  });
  test('the MIST zero-age models: luminosity slope falls from the low to the high masses', () => {
    const z = zeroAgeModels();
    expect(z.map(m => m.massSun)).toEqual([0.2, 0.5, 1, 2, 5, 10, 20, 40]);
    const high = z.filter(m => m.massSun >= 2);
    const lh = fitPowerLaw(
      high.map(m => m.massSun),
      high.map(m => m.luminositySun)
    );
    expect(lh.slope).toBeGreaterThan(2.9); // the electron-scattering exponent is 3
    expect(lh.slope).toBeLessThan(3.6);
    const mid = z.filter(m => m.massSun >= 0.5 && m.massSun <= 2);
    const lm = fitPowerLaw(
      mid.map(m => m.massSun),
      mid.map(m => m.luminositySun)
    );
    expect(lm.slope).toBeGreaterThan(4);
    expect(lm.slope).toBeLessThan(5.5);
    // No single power law fits the whole sequence: a residual of more than 0.1 dex.
    const all = fitPowerLaw(
      z.map(m => m.massSun),
      z.map(m => m.luminositySun)
    );
    expect(Math.max(...all.residuals.map(Math.abs))).toBeGreaterThan(0.1);
  });
  test('the nuclear timescale of the zero-age models tracks the MIST main-sequence life', () => {
    for (const m of zeroAgeModels().filter(q => q.massSun >= 0.5)) {
      const ratio =
        m.mainSequenceYr / nuclearTimescaleYr(m.massSun, m.luminositySun);
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(3);
    }
  });
});

describe('The white-dwarf mass-radius relation', () => {
  test('the equation of state has the textbook limits', () => {
    const A =
      (Math.PI * M_ELECTRON_KG ** 4 * 299792458 ** 5) / (3 * H_PLANCK ** 3);
    expect(rel(degeneratePressure(0.01), 1.6 * A * 0.01 ** 5)).toBeLessThan(
      5e-3
    );
    expect(rel(degeneratePressure(1000), 2 * A * 1000 ** 4)).toBeLessThan(2e-3);
    expect(fermiX(degenerateDensity(1.7))).toBeCloseTo(1.7, 12);
  });
  test('the mass rises with central density and the radius falls', () => {
    let last = whiteDwarf(0.1);
    for (const x of [0.3, 1, 3, 10, 30]) {
      const w = whiteDwarf(x);
      expect(w.massSun).toBeGreaterThan(last.massSun);
      expect(w.radiusSun).toBeLessThan(last.radiusSun);
      last = w;
    }
  });
  test('the limit emerges: the mass saturates at 1.456 as x_c grows, as the closed form says', () => {
    const masses = [10, 100, 1000, 10000].map(x => whiteDwarf(x).massSun);
    expect(masses[3]).toBeGreaterThan(masses[2]);
    expect(masses[3]).toBeLessThan(chandrasekharMassSun() * 1.0001);
    expect(rel(masses[3], chandrasekharMassSun())).toBeLessThan(2e-4);
    // Chandrasekhar's 5.836 / mu_e^2 solar masses, mu_e = 2.
    expect(rel(chandrasekharMassSun(), 5.836 / 4)).toBeLessThan(0.003);
    // And the mass never passes it: the largest dwarf of the grid is below.
    expect(whiteDwarf(1e5).massSun).toBeLessThan(chandrasekharMassSun());
  });
  test('a lower mu_e lowers the limit as 1/mu_e^2 (the same limit for carbon and helium, higher for hydrogen-rich)', () => {
    expect(
      rel(chandrasekharMassSun(1) / chandrasekharMassSun(2), 4)
    ).toBeLessThan(1e-12);
  });
  test('at low density M R^3 is the constant of the n = 3/2 polytrope', () => {
    const w = whiteDwarf(0.04);
    const muE = 2;
    const K =
      ((1 / 20) * (3 / Math.PI) ** (2 / 3) * H_PLANCK ** 2) /
      (M_ELECTRON_KG * (muE * M_UNIT_KG) ** (5 / 3));
    const p = polytrope(1.5);
    // M R^3 = 4 pi omega xi1^3 (5K / 8 pi G)^3, omega the dimensionless mass.
    const mr3 =
      4 * Math.PI * p.mass * p.xi1 ** 3 * ((5 * K) / (8 * Math.PI * G_SI)) ** 3;
    expect(rel(w.massKg * w.radiusM ** 3, mr3)).toBeLessThan(0.03);
  });
  test('the dwarf of a given mass: 0.6 solar masses has a radius of about 0.013 solar radii', () => {
    const w = whiteDwarf(centralXForMass(0.6));
    expect(rel(w.massSun, 0.6)).toBeLessThan(1e-6);
    expect(w.radiusSun).toBeGreaterThan(0.011);
    expect(w.radiusSun).toBeLessThan(0.015);
    expect(centralXForMass(1.5)).toBeNaN();
  });
});

describe('The Worker', () => {
  test('the protocol answers a table, a profile, a curve and an unknown request', () => {
    const out = [];
    handle({ id: 1, type: 'table' }, m => out.push(m));
    handle({ id: 2, type: 'polytrope', n: 1.5 }, m => out.push(m));
    handle({ id: 3, type: 'whiteDwarfCurve' }, m => out.push(m));
    handle({ id: 4, type: 'nope' }, m => out.push(m));
    handle({ id: 5, type: 'polytrope', n: 9 }, m => out.push(m));
    expect(out.map(m => m.type)).toEqual([
      'result',
      'result',
      'result',
      'error',
      'error',
    ]);
    expect(out[0].result).toHaveLength(10);
    expect(rel(out[1].result.xi1, 3.65375)).toBeLessThan(2e-5);
    expect(out[2].result).toHaveLength(41);
  });
  test('the client resolves through a Worker played in-process, and in place without one', async () => {
    const fake = () => {
      const w = {
        postMessage: data =>
          queueMicrotask(() => handle(data, m => w.onmessage({ data: m }))),
        terminate: jest.fn(),
      };
      return w;
    };
    const viaWorker = createStellarClient({ spawn: fake });
    expect((await viaWorker.request('table')).length).toBe(10);
    await expect(viaWorker.request('polytrope', { n: 7 })).rejects.toThrow(
      'index'
    );
    viaWorker.close();
    const inPlace = createStellarClient({ spawn: () => null });
    const sol = await inPlace.request('polytrope', { n: 3 });
    expect(rel(sol.xi1, 6.89685)).toBeLessThan(2e-5);
    expect(sol.xi1).toBe(solvePolytrope(3).xi1);
  });
});
