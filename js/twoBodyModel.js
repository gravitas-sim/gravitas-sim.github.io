// =============================================================================
// The two-body model: the one authority for a two-body claim
// -----------------------------------------------------------------------------
// Which of a pair pulls the other, the mu that follows, and whether the force
// is inverse-square over the distances the claim covers. Read by the orbit
// geometry overlay (js/orbitGeometry.js), which loads lazily, so it lives
// here rather than in js/orbital.js, a start-up module. It imports nothing:
// the caller hands it the halo's field as a function, as it hands it the
// softening (js/engine/forces.js, twoBodySettings).
// =============================================================================

// Bound once: free globals are 8-25x slower in Jest's vm context.
const { Math } = globalThis;

// What the integrator counts as a source, by kind (js/engine/step.js,
// updateCachedArrays): holes, stars and galaxies always; giants, neutron stars
// and white dwarfs unless only stars pull; planets and asteroids only with
// mutual gravity on and star-only gravity off; comets and debris never.
const ALWAYS = new Set(['BlackHole', 'StarObject', 'Galaxy']);
const UNLESS_STAR_ONLY = new Set(['GasGiant', 'NeutronStar', 'WhiteDwarf']);
const WITH_MUTUAL = new Set(['Planet', 'Asteroid']);

/**
 * Whether the integrator sums this body's gravity for others.
 * @param {Object} b - A body with `kind`
 * @param {Object} s - Settings (mutual_gravity, star_only_gravity)
 * @returns {boolean} True when it is a source
 */
export function isGravitySource(b, s) {
  const kind = b?.kind;
  if (ALWAYS.has(kind)) return true;
  const starOnly = s?.star_only_gravity === true;
  if (UNLESS_STAR_ONLY.has(kind)) return !starOnly;
  if (WITH_MUTUAL.has(kind)) return Boolean(s?.mutual_gravity) && !starOnly;
  return false;
}

/**
 * Whether `target` is moved by the pull of `source`, given that it is one.
 * A body a prescribed model owns is not stepped; a black hole feels only
 * other holes, and only when holes orbit (js/engine/blackHole.js).
 * @param {Object} target - The body acted on
 * @param {Object} source - The body pulling
 * @param {Object} s - Settings (bh_behavior)
 * @returns {boolean} True when the engine applies that pull
 */
function feels(target, source, s) {
  if (!target || target.model_owned) return false;
  if (target.kind === 'BlackHole') {
    return source?.kind === 'BlackHole' && s?.bh_behavior === 'Orbiting';
  }
  return true;
}

/**
 * The one authority for a two-body claim about a body and its primary.
 *
 * Class, from the engine's own source rule: `mutual` (each pulls the other,
 * mu = G(M+m)), `one-way` (only the primary pulls, mu = G M) or `none` (the
 * primary does not pull on the body; no mu). Domain, for the separations
 * given: `mond` (the summed field is modified), `softened` (one of them is
 * inside the softening length, where the pull grows with distance), or
 * `inverse-square`, marked `approximate` where a halo's pull at the body is 1
 * percent or more of the primary's.
 *
 * The caller resolves what the engine resolves (the softening in force, the
 * MOND a0 and the halo), so this file carries no fallback of its own.
 *
 * @param {Object} body - The orbiting body ({kind, pos, mass, model_owned})
 * @param {Object} primary - The primary ({kind, pos, mass})
 * @param {Object} settings - gravitational_constant, mutual_gravity,
 *   star_only_gravity, bh_behavior, and the resolved softening (length),
 *   mondA0 (0 when MOND is off) and haloAt (pos => {ax, ay}, the halo's pull
 *   at a point, or null when there is no halo)
 * @param {number[]} [distances] - Separations the claim covers; the current
 *   one when omitted
 * @returns {Object|null} {pairClass, mu, primaryPulls, bodyPulls, domain,
 *   inverseSquare, approximate, softening, haloRatio}, or null for bad input
 */
export function twoBodyModel(body, primary, settings, distances) {
  if (!body?.pos || !primary?.pos || !settings) return null;
  const G = settings.gravitational_constant;
  const primaryPulls =
    isGravitySource(primary, settings) && feels(body, primary, settings);
  const bodyPulls =
    isGravitySource(body, settings) && feels(primary, body, settings);
  const pairClass = !primaryPulls ? 'none' : bodyPulls ? 'mutual' : 'one-way';
  const mu =
    pairClass === 'none'
      ? null
      : G * (primary.mass + (pairClass === 'mutual' ? body.mass || 0 : 0));

  const r = Math.hypot(body.pos.x - primary.pos.x, body.pos.y - primary.pos.y);
  const list = distances?.length ? distances : [r];
  const softening = settings.softening;
  let domain = 'inverse-square';
  let haloRatio = null;
  if (settings.mondA0 > 0) domain = 'mond';
  else if (list.some(d => !(d >= softening))) domain = 'softened';
  else if (settings.haloAt && r > 0 && G * primary.mass > 0) {
    const h = settings.haloAt(body.pos);
    haloRatio = Math.hypot(h.ax, h.ay) / ((G * primary.mass) / (r * r));
  }
  const inverseSquare = domain === 'inverse-square';
  return {
    pairClass,
    mu,
    primaryPulls,
    bodyPulls,
    domain,
    inverseSquare,
    approximate: inverseSquare && haloRatio !== null && haloRatio >= 0.01,
    softening,
    haloRatio,
  };
}
