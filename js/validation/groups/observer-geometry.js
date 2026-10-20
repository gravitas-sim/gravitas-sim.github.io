// ===========================================================================
// 8. Observer geometry, transits and projection
// ===========================================================================

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ observer, transitWidgets, add }) {
  const edgeOn = observer.geometryFor(0, 90);
  const faceOn = observer.geometryFor(0, 0);
  const pos = { x: 120, y: 0 };

  add({
    group: 'Observer geometry',
    kind: 'analytic',
    name: 'Edge-on: a body on the line of sight has zero sky separation',
    measured: observer.projectedSeparation(pos, edgeOn),
    expected: 0,
    unit: 'units',
    tolerance: 1e-12,
    toleranceKind: 'absolute',
    why: 'At i = 90 and position angle 0 the observer looks along +x, so a body on the +x axis is exactly in front of the star. This is the geometry a transit needs, and it must be exact rather than approximate.',
  });

  add({
    group: 'Observer geometry',
    kind: 'analytic',
    name: 'Face-on: sky separation is the full orbital radius',
    measured: observer.projectedSeparation(pos, faceOn),
    expected: 120,
    unit: 'units',
    tolerance: 1e-12,
    why: 'At i = 0 the orbital plane is the sky plane, so nothing is foreshortened and no transit is possible at any phase.',
  });

  add({
    group: 'Observer geometry',
    kind: 'analytic',
    name: 'Line-of-sight depth is positive in front of the star',
    measured: observer.lineOfSightDepth(pos, edgeOn) > 0,
    expected: true,
    why: 'The sign that decides transit from secondary eclipse. Getting it backwards would put every dip half a period out of phase.',
  });

  add({
    group: 'Observer geometry',
    kind: 'analytic',
    name: 'Radial velocity is negative when approaching',
    measured: observer.projectVelocityLOS({ x: 5, y: 0 }, edgeOn),
    expected: -5,
    unit: 'units per time',
    tolerance: 1e-12,
    why: 'The line-of-sight vector points toward the observer, so motion along it is approach and must report negative. This is the sign convention every spectrograph uses, and it is the one the RV panel has to match.',
  });

  add({
    group: 'Observer geometry',
    kind: 'analytic',
    name: 'Radial velocity scales as sin i',
    measured:
      observer.projectVelocityLOS({ x: 5, y: 0 }, observer.geometryFor(0, 30)) /
      observer.projectVelocityLOS({ x: 5, y: 0 }, edgeOn),
    expected: Math.sin((30 * Math.PI) / 180),
    unit: '',
    tolerance: 1e-12,
    why: 'The M sin i degeneracy, in the projection code rather than in the formula. Both have to carry it or the panel and the investigation disagree.',
  });

  // Transit depth. The instrument integrates over a limb-darkened disk, so
  // the central depth is not k^2 but k^2 scaled by the ratio of the central
  // intensity to the disk average.
  const u1 = 0.4;
  const u2 = 0.26;
  const iAvg = 1 - u1 / 3 - u2 / 6;
  const k = 0.08;
  add({
    group: 'Transit geometry',
    kind: 'analytic',
    name: 'Central depth is k^2 scaled by limb darkening',
    measured: transitWidgets.blockedFraction(0, k, 220),
    expected: (k * k * 1) / iAvg,
    unit: 'fractional depth',
    tolerance: 3e-3,
    why: "The intensity at disk center is 1 by construction of the quadratic law, so the depth is k^2 / <I>, a 21% enhancement over the naive k^2. The instrument gets there by numerical quadrature over a 220-square grid, whose truncation error at the planet's edge is a few parts in a thousand. That is the whole tolerance; the physics itself is exact.",
    source: 'Quadratic limb darkening, Claret (2000)',
  });

  add({
    group: 'Transit geometry',
    kind: 'analytic',
    name: 'No light is blocked once the planet is off the disk',
    measured: transitWidgets.blockedFraction(1 + k + 1e-9, k, 60),
    expected: 0,
    unit: 'fractional depth',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'Exactly zero, not nearly zero: the baseline of a light curve is what a student measures the depth against.',
  });

  add({
    group: 'Transit geometry',
    kind: 'analytic',
    name: 'A grazing transit is shallower than a central one',
    measured:
      transitWidgets.blockedFraction(0.9, k, 220) <
      transitWidgets.blockedFraction(0, k, 220),
    expected: true,
    why: 'Limb darkening plus partial overlap. The investigation asks students to explain why impact parameter changes depth as well as duration, so the instrument has to actually do it.',
  });

  add({
    group: 'Transit geometry',
    kind: 'analytic',
    name: 'Sky separation at mid-transit equals the impact parameter',
    measured: transitWidgets.separationAt(0, 12, 0.4),
    expected: 0.4,
    unit: 'stellar radii',
    tolerance: 1e-12,
    why: 'The definition of the impact parameter, checked in the geometry the widget draws from.',
  });

  // Transit duration, against the standard analytic expression.
  const aOverR = 12;
  const b = 0.3;
  add({
    group: 'Transit geometry',
    kind: 'analytic',
    name: 'Transit half-duration matches the analytic expression',
    measured: transitWidgets.halfDuration(aOverR, b, k),
    expected: Math.asin(
      Math.sqrt(((1 + k) ** 2 - b ** 2) / (aOverR ** 2 - b ** 2))
    ),
    unit: 'radians of orbital phase',
    tolerance: 1e-12,
    why: 'The textbook duration formula for a circular orbit. Exact arithmetic, so machine precision.',
    source: 'Seager & Mallen-Ornelas (2003) ApJ 585, 1038',
  });

  add({
    group: 'Transit geometry',
    kind: 'analytic',
    name: 'No transit when the impact parameter exceeds 1 + k',
    measured: transitWidgets.halfDuration(aOverR, 1 + k + 0.01, k),
    expected: 0,
    unit: 'radians',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'Exactly zero, because the geometry admits no transit at all: the planet\'s disk never touches the star\'s. A duration of "almost zero" would draw a spurious dip, which is the artifact a student would then try to measure.',
  });
}
