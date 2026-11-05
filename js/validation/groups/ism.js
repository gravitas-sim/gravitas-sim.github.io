// ===========================================================================
// 41. The ISM kernel: the column constant, the linear regime, the decrement and the conventions (Prompt 247)
// ===========================================================================

import * as K from '../../kernels/ism/index.js';
import { LINES } from '../../data/radiation/lines.js';
import { LAW } from '../../data/radiation/extinction.js';
import { FWHM_PER_SIGMA } from '../../kernels/spectrograph/lsf.js';

/**
 * Run this group's checks (ISM.md; the full table, with the independent oracle, the coverage ensembles, the refusals
 * and the legs that wait for authentic files, is `npm run ism:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'Interstellar medium: lines, widths and reddening';
  const vac = id => LINES.find(l => l.id === id).vacuum;

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The ratio of a Gaussian line’s equivalent width to its linear value at the saturation cut tau0 = 0.3 is 0.902',
    measured: K.linearRegimeRatio(0.3),
    expected: 0.9020605987503243,
    unit: '',
    tolerance: 1e-6,
    toleranceKind: 'absolute',
    why: 'The series sum (-tau0)^(n-1) / (n! sqrt(n)) gives the departure of a Gaussian optical-depth line from the linear curve of growth; at the committed cut a column density from one line is about ten percent low (the contract leg A2).',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The classical electron radius used for the column density equals alpha h / (2 pi m_e c) and the module holds no typed value for it',
    measured:
      K.ELECTRON_RADIUS_CM /
      ((K.ALPHA_FS * 6.62607015e-34) /
        (2 * Math.PI * K.M_ELECTRON_KG * 299792458) /
        0.01),
    expected: 1,
    unit: '',
    tolerance: 1e-14,
    toleranceKind: 'absolute',
    why: 'N = W / (pi r_e f lambda^2) with r_e derived from the pinned constants (the contract leg A1); the module copies alpha and the electron mass from tests/fixtures/ism/constants-source.json and nothing else.',
  });

  const world = K.generateNebula({
    lines: LINES,
    law: LAW,
    ebv: 0.5,
    hbetaPeak: 2,
    noise: false,
  });
  const fa = K.fitGaussianLine(world, { guessNm: vac('h-alpha') });
  const fb = K.fitGaussianLine(world, { guessNm: vac('h-beta') });
  const dec = K.balmerDecrement({
    numerator: { lambdaNm: vac('h-alpha'), flux: fa.flux, sigma: fa.sigmaFlux },
    denominator: {
      lambdaNm: vac('h-beta'),
      flux: fb.flux,
      sigma: fb.sigmaFlux,
    },
    intrinsic: { ratio: 3, source: 'the synthetic world (invented)' },
    RV: 3.1,
    law: LAW,
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The Balmer decrement of a noise-free synthetic nebula with E(B-V) = 0.5 mag returns it within 1e-3 mag',
    measured: dec.status === 'ok' ? dec.ebv : NaN,
    expected: 0.5,
    unit: 'mag',
    tolerance: 1e-3,
    toleranceKind: 'absolute',
    why: 'The colour excess is 2.5 log10(R / R0) / (k(H-beta) - k(H-alpha)) with k from the CCM89 law the radiation kernel holds, the intrinsic ratio the world’s and R_V the world’s (the contract leg A5).',
  });

  const air = K.generateNebula({
    lines: LINES,
    law: LAW,
    medium: 'air',
    noise: false,
  });
  const mismatch = K.lineVelocity(air, {
    restNm: vac('h-alpha'),
    restMedium: 'vacuum',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A velocity from an air-wavelength spectrum against a vacuum rest wavelength is refused, never converted',
    measured:
      mismatch.status === 'refused' && mismatch.code === 'medium-mismatch'
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'The two conventions differ by 83 km/s at H-alpha, so the medium of the spectrum is required and a mismatch is a refusal with a code (the contract leg D3).',
  });

  const sod = K.generateSodium({
    lines: LINES,
    f: { 'na1-d1': 0.2, 'na1-d2': 0.45 },
    seed: 'validation-group',
    tau0: 5,
    sigmaPixel: 0.002,
  });
  const rows = sod.truth.lines.map(t => {
    const sg =
      (t.observedNm * Math.hypot(3, 299792.458 / 30000 / FWHM_PER_SIGMA)) /
      299792.458;
    const e = K.equivalentWidth(sod, {
      lineWindow: [t.observedNm - 5 * sg, t.observedNm + 5 * sg],
      continuumWindows: [
        [t.observedNm - 12 * sg, t.observedNm - 6 * sg],
        [t.observedNm + 6 * sg, t.observedNm + 12 * sg],
      ],
    });
    return {
      id: t.id,
      lambdaNm: t.restNm,
      f: { 'na1-d1': 0.2, 'na1-d2': 0.45 }[t.id],
      fSource: 'the synthetic world (invented)',
      width: { widthNm: e.widthNm, sigmaNm: e.sigmaNm },
    };
  });
  const col = K.columnDensity({ lines: rows });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A saturated sodium doublet (peak optical depth 5) is refused a column density: the doublet ratio is far below the atomic ratio',
    measured:
      col.status === 'refused' &&
      col.code === 'saturated' &&
      col.columnCm2 === undefined
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'The linear-regime test T1 compares the observed equivalent-width ratio with f2 lambda2^2 / (f1 lambda1^2) and refuses by code when the stronger line is saturated (the contract leg D1).',
  });

  const star = K.generateStar({
    lines: LINES,
    seed: 'validation-group',
    stellarVelocityKmS: 40,
    ismVelocityKmS: 40,
  });
  const sv = K.stellarVelocity(star, {
    lines: ['h-beta', 'h-gamma', 'h-delta'].map(id => ({
      restNm: vac(id),
      restMedium: 'vacuum',
    })),
    broadSigmaKmS: 500,
  });
  const ca = K.lineVelocity(star, {
    restNm: vac('ca2-k'),
    restMedium: 'vacuum',
  });
  const cls = K.classifyAbsorption(star, ca, sv);
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A narrow line at the star’s own velocity is classified "ambiguous", neither stellar nor interstellar',
    measured: cls.status === 'ok' && cls.class === 'ambiguous' ? 1 : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'Width and velocity offset tell a narrow interstellar line from a broad stellar one only when the two velocities differ; at the same velocity the data cannot say (the contract leg D6).',
  });
}
