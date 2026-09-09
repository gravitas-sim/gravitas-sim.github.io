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
