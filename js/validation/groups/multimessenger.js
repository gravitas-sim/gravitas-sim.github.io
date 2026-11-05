// ===========================================================================
// 38. The multi-messenger kernel: time systems, the speed bound, sky area, counts and the detection rule (Prompt 244)
// ===========================================================================

import * as K from '../../kernels/multimessenger/index.js';
import { REF } from '../harness.js';

/**
 * Run this group's checks (MULTIMESSENGER.md; the full table, with the independent oracle, the ensembles and the
 * legs that wait for authentic files, is `npm run multimessenger:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'Multi-messenger';

  // The leap-second table here is the INVENTED one of the validation contract (its 1972 and 1980 entries are the
  // definitions GPS needs); the dates are chosen so the answers are arithmetic.
  const table = K.makeLeapTable([
    { from: '1972-01-01', taiMinusUtc: 10 },
    { from: '1980-01-01', taiMinusUtc: 19 },
    { from: '2000-01-01', taiMinusUtc: 20 },
  ]);
  const at = s => K.toT72({ value: s, system: 'UTC' }, table);
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'GPS time of 2000-01-01T00:00:00 UTC is 7300 days plus the one leap second the invented table inserts, 630,720,001 s',
    measured: K.fromT72(at('2000-01-01T00:00:00'), 'GPS', table),
    expected: 7300 * 86400 + 1,
    unit: 's',
    tolerance: 1e-6,
    toleranceKind: 'absolute',
    why: 'The GPS epoch is 1980-01-06 and 2000-01-01 is 7300 days later; the table gives one more second of TAI - UTC. A double at 6e8 s resolves 1.2e-7 s, so 1e-6 s is the finest bound a check can meet.',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A leap second is one second of the continuous scale: the instant after 23:59:60 is one second after it, and 23:59:60 is one second after 23:59:59',
    measured:
      at('2000-01-01T00:00:00') -
      at('1999-12-31T23:59:60') -
      (at('1999-12-31T23:59:60') - at('1999-12-31T23:59:59')),
    expected: 0,
    unit: 's',
    tolerance: 1e-9,
    toleranceKind: 'absolute',
    why: 'Both differences are exactly one second in the calendar arithmetic; any residue is a misplaced leap second.',
  });

  const D = 40; // Mpc
  const r = K.speedBound({
    delay: 1.74,
    distance: D,
    emissionDelay: { min: 0, max: 10 },
  });
  const MPC = (648000 * 149597870700 * 1e6) / Math.PI;
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The speed bound for a 1.74 s delay at 40 Mpc under an emission delay of 0 to 10 s has its upper end at c (Dt - tau_min)/D',
    measured: r.upper,
    expected: (REF.c * 1.74) / (D * MPC),
    unit: '',
    tolerance: 1e-12,
    why: 'The upper end is the first-order form c (Dt - tau_min) / D with tau_min = 0; the parsec is the IAU 2015 definition. The lower end uses tau_max and is held in the full validation (tools/multimessenger-validate.mjs, A2). The delay and the assumption are inputs of the check, not a published result.',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A bound whose assumed minimum emission delay exceeds the observed delay is refused: no bound, null ends',
    measured:
      K.speedBound({
        delay: 1.74,
        distance: D,
        emissionDelay: { min: 2, max: 10 },
      }).status === 'no-bound'
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'With tau_min above the delay the assumption by itself excludes equal speeds; the data then contradict the assumption and bound nothing.',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The whole sky is 4 pi (180/pi)^2 = 41,252.96 square degrees and a HEALPix pixel at nside 64 is that over 49,152',
    measured: K.healpixPixelAreaDeg2(64),
    expected: (4 * Math.PI * (180 / Math.PI) ** 2) / (12 * 64 * 64),
    unit: 'deg2',
    tolerance: 1e-12,
    why: 'The sky has 4 pi steradians and HEALPix divides it into 12 nside^2 pixels of equal area.',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The probability that at least 2 of 5 noise epochs reach 3 sigma is the binomial sum 10 p^2 (1-p)^3 + 10 p^3 (1-p)^2 + 5 p^4 (1-p) + p^5, with p = 1 - Phi(3)',
    measured: K.falseAlarmProbability({
      epochs: 5,
      thresholdSigma: 3,
      minDetections: 2,
    }),
    expected: (() => {
      const p = 0.0013498980316300933;
      return (
        10 * p ** 2 * (1 - p) ** 3 +
        10 * p ** 3 * (1 - p) ** 2 +
        5 * p ** 4 * (1 - p) +
        p ** 5
      );
    })(),
    unit: '',
    tolerance: 1e-9,
    why: 'The binomial tail written term by term, with 1 - Phi(3) from scipy.stats.norm.sf(3), run offline; the kernel evaluates it as a regularised incomplete beta.',
  });
}
