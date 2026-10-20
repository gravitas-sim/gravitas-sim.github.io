// ===========================================================================
// 12. Rotation curves and dark matter
// ===========================================================================

import { makeTracer, hypot } from '../harness.js';

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({
  physics,
  darkMatter,
  dmWidgets,
  add,
  lab,
}) {
  const G = 1;
  const vFlat = 6;
  const rc = 300;

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'Halo circular speed matches its asymptotic form far out',
    measured: darkMatter.haloCircularSpeed(100 * rc, vFlat, rc) / vFlat,
    // arctan(x) -> pi/2 - 1/x, so v/v_flat -> sqrt(1 - pi/(2x)).
    expected: Math.sqrt(1 - Math.PI / (2 * 100)),
    unit: '',
    tolerance: 2e-4,
    why: 'The asymptote is approached, not reached: at 100 core radii the speed is still 0.79% short of v_flat, because arctan(x)/x falls off as pi/(2x). Checking against 1 with a loose tolerance would hide a wrong profile; checking against sqrt(1 - pi/(2x)) pins the profile itself. The residual 2e-4 is the next term in the expansion, 1/x^2.',
    source: 'Begeman (1989) A&A 223, 47, on NGC 3198',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'Halo circular speed is within 1% of v_flat at 100 core radii',
    measured: darkMatter.haloCircularSpeed(100 * rc, vFlat, rc) / vFlat,
    expected: 1,
    unit: '',
    tolerance: 1e-2,
    why: 'The claim the investigation makes - that the curve goes flat - stated as a bound rather than as an identity. 1% is the analytic shortfall pi/(4x) at x = 100, so this is the tightest bound the profile permits.',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'Halo circular speed rises linearly near the center',
    measured:
      darkMatter.haloCircularSpeed(rc / 1000, vFlat, rc) /
      ((vFlat * (1 / 1000)) / Math.sqrt(3)),
    expected: 1,
    unit: '',
    tolerance: 1e-6,
    why: 'The series 1 - arctan(x)/x = x^2/3 - x^4/5 + ... gives v -> v_flat * x / sqrt(3) as x -> 0, so the halo has no cusp and no singular acceleration at the center. The code switches to the series below x = 1e-3 precisely because the closed form loses every significant digit there; this checks the switch does not introduce a step.',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'The series and closed forms agree across the switchover',
    measured:
      Math.abs(
        darkMatter.haloCircularSpeed(rc * 0.999e-3, vFlat, rc) -
          darkMatter.haloCircularSpeed(rc * 1.001e-3, vFlat, rc)
      ) / darkMatter.haloCircularSpeed(rc * 1e-3, vFlat, rc),
    expected: 0,
    unit: 'relative',
    tolerance: 3e-3,
    toleranceKind: 'absolute',
    why: 'Straddling the x = 1e-3 boundary. The two evaluations are 0.2% apart in radius, so the speeds must be 0.2% apart and no more: a discontinuity at the switchover would show up as a much larger jump.',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'Halo acceleration is exactly v_c^2 / r',
    measured: (() => {
      const r = 450;
      const a = darkMatter.haloAcceleration(
        { x: r, y: 0 },
        { vFlat, coreRadius: rc }
      );
      const v = darkMatter.haloCircularSpeed(r, vFlat, rc);
      return Math.abs(hypot(a.ax, a.ay) - (v * v) / r) / ((v * v) / r);
    })(),
    expected: 0,
    unit: 'relative',
    tolerance: 1e-14,
    toleranceKind: 'absolute',
    why: 'The condition for a circular orbit. If the acceleration and the quoted circular speed disagreed, a body launched on the curve the panel draws would not stay on it.',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'Halo enclosed mass reproduces v_c = sqrt(GM/r)',
    measured: (() => {
      const r = 700;
      const M = darkMatter.haloEnclosedMass(r, { vFlat, coreRadius: rc }, G);
      return (
        Math.sqrt((G * M) / r) / darkMatter.haloCircularSpeed(r, vFlat, rc)
      );
    })(),
    expected: 1,
    unit: '',
    tolerance: 1e-14,
    why: 'The enclosed mass is read straight off the circular speed, so inverting it must give the speed back. Round-off tolerance. The mass matters because the investigation asks how much dark matter there is, not just how fast things go.',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'A point mass gives a Keplerian slope of exactly -1/2',
    measured: (() => {
      const center = { x: 0, y: 0 };
      const bodies = [{ pos: { x: 0, y: 0 }, mass: 1000 }];
      const pts = [];
      for (let r = 100; r <= 1000; r += 50) {
        pts.push({
          r,
          speed: darkMatter.keplerianSpeed(bodies, center, r, G),
        });
      }
      return darkMatter.fitPowerLaw(pts).exponent;
    })(),
    expected: -0.5,
    unit: 'slope',
    tolerance: 1e-12,
    why: "The prediction the flat rotation curve refutes, and the number the Solar System actually shows. Fitted by the same least-squares routine the investigation uses, so a bug in the fit would break this before it broke a student's measurement.",
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'A dominant halo flattens the fitted slope toward zero',
    measured: (() => {
      const center = { x: 0, y: 0 };
      const bodies = [{ pos: { x: 0, y: 0 }, mass: 1 }];
      const halo = { vFlat, coreRadius: 60 };
      const pts = [];
      for (let r = 400; r <= 2000; r += 50) {
        pts.push({
          r,
          speed: darkMatter.totalCircularSpeed(bodies, center, r, G, halo),
        });
      }
      return darkMatter.fitPowerLaw(pts).exponent;
    })(),
    expected: 0,
    unit: 'slope',
    tolerance: 8e-2,
    toleranceKind: 'absolute',
    why: 'The investigation\'s claim is "flat, not -0.5", and this measures how flat. The residual is not zero and should not be: the pseudo-isothermal speed still rises toward its asymptote as sqrt(1 - pi/(2x)), which contributes a slope of about pi/(4x). Over 400 to 2000 units at a 60-unit core that averages 0.05, so 0.08 is the analytic residual with a little room. The distance from the Keplerian -0.5 is the entire point, and it is a factor of ten.',
    source: 'Rubin & Ford (1970) ApJ 159, 379',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'Speeds from separate components add in quadrature',
    measured: (() => {
      const center = { x: 0, y: 0 };
      const bodies = [{ pos: { x: 0, y: 0 }, mass: 800 }];
      const halo = { vFlat, coreRadius: rc };
      const r = 500;
      const vb = darkMatter.keplerianSpeed(bodies, center, r, G);
      const vh = darkMatter.haloCircularSpeed(r, vFlat, rc);
      return (
        darkMatter.totalCircularSpeed(bodies, center, r, G, halo) /
        Math.sqrt(vb * vb + vh * vh)
      );
    })(),
    expected: 1,
    unit: '',
    tolerance: 1e-14,
    why: 'Accelerations add, and a = v^2/r for each component, so the speeds add in quadrature. Adding them linearly is the classic mistake here.',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'Virial mass of a uniform sphere: M = (5/3) R <v^2> / G',
    measured: darkMatter.virialMass(9, 300, G),
    expected: (5 / 3) * ((300 * 9) / G),
    unit: 'mass units',
    tolerance: 1e-12,
    why: "Zwicky's calculation, with U = -(3/5) G M^2 / R for a uniform sphere. Checked against its own algebra, because the assumption (a uniform sphere in equilibrium) is the approximation, not the arithmetic.",
    source: 'Zwicky (1933) Helvetica Physica Acta 6, 110',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'Line-of-sight dispersion converts with the right dimension factor',
    measured:
      darkMatter.losToMeanSquare(5, 3) / darkMatter.losToMeanSquare(5, 2),
    expected: 1.5,
    unit: '',
    tolerance: 1e-15,
    why: 'A spectrum gives one velocity component, not three. The factor is the number of dimensions the motion occupies, and the simulation being planar is exactly why this is a parameter rather than a hardcoded 3.',
  });

  // The component curves the rotation-curve fitting instrument is built on.
  // These are new physics in the project rather than a re-check of the halo,
  // and a lesson now asks students to fit a real galaxy with them.
  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'Modified Bessel functions match tabulated values',
    measured: (() => {
      const cases = [
        [darkMatter.besselI0, 2, 2.2795853023],
        [darkMatter.besselI0, 10, 2815.7166284],
        [darkMatter.besselI1, 2, 1.5906368546],
        [darkMatter.besselI1, 10, 2670.9883037],
        [darkMatter.besselK0, 2, 0.1138938727],
        [darkMatter.besselK0, 10, 1.7780062e-5],
        [darkMatter.besselK1, 2, 0.1398658818],
        [darkMatter.besselK1, 10, 1.8648773e-5],
      ];
      let worst = 0;
      for (const [fn, x, want] of cases) {
        worst = Math.max(worst, Math.abs(fn(x) - want) / want);
      }
      return worst;
    })(),
    expected: 0,
    unit: 'worst relative error',
    tolerance: 2e-7,
    toleranceKind: 'absolute',
    why: 'The Abramowitz & Stegun 9.8.1-9.8.8 polynomial approximations, which claim about 1e-7 relative and deliver it. Both branches of each function are sampled, because the switchover is where an approximation like this goes wrong. They exist in this project for one purpose - the thin exponential disc below - and a disc curve built on a subtly wrong Bessel function looks entirely plausible while putting its peak in the wrong place, which in a fitting exercise would be absorbed into the halo. The halo is the quantity being measured.',
    source: 'Abramowitz & Stegun, Handbook of Mathematical Functions, 9.8',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'Exponential disc peaks at 2.15 scale lengths',
    measured: (() => {
      const Rd = 3;
      let best = 0;
      let bestR = 0;
      for (let r = 0.02; r < 12 * Rd; r += 0.005) {
        const v = darkMatter.exponentialDiscSpeed(r, 1e10, Rd);
        if (v > best) {
          best = v;
          bestR = r;
        }
      }
      return bestR / Rd;
    })(),
    expected: 2.15,
    unit: 'scale lengths',
    tolerance: 5e-3,
    why: 'A pure number: the peak of a Freeman thin exponential disc sits at the same fraction of its scale length whatever its mass and size. That makes it the sharpest available check that the Bessel combination I0K0 - I1K1 is the right one, because getting the combination wrong moves the peak and nothing else about the curve looks obviously wrong.',
    source: 'Freeman (1970) ApJ 160, 811',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'Far outside a disc its curve becomes Keplerian',
    measured: (() => {
      const M = 1e10;
      const r = 300;
      return (
        darkMatter.exponentialDiscSpeed(r, M, 2) /
        darkMatter.pointMassSpeed(r, M)
      );
    })(),
    expected: 1,
    unit: '',
    tolerance: 1e-2,
    why: 'The bracket I0K0 - I1K1 tends to 1/(4y^3), which turns the Freeman expression into exactly GM/r. A disc seen from 150 scale lengths away is a point mass, and a function that failed this would be wrong in a way no amount of eyeballing a curve would catch. The residual at 300 kpc is the next term in that expansion.',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'In its own plane a disc spins faster than the equivalent sphere',
    measured: (() => {
      const M = 1e10;
      const Rd = 3;
      const r = 2.15 * Rd;
      const x = r / Rd;
      const enclosed = M * (1 - (1 + x) * Math.exp(-x));
      return (
        darkMatter.exponentialDiscSpeed(r, M, Rd) /
        darkMatter.pointMassSpeed(r, enclosed)
      );
    })(),
    expected: 1.17,
    unit: 'ratio to the spherical equivalent',
    tolerance: 5e-2,
    why: 'Not a bug, and the reason the disc is done with Bessel functions rather than an enclosed mass. Material at larger radius than the orbit still pulls inward when it lies in the same plane, so a disc spins about 17% faster near its peak than a sphere holding the same mass inside the same radius. Modeling a disc as a sphere understates it by that much, and in a decomposition the shortfall lands on the halo.',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'Component speeds add in quadrature, not linearly',
    measured: (() => {
      const model = {
        bulgeMass: 1e10,
        discMass: 4e10,
        discScale: 2.6,
        haloVFlat: 150,
        haloCore: 8,
      };
      const c = darkMatter.galaxyCurveAt(10, model);
      return c.total / Math.hypot(c.bulge, c.disc, c.halo);
    })(),
    expected: 1,
    unit: '',
    tolerance: 1e-12,
    why: 'Accelerations add and a = v^2/r for each component, so the speeds add in quadrature. Adding them linearly is the classic mistake, and it would overstate the total by tens of per cent - which a student fitting a curve would compensate for by fitting a smaller halo.',
  });

  add({
    group: 'Dark matter',
    kind: 'analytic',
    name: 'A fitted decomposition beats the best halo-free one by 7x',
    measured: (() => {
      // Swept over the parameter ranges the lesson's sliders actually expose,
      // which is what makes this a statement about the exercise rather than
      // about one convenient setting.
      const observed = dmWidgets.NGC3198_OBSERVED;
      let bestNoHalo = Infinity;
      for (let m = 0; m <= 16; m += 0.25) {
        for (let sc = 1; sc <= 8; sc += 0.25) {
          const rms = darkMatter.curveResidual(observed, {
            bulgeMass: dmWidgets.NGC3198.bulgeMass,
            discMass: m * 1e10,
            discScale: sc,
            haloVFlat: 0,
            haloCore: 6,
          }).rms;
          bestNoHalo = Math.min(bestNoHalo, rms);
        }
      }
      const fitted = darkMatter.curveResidual(observed, dmWidgets.NGC3198).rms;
      return bestNoHalo / fitted;
    })(),
    expected: 7,
    unit: 'ratio of residuals',
    tolerance: 0.3,
    why: "The claim the investigation's fitting exercise is built on, measured rather than asserted: no disc mass at any scale length reproduces the curve. Swept over the whole range of both sliders a student can reach, the best halo-free residual is 14.5 km/s against 2.1 km/s for the decomposition with a halo - and against measurement errors of 4.7. A tolerance of 0.3 on the ratio would catch either the sweep narrowing or the target curve drifting.",
  });

  // The halo inside the real integrator: a body launched on the halo's own
  // circular speed must stay at that radius.
  {
    const dt = 0.1;
    const r = 600;
    lab.reset({
      galaxy_gravity: 'halo',
      halo_v_flat: vFlat,
      halo_core_radius: rc,
      mutual_gravity: false,
    });
    const v = darkMatter.haloCircularSpeed(r, vFlat, rc);
    const p = makeTracer(physics, { x: r, y: 0 }, { x: 0, y: v });
    physics.planets.push(p);
    lab.commit();

    const period = (2 * Math.PI * r) / v;
    let minR = r;
    let maxR = r;
    lab.step(dt, Math.round((6 * period) / dt), () => {
      const rr = hypot(p.pos.x, p.pos.y);
      minR = Math.min(minR, rr);
      maxR = Math.max(maxR, rr);
    });
    add({
      group: 'Dark matter',
      kind: 'integration',
      name: 'A halo circular orbit stays circular in the integrator',
      measured: (maxR - minR) / r,
      expected: 0,
      unit: 'fractional range',
      tolerance: 5e-3,
      toleranceKind: 'absolute',
      why: 'The halo enters the force law as an operator-split velocity kick rather than through the point-mass sum, so this is the check that the split is consistent with the profile the panel plots. Same O(dt/P) bound as any other circular orbit: 6 orbits at dt = 0.1 against a period of 628 units.',
    });
  }
}
