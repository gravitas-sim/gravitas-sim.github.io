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
