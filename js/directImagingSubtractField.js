// =============================================================================
// The data behind the subtraction and orbit panels (Prompt 230 Part B, IMAGING_SUBTRACTION_GATE.md)
// -----------------------------------------------------------------------------
// Pure: no DOM. Everything a panel states is computed here by js/kernels/imaging/subtract.js and
// orbit.js (the modules the gate validated) and by Prompt 187's fitter, js/measure/orbit-fit.js,
// unchanged. The scenes are synthetic and seeded: a star and a reference star of the committed
// scene (a Moffat profile, sky and detector noise), a planet put in by injection, and for the orbit
// a planet whose true orbit is a number written here, so the panel can say what it truly was after
// the student has looked.
// =============================================================================

import { stream } from './random/streams.js';
import {
  DESIGN,
  NOT_MEASURABLE,
  detect,
  expectedSnr,
  injectPlanet,
  localNoise,
  measureAt,
  referenceMismatch,
  sceneFrame,
  subtract,
} from './kernels/imaging/subtract.js';
import {
  ORBIT_CONTRAST,
  PLATE_SCALE_ARCSEC,
  degeneracyMap,
  measureEpoch,
  seriesOf,
} from './kernels/imaging/orbit.js';
import { fitOrbit, positionsFromElements } from './measure/orbit-fit.js';

export { DESIGN, NOT_MEASURABLE, PLATE_SCALE_ARCSEC };

const STAR_FLUX = DESIGN.starRate * DESIGN.exposure;
export const CONTRASTS = [1e-3, 3e-3, 1e-2, 3e-2, 1e-1];
export const MISMATCH = ['matched', 'nominal', 'wide'];
export const SCENES = 6;

const last = { sub: null, orb: null };

/**
 * One subtraction scene.
 * @param {{sep: number, contrast: number, mismatch: number, scene: number}} v
 *   sep in FWHM of the planet from the star, contrast an index into CONTRASTS, mismatch 0 matched, 1 nominal, 2 reference 20 percent wider
 */
export function subtractionView(v) {
  const sep = Math.max(0.5, Math.min(10, Number(v.sep ?? 6)));
  const ci = Math.max(
    0,
    Math.min(CONTRASTS.length - 1, Math.round(v.contrast ?? 2))
  );
  const mi = Math.max(0, Math.min(2, Math.round(v.mismatch ?? 1)));
  const scene = Math.max(0, Math.min(SCENES - 1, Math.round(v.scene ?? 0)));
  const key = `${sep}:${ci}:${mi}:${scene}`;
  if (last.sub?.key === key) return last.sub;
  const size = DESIGN.detector.width;
  const c = size / 2;
  const fwhm = DESIGN.fwhm;
  const draw = stream('injection', 'dirSub', String(scene), String(mi));
  const mm =
    mi === 2
      ? referenceMismatch(draw, { eps: 0.2, rateFactor: 0.6 })
      : referenceMismatch(draw, { matched: mi === 0 });
  const phi = ((scene + 0.25) * Math.PI) / 3;
  const planet = {
    x: c + sep * fwhm * Math.cos(phi),
    y: c + sep * fwhm * Math.sin(phi),
    flux: CONTRASTS[ci] * STAR_FLUX,
  };
  const seed = `dirSub:${scene}:${mi}`;
  const bare = sceneFrame({ seed, label: 'target' });
  const target = injectPlanet(bare, planet, 'dirSub', [scene, mi, ci, sep]);
  const reference = sceneFrame({
    seed,
    label: 'reference',
    fwhm: fwhm * (1 + mm.eps),
    starRate: DESIGN.starRate * mm.rateFactor,
    star: { x: c + mm.dx, y: c + mm.dy },
  });
  const red = subtract(target, reference);
  const out = {
    key,
    size,
    sepFwhm: sep,
    contrast: CONTRASTS[ci],
    planet,
    injected: target.injected,
    starFlux: STAR_FLUX,
    workingFwhm: DESIGN.workingFwhm,
    depthLimit: DESIGN.mismatchDepth,
    raw: bare.counts,
    target: target.counts,
    reduction: red,
  };
  if (!red.ok) {
    out.refusal = { code: red.code, message: red.message, depth: red.depth };
    return (last.sub = out);
  }
  out.scale = red.k;
  out.depth = red.depth;
  out.noise = localNoise(red, planet.x, planet.y);
  out.limit = {
    flux: (5 * out.noise) / expectedSnr(1, 1),
    contrast: (5 * out.noise) / expectedSnr(1, 1) / STAR_FLUX,
  };
  out.measure = measureAt(red, planet.x, planet.y);
  out.search = detect(red);
  const hit =
    out.search.detected &&
    Math.hypot(out.search.x - planet.x, out.search.y - planet.y) <= 2;
  out.found = hit;
  out.foundElsewhere = out.search.detected && !hit;
  return (last.sub = out);
}

// ---- the orbit ---------------------------------------------------------------------

export const ARCS = [0.1, 0.3, 0.6, 1.1];
/** Three invented systems (a = 1 arcsecond, P = 10 years; angles in degrees, T in years). Synthetic, with a truth manifest. */
export const SYSTEMS = [
  { a: 1, P: 10, e: 0, i: 55, Omega: 40, omega: 0, T: 2000 },
  { a: 1, P: 10, e: 0.35, i: 50, Omega: 130, omega: 60, T: 2000 - 3 },
  { a: 1, P: 10, e: 0.5, i: 60, Omega: 80, omega: 200, T: 2000 - 6 },
];

/**
 * One planet followed for a stated share of its period: twelve epochs, each a frame pair reduced by
 * the subtraction pipeline, then Prompt 187's fitter and the independent map of the chi-squared.
 * @param {{system: number, arc: number}} v - indices into SYSTEMS and ARCS
 */
export function orbitView(v) {
  const si = Math.max(
    0,
    Math.min(SYSTEMS.length - 1, Math.round(v.system ?? 0))
  );
  const ai = Math.max(0, Math.min(ARCS.length - 1, Math.round(v.arc ?? 1)));
  const key = `${si}:${ai}`;
  if (last.orb?.key === key) return last.orb;
  const truth = SYSTEMS[si];
  const f = ARCS[ai];
  const dt = (f * truth.P) / 11;
  const draw = stream('injection', 'dirOrb', String(si), String(ai));
  const years = [];
  for (let i = 0; i < 12; i++)
    years.push(
      2000 + i * dt + (i === 0 || i === 11 ? 0 : (2 * draw() - 1) * 0.3 * dt)
    );
  const pos = positionsFromElements(truth, years);
  const epochs = years.map((year, i) => ({
    year,
    truth: pos[i],
    ...measureEpoch({
      seed: 'dirOrb',
      label: [String(si), String(ai), i],
      truth: pos[i],
    }),
  }));
  const series = seriesOf(epochs);
  const kept = series.epochs.length;
  const fit = fitOrbit(series, { depth: 'elliptical' });
  let map = null;
  if (kept >= 4)
    map = degeneracyMap(
      {
        years: series.epochs.map(e => e.time.value),
        x: series.epochs.map(e => e.x),
        y: series.epochs.map(e => e.y),
        sx: series.epochs.map(e => e.sx),
        sy: series.epochs.map(e => e.sy),
      },
      { perDecade: 12, phases: 24 }
    );
  const curve = [];
  for (let k = 0; k <= 200; k++)
    curve.push(
      positionsFromElements(truth, [truth.T + (k / 200) * truth.P])[0]
    );
  return (last.orb = {
    key,
    truth,
    arc: f,
    years,
    epochs,
    kept,
    lost: 12 - kept,
    fit,
    map,
    truthCurve: curve,
    scale: PLATE_SCALE_ARCSEC,
    contrast: ORBIT_CONTRAST,
    periodRange95: map ? map.periodRange(5.99) : null,
    eccentricityRange95: map ? map.eccentricityRange(5.99) : null,
  });
}
