// =============================================================================
// The point two stars are both going round
// -----------------------------------------------------------------------------
// A binary's barycentre is the one thing "Weighing the Stars" is about, and
// until now the lesson could only show it in a panel diagram - so a student
// read about a balance point in one place and watched two stars circle
// something invisible in another. This is the arithmetic that lets the main
// scene draw it.
//
// Pure, so it imports nothing and a test can check it with object literals.
// The half that knows about PhysicsObject and the canvas is js/lessonStage.js
// and js/render.js.
//
// What is and is not asserted here
// -----------------------------------------------------------------------------
// `barycentreOf` is a definition, not a model: the mass-weighted mean position
// of whatever bodies it is handed. It is exact for any number of bodies in any
// arrangement, and it says nothing about whether they are bound.
//
// `circularBinary` is a model, and a restricted one. It returns the initial
// conditions for two point masses on circular orbits about their common
// centre, which is the case the lesson teaches and the case Newton's form of
// Kepler's third law is quoted for. It is not general: a real binary is
// eccentric, and the separation an observer measures is a projection of a
// three-dimensional orbit. The lesson says so where it matters; this file
// simply refuses to pretend otherwise by keeping the restriction in its name.
// =============================================================================

/**
 * The mass-weighted mean position of a set of bodies.
 *
 * @param {Array<{mass: number, pos: {x: number, y: number}}>} bodies - Any bodies
 * @returns {?{x: number, y: number, mass: number, count: number}} The point, or null
 */
export function barycentreOf(bodies) {
  let mass = 0;
  let x = 0;
  let y = 0;
  let count = 0;
  for (const b of bodies || []) {
    const m = Number(b?.mass);
    if (!Number.isFinite(m) || m <= 0) continue;
    const px = Number(b?.pos?.x);
    const py = Number(b?.pos?.y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
    mass += m;
    x += px * m;
    y += py * m;
    count++;
  }
  if (!count || mass <= 0) return null;
  return { x: x / mass, y: y / mass, mass, count };
}

/**
 * How far each body is from the barycentre of the set.
 *
 * The two distances are the measurement the lesson is built on: their ratio is
 * the inverse of the mass ratio, and that is true whatever the masses are and
 * whatever units the distances are in.
 *
 * @param {Array<object>} bodies - Bodies with `mass` and `pos`
 * @returns {Array<{body: object, r: number}>} One entry per body, in order
 */
export function distancesFromBarycentre(bodies) {
  const c = barycentreOf(bodies);
  if (!c) return [];
  return (bodies || [])
    .filter(b => Number.isFinite(b?.pos?.x) && Number.isFinite(b?.pos?.y))
    .map(body => ({
      body,
      r: Math.hypot(body.pos.x - c.x, body.pos.y - c.y),
    }));
}

/**
 * Initial conditions for two masses on circular orbits about their barycentre.
 *
 * Laid out along x, moving along y, with the heavier one nearer the centre and
 * the total momentum zero - so the pair circles a point that stays put rather
 * than drifting across the view, which is what makes the balance point
 * watchable at all.
 *
 * @param {object} spec - The pair
 * @param {number} spec.m1 - First mass, in engine units
 * @param {number} spec.m2 - Second mass, in engine units
 * @param {number} spec.separation - Distance between them, in world units
 * @param {number} spec.G - The gravitational constant in force
 * @returns {?object} Positions, velocities, arm lengths and the period
 */
export function circularBinary({ m1, m2, separation, G }) {
  const total = m1 + m2;
  if (
    !Number.isFinite(m1) ||
    !Number.isFinite(m2) ||
    m1 <= 0 ||
    m2 <= 0 ||
    !Number.isFinite(separation) ||
    separation <= 0 ||
    !Number.isFinite(G) ||
    G <= 0
  ) {
    return null;
  }
  // Each body's distance from the centre is the *other* one's share of the
  // total, which is the whole see-saw rule in one line.
  const r1 = separation * (m2 / total);
  const r2 = separation * (m1 / total);
  const vRel = Math.sqrt((G * total) / separation);
  return {
    r1,
    r2,
    positions: [
      { x: -r1, y: 0 },
      { x: r2, y: 0 },
    ],
    velocities: [
      { x: 0, y: vRel * (m2 / total) },
      { x: 0, y: -vRel * (m1 / total) },
    ],
    // Newton's form of Kepler's third law, in the engine's own units. The
    // lesson has students measure this rather than read it, so it is here to
    // check an answer against and not to display in place of one.
    period: 2 * Math.PI * Math.sqrt(separation ** 3 / (G * total)),
    total,
  };
}

/**
 * The total mass a measured orbit implies.
 *
 * The inverse of the period above, and the actual point of the lesson: given a
 * separation and a period, this is the only mass that fits.
 *
 * @param {number} separation - Distance between the two, in world units
 * @param {number} period - One full orbit, in engine time
 * @param {number} G - The gravitational constant in force
 * @returns {?number} The total mass, or null if the inputs cannot give one
 */
export function totalMassFromOrbit(separation, period, G) {
  if (!(separation > 0) || !(period > 0) || !(G > 0)) return null;
  return (4 * Math.PI ** 2 * separation ** 3) / (G * period ** 2);
}

/**
 * Split a total mass by the two arm lengths.
 *
 * The arm nearer the centre belongs to the heavier star, so the shares are
 * crossed over. Returns null rather than guessing when the arms are degenerate.
 *
 * @param {number} total - The total mass
 * @param {number} r1 - First body's distance from the barycentre
 * @param {number} r2 - Second body's distance from the barycentre
 * @returns {?{m1: number, m2: number}} The two masses
 */
export function splitByArms(total, r1, r2) {
  const span = r1 + r2;
  if (!(total > 0) || !(r1 >= 0) || !(r2 >= 0) || !(span > 0)) return null;
  return { m1: total * (r2 / span), m2: total * (r1 / span) };
}
