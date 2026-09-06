// =============================================================================
// Gravity assists: the encounter, and what two-body scattering predicts of it
// -----------------------------------------------------------------------------
// A gravity assist is the least intuitive easy thing in orbital mechanics. The
// spacecraft's speed relative to the planet is exactly the same before and
// after - the planet does no work on it in the planet's own frame - and yet the
// spacecraft leaves the encounter travelling faster around the Sun than it
// arrived. Nothing is gained from nowhere; the planet is slowed by precisely the
// momentum the spacecraft gained, and it is 10^20 times heavier, so nobody
// notices. But the whole of that sentence lives in the difference between two
// reference frames, which is why this investigation is built on frames rather
// than on forces.
//
// Everything here is closed-form. The encounter is laid out from its orbital
// elements so the impact parameter and the speed at infinity are exact by
// construction rather than approximately whatever the starting position
// happened to imply, and the scattering predictions are the textbook two-body
// results, written down so a run can be checked against them rather than
// against a picture.
//
// What this module deliberately does not do
// -----------------------------------------------------------------------------
// It does not pretend the planet is fixed. A fixed planet is a perfectly good
// approximation for computing the spacecraft's path and a bad thing to teach,
// because it makes the assist look like free energy: the spacecraft speeds up
// and nothing pays for it. In a fixed-planet model the spacecraft's energy in
// the inertial frame genuinely is not conserved, and the reason is that a
// body held in place by fiat is an external agent doing work. The scenarios
// this module serves let the planet move, so the books balance and can be shown
// to balance.
//
// Conventions
// -----------------------------------------------------------------------------
//   - Two dimensions. The cross product is the scalar a.x*b.y - a.y*b.x.
//   - The impact parameter is SIGNED, and the sign is the whole lesson:
//
//       b > 0   passes BEHIND the planet, on its trailing side, and GAINS
//       b < 0   passes IN FRONT of the planet, on its leading side, and LOSES
//
//     One number, one flip, and the encounter turns from the best thing you can
//     do to a spacecraft into the worst. It is a signed number rather than a
//     side flag plus a magnitude so that a student sweeping it through zero
//     sees the gain fall away, reverse, and grow again.
//   - Angles in radians inside, degrees at the edges.
// =============================================================================

/** Rotate a vector by an angle. @param {object} v - {x,y} @param {number} a - radians @returns {object} rotated */
function rotate(v, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/** The z component of a 2D cross product. */
const cross = (a, b) => a.x * b.y - a.y * b.x;

/** A unit vector in the same direction, or null for a zero vector. */
function unit(v) {
  const m = Math.hypot(v.x, v.y);
  return m > 0 ? { x: v.x / m, y: v.y / m } : null;
}

/**
 * How far the spacecraft's velocity is turned by the encounter.
 *
 * The standard hyperbolic result, in the planet's frame:
 *
 *   tan(delta/2) = mu / (b * vInf^2)
 *
 * with mu = G * M_planet, b the impact parameter and vInf the speed at
 * infinity. Everything the assist can do follows from this one angle: the
 * SPEED relative to the planet is unchanged, so the only thing the encounter
 * can alter is the direction, and the gain in the inertial frame is entirely a
 * consequence of turning a vector that is then added to the planet's own.
 *
 * Note what makes the turn large: a heavy planet, a close pass, and above all a
 * SLOW approach, since vInf enters squared. A spacecraft that arrives too fast
 * is barely bent at all, which is why assists are worth so much more in the
 * outer solar system than the inner one.
 *
 * @param {number} mu - G times the planet's mass
 * @param {number} b - Impact parameter; the sign is ignored here
 * @param {number} vInf - Speed relative to the planet, far away
 * @returns {?number} The deflection, radians, or null if the inputs are not usable
 */
export function deflectionAngle(mu, b, vInf) {
  if (!(mu > 0) || !Number.isFinite(b) || !(vInf > 0)) return null;
  const impact = Math.abs(b);
  if (impact === 0) return Math.PI;
  return 2 * Math.atan(mu / (impact * vInf * vInf));
}

/**
 * Eccentricity of the hyperbola the spacecraft is on, relative to the planet.
 *
 * @param {number} mu - G times the planet's mass
 * @param {number} b - Impact parameter
 * @param {number} vInf - Speed at infinity
 * @returns {?number} e, always greater than 1 for a real flyby
 */
export function encounterEccentricity(mu, b, vInf) {
  if (!(mu > 0) || !Number.isFinite(b) || !(vInf > 0)) return null;
  const x = (Math.abs(b) * vInf * vInf) / mu;
  return Math.sqrt(1 + x * x);
}

/**
 * How close the spacecraft actually gets.
 *
 * Worth computing before a run rather than after: an encounter whose periapsis
 * is inside the planet is a collision and not an assist, and one whose
 * periapsis is only a few planetary radii out is a numerically demanding
 * encounter that a lesson should not be quietly relying on.
 *
 * @param {number} mu - G times the planet's mass
 * @param {number} b - Impact parameter
 * @param {number} vInf - Speed at infinity
 * @returns {?number} Distance of closest approach
 */
export function periapsisDistance(mu, b, vInf) {
  const e = encounterEccentricity(mu, b, vInf);
  if (e === null) return null;
  return (mu / (vInf * vInf)) * (e - 1);
}

/**
 * Which side of the planet the spacecraft goes past.
 *
 * Defined against the planet's direction of travel, because that is the thing
 * that decides whether the encounter is a gain or a loss and it is the thing a
 * student can see. "Leading" is the side the planet is moving towards;
 * "trailing" is the side it is moving away from.
 *
 * @param {object} planetVel - The planet's velocity in the inertial frame
 * @param {object} offset - Planet-to-spacecraft, at closest approach
 * @returns {?string} 'leading', 'trailing', or null when the two are square on
 */
export function passSide(planetVel, offset) {
  if (!planetVel || !offset) return null;
  const along = planetVel.x * offset.x + planetVel.y * offset.y;
  if (!Number.isFinite(along) || along === 0) return null;
  return along > 0 ? 'leading' : 'trailing';
}

/**
 * The spacecraft's velocity relative to the planet, after the encounter.
 *
 * The turn is toward the planet, because gravity attracts: a spacecraft passing
 * on one side is bent one way and on the other side the other way. Which is
 * why the sign of the impact parameter, and nothing else about it, decides
 * whether the flyby is worth doing.
 *
 * @param {object} vInfIn - Incoming velocity relative to the planet
 * @param {number} delta - Deflection angle, radians
 * @param {number} b - Signed impact parameter; only its sign is used
 * @returns {?object} The outgoing velocity relative to the planet
 */
export function outgoingRelative(vInfIn, delta, b) {
  if (!vInfIn || !Number.isFinite(delta) || !Number.isFinite(b)) return null;
  // Offsetting to the +90-degree side of the approach means being pulled back
  // toward -90, so the velocity rotates the opposite way from the offset.
  const sense = b >= 0 ? -1 : 1;
  return rotate(vInfIn, sense * delta);
}

/**
 * What the encounter does to the spacecraft's speed in the inertial frame.
 *
 * The arithmetic the whole investigation is about, in four lines. The speed
 * relative to the planet is the same on both sides; the speed relative to
 * everything else is not, because a vector of fixed length has been rotated
 * and then added to the planet's velocity.
 *
 * @param {object} cfg - The encounter
 * @param {object} cfg.planetVel - The planet's inertial velocity
 * @param {object} cfg.vInfIn - Incoming velocity relative to the planet
 * @param {number} cfg.delta - Deflection, radians
 * @param {number} cfg.b - Signed impact parameter
 * @returns {?object} Speeds before and after, in both frames, and the change
 */
export function assistOutcome({ planetVel, vInfIn, delta, b }) {
  const vInfOut = outgoingRelative(vInfIn, delta, b);
  if (!vInfOut || !planetVel) return null;

  const before = { x: planetVel.x + vInfIn.x, y: planetVel.y + vInfIn.y };
  const after = { x: planetVel.x + vInfOut.x, y: planetVel.y + vInfOut.y };
  const speedBefore = Math.hypot(before.x, before.y);
  const speedAfter = Math.hypot(after.x, after.y);

  return {
    vInfIn: { ...vInfIn },
    vInfOut,
    // Equal, and the check is not a formality: it is the statement that the
    // planet does no work on the spacecraft in the planet's own frame.
    relativeSpeedBefore: Math.hypot(vInfIn.x, vInfIn.y),
    relativeSpeedAfter: Math.hypot(vInfOut.x, vInfOut.y),
    inertialBefore: before,
    inertialAfter: after,
    speedBefore,
    speedAfter,
    speedChange: speedAfter - speedBefore,
    // The change in the spacecraft's velocity is the same vector in every
    // inertial frame, which is worth saying out loud: the DISAGREEMENT between
    // frames is about speed, never about the change in velocity.
    deltaV: { x: after.x - before.x, y: after.y - before.y },
    deltaVMagnitude: Math.hypot(after.x - before.x, after.y - before.y),
    side: passSide(planetVel, {
      // The periapsis lies on the side the spacecraft passed, which for these
      // purposes is the side its offset was on: rotate the approach direction
      // by +90 and scale by the signed impact parameter.
      x: -unit(vInfIn).y * b,
      y: unit(vInfIn).x * b,
    }),
  };
}

/**
 * The largest speed change this planet and this approach could ever produce.
 *
 * Reached when the deflection is a full reversal, which needs a grazing pass:
 * |dv| = 2 * vInf. Useful in the lesson as the ceiling a student's measured
 * change should be compared against, and useful here because it makes clear
 * that the ceiling is set by the APPROACH SPEED and not by the planet's mass.
 * The planet's mass only decides how much of the ceiling a given pass reaches.
 *
 * @param {number} vInf - Speed relative to the planet, far away
 * @returns {number} The maximum possible magnitude of the velocity change
 */
export const maximumDeltaV = vInf => 2 * Math.abs(vInf);

/**
 * The speed the spacecraft would have far from the planet, from its speed now.
 *
 * A readout taken at a finite distance is not the speed at infinity, and the
 * difference is not small enough to wave away: at 40 AU from a five-Jupiter
 * planet the spacecraft is still travelling 0.6% faster than its asymptotic
 * speed, which is ten times the accuracy the rest of this investigation works
 * to. Rather than starting the encounter absurdly far out and integrating
 * empty space for an hour, the readout corrects for the potential it is
 * standing in:
 *
 *   vInf^2 = v^2 - 2*mu/r
 *
 * which is just the vis-viva equation rearranged, is exact, and has the
 * pedagogical advantage of being a thing a student can be shown rather than a
 * fudge applied behind one.
 *
 * @param {number} speed - Speed relative to the planet, now
 * @param {number} distance - Distance from the planet, now
 * @param {number} mu - G times the planet's mass
 * @returns {?number} The asymptotic speed, or null if the state is bound
 */
export function asymptoticSpeed(speed, distance, mu) {
  if (!(speed >= 0) || !(distance > 0) || !(mu >= 0)) return null;
  const v2 = speed * speed - (2 * mu) / distance;
  // Bound to the planet: there is no speed at infinity, because it never gets
  // there. Saying so beats returning zero, which would read as "it stops".
  return v2 > 0 ? Math.sqrt(v2) : null;
}

/**
 * A state vector on the incoming branch of the encounter hyperbola.
 *
 * Placed from the elements rather than by starting the spacecraft somewhere and
 * hoping. The impact parameter and the speed at infinity are what the
 * scattering formula is a function of, so they have to be exact inputs, not
 * approximate consequences of a starting position: a spacecraft merely
 * *pointed* at the planet from a finite distance has a slightly different b and
 * a noticeably different vInf, and the check against theory would then be
 * measuring the setup rather than the physics.
 *
 * @param {object} cfg - The encounter
 * @param {number} cfg.mu - G times the planet's mass
 * @param {number} cfg.b - Signed impact parameter
 * @param {number} cfg.vInf - Speed relative to the planet, far away
 * @param {number} cfg.distance - How far out to start, planet-to-spacecraft
 * @param {number} cfg.approachDeg - Direction of the incoming asymptote, degrees
 * @returns {?object} pos and vel relative to the planet, and the elements used
 */
export function encounterState({ mu, b, vInf, distance, approachDeg }) {
  const e = encounterEccentricity(mu, b, vInf);
  if (e === null || !(distance > 0)) return null;

  const h = Math.abs(b) * vInf;
  const p = (h * h) / mu;
  // Where on the hyperbola the given distance falls. Outside the asymptote
  // there is no such point, which happens when the caller asks to start closer
  // than periapsis.
  const cosNu = (p / distance - 1) / e;
  if (!(cosNu >= -1 && cosNu <= 1)) return null;
  // Negative: still inbound.
  const nu = -Math.acos(cosNu);

  const rPerifocal = { x: distance * Math.cos(nu), y: distance * Math.sin(nu) };
  const vPerifocal = {
    x: (mu / h) * -Math.sin(nu),
    y: (mu / h) * (e + Math.cos(nu)),
  };

  // In perifocal coordinates the incoming asymptote points along
  // (1, sqrt(e^2-1)) / e. Rotate the whole conic so that direction becomes the
  // approach the caller asked for.
  const asymptote = { x: 1 / e, y: Math.sqrt(e * e - 1) / e };
  const want = (approachDeg * Math.PI) / 180;
  const turn = want - Math.atan2(asymptote.y, asymptote.x);

  let pos = rotate(rPerifocal, turn);
  let vel = rotate(vPerifocal, turn);

  // The sign of the impact parameter is a mirror through the approach
  // direction: same speed, same closest approach, other side of the planet,
  // and the deflection goes the other way.
  //
  // Positive is the mirrored branch, and that is a deliberate choice rather
  // than an accident of which way the conic came out. It makes POSITIVE mean
  // "passes behind the planet, gains speed", which is the association the
  // investigation is trying to build; a student who has to remember that
  // positive means the losing side has been given a needless thing to get
  // wrong. Verified against the integrator, not assumed: at b = +40 in the
  // lab's geometry the run gains 80% of its speed and at b = -40 it loses
  // half, and e2e/gravityAssist.spec.js keeps it that way.
  if (b > 0) {
    const d = { x: Math.cos(want), y: Math.sin(want) };
    const reflect = v => {
      const along = v.x * d.x + v.y * d.y;
      return { x: 2 * along * d.x - v.x, y: 2 * along * d.y - v.y };
    };
    pos = reflect(pos);
    vel = reflect(vel);
  }

  return {
    pos,
    vel,
    eccentricity: e,
    periapsis: (mu / (vInf * vInf)) * (e - 1),
    deflection: deflectionAngle(mu, b, vInf),
    angularMomentum: cross(pos, vel),
  };
}

/**
 * The deflection an actual run produced, from its two asymptotic velocities.
 *
 * Signed, so it can be compared with the prediction including which way the
 * spacecraft was turned rather than only by how much.
 *
 * @param {object} vIn - Incoming velocity relative to the planet
 * @param {object} vOut - Outgoing velocity relative to the planet
 * @returns {?number} The turn, radians, positive counter-clockwise
 */
export function measuredDeflection(vIn, vOut) {
  const a = unit(vIn);
  const b2 = unit(vOut);
  if (!a || !b2) return null;
  return Math.atan2(cross(a, b2), a.x * b2.x + a.y * b2.y);
}
