// =============================================================================
// How a body is drawn, decided once and shared
// -----------------------------------------------------------------------------
// One answer, for every body class in js/physics.js, to three questions: how
// much detail to draw at this size, what color, and where the light comes
// from. Pure arithmetic over values handed in (no simulation state, settings
// or clock), so level of detail and comet-tail geometry are testable without a
// canvas. See tests/bodyVisuals.test.js.
//
// Rules it enforces
// -----------------------------------------------------------------------------
// The visual radius is not the physical radius. Below a few pixels a body is
// drawn at a floor to stay visible and clickable; that never reaches collision,
// the inspector or a saved state (js/physics.js keeps `radius` for those).
//
// Nothing in a draw path may call Math.random(). Every "random" detail (an
// asteroid's silhouette, a surface mark's phase) comes from visualSeed(),
// derived from the object's stable id, so reloads and screenshots reproduce.
//
// Nothing per-frame may allocate what it can reuse. Gradients, sprites and
// arrays are cached by a few shapes, keyed on quantised inputs.
// =============================================================================

// --- Four radii, and which is which ------------------------------------------
//
// A body has four sizes; confusing any two causes a different bug, so every
// caller must say which one it wants.
//
//   1. The MODEL radius, `obj.radius`: what the simulation runs on (collisions,
//      merging, Roche limits, the transit's geometry, the hit test's floor).
//      Nothing here changes or returns it.
//
//   2. The ANALYTIC radius: what a body physically is (km or solar radii),
//      derived from mass by js/lightCurve.js and js/habitability.js. A transit
//      depth is (Rp/Rs)^2 from these, so the drawing cannot change a curve.
//
//   3. The DISPLAY radius, below: what is drawn, and only that.
//
//   4. The HIT radius, also below: how close a click must be, independent of
//      the display radius so an Earth beside its star stays selectable.
//
// Why factors, not the model radii or one exponent
// -----------------------------------------------------------------------------
// Drawn literally, the model radii (Star 10, GasGiant 8, Planet 5) make a Sun
// twice an Earth and barely wider than a Jupiter, against real ratios of about
// 109:1 and 9.7:1. True scale is unusable (an Earth beside the Sun is a
// fraction of a pixel). A single power law cannot hit both targets: 109:1 down
// to 8:1 needs an exponent of 0.44, which leaves Jupiter under 3x smaller than
// the Sun. So there is one factor per family, applied everywhere; the mapping
// is a documented policy, tested against its own targets.

/**
 * Displayed radius as a fraction of the model radius, by family.
 *
 * Applied to `obj.radius`, so ordering within a family is kept; only ratios
 * between families change.
 *
 * Calibrated on the Solar System (model radii Sol 15, Earth 5, Jupiter 8;
 * real ratios 109 and 9.7) to targets of 8 and 4, which these give exactly:
 *
 *     Sol      15 x 1.000 = 15.00
 *     Jupiter   8 x 0.469 =  3.75      Sol : Jupiter = 4.0   (real 9.7)
 *     Earth     5 x 0.375 =  1.88      Sol : Earth   = 8.0   (real 109)
 *                                      Jupiter : Earth = 2.0 (real 11.2)
 *
 * Stars stay at 1.000: growing the star instead would put a Sol a third of the
 * way to Mercury in the scenario that names both.
 */
export const DISPLAY_FACTOR = Object.freeze({
  Star: 1.0,
  GasGiant: 0.469,
  Planet: 0.375,
  // About 0.01 solar radii in reality.
  WhiteDwarf: 0.28,
  // Twenty kilometers across: below the visibility floor at ordinary zoom.
  NeutronStar: 0.3,
  // Small solid bodies share the rocky-planet factor: all are far below the
  // floor at system zoom, so it only orders them against the planets.
  Asteroid: 0.375,
  Comet: 0.375,
  Debris: 0.375,
  // A galaxy is already a diffuse patch at its own scale, and a black hole's
  // horizon has its own illustrative policy in js/physics.js; neither belongs
  // to the star/planet hierarchy.
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
export function hitRadius(modelRadius, type, zoom, drawnAt = null) {
  const z = Number(zoom) > 0 ? Number(zoom) : 1;
  const r = Number(modelRadius);
  const floor = (HIT_MIN_PX[type] ?? 10) / z;
  const base = Number.isFinite(r) && r > floor ? r : floor;
  // A body drawn *larger* than its model radius has to be clickable where it
  // appears. That never happened while the drawing only ever shrank things,
  // and it happens now: a lesson comparing stellar sizes sets a presentation
  // radius, and a supergiant on a compressed shelf is drawn several times the
  // radius its mass implies. Clicking the disc and selecting nothing is the
  // failure this prevents; the model radius still sets the floor, so nothing
  // that used to be clickable stopped being so.
  const drawn = Number(drawnAt);
  return Number.isFinite(drawn) && drawn > base ? drawn : base;
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
 * band or a ring rather than as an artifact.
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
 * @param {boolean} [options.detailed] - A crowd's grant of full detail to this
 *   body (js/crowdDraw.js); the low tier never takes it
 * @returns {string} One of LOD
 */
export function lodFor(
  screenRadiusPx,
  { tier = 'full', crowded = false, detailed = false } = {}
) {
  const px = Number(screenRadiusPx);
  if (!Number.isFinite(px) || px <= 0) return LOD.POINT;
  // A thousand bodies each drawing a silhouette is a thousand paths a frame,
  // and at that density the picture is a field of specks anyway; the few the
  // crowd names are drawn in full.
  if (crowded) {
    if (px <= LOD_SHADED_MAX_PX) return LOD.POINT;
    return detailed && tier !== 'low' ? LOD.DETAILED : LOD.SHADED;
  }
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

// --- Trails ----------------------------------------------------------------------

/**
 * Brightness reference for a trail, in the object's own speed units.
 * Scaled to the fastest point in the trail rather than a fixed 50 units/time,
 * which hid the trail of anything slow (a 1.58 units/time binary fell under
 * the 0.05 draw threshold); the floor keeps a circular orbit off the bottom.
 *
 * @param {Array<{velocity: number}>} trail - The object's trail points
 * @returns {number} Speed to treat as full brightness, never zero
 */
export function trailSpeedScale(trail) {
  let peak = 0;
  for (let i = 0; i < trail.length; i++) {
    if (trail[i].velocity > peak) peak = trail[i].velocity;
  }
  return peak > 0 ? peak : 1;
}

// Slowest a trail point is ever drawn at, as a fraction of full brightness.
// A circular orbit has no speed variation to show, so without a floor it would
// render at whatever the ramp's bottom happens to be.
export const TRAIL_MIN_INTENSITY = 0.45;

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
 * By received flux, not luminosity: in a wide binary the nearer, fainter star
 * can cast the shadow. Ties go to the more luminous so the choice does not
 * flicker between equal stars. A body keeps its current light until another
 * sends LIGHT_HOLD more flux (near equal flux the two differ by rounding).
 *
 * @param {{x: number, y: number}} pos - Where the light is being received
 * @param {Array<{pos: object, luminosity: number}>} sources - Candidate stars
 * @param {?object} [keep] - The star (a source's `star`, or the source) this
 *   body was lit by last
 * @returns {?object} The winning source, or null if there is none
 */
export function dominantLight(pos, sources, keep = null) {
  let best = null;
  let bestFlux = 0;
  let held = null;
  let heldFlux = 0;
  for (const s of sources || []) {
    const l = Number(s?.luminosity);
    if (!(l > 0) || !s.pos) continue;
    const d2 = (s.pos.x - pos.x) ** 2 + (s.pos.y - pos.y) ** 2;
    const flux = d2 > 0 ? l / d2 : Infinity;
    if (keep && (s.star ?? s) === keep) [held, heldFlux] = [s, flux];
    if (flux > bestFlux || (flux === bestFlux && l > (best?.luminosity ?? 0))) {
      bestFlux = flux;
      best = s;
    }
  }
  return held && heldFlux * (1 + LIGHT_HOLD) >= bestFlux ? held : best;
}

/** Five per cent more flux, about 2.5 per cent less distance, to change light. */
export const LIGHT_HOLD = 0.05;

/**
 * The phase a body shows an observer, as cos a: a is the angle at the body
 * between the light and the observer, and the lit fraction of the disc the
 * observer sees is (1 + cos a) / 2.
 *
 * @param {{x: number, y: number}} pos - The body
 * @param {{x: number, y: number}} light - Unit vector toward the light
 * @param {{x: number, y: number}} observer - Where it is seen from
 * @returns {?number} cos a, or null when the observer is at the body
 */
export function phaseCos(pos, light, observer) {
  const dx = observer.x - pos.x;
  const dy = observer.y - pos.y;
  const d = Math.hypot(dx, dy);
  if (!(d > 0)) return null;
  return Math.max(-1, Math.min(1, (light.x * dx + light.y * dy) / d));
}

/**
 * The night side of a disc as a path, for the caller to fill.
 *
 * The limb away from the light, then back along the terminator: an ellipse
 * whose axis along the light is |cos a| r, bulging into the dark half for a
 * gibbous phase and into the lit half for a crescent. cos a = 0 is the half
 * disc a view from above the orbital plane sees. The lit part then covers
 * (1 + cos a) / 2 of the disc.
 *
 * @param {CanvasRenderingContext2D} ctx - Target
 * @param {{x: number, y: number}} at - Centre
 * @param {number} r - Drawn radius
 * @param {{x: number, y: number}} light - Unit vector toward the light
 * @param {number} [cosA] - The phase, from phaseCos
 */
export function nightPath(ctx, at, r, light, cosA = 0) {
  const th = Math.atan2(light.y, light.x);
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, th + Math.PI / 2, th + 1.5 * Math.PI);
  ctx.ellipse(
    at.x,
    at.y,
    Math.abs(cosA) * r,
    r,
    th,
    1.5 * Math.PI,
    Math.PI / 2,
    cosA >= 0
  );
  ctx.closePath();
}

// --- Color ---------------------------------------------------------------------

/**
 * A star's color from its effective temperature.
 *
 * A coarse blackbody fit, quantised to 100 K so the cache below has a few dozen
 * entries rather than one per star per frame. Accurate enough that an M dwarf
 * is orange, the Sun is white-yellow and an O star is blue-white, which is the
 * whole of what the picture claims.
 *
 * @param {number} teffK - Effective temperature in kelvin
 * @returns {{r: number, g: number, b: number}} 0-255 channels
 */
const starColors = new Map();
export function starColor(teffK) {
  const t = Number.isFinite(teffK) && teffK > 0 ? teffK : 5780;
  const bucket = Math.round(Math.min(40000, Math.max(1500, t)) / 100) * 100;
  const hit = starColors.get(bucket);
  if (hit) return hit;

  // Tanner Helland's approximation, clamped. Cheap, and it has the right
  // qualitative behavior at both ends of the range Gravitas builds stars in.
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
  starColors.set(bucket, rgb);
  return rgb;
}

/**
 * Darken or lighten a channel triple, without leaving the byte range.
 * @param {{r: number, g: number, b: number}} rgb - Color
 * @param {number} f - Multiplier
 * @returns {{r: number, g: number, b: number}} Scaled color
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
 * Directly away from the star: the solar wind carrying it is radial and far
 * faster than the comet. The old anti-velocity drawing dragged the tail
 * behind the comet like smoke, which the real geometry contradicts.
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
  // No star, no ion tail. A caller that wants one anyway gets anti-velocity
  // and should draw it faintly.
  if (!vel) return null;
  const s = Math.hypot(vel.x, vel.y);
  if (!(s > 0)) return null;
  return { x: -vel.x / s, y: -vel.y / s };
}

/**
 * Where a comet's dust tail points.
 *
 * Grains leave at the nucleus's orbital velocity and are only nudged by
 * radiation pressure, so the tail lies between anti-solar and the orbital
 * trail. `curve` is how far toward the trail it has swung (0 at the nucleus,
 * 1 at the tip), so a caller can draw an arc.
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
  // A bounded lag: a real dust tail trails anti-solar by tens of degrees, not
  // ninety. Keeping the tip nearer anti-solar also keeps two tails from
  // reading as one fan.
  const t = Math.max(0, Math.min(1, curve)) * DUST_MAX_LAG;
  const x = ion.x * (1 - t) + trail.x * t;
  const y = ion.y * (1 - t) + trail.y * t;
  const d = Math.hypot(x, y);
  return d > 0 ? { x: x / d, y: y / d } : ion;
}

// --- Ring systems ------------------------------------------------------------
//
// A quarter of generated gas giants get rings: a choice about variety, not a
// claim about nature (the occurrence rate among exoplanets is unknown, and
// the model documentation says so). Everything comes from the body's visual
// seed, so it is identical after a reset, reload, share link or A/B run, and
// is computed once and memoised, never in a draw call.
//
// None of it touches physics: rings extend to 2.5 planetary radii and the
// model radius does not change.

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
    // were tried first and the whole system read as one solid gray ellipse at
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

  // Icy gray through to warm tan. Narrow on purpose: rings are dusty water ice
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
 * Pre-rendered radial gradients, one per color and size bucket.
 *
 * A radial gradient built per body per frame is the single most expensive
 * repeated allocation in the draw path: a hundred bodies at sixty frames a
 * second is six thousand gradient objects a second, each of which the browser
 * rasterises from scratch. A sprite is built once and blitted, and the buckets
 * below mean a scene of a hundred similar planets shares one.
 *
 * Keyed on the color quantised to 5 bits a channel and the size to a power of
 * two, which is what keeps the cache to a few dozen entries.
 */
const sprites = new Map();
const SPRITE_CAP = 96;

/**
 * Paint a limb-darkened stellar disc into a square surface.
 *
 * Shared with the Stellar Lab preview so the lab shows the star the
 * simulation would draw at that temperature. The core is brightest and falls
 * off toward the limb; a flat fill makes every star a sticker.
 *
 * @param {CanvasRenderingContext2D} ctx - Target, with the disc filling it
 * @param {number} size - Width and height of the square, pixels
 * @param {{r: number, g: number, b: number}} rgb - The photosphere's color
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
 * @param {{r: number, g: number, b: number}} rgb - Color
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
