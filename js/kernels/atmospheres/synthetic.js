// Synthetic eclipse depths and phase curves, each with its truth manifest (Prompt 202). No published table
// was available, so these are generated from the kernel with noise and say so. Seeded (mulberry32), rounded
// to fixed digits so the same seed gives the same bytes. ATMOSPHERES.md.
import { eclipseDepth } from './emission.js';
import { lambertPhase } from './phase.js';

/** The Lommel-Seeliger sphere's phase function, 1 at full phase (a different sphere, for the lesson's comparison). */
export const lommelSeeligerPhase = a =>
  a <= 0
    ? 1
    : a >= Math.PI
      ? 0
      : Math.max(
          0,
          1 - Math.sin(a / 2) * Math.tan(a / 2) * Math.log(1 / Math.tan(a / 4))
        );

export const SYNTHETIC_SEED = 202;
const NOTE =
  'synthetic: generated from the model with noise; no published table was compared';

function normals(seed) {
  let a = seed | 0;
  const u = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}
const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

/** Four named bands (micrometres) and a hot Jupiter's truth: the day-side temperature, the star, the radius ratio. */
export const ECLIPSE_BANDS = [
  { name: 'A', lo: 1.1, hi: 1.7 },
  { name: 'B', lo: 2.0, hi: 3.0 },
  { name: 'C', lo: 3.2, hi: 4.0 },
  { name: 'D', lo: 4.2, hi: 5.0 },
];
export const ECLIPSE_TRUTH = {
  tPlanet: 2100,
  tStar: 6000,
  radiusRatio: 0.12,
  semiMajorOverRp: 8,
  sigmaPpm: 40,
};

/** Eclipse depths in four bands for a uniform blackbody planet (and, with absorbingBand, one band seen through a skin). */
export function syntheticEclipse({
  seed = SYNTHETIC_SEED,
  absorbingBand = null,
  bandTau = 2,
} = {}) {
  const n = normals(seed);
  const t = ECLIPSE_TRUTH;
  const depthsPpm = ECLIPSE_BANDS.map(b => {
    const d = eclipseDepth({
      radiusRatio: t.radiusRatio,
      tPlanet: t.tPlanet,
      tStar: t.tStar,
      band: [b.lo * 1e-6, b.hi * 1e-6],
      bandTau: b.name === absorbingBand ? bandTau : 0,
    });
    return round(d.depth * 1e6 + t.sigmaPpm * n(), 1);
  });
  return {
    kind: 'eclipse-depths',
    synthetic: true,
    seed,
    bands: ECLIPSE_BANDS,
    depthsPpm,
    sigma: t.sigmaPpm,
    truth: { ...t, absorbingBand, bandTau: absorbingBand ? bandTau : 0 },
    note: NOTE,
  };
}

/** A phase curve of 24 phase angles (radians) from 0.1 to 3.04: a Lambert sphere or a Lommel-Seeliger sphere. */
export const PHASE_ANGLES = Array.from(
  { length: 24 },
  (_, i) => 0.1 + (2.94 * i) / 23
);
export const PHASE_TRUTH = { albedo: 0.35, semiMajorOverRp: 10, noise: 0.03 };

export function syntheticPhase({
  seed = SYNTHETIC_SEED,
  shape = 'lambert',
} = {}) {
  const n = normals(seed);
  const t = PHASE_TRUTH;
  const k = 1 / t.semiMajorOverRp ** 2;
  const sigma = t.noise * t.albedo * k;
  const f = shape === 'lambert' ? lambertPhase : lommelSeeligerPhase;
  const flux = PHASE_ANGLES.map(a =>
    round((t.albedo * k * f(a) + sigma * n()) * 1e6, 2)
  );
  return {
    kind: 'phase-curve',
    synthetic: true,
    seed,
    shape,
    alphas: PHASE_ANGLES.map(a => round(a, 4)),
    fluxPpm: flux,
    sigma: round(sigma * 1e6, 3),
    truth: { ...t, shape },
    note: NOTE,
  };
}
