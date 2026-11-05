// =============================================================================
// Galaxy kernel: the 4000-angstrom break (B1, B2)
// -----------------------------------------------------------------------------
// breakIndex   MEASURED   D = <F_nu>_red / <F_nu>_blue over two rest-frame bands the caller
//                         states (a definition object with a source string and NO default: the
//                         published definitions' band edges are published numbers the kernel does
//                         not hold), observed at (1 + z) times their edges
//
// What D can say: a break is present, and how two galaxies order under one definition. What it
// cannot: an age without a population-synthesis calibration (not held here), a metallicity
// (age and metallicity move it together), anything about a galaxy whose bands carry emission
// lines or dust the analysis did not remove. Pure: no DOM, no clock.
// =============================================================================

import { refused } from '../statistics/check.js';
import { checkSpectrum, pixelWidths } from '../ism/spectrum.js';

const { Math, Number } = globalThis;

/** The relative error above which the break is not constrained. */
export const MAX_RELATIVE_ERROR = 0.25;
/** The significance, in sigma, at which a break is called present. */
export const PRESENT_SIGMAS = 3;
/** The fewest samples a band needs. */
export const MIN_BAND_SAMPLES = 8;

const notConstrained = (code, why, extra = {}) => ({
  status: 'not-constrained',
  code,
  why,
  ...extra,
});

/** A refusal if the definition is unusable, else null. */
function checkDefinition(def) {
  if (!def || typeof def !== 'object')
    return refused(
      'no-definition',
      'a break definition {name, blueNm, redNm, source} is required; there is no default'
    );
  if (typeof def.source !== 'string' || !def.source.trim())
    return refused(
      'missing-source',
      'a break definition needs a source string; the kernel holds no published band edges'
    );
  const ok = b =>
    Array.isArray(b) &&
    b.length === 2 &&
    Number.isFinite(b[0]) &&
    Number.isFinite(b[1]) &&
    b[0] < b[1];
  if (!ok(def.blueNm) || !ok(def.redNm))
    return refused(
      'bad-bands',
      'each band needs two increasing wavelengths in nm'
    );
  if (def.blueNm[1] > def.redNm[0])
    return refused(
      'bands-overlap-or-misordered',
      'the blue band must end before the red band begins'
    );
  return null;
}

/** One band's F_nu mean and its variance; null when the band cannot be read. */
function bandMean(spec, band, fluxKind, w) {
  const n = spec.lambdaNm.length;
  let sw = 0;
  let sf = 0;
  let count = 0;
  const idx = [];
  for (let i = 0; i < n; i++) {
    const x = spec.lambdaNm[i];
    if (x < band[0] || x > band[1]) continue;
    const fnu = fluxKind === 'f-lambda' ? x * x * spec.flux[i] : spec.flux[i];
    sw += w[i];
    sf += w[i] * fnu;
    idx.push(i);
    count++;
  }
  if (count < MIN_BAND_SAMPLES) return { count };
  const mean = sf / sw;
  let variance;
  let fromScatter = false;
  const scale = i =>
    fluxKind === 'f-lambda' ? spec.lambdaNm[i] * spec.lambdaNm[i] : 1;
  if (spec.sigma) {
    let v = 0;
    for (const i of idx) v += (w[i] * scale(i) * spec.sigma[i]) ** 2;
    variance = v / (sw * sw);
  } else {
    // errors from scatter: the residual about a straight line fitted in the band
    const xs = idx.map(i => spec.lambdaNm[i]);
    const ys = idx.map(i =>
      fluxKind === 'f-lambda' ? scale(i) * spec.flux[i] : spec.flux[i]
    );
    const m = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / m;
    const my = ys.reduce((a, b) => a + b, 0) / m;
    let sxx = 0;
    let sxy = 0;
    for (let a = 0; a < m; a++) {
      sxx += (xs[a] - mx) ** 2;
      sxy += (xs[a] - mx) * (ys[a] - my);
    }
    const slope = sxy / sxx;
    let rss = 0;
    for (let a = 0; a < m; a++)
      rss += (ys[a] - (my + slope * (xs[a] - mx))) ** 2;
    const s2 = rss / (m - 2);
    let v = 0;
    for (const i of idx) v += w[i] * w[i] * s2;
    variance = v / (sw * sw);
    fromScatter = true;
  }
  return { count, mean, variance, fromScatter };
}

/** The break at one redshift, no uncertainty from the redshift. */
function oneBreak(spec, def, z, fluxKind, w) {
  const f = 1 + z;
  const blue = bandMean(
    spec,
    [def.blueNm[0] * f, def.blueNm[1] * f],
    fluxKind,
    w
  );
  const red = bandMean(spec, [def.redNm[0] * f, def.redNm[1] * f], fluxKind, w);
  return { blue, red };
}

/**
 * The 4000-angstrom break of a spectrum.
 * @param {object} spec - lambdaNm ascending, flux, sigma or null (the medium is not needed)
 * @param {{definition: {name?: string, blueNm: [number, number], redNm: [number, number], source: string}, z: number, zSigma?: number, fluxKind: 'f-lambda'|'f-nu'}} o
 */
export function breakIndex(spec, { definition, z, zSigma = 0, fluxKind } = {}) {
  const bad = checkSpectrum(spec, { needMedium: false });
  if (bad) return bad;
  const badDef = checkDefinition(definition);
  if (badDef) return badDef;
  if (fluxKind !== 'f-lambda' && fluxKind !== 'f-nu')
    return refused(
      'flux-kind-missing',
      "the flux kind ('f-lambda' or 'f-nu') is required: the break is a ratio of F_nu"
    );
  if (!Number.isFinite(z) || !(z > -1))
    return refused(
      'bad-redshift',
      'the redshift must be a finite number above -1'
    );
  if (!(Number.isFinite(zSigma) && zSigma >= 0))
    return refused(
      'bad-redshift-error',
      'the redshift error must be finite and not negative'
    );
  const n = spec.lambdaNm.length;
  const w = pixelWidths(spec.lambdaNm);
  const lo = spec.lambdaNm[0] - 0.5 * w[0];
  const hi = spec.lambdaNm[n - 1] + 0.5 * w[n - 1];
  const f = 1 + z;
  for (const band of [definition.blueNm, definition.redNm])
    if (band[0] * f < lo || band[1] * f > hi)
      return refused(
        'band-outside-spectrum',
        `a band, observed at z = ${z}, lies outside the spectrum (${Math.round(lo)} to ${Math.round(hi)} nm)`
      );
  const { blue, red } = oneBreak(spec, definition, z, fluxKind, w);
  if (blue.count < MIN_BAND_SAMPLES || red.count < MIN_BAND_SAMPLES)
    return refused(
      'too-few-samples',
      `a band holds under ${MIN_BAND_SAMPLES} samples (blue ${blue.count}, red ${red.count})`
    );
  if (!(blue.mean > 0) || !(red.mean > 0))
    return refused(
      'non-positive-flux',
      'a band mean is not positive: the ratio is undefined'
    );
  const D = red.mean / blue.mean;
  let relVar =
    red.variance / (red.mean * red.mean) +
    blue.variance / (blue.mean * blue.mean);
  let dDdz = 0;
  if (zSigma > 0) {
    const e = zSigma;
    const hiB = oneBreak(spec, definition, z + e, fluxKind, w);
    const loB = oneBreak(spec, definition, z - e, fluxKind, w);
    const okHi =
      hiB.red.count >= MIN_BAND_SAMPLES && hiB.blue.count >= MIN_BAND_SAMPLES;
    const okLo =
      loB.red.count >= MIN_BAND_SAMPLES && loB.blue.count >= MIN_BAND_SAMPLES;
    if (okHi && okLo) {
      dDdz =
        (hiB.red.mean / hiB.blue.mean - loB.red.mean / loB.blue.mean) / (2 * e);
      relVar += (dDdz * zSigma) ** 2 / (D * D);
    }
  }
  const sigma = D * Math.sqrt(relVar);
  const limits =
    'D is a ratio of band means: it says whether a break is present and how two galaxies order under one definition; it carries no age without a population-synthesis calibration this kernel does not hold, age and metallicity move it together, dust and emission lines in the bands bias it, the redshift places the bands, and the aperture decides which light it sees';
  const out = {
    D,
    sigma,
    significance: (D - 1) / sigma,
    breakPresent: D - 1 > PRESENT_SIGMAS * sigma,
    definition: {
      name: definition.name ?? null,
      blueNm: [...definition.blueNm],
      redNm: [...definition.redNm],
      source: definition.source,
    },
    z,
    zSigma,
    dDdz,
    fluxKind,
    bands: {
      blue: { mean: blue.mean, samples: blue.count },
      red: { mean: red.mean, samples: red.count },
    },
    errorsFromScatter: Boolean(blue.fromScatter),
    limits,
  };
  if (sigma / D > MAX_RELATIVE_ERROR)
    return notConstrained(
      'noise-dominated',
      `the break's relative error ${Math.round((sigma / D) * 100) / 100} exceeds ${MAX_RELATIVE_ERROR}`,
      out
    );
  return { status: 'ok', ...out };
}
