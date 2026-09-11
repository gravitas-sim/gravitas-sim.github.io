// =============================================================================
// Drawing a black hole
// -----------------------------------------------------------------------------
// Every geometric decision comes from js/blackHole/geometry.js, which derives
// all of it from one configuration, so the disk, the bright side and the jets
// cannot disagree about which way the object is facing. This module owns pixels and nothing else: it takes a context, a
// centre, a radius, an appearance and a time, and paints. It reads no
// application state, holds no clock, and cannot reach a body.
//
// How the disk is built
// -----------------------------------------------------------------------------
// The disk is an ellipse squashed by cos i, painted in three passes:
//
//   1. the half of it on the far side of the centre,
//   2. the black horizon,
//   3. the half on the near side.
//
// That is what puts the far edge of the disk behind the hole and the near edge
// in front of it, which is the depth cue a flat gradient had no way to express.
// It is an ordinary geometric projection and it is not lensing: no light is
// bent, and the far side does not appear above and below the shadow the way it
// would in a real image. The model page says so.
//
// One envelope, and why every layer shares it
// -----------------------------------------------------------------------------
// The emissivity profile falls to exactly zero at the outer edge, so a disk
// drawn from it has no boundary to see. That only holds if *every* layer
// carries the profile. It did not: the beaming was painted afterwards as a
// left-to-right gradient across the whole annulus, which had nothing to do
// with the radius, so at the rim it was still at full strength and the disk
// ended in a hard elliptical cut - the brighter the approaching side, the
// sharper the cut, and at i = 62 degrees it stopped at fifteen percent opacity
// in a single pixel.
//
// The fix is to split the beaming into the two factors it is made of.
// `beamingSpread` depends only on the radius and the inclination, so it goes
// into a *second radial gradient* built from the same emissivity profile;
// cos(phi) depends only on the azimuth, so it becomes the opacity of a set of
// wedges. The product is the weighting, and because both gradients end at zero
// nothing is painted at the rim at all.
//
// Why the light is composited additively
// -----------------------------------------------------------------------------
// Wedges that meet edge to edge are each anti-aliased against nothing, so
// under ordinary painting their coverages multiply out to slightly less than
// one and every join shows as a hairline. Light does not work that way and
// neither does `lighter`: two coverages that sum to one sum to one. Over the
// sky and over the black horizon it is arithmetically identical to painting
// normally - the same premultiplied colour, the same alpha - so this is not
// extra glow; it is what removes the joins between the wedges and the seam
// down the major axis where the two halves of the disk meet.
//
// What the horizon does not do
// -----------------------------------------------------------------------------
// It does not have an edge drawn on it. There was a pale circle around every
// black hole, always, painted last so that it lay over the foreground half of
// the disk; it was there so that a dark object on a dark sky could be found,
// and it read as light coming off a surface that has none. Finding the object
// belongs to the hover and selection rings in js/render.js, which are drawn in
// screen space where UI belongs. `drawHorizonBoundary` is what is left, for the
// labelled overlay only.
//
// What is cached, and how much
// -----------------------------------------------------------------------------
// One thing: the `rgba(...)` strings for the two disk gradients, at most eight
// sets of about twenty. They are the most expensive part of drawing a small
// black hole - at that size there is almost no area to fill and the work is
// all string building - and they depend on the tier, the inclination and the
// opacity, none of which changes per frame. Everything else is arithmetic:
// two gradients and a few dozen wedge paths per object. No offscreen textures,
// no per-pixel work, no particle arrays, and nothing that grows with the
// number of frames drawn.
//
// What this costs
// -----------------------------------------------------------------------------
// About 185 microseconds for one accreting black hole 265 pixels across at
// i = 62 degrees, against 100 for the flat wash it replaces, measured in
// headless Chromium; a face-on disk, which has no asymmetry and so no wedges,
// is faster than it was. In the application's own probe the two-black-hole
// scenario goes from 0.60 to 1.00 milliseconds a frame at 1440x900 with the
// tier pinned to full - six percent of a sixty-hertz frame. The cost is the
// beaming becoming a real per-azimuth quantity instead of one gradient laid
// across the whole disk.
// =============================================================================

import { hasDisk, hasJets } from './appearance.js';
import {
  DISK_OUTER_GRAVITATIONAL_RADII,
  ISCO_GRAVITATIONAL_RADII,
  advanceAzimuth,
  beamingSpread,
  diskPoint,
  dopplerWeight,
  emissivity,
  jetBeaming,
  projection,
  relativeOrbitalSpeed,
  variation,
} from './geometry.js';
import { clamp } from '../utils.js';

/**
 * How far out the drawing goes, as a multiple of the displayed radius.
 *
 * The displayed radius is a compressed size chosen so a black hole is visible
 * beside a planet; it is not the horizon in any physical scale. The disk is
 * drawn in multiples of it so the picture stays legible, and the ratio of the
 * inner edge to the outer edge is the one the appearance module states.
 */
// Just outside the drawn horizon. It was 1.35, which put the whole bright
// annulus outside the black disc in projection and threw away the depth cue
// the two-pass drawing exists for: with the profile going to zero at the inner
// edge, everything that overlapped the horizon was transparent.
const INNER_EDGE = 1.05;
// Compressed, like everything else drawn here. The appearance module's
// inner-to-outer ratio is 10:1, which at this inner edge would put the outer
// rim thirteen displayed radii out and fill the screen at a close zoom. The
// drawn ratio is 4.5:1; the profile's shape is unchanged, and the decades
// dropped are the ones it makes nearly invisible anyway.
const DRAWN_RATIO = 4.2;
const OUTER_EDGE = INNER_EDGE * DRAWN_RATIO;
/** How much the radial extent is compressed, for the docs and a test. */
const MODEL_RATIO = DISK_OUTER_GRAVITATIONAL_RADII / ISCO_GRAVITATIONAL_RADII;

/** How many stops sample the emissivity profile into the radial gradient. */
const STOPS = { low: 8, full: 18 };

/**
 * The most wedges the beaming asymmetry is ever cut into.
 *
 * Each wedge is one step of a staircase across cos(phi). Twenty-eight of them
 * was the first attempt and it was visibly wrong: a fan of radial spokes
 * across the near side of the disk, because a step of a fiftieth of the
 * brightening is four levels out of 255 and the eye finds a Mach band in a
 * smooth field at one or two. The count is derived from the step it wants
 * instead - see wedgeCount - and these are only the ceilings.
 */
const WEDGES = { low: 24, full: 64 };

/**
 * The step the staircase aims for, as a fraction of full opacity.
 *
 * Two 255ths, which is where the spokes stop being findable in a side-by-side
 * of the same disk drawn at one, two, four and eight: four shows them in the
 * near-side crescent and two does not. One would be the quantisation floor and
 * would cost twice as many paths for a difference nobody can see.
 */
const WEDGE_STEP = 2 / 255;

/** How many short streaks ride the flow at the close level of detail. */
const STREAKS = { low: 0, full: 10 };

/**
 * Colours for the flow, warm inside to dim outside.
 *
 * **Illustrative.** No temperature or observing band is modelled anywhere in
 * this application, so these are not the colours of anything: a real disk's
 * appearance depends on its temperature, which depends on the hole's mass, and
 * a stellar-mass disk and a supermassive one are nothing like each other. The
 * model page says this in as many words.
 */
const FLOW = [
  { at: 0, rgb: [255, 246, 224] },
  { at: 0.35, rgb: [255, 214, 150] },
  { at: 0.7, rgb: [235, 150, 88] },
  { at: 1, rgb: [150, 84, 60] },
];

/**
 * The colour strings for one disk, kept between frames.
 *
 * Not the picture and not a texture: nineteen `rgba(...)` strings per gradient,
 * which used to be built four times per object per frame - once per gradient
 * per half - and are the single most expensive thing in the drawing when the
 * object is small, because at that size there is almost no area to fill and
 * the work is all string building. They depend on the tier, the inclination
 * and the opacity and on nothing else: not on the position angle, which is a
 * rotation applied afterwards, not on the spin, which only decides which side
 * the brightening lands on, and not on the size, which is the gradient's own
 * radii. A handful of black holes in a scene means a handful of entries.
 */
const stopCache = new Map();
const STOP_CACHE_MAX = 8;

/** Linear interpolation through the table above. */
function flowColour(t) {
  const x = clamp(t, 0, 1);
  for (let i = 1; i < FLOW.length; i++) {
    if (x > FLOW[i].at) continue;
    const a = FLOW[i - 1];
    const b = FLOW[i];
    const f = (x - a.at) / (b.at - a.at || 1);
    return [
      Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * f),
      Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * f),
      Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * f),
    ];
  }
  return FLOW[FLOW.length - 1].rgb;
}

/**
 * Drop anything cached.
 *
 * One thing is: the colour strings for the two disk gradients, at most eight
 * sets of them. There are no offscreen textures, no per-pixel work and no
 * particle arrays, and nothing here grows with the number of frames drawn -
 * but a caller should not have to know that, and a cache should have one place
 * to be cleared from.
 */
export const clearAppearanceCache = () => stopCache.clear();

/**
 * How many wedges a brightening of a given depth needs.
 *
 * Enough that one step is the smallest difference worth drawing, and no more:
 * the count follows the *opacity* the layer reaches rather than the geometry,
 * so a face-on disk asks for none at all, a gently inclined one asks for a few
 * dozen, and only a strongly inclined bright disk pays for the ceiling. The
 * second limit is the object's size: banding lives in the bright inner disk,
 * whose circumference is about nine displayed radii, so past roughly two and a
 * half wedges per radius the steps are thinner than a pixel and stop existing.
 *
 * @param {number} depth - The largest opacity the brightening reaches
 * @param {number} unit - The displayed radius, in world units
 * @param {string} tier - 'low' or 'full'
 * @returns {number} A wedge count, 0 if the pass should be skipped
 */
function wedgeCount(depth, unit, tier) {
  if (!(depth > WEDGE_STEP) || !(unit > 0)) return 0;
  const cap = WEDGES[tier] ?? WEDGES.full;
  const forDepth = Math.ceil(depth / WEDGE_STEP);
  const forSize = Math.ceil(unit * 2.4);
  return clamp(Math.min(forDepth, forSize), 2, cap);
}

/**
 * The colour stops for one disk's two gradients, and how deep the second goes.
 *
 * Both are sampled from the same emissivity profile, which is zero at the
 * inner edge and zero at the outer edge - that shared envelope is the whole
 * point, and it is why neither layer can paint anything at the rim.
 *
 *   `dim` is the disk at its *dimmest*: the brightness the receding side has,
 *   which is the mean profile times (1 - the beaming swing at that radius).
 *
 *   `swing` is the whole asymmetry, twice the swing, to be laid over the top
 *   at an opacity that runs from 0 on the receding side to 1 on the
 *   approaching one. dim + swing * q comes to mean * dopplerWeight exactly,
 *   because the compositing is additive.
 *
 * @param {object} a - An appearance
 * @param {string} tier - 'low' or 'full'
 * @param {number} alpha - Overall opacity
 * @returns {{dim: string[], swing: string[], depth: number}} Cached
 */
function diskStops(a, tier, alpha) {
  const key = `${tier}|${a.inclinationDeg}|${alpha}`;
  const hit = stopCache.get(key);
  if (hit) {
    // Least-recently-used, in the one line a Map gives you for free.
    stopCache.delete(key);
    stopCache.set(key, hit);
    return hit;
  }
  const steps = STOPS[tier] ?? STOPS.full;
  const made = { dim: [], swing: [], depth: 0 };
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const radius = INNER_EDGE + (OUTER_EDGE - INNER_EDGE) * f;
    const e = emissivity(radius, INNER_EDGE, OUTER_EDGE);
    const [r, gg, b] = flowColour(
      Math.log(radius / INNER_EDGE) / Math.log(OUTER_EDGE / INNER_EDGE)
    );
    // The mean brightness across the azimuth, which is what the profile
    // describes; the beaming redistributes it and does not add to it.
    const mean = clamp(e * alpha * 0.5, 0, 0.6);
    const u = beamingSpread(a, relativeOrbitalSpeed(radius, INNER_EDGE));
    const lift = clamp(mean * 2 * u, 0, 1);
    if (lift > made.depth) made.depth = lift;
    made.dim.push(`rgba(${r},${gg},${b},${clamp(mean * (1 - u), 0, 1)})`);
    made.swing.push(`rgba(${r},${gg},${b},${lift})`);
  }
  stopCache.set(key, made);
  if (stopCache.size > STOP_CACHE_MAX) {
    stopCache.delete(stopCache.keys().next().value);
  }
  return made;
}

/**
 * The two gradients for one disk, in the frame the halves are drawn in.
 *
 * Built once per object per frame rather than once per half: a gradient is
 * painted through whatever transform is current when it is *used*, and both
 * halves are drawn through the same one, so the second copy was pure waste.
 *
 * @param {CanvasRenderingContext2D} g - Target
 * @param {object} a - An appearance
 * @param {number} unit - The displayed radius, in world units
 * @param {string} tier - 'low' or 'full'
 * @param {number} alpha - Overall opacity
 * @returns {{dim: object, swing: object, depth: number}} Fill styles
 */
function diskGradients(g, a, unit, tier, alpha) {
  const stops = diskStops(a, tier, alpha);
  const rIn = INNER_EDGE * unit;
  const rOut = OUTER_EDGE * unit;
  const dim = g.createRadialGradient(0, 0, rIn, 0, 0, rOut);
  const swing = g.createRadialGradient(0, 0, rIn, 0, 0, rOut);
  const last = stops.dim.length - 1;
  for (let i = 0; i <= last; i++) {
    dim.addColorStop(i / last, stops.dim[i]);
    swing.addColorStop(i / last, stops.swing[i]);
  }
  return { dim, swing, depth: stops.depth };
}

/**
 * Draw one half of the disk: the far side, or the near side.
 *
 * Both passes are fills of the same annulus, in a frame scaled by cos i so
 * that the ellipse is a circle for the duration and a radial gradient can
 * follow it.
 *
 *   Pass one is the disk at its dimmest, everywhere, in one fill. One fill
 *   means no join to see.
 *
 *   Pass two adds the asymmetry back, as wedges whose opacity says where in
 *   the swing each azimuth sits: 0 on the receding side, 1 on the approaching
 *   one. Both passes are the same emissivity profile, so both reach zero at
 *   the rim and the disk ends in nothing.
 *
 * @param {CanvasRenderingContext2D} g - Target, in the disk's own scaled frame
 * @param {number} unit - The displayed radius, in world units
 * @param {object} a - An appearance
 * @param {number} side - +1 for the near half, -1 for the far half
 * @param {string} tier - 'low' or 'full'
 * @param {object} paint - From diskGradients
 */
function drawDiskHalf(g, unit, a, side, tier, paint) {
  const rIn = INNER_EDGE * unit;
  const rOut = OUTER_EDGE * unit;
  const near = side > 0;

  // An annular sector, in the frame set up by withDiskFrame. `from` and `to`
  // are azimuths in the disk's own plane; the near half is the one whose
  // points are tilted towards the viewer, which is sin(phi) > 0.
  const sector = (from, to) => {
    g.beginPath();
    g.arc(0, 0, rOut, from, to);
    g.arc(0, 0, rIn, to, from, true);
    g.closePath();
    g.fill();
  };

  g.fillStyle = paint.dim;
  sector(near ? 0 : Math.PI, near ? Math.PI : Math.PI * 2);

  const wedges = wedgeCount(paint.depth, unit, tier);
  if (wedges === 0) return;
  g.fillStyle = paint.swing;
  // Boundaries at equal steps of the weighting rather than of the angle, so
  // every step is the same size wherever it falls. The parameter is cos(phi)
  // times the spin: +1 is the approaching side of the flow, -1 the receding
  // one, and reversing the spin swaps them without touching anything else.
  const edge = k => {
    const phi = Math.acos(clamp((1 - (2 * k) / wedges) * a.spin, -1, 1));
    return near ? phi : Math.PI * 2 - phi;
  };
  for (let k = 0; k < wedges; k++) {
    const lit = 1 - (k + 0.5) / wedges;
    if (lit <= 0.002) continue;
    const one = edge(k);
    const two = edge(k + 1);
    g.globalAlpha = lit;
    sector(Math.min(one, two), Math.max(one, two));
  }
  g.globalAlpha = 1;
}

/**
 * A few short streaks riding the flow, instead of a swarm of bright dots.
 *
 * Deterministic: their starting positions come from the appearance's own
 * generator, so they are in the same places on every run, and they advance
 * with the same rotation the strips do.
 */
function drawStreaks(g, at, unit, a, time, side, alpha) {
  const rand = variation(a, 'streaks');
  const n = STREAKS.full;
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const radius = INNER_EDGE * (OUTER_EDGE / INNER_EDGE) ** rand();
    const phi0 = rand() * Math.PI * 2;
    const phi = advanceAzimuth(a, phi0, radius, INNER_EDGE, time);
    const p = diskPoint(a, 1, phi);
    if (Math.sign(p.depth || side) !== side) continue;
    const e = emissivity(radius, INNER_EDGE, OUTER_EDGE);
    if (e <= 0.02) continue;
    const weight = dopplerWeight(
      a,
      phi,
      relativeOrbitalSpeed(radius, INNER_EDGE)
    );
    const span = 0.16 + 0.1 * rand();
    const head = diskPoint(a, radius * unit, phi);
    const tail = diskPoint(a, radius * unit, phi - a.spin * span);
    g.strokeStyle = `rgba(255,240,214,${clamp(e * weight * 0.5 * alpha, 0, 0.6)})`;
    g.lineWidth = Math.max(0.4, unit * 0.05);
    g.beginPath();
    g.moveTo(at.x + tail.x, at.y + tail.y);
    g.lineTo(at.x + head.x, at.y + head.y);
    g.stroke();
  }
  g.restore();
}

/**
 * One jet: a narrow core inside a soft sheath, widening and fading outwards.
 *
 * Launched from outside the drawn horizon, because nothing escapes from inside
 * it. The length is a display choice and is compressed like everything else in
 * this picture; it shares no scale with the horizon.
 */
function drawJet(g, at, unit, a, time, sign, brightness, tier) {
  const p = projection(a);
  const dir = { x: p.jet.x * sign, y: p.jet.y * sign };
  const perp = { x: -dir.y, y: dir.x };
  // Foreshortened by the projection: a face-on jet points at the viewer and
  // has almost no extent on screen.
  const length = unit * 9 * (0.25 + 0.75 * p.jetForeshortening) * a.jetStrength;
  if (length < unit * 0.4) return;
  const start = unit * 1.15;
  const baseWidth = unit * 0.055;
  const tipWidth = unit * 0.19;

  const sx = at.x + dir.x * start;
  const sy = at.y + dir.y * start;
  const tx = at.x + dir.x * (start + length);
  const ty = at.y + dir.y * (start + length);

  // The sheath, then the core, both as tapered quadrilaterals with a gradient
  // along the axis. No blur filter: it is expensive and it smears the edges of
  // everything else drawn afterwards on some backends.
  for (const pass of [
    {
      w0: baseWidth * 2.1,
      w1: tipWidth * 1.9,
      alpha: 0.16,
      rgb: [150, 178, 255],
    },
    { w0: baseWidth, w1: tipWidth, alpha: 0.5, rgb: [226, 236, 255] },
  ]) {
    const grad = g.createLinearGradient(sx, sy, tx, ty);
    const A = pass.alpha * brightness;
    const [r, gg, b] = pass.rgb;
    grad.addColorStop(0, `rgba(${r},${gg},${b},${clamp(A, 0, 1)})`);
    grad.addColorStop(0.45, `rgba(${r},${gg},${b},${clamp(A * 0.6, 0, 1)})`);
    grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(sx - perp.x * pass.w0, sy - perp.y * pass.w0);
    g.lineTo(tx - perp.x * pass.w1, ty - perp.y * pass.w1);
    g.lineTo(tx + perp.x * pass.w1, ty + perp.y * pass.w1);
    g.lineTo(sx + perp.x * pass.w0, sy + perp.y * pass.w0);
    g.closePath();
    g.fill();
  }

  // A few knots travelling outwards, at the close level of detail only. Their
  // spacing is fixed and their motion comes from the time handed in, so they
  // freeze when the simulation does and repeat exactly on a replay.
  if (tier !== 'full') return;
  const knots = 3;
  for (let k = 0; k < knots; k++) {
    const travel = (((time * 0.16 + k / knots) % 1) + 1) % 1;
    const along = start + travel * length;
    const w = baseWidth + (tipWidth - baseWidth) * travel;
    const kx = at.x + dir.x * along;
    const ky = at.y + dir.y * along;
    const fade = (1 - travel) * brightness * 0.5;
    if (fade <= 0.01) continue;
    const grad = g.createRadialGradient(kx, ky, 0, kx, ky, w * 1.5);
    grad.addColorStop(0, `rgba(240,246,255,${clamp(fade, 0, 0.8)})`);
    grad.addColorStop(1, 'rgba(240,246,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(kx, ky, w * 1.5, 0, Math.PI * 2);
    g.fill();
  }
}

/**
 * Draw the whole object: flow behind, horizon, flow in front, jets.
 *
 * @param {CanvasRenderingContext2D} g - Target, in world coordinates
 * @param {object} spec - What to draw
 * @param {object} spec.at - Centre in world units
 * @param {number} spec.unit - The displayed radius in world units
 * @param {object} spec.appearance - From createAppearance
 * @param {number} spec.time - Seconds; a paused clock freezes the picture
 * @param {string} [spec.tier] - 'low' or 'full'
 * @param {number} [spec.alpha] - Overall opacity for the flow
 */
export function drawBlackHole(g, spec) {
  const { at, unit, appearance: a, time = 0, tier = 'full', alpha = 1 } = spec;
  const disk = hasDisk(a);
  const jets = hasJets(a);
  const beam = jetBeaming(a);

  // The frame the disk is drawn in: turned to the position angle, squashed by
  // cos i so that a radial gradient follows the ellipse, and additive, which
  // is what lets the two halves meet without a seam. Both halves are drawn
  // through it, with the horizon in between, and the gradients are built once
  // inside it and used by both.
  const flatten = Math.max(0.02, projection(a).flatten);
  let paint = null;
  const inDiskFrame = fn => {
    g.save();
    g.translate(at.x, at.y);
    g.rotate((a.positionAngleDeg * Math.PI) / 180);
    g.scale(1, flatten);
    g.globalCompositeOperation = 'lighter';
    if (!paint) paint = diskGradients(g, a, unit, tier, alpha);
    fn();
    g.restore();
  };

  // The far jet goes down first, so the disk and the horizon cover its root.
  if (jets) drawJet(g, at, unit, a, time, -1, beam.far, tier);
  if (disk) {
    inDiskFrame(() => drawDiskHalf(g, unit, a, -1, tier, paint));
    if (tier === 'full') drawStreaks(g, at, unit, a, time, -1, alpha);
  }

  // The horizon. Flat black, over everything behind it: this is the object,
  // and the rest is material near it.
  g.save();
  g.fillStyle = '#000000';
  g.beginPath();
  g.arc(at.x, at.y, unit, 0, Math.PI * 2);
  g.fill();
  g.restore();

  if (disk) {
    inDiskFrame(() => drawDiskHalf(g, unit, a, 1, tier, paint));
    if (tier === 'full') drawStreaks(g, at, unit, a, time, 1, alpha);
  }
  if (jets) drawJet(g, at, unit, a, time, 1, beam.near, tier);
}

/**
 * The horizon's edge, as a line on a diagram.
 *
 * There used to be a pale circle around every black hole, all the time, drawn
 * last so it sat on top of the foreground half of the disk. It was there so a
 * dark object on a dark sky could be found, and it is gone: a horizon emits
 * nothing, and a permanent ring at the silhouette's edge reads as light coming
 * off it. Finding the object is the selection and hover system's job, and that
 * is drawn in screen space where UI belongs.
 *
 * What is left is this, for the labelled overlay only, and it is dashed for
 * the same reason a contour line is dashed: to say that it is drawn on the
 * picture rather than being in it. It marks the drawn silhouette and nothing
 * else - not a photon sphere, not an innermost stable orbit, neither of which
 * this drawing is to scale for.
 *
 * @param {CanvasRenderingContext2D} g - Target, in world coordinates
 * @param {object} at - Centre in world units
 * @param {number} unit - The displayed radius in world units
 * @param {number} [scale] - World units per screen pixel, so the line keeps a
 *   constant width however far the view is zoomed
 */
export function drawHorizonBoundary(g, at, unit, scale = 1) {
  g.save();
  g.strokeStyle = 'rgba(160,200,255,0.75)';
  g.lineWidth = 1.2 * scale;
  g.setLineDash([5 * scale, 4 * scale]);
  g.beginPath();
  g.arc(at.x, at.y, unit, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

/** Where the parts of the picture are, for the "Explain this view" overlay. */
export function annotations(a, unit) {
  const p = projection(a);
  const out = [{ key: 'horizon', x: 0, y: 0, r: unit }];
  if (hasDisk(a)) {
    // The approaching side is where the line-of-sight term is most negative
    // for the flow direction, which is the half the Doppler weighting brightens.
    const phi = a.spin > 0 ? 0 : Math.PI;
    const near = diskPoint(a, unit * (INNER_EDGE + OUTER_EDGE) * 0.28, phi);
    out.push({ key: 'approaching', x: near.x, y: near.y, r: unit * 0.5 });
    const far = diskPoint(a, unit * OUTER_EDGE * 0.75, phi + Math.PI);
    out.push({ key: 'disk', x: far.x, y: far.y, r: unit * 0.5 });
  }
  if (hasJets(a)) {
    const length =
      unit * 9 * (0.25 + 0.75 * p.jetForeshortening) * a.jetStrength;
    out.push({
      key: 'jet',
      x: p.jet.x * (unit * 1.15 + length * 0.7),
      y: p.jet.y * (unit * 1.15 + length * 0.7),
      r: unit * 0.5,
    });
  }
  return out;
}

/** The radii the drawing uses, for tests and for documentation. */
export const DRAWN = Object.freeze({
  innerEdge: INNER_EDGE,
  outerEdge: OUTER_EDGE,
  drawnRatio: DRAWN_RATIO,
  modelRatio: MODEL_RATIO,
  stops: STOPS,
  streaks: STREAKS,
  wedges: WEDGES,
});

/** How many wedges a brightening of a given depth uses. For tests. */
export const wedgesFor = wedgeCount;

/** How many sets of colour strings are being held. For tests. */
export const cachedStopSets = () => stopCache.size;
