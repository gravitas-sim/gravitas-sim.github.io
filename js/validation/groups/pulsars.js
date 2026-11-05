// ===========================================================================
// 40. The pulsar kernel: the dispersion delay, de-dispersion, the DM and the label of the distance (Prompt 242)
// ===========================================================================

import * as K from '../../kernels/radio/index.js';

/**
 * Run this group's checks (PULSARS.md; the full table, with the independent oracle, the coverage ensembles, the refusals
 * and the legs that wait for authentic files, is `npm run pulsar:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'Pulsars: dispersion and folding';

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A pulse at 1200 MHz arrives (1500 / 1200)^2 = 1.5625 times later than the same pulse at 1500 MHz',
    measured: K.dispersionDelay(1200, 50) / K.dispersionDelay(1500, 50),
    expected: 1.5625,
    unit: '',
    tolerance: 1e-14,
    toleranceKind: 'absolute',
    why: 'The cold-plasma delay is K DM / f^2 relative to infinite frequency, so the ratio of two delays at one DM is the inverse square of the frequency ratio, whatever the constant K (the contract leg A1).',
  });

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The sweep across the band 1200 to 1500 MHz at DM 60 equals the difference of the two delays',
    measured:
      K.dispersionSweep(1200, 1500, 60) /
      (K.dispersionDelay(1200, 60) - K.dispersionDelay(1500, 60)),
    expected: 1,
    unit: '',
    tolerance: 1e-14,
    toleranceKind: 'absolute',
    why: 'sweep(f1, f2, DM) = K DM (1 / f1^2 - 1 / f2^2), which is t(f1) - t(f2) exactly; the DM recovered from a measured sweep inverts it (the contract leg A1).',
  });

  const P = 0.261803;
  const world = K.generateDynamicSpectrum({
    period: P,
    dm: 60,
    phase0: 0.3,
    amplitude: 1,
    noiseSigma: 0,
    subchannels: 1,
    seed: 'validation-group',
  });
  const fold = dm =>
    K.foldStatistic(
      K.foldSeries(
        K.dedisperse(world, dm, { method: 'linear' }).series,
        world.dt,
        P,
        64
      ),
      1
    ).chi2;
  const span =
    K.DISPERSION_CONSTANT *
    (1 / world.frequencyMHz[0] ** 2 -
      1 / world.frequencyMHz[world.nchan - 1] ** 2);
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'De-dispersing a noise-free series at the true DM sharpens the folded profile by at least a factor 1.5 against a DM whose band sweep is 6 pulse widths off',
    measured: fold(60 + (6 * 0.03 * P) / span) / fold(60),
    expected: 1 / 1.5,
    unit: 'ratio of the fold statistic off the true DM to at it',
    tolerance: 0,
    toleranceKind: 'bound',
    why: 'A bound: channel offsets spread over a sweep of k pulse standard deviations widen the summed pulse by sqrt(1 + k^2 / 12) and the fold statistic falls by the same factor, to 0.5 at k = 6, and the committed ratio of 1.5 is a fall to 0.667 (the contract leg A4).',
  });

  const sigma = 1e-3;
  const fit = K.refineDm(world, { period: P, dm0: 61, sigma });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The arrival-time fit recovers the dispersion measure of a noise-free series (true 60 pc/cm3, started at 61) within 0.05 pc/cm3',
    measured: fit.status === 'ok' ? fit.dm : NaN,
    expected: 60,
    unit: 'pc/cm3',
    tolerance: 0.05,
    toleranceKind: 'absolute',
    why: 'Each channel is folded at the period and matched to a leave-one-out template, and a weighted line through arrival time against 1 / f^2 gives the DM correction (PULSAR-RULE-1 S6 to S8; the committed leg A6 bound).',
  });

  const crude = K.dmDistance({
    dm: 50,
    density: { value: 0.05, source: 'a density the caller cites' },
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A distance from a dispersion measure always carries the label "crude; assumes this electron density"',
    measured:
      crude.distancePc === 1000 &&
      crude.label === 'crude; assumes this electron density' &&
      K.dmDistance({ dm: 50 }).code === 'missing-density'
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'd = DM / n_e for a stated uniform density; the density has no default (a typed one would be a published value from memory), so a call without one is refused; the label is in every result (the contract leg A8).',
  });

  const one = K.generateDynamicSpectrum({
    period: 0.2373,
    dm: 60,
    channels: 1,
    bandMHz: [1350, 1351],
    amplitude: 3,
    seed: 'validation-group-one',
  });
  const single = K.analyzePulsar(one, {
    dmRange: [0, 200],
    periodRange: [0.15, 0.35],
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A series at a single frequency returns "not constrained" for the dispersion measure and still gives the period',
    measured:
      single.dm?.code === 'not-constrained' &&
      single.dm?.dm === undefined &&
      single.period?.status === 'ok'
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'At one frequency the dispersion delay is a constant that the pulse arrival time absorbs, so no dispersion measure is constrained; the period does not need one (the contract leg D1).',
  });
}
