// ===========================================================================
// 45. Galaxy clusters: dispersion, virial mass and the refusals (Prompt 250)
// ===========================================================================

import * as K from '../../kernels/galaxy/clusters/index.js';
import { normalCdf } from '../../kernels/statistics/index.js';
import { G_SI, PARSEC_M } from '../../constants.js';

/**
 * Run this group's checks (GALAXY_CLUSTERS.md; the full table, with the independent oracle, the
 * coverage ensembles, the refusals and the legs that wait for an authentic table, is
 * `npm run clusters:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'Galaxy clusters: membership, dispersion and virial mass';
  const C = 299792.458;
  const v7 = [-450, -250, -100, 0, 120, 280, 400];
  const zc = 0.0231;
  const z7 = v7.map(v => zc + ((1 + zc) * v) / C);
  const zbar = z7.reduce((s, z) => s + z, 0) / z7.length;
  const v = z7.map(z => K.restVelocity(z, zbar));

  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The plain velocity dispersion of seven velocities (-450 to 400 km/s, mean 0) is sqrt(527800/6) km/s to a relative 1e-12',
    measured: K.dispersion(v, { kappa: 3, truncationCorrection: false }).kms,
    expected: Math.sqrt(527800 / 6),
    unit: 'km/s',
    tolerance: 1e-12,
    toleranceKind: 'relative',
    why: 'The sum of squares is 527800 and the sample standard deviation divides by n - 1 = 6 (the contract leg A3, rule R6).',
  });

  const x = K.truncationFactor(3);
  const phi = a => Math.exp(-0.5 * a * a) / Math.sqrt(2 * Math.PI);
  const Phi = a => normalCdf(a);
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The clip’s truncation factor at 3 standard deviations solves x^2 = 1 - 2 (3x) phi(3x) / (2 Phi(3x) - 1) to 1e-12',
    measured: x * x - (1 - (2 * 3 * x * phi(3 * x)) / (2 * Phi(3 * x) - 1)),
    expected: 0,
    unit: '',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'An iterated clip at kappa leaves a Gaussian parent cut at kappa s, whose variance is sigma^2 V(kappa s / sigma); the fixed point is the correction that divides the raw dispersion (rule R6, leg A2).',
  });

  const m = K.virialMass({
    sigmaKms: 1000,
    sigmaSigmaKms: 0,
    radiusMpc: 1,
    sigmaRadiusMpc: 0,
    factor: {
      value: 6,
      sigma: 0,
      source: 'invented for the check',
      radiusKind: 'half-number',
    },
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The virial mass K sigma^2 R / G with K 6 (invented), sigma 1000 km/s and R 1 Mpc matches the closed form to a relative 1e-12',
    measured: m.kg,
    expected: (6 * 1e6 ** 2 * (PARSEC_M * 1e6)) / G_SI,
    unit: 'kg',
    tolerance: 1e-12,
    toleranceKind: 'relative',
    why: 'M = K sigma^2 R / G with sigma in m/s and R in metres, the tree’s G and parsec (rule R11, leg A5); the factor is the caller’s, never a default.',
  });

  const alpha = 1 - 0.95;
  const ci = K.clopperPearson(0, 10, 0.95);
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The exact binomial upper end for 0 of 10 at 95 percent is 1 - (alpha/2)^(1/10) to 1e-10',
    measured: ci.hi,
    expected: 1 - (alpha / 2) ** (1 / 10),
    unit: '',
    tolerance: 1e-10,
    toleranceKind: 'absolute',
    why: 'With no successes the Clopper-Pearson upper end solves (1 - p)^n = alpha / 2 (rule R13, leg A8).',
  });

  const few = K.analyseCluster({
    ...K.clusterWorld({
      seed: 'group',
      index: 0,
      cosmology: { H0: 70, Om: 0.3, OL: 0.7 },
      N: 19,
      interloperFraction: 0,
    }),
    cosmology: { H0: 70, Om: 0.3, OL: 0.7 },
    factor: {
      value: 6,
      sigma: 0.5,
      source: 'invented for the check',
      radiusKind: 'half-number',
    },
    draws: 10,
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A cluster of 19 galaxies is not constrained: no dispersion and no mass are returned',
    measured:
      few.status === 'not-constrained' &&
      few.code === 'too-few-members' &&
      !few.mass
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'Fewer than 20 members is a dispersion good to about 16 percent at best; the kernel says not-constrained rather than give a number (rule R5, leg D1).',
  });

  const noSource =
    K.virialMass &&
    K.checkFactor(
      { value: 6, sigma: 0.5, source: '', radiusKind: 'half-number' },
      'half-number'
    );
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A projection factor with no source is refused: the kernel holds no published factor',
    measured:
      noSource &&
      noSource.status === 'refused' &&
      noSource.code === 'missing-factor-source'
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'The factor of a virial mass is a published number with a stated definition of the radius; the caller supplies it with its source and there is no default (rule R11, leg D4).',
  });
}
