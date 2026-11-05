// ===========================================================================
// 43. Active galactic nuclei: the Eddington bound, the size bound and the BPT classes (Prompt 252)
// ===========================================================================

import * as A from '../../kernels/agn/index.js';
import { C_LIGHT } from '../../kernels/radiation/constants.js';

/**
 * Run this group's checks (AGN.md; the full table, with the independent oracle, the ensembles, the refusals and the
 * legs that wait for authentic files, is `npm run agn:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP =
    'Active galactic nuclei: the Eddington bound and the size bound';

  // L_Edd from its closed form, and the mass bound as its inverse
  const M = 1e8;
  const lEdd = A.eddingtonLuminosity(M).luminosityW;
  const closed =
    (4 * Math.PI * (A.GM_SUN * M) * A.M_PROTON_KG * C_LIGHT) /
    A.SIGMA_THOMSON_M2;
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The Eddington luminosity of 1e8 solar masses equals 4 pi G M m_p c / sigma_T',
    measured: lEdd,
    expected: closed,
    unit: 'W',
    tolerance: 1e-12,
    toleranceKind: 'relative',
    why: 'Radiation pressure on free electrons balances gravity on the protons they drag along; the constants are the pinned offline reading of astropy (the contract leg A1, B1).',
  });
  const b = A.eddingtonMassBound({ luminosityW: lEdd });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The mass bound of a source radiating exactly the Eddington luminosity is that mass, and is labelled a lower bound',
    measured: b.kind === 'lower-bound' ? b.massBoundSolar : NaN,
    expected: M,
    unit: 'solar masses',
    tolerance: 1e-12,
    toleranceKind: 'relative',
    why: 'M >= L / L_Edd(1 solar mass) inverts the closed form; it is a bound, not an estimate, and carries its assumptions (the contract leg A1, D4).',
  });

  // the light-crossing size
  const s = A.sizeBound({ tauDays: 1, z: 1, delta: 1 });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A one-day variability at z = 1 bounds the size by c times one day over 1 + z',
    measured: s.sizeM,
    expected: (C_LIGHT * 86400) / 2,
    unit: 'm',
    tolerance: 1e-14,
    toleranceKind: 'relative',
    why: 'A region cannot vary coherently faster than light crosses it; time dilation stretches the observed time scale by 1 + z (the contract leg A4).',
  });

  // the fastest time scale of a sinusoid
  const c = A.generateSinusoidCurve({
    amplitude: 0.6,
    periodDays: 100,
    epochs: 800,
    relativeError: 1e-9,
    noise: false,
  });
  const f = A.fastestTimescale(c);
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The fastest e-folding time of a sinusoidal light curve of amplitude 0.6 is within 1 percent of sqrt(1 - A^2) / (A omega)',
    measured: f.status === 'ok' ? f.tauDays / c.truth.tauMinDays : NaN,
    expected: 1,
    unit: '',
    tolerance: 0.01,
    toleranceKind: 'absolute',
    why: 'The minimum of F / |dF/dt| for F = 1 + A sin(wt) is sqrt(1 - A^2) / (A w); a finite difference over a pair of epochs cannot be faster than the instantaneous rate (the contract leg A5).',
  });

  // the three BPT classes against invented curves
  const ln = (x, y) => ({
    ha: { flux: 1, sigma: 1e-6 },
    hb: { flux: 1, sigma: 1e-6 },
    n: { flux: 10 ** x, sigma: 1e-6 * 10 ** x },
    o: { flux: 10 ** y, sigma: 1e-6 * 10 ** y },
  });
  const cls = (x, y) =>
    A.classifyBpt({ lines: ln(x, y), definition: A.INVENTED_BPT_CURVES }).class;
  const got = [cls(-1.5, 0.3875), cls(-1.5, 0.7718), cls(-1.5, 1.1561)];
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Points 0.3 dex under, midway between and 0.3 dex over two dividing curves classify as star-forming, composite and AGN',
    measured:
      got[0] === 'star-forming' && got[1] === 'composite' && got[2] === 'agn'
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'The curves are INVENTED by the contract (the kernel holds none): the leg checks the rule, not any published boundary (the contract leg A6).',
  });
}
