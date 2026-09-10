// =============================================================================
// How a body is drawn, decided once and shared
// -----------------------------------------------------------------------------
// Every body class in js/physics.js used to answer three questions for itself:
// how much detail is worth drawing at this size, what colour is this thing, and
// where is the light coming from. They answered them differently, so a planet
// faded out at a size where a moon was still drawing surface marks, and a
// scenario's sunlight came from whichever direction each class had hard-coded.
//
// This module answers them once. It is pure arithmetic over values handed in -
// no simulation state, no settings, no clock - which is what lets the whole
// level-of-detail policy and the comet-tail geometry be tested without a canvas
// or a browser. See tests/bodyVisuals.test.js.
//
// Three rules it exists to enforce
// -----------------------------------------------------------------------------
// The visual radius is not the physical radius. Below a few pixels a body is
// drawn at a floor so it stays visible and clickable; that floor is a drawing
// decision and never reaches the collision test, the inspector or a saved
// state. js/physics.js keeps `radius` for those and asks here for the other.
//
// Nothing in a draw path may call Math.random(). A hand-placed comet and the
// same comet after a reload must look identical, and a screenshot of a seeded
// scenario must be reproducible. Every "random" visual detail - an asteroid's
// silhouette, the phase of a surface mark - comes from visualSeed(), which is
// derived from the object's own stable id.
//
// Nothing per-frame may allocate what it can reuse. Gradients, sprites and
// arrays are cached by the small number of shapes actually needed, keyed on
// quantised inputs so the cache cannot grow without bound.
// =============================================================================

// --- Four radii, and which is which ------------------------------------------
//
// A body in Gravitas has four sizes, and confusing any two of them causes a
// different bug. They are separated here so that every caller has to say which
// one it wants.
//
//   1. The MODEL radius, `obj.radius`. What the simulation runs on: collisions,
//      merging, Roche limits, the geometric part of a transit, the hit test's
//      floor. Nothing in this file may change it, and nothing here returns it.
//
//   2. The ANALYTIC radius. What a body physically is, in kilometres or solar
//      radii, derived from mass by js/lightCurve.js and js/habitability.js and
//      reported by the inspector. It has nothing to do with either of the two
//      below. A transit depth is (Rp/Rs)^2 from *these* numbers, which is why
//      changing the drawing cannot change a light curve.
//
//   3. The DISPLAY radius, below. What is drawn, and only what is drawn.
//
//   4. The HIT radius, also below. How close a click has to be. Deliberately
//      independent of the display radius: an Earth eight times smaller than
//      its star still has to be selectable, and inflating the drawing to make
//      it clickable is how the sizes got misleading in the first place.
//
// Why the display radius is not the model radius
// -----------------------------------------------------------------------------
// The model radii are Star 10, GasGiant 8, Planet 5. Drawn literally that makes
// a Sun-like star twice the radius of an Earth-like planet and barely wider
// than a Jupiter, which is not a compression of reality - it is a different
// claim about it. The real ratios are about 109:1 and 9.7:1.
//
// They cannot be drawn literally either. At the Solar System's own framing an
// Earth beside a visible Sun is a fraction of a pixel, which is why the model
// radii were flattened in the first place. So the policy here is an explicit,
// documented compression: one factor per family, applied everywhere, chosen so
// that the hierarchy a reader sees is the right shape even though the numbers
// are not the right numbers.
//
// Why factors and not one exponent
// -----------------------------------------------------------------------------
// A single power law on the true physical radius cannot hit both targets. To
// bring 109:1 down to 8:1 needs an exponent of 0.44, and 9.7^0.44 is 2.7 - a
// Jupiter under three times smaller than the Sun, outside the range this is
// aiming for. The two ratios have to be set independently, which is what a
// per-family factor does. The cost is that the mapping is a policy rather than
// a formula, so it is written out in full and tested against its own targets.

/**
 * Displayed radius as a fraction of the model radius, by family.
 *
 * Applied to `obj.radius`, so a heavier planet is still drawn larger than a
 * lighter one: the compression changes the ratios *between* families and
 * leaves the ordering *within* one alone.
 *
 * Calibrated on the Solar System, whose own model radii are Sol 15, Earth 5,
 * Jupiter 8 - a Sun three times an Earth and under twice a Jupiter, against
 * real ratios of 109 and 9.7. The targets are 8 and 4, which is what these
 * factors give exactly:
 *
 *     Sol      15 x 1.000 = 15.00
 *     Jupiter   8 x 0.469 =  3.75      Sol : Jupiter = 4.0   (real 9.7)
 *     Earth     5 x 0.375 =  1.88      Sol : Earth   = 8.0   (real 109)
 *                                      Jupiter : Earth = 2.0 (real 11.2)
 *
 * Stars are left at 1.000 deliberately. The hierarchy could have been widened
 * by growing the star instead of shrinking the planets, and it would have been
 * the wrong choice: a Sol drawn half again as wide reaches a third of the way
 * to Mercury in the scenario that names them both. Nothing that was on the
 * screen yesterday is larger today.
 */
export const DISPLAY_FACTOR = Object.freeze({
  Star: 1.0,
  GasGiant: 0.469,
  Planet: 0.375,
  // Smaller than a star, as required, and as reality insists rather more
  // strongly: a white dwarf is about one hundredth of a solar radius.
  WhiteDwarf: 0.28,
  // Below the visibility floor at any ordinary zoom, and meant to be. A
  // neutron star is twenty kilometres across.
  NeutronStar: 0.3,
  // The small solid bodies share the rocky-planet factor rather than carrying
  // invented ones of their own. All three are far below the floor at any zoom
  // a whole system is viewed at, so the factor decides only their ordering
  // against the planets, and the planet factor is the honest answer to that.
  Asteroid: 0.375,
  Comet: 0.375,
  Debris: 0.375,
  // A galaxy is already drawn as a diffuse patch at its own scale, and a black
  // hole's horizon has its own documented illustrative policy in js/physics.js
  // - it is drawn far larger than any real horizon so that the thing the
  // scenario is about is visible at all. Neither belongs to the star/planet
  // hierarchy this is correcting, so neither is touched.
  Galaxy: 1,
  BlackHole: 1,
});

/** The factor for a family, defaulting to no change for anything unlisted. */
export const displayFactorFor = type => DISPLAY_FACTOR[type] ?? 1;

/**
 * The display radius, in world units, before any floor.
 *
 * Pure: it reads its arguments and returns a number. It is never handed a body
 * and can therefore never modify one.
 *
 * @param {number} modelRadius - obj.radius, in simulation units
 * @param {string} type - A family name from DISPLAY_FACTOR
 * @returns {number} World units
 */
export function displayRadius(modelRadius, type) {
  const r = Number(modelRadius);
  if (!Number.isFinite(r) || r <= 0) return 0;
  return r * displayFactorFor(type);
}

/**
 * The smallest a body is ever drawn, in screen pixels of radius.
 *
 * Below this a body is a fraction of a pixel and simply vanishes, which at the
 * Solar System's own framing is every planet. The floor is a drawing decision:
 * it never reaches the model radius, the hit test or a saved state.
 */
export const DISPLAY_MIN_PX = 2.75;

/**
 * The floor in a crowded field.
 *
 * A thousand bodies each held at two and a half pixels is not a galaxy, it is
 * a disc of paste. Dense scenes get a smaller floor so the structure survives.
 */
export const DISPLAY_MIN_PX_CROWDED = 1.35;

/** Where the crowded floor starts and finishes taking over. */
export const CROWD_SOFT_START = 200;
export const CROWD_SOFT_END = 340;

/**
 * The floor for a scene with this many bodies in it.
 *
 * Ramped rather than switched. The floor used to change the moment a body
 * count crossed a threshold, so a collision that took a scene from 251 bodies
 * to 249 doubled the size of everything on screen between one frame and the
 * next. Interpolating across a band means the same event moves every body by a
 * fraction of a pixel.
 *
 * @param {number} bodyCount - Live bodies on screen
 * @returns {number} Floor in screen pixels of radius
 */
export function markerFloorPx(bodyCount) {
  const n = Number(bodyCount);
  if (!Number.isFinite(n) || n <= CROWD_SOFT_START) return DISPLAY_MIN_PX;
  if (n >= CROWD_SOFT_END) return DISPLAY_MIN_PX_CROWDED;
  const t = (n - CROWD_SOFT_START) / (CROWD_SOFT_END - CROWD_SOFT_START);
  // Smoothstep, so the ramp has no corner at either end either.
  const e = t * t * (3 - 2 * t);
  return DISPLAY_MIN_PX + (DISPLAY_MIN_PX_CROWDED - DISPLAY_MIN_PX) * e;
}

/**
 * What a body is actually drawn at, in world units, floor included.
 *
 * Continuous in the zoom: `max` has a corner where the floor engages but never
 * a step, so a body being zoomed toward grows smoothly out of its marker
 * instead of popping.
 *
 * @param {number} modelRadius - obj.radius
 * @param {string} type - A family name
 * @param {number} zoom - Pixels per world unit
 * @param {number} [bodyCount] - Live bodies, for the crowded floor
 * @returns {number} World units
 */
export function drawnRadius(modelRadius, type, zoom, bodyCount = 0) {
  const z = Number(zoom) > 0 ? Number(zoom) : 1;
  const wanted = displayRadius(modelRadius, type);
  const floor = markerFloorPx(bodyCount) / z;
  return wanted > floor ? wanted : floor;
}

/** The same thing in screen pixels, which is what a LOD decision wants. */
export function drawnRadiusPx(modelRadius, type, zoom, bodyCount = 0) {
  const z = Number(zoom) > 0 ? Number(zoom) : 1;
  return drawnRadius(modelRadius, type, z, bodyCount) * z;
}

/**
 * How close a click has to land, in screen pixels of radius.
 *
 * Unchanged by the display policy, and that is the point. These were already
 * independent of the drawing, which is why shrinking the drawing did not have
 * to make anything harder to select.
 */
export const HIT_MIN_PX = Object.freeze({
  BlackHole: 14,
  Star: 12,
  GasGiant: 12,
  Planet: 10,
  NeutronStar: 10,
  WhiteDwarf: 10,
  Asteroid: 8,
  Comet: 8,
  Galaxy: 16,
});

/**
 * The radius a click has to fall inside, in world units.
 *
 * The model radius or the pixel floor, whichever is larger - never the display
 * radius. A body drawn at the marker floor is still selected by its own model
 * size if that is bigger.
 *
 * @param {number} modelRadius - obj.radius
 * @param {string} type - A family name
 * @param {number} zoom - Pixels per world unit
 * @returns {number} World units
 */
export function hitRadius(modelRadius, type, zoom) {
  const z = Number(zoom) > 0 ? Number(zoom) : 1;
  const r = Number(modelRadius);
  const floor = (HIT_MIN_PX[type] ?? 10) / z;
  return Number.isFinite(r) && r > floor ? r : floor;
}

// --- Level of detail ---------------------------------------------------------

/** What a body is worth drawing at a given size on screen. */
export const LOD = Object.freeze({
  /** A crisp dot. No gradient, no texture, no second pass. */
  POINT: 'point',
  /** The dot, plus one cheap shading or highlight pass. */
  SHADED: 'shaded',
  /** Everything the family has: bands, rings, marks, silhouettes. */
  DETAILED: 'detailed',
});

/**
 * Up to this radius in screen pixels, a body is a point.
 *
 * Three pixels is where a highlight stops being a highlight and becomes one
 * lighter pixel next to one darker one, which reads as noise rather than as
 * shape. Below it the honest picture is a crisp, high-contrast dot.
 */
export const LOD_POINT_MAX_PX = 3;

/**
 * Up to this radius, one shading pass and no more.
 *
 * Ten pixels is about where a band or a ring is wide enough to be seen as a
 * band or a ring rather than as an artefact.
 */
export const LOD_SHADED_MAX_PX = 10;

/**
 * How much detail to draw at this size.
 *
 * The low quality tier is capped one level down. That is not a general dislike
 * of detail: the tier exists because a machine is already missing its frame
 * budget, and body-specific detail is per-body work that scales with how much
 * is on screen - exactly the wrong thing to be doing on a slow machine.
 *
 * @param {number} screenRadiusPx - The body's radius in screen pixels
 * @param {object} [options]
 * @param {string} [options.tier] - 'full' or 'low'
 * @param {boolean} [options.crowded] - True in a field of hundreds of bodies
 * @returns {string} One of LOD
 */
export function lodFor(
  screenRadiusPx,
  { tier = 'full', crowded = false } = {}
) {
  const px = Number(screenRadiusPx);
  if (!Number.isFinite(px) || px <= 0) return LOD.POINT;
  // A thousand bodies each drawing a silhouette is a thousand paths a frame,
  // and at that density the picture is a field of specks anyway.
  if (crowded) return px > LOD_SHADED_MAX_PX ? LOD.SHADED : LOD.POINT;
  if (px < LOD_POINT_MAX_PX) return LOD.POINT;
  if (px < LOD_SHADED_MAX_PX) return LOD.SHADED;
  return tier === 'low' ? LOD.SHADED : LOD.DETAILED;
}

/**
 * Is this level at least that one?
 * @param {string} level - From lodFor
 * @param {string} atLeast - One of LOD
 * @returns {boolean} True if `level` includes everything `atLeast` does
 */
export function lodAtLeast(level, atLeast) {
  const order = [LOD.POINT, LOD.SHADED, LOD.DETAILED];
  return order.indexOf(level) >= order.indexOf(atLeast);
}

// --- Deterministic per-object variation --------------------------------------

/**
 * A stable 32-bit seed for one object's appearance.
 *
 * From the object's own id, which is assigned once at construction and
 * restored verbatim by a save or a share link, so the same body looks the same
 * on two machines and after a reload. Mixed with the type name so a planet and
 * an asteroid that happen to share an id do not share a silhouette.
 *
 * @param {object} obj - Any body with an id
 * @returns {number} An unsigned 32-bit seed
 */
export function visualSeed(obj) {
  const id = Number.isFinite(obj?.id) ? obj.id >>> 0 : 0;
  const type = String(obj?.obj_type ?? '');
  let h = 0x811c9dc5 ^ id;
  for (let i = 0; i < type.length; i++) {
    h ^= type.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The n-th deterministic value in [0, 1) for a seed.
 *
 * A one-shot hash rather than a generator, so a caller can ask for value 7
 * without having drawn values 0 to 6 - which matters because a draw path asks
 * for a different subset every frame depending on the level of detail.
 *
 * @param {number} seed - From visualSeed
 * @param {number} n - Which value
 * @returns {number} A value in [0, 1)
 */
export function hash01(seed, n = 0) {
  let t =
    (Math.imul(seed >>> 0, 0x9e3779b1) + Math.imul(n | 0, 0x85ebca6b)) | 0;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * A deterministic irregular outline, as radius multipliers around the circle.
 *
 * Cached: an asteroid's silhouette never changes, and rebuilding a dozen
 * numbers per asteroid per frame is exactly the per-body allocation this
 * module exists to stop.
 *
 * @param {number} seed - From visualSeed
 * @param {number} [points] - How many vertices
 * @param {number} [wobble] - Fractional departure from a circle
 * @returns {Float64Array} Multipliers, one per vertex
 */
const silhouettes = new Map();
export function silhouetteFor(seed, points = 9, wobble = 0.22) {
  const key = `${seed >>> 0}:${points}:${wobble}`;
  const cached = silhouettes.get(key);
  if (cached) return cached;
  const out = new Float64Array(points);
  for (let i = 0; i < points; i++) {
    out[i] = 1 + (hash01(seed, i + 1) - 0.5) * 2 * wobble;
  }
  // Bounded: a scene has tens of distinct asteroids, not thousands of distinct
  // silhouette shapes, but a pathological world should not grow this forever.
  if (silhouettes.size > 512) silhouettes.clear();
  silhouettes.set(key, out);
  return out;
}

/** Drop every cached shape. For tests, and for a deliberate world rebuild. */
export function clearVisualCaches() {
  silhouettes.clear();
  sprites.clear();
  ringCache.clear();
}

// --- Light ---------------------------------------------------------------------

/**
 * The direction light arrives from, as a unit vector.
 *
 * Toward the star, so a caller shades the limb away from it. A scene with no
 * luminous body - a black-hole pair, a rogue planet, an empty sandbox - gets a
 * fixed direction instead: consistent, slightly above and to the left, which is
 * the convention every diagram in the manual already uses. Inventing a light
 * source would be worse than admitting there is not one.
 *
 * @param {{x: number, y: number}} pos - The lit body's position
 * @param {?{x: number, y: number}} starPos - The dominant star, or null
 * @returns {{x: number, y: number, fromStar: boolean}} Unit vector toward the light
 */
export const FALLBACK_LIGHT = Object.freeze({ x: -0.7071, y: 0.7071 });

export function lightDirection(pos, starPos) {
  if (!starPos || !pos) return { ...FALLBACK_LIGHT, fromStar: false };
  const dx = starPos.x - pos.x;
  const dy = starPos.y - pos.y;
  const d = Math.hypot(dx, dy);
  if (!(d > 0) || !Number.isFinite(d)) {
    return { ...FALLBACK_LIGHT, fromStar: false };
  }
  return { x: dx / d, y: dy / d, fromStar: true };
}

/**
 * Which of several luminous bodies dominates the light at a point.
 *
 * By received flux, not by luminosity: in a wide binary the nearer, fainter
 * star can be the one casting the shadow, and in a scene with a distant giant
 * and a close dwarf the answer is the close dwarf. Ties go to the more
 * luminous, so the choice does not flicker between two equal stars as they
 * orbit.
 *
 * @param {{x: number, y: number}} pos - Where the light is being received
 * @param {Array<{pos: object, luminosity: number}>} sources - Candidate stars
 * @returns {?object} The winning source, or null if there is none
 */
export function dominantLight(pos, sources) {
  let best = null;
  let bestFlux = 0;
  for (const s of sources || []) {
    const l = Number(s?.luminosity);
    if (!(l > 0) || !s.pos) continue;
    const d2 = (s.pos.x - pos.x) ** 2 + (s.pos.y - pos.y) ** 2;
    const flux = d2 > 0 ? l / d2 : Infinity;
    if (flux > bestFlux || (flux === bestFlux && l > (best?.luminosity ?? 0))) {
      bestFlux = flux;
      best = s;
    }
  }
  return best;
}

// --- Colour ---------------------------------------------------------------------

/**
 * A star's colour from its effective temperature.
 *
 * A coarse blackbody fit, quantised to 100 K so the cache below has a few dozen
 * entries rather than one per star per frame. Accurate enough that an M dwarf
 * is orange, the Sun is white-yellow and an O star is blue-white, which is the
 * whole of what the picture claims.
 *
 * @param {number} teffK - Effective temperature in kelvin
 * @returns {{r: number, g: number, b: number}} 0-255 channels
 */
const starColours = new Map();
export function starColor(teffK) {
  const t = Number.isFinite(teffK) && teffK > 0 ? teffK : 5780;
  const bucket = Math.round(Math.min(40000, Math.max(1500, t)) / 100) * 100;
  const hit = starColours.get(bucket);
  if (hit) return hit;

  // Tanner Helland's approximation, clamped. Cheap, and it has the right
  // qualitative behaviour at both ends of the range Gravitas builds stars in.
  const k = bucket / 100;
  const clamp = v => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  let r;
  let g;
  let b;
  if (k <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(k) - 161.1195681661;
    b = k <= 19 ? 0 : 138.5177312231 * Math.log(k - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * (k - 60) ** -0.1332047592;
    g = 288.1221695283 * (k - 60) ** -0.0755148492;
    b = 255;
  }
  const rgb = { r: clamp(r), g: clamp(g), b: clamp(b) };
  starColours.set(bucket, rgb);
  return rgb;
}

/**
 * Darken or lighten a channel triple, without leaving the byte range.
 * @param {{r: number, g: number, b: number}} rgb - Colour
 * @param {number} f - Multiplier
 * @returns {{r: number, g: number, b: number}} Scaled colour
 */
export function scaleRgb(rgb, f) {
  const c = v => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  return { r: c(rgb.r * f), g: c(rgb.g * f), b: c(rgb.b * f) };
}

// --- Comet tails ------------------------------------------------------------------

/**
 * How active a comet is, from the light it is receiving.
 *
 * A comet is a dirty snowball until something warms it. Far from any star it
 * has no coma and no tail at all, and a picture that draws one anyway teaches
 * the wrong thing - which is why this returns zero rather than a floor.
 *
 * The shape is a smooth ramp in received flux relative to the flux at one
 * astronomical unit from the Sun. Real activity switches on somewhere around
 * three AU as water ice begins to sublimate; ACTIVITY_ONSET_FLUX is that
 * distance expressed as a flux so the same number works around any star.
 *
 * @param {number} flux - Received flux, in units of Earth's
 * @returns {number} Activity in [0, 1]
 */
export const ACTIVITY_ONSET_FLUX = 1 / 9;
export const ACTIVITY_FULL_FLUX = 1;

export function tailActivity(flux) {
  const f = Number(flux);
  if (!Number.isFinite(f) || f <= ACTIVITY_ONSET_FLUX) return 0;
  if (f >= ACTIVITY_FULL_FLUX) return 1;
  const t =
    (f - ACTIVITY_ONSET_FLUX) / (ACTIVITY_FULL_FLUX - ACTIVITY_ONSET_FLUX);
  // Smoothstep, so activity comes up gently rather than snapping on at the
  // threshold as the comet crosses it.
  return t * t * (3 - 2 * t);
}

/**
 * Where a comet's ion tail points.
 *
 * Directly away from the star, because the solar wind that carries it is
 * radial and travels far faster than the comet does. This is the thing the old
 * drawing got wrong: it pointed the tail opposite the comet's velocity, which
 * is where a tail is only by coincidence, and which has a comet dragging its
 * tail behind it like smoke - a picture students already arrive holding and
 * which the real geometry contradicts. Approaching the Sun the ion tail points
 * *outward*, ahead of nothing; leaving, it streams ahead of the comet.
 *
 * @param {{x: number, y: number}} cometPos - The comet
 * @param {?{x: number, y: number}} starPos - The dominant star, or null
 * @param {{x: number, y: number}} [vel] - Fallback when there is no star
 * @returns {?{x: number, y: number}} Unit vector, or null if there is nothing to point away from
 */
export function ionTailDirection(cometPos, starPos, vel) {
  if (starPos && cometPos) {
    const dx = cometPos.x - starPos.x;
    const dy = cometPos.y - starPos.y;
    const d = Math.hypot(dx, dy);
    if (d > 0 && Number.isFinite(d)) return { x: dx / d, y: dy / d };
  }
  // No star: there is no ion tail to draw. A caller that wants something
  // anyway gets the anti-velocity direction, and should be drawing it faintly
  // if at all.
  if (!vel) return null;
  const s = Math.hypot(vel.x, vel.y);
  if (!(s > 0)) return null;
  return { x: -vel.x / s, y: -vel.y / s };
}

/**
 * Where a comet's dust tail points.
 *
 * Dust grains are heavy enough that radiation pressure only nudges them: they
 * leave the nucleus at roughly its own orbital velocity and then fall behind,
 * so the dust tail lies between "away from the star" and "behind the comet"
 * and curves along the orbit. `curve` is how far toward the orbital trail it
 * has swung, from 0 at the nucleus to 1 at the tip, which is what lets a
 * caller draw it as an arc rather than a second straight line.
 *
 * @param {{x: number, y: number}} cometPos - The comet
 * @param {?{x: number, y: number}} starPos - The dominant star, or null
 * @param {{x: number, y: number}} vel - The comet's velocity
 * @param {number} [curve] - 0 at the nucleus, 1 at the tail tip
 * @returns {?{x: number, y: number}} Unit vector, or null
 */
export const DUST_MAX_LAG = 0.35;

export function dustTailDirection(cometPos, starPos, vel, curve = 1) {
  const ion = ionTailDirection(cometPos, starPos, null);
  const s = vel ? Math.hypot(vel.x, vel.y) : 0;
  const trail = s > 0 ? { x: -vel.x / s, y: -vel.y / s } : null;
  if (!ion) return trail;
  if (!trail) return ion;
  // A bounded lag. A real dust tail trails the anti-solar direction by tens of
  // degrees, not by ninety: the grains leave with the nucleus's own orbital
  // velocity and are then pushed outward, so they end up between the two and
  // nearer the sunward-away side. Keeping the tip nearer anti-solar than the
  // orbital trail is also what makes the two tails read as two tails rather
  // than as one fan.
  const t = Math.max(0, Math.min(1, curve)) * DUST_MAX_LAG;
  const x = ion.x * (1 - t) + trail.x * t;
  const y = ion.y * (1 - t) + trail.y * t;
  const d = Math.hypot(x, y);
  return d > 0 ? { x: x / d, y: y / d } : ion;
}

// --- Ring systems ------------------------------------------------------------
//
// A quarter of procedurally generated gas giants get rings. That number is a
// choice about variety, not a claim about nature: nobody knows what fraction
// of giant exoplanets carry a Saturn-like system, the one candidate detection
// is disputed, and four planets out of four in our own outer system have rings
// of some kind while only one of them is prominent. A quarter puts a ringed
// giant in most generated systems without making rings the default, and the
// model documentation says exactly this.
//
// Everything about a ring system comes from the body's own visual seed, so it
// is the same after a reset, a reload, a share link, a screenshot and an A/B
// run - and it is computed once and memoised, never in a draw call.
//
// None of it touches physics. The rings extend to two and a half planetary
// radii and the planet's model radius does not change, so gravity, collisions,
// the Roche limit, transit depth, the hit test and every measurement see the
// planet they always saw.

/** How many generated giants are ringed. Variety, not an occurrence rate. */
export const RING_FRACTION = 0.25;

/**
 * Whether a generated gas giant has rings.
 *
 * @param {number} seed - From visualSeed
 * @returns {boolean} True for about a quarter of seeds
 */
export const hasRingsForSeed = seed => hash01(seed, 40) < RING_FRACTION;

/** Inner edge, as a multiple of the displayed planetary radius. */
export const RING_INNER_MIN = 1.25;
export const RING_INNER_MAX = 1.5;
/** Outer edge, likewise. */
export const RING_OUTER_MIN = 1.9;
export const RING_OUTER_MAX = 2.6;

/**
 * How flat the projected ellipse is: the minor axis over the major.
 *
 * One is face-on and zero is exactly edge-on. The floor is not zero because a
 * system drawn as a one-pixel line carries no information; the ceiling is not
 * one because a ring system that is always face-on stops reading as a disc in
 * three dimensions. Real Saturn seen from Earth runs from 0 to about 0.45.
 */
export const RING_FLATTEN_MIN = 0.12;
export const RING_FLATTEN_MAX = 0.58;

const ringCache = new Map();

/**
 * A ring system's geometry, in multiples of the displayed planetary radius.
 *
 * Returned in *multiples* rather than world units so the same object survives
 * a zoom, a quality-tier change and the marker floor: the caller multiplies by
 * whatever the planet is being drawn at this frame. That is also what keeps
 * the rings tied to the displayed disc rather than to the model radius, so a
 * planet drawn at three eighths of its model size does not wear rings sized
 * for the other three eighths.
 *
 * @param {number} seed - From visualSeed
 * @param {object} [overrides] - Authored values, in multiples of the radius
 * @returns {object} Ring geometry
 */
export function ringGeometryFor(seed, overrides = {}) {
  const key = `${seed >>> 0}:${JSON.stringify(overrides)}`;
  const hit = ringCache.get(key);
  if (hit) return hit;

  const u = n => hash01(seed, n);
  const lerpU = (n, a, b) => a + (b - a) * u(n);

  const inner = overrides.inner ?? lerpU(41, RING_INNER_MIN, RING_INNER_MAX);
  const outer = overrides.outer ?? lerpU(42, RING_OUTER_MIN, RING_OUTER_MAX);
  // Biased toward the middle of the range: u^0.7 spends less of its time near
  // zero than u does, so nearly edge-on systems happen without being common.
  const flatten =
    overrides.flatten ??
    RING_FLATTEN_MIN +
      (RING_FLATTEN_MAX - RING_FLATTEN_MIN) * Math.pow(u(43), 0.7);
  // Any position angle. A ring system has no preferred direction on the sky,
  // and eight generated giants all tilted the same way looks like a template.
  const angle = overrides.angle ?? u(44) * Math.PI;
  // Which side of the disc the viewer is on, and therefore which half of the
  // ellipse is in front of the planet.
  const tiltSign = overrides.tiltSign ?? (u(45) < 0.5 ? -1 : 1);
  const opacity = overrides.opacity ?? 0.38 + u(46) * 0.3;

  // Bands. Concentric annuli of differing brightness with translucent gaps
  // between them, rather than one solid ellipse: it is what a ring system
  // looks like, and it is also what keeps a large one from reading as a
  // painted-on hoop.
  const bandCount = 3 + Math.floor(u(47) * 3); // 3, 4 or 5
  const span = outer - inner;
  const bands = [];
  for (let i = 0; i < bandCount; i++) {
    const t0 = i / bandCount;
    const t1 = (i + 1) / bandCount;
    // A gap at the outer edge of each band, wide enough to see. Narrower gaps
    // were tried first and the whole system read as one solid grey ellipse at
    // the size a reader actually looks at a giant.
    const gap = 0.2 + u(50 + i) * 0.2;
    bands.push({
      r0: inner + span * t0,
      r1: inner + span * (t1 - (t1 - t0) * gap),
      alpha: 0.34 + u(60 + i) * 0.5,
    });
  }

  // A Cassini-like division: one wider gap somewhere in the middle third,
  // present on most systems but not all.
  const cassini =
    u(48) < 0.7
      ? (() => {
          const at = inner + span * (0.42 + u(49) * 0.24);
          const w = span * (0.08 + u(51) * 0.06);
          return { r0: at, r1: at + w };
        })()
      : null;

  // Icy grey through to warm tan. Narrow on purpose: rings are dusty water ice
  // and rock, and a saturated one would look like a decal.
  const warmth = u(52);
  const tint = {
    r: Math.round(206 + warmth * 34),
    g: Math.round(202 + warmth * 20),
    b: Math.round(198 - warmth * 34),
  };

  const geometry = Object.freeze({
    inner,
    outer,
    flatten,
    angle,
    tiltSign,
    opacity,
    bands: Object.freeze(bands.map(b => Object.freeze(b))),
    cassini: cassini ? Object.freeze(cassini) : null,
    tint: Object.freeze(tint),
  });

  if (ringCache.size > 256) ringCache.clear();
  ringCache.set(key, geometry);
  return geometry;
}

// --- Sprite cache -----------------------------------------------------------------

/**
 * Pre-rendered radial gradients, one per colour and size bucket.
 *
 * A radial gradient built per body per frame is the single most expensive
 * repeated allocation in the draw path: a hundred bodies at sixty frames a
 * second is six thousand gradient objects a second, each of which the browser
 * rasterises from scratch. A sprite is built once and blitted, and the buckets
 * below mean a scene of a hundred similar planets shares one.
 *
 * Keyed on the colour quantised to 5 bits a channel and the size to a power of
 * two, which is what keeps the cache to a few dozen entries.
 */
const sprites = new Map();
const SPRITE_CAP = 96;

/**
 * Paint a limb-darkened stellar disc into a square surface.
 *
 * Here rather than in js/physics.js because two things draw a star now: the
 * simulation, and the Stellar Lab's preview. A second implementation would be
 * a second answer to "what does a star look like", and the whole point of the
 * lab is that the star it shows is the star the simulation would show at that
 * temperature.
 *
 * A compact bright core rather than a uniformly blazing disc: real stars are
 * brightest at the centre of the visible disc and fall off towards the limb,
 * and a flat fill makes every star a sticker.
 *
 * @param {CanvasRenderingContext2D} ctx - Target, with the disc filling it
 * @param {number} size - Width and height of the square, pixels
 * @param {{r: number, g: number, b: number}} rgb - The photosphere's colour
 * @returns {void}
 */
export function paintStarDisc(ctx, size, rgb) {
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(
    0,
    `rgb(${Math.min(255, rgb.r + 40)},${Math.min(255, rgb.g + 35)},${Math.min(255, rgb.b + 30)})`
  );
  g.addColorStop(0.55, `rgb(${rgb.r},${rgb.g},${rgb.b})`);
  const limb = scaleRgb(rgb, 0.82);
  g.addColorStop(0.94, `rgb(${limb.r},${limb.g},${limb.b})`);
  g.addColorStop(1, `rgba(${limb.r},${limb.g},${limb.b},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(half, half, half, 0, 2 * Math.PI);
  ctx.fill();
}

/** The size bucket a radius falls in: powers of two from 8 to 256 pixels. */
export function spriteSize(radiusPx) {
  const wanted = Math.max(8, Math.min(256, Math.ceil(radiusPx * 2)));
  return 1 << Math.ceil(Math.log2(wanted));
}

/**
 * A cached sprite, built on first use.
 *
 * @param {string} kind - What the sprite is, for the key
 * @param {{r: number, g: number, b: number}} rgb - Colour
 * @param {number} radiusPx - Radius wanted, in screen pixels
 * @param {Function} paint - (ctx, size, rgb) => void, called once
 * @returns {?object} A canvas to drawImage, or null where there is no DOM
 */
export function spriteFor(kind, rgb, radiusPx, paint) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const size = spriteSize(radiusPx);
  const q = v => (v >> 3) & 31;
  const key = `${kind}:${q(rgb.r)},${q(rgb.g)},${q(rgb.b)}:${size}`;
  const hit = sprites.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paint(ctx, size, rgb);

  if (sprites.size > SPRITE_CAP) sprites.clear();
  sprites.set(key, canvas);
  return canvas;
}

/** How many sprites are currently cached. For tests and the perf probe. */
export const spriteCacheSize = () => sprites.size;
