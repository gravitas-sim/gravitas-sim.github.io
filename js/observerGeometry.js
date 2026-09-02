// =============================================================================
// Where the observer is standing
// -----------------------------------------------------------------------------
// One observer, shared by every measurement that depends on where you look from:
// transit photometry, radial velocity and astrometry. Before this module,
// lightCurve.js owned an `observerAngleDeg` and the arrow that set it, which was
// the right shape when photometry was the only observer-dependent instrument. It
// stops being the right shape the moment three instruments have to agree.
//
// Two quantities, and they are not the same thing:
//
//   POSITION ANGLE  phi   Which way around the orbital plane you are standing.
//                         This is the old observerAngleDeg. It decides *when*
//                         conjunction happens - the phase of a transit or of an
//                         RV curve - and for a circular orbit it does not change
//                         any amplitude.
//
//   INCLINATION     i     How tilted the orbit looks from here. i = 90 degrees
//                         is edge-on, i = 0 is face-on. This is the quantity
//                         that scales the radial-velocity amplitude and opens or
//                         closes the astrometric ellipse, and it is the one the
//                         famous M sin i degeneracy is about.
//
// A 3-D viewing geometry over a 2-D dynamical model
// ------------------------------------------------------------------------------
// Gravitas integrates gravity in a plane, and this module does not change that.
// The simulated system is taken to lie in z = 0 and the observer direction is
// built analytically in three dimensions, so a planar orbit can be projected
// into a line of sight and a plane of sky without a 3-D N-body rewrite.
//
// The line-of-sight unit vector, pointing from the system toward the observer:
//
//   n = ( sin i cos phi ,  sin i sin phi ,  cos i )
//
// at i = 90 that is (cos phi, sin phi, 0), lying in the orbital plane; at i = 0
// it is (0, 0, 1), straight out of it.
//
// The sky plane is spanned by two unit vectors perpendicular to n:
//
//   e1 = ( -sin phi ,  cos phi ,  0 )
//   e2 = n x e1 = ( -cos i cos phi ,  -cos i sin phi ,  sin i )
//
// At i = 90 this reduces term for term to the arithmetic lightCurve.js already
// used, so the default geometry reproduces every existing transit result
// exactly rather than approximately.
// =============================================================================

const DEG = Math.PI / 180;

/** Edge-on. The default, and the only inclination that can produce a transit. */
export const EDGE_ON_DEG = 90;

const state = {
  positionAngleDeg: 0,
  inclinationDeg: EDGE_ON_DEG,
};

const listeners = new Set();

/**
 * Subscribe to observer changes.
 *
 * Panels use this to clear or rephase recorded data: a light curve, an RV series
 * and an astrometric trail all become meaningless the moment the observer moves,
 * because the samples in them were taken from somewhere else.
 *
 * @param {Function} fn - Called with the new geometry
 * @returns {Function} Unsubscribe
 */
export function onObserverChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  const geometry = observerGeometry();
  for (const fn of listeners) {
    try {
      fn(geometry);
    } catch (err) {
      // A broken panel must not stop the others from being told.
      console.warn('Observer listener failed:', err);
    }
  }
}

/** @returns {number} Position angle in degrees, 0 to 360 */
export const getPositionAngle = () => state.positionAngleDeg;

/** @returns {number} Inclination in degrees, 0 (face-on) to 180 */
export const getInclination = () => state.inclinationDeg;

/**
 * Set the position angle.
 * @param {number} deg - Degrees; wrapped into 0 to 360
 */
export function setPositionAngle(deg) {
  const next = (((Number(deg) || 0) % 360) + 360) % 360;
  if (next === state.positionAngleDeg) return;
  state.positionAngleDeg = next;
  notify();
}

/**
 * Set the inclination.
 *
 * Clamped to 0 to 180 rather than wrapped: an inclination is a tilt, and
 * wrapping 91 degrees around to 89 would silently mirror the orbit.
 *
 * @param {number} deg - Degrees, 0 face-on to 90 edge-on
 */
export function setInclination(deg) {
  const next = Math.min(180, Math.max(0, Number(deg) || 0));
  if (next === state.inclinationDeg) return;
  state.inclinationDeg = next;
  notify();
}

/** Put the observer back edge-on at position angle zero. */
export function resetObserver() {
  const changed =
    state.positionAngleDeg !== 0 || state.inclinationDeg !== EDGE_ON_DEG;
  state.positionAngleDeg = 0;
  state.inclinationDeg = EDGE_ON_DEG;
  if (changed) notify();
}

/**
 * The current geometry, with its trigonometry precomputed.
 *
 * Returned as a plain snapshot so a caller can hold it for a whole frame without
 * recomputing sines per body, and so the pure helpers below can be handed a
 * hand-built geometry in a test without touching module state.
 *
 * @returns {{positionAngleDeg: number, inclinationDeg: number,
 *   cosPhi: number, sinPhi: number, cosI: number, sinI: number}} Geometry
 */
export function observerGeometry() {
  return geometryFor(state.positionAngleDeg, state.inclinationDeg);
}

/**
 * Build a geometry from angles, without touching the shared observer.
 *
 * @param {number} positionAngleDeg - Position angle in degrees
 * @param {number} inclinationDeg - Inclination in degrees
 * @returns {object} Geometry snapshot
 */
export function geometryFor(positionAngleDeg, inclinationDeg = EDGE_ON_DEG) {
  const phi = positionAngleDeg * DEG;
  const inc = inclinationDeg * DEG;
  return {
    positionAngleDeg,
    inclinationDeg,
    cosPhi: Math.cos(phi),
    sinPhi: Math.sin(phi),
    cosI: Math.cos(inc),
    sinI: Math.sin(inc),
  };
}

/**
 * The line-of-sight unit vector, pointing from the system toward the observer.
 *
 * @param {object} [geometry] - Defaults to the shared observer
 * @returns {{x: number, y: number, z: number}} Unit vector
 */
export function lineOfSightVector(geometry = observerGeometry()) {
  return {
    x: geometry.sinI * geometry.cosPhi,
    y: geometry.sinI * geometry.sinPhi,
    z: geometry.cosI,
  };
}

/**
 * How far in front of the origin a body lies, along the line of sight.
 *
 * Positive means nearer the observer, which is the test for "could be
 * transiting" rather than "could be behind the star".
 *
 * @param {{x: number, y: number}} position - Position in the orbital plane
 * @param {object} [geometry] - Defaults to the shared observer
 * @returns {number} Depth in the same units as position
 */
export function lineOfSightDepth(position, geometry = observerGeometry()) {
  return (
    geometry.sinI *
    (position.x * geometry.cosPhi + position.y * geometry.sinPhi)
  );
}

/**
 * Project a planar position onto the plane of the sky.
 *
 * @param {{x: number, y: number}} position - Position in the orbital plane
 * @param {object} [geometry] - Defaults to the shared observer
 * @returns {{x: number, y: number}} Sky-plane offsets, same units as input
 */
export function projectPositionToSky(position, geometry = observerGeometry()) {
  const along = position.x * geometry.cosPhi + position.y * geometry.sinPhi;
  return {
    x: -position.x * geometry.sinPhi + position.y * geometry.cosPhi,
    y: -geometry.cosI * along,
  };
}

/**
 * Apparent separation of a body from the origin, on the sky.
 *
 * This is the quantity a transit is decided by. At i = 90 it collapses to the
 * absolute in-plane offset perpendicular to the line of sight, which is what
 * the light curve measured before inclination existed.
 *
 * @param {{x: number, y: number}} position - Position relative to the star
 * @param {object} [geometry] - Defaults to the shared observer
 * @returns {number} Separation in the same units as position
 */
export function projectedSeparation(position, geometry = observerGeometry()) {
  const sky = projectPositionToSky(position, geometry);
  return Math.hypot(sky.x, sky.y);
}

/**
 * The line-of-sight component of a velocity: the radial velocity.
 *
 * Positive is receding, negative is approaching, which is the sign convention
 * every spectrograph and every textbook uses.
 *
 * Note the sign: the line-of-sight vector points *toward* the observer, so a
 * body moving along it is coming closer and must report negative.
 *
 * @param {{x: number, y: number}} velocity - Velocity in the orbital plane
 * @param {object} [geometry] - Defaults to the shared observer
 * @returns {number} Radial velocity, same units as velocity
 */
export function projectVelocityLOS(velocity, geometry = observerGeometry()) {
  return (
    -geometry.sinI *
    (velocity.x * geometry.cosPhi + velocity.y * geometry.sinPhi)
  );
}
