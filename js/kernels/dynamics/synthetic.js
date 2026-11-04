// A synthetic cluster with its truth manifest (Prompt 237): members of an isotropic Plummer sphere
// (the distribution function of Aarseth, Henon and Wielen 1974), projected along one axis, with
// line-of-sight velocity errors. The truth is the sphere's mass, its scale radius and its
// line-of-sight dispersion; nothing here is data.
import { stream, gaussian } from '../../random/streams.js';
import { G_PC_KMS2_MSUN } from './constants.js';

const { Math } = globalThis;
const TRUNCATE = 0.999;

/**
 * @param {{members: number, scaleRadius: number, mass: number, errorFraction?: number, seed: string|number}} args
 *   scaleRadius in pc, mass in solar masses, errorFraction the velocity error as a fraction of the true dispersion
 * @returns {{x: Float64Array, y: Float64Array, v: Float64Array, e: Float64Array, truth: object}}
 */
export function plummerCluster({
  members,
  scaleRadius,
  mass,
  errorFraction = 0.1,
  seed,
}) {
  const u = stream('noise', seed, 'plummer-cluster');
  const gauss = gaussian(u);
  const vScale = Math.sqrt((G_PC_KMS2_MSUN * mass) / scaleRadius);
  const sigmaLos = Math.sqrt(Math.PI / 32) * vScale;
  const x = new Float64Array(members);
  const y = new Float64Array(members);
  const v = new Float64Array(members);
  const e = new Float64Array(members).fill(errorFraction * sigmaLos);
  for (let i = 0; i < members; i++) {
    const r = scaleRadius / Math.sqrt((u() * TRUNCATE) ** (-2 / 3) - 1);
    let q;
    for (;;) {
      q = u();
      if (0.1 * u() < q * q * (1 - q * q) ** 3.5) break;
    }
    const speed =
      q * Math.SQRT2 * (1 + (r / scaleRadius) ** 2) ** -0.25 * vScale;
    const cosT = 2 * u() - 1;
    const sinT = Math.sqrt(1 - cosT * cosT);
    const phi = 2 * Math.PI * u();
    x[i] = r * sinT * Math.cos(phi);
    y[i] = r * sinT * Math.sin(phi);
    v[i] = speed * (2 * u() - 1) + e[i] * gauss();
  }
  return {
    x,
    y,
    v,
    e,
    truth: {
      label: 'synthetic: an isotropic Plummer sphere projected along one axis',
      mass,
      scaleRadius,
      sigmaLos,
      projectedHalfMassRadius: scaleRadius,
      errorFraction,
      truncation: TRUNCATE,
    },
  };
}
