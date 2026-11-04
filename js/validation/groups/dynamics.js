// ===========================================================================
// 37. Cluster dynamics: timescales, dynamical friction and the virial mass (Prompt 237)
// ===========================================================================

import * as K from '../../kernels/dynamics/index.js';
import { REF } from '../harness.js';

/**
 * Run this group's checks (DYNAMICS.md; the full table, with the independent oracle and the ensembles, is
 * `npm run dynamics:validate`). The committed legs that cross their bound there are not repeated here.
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const GROUP = 'Cluster dynamics';

  // The dynamical time against the SI path with the suite's own constants (CODATA G, the solar mass in
  // kilograms), not the kernel's IAU GM.
  const R = 2; // pc
  const M = 1e5; // solar masses
  const si = Math.sqrt(
    (R * 3.085677581491367e16) ** 3 / (REF.G * REF.solarMassKg * M)
  );
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The dynamical time of 100,000 solar masses within 2 parsecs is sqrt(R^3 / (G M)), 4.3 million years',
    measured: K.dynamicalTime({ radius: R, mass: M }).value,
    expected: si / 3.15576e13,
    unit: 'Myr',
    tolerance: 5e-4,
    why: 'The kernel works in the IAU nominal GM of the Sun; the suite works in CODATA G and the solar mass, which differ by 2 parts in 10,000; 5e-4 bounds that.',
  });

  const N = 50000;
  const gamma = 0.11;
  const td = K.dynamicalTime({ radius: 3, mass: N * 0.5 }).value;
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The half-mass relaxation time of 50,000 stars of 0.5 solar masses at 3 parsecs is 0.138 N / ln(0.11 N) dynamical times',
    measured: K.halfMassRelaxationTime({
      N,
      halfMassRadius: 3,
      meanMass: 0.5,
      gamma,
    }).value,
    expected: (0.138 * N * td) / Math.log(gamma * N),
    unit: 'Myr',
    tolerance: 1e-9,
    why: 'Spitzer’s form rewritten in the cluster’s dynamical time: an identity of the cited relation (the coefficient 0.138 is cited and flagged for verification, not tested here).',
  });

  const big = K.plummerCluster({
    members: 20000,
    scaleRadius: 2,
    mass: 1e5,
    errorFraction: 0.001,
    seed: 'validation-suite',
  });
  const s2 = Array.from(big.v).reduce((s, v) => s + v * v, 0) / big.v.length;
  const rs = Array.from(big.x, (x, i) => Math.hypot(x, big.y[i])).sort(
    (a, b) => a - b
  );
  const eta = (K.G_PC_KMS2_MSUN * 1e5) / (s2 * rs[rs.length >> 1]);
  add({
    group: GROUP,
    kind: 'data',
    name: 'A sampled isotropic Plummer sphere of 20,000 stars gives G M / (sigma_los^2 R_h) = 32 / pi, the virial factor, within sampling error',
    measured: eta,
    expected: 32 / Math.PI,
    unit: '',
    tolerance: 0.05,
    why: 'The Plummer distribution function is sampled (Aarseth, Henon and Wielen 1974), projected along an axis, and the sphere’s true mass divided by sigma_los^2 R_h from the sample; the relative scatter of the sample’s dispersion and half-number radius at 20,000 stars is about 1 percent, so 5 percent is generous.',
  });

  const f1 = K.frictionFunction(1);
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Chandrasekhar’s friction function f(1) = erf(1) - 2 exp(-1) / sqrt(pi) is 0.4276',
    measured: f1,
    expected: 0.8427007929497149 - (2 * Math.exp(-1)) / Math.sqrt(Math.PI),
    unit: '',
    tolerance: 1e-12,
    why: 'erf(1) = 0.8427007929497149 is a standard tabulated value; the kernel evaluates the same function by its series.',
  });

  // A satellite on a circular orbit in a singular isothermal sphere, integrated here under Chandrasekhar's drag.
  const lnL = 3;
  const mu = 0.01;
  let x = 1;
  let y = 0;
  let vx = 0;
  let vy = 1;
  let t = 0;
  const h = 1e-3;
  const acc = (px, py, qx, qy) => {
    const r2 = px * px + py * py;
    const v = Math.hypot(qx, qy);
    const drag = (mu * lnL * K.frictionFunction(v)) / (r2 * v * v);
    return [-px / r2 - (drag * qx) / v, -py / r2 - (drag * qy) / v];
  };
  while (Math.hypot(x, y) > 0.05 && t < 400) {
    const k1 = acc(x, y, vx, vy);
    const x2 = x + 0.5 * h * vx;
    const y2 = y + 0.5 * h * vy;
    const k2 = acc(x2, y2, vx + 0.5 * h * k1[0], vy + 0.5 * h * k1[1]);
    const x3 = x + 0.5 * h * (vx + 0.5 * h * k1[0]);
    const y3 = y + 0.5 * h * (vy + 0.5 * h * k1[1]);
    const k3 = acc(x3, y3, vx + 0.5 * h * k2[0], vy + 0.5 * h * k2[1]);
    const x4 = x + h * (vx + 0.5 * h * k2[0]);
    const y4 = y + h * (vy + 0.5 * h * k2[1]);
    const k4 = acc(x4, y4, vx + h * k3[0], vy + h * k3[1]);
    x += h * (vx + (h / 6) * (k1[0] + k2[0] + k3[0]));
    y += h * (vy + (h / 6) * (k1[1] + k2[1] + k3[1]));
    vx += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    vy += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    t += h;
  }
  const r0 = 1; // pc
  const vc = 10; // km/s
  const mass = (mu * vc * vc * r0) / K.G_PC_KMS2_MSUN;
  const closed = K.sinkingTimeIsothermal({
    radius: r0,
    circularSpeed: vc,
    mass,
    lnLambda: lnL,
    finalRadius: 0.05 * r0,
  });
  add({
    group: GROUP,
    kind: 'integration',
    name: 'A satellite of one percent of the enclosed mass sinks in a singular isothermal sphere in the time of the closed form (r_i^2 - r_f^2) v_c / (2 G M lnLambda f(1)), within 5 percent',
    measured: closed.value,
    expected: t * ((r0 / vc) * K.PC_PER_KMS_MYR),
    unit: 'Myr',
    tolerance: 0.05,
    why: 'The orbit is integrated (fourth-order Runge-Kutta, step 0.001 of r_i / v_c) under Chandrasekhar’s drag with ln Lambda stated as 3; the closed form treats the orbit as circular at every radius, which a drag of this size keeps nearly true.',
  });

  const few = K.plummerCluster({
    members: 19,
    scaleRadius: 2,
    mass: 1e5,
    errorFraction: 0.1,
    seed: 'validation-few',
  });
  const r19 = K.virialMass({
    x: few.x,
    y: few.y,
    v: few.v,
    e: few.e,
    seed: 'few',
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A cluster with 19 members, fewer than the committed 20, returns "not constrained" and names the count',
    measured:
      r19.status === 'not-constrained' &&
      r19.code === 'members' &&
      r19.members === 19
        ? 1
        : 0,
    expected: 1,
    unit: '',
    tolerance: 0,
    why: 'The dispersion of fewer than 20 stars is uncertain by more than 16 percent before any other error; the estimator refuses rather than print a mass.',
  });
}
