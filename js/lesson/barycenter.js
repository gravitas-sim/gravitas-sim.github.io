// =============================================================================
// The point two stars are both going round
// -----------------------------------------------------------------------------
// A binary's barycenter is what "Weighing the Stars" is about; this is the
// arithmetic that lets the main scene draw it rather than a panel diagram.
//
// Pure, so it imports nothing and a test can use object literals. The half that
// knows PhysicsObject and the canvas is js/lessonStage.js and js/render.js.
//
// What is and is not asserted here
// -----------------------------------------------------------------------------
// `barycenterOf` is a definition, not a model: the mass-weighted mean position
// of any bodies, exact for any number and arrangement, silent on whether they
// are bound.
//
// `circularBinary` is a restricted model: initial conditions for two point
// masses on circular orbits about their common center, the case the lesson
// teaches and Newton's form of Kepler's third law is quoted for. A real binary
// is eccentric and its observed separation is a projection of a 3-D orbit; the
// lesson says so where it matters and the restriction is kept in the name.
// =============================================================================

/**
 * The mass-weighted mean position of a set of bodies.
 *
 * @param {Array<{mass: number, pos: {x: number, y: number}}>} bodies - Any bodies
 * @returns {?{x: number, y: number, mass: number, count: number}} The point, or null
 */
export function barycenterOf(bodies) {
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
 * How far each body is from the barycenter of the set.
 *
 * The lesson is built on these two distances: their ratio is the inverse of the
 * mass ratio, in any masses and any units.
 *
 * @param {Array<object>} bodies - Bodies with `mass` and `pos`
 * @returns {Array<{body: object, r: number}>} One entry per body, in order
 */
export function distancesFromBarycenter(bodies) {
  const c = barycenterOf(bodies);
  if (!c) return [];
  return (bodies || [])
    .filter(b => Number.isFinite(b?.pos?.x) && Number.isFinite(b?.pos?.y))
    .map(body => ({
      body,
      r: Math.hypot(body.pos.x - c.x, body.pos.y - c.y),
    }));
}

/**
 * Initial conditions for two masses on circular orbits about their barycenter.
 *
 * Laid out along x, moving along y, the heavier one nearer the center, total
 * momentum zero: the pair circles a fixed point instead of drifting across the
 * view, which makes the balance point watchable.
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
  // Each body's distance from the center is the *other* one's share of the
  // total: the see-saw rule.
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
    // Newton's form of Kepler's third law, in engine units: students measure
    // this, so it checks an answer and is never shown in place of one.
    period: 2 * Math.PI * Math.sqrt(separation ** 3 / (G * total)),
    total,
  };
}

/**
 * The total mass a measured orbit implies.
 *
 * The inverse of the period above, and the point of the lesson: a separation
 * and a period fit exactly one mass.
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
 * The arm nearer the center belongs to the heavier star, so the shares are
 * crossed over. Returns null rather than guessing when the arms are degenerate.
 *
 * @param {number} total - The total mass
 * @param {number} r1 - First body's distance from the barycenter
 * @param {number} r2 - Second body's distance from the barycenter
 * @returns {?{m1: number, m2: number}} The two masses
 */
export function splitByArms(total, r1, r2) {
  const span = r1 + r2;
  if (!(total > 0) || !(r1 >= 0) || !(r2 >= 0) || !(span > 0)) return null;
  return { m1: total * (r2 / span), m2: total * (r1 / span) };
}

/** A cross with dashed arms to at most eight bodies, in screen space: nothing is there. */
export function drawBarycenterCross(ctx, c, ends) {
  ctx.save();
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = 'rgba(255, 235, 150, 0.85)';
  ctx.setLineDash([4, 4]);
  if (ends.length <= 8)
    for (const p2 of ends) {
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  ctx.setLineDash([]);
  const ARM = 7;
  ctx.beginPath();
  ctx.moveTo(c.x - ARM, c.y);
  ctx.lineTo(c.x + ARM, c.y);
  ctx.moveTo(c.x, c.y - ARM);
  ctx.lineTo(c.x, c.y + ARM);
  ctx.stroke();
  ctx.restore();
}
