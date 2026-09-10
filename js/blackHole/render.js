// =============================================================================
// Drawing a black hole
// -----------------------------------------------------------------------------
// Every geometric decision comes from js/blackHole/appearance.js, so the disk,
// the bright side and the jets cannot disagree about which way the object is
// facing. This module owns pixels and nothing else: it takes a context, a
// centre, a radius, an appearance and a time, and paints. It reads no
// application state, holds no clock, and cannot reach a body.
//
// How the disk is built
// -----------------------------------------------------------------------------
// Not a radial gradient behind a circle, which is what it was: that has no
// orientation, no inner opening you can see through, and no way to put the far
// side behind the hole. It is drawn as a stack of concentric annular strips,
// each an ellipse squashed by cos i, painted in two passes:
//
//   1. the half of every strip on the far side of the centre,
//   2. the black horizon,
//   3. the half on the near side.
//
// That is what puts the far edge of the disk behind the hole and the near edge
// in front of it, which is the depth cue the old drawing had no way to express.
// It is an ordinary geometric projection and it is not lensing: no light is
// bent, and the far side does not appear above and below the shadow the way it
// would in a real image. The model page says so.
//
// What is cached
// -----------------------------------------------------------------------------
// Nothing per frame. The strip geometry is arithmetic and the colours come from
// a small table built once per appearance and reused while the appearance is
// unchanged; the cache is keyed and bounded. There are no offscreen textures to
// rebuild, no per-pixel work, and no particle arrays.
// =============================================================================

import {
  DISK_OUTER_GRAVITATIONAL_RADII,
  ISCO_GRAVITATIONAL_RADII,
  advanceAzimuth,
  diskPoint,
  dopplerWeight,
  emissivity,
  hasDisk,
  hasJets,
  jetBeaming,
  projection,
  relativeOrbitalSpeed,
  variation,
} from './appearance.js';
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

/** How many annular strips. Enough for a smooth ramp, few enough to be cheap. */
/** How many stops sample the emissivity profile into the radial gradient. */
const STOPS = { low: 8, full: 18 };

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
 * Nothing is cached per frame: the disk is two gradients built from arithmetic
 * and the jets are four filled quadrilaterals, so there are no textures to
 * rebuild and nothing that grows. This exists because a caller should not have
 * to know that, and because a future cache should have one place to be cleared
 * from.
 */
export const clearAppearanceCache = () => {};

/**
 * Draw one half of the disk: the far side, or the near side.
 *
 * Two passes over one path, and the reason is that the two things being drawn
 * vary along different axes.
 *
 * The **emissivity** varies with radius, so it is a radial gradient. To make a
 * radial gradient follow an inclined disk the context is scaled by cos i
 * first, which turns the ellipse into a circle for the duration of the fill;
 * everything is then concentric and the ramp is smooth by construction. Strips
 * of flat colour were tried and they read as a set of concentric rings,
 * because a flat fill has a hard edge however many of them are stacked.
 *
 * The **Doppler weighting** varies with azimuth as cos(phi), which along the
 * disk's major axis is exactly linear in position - so it is a linear gradient
 * across that axis, painted over the base as a brightening on the approaching
 * side. It does not rotate: the bright side is set by the viewing geometry and
 * the direction of flow, and material moves through it while it stays put.
 *
 * @param {CanvasRenderingContext2D} g - Target, already in world coordinates
 * @param {object} at - Centre, {x, y}
 * @param {number} unit - The displayed radius, in world units
 * @param {object} a - An appearance
 * @param {number} side - +1 for the near half, -1 for the far half
 * @param {string} tier - 'low' or 'full'
 * @param {number} alpha - Overall opacity
 */
function drawDiskHalf(g, at, unit, a, side, tier, alpha) {
  const p = projection(a);
  const rot = (a.positionAngleDeg * Math.PI) / 180;
  const rIn = INNER_EDGE * unit;
  const rOut = OUTER_EDGE * unit;
  const from = side > 0 ? 0 : Math.PI;
  const to = side > 0 ? Math.PI : Math.PI * 2;
  const steps = STOPS[tier] ?? STOPS.full;

  g.save();
  g.translate(at.x, at.y);
  g.rotate(rot);
  // Squashing here rather than in every coordinate is what lets a radial
  // gradient follow an inclined disk.
  g.scale(1, Math.max(0.02, p.flatten));

  const path = () => {
    g.beginPath();
    g.arc(0, 0, rOut, from, to);
    g.arc(0, 0, rIn, to, from, true);
    g.closePath();
  };

  // Pass one: the radial profile.
  const base = g.createRadialGradient(0, 0, rIn, 0, 0, rOut);
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const radius = INNER_EDGE + (OUTER_EDGE - INNER_EDGE) * f;
    const e = emissivity(radius, INNER_EDGE, OUTER_EDGE);
    const [r, gg, b] = flowColour(
      Math.log(radius / INNER_EDGE) / Math.log(OUTER_EDGE / INNER_EDGE)
    );
    base.addColorStop(
      f,
      `rgba(${r},${gg},${b},${clamp(e * alpha * 0.5, 0, 0.6)})`
    );
  }
  g.fillStyle = base;
  path();
  g.fill();

  // Pass two: the approaching side, brightened. The two ends of the gradient
  // are dopplerWeight at the two points where the flow is fully along the line
  // of sight; the middle is transparent, so nothing is added where there is no
  // line-of-sight motion.
  const speedMid = relativeOrbitalSpeed(
    (INNER_EDGE + OUTER_EDGE) / 2,
    INNER_EDGE
  );
  const wPlus = dopplerWeight(a, 0, speedMid);
  const wMinus = dopplerWeight(a, Math.PI, speedMid);
  const lift = w => clamp((w - 1) * 0.5 * alpha, 0, 0.4);
  if (lift(wPlus) > 0.004 || lift(wMinus) > 0.004) {
    const shine = g.createLinearGradient(-rOut, 0, rOut, 0);
    shine.addColorStop(0, `rgba(255,236,206,${lift(wMinus)})`);
    shine.addColorStop(0.5, 'rgba(255,236,206,0)');
    shine.addColorStop(1, `rgba(255,236,206,${lift(wPlus)})`);
    g.fillStyle = shine;
    path();
    g.fill();
  }
  g.restore();
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
 * @param {boolean} [spec.outline] - Draw the locating hairline
 */
export function drawBlackHole(g, spec) {
  const {
    at,
    unit,
    appearance: a,
    time = 0,
    tier = 'full',
    alpha = 1,
    outline = true,
  } = spec;
  const disk = hasDisk(a);
  const jets = hasJets(a);
  const beam = jetBeaming(a);

  // The far jet goes down first, so the disk and the horizon cover its root.
  if (jets) drawJet(g, at, unit, a, time, -1, beam.far, tier);
  if (disk) {
    drawDiskHalf(g, at, unit, a, -1, tier, alpha);
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
    drawDiskHalf(g, at, unit, a, 1, tier, alpha);
    if (tier === 'full') drawStreaks(g, at, unit, a, time, 1, alpha);
  }
  if (jets) drawJet(g, at, unit, a, time, 1, beam.near, tier);

  // A hairline, so a dark object on a dark sky can be found and selected.
  //
  // Deliberately at the drawn edge and nowhere else. It is a diagram boundary,
  // not light: a horizon emits nothing, and a bright ring at some multiple of
  // this radius labelled a photon sphere would be a claim this engine has not
  // earned.
  if (outline) {
    g.save();
    g.strokeStyle = 'rgba(200,210,235,0.55)';
    g.lineWidth = Math.max(0.35, unit * 0.05);
    g.beginPath();
    g.arc(at.x, at.y, unit, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
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
});
