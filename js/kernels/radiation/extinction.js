// =============================================================================
// Radiation kernel: interstellar extinction
// -----------------------------------------------------------------------------
// The law is Cardelli, Clayton & Mathis 1989 (ApJ 345, 245), eqs. 1-4 with
// their Table 3 coefficients, as published (not the O'Donnell 1994 revision).
//
//      A(lambda) / A(V) = a(x) + b(x) / R_V,    x = 1 / lambda in um^-1
//
// Valid 0.3 <= x <= 8 um^-1 (3.33 um to 125 nm). The coefficients are data
// (the extinction pack); this module is the arithmetic. Outside the valid range
// the functions return NaN: the law is not extrapolated.
// =============================================================================

const polyAt = (c, y) => {
  let v = 0;
  for (let i = c.length - 1; i >= 0; i--) v = v * y + c[i];
  return v;
};

/**
 * a(x) and b(x) at inverse wavelength x (um^-1).
 * @param {number} x
 * @param {object} law - The extinction pack's `LAW`
 */
export function ccmCoefficients(x, law) {
  if (!(x >= law.xMin && x <= law.xMax)) return { a: NaN, b: NaN };
  if (x < law.xIrOptical) {
    const p = x ** law.ir.power;
    return { a: law.ir.a * p, b: law.ir.b * p };
  }
  if (x <= law.xOpticalUv) {
    const y = x - law.optical.y0;
    return { a: polyAt(law.optical.a, y), b: polyAt(law.optical.b, y) };
  }
  const u = law.uv;
  const q = (x - u.aPole.x0) ** 2 + u.aPole.w;
  const r = (x - u.bPole.x0) ** 2 + u.bPole.w;
  let a = u.a0 + u.a1 * x + u.aPole.k / q;
  let b = u.b0 + u.b1 * x + u.bPole.k / r;
  if (x >= law.xFarUv) {
    const z = x - law.farUv.x0;
    a += polyAt(law.farUv.fa, z) * z * z;
    b += polyAt(law.farUv.fb, z) * z * z;
  }
  return { a, b };
}

/** A(lambda) / A(V) for a wavelength in nm and R_V (3.1 for the diffuse ISM). */
export function extinctionRatio(lambdaNm, Rv, law) {
  const { a, b } = ccmCoefficients(1000 / lambdaNm, law);
  return a + b / Rv;
}

/** A(lambda) in mag for E(B-V) in mag. */
export const extinctionMag = (lambdaNm, ebv, Rv, law) =>
  Rv * ebv * extinctionRatio(lambdaNm, Rv, law);

/** Observed flux after extinction: f * 10^(-0.4 A). */
export const redden = (f, lambdaNm, ebv, Rv, law) =>
  f * 10 ** (-0.4 * extinctionMag(lambdaNm, ebv, Rv, law));
