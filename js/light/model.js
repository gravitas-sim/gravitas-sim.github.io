// =============================================================================
// The Light Lab's arithmetic
// -----------------------------------------------------------------------------
// Pure functions over the radiation kernel (js/kernels/radiation): no DOM, no
// state, so the instruments, the lessons' headless grading and the tests all
// read one set of numbers. Nothing here is physics the kernel does not hold;
// what is here is the part the kernel leaves out because it is about eyes
// (the color of a blackbody) or about a teaching model (the Boltzmann ratio).
// =============================================================================

import { planckLambda } from '../kernels/radiation/planck.js';
import { K_BOLTZMANN } from '../kernels/radiation/constants.js';
import { zFromVelocity } from '../kernels/radiation/doppler.js';
import { measureLine } from '../measure/spectrumLine.js';

const { exp, pow } = Math;

// CIE 1931 color-matching functions, the multi-lobe Gaussian fit of Wyman,
// Sloan & Shirley 2013 (JCGT 2, 1-11). It is a fit: its error against the
// tabulated functions is a percent or two of the peak, which moves a displayed
// color by much less than a screen's own variation. The swatch is a picture
// and no lesson grades it; the chromaticity is checked against the Planckian
// locus (tests/lightModel.test.js).
const lobe = (l, mu, s1, s2) =>
  exp(-0.5 * ((l - mu) / (l < mu ? s1 : s2)) ** 2);
const cmf = l => [
  1.056 * lobe(l, 599.8, 37.9, 31.0) +
    0.362 * lobe(l, 442.0, 16.0, 26.7) -
    0.065 * lobe(l, 501.1, 20.4, 26.2),
  0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1),
  1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8),
];

/** Tristimulus values of a blackbody, up to a scale: B_lambda against the CMFs. */
export function blackbodyXYZ(T) {
  let X = 0;
  let Y = 0;
  let Z = 0;
  for (let l = 380; l <= 780; l += 5) {
    const b = planckLambda(l * 1e-9, T);
    const [x, y, z] = cmf(l);
    X += b * x;
    Y += b * y;
    Z += b * z;
  }
  return [X, Y, Z];
}

/** CIE 1931 chromaticity (x, y) of a blackbody. */
export function blackbodyChromaticity(T) {
  const [X, Y, Z] = blackbodyXYZ(T);
  const s = X + Y + Z;
  return { x: X / s, y: Y / s };
}

/**
 * The color to paint a blackbody: sRGB, 0 to 255. Scaled so the brightest
 * channel is full (it is a hue, not a brightness), a channel the screen cannot
 * make (a 20,000 K blackbody is bluer than sRGB's red can be) is clipped at
 * zero, and the result gamma-encoded.
 */
export function blackbodyRgb(T) {
  const [X, Y, Z] = blackbodyXYZ(T);
  const lin = [
    3.2406 * X - 1.5372 * Y - 0.4986 * Z,
    -0.9689 * X + 1.8758 * Y + 0.0415 * Z,
    0.0557 * X - 0.204 * Y + 1.057 * Z,
  ];
  const top = Math.max(...lin);
  return lin.map(c => {
    const u = Math.max(0, c / top);
    return Math.round(
      255 * (u <= 0.0031308 ? 12.92 * u : 1.055 * pow(u, 1 / 2.4) - 0.055)
    );
  });
}

/** An sRGB triple as a CSS color. */
export const rgbCss = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;

/**
 * The Boltzmann ratio of hydrogen atoms in n = 2 to n = 1 at temperature T,
 * (g2 / g1) exp(-(E2 - E1) / kT) with g = 2 n^2 and E2 - E1 = 10.2 eV (the
 * Lyman-alpha energy, 13.6 eV x 3/4, rounded to the 10.2 eV a course states).
 * A MODEL: it is the Boltzmann factor alone. It leaves out ionisation (the
 * Saha equation), which is why real Balmer lines peak near 10,000 K and then
 * weaken, where this ratio keeps rising.
 */
export const BALMER_EXCITATION_EV = 10.2;
const EV_J = 1.602176634e-19; // exact (SI 2019)
export const boltzmannRatio21 = T =>
  4 * exp(-(BALMER_EXCITATION_EV * EV_J) / (K_BOLTZMANN * T));

// -----------------------------------------------------------------------------
// Synthetic spectra for the spectrum viewer (Lines and Motion)
// -----------------------------------------------------------------------------
// A MODEL, built to be measured: a 5,800 K Planck continuum (the radiation
// kernel's), four Gaussian absorption lines at their rest wavelengths from the
// line-list pack, the whole thing Doppler shifted (the relativistic form, which
// is also the kernel's) and sampled on the SDSS grid, with white noise from a
// seeded generator so every machine draws the same spectrum. The lines'
// depths and widths are round numbers chosen to look like a G star's, not a
// fit to any star. The true velocity belongs to the lesson's answer key and is
// never shown on a student's screen.
// -----------------------------------------------------------------------------

/** The lines every synthetic spectrum has: pack id, vacuum rest Angstroms, depth, sigma (A). */
export const SYNTH_LINES = Object.freeze([
  { id: 'h-alpha', rest: 6564.603, depth: 0.55, sigma: 3.6 },
  { id: 'h-beta', rest: 4862.708, depth: 0.5, sigma: 3.4 },
  { id: 'h-gamma', rest: 4341.692, depth: 0.45, sigma: 3.2 },
  { id: 'ca2-k', rest: 3934.777, depth: 0.6, sigma: 3.0 },
]);

/** The synthetic stars: a shift the student has to measure, and a signal to noise. */
export const SYNTH_STARS = Object.freeze([
  { id: 's1', vKmS: 85, snr: 100, seed: 1101 },
  { id: 's2', vKmS: -142, snr: 100, seed: 2202 },
  { id: 's3', vKmS: 12, snr: 15, seed: 3308 },
]);

/** mulberry32: a small seeded generator (Tommy Ettinger), uniform on [0, 1). */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One synthetic spectrum on the given wavelength grid, Angstroms.
 * @param {ArrayLike<number>} lambdaA - Observed wavelengths, vacuum Angstroms
 * @param {{vKmS: number, snr: number, seed: number}} star - Truth and noise
 * @returns {Float64Array} Flux, a continuum of about 1 at 5,500 Angstroms
 */
export function syntheticFlux(lambdaA, { vKmS, snr, seed }) {
  const z = zFromVelocity(vKmS);
  const next = rng(seed);
  const T = 5800;
  const norm = planckLambda(550e-9, T);
  const out = new Float64Array(lambdaA.length);
  for (let i = 0; i < lambdaA.length; i++) {
    const lam = lambdaA[i];
    let f = planckLambda(lam * 1e-10, T) / norm;
    let dip = 0;
    for (const L of SYNTH_LINES) {
      const c = L.rest * (1 + z);
      dip += L.depth * exp(-0.5 * ((lam - c) / L.sigma) ** 2);
    }
    f *= 1 - Math.min(dip, 0.95);
    // Box-Muller from two uniforms; 1 - u keeps the logarithm finite.
    const g =
      Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
    out[i] = f + (g * Math.max(f, 0.3)) / snr;
  }
  return out;
}

/**
 * The lines the viewer measures, by line-list id: the windows (Angstroms, about
 * the rest wavelength) the measurement node (js/measure/spectrumLine.js) fits
 * its continuum and sums its equivalent width in. The three Balmer rows are
 * that node's own presets; Ca II K is narrower on the blue side of the
 * Ca II H and H-epsilon blend, so its windows are tighter.
 */
export const VIEW_LINES = Object.freeze([
  { id: 'h-alpha', half: 20, gap: 25, side: 40 },
  { id: 'h-beta', half: 15, gap: 20, side: 30 },
  { id: 'h-gamma', half: 12, gap: 15, side: 25 },
  { id: 'ca2-k', half: 8, gap: 12, side: 25 },
]);

/** The synthetic spectrum's wavelength grid about one line: 0.5 A steps, +-100 A. */
export function syntheticGrid(restA) {
  const x = [];
  for (let l = restA - 100; l <= restA + 100 + 1e-9; l += 0.5) x.push(l);
  return x;
}

/**
 * The measurement the viewer reports for one line of one spectrum, by the
 * measurement node (js/measure/spectrumLine.js) unchanged. The first pass puts
 * its windows about the REST wavelength, since an observer does not yet know
 * the shift; each later pass puts them about the centre the last one found,
 * and three passes are enough for a shift of a few hundred km/s (a broad line
 * with wings, such as the A star's H-alpha, otherwise leaks into a continuum
 * window that is off its own centre). The velocity is c times the shift over
 * the rest wavelength, non-relativistic: the form is stated on screen, and the
 * two forms differ by 0.0008 percent at 250 km/s.
 * @returns {object} The node's result, plus `shiftA` and the `windows` used
 */
export function measureViewLine(x, y, restA, windows, passes = 3) {
  let c = restA;
  let r = null;
  let w = null;
  for (let pass = 0; pass < passes; pass++) {
    w = {
      line: [c - windows.half, c + windows.half],
      blue: [c - windows.gap - windows.side, c - windows.gap],
      red: [c + windows.gap, c + windows.gap + windows.side],
      rest: restA,
    };
    r = measureLine({ x, y }, w);
    if (r.center === null || !Number.isFinite(r.center)) break;
    c = r.center;
  }
  return {
    ...r,
    shiftA: r.center === null ? null : r.center - restA,
    windows: w,
  };
}

/**
 * The lines a dip is named after. Ca II H is left out (it sits 1.6 A from
 * H-epsilon, closer than a pixel of the SDSS spectra here, so a dip there
 * cannot be given to one of the two), as are the rest of the Balmer series and
 * the other two members of the Mg b triplet and the Na D doublet (each within
 * a few Angstroms of the one kept, and the search window is wider than that).
 */
export const DIP_IDS = Object.freeze([
  'h-alpha',
  'h-beta',
  'h-gamma',
  'h-delta',
  'ca2-k',
  'ca1-4227',
  'na1-d2',
  'mg1-b2',
]);

/**
 * The deepest dips in a spectrum, each with the line list's name for what
 * could cause it: a dip within `tolA` of a rest wavelength (the search is wide
 * enough for a few hundred km/s) as deep as 1 minus the dip's lowest flux over
 * the mean flux in a window on each side. A guide to where to look, not a line
 * measurement.
 * @param {ArrayLike<number>} x - Wavelength, Angstroms
 * @param {ArrayLike<number>} y - Flux
 * @param {Array<{id: string, name: string, vacuum: number}>} lines - Pack lines (nm)
 * @param {number} n - How many to return
 */
export function deepestDips(x, y, lines, n = 5, tolA = 8) {
  const out = [];
  lines = lines.filter(l => DIP_IDS.includes(l.id));
  const mean = (a, b) => {
    let s = 0;
    let k = 0;
    for (let i = 0; i < x.length; i++)
      if (x[i] >= a && x[i] <= b) {
        s += y[i];
        k++;
      }
    return k ? s / k : NaN;
  };
  for (const line of lines) {
    const rest = line.vacuum * 10;
    if (rest - 70 < x[0] || rest + 70 > x[x.length - 1]) continue;
    let low = Infinity;
    for (let i = 1; i < x.length - 1; i++)
      if (Math.abs(x[i] - rest) <= tolA)
        low = Math.min(low, (y[i - 1] + y[i] + y[i + 1]) / 3);
    const ref = (mean(rest - 60, rest - 25) + mean(rest + 25, rest + 60)) / 2;
    if (Number.isFinite(low) && ref > 0)
      out.push({ line, restA: rest, depth: 1 - low / ref });
  }
  return out.sort((p, q) => q.depth - p.depth).slice(0, n);
}
