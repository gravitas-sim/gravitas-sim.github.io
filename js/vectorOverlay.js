// =============================================================================
// Velocity, acceleration and the potential well
// -----------------------------------------------------------------------------
// Three drawings, all of them about one misconception: that a body moves in the
// direction it is pulled. It is the most durable wrong idea in introductory
// mechanics, and an eccentric orbit refutes it every second - the velocity runs
// along the track and the acceleration points at the star, and near periapsis
// they are close to perpendicular. Drawing both, in colors that cannot be
// mistaken for each other, makes that refutation something a student sees
// rather than something they are told.
//
// What is drawn, for the selected body:
//
//   velocity          one arrow, along the track
//   total acceleration one arrow, the sum the integrator actually used
//   per-source arrows  one for each gravitating source, drawn from the body
//                      toward that source
//
// and, optionally, a potential-well underlay for the whole scene.
//
// The numbers come from js/physics.js, which publishes the acceleration each
// body was stepped with and can decompose it by source on request. Nothing here
// computes gravity: a drawing that recomputed the force would be a second
// implementation of the force law, free to disagree with the one the simulation
// is running, and an arrow that disagrees with the motion is worse than no
// arrow at all.
//
// Cost. The per-source arrows are drawn for one body, so they are a handful of
// vectors however large the scene is. The potential well is the expensive one
// and is sampled on a coarse grid into a small offscreen canvas, from a capped
// number of the heaviest sources, and recomputed only when the view or the
// configuration has actually moved. See the notes on POTENTIAL_CELL and
// POTENTIAL_SOURCE_CAP below.
// =============================================================================

import {
  accelerationBreakdown,
  gravitySourcesFor,
  physicsSettings,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
} from './physics.js';
import { t } from './i18n/index.js';
import {
  isPhysical,
  formatSpeed,
  formatTime,
  sig,
  velocityUnitToMs,
  timeUnitSeconds,
} from './units.js';
import { withUnit } from './format.js';
import { trailSpanTime } from './trailSpan.js';

// --- Palette ------------------------------------------------------------------
//
// Chosen so the three classes stay distinct in the one case that matters: an
// eccentric orbit near periapsis, where velocity and acceleration are nearly
// perpendicular and both are long. Velocity is a cool green that appears
// nowhere else in the app; total acceleration is a hot magenta, its opposite on
// the wheel, so the two can never be confused at a glance or in a screenshot.
// The per-source arrows are a muted amber family, deliberately lower in
// contrast than the total: they are components of it, and reading as louder
// than their own sum would be the wrong emphasis.

const VELOCITY_COLOR = '#3ef2a0';
const ACCEL_COLOR = '#ff45c8';
const SOURCE_COLORS = [
  '#ffb057',
  '#7cc4ff',
  '#c9a0ff',
  '#ffe066',
  '#6fe3c8',
  '#ff8f6b',
  '#a0d468',
  '#f78fb3',
];
const HALO = 'rgba(4, 8, 16, 0.85)';

/** The most component arrows drawn at once. See the note where it is used. */
const MAX_SOURCE_ARROWS = 8;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** The smallest label the main canvas draws, in CSS pixels. */
const LABEL_MIN_CSS_PX = 11;

/**
 * Canvas pixels per CSS pixel. The canvas is drawn at the display's pixel
 * ratio (js/quality.js renderScale), so a font of 11 canvas pixels is 5.5 CSS
 * pixels on a HiDPI screen; this is what turns a size in CSS pixels into one
 * the context draws at.
 *
 * @param {CanvasRenderingContext2D} ctx - The context
 * @returns {number} Canvas pixels per CSS pixel, 1 where it cannot be read
 */
export function canvasRatio(ctx) {
  const c = ctx && ctx.canvas;
  const ratio = c && c.clientWidth > 0 ? c.width / c.clientWidth : 1;
  return ratio > 0 && Number.isFinite(ratio) ? ratio : 1;
}

/**
 * A CSS font shorthand with its size made a size on screen: raised to
 * LABEL_MIN_CSS_PX if smaller, then scaled to canvas pixels.
 *
 * @param {CanvasRenderingContext2D} ctx - The context
 * @param {string} font - A shorthand with a size in px, such as "bold 13px sans-serif"
 * @returns {string} The shorthand to assign to ctx.font
 */
export const fitFont = (ctx, font) =>
  font.replace(
    /(\d+(?:\.\d+)?)px/,
    (_, n) =>
      `${+(Math.max(LABEL_MIN_CSS_PX, Number(n)) * canvasRatio(ctx)).toFixed(2)}px`
  );

/**
 * The color a given gravitational source's arrow is drawn in.
 *
 * Keyed on the source's id rather than on its index in the list, so a body's
 * arrow keeps its color when another source is absorbed and the list shortens
 * underneath it. A color that changed every time something merged would make
 * the picture unreadable at exactly the moment it got interesting.
 *
 * @param {number} id - The source's id
 * @returns {string} A CSS color
 */
export const sourceColor = id =>
  SOURCE_COLORS[Math.abs(Math.round(id)) % SOURCE_COLORS.length];

// --- Arrows -------------------------------------------------------------------

/**
 * One arrow, in screen space, with a haloed label at its tip.
 *
 * @param {CanvasRenderingContext2D} ctx - Screen-space context
 * @param {{x: number, y: number}} from - Tail
 * @param {{x: number, y: number}} to - Head
 * @param {object} opts - color, width, label, dash, headScale
 */
function arrow(ctx, from, to, opts = {}) {
  const {
    color = '#fff',
    width = 2.5,
    label = null,
    dash = null,
    alpha = 1,
  } = opts;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (!(len > 2)) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(13, Math.max(6, len * 0.22));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // A dark stroke under the arrow, so it reads over a bright star or a disc.
  // Two passes rather than a shadow: shadowBlur on a line is expensive enough
  // to show up in a frame budget when there are a dozen arrows.
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass === 0 ? HALO : color;
    ctx.fillStyle = pass === 0 ? HALO : color;
    ctx.lineWidth = pass === 0 ? width + 2.5 : width;
    ctx.setLineDash(pass === 0 ? [] : dash || []);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x - ux * head * 0.6, to.y - uy * head * 0.6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - ux * head + uy * head * 0.45,
      to.y - uy * head - ux * head * 0.45
    );
    ctx.lineTo(
      to.x - ux * head - uy * head * 0.45,
      to.y - uy * head + ux * head * 0.45
    );
    ctx.closePath();
    ctx.fill();
  }

  if (label) {
    ctx.font = fitFont(ctx, `600 11px ${MONO}`);
    ctx.textAlign = ux >= 0 ? 'left' : 'right';
    ctx.textBaseline = uy >= 0 ? 'top' : 'bottom';
    const lx = to.x + ux * 8;
    const ly = to.y + uy * 8;
    ctx.strokeStyle = HALO;
    ctx.lineWidth = 3.5;
    ctx.strokeText(label, lx, ly);
    ctx.fillStyle = color;
    ctx.fillText(label, lx, ly);
  }
  ctx.restore();
}

// --- Length means magnitude ---------------------------------------------------
//
// One scale for each kind of arrow, shared by every body in the scene: the
// longest velocity (or acceleration) among the bodies sets it, so a body moving
// twice as fast has an arrow twice as long and two bodies can be compared by
// selecting them in turn. Velocity and acceleration have different dimensions
// and keep a scale each; the legend says what a centimetre of either means.
//
// Two limits keep the picture usable, and the legend says when one applies: a
// floor, so a slow body still has an arrow to see (its length is then not
// proportional), and a ceiling, so a body far faster than the scale was set for
// cannot draw off the canvas.
//
// The scale follows the scene gradually. Set afresh every frame it would jump
// when a body is flung out or absorbed and every arrow in the picture would
// change length at once; eased, a change in the scene is a change a student
// can watch.

/** Arrow for the largest magnitude in the scene, in CSS pixels. */
const ARROW_REF_PX = 96;
const ARROW_FLOOR_PX = 14;
const ARROW_CEIL_PX = 220;
/** What one centimetre is in CSS pixels (CSS defines 96 pixels to the inch). */
const CSS_PX_PER_CM = 96 / 2.54;
/** How far the scale moves toward the scene each frame it is drawn. */
const SCALE_EASE = 0.12;

/** CSS pixels of arrow per simulation unit, by kind; 0 until first drawn. */
const arrowScales = { v: 0, a: 0 };

/** Forget the scales, so the next scene sets them afresh. */
export function resetVectorScale() {
  arrowScales.v = 0;
  arrowScales.a = 0;
}

/**
 * The largest speed and the largest step acceleration among the live bodies.
 *
 * Read off the bodies as the integrator left them (`last_accel`), so the scale
 * comes from the same numbers the arrows do and costs one pass, with no
 * allocation, however many bodies there are.
 *
 * @returns {{v: number, a: number}} The two maxima, 0 where nothing moves
 */
function sceneMaxima() {
  let v = 0;
  let a = 0;
  for (const list of [
    planets,
    stars,
    gas_giants,
    asteroids,
    comets,
    neutron_stars,
    white_dwarfs,
  ]) {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (!b || b.alive === false) continue;
      if (b.vel) v = Math.max(v, Math.hypot(b.vel.x, b.vel.y));
      if (b.last_accel)
        a = Math.max(a, Math.hypot(b.last_accel.x, b.last_accel.y));
    }
  }
  return { v, a };
}

/**
 * Move one scale toward the value that gives `max` the reference length.
 *
 * @param {'v'|'a'} kind - Which scale
 * @param {number} max - The largest magnitude the scale must cover
 * @returns {number} CSS pixels per unit, 0 if there is nothing to scale
 */
function followScale(kind, max) {
  if (!(max > 0)) return arrowScales[kind];
  const target = ARROW_REF_PX / max;
  const now = arrowScales[kind];
  // A scene that has changed by a large factor (a new world, a lesson step
  // that swaps the system) gets its scale at once rather than over a second.
  arrowScales[kind] =
    now > 0 && now / target < 4 && target / now < 4
      ? now + (target - now) * SCALE_EASE
      : target;
  return arrowScales[kind];
}

/**
 * Length in canvas pixels of an arrow for `magnitude`, and whether a limit
 * applied.
 *
 * @param {number} magnitude - In the quantity's own units
 * @param {number} k - CSS pixels per unit
 * @param {number} ratio - Canvas pixels per CSS pixel
 * @returns {{px: number, limit: ?string}} Length and 'floor', 'ceiling' or null
 */
function arrowLength(magnitude, k, ratio) {
  const css = magnitude * k;
  if (css < ARROW_FLOOR_PX)
    return { px: ARROW_FLOOR_PX * ratio, limit: 'floor' };
  if (css > ARROW_CEIL_PX)
    return { px: ARROW_CEIL_PX * ratio, limit: 'ceiling' };
  return { px: css * ratio, limit: null };
}

/**
 * An acceleration as a readable quantity.
 *
 * @param {number} a - Simulation acceleration units
 * @returns {string} For example "5.9 mm/s²"
 */
function formatAcceleration(a) {
  if (!isPhysical()) return withUnit(sig(a), 'u/t²');
  const ms2 = (a * velocityUnitToMs()) / timeUnitSeconds();
  const m = Math.abs(ms2);
  if (m >= 1) return withUnit(sig(ms2), 'm/s²');
  if (m >= 1e-3) return withUnit(sig(ms2 * 1e3), 'mm/s²');
  return withUnit(sig(ms2 * 1e6), 'µm/s²');
}

/**
 * What one centimetre of arrow stands for, as a quantity.
 *
 * @param {'v'|'a'} kind - Which kind
 * @returns {string} For example "12 km/s"
 */
function perCentimetre(kind) {
  const k = arrowScales[kind];
  if (!(k > 0)) return '';
  const unit = CSS_PX_PER_CM / k;
  return kind === 'v' ? formatSpeed(unit) : formatAcceleration(unit);
}

/**
 * Draw the vector overlay for one body.
 *
 * @param {CanvasRenderingContext2D} ctx - Screen-space context
 * @param {object} body - The selected body
 * @param {Function} toScreen - World-to-screen transform
 * @param {object} settings - Live settings
 * @returns {?object} What was drawn, for tests: the vectors in world units,
 *   their magnitudes, the scale note and which limit (if any) each arrow met
 */
export function drawBodyVectors(ctx, body, toScreen, settings) {
  if (!body || body.alive === false) return null;
  const wantV = settings.show_velocity_vectors === true;
  const wantA = settings.show_acceleration_vectors === true;
  if (!wantV && !wantA) return null;

  const origin = toScreen(body.pos);
  const ratio = canvasRatio(ctx);
  const drawn = { velocity: null, total: null, sources: [] };
  const maxima = sceneMaxima();

  if (wantV) {
    const speed = Math.hypot(body.vel.x, body.vel.y);
    const k = followScale('v', Math.max(maxima.v, speed));
    if (speed > 0 && k > 0) {
      const len = arrowLength(speed, k, ratio);
      // The canvas is not transformed here, so the world's +y has to be flipped
      // by hand: an overlay drawn in screen space with the world's sign would
      // point the velocity arrow at the mirror image of the motion, which is
      // exactly the kind of error the overlay exists to prevent.
      const tip = {
        x: origin.x + (body.vel.x / speed) * len.px,
        y: origin.y - (body.vel.y / speed) * len.px,
      };
      arrow(ctx, origin, tip, {
        color: VELOCITY_COLOR,
        width: 3,
        label: 'v',
      });
      drawn.velocity = { x: body.vel.x, y: body.vel.y };
      drawn.speed = speed;
      drawn.velocityLimit = len.limit;
      drawn.velocityScale = perCentimetre('v');
    }
  }

  if (wantA) {
    const parts = accelerationBreakdown(body);
    if (parts) {
      const mag = Math.hypot(parts.total.ax, parts.total.ay);
      const k = followScale('a', Math.max(maxima.a, mag));
      if (mag > 0 && k > 0) {
        // The components go down first and the total on top of them, so that
        // where a single source accounts for nearly all of the pull the total
        // is the arrow you see rather than the one hidden underneath.
        //
        // With exactly one source there is nothing to decompose: the component
        // and the total are the same vector, and drawing both would put a
        // dashed line under a solid one and say nothing. The decomposition
        // appears when there is something to decompose.
        if (parts.sources.length > 1) {
          // Only the strongest few. A cluster scenario can have two hundred
          // sources, and the arrows below the top handful are shorter than
          // their own arrowheads: they would cost a frame's worth of drawing
          // to produce a smudge at the body's center.
          const shown = parts.sources.slice(0, MAX_SOURCE_ARROWS);
          for (const s of shown) {
            const sm = Math.hypot(s.ax, s.ay);
            // Same scale as the total, no floor: a component too small to see
            // is left out rather than drawn at a length it does not have.
            const px = Math.min(sm * k, ARROW_CEIL_PX) * ratio;
            if (!(px > 6)) continue;
            arrow(
              ctx,
              origin,
              {
                x: origin.x + (s.ax / sm) * px,
                y: origin.y - (s.ay / sm) * px,
              },
              {
                color: sourceColor(s.id),
                width: 1.8,
                dash: [7, 4],
                alpha: 0.95,
                label: s.label,
              }
            );
            drawn.sources.push({ id: s.id, x: s.ax, y: s.ay, label: s.label });
          }
        }

        const len = arrowLength(mag, k, ratio);
        arrow(
          ctx,
          origin,
          {
            x: origin.x + (parts.total.ax / mag) * len.px,
            y: origin.y - (parts.total.ay / mag) * len.px,
          },
          { color: ACCEL_COLOR, width: 3, label: 'a' }
        );
        drawn.total = { x: parts.total.ax, y: parts.total.ay };
        drawn.pull = mag;
        drawn.pullLimit = len.limit;
        drawn.pullScale = perCentimetre('a');
        drawn.sourceCount = parts.sources.length;
      }
    }
  }

  return drawn;
}

/**
 * The legend rows for whatever was drawn, as data rather than as a drawing.
 *
 * Returned rather than painted so the caller can put them wherever there is
 * room. They end up in the instrumentation panel on the left, because the
 * bottom-right corner - the obvious place for a legend - is underneath the
 * control rail on a desktop window, and a legend behind a panel is a legend
 * nobody reads.
 *
 * An arrow row carries the magnitude it shows, so the value is in the text and
 * not only in the colour and the length. A `note` row has no swatch: it is the
 * scale of the arrows above it, or how long the trails are.
 *
 * @param {?object} drawn - What drawBodyVectors reported
 * @param {object} [settings] - The live settings; with show_trails on, the
 *   trail's span is stated whether or not an arrow was drawn
 * @returns {Array<{color: string, label: string, dash: boolean, note?: boolean}>} Rows
 */
export function vectorLegendRows(drawn, settings) {
  const rows = [];
  const note = label =>
    rows.push({ color: 'transparent', label, dash: false, note: true });
  if (drawn) {
    if (drawn.velocity) {
      rows.push({
        color: VELOCITY_COLOR,
        label:
          drawn.speed > 0
            ? `${t('vector.velocity')} ${formatSpeed(drawn.speed)}`
            : t('vector.velocity'),
        dash: false,
      });
    }
    if (drawn.total) {
      const name =
        drawn.sources.length > 0
          ? t('vector.acceleration.total')
          : t('vector.acceleration');
      rows.push({
        color: ACCEL_COLOR,
        label:
          drawn.pull > 0 ? `${name} ${formatAcceleration(drawn.pull)}` : name,
        dash: false,
      });
    }
    for (const s of drawn.sources) {
      rows.push({
        color: sourceColor(s.id),
        label: t('vector.source', { body: s.label }),
        dash: true,
      });
    }
    const limited = limit => (limit ? ` (${t(`vector.limit.${limit}`)})` : '');
    if (drawn.velocityScale) {
      note(
        `${t('vector.scale.velocity', { value: drawn.velocityScale })}${limited(drawn.velocityLimit)}`
      );
    }
    if (drawn.pullScale) {
      note(
        `${t('vector.scale.acceleration', { value: drawn.pullScale })}${limited(drawn.pullLimit)}`
      );
    }
  }
  if (settings && settings.show_trails) {
    note(
      t('vector.trails', {
        span: formatTime(
          trailSpanTime(
            physicsSettings.trail_length,
            physicsSettings.max_timestep,
            physicsSettings.sim_speed
          )
        ),
      })
    );
  }
  return rows;
}

// --- The potential well -------------------------------------------------------
//
// Phi(x) = -sum G m_i / max(r_i, softening), sampled on a grid and painted as a
// smooth underlay. Three things keep it affordable:
//
//   POTENTIAL_CELL      the grid is one sample per 10 screen pixels, painted
//                       into a canvas that small and then scaled up with the
//                       browser's own smoothing. A full-resolution field would
//                       be 900x more samples for a picture that is a smooth
//                       gradient either way.
//   POTENTIAL_SOURCE_CAP only the heaviest sources contribute. The field is
//                       dominated by them by construction - potential falls as
//                       1/r and scales with mass - and a scenario with six
//                       hundred asteroids would otherwise cost six hundred
//                       terms per sample for a contribution below the width of
//                       one color step.
//   the cache           recomputed only when the view or the sources have
//                       actually changed, so a paused or slowly drifting scene
//                       repaints the same bitmap.

const POTENTIAL_CELL = 12;
const POTENTIAL_SOURCE_CAP = 24;
/** Redraw at most this often, in ms, when the scene is moving. */
const POTENTIAL_MIN_INTERVAL = 90;

/**
 * The Newtonian potential at a point, from a set of point masses.
 *
 * Phi(x) = -sum G m_i / max(r_i, softening). The softening is the same floor
 * the force law uses, so the well drawn here is the well the bodies are
 * actually moving in rather than an idealization of it: a body that never
 * feels a singular force should not be drawn sitting in one.
 *
 * @param {{x: number, y: number}} at - Where to evaluate
 * @param {number} G - The gravitational constant in force
 * @param {number} softening - The softening floor, world units
 * @param {Array<{mass: number, pos: object}>} sources - The masses
 * @returns {number} The potential, simulation units, always negative
 */
export function potentialAt(at, G, softening, sources) {
  const soft = Math.max(softening, 1e-6);
  let phi = 0;
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    if (!s || !Number.isFinite(s.mass)) continue;
    const r = Math.max(soft, Math.hypot(at.x - s.pos.x, at.y - s.pos.y));
    phi -= (G * s.mass) / r;
  }
  return phi;
}

/**
 * The sources the underlay is built from: the heaviest few, alive, positive.
 * @param {Array} sources - Every candidate
 * @returns {Array} At most POTENTIAL_SOURCE_CAP of them, heaviest first
 */
export function potentialSources(sources) {
  return sources
    .filter(
      s => s && s.alive !== false && Number.isFinite(s.mass) && s.mass > 0
    )
    .sort((a, b) => b.mass - a.mass)
    .slice(0, POTENTIAL_SOURCE_CAP);
}

let potentialCanvas = null;
let potentialCtx = null;
let potentialKey = '';
let potentialPaintedAt = 0;

/**
 * Paint the gravitational potential of the scene as a background wash.
 *
 * Rendered as a color ramp in log depth rather than linearly: the potential
 * spans many decades between a black hole's rim and the far edge of the view,
 * and a linear ramp is a black disc surrounded by nothing at all. Counting
 * decades makes the whole field visible at once, which is what the underlay is
 * for.
 *
 * @param {CanvasRenderingContext2D} ctx - Screen-space context
 * @param {HTMLCanvasElement} canvas - The simulation canvas
 * @param {Function} toWorld - Screen-to-world transform
 * @param {number} G - The gravitational constant in force
 * @param {number} softening - The softening floor, in world units
 * @param {Array} sources - Candidate sources, any number
 */
export function drawPotentialWell(ctx, canvas, toWorld, G, softening, sources) {
  const W = canvas.width || 0;
  const H = canvas.height || 0;
  if (W < 40 || H < 40) return;

  const heaviest = potentialSources(sources);
  if (!heaviest.length) return;

  const cols = Math.max(2, Math.ceil(W / POTENTIAL_CELL));
  const rows = Math.max(2, Math.ceil(H / POTENTIAL_CELL));

  // The cache key is everything the field depends on: the view, and every
  // source's mass and position rounded to about a tenth of a cell. A scene
  // sitting still repaints nothing; one drifting slowly repaints when it has
  // drifted enough to see.
  const corner = toWorld({ x: 0, y: 0 });
  const far = toWorld({ x: W, y: H });
  let key = `${cols}x${rows}|${G}|${corner.x.toFixed(2)},${corner.y.toFixed(2)},${far.x.toFixed(2)},${far.y.toFixed(2)}`;
  for (const s of heaviest) {
    key += `|${s.id}:${s.mass.toPrecision(6)}:${s.pos.x.toFixed(1)},${s.pos.y.toFixed(1)}`;
  }

  const now =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  const stale =
    key !== potentialKey && now - potentialPaintedAt >= POTENTIAL_MIN_INTERVAL;

  if (
    !potentialCanvas ||
    potentialCanvas.width !== cols ||
    potentialCanvas.height !== rows
  ) {
    potentialCanvas = document.createElement('canvas');
    potentialCanvas.width = cols;
    potentialCanvas.height = rows;
    potentialCtx = potentialCanvas.getContext('2d');
    potentialKey = '';
  }

  if (stale || potentialKey === '') {
    const img = potentialCtx.createImageData(cols, rows);
    const data = img.data;
    const soft = Math.max(softening, 1e-6);
    // Sample the world position of each cell center through the same transform
    // the bodies are drawn with, so the well sits exactly under the masses that
    // made it however the view is panned or zoomed.
    let minPhi = Infinity;
    let maxPhi = -Infinity;
    const phi = new Float64Array(cols * rows);

    // The screen-to-world map is affine, so it is sampled three times here and
    // then stepped, rather than called once per cell. That removes thirteen
    // thousand function calls and thirteen thousand short-lived objects from
    // every rebuild, which on a full-screen canvas was most of the cost.
    const o = toWorld({ x: 0.5 * POTENTIAL_CELL, y: 0.5 * POTENTIAL_CELL });
    const ex = toWorld({ x: 1.5 * POTENTIAL_CELL, y: 0.5 * POTENTIAL_CELL });
    const ey = toWorld({ x: 0.5 * POTENTIAL_CELL, y: 1.5 * POTENTIAL_CELL });
    const dxi = ex.x - o.x;
    const dyi = ex.y - o.y;
    const dxj = ey.x - o.x;
    const dyj = ey.y - o.y;

    // Unrolled from potentialAt for the same reason: this is the one loop in
    // the file that runs hundreds of thousands of times per rebuild. The
    // arithmetic is identical, and potentialAt is what the tests check.
    const n = heaviest.length;
    const sxArr = new Float64Array(n);
    const syArr = new Float64Array(n);
    const smArr = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      sxArr[k] = heaviest[k].pos.x;
      syArr[k] = heaviest[k].pos.y;
      smArr[k] = G * heaviest[k].mass;
    }
    const softSq = soft * soft;

    for (let j = 0; j < rows; j++) {
      let wx = o.x + dxj * j;
      let wy = o.y + dyj * j;
      for (let i = 0; i < cols; i++, wx += dxi, wy += dyi) {
        let p = 0;
        for (let k = 0; k < n; k++) {
          const ddx = wx - sxArr[k];
          const ddy = wy - syArr[k];
          const r2 = ddx * ddx + ddy * ddy;
          p -= smArr[k] / Math.sqrt(r2 > softSq ? r2 : softSq);
        }
        phi[j * cols + i] = p;
        if (p < minPhi) minPhi = p;
        if (p > maxPhi) maxPhi = p;
      }
    }

    // Depth in decades below the shallowest sample on screen. The shallowest is
    // the reference rather than zero, because a view that contains no source at
    // all still has a potential and should still show its gradient.
    const shallow = Math.abs(maxPhi) || 1e-12;
    const deep = Math.abs(minPhi) || shallow;
    const decades = Math.max(0.4, Math.log10(deep / shallow) || 0.4);

    // Contour rings, one per fifth of a decade of depth. A smooth wash is a
    // picture of a blur; the thing that makes a potential well read as a well
    // is the spacing of its contours crowding together as it steepens, which is
    // the same reason a topographic map has contours rather than a gradient.
    const RINGS_PER_DECADE = 5;

    for (let n = 0; n < cols * rows; n++) {
      const decadesDown = Math.log10(Math.abs(phi[n]) / shallow);
      const t = Math.min(1, Math.max(0, decadesDown / decades));
      // Gamma below one, so the shallow outskirts - which are most of the
      // frame - are not all crushed into the same near-transparent value.
      const shade = Math.pow(t, 0.6);
      const ring =
        0.5 + 0.5 * Math.cos(2 * Math.PI * decadesDown * RINGS_PER_DECADE);
      // Deep violet through blue to a pale rim: cool everywhere, so the wash
      // never competes with the bodies, which are warm.
      const o = n * 4;
      data[o] = Math.round(16 + 104 * shade * shade + 26 * ring * shade);
      data[o + 1] = Math.round(18 + 52 * shade + 20 * ring * shade);
      data[o + 2] = Math.round(44 + 150 * Math.sqrt(shade) + 30 * ring * shade);
      data[o + 3] = Math.round(26 + 150 * shade + 28 * ring * shade);
    }
    potentialCtx.putImageData(img, 0, 0);
    potentialKey = key;
    potentialPaintedAt = now;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(potentialCanvas, 0, 0, W, H);
  ctx.restore();
}

/** Forget the cached field. Called when a new world is built. */
export function resetPotentialCache() {
  resetVectorScale();
  potentialKey = '';
  potentialCanvas = null;
  potentialCtx = null;
}

/** Re-exported so the renderer does not need to know where sources come from. */
export { gravitySourcesFor };
