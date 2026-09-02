// =============================================================================
// Measurement instruments: the parts a ruler, a protractor, a stopwatch and a
// scale bar have in common
// -----------------------------------------------------------------------------
// Two audiences share this file. The lesson widgets draw at their own private
// zoom levels inside a panel; the sandbox draws over the live simulation at the
// user's zoom. Both need the same four things - a round number to label a bar
// with, a scale bar drawn to that number, an angle between two rays, and a
// stopwatch that can be latched against a repeating event - and both were
// getting them separately, which is how a lesson and the sandbox end up
// disagreeing about how long an AU is.
//
// The scale bar and its rounding came from js/blackHoleWidgets.js, where every
// panel already carried one; blackHoleWidgets now imports them from here rather
// than keeping a second copy. The stopwatch's latch semantics - mark, run,
// stop, and an elapsed time that freezes when stopped - came from the binary
// widget's Mark/Stop pair in js/binaryWidgets.js, generalized so that the thing
// being latched to can be a periapsis passage rather than a crossing the
// student watches for by eye.
//
// Nothing here reads simulation state or the DOM beyond the canvas context it
// is handed. That is what lets the same scale bar be drawn into a lesson panel,
// the live canvas and an exported screenshot without three implementations.
// =============================================================================

import { AU_METERS } from './constants.js';

/** The monospaced face the instruments label themselves in. */
export const INSTRUMENT_MONO =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/**
 * A round number near the target, for scale bars: 1, 2, 5, 10, 20, 50, ...
 *
 * @param {number} target - The length the bar would have if it were not rounded
 * @returns {number} The round number to draw instead
 */
export function niceLength(target) {
  if (!(target > 0) || !Number.isFinite(target)) return 1;
  const mag = 10 ** Math.floor(Math.log10(target));
  const n = target / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}

/** Thousands separators, for a scale bar's label. */
const commas = n => n.toLocaleString('en-US');

/**
 * Choose the unit a length is best written in, and say how many of them.
 *
 * The unit is chosen before the rounding, never after. Round a number of metres
 * and then convert and the bar ends up labelled "0.224 AU", which reads as an
 * accident rather than as a scale.
 *
 * @param {number} meters - The length
 * @returns {{value: number, unit: string, meters: number, text: string}} The
 *   rounded length, its unit, its length in metres, and a label
 */
export function niceScaleLength(meters) {
  const unit =
    meters >= 0.02 * AU_METERS
      ? { m: AU_METERS, name: 'AU' }
      : { m: 1000, name: 'km' };
  const value = niceLength(meters / unit.m);
  return {
    value,
    unit: unit.name,
    meters: value * unit.m,
    text: `${value >= 1 ? commas(Math.round(value)) : Number(value.toPrecision(2))} ${unit.name}`,
  };
}

/**
 * A labelled scale bar, drawn left to right from (x, y).
 *
 * Every panel that draws at its own zoom level carries one, because a picture
 * of a black hole with no scale on it is a picture of a circle, and a
 * screenshot of a simulation with no scale on it is a picture of some dots.
 *
 * @param {CanvasRenderingContext2D} ctx - Target context, screen space
 * @param {number} x - Left end, pixels
 * @param {number} y - Baseline, pixels
 * @param {number} maxPx - The longest the bar may be
 * @param {number} metersPerPx - The scale being labelled
 * @param {object} [opts] - color, font, labelBelow
 * @returns {number} The width the bar actually took, in pixels
 */
export function scaleBar(ctx, x, y, maxPx, metersPerPx, opts = {}) {
  const {
    color = '#9aa3b5',
    font = `10px ${INSTRUMENT_MONO}`,
    labelBelow = false,
  } = opts;
  if (!(metersPerPx > 0) || !Number.isFinite(metersPerPx)) return 0;
  const { meters, text } = niceScaleLength(maxPx * metersPerPx);
  const px = meters / metersPerPx;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x, y + 4);
  ctx.moveTo(x, y);
  ctx.lineTo(x + px, y);
  ctx.moveTo(x + px, y - 4);
  ctx.lineTo(x + px, y + 4);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = font;
  if (labelBelow) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x + px / 2, y + 6);
  } else {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x + px + 7, y - 5);
  }
  ctx.restore();
  return px;
}

/**
 * The angle at `vertex` between the rays to `a` and to `b`, in degrees.
 *
 * Always the angle actually enclosed by the drawn rays, so it lies in [0, 180]
 * and never depends on which arm the student dragged first. A protractor that
 * read 250 degrees on one side and 110 on the other would be measuring the
 * order of the clicks rather than the geometry.
 *
 * @param {{x: number, y: number}} vertex - Where the two rays meet
 * @param {{x: number, y: number}} a - A point on the first ray
 * @param {{x: number, y: number}} b - A point on the second ray
 * @returns {number} Degrees in [0, 180], or NaN if either arm has no length
 */
export function angleAtVertex(vertex, a, b) {
  const ax = a.x - vertex.x;
  const ay = a.y - vertex.y;
  const bx = b.x - vertex.x;
  const by = b.y - vertex.y;
  const la = Math.hypot(ax, ay);
  const lb = Math.hypot(bx, by);
  if (!(la > 0) || !(lb > 0)) return NaN;
  // atan2 of the cross and dot products rather than acos of the dot product
  // alone: acos loses all its precision on the nearly-parallel arms a student
  // gets when they are trying to measure a small angle.
  const cross = ax * by - ay * bx;
  const dot = ax * bx + ay * by;
  return (Math.abs(Math.atan2(cross, dot)) * 180) / Math.PI;
}

/**
 * The direction from `from` to `to`, in degrees counterclockwise from east.
 *
 * @param {{x: number, y: number}} from - Origin
 * @param {{x: number, y: number}} to - Target
 * @returns {number} Degrees in [0, 360)
 */
export function bearingDegrees(from, to) {
  const deg = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * A stopwatch that can be latched to a repeating event.
 *
 * The manual half is the binary widget's Mark/Stop pair, which a student uses
 * to time a lap by eye: Mark starts the interval, Stop freezes it, and the
 * elapsed reading holds until the next Mark. The latch half automates the same
 * two presses against an event the simulation can detect for itself - a
 * periapsis passage - so that timing an orbit from periapsis does not depend on
 * the student's reaction time, which is the largest error in the measurement
 * they are being asked to make.
 *
 * The clock is fed simulated time, not wall-clock time, so pausing the
 * simulation pauses the stopwatch and changing the simulation speed does not
 * change the measured period.
 */
export class LatchStopwatch {
  constructor() {
    this.reset();
  }

  /** Back to zero, unlatched, not running. */
  reset() {
    /** Simulated time the clock has seen, its own zero. */
    this.now = 0;
    /** When the current interval started, or null if none has. */
    this.markedAt = null;
    /** When it was frozen, or null while it is still running. */
    this.stoppedAt = null;
    /** Whether the clock advances when fed time. */
    this.running = false;
    /** Intervals completed, most recent first. */
    this.laps = [];
    /** Set while the clock is being driven by periapsis passages. */
    this.latchMode = 'manual';
    /** The body being latched to, by id. */
    this.latchTargetId = null;
    this._lastRadius = null;
    this._prevRadius = null;
    this._latchArmed = false;
  }

  /**
   * Advance the clock.
   * @param {number} dtSim - Simulated time since the last call
   */
  tick(dtSim) {
    if (!this.running || !(dtSim > 0)) return;
    this.now += dtSim;
  }

  /** Start a fresh interval at the current time. */
  mark() {
    this.markedAt = this.now;
    this.stoppedAt = null;
    this.running = true;
  }

  /** Freeze the current interval, keeping its reading. */
  stop() {
    if (this.markedAt === null) return;
    if (this.stoppedAt === null) {
      this.stoppedAt = this.now;
      this.laps.unshift(this.stoppedAt - this.markedAt);
      this.laps.length = Math.min(this.laps.length, 5);
    }
  }

  /** Run or pause the clock without disturbing the current interval. */
  toggleRun() {
    this.running = !this.running;
  }

  /**
   * The interval currently being displayed.
   * @returns {number|null} Elapsed simulated time, or null before the first mark
   */
  elapsed() {
    if (this.markedAt === null) return null;
    return (this.stoppedAt ?? this.now) - this.markedAt;
  }

  /** @returns {string} 'idle' | 'running' | 'paused' | 'stopped' */
  status() {
    if (this.markedAt === null) return 'idle';
    if (this.stoppedAt !== null) return 'stopped';
    return this.running ? 'running' : 'paused';
  }

  /**
   * Latch onto a body's periapsis passages.
   *
   * @param {number|null} id - The body's id, or null to go back to manual
   */
  latchTo(id) {
    this.latchTargetId = id ?? null;
    this.latchMode = id == null ? 'manual' : 'periapsis';
    this._lastRadius = null;
    this._prevRadius = null;
    this._latchArmed = false;
  }

  /**
   * Feed the latch the body's current distance from its primary.
   *
   * A periapsis is a local minimum in that distance, which is detectable from
   * three consecutive samples and nothing else: no orbital elements, no
   * assumption that the orbit is closed, and nothing that stops working when
   * the orbit is being perturbed. The first detection starts the interval and
   * each one after it closes the previous interval and opens the next, so the
   * reading is the time from one periapsis to the next.
   *
   * @param {number} radius - Distance from the primary now
   * @returns {boolean} True on the frame a passage was detected
   */
  feedRadius(radius) {
    if (this.latchMode !== 'periapsis' || !Number.isFinite(radius))
      return false;
    const a = this._prevRadius;
    const b = this._lastRadius;
    this._prevRadius = b;
    this._lastRadius = radius;
    if (a === null || b === null) return false;
    // Strict on one side and non-strict on the other, so a body sitting at a
    // constant radius - a circular orbit sampled at exactly its own period, or
    // a body that has stopped - cannot fire the latch every frame.
    if (!(b < a && b <= radius)) return false;
    if (!this._latchArmed) {
      this._latchArmed = true;
      this.markedAt = this.now;
      this.stoppedAt = null;
      this.running = true;
      return true;
    }
    const lap = this.now - this.markedAt;
    if (lap > 0) {
      this.laps.unshift(lap);
      this.laps.length = Math.min(this.laps.length, 5);
    }
    this.markedAt = this.now;
    this.stoppedAt = null;
    return true;
  }
}
