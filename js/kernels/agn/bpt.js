// =============================================================================
// AGN kernel: the BPT classification and its limits (B1, B2)
// -----------------------------------------------------------------------------
// classifyBpt        DERIVED   x = log10(F_N / F_Halpha), y = log10(F_O / F_Hbeta) against two caller-supplied dividing
//                              curves y = a / (x - b) + c: star-forming, composite or AGN, with seeded class
//                              probabilities and a refusal when a line is not detected or the class is ambiguous
// measureBptLines    MEASURED  the four line fluxes from a spectrum with the ISM kernel's Gaussian fit, refusing a line
//                              outside the spectrum or blended with another
//
// The kernel holds no dividing curve and no forbidden-line wavelength: both are caller inputs with a source string. The
// result always carries the limits of a two-ratio classification. Pure given a seed.
// =============================================================================

import { refused } from '../statistics/check.js';
import { gaussian, stream } from '../../random/streams.js';
import { fitGaussianLine } from '../ism/measure.js';
import {
  checkSpectrum,
  dispersionAtIndex,
  lsfFwhmAt,
  nearestIndex,
} from '../ism/spectrum.js';

const { Math, Number } = globalThis;

/** The signal to noise every one of the four lines needs. */
export const BPT_MIN_SNR = 3;
/** The Monte Carlo draws of the class probability. */
export const BPT_DRAWS = 2000;
/** The probability a class needs to be assigned. */
export const BPT_P_MIN = 0.9;
/** The closest two BPT lines may be, in line-spread FWHMs, before they are a blend. */
export const BLEND_FWHM = 1.5;
/** The share of the distance to the nearest other line a fit window may cover. */
export const WINDOW_SHARE = 0.4;

/** What a two-ratio classification cannot say; returned with every result. */
export const BPT_LIMITS = Object.freeze([
  'two line ratios only: an object near a boundary is not classified by a sharper measurement of the same two ratios',
  'the boundary is a definition, not a law: it comes from the caller’s source and another definition moves objects across it',
  'no Seyfert-LINER split and no further subclass is made',
  'the Balmer line of the hydrogen ratio is not corrected for stellar absorption, which lowers the measured flux of H-beta',
  'one aperture: the fluxes are those of the light the aperture caught, and a nucleus diluted by its host reads as the host',
  'narrow lines only: a broad component on the hydrogen lines is not part of the classification',
  'every line needs a detection (a signal to noise of 3 here); an upper limit on a line gives no class',
]);

const curveY = (c, x) => c.a / (x - c.b) + c.c;

/** The class of a point against the two curves (rule B1). */
export function bptClass(x, y, definition) {
  const sf = definition.curves.starForming;
  const ag = definition.curves.agn;
  if (x >= ag.b || y > curveY(ag, x)) return 'agn';
  if (x < sf.b && y < curveY(sf, x)) return 'star-forming';
  return 'composite';
}

function checkDefinition(d) {
  if (!d || typeof d.source !== 'string' || !d.source.trim())
    return refused(
      'no-source',
      'the dividing curves need a source string; there is no default and none is built in'
    );
  const sf = d.curves?.starForming;
  const ag = d.curves?.agn;
  for (const c of [sf, ag])
    if (!c || !['a', 'b', 'c'].every(k => Number.isFinite(c[k])))
      return refused(
        'bad-curves',
        'each dividing curve needs finite a, b and c of y = a / (x - b) + c'
      );
  if (!(sf.b < ag.b))
    return refused(
      'bad-curves',
      'the star-forming curve’s asymptote must lie left of the AGN curve’s'
    );
  return null;
}

/**
 * The ratios of four line fluxes and their first-order errors.
 * @param {{ha: {flux: number, sigma: number}, hb: object, n: object, o: object}} lines
 */
export function bptRatios(lines) {
  const { ha, hb, n, o } = lines;
  const x = Math.log10(n.flux / ha.flux);
  const y = Math.log10(o.flux / hb.flux);
  const rel = l => l.sigma / l.flux;
  return {
    x,
    y,
    sigmaX: Math.hypot(rel(n), rel(ha)) / Math.LN10,
    sigmaY: Math.hypot(rel(o), rel(hb)) / Math.LN10,
  };
}

/**
 * Classify an object from four line fluxes with errors.
 * @param {{lines: {ha: object, hb: object, n: object, o: object}, definition: {source: string, curves: object}, snrMin?: number, draws?: number, pMin?: number, seed?: number|string}} o
 */
export function classifyBpt({
  lines,
  definition,
  snrMin = BPT_MIN_SNR,
  draws = BPT_DRAWS,
  pMin = BPT_P_MIN,
  seed = 'bpt',
} = {}) {
  const bad = checkDefinition(definition);
  if (bad) return bad;
  const names = ['ha', 'hb', 'n', 'o'];
  for (const k of names) {
    const l = lines?.[k];
    if (
      !l ||
      !Number.isFinite(l.flux) ||
      !(l.sigma >= 0) ||
      !Number.isFinite(l.sigma)
    )
      return refused(
        'bad-line',
        `line ${k} needs a finite flux and a finite, non-negative error`
      );
  }
  const weak = names.filter(
    k => !(lines[k].flux > 0 && lines[k].flux >= snrMin * lines[k].sigma)
  );
  if (weak.length)
    return {
      status: 'not-constrained',
      code: 'line-not-detected',
      why: `${weak.join(', ')} not detected at a signal to noise of ${snrMin}: a ratio of a line that is not detected gives no class`,
      lines: weak,
      limits: BPT_LIMITS,
    };
  const r = bptRatios(lines);
  const draw = gaussian(stream('noise', seed, 'bpt'));
  const counts = { 'star-forming': 0, composite: 0, agn: 0 };
  let valid = 0;
  for (let i = 0; i < draws; i++) {
    const f = {};
    let ok = true;
    for (const k of names) {
      const v = lines[k].flux + lines[k].sigma * draw();
      if (!(v > 0)) ok = false;
      f[k] = { flux: v, sigma: 0 };
    }
    if (!ok) continue;
    valid++;
    const t = bptRatios(f);
    counts[bptClass(t.x, t.y, definition)]++;
  }
  const probability = {
    'star-forming': counts['star-forming'] / valid,
    composite: counts.composite / valid,
    agn: counts.agn / valid,
  };
  const deterministic = bptClass(r.x, r.y, definition);
  const best = Object.entries(probability).sort((a, b) => b[1] - a[1])[0];
  const base = {
    ...r,
    probability,
    deterministicClass: deterministic,
    draws: valid,
    definitionSource: definition.source,
    limits: BPT_LIMITS,
  };
  if (best[1] < pMin)
    return {
      status: 'not-constrained',
      code: 'class-ambiguous',
      why: `no class has a probability of ${pMin}: the point is within its errors of a dividing curve`,
      ...base,
    };
  return { status: 'ok', class: best[0], ...base };
}

/**
 * The four BPT line fluxes from a spectrum, at a redshift.
 * @param {object} spec - a spectrum (medium and resolving power required)
 * @param {{z: number, rest: {ha: number, hb: number, n: number, o: number}, sources: {n: string, o: string}, halfWidthPx?: number}} o
 */
export function measureBptLines(spec, { z, rest, sources, halfWidthPx } = {}) {
  const bad = checkSpectrum(spec, { needResolution: true });
  if (bad) return bad;
  if (!Number.isFinite(z))
    return refused(
      'bad-redshift',
      'the redshift is an input (from the galaxy kernel’s tools) and must be finite'
    );
  const names = ['ha', 'hb', 'n', 'o'];
  if (!rest || !names.every(k => rest[k] > 0))
    return refused(
      'no-rest',
      'the four rest wavelengths (in the spectrum’s medium) are required'
    );
  if (!sources?.n || !sources?.o)
    return refused(
      'no-source',
      'the forbidden-line wavelengths need a source string each; none is built in'
    );
  const lam = spec.lambdaNm;
  const last = lam.length - 1;
  const obs = Object.fromEntries(names.map(k => [k, rest[k] * (1 + z)]));
  const outside = names.filter(k => {
    const margin =
      2 * lsfFwhmAt(spec, Math.min(Math.max(obs[k], lam[0]), lam[last]));
    return obs[k] - margin < lam[0] || obs[k] + margin > lam[last];
  });
  if (outside.length)
    return {
      status: 'not-constrained',
      code: 'line-outside-coverage',
      why: `${outside.join(', ')} fall outside the spectrum at this redshift: the ratios need all four lines`,
      lines: outside,
      limits: BPT_LIMITS,
    };
  let minSep = Infinity;
  let pair = null;
  for (let a = 0; a < 4; a++)
    for (let b = a + 1; b < 4; b++) {
      const s = Math.abs(obs[names[a]] - obs[names[b]]);
      if (s < minSep) {
        minSep = s;
        pair = [names[a], names[b]];
      }
    }
  const fwhm = lsfFwhmAt(spec, obs.ha);
  if (minSep < BLEND_FWHM * fwhm)
    return {
      status: 'not-constrained',
      code: 'unresolved-blend',
      why: `${pair.join(' and ')} are ${Math.round(minSep * 100) / 100} nm apart, under ${BLEND_FWHM} line-spread widths (${Math.round(fwhm * 100) / 100} nm each): their fluxes cannot be separated here`,
      lines: pair,
      limits: BPT_LIMITS,
    };
  const out = {};
  const flags = [];
  for (const k of names) {
    const i0 = nearestIndex(lam, obs[k]);
    const disp = dispersionAtIndex(lam, i0);
    let sepNearest = Infinity;
    for (const m of names)
      if (m !== k) sepNearest = Math.min(sepNearest, Math.abs(obs[k] - obs[m]));
    const defaultHalf = Math.max(
      8,
      Math.ceil((4 * lsfFwhmAt(spec, obs[k])) / disp)
    );
    const half =
      halfWidthPx ??
      Math.max(
        4,
        Math.min(defaultHalf, Math.floor((WINDOW_SHARE * sepNearest) / disp))
      );
    const fit = fitGaussianLine(spec, { guessNm: obs[k], halfWidthPx: half });
    if (fit.status !== 'ok' || !(fit.sigmaFlux > 0))
      return {
        status: 'not-constrained',
        code: 'line-fit-failed',
        why: `the fit of ${k} failed (${fit.code ?? fit.status})`,
        lines: [k],
        limits: BPT_LIMITS,
      };
    out[k] = {
      flux: fit.flux,
      sigma: fit.sigmaFlux,
      centreNm: fit.centreNm,
      fwhmNm: fit.fwhmNm,
    };
    if (fit.fwhmNm > 4 * fit.lsfFwhmNm) flags.push(`wide-line:${k}`);
  }
  return {
    status: 'ok',
    lines: out,
    flags,
    method:
      'a pixel-integrated Gaussian on a linear continuum for each line (the ISM kernel’s fit), the window the smaller of the default and 0.4 of the distance to the nearest other line',
    source: sources,
  };
}
