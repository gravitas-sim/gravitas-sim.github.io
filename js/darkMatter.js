// =============================================================================
// Dark matter: a halo term for the force law, and the measurements that expose it
// -----------------------------------------------------------------------------
// Everything here is pure. It takes numbers and arrays and returns numbers, and
// it does not know about the simulation, the DOM or the settings object. That is
// what lets the same functions serve the rotation-curve panel, the investigation
// widgets and the tests, and it is what makes the claims in the lesson checkable.
//
// Two separate pieces of physics live in this file, because the case for dark
// matter was built twice, from two different directions:
//
//   Zwicky, 1933. Measure how fast the galaxies in a cluster are moving, apply
//   the virial theorem, and get a mass. Compare it with the mass you can see.
//   Zwicky's answer was off by a factor of a few hundred and he said so.
//
//   Rubin and Ford, 1970s. Measure orbital speed against radius in a spiral
//   galaxy. If the mass you can see is all the mass there is, the curve should
//   fall away as r^-1/2 past the bright part. It does not. It stays flat.
//
// The halo model below is what makes the second one come out right, and it is
// the toggle a student switches on to watch a falling curve flatten.
// =============================================================================

/**
 * The pseudo-isothermal halo, the profile that flattens a rotation curve.
 *
 * Density falls as
 *
 *   rho(r) = rho_0 / (1 + (r/r_c)^2)
 *
 * which gives a circular speed that rises from zero at the center, turns over
 * near the core radius, and approaches a constant far out:
 *
 *   v_c^2(r) = v_flat^2 * [ 1 - (r_c/r) * arctan(r/r_c) ]
 *
 * That asymptote is the whole point. A mass distribution that stops somewhere
 * gives v ~ r^-1/2 outside itself, because the enclosed mass stops growing. A
 * halo whose enclosed mass keeps growing in proportion to r gives a flat curve,
 * and a flat curve is what telescopes actually see.
 *
 * This is the profile used to fit real rotation curves - Begeman's work on
 * NGC 3198 is the standard reference - rather than a curve invented to look
 * right. It is also well behaved at r = 0, where the speed goes to zero
 * linearly and the acceleration stays finite. An NFW profile is a better fit to
 * simulations of structure formation and a worse fit to this job: it is cuspy
 * at the center, which would put a singularity in the middle of a scenario
 * students are asked to fly a star through.
 *
 * @param {number} r - Distance from the halo center, simulation units
 * @param {number} vFlat - Asymptotic circular speed, simulation units
 * @param {number} coreRadius - Core radius r_c, simulation units
 * @returns {number} Circular speed contributed by the halo at r
 */
export function haloCircularSpeed(r, vFlat, coreRadius) {
  if (!(r > 0) || !(vFlat > 0) || !(coreRadius > 0)) return 0;
  const x = r / coreRadius;
  // Near the center the bracket is a difference of two nearly equal numbers and
  // loses every significant digit it has. The series 1 - arctan(x)/x = x^2/3 -
  // x^4/5 + ... is exact to double precision well before x reaches this cutoff.
  const bracket =
    x < 1e-3 ? (x * x) / 3 - (x * x * x * x) / 5 : 1 - Math.atan(x) / x;
  return vFlat * Math.sqrt(Math.max(0, bracket));
}

/**
 * Acceleration from the halo at a point, directed at the halo center.
 *
 * A circular orbit needs a = v^2/r, so the halo's contribution to the
 * acceleration is exactly its circular speed squared over r.
 *
 * @param {{x: number, y: number}} pos - Position, simulation units
 * @param {object} halo - Halo parameters
 * @param {number} halo.vFlat - Asymptotic circular speed
 * @param {number} halo.coreRadius - Core radius
 * @param {{x: number, y: number}} [halo.center] - Halo center, default origin
 * @returns {{ax: number, ay: number}} Acceleration components
 */
export function haloAcceleration(pos, halo) {
  const cx = halo?.center?.x ?? 0;
  const cy = halo?.center?.y ?? 0;
  const dx = cx - pos.x;
  const dy = cy - pos.y;
  const r = Math.hypot(dx, dy);
  if (!(r > 0)) return { ax: 0, ay: 0 };

  const v = haloCircularSpeed(r, halo.vFlat, halo.coreRadius);
  const aMag = (v * v) / r;
  return { ax: (aMag * dx) / r, ay: (aMag * dy) / r };
}

/**
 * How much halo mass lies inside radius r.
 *
 * Read straight off the circular speed: any spherical distribution obeys
 * v_c^2 = G M(<r) / r, so the mass is whatever the speed implies.
 *
 * @param {number} r - Radius, simulation units
 * @param {object} halo - Halo parameters, as haloAcceleration
 * @param {number} G - Gravitational constant in simulation units
 * @returns {number} Enclosed halo mass in simulation mass units
 */
export function haloEnclosedMass(r, halo, G) {
  if (!(r > 0) || !(G > 0)) return 0;
  const v = haloCircularSpeed(r, halo.vFlat, halo.coreRadius);
  return (v * v * r) / G;
}

// --- What the simulation itself shows -----------------------------------------

/**
 * The mass-weighted center of a set of bodies, and their total mass.
 *
 * A rotation curve is measured about the center of the thing rotating, and for
 * a galaxy that is the center of mass rather than the brightest object in it.
 *
 * @param {Array<{pos: {x: number, y: number}, mass: number}>} bodies - Bodies
 * @returns {{x: number, y: number, mass: number}} Center and total mass
 */
export function massCenter(bodies) {
  let mx = 0;
  let my = 0;
  let total = 0;
  for (const b of bodies) {
    if (!b || !isFinite(b.mass) || b.mass <= 0) continue;
    mx += b.pos.x * b.mass;
    my += b.pos.y * b.mass;
    total += b.mass;
  }
  if (total <= 0) return { x: 0, y: 0, mass: 0 };
  return { x: mx / total, y: my / total, mass: total };
}

/**
 * Visible mass inside a radius.
 *
 * "Visible" here means the mass that is actually made of objects: the stars,
 * the black holes, the planets. This is the quantity a real astronomer infers
 * from light, and the quantity that turns out not to be enough.
 *
 * @param {Array} bodies - Bodies with pos and mass
 * @param {{x: number, y: number}} center - Center to measure from
 * @param {number} r - Radius, simulation units
 * @returns {number} Enclosed mass in simulation mass units
 */
export function enclosedVisibleMass(bodies, center, r) {
  let m = 0;
  for (const b of bodies) {
    if (!b || !isFinite(b.mass) || b.mass <= 0) continue;
    if (Math.hypot(b.pos.x - center.x, b.pos.y - center.y) <= r) m += b.mass;
  }
  return m;
}

/**
 * The circular speed the visible mass alone would produce at radius r.
 *
 * This is the prediction the flat rotation curve refutes. Outside the bulk of
 * the mass the enclosed total stops growing and the curve falls as r^-1/2,
 * which is the Solar System's behavior and the reason a planetary system is
 * the right thing to compare a galaxy against.
 *
 * @param {Array} bodies - Bodies with pos and mass
 * @param {{x: number, y: number}} center - Center to measure from
 * @param {number} r - Radius, simulation units
 * @param {number} G - Gravitational constant in simulation units
 * @returns {number} Predicted circular speed
 */
export function keplerianSpeed(bodies, center, r, G) {
  if (!(r > 0)) return 0;
  return Math.sqrt((G * enclosedVisibleMass(bodies, center, r)) / r);
}

/**
 * The circular speed with the halo included.
 *
 * Speeds from separate mass components add in quadrature, because it is the
 * accelerations that add and a = v^2/r for each of them.
 *
 * @param {Array} bodies - Bodies with pos and mass
 * @param {{x: number, y: number}} center - Center to measure from
 * @param {number} r - Radius, simulation units
 * @param {number} G - Gravitational constant in simulation units
 * @param {?object} halo - Halo parameters, or null for no halo
 * @returns {number} Predicted circular speed
 */
export function totalCircularSpeed(bodies, center, r, G, halo) {
  const vb = keplerianSpeed(bodies, center, r, G);
  if (!halo) return vb;
  const vh = haloCircularSpeed(r, halo.vFlat, halo.coreRadius);
  return Math.sqrt(vb * vb + vh * vh);
}

/**
 * Turn a set of bodies into the points of a rotation curve.
 *
 * Each body contributes its distance from the center and its speed about that
 * center. The speed is measured in the center's own frame, so a galaxy drifting
 * across the screen does not add its drift to every point on the curve.
 *
 * The tangential component is reported separately from the total speed because
 * they answer different questions: the total is what the body is doing, the
 * tangential part is what a circular orbit at that radius would need.
 *
 * @param {Array} bodies - Bodies with pos, vel and mass
 * @param {{x: number, y: number}} center - Center to measure about
 * @param {{x: number, y: number}} [centerVel] - Center's own velocity
 * @returns {Array<{r: number, speed: number, tangential: number, mass: number, body: object}>} Points
 */
export function rotationCurvePoints(
  bodies,
  center,
  centerVel = { x: 0, y: 0 }
) {
  const pts = [];
  for (const b of bodies) {
    if (!b || !b.pos || !b.vel) continue;
    const dx = b.pos.x - center.x;
    const dy = b.pos.y - center.y;
    const r = Math.hypot(dx, dy);
    if (!(r > 0)) continue;
    const vx = b.vel.x - centerVel.x;
    const vy = b.vel.y - centerVel.y;
    // Tangential unit vector is the radial one turned a quarter turn.
    const tangential = Math.abs((-dy * vx + dx * vy) / r);
    pts.push({
      r,
      speed: Math.hypot(vx, vy),
      tangential,
      mass: b.mass,
      body: b,
    });
  }
  return pts.sort((a, b) => a.r - b.r);
}

/**
 * Fit a power law v = A * r^p to a set of rotation-curve points.
 *
 * The exponent is the number the lesson turns on. Kepler says -0.5. A flat
 * curve says 0. Measuring it rather than eyeballing the shape is what makes the
 * difference an observation instead of an impression.
 *
 * Least squares on log v against log r, which is the standard way to do this
 * and is what makes the fit insensitive to the units either axis is in.
 *
 * @param {Array<{r: number, speed: number}>} points - Curve points
 * @param {number} [rMin] - Ignore points inside this radius
 * @returns {?{exponent: number, coefficient: number, count: number}} Fit, or
 *   null when there are not enough usable points
 */
export function fitPowerLaw(points, rMin = 0) {
  const usable = points.filter(p => p.r > rMin && p.r > 0 && p.speed > 0);
  if (usable.length < 3) return null;

  let sx = 0;
  let sy = 0;
  for (const p of usable) {
    sx += Math.log(p.r);
    sy += Math.log(p.speed);
  }
  const mx = sx / usable.length;
  const my = sy / usable.length;

  let num = 0;
  let den = 0;
  for (const p of usable) {
    const dx = Math.log(p.r) - mx;
    num += dx * (Math.log(p.speed) - my);
    den += dx * dx;
  }
  // Every point at the same radius: a slope is not defined and reporting one
  // would be inventing a measurement.
  if (!(den > 0)) return null;

  const exponent = num / den;
  return {
    exponent,
    coefficient: Math.exp(my - exponent * mx),
    count: usable.length,
  };
}

// --- Zwicky's route -----------------------------------------------------------

/**
 * Velocity dispersion of a set of bodies about their mean motion.
 *
 * @param {Array<{vel: {x: number, y: number}}>} bodies - Bodies
 * @returns {{sigma: number, meanSquare: number, count: number}} Dispersion, the
 *   mean square speed about the mean, and how many bodies went into them
 */
export function velocityDispersion(bodies) {
  const vs = bodies.filter(b => b && b.vel);
  if (vs.length < 2) return { sigma: 0, meanSquare: 0, count: vs.length };

  let mvx = 0;
  let mvy = 0;
  for (const b of vs) {
    mvx += b.vel.x;
    mvy += b.vel.y;
  }
  mvx /= vs.length;
  mvy /= vs.length;

  let sum = 0;
  for (const b of vs) {
    const dx = b.vel.x - mvx;
    const dy = b.vel.y - mvy;
    sum += dx * dx + dy * dy;
  }
  const meanSquare = sum / vs.length;
  return { sigma: Math.sqrt(meanSquare), meanSquare, count: vs.length };
}

/**
 * The virial mass of a bound system.
 *
 * For a system in equilibrium the virial theorem says 2K + U = 0. Taking a
 * uniform sphere of radius R, for which U = -(3/5) G M^2 / R, and writing the
 * kinetic energy as (1/2) M <v^2>, this rearranges to
 *
 *   M = (5/3) R <v^2> / G
 *
 * and that is all Zwicky needed. He measured <v^2> from redshifts, estimated R
 * from the sky, and got a mass four hundred times the mass of the light. He
 * called the excess dunkle Materie and nobody believed him for forty years.
 *
 * This takes the full mean square speed rather than a line-of-sight dispersion,
 * because the conversion between them depends on how many dimensions the
 * velocities are spread over and getting it wrong is the classic error here.
 * Use losToMeanSquare for that step, deliberately, and in the open.
 *
 * @param {number} meanSquareSpeed - <v^2> of the members
 * @param {number} radius - Characteristic radius of the system
 * @param {number} G - Gravitational constant in simulation units
 * @returns {number} Virial mass in simulation mass units
 */
export function virialMass(meanSquareSpeed, radius, G) {
  if (!(radius > 0) || !(G > 0) || !(meanSquareSpeed > 0)) return 0;
  return (5 / 3) * ((radius * meanSquareSpeed) / G);
}

/**
 * Convert a line-of-sight dispersion into a full mean square speed.
 *
 * A spectrum gives one component of a velocity, not three. If the orbits are
 * isotropic, each of the three directions carries the same share, so
 * <v^2> = 3 * sigma_los^2. That factor of three is the step that turns one
 * measurable number into the quantity the virial theorem wants.
 *
 * The simulation is planar, so its velocities are spread over two dimensions
 * rather than three, and the honest factor there is 2. The lesson says so
 * rather than quietly using three and hoping.
 *
 * @param {number} sigmaLos - Line-of-sight velocity dispersion
 * @param {number} [dimensions] - How many dimensions the motion occupies
 * @returns {number} Mean square speed
 */
export function losToMeanSquare(sigmaLos, dimensions = 3) {
  return dimensions * sigmaLos * sigmaLos;
}

/**
 * How much more mass is there than meets the eye.
 *
 * @param {number} dynamicalMass - Mass inferred from motion
 * @param {number} visibleMass - Mass of the objects you can see
 * @returns {?number} The ratio, or null when there is nothing to compare
 */
export function massDiscrepancy(dynamicalMass, visibleMass) {
  if (!(visibleMass > 0) || !isFinite(dynamicalMass)) return null;
  return dynamicalMass / visibleMass;
}

// =============================================================================
// Rotation curves of individual mass components
// -----------------------------------------------------------------------------
// The functions above measure a rotation curve out of the simulation. The ones
// below predict one from an assumed mass distribution, which is the other half
// of the argument and the half a student has to be able to do by hand before
// the flat curve means anything.
//
// Three components, because three is what it takes to decompose a real galaxy
// and it is what every published decomposition uses:
//
//   a bulge, treated as a point mass, giving the Keplerian v ~ r^-1/2
//   a disc, exponential and thin, giving a curve that rises, peaks and falls
//   a halo, the pseudo-isothermal profile already above, rising to a plateau
//
// Speeds add in quadrature, because accelerations add and a = v^2/r for each.
//
// Everything is in one consistent set of units: pass a G, masses and radii that
// agree with each other and the speeds come back in the matching unit. The
// widgets use kiloparsecs, solar masses and km/s, for which
// G = 4.301e-6 kpc (km/s)^2 / M_sun.
// =============================================================================

/** G in the units a galaxy rotation curve is usually written in. */
export const G_GALACTIC = 4.30091727e-6;

/**
 * Circular speed around a point mass.
 *
 * The bulge of a spiral is not a point, but outside it the field of any
 * spherical distribution is the field of a point at its centre, and outside it
 * is where a rotation curve is measured. This is the falling curve the lesson
 * starts from.
 *
 * @param {number} r - Radius
 * @param {number} mass - Enclosed mass
 * @param {number} [G] - Gravitational constant in matching units
 * @returns {number} Circular speed
 */
export function pointMassSpeed(r, mass, G = G_GALACTIC) {
  if (!(r > 0) || !(mass > 0)) return 0;
  return Math.sqrt((G * mass) / r);
}

/**
 * Circular speed inside and outside a uniform sphere of mass M and radius R.
 *
 * Worth having as a component a student can select, because it is the one case
 * where the rising and the falling halves are both obvious: inside, the
 * enclosed mass grows as r^3 and the speed grows as r; outside, the enclosed
 * mass is fixed and the speed falls as r^-1/2. Every real curve is some version
 * of that story, and the peak is where the mass runs out.
 *
 * @param {number} r - Radius
 * @param {number} mass - Total mass
 * @param {number} radius - Radius of the sphere
 * @param {number} [G] - Gravitational constant
 * @returns {number} Circular speed
 */
export function uniformSphereSpeed(r, mass, radius, G = G_GALACTIC) {
  if (!(r > 0) || !(mass > 0) || !(radius > 0)) return 0;
  const enclosed = r >= radius ? mass : mass * (r / radius) ** 3;
  return Math.sqrt((G * enclosed) / r);
}

// --- Modified Bessel functions -------------------------------------------------
//
// Needed for the thin exponential disc below, and for nothing else in this
// project. The polynomial approximations are Abramowitz & Stegun 9.8.1-9.8.8,
// which are good to about 1e-7 relative - four orders of magnitude better than
// the precision of any rotation curve ever measured, and far better than the
// alternative of pretending a disc is a sphere.
//
// A disc is not a sphere and the difference is not small. A thin exponential
// disc's rotation curve peaks at about 2.2 scale lengths and falls more slowly
// than Keplerian afterwards, because mass at larger radius than the orbit still
// pulls inward when it is in the same plane. Modelling the disc as a sphere with
// the same enclosed mass understates its peak speed by roughly 15% and moves the
// peak inward, which in a fitting exercise gets absorbed into the halo - and the
// halo is the thing being measured.

/** Modified Bessel function I0. A&S 9.8.1 and 9.8.2. */
export function besselI0(x) {
  const ax = Math.abs(x);
  if (ax < 3.75) {
    const t = (x / 3.75) ** 2;
    return (
      1.0 +
      t *
        (3.5156229 +
          t *
            (3.0899424 +
              t *
                (1.2067492 +
                  t * (0.2659732 + t * (0.0360768 + t * 0.0045813)))))
    );
  }
  const t = 3.75 / ax;
  return (
    (Math.exp(ax) / Math.sqrt(ax)) *
    (0.39894228 +
      t *
        (0.01328592 +
          t *
            (0.00225319 +
              t *
                (-0.00157565 +
                  t *
                    (0.00916281 +
                      t *
                        (-0.02057706 +
                          t *
                            (0.02635537 +
                              t * (-0.01647633 + t * 0.00392377))))))))
  );
}

/** Modified Bessel function I1. A&S 9.8.3 and 9.8.4. */
export function besselI1(x) {
  const ax = Math.abs(x);
  let out;
  if (ax < 3.75) {
    const t = (x / 3.75) ** 2;
    out =
      ax *
      (0.5 +
        t *
          (0.87890594 +
            t *
              (0.51498869 +
                t *
                  (0.15084934 +
                    t * (0.02658733 + t * (0.00301532 + t * 0.00032411))))));
  } else {
    const t = 3.75 / ax;
    const a =
      0.02282967 + t * (-0.02895312 + t * (0.01787654 + t * -0.00420059));
    const b =
      0.39894228 +
      t *
        (-0.03988024 +
          t * (-0.00362018 + t * (0.00163801 + t * (-0.01031555 + t * a))));
    out = (b * Math.exp(ax)) / Math.sqrt(ax);
  }
  return x < 0 ? -out : out;
}

/** Modified Bessel function K0. A&S 9.8.5 and 9.8.6. */
export function besselK0(x) {
  if (!(x > 0)) return Infinity;
  if (x <= 2) {
    const t = (x * x) / 4;
    return (
      -Math.log(x / 2) * besselI0(x) +
      (-0.57721566 +
        t *
          (0.4227842 +
            t *
              (0.23069756 +
                t *
                  (0.0348859 +
                    t * (0.00262698 + t * (0.0001075 + t * 0.0000074))))))
    );
  }
  const t = 2 / x;
  return (
    (Math.exp(-x) / Math.sqrt(x)) *
    (1.25331414 +
      t *
        (-0.07832358 +
          t *
            (0.02189568 +
              t *
                (-0.01062446 +
                  t * (0.00587872 + t * (-0.0025154 + t * 0.00053208))))))
  );
}

/** Modified Bessel function K1. A&S 9.8.7 and 9.8.8. */
export function besselK1(x) {
  if (!(x > 0)) return Infinity;
  if (x <= 2) {
    const t = (x * x) / 4;
    return (
      Math.log(x / 2) * besselI1(x) +
      (1 / x) *
        (1.0 +
          t *
            (0.15443144 +
              t *
                (-0.67278579 +
                  t *
                    (-0.18156897 +
                      t *
                        (-0.01919402 + t * (-0.00110404 + t * -0.00004686))))))
    );
  }
  const t = 2 / x;
  return (
    (Math.exp(-x) / Math.sqrt(x)) *
    (1.25331414 +
      t *
        (0.23498619 +
          t *
            (-0.0365562 +
              t *
                (0.01504268 +
                  t * (-0.00780353 + t * (0.00325614 + t * -0.00068245))))))
  );
}

/**
 * Circular speed of a thin exponential disc. Freeman (1970).
 *
 * Surface density falls as Sigma(r) = Sigma_0 exp(-r/Rd), and the circular
 * speed in the plane of such a disc is
 *
 *   v^2(r) = 4 pi G Sigma_0 Rd y^2 [ I0(y)K0(y) - I1(y)K1(y) ],   y = r / 2Rd
 *
 * with total mass M = 2 pi Sigma_0 Rd^2, so Sigma_0 = M / (2 pi Rd^2).
 *
 * The shape is the point: it rises from zero, peaks near 2.2 scale lengths, and
 * declines afterwards more gently than a point mass would. That decline is what
 * a real spiral's stellar disc contributes, and it is nowhere near flat.
 *
 * @param {number} r - Radius
 * @param {number} mass - Total disc mass
 * @param {number} scaleLength - Exponential scale length Rd
 * @param {number} [G] - Gravitational constant
 * @returns {number} Circular speed
 */
export function exponentialDiscSpeed(r, mass, scaleLength, G = G_GALACTIC) {
  if (!(r > 0) || !(mass > 0) || !(scaleLength > 0)) return 0;
  const sigma0 = mass / (2 * Math.PI * scaleLength * scaleLength);
  const y = r / (2 * scaleLength);
  const bracket = besselI0(y) * besselK0(y) - besselI1(y) * besselK1(y);
  const vSq = 4 * Math.PI * G * sigma0 * scaleLength * y * y * bracket;
  return vSq > 0 ? Math.sqrt(vSq) : 0;
}

/**
 * Every component of a model galaxy's rotation curve at one radius.
 *
 * Returns the parts as well as the total, because the parts are the lesson. A
 * student who sees only the total has been handed a curve; a student who can see
 * the bulge falling, the disc peaking and the halo climbing underneath it can
 * say which of them is doing the work at each radius, and that is the whole
 * skill the fitting exercise is trying to build.
 *
 * @param {number} r - Radius, kpc
 * @param {Object} model - Component parameters
 * @param {number} [model.bulgeMass] - Point-mass bulge, solar masses
 * @param {number} [model.discMass] - Exponential disc mass, solar masses
 * @param {number} [model.discScale] - Disc scale length, kpc
 * @param {number} [model.haloVFlat] - Halo asymptotic speed, km/s
 * @param {number} [model.haloCore] - Halo core radius, kpc
 * @param {number} [G] - Gravitational constant
 * @returns {{bulge: number, disc: number, halo: number, visible: number, total: number}} Speeds
 */
export function galaxyCurveAt(r, model, G = G_GALACTIC) {
  const bulge = pointMassSpeed(r, model.bulgeMass || 0, G);
  const disc = exponentialDiscSpeed(
    r,
    model.discMass || 0,
    model.discScale || 1,
    G
  );
  const halo = haloCircularSpeed(r, model.haloVFlat || 0, model.haloCore || 1);
  const visible = Math.hypot(bulge, disc);
  return {
    bulge,
    disc,
    halo,
    visible,
    total: Math.hypot(visible, halo),
  };
}

/**
 * Sample a model galaxy's curve over a range of radii.
 *
 * @param {Object} model - As galaxyCurveAt
 * @param {number} rMax - Outer radius, kpc
 * @param {number} [samples] - How many points
 * @param {number} [G] - Gravitational constant
 * @returns {Array<Object>} Points with r and every component speed
 */
export function galaxyCurve(model, rMax, samples = 80, G = G_GALACTIC) {
  const out = [];
  for (let i = 1; i <= samples; i++) {
    const r = (rMax * i) / samples;
    out.push({ r, ...galaxyCurveAt(r, model, G) });
  }
  return out;
}

/**
 * Mass enclosed within radius r, inferred from a circular speed.
 *
 * The inversion of v = sqrt(GM/r), and the single most important line in the
 * lesson: it is what turns a measured speed into a mass, with no assumption
 * about what the mass is made of or whether it shines.
 *
 * Strictly this is the spherical relation, and a disc is not spherical. It is
 * still the quantity every rotation-curve argument is made in, because the
 * conclusion - that the enclosed total keeps growing where the light has
 * stopped - does not depend on the geometry factor, which is of order one.
 *
 * @param {number} r - Radius
 * @param {number} speed - Circular speed at that radius
 * @param {number} [G] - Gravitational constant
 * @returns {number} Enclosed mass
 */
export function enclosedMassFromSpeed(r, speed, G = G_GALACTIC) {
  if (!(r > 0) || !(speed > 0)) return 0;
  return (speed * speed * r) / G;
}

/**
 * How well a model curve matches a set of observed points.
 *
 * Root-mean-square residual in km/s, which is the number a real
 * rotation-curve fit is quoted with and is directly comparable with the
 * measurement uncertainty on the data. Reported alongside the worst single
 * residual, because an eye-fit that is good on average and badly wrong at one
 * end is a specific and instructive kind of wrong.
 *
 * @param {Array<{r: number, v: number}>} observed - Measured points
 * @param {Object} model - As galaxyCurveAt
 * @param {number} [G] - Gravitational constant
 * @returns {{rms: number, worst: number, worstR: number, n: number}} Fit quality
 */
export function curveResidual(observed, model, G = G_GALACTIC) {
  let sum = 0;
  let worst = 0;
  let worstR = 0;
  let n = 0;
  for (const p of observed) {
    if (!(p.r > 0) || !Number.isFinite(p.v)) continue;
    const d = galaxyCurveAt(p.r, model, G).total - p.v;
    sum += d * d;
    if (Math.abs(d) > Math.abs(worst)) {
      worst = d;
      worstR = p.r;
    }
    n++;
  }
  return n
    ? { rms: Math.sqrt(sum / n), worst, worstR, n }
    : { rms: NaN, worst: 0, worstR: 0, n: 0 };
}
