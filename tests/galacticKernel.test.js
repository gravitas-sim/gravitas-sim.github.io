// The galactic kernel (Roadmap II Prompt 92): transformation fixtures against
// published values, synthetic fields with known answers, and the three packs.
import {
  A_G,
  K_PM,
  hammerAitoff,
  icrsToGalactic,
  galacticToIcrs,
  propermotionToGalactic,
  spaceVelocity,
  spaceVelocities,
  solarMotion,
  solarMotionLsr,
  lsrCorrection,
  dispersion,
  fitOortConstants,
  fitAsymmetricDrift,
  fitMembership,
  countAbove,
  START_MODEL,
  curveAt,
  chiSquare,
  fitMassModel,
  enclosedMass,
} from '../js/kernels/galactic/index.js';
import { galaxyCurveAt } from '../js/darkMatter.js';
import { tableOf } from '../js/tableObservation.js';
import { galacticPack } from '../tools/authoring/galacticPacks.mjs';

const solarPack = galacticPack('solar');
const clusterPack = galacticPack('cluster');
const rotationPack = galacticPack('rotation');

const DEG = Math.PI / 180;
const rng = seed => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
const normal = r => {
  const u = Math.max(r(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
};

describe('galactic coordinates against published values', () => {
  // Position pairs Gaia DR3's own archive returns (gaiadr3.gaia_source ra, dec, l, b).
  const GAIA = [
    [
      48.106758982296924, 15.01820364099346, 166.29025871733043,
      -35.72127037341433,
    ],
    [
      56.27330933555613, 12.483081996156704, 175.3844514430763,
      -32.18471126003463,
    ],
    [
      51.3204244819222, 16.293372844896002, 168.15348810440727,
      -32.74982735638726,
    ],
    [
      57.68118397576409, 23.52015647663612, 167.69401631722664,
      -23.381744941910757,
    ],
    [
      57.085737538318455, 25.09070404108579, 166.10408482909543,
      -22.59508392222823,
    ],
    [
      57.47486405757491, 26.590165359140112, 165.29844444765064,
      -21.248801297809504,
    ],
    [
      37.22716840350559, 15.37875382175726, 154.93705310436297,
      -41.357120881693334,
    ],
    [
      45.10650047661677, 22.58874527749314, 158.14878395225065,
      -31.320099870200064,
    ],
  ];
  it('reproduces the l and b the Gaia archive gives for eight stars to 1e-6 degree', () => {
    for (const [ra, dec, l, b] of GAIA) {
      const g = icrsToGalactic(ra, dec);
      expect(Math.abs(g.l - l)).toBeLessThan(1e-6);
      expect(Math.abs(g.b - b)).toBeLessThan(1e-6);
    }
  });

  it('puts the defining directions where the Hipparcos frame does', () => {
    const { l, b } = icrsToGalactic(266.40498829, -28.93617776);
    expect(Math.min(l, 360 - l)).toBeLessThan(1e-4);
    expect(Math.abs(b)).toBeLessThan(1e-4);
    expect(icrsToGalactic(192.85948, 27.12825).b).toBeCloseTo(90, 6);
    const pole = galacticToIcrs(0, 90);
    expect(pole.ra).toBeCloseTo(192.85948, 4);
    expect(pole.dec).toBeCloseTo(27.12825, 4);
  });

  it("places Sgr A* at Reid and Brunthaler's l = 359.9442, b = -0.0462 and its proper motion at (-6.38, -0.20) mas/yr", () => {
    // Reid & Brunthaler 2004 (ApJ 616, 872): position (266.41682, -29.00781)
    // and equatorial proper motion (-3.151, -5.547) mas/yr; their Galactic
    // components are (-6.379, -0.202).
    const r = propermotionToGalactic(266.41682, -29.00781, -3.151, -5.547);
    expect(r.l).toBeCloseTo(359.9442, 3);
    expect(r.b).toBeCloseTo(-0.0462, 3);
    expect(Math.abs(r.pmL - -6.379)).toBeLessThan(0.01);
    expect(Math.abs(r.pmB - -0.202)).toBeLessThan(0.01);
  });

  it('is a rotation: round trips, orthonormal matrix, proper motion magnitude kept', () => {
    const r = rng(7);
    for (let i = 0; i < 200; i++) {
      const ra = r() * 360;
      const dec = Math.asin(2 * r() - 1) / DEG;
      const g = icrsToGalactic(ra, dec);
      const back = galacticToIcrs(g.l, g.b);
      expect(Math.abs(((back.ra - ra + 540) % 360) - 180)).toBeLessThan(1e-9);
      expect(back.dec).toBeCloseTo(dec, 9);
      const pm = propermotionToGalactic(
        ra,
        dec,
        normal(r) * 30,
        normal(r) * 30
      );
      expect(pm.l).toBeCloseTo(g.l, 9);
    }
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(A_G[i].reduce((a, v, k) => a + v * A_G[j][k], 0)).toBeCloseTo(
          i === j ? 1 : 0,
          12
        );
    const m = propermotionToGalactic(10, 30, 12, -5);
    expect(Math.hypot(m.pmL, m.pmB)).toBeCloseTo(13, 9);
  });

  it('projects the sky with Hammer-Aitoff: centre, anticentre, poles, and l increasing to the left', () => {
    expect(hammerAitoff(0, 0)).toEqual({ x: -0, y: 0 });
    expect(hammerAitoff(180, 0).x).toBeCloseTo(-2 * Math.SQRT2, 12);
    expect(hammerAitoff(0, 90).y).toBeCloseTo(Math.SQRT2, 12);
    expect(hammerAitoff(90, 0).x).toBeLessThan(0);
    expect(hammerAitoff(270, 0).x).toBeGreaterThan(0);
  });
});

// A velocity field of known A, B and solar motion, in the model's own terms.
function fieldStar(l, b, d, U, V, W, A, B, Sun) {
  // Stellar velocity relative to the Sun: Oort field plus the reflex of the Sun's motion.
  const L = l * DEG;
  const Bb = b * DEG;
  const vl =
    d * (A * Math.cos(2 * L) + B) + (Sun.U * Math.sin(L) - Sun.V * Math.cos(L));
  const vb = 0;
  const vr = 0;
  return { vl, vb, vr, L, Bb, d, U, V, W };
}

describe('space velocity, solar motion and the Oort constants', () => {
  it('inverts the velocity-to-astrometry relation', () => {
    const r = rng(11);
    for (let i = 0; i < 50; i++) {
      const l = r() * 360;
      const b = (r() - 0.5) * 120;
      const d = 0.05 + r() * 0.5;
      const [U, V, W] = [normal(r) * 30, normal(r) * 20, normal(r) * 15];
      const [cl, sl, cb, sb] = [
        Math.cos(l * DEG),
        Math.sin(l * DEG),
        Math.cos(b * DEG),
        Math.sin(b * DEG),
      ];
      const rv = U * cb * cl + V * cb * sl + W * sb;
      const vl = -U * sl + V * cl;
      const vb = -U * sb * cl - V * sb * sl + W * cb;
      const pmL = vl / (K_PM * d);
      const pmB = vb / (K_PM * d);
      // Galactic proper motion back to equatorial: the transpose of A_G on the vector.
      const { ra, dec } = galacticToIcrs(l, b);
      const gl = [-sl, cl, 0];
      const gb = [-cl * sb, -sl * sb, cb];
      const vg = [0, 1, 2].map(k => gl[k] * pmL + gb[k] * pmB);
      const ve = [0, 1, 2].map(
        k => A_G[0][k] * vg[0] + A_G[1][k] * vg[1] + A_G[2][k] * vg[2]
      );
      const east = [-Math.sin(ra * DEG), Math.cos(ra * DEG), 0];
      const north = [
        -Math.cos(ra * DEG) * Math.sin(dec * DEG),
        -Math.sin(ra * DEG) * Math.sin(dec * DEG),
        Math.cos(dec * DEG),
      ];
      const s = spaceVelocity({
        ra,
        dec,
        parallax: 1 / d,
        pmRa: ve[0] * east[0] + ve[1] * east[1],
        pmDec: ve[0] * north[0] + ve[1] * north[1] + ve[2] * north[2],
        rv,
      });
      expect(s.U).toBeCloseTo(U, 6);
      expect(s.V).toBeCloseTo(V, 6);
      expect(s.W).toBeCloseTo(W, 6);
    }
  });

  it('returns null without a positive parallax, and drops such stars from a sample', () => {
    expect(
      spaceVelocity({ ra: 1, dec: 1, parallax: 0, pmRa: 1, pmDec: 1, rv: 1 })
    ).toBeNull();
    expect(
      spaceVelocities([
        { ra: 1, dec: 1, parallax: -1, pmRa: 1, pmDec: 1, rv: 1 },
      ])
    ).toEqual([]);
  });

  it('finds the Sun moving opposite to the mean of the stars, its speed and its apex', () => {
    const v = [];
    const r = rng(3);
    for (let i = 0; i < 4000; i++)
      v.push({
        U: -10 + normal(r) * 35,
        V: -22 + normal(r) * 25,
        W: -8 + normal(r) * 20,
      });
    const m = solarMotion(v);
    expect(Math.abs(m.U - 10)).toBeLessThan(3 * m.errU);
    expect(Math.abs(m.V - 22)).toBeLessThan(3 * m.errV);
    expect(Math.abs(m.W - 8)).toBeLessThan(3 * m.errW);
    expect(m.speed).toBeCloseTo(Math.hypot(m.U, m.V, m.W), 12);
    expect(m.apexL).toBeCloseTo((Math.atan2(m.V, m.U) / DEG + 360) % 360, 9);
    expect(m.apexB).toBeGreaterThan(0);
    expect(m.sigma.U).toBeCloseTo(35, -1);
    expect(solarMotionLsr(v).V).toBeCloseTo(m.V - lsrCorrection(m.sigma.U), 12);
    expect(lsrCorrection(40)).toBeCloseTo(20, 12);
  });

  it('gives dispersion errors as sigma/sqrt(n) and sigma/sqrt(2(n-1))', () => {
    const d = dispersion([1, 2, 3, 4, 5]);
    expect(d.mean).toBe(3);
    expect(d.sigma).toBeCloseTo(Math.sqrt(2.5), 12);
    expect(d.meanErr).toBeCloseTo(d.sigma / Math.sqrt(5), 12);
    expect(d.sigmaErr).toBeCloseTo(d.sigma / Math.sqrt(8), 12);
    expect(dispersion([1]).sigma).toBeNaN();
  });

  it('recovers A, B and the Sun from a noiseless field', () => {
    const A = 15.3;
    const B = -11.9;
    const Sun = { U: 10, V: 12 };
    const stars = [];
    const r = rng(5);
    for (let i = 0; i < 300; i++) {
      const l = r() * 360;
      const b = (r() - 0.5) * 20;
      const d = 0.2 + r() * 0.8;
      // Build the proper motion in l directly; b-motion zero.
      const f = fieldStar(l, 0, d, 0, 0, 0, A, B, Sun);
      const pmL = f.vl / (K_PM * d);
      const { ra, dec } = galacticToIcrs(l, 0);
      const gl = [-Math.sin(l * DEG), Math.cos(l * DEG), 0];
      const ve = [0, 1, 2].map(
        k =>
          A_G[0][k] * gl[0] * pmL +
          A_G[1][k] * gl[1] * pmL +
          A_G[2][k] * gl[2] * pmL
      );
      const east = [-Math.sin(ra * DEG), Math.cos(ra * DEG), 0];
      const north = [
        -Math.cos(ra * DEG) * Math.sin(dec * DEG),
        -Math.sin(ra * DEG) * Math.sin(dec * DEG),
        Math.cos(dec * DEG),
      ];
      stars.push({
        ra,
        dec,
        parallax: 1 / d,
        pmRa: ve[0] * east[0] + ve[1] * east[1],
        pmDec: ve[0] * north[0] + ve[1] * north[1] + ve[2] * north[2],
      });
      void b;
    }
    const o = fitOortConstants(stars, { weight: 'none' });
    expect(o.A).toBeCloseTo(A, 6);
    expect(o.B).toBeCloseTo(B, 6);
    expect(o.solarU).toBeCloseTo(Sun.U, 6);
    expect(o.solarV).toBeCloseTo(Sun.V, 6);
    expect(o.omega).toBeCloseTo(A - B, 6);
    expect(() => fitOortConstants(stars.slice(0, 3))).toThrow(/too few/);
  });

  it('extrapolates the drift line to the LSR: an exact line returns its intercept and slope', () => {
    // Groups with mean V = -(Vsun) - sigmaU^2/80.
    const groups = [400, 900, 1600, 2500].map(s2 => {
      const sU = Math.sqrt(s2);
      const out = [];
      const r = rng(Math.round(s2));
      for (let i = 0; i < 400; i++) {
        const u = normal(r);
        out.push({ U: u * sU, V: -12 - s2 / 80 + normal(r) * 5, W: 0 });
      }
      return out;
    });
    const f = fitAsymmetricDrift(groups);
    expect(f.vSun).toBeCloseTo(12, 0);
    expect(f.k).toBeGreaterThan(70);
    expect(f.k).toBeLessThan(90);
    expect(() => fitAsymmetricDrift(groups.slice(0, 2))).toThrow(/too few/);
  });
});

describe('membership as a probability', () => {
  it('finds a cluster in a field and gives probabilities, not labels', () => {
    const r = rng(21);
    const stars = [];
    for (let i = 0; i < 150; i++) {
      const e = 0.1;
      stars.push({
        x: [
          -1.2 + normal(r) * 0.15,
          -2.1 + normal(r) * 0.15,
          0.3 + normal(r) * 0.04,
        ],
        e: [e, e, 0.04],
        truth: 1,
      });
    }
    for (let i = 0; i < 600; i++)
      stars.push({
        x: [normal(r) * 4, -1 + normal(r) * 4, 1 + normal(r) * 1],
        e: [0.1, 0.1, 0.05],
        truth: 0,
      });
    const fit = fitMembership(stars, {
      cluster: [-1, -2, 0.4],
      clusterSigma: [0.3, 0.3, 0.1],
      field: [0, 0, 1],
      fieldSigma: [3, 3, 1],
      fraction: 0.2,
    });
    expect(fit.converged).toBe(true);
    expect(Math.abs(fit.cluster.mean[0] + 1.2)).toBeLessThan(0.05);
    expect(Math.abs(fit.cluster.mean[1] + 2.1)).toBeLessThan(0.05);
    expect(fit.fraction).toBeCloseTo(0.2, 1);
    expect(countAbove(fit.p, 0.5)).toBeGreaterThan(120);
    // A cluster star at the centre is far likelier than a field star far from it.
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    const pc = mean(fit.p.slice(0, 150));
    const pf = mean(fit.p.slice(150));
    expect(pc).toBeGreaterThan(0.8);
    expect(pf).toBeLessThan(0.1);
    // Some stars are neither: probabilities between the extremes exist.
    expect(Array.from(fit.p).some(p => p > 0.1 && p < 0.9)).toBe(true);
    expect(fit.expected).toBeCloseTo(fit.fraction * stars.length, 6);
  });
});

describe('the rotation-curve model', () => {
  it('is the darkMatter model, reused', () => {
    for (const rr of [1, 4, 8, 15, 30])
      expect(curveAt(rr, START_MODEL)).toEqual(galaxyCurveAt(rr, START_MODEL));
    expect(enclosedMass(8, 220)).toBeCloseTo(
      (220 * 220 * 8) / 4.30091727e-6,
      0
    );
  });

  it('recovers the parameters of a noiseless curve it can represent', () => {
    const truth = {
      ...START_MODEL,
      discMass: 5.5e10,
      discScale: 2.8,
      haloVFlat: 180,
      haloCore: 6,
    };
    const pts = [];
    for (let rr = 2; rr <= 25; rr += 1)
      pts.push({ r: rr, v: curveAt(rr, truth).total, err: 3 });
    const f = fitMassModel(pts);
    expect(f.chi2).toBeLessThan(1);
    expect(chiSquare(pts, truth).chi2).toBeCloseTo(0, 9);
    // Compare curves, not parameters: halo and disk trade off.
    for (const p of pts)
      expect(Math.abs(curveAt(p.r, f.model).total - p.v)).toBeLessThan(2);
  });
});

describe('the packs', () => {
  const solar = tableOf(solarPack);
  const cluster = tableOf(clusterPack);
  const rot = tableOf(rotationPack);
  const col = (t, id) => t.columns.find(c => c.id === id).values;

  it('are Gaia DR3 under the non-commercial licence, marked so, and the rotation curve is not', () => {
    expect(solarPack.PACK.license.nonCommercial).toBe(true);
    expect(solarPack.PACK.license.status).toBe('cc-by-nc-3.0-igo');
    expect(clusterPack.PACK.license.nonCommercial).toBe(true);
    expect(rotationPack.PACK.license.nonCommercial).toBeUndefined();
    expect(rotationPack.PACK.license.status).toBe('no-license-stated');
    expect(solar.n).toBe(1570);
    expect(cluster.n).toBe(993);
    expect(rot.n).toBe(151);
  });

  const stars = Array.from({ length: solar.n }, (_, i) => ({
    ra: col(solar, 'ra')[i],
    dec: col(solar, 'dec')[i],
    parallax: col(solar, 'parallax')[i],
    pmRa: col(solar, 'pmra')[i],
    pmDec: col(solar, 'pmdec')[i],
    rv: col(solar, 'rv')[i],
    bp: col(solar, 'bp_rp')[i],
  }));

  it("measure the Sun's motion within 3 km/s of Schonrich et al. 2010 in U and W, from stars within 100 pc", () => {
    const m = solarMotion(spaceVelocities(stars, { maxDistance: 0.1 }));
    expect(m.n).toBeGreaterThan(400);
    expect(Math.abs(m.U - 11.1)).toBeLessThan(3);
    expect(Math.abs(m.W - 7.25)).toBeLessThan(3);
    // Relative to the mean of these stars V is larger: the sample lags the rotation.
    expect(m.V).toBeGreaterThan(15);
    expect(
      solarMotionLsr(spaceVelocities(stars, { maxDistance: 0.1 })).V
    ).toBeCloseTo(m.V - lsrCorrection(m.sigma.U), 9);
  });

  it('give the Oort constants their signs and sizes, A = 13.5 and B = -13.7 km/s/kpc, each within 3 sigma of the literature', () => {
    const o = fitOortConstants(stars);
    expect(o.n).toBe(solar.n);
    expect(o.A).toBeGreaterThan(8);
    expect(o.B).toBeLessThan(-8);
    // Bovy 2017 (ApJ 833, 31): A = 15.3, B = -11.9 km/s/kpc.
    expect(Math.abs(o.A - 15.3)).toBeLessThan(3 * o.errA);
    expect(Math.abs(o.B - -11.9)).toBeLessThan(3 * o.errB);
    expect(o.omega).toBeGreaterThan(20);
    expect(o.omega).toBeLessThan(35);
  });

  it('find NGC 2420 as a proper-motion and parallax clump of several hundred members', () => {
    const c = id => col(cluster, id);
    const s = Array.from({ length: cluster.n }, (_, i) => ({
      x: [c('pmra')[i], c('pmdec')[i], c('parallax')[i]],
      e: [c('pmra_err')[i], c('pmdec_err')[i], c('parallax_err')[i]],
    }));
    const fit = fitMembership(s, {
      cluster: [-1, -2, 0.3],
      clusterSigma: [0.3, 0.3, 0.05],
      field: [0, -1, 1],
      fieldSigma: [3, 3, 1],
      fraction: 0.3,
    });
    expect(fit.converged).toBe(true);
    expect(countAbove(fit.p, 0.5)).toBeGreaterThan(300);
    expect(Math.abs(fit.cluster.mean[0] + 1.2)).toBeLessThan(0.3);
    expect(Math.abs(fit.cluster.mean[1] + 2.1)).toBeLessThan(0.3);
  });

  it('give a Milky Way curve the halo has to explain: baryons within physical bounds cannot reach it', () => {
    const pts = [];
    for (let i = 0; i < rot.n; i++) {
      const r = col(rot, 'r')[i];
      if (col(rot, 'v0')[i] === 244 && r >= 2 && r < 25)
        pts.push({
          r,
          v: col(rot, 'vc')[i],
          err: Math.max(col(rot, 'vc_err')[i], 3),
        });
    }
    const withHalo = fitMassModel(pts);
    const without = fitMassModel(pts, { noHalo: true });
    expect(without.reduced).toBeGreaterThan(5 * withHalo.reduced);
    expect(withHalo.model.discMass).toBeLessThanOrEqual(8.0001e10);
    expect(withHalo.model.haloVFlat).toBeGreaterThan(100);
  });
});
