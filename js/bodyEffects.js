// =============================================================================
// The effects: the particle pool and the particle
// -----------------------------------------------------------------------------
// What the engine spawns for the eye: the particle pool, the particle and its
// drawing, as they were in js/physics.js. Filed with the engine by
// registerEffects on import; a realm that never imports this has an empty pool
// that spawns nothing. The merger explosions' builders stay in the engine, so
// the random stream is the same with or without this module (D-DECOMP-16).
// Also here: the white dwarf color table (only its drawer reads it) and, to pay
// for this module's request, the double-tap recognizer js/gestures.js held.
// =============================================================================

import { state, registerEffects } from './physics.js';

class ParticlePool {
  constructor(initialSize = 100) {
    this.pool = [];
    this.activeParticles = [];
    this.maxPoolSize = initialSize;
  }

  getParticle(
    pos,
    vel,
    lifetime = 0.8,
    start_size = 5,
    end_size = 1,
    color = 'rgb(255,255,100)'
  ) {
    let particle;
    if (this.pool.length > 0) {
      particle = this.pool.pop();
      if (particle.reset) {
        particle.reset(pos, vel, lifetime, start_size, end_size, color);
      } else {
        // Fallback for particles created before reset method was added
        if (!particle.pos) particle.pos = { x: 0, y: 0 };
        if (!particle.vel) particle.vel = { x: 0, y: 0 };
        particle.pos.x = pos.x;
        particle.pos.y = pos.y;
        particle.vel.x = vel.x;
        particle.vel.y = vel.y;
        particle.lifetime = Math.max(0.1, lifetime);
        particle.age = 0;
        particle.start_size = start_size;
        particle.end_size = end_size;
        particle.color = color;
      }
    } else {
      particle = new Particle(pos, vel, lifetime, start_size, end_size, color);
    }
    this.activeParticles.push(particle);
    return particle;
  }

  updateAndCleanup(dt) {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      particle.update(dt);

      if (!particle.is_alive()) {
        this.activeParticles.splice(i, 1);
        if (this.pool.length < this.maxPoolSize) {
          this.pool.push(particle);
        }
      }
    }
  }

  getActiveParticles() {
    return this.activeParticles;
  }

  clear() {
    this.pool.push(...this.activeParticles);
    this.activeParticles.length = 0;
  }
}

class Particle {
  constructor(
    pos,
    vel,
    lifetime = 0.8,
    start_size = 5,
    end_size = 1,
    color = 'rgb(255,255,100)'
  ) {
    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.reset(pos, vel, lifetime, start_size, end_size, color);
  }

  reset(pos, vel, lifetime, start_size, end_size, color) {
    this.pos.x = pos.x;
    this.pos.y = pos.y;
    this.vel.x = vel.x;
    this.vel.y = vel.y;
    this.lifetime = Math.max(0.1, lifetime);
    this.age = 0;
    this.start_size = start_size;
    this.end_size = end_size;
    this.color = color;
  }

  update(dt) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.age += dt;
  }

  is_alive() {
    return this.age < this.lifetime;
  }

  draw(ctx) {
    drawParticle(this, ctx);
  }
}

function drawParticle(o, ctx) {
  const life_fraction = o.age / o.lifetime;
  const current_size =
    o.start_size * (1 - life_fraction) + o.end_size * life_fraction;
  const alpha = 1 - life_fraction;

  if (current_size < 1 || alpha < 0.05) return;

  const world_pos = o.pos; // Use direct world coordinates since canvas is already transformed

  if (o.kilonova_glow && o.glow_intensity) {
    const glow_size = current_size * 3 * o.glow_intensity;
    const glow_alpha = alpha * 0.3 * o.glow_intensity;

    ctx.fillStyle = o.color;
    ctx.globalAlpha = glow_alpha;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, glow_size / state.zoom, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.fillStyle = o.color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(world_pos.x, world_pos.y, current_size / state.zoom, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1; // Reset alpha
}

/**
 * The color a white dwarf is drawn in, from its temperature.
 * @param {number} temperature - Kelvin
 * @returns {string} A hex color
 */
const whiteDwarfColor = temperature => {
  if (temperature > 15000)
    return '#9BB0FF'; // Blue-white
  else if (temperature > 10000)
    return '#CAD7FF'; // White
  else if (temperature > 7500)
    return '#F8F7FF'; // Yellow-white
  else return '#FFE4B5'; // Orange-white
};

const particlePool = new ParticlePool(200);

// -----------------------------------------------------------------------------
// Touch gesture recognition (was js/gestures.js)
// -----------------------------------------------------------------------------
// One recognizer so far, and it exists because the thing it replaces was not a
// recognizer at all. js/main.js held a single timestamp and reset the camera
// whenever two `touchend` events arrived less than half a second apart:
//
//     if (currentTime - lastTap < 500) { state.zoom = 1; state.pan = {x:0,y:0}; }
//
// A pinch ends with two touchend events milliseconds apart, so every pinch
// finished by throwing the reader's view away. So did a drag followed by a tap,
// a placement followed by a tap, and two people touching the screen at once.
// The report was "the view sometimes jumps"; the surprising part is that it did
// not jump more often.
//
// A tap is one finger, briefly, without moving. A double tap is two of those,
// close together in time AND in space, with nothing in between. Everything
// else - a second finger at any point, a drag, a hold, a cancel from the
// application - ends the sequence.
//
// Pure and injectable: it takes its clock as a parameter and touches no DOM, so
// the whole state machine is testable without a browser. See
// tests/doubleTap.test.js.
// -----------------------------------------------------------------------------

/** Longest gap between two taps that still reads as one gesture, in ms. */
export const DOUBLE_TAP_MS = 320;

/** Furthest apart two taps may land and still be the same gesture, in CSS px. */
export const DOUBLE_TAP_SLOP_PX = 32;

/** Longest a finger may stay down and still count as a tap, in ms. */
export const TAP_MAX_MS = 250;

/** Furthest a finger may travel during a tap, in CSS px. */
export const TAP_MOVE_PX = 12;

/**
 * The first touch point of an event, in CSS pixels.
 *
 * CSS pixels on purpose: this compares one touch against another and never
 * against the canvas backing store, so converting would add a dependency on
 * the canvas for no gain. Anything that needs canvas pixels converts at its
 * own boundary - see canvasPoint() in js/ui.js.
 *
 * @param {{touches: Array, changedTouches: Array}} e - A touch event
 * @returns {?{x: number, y: number}} The point, or null if there is none
 */
function pointOf(e) {
  const list = e?.changedTouches?.length ? e.changedTouches : e?.touches;
  const touch = list && list[0];
  if (!touch) return null;
  return { x: touch.clientX, y: touch.clientY };
}

/**
 * A double-tap recognizer.
 *
 * @param {object} options
 * @param {Function} options.onDoubleTap - Called with the tap point
 * @param {Function} [options.now] - Clock, for tests
 * @returns {{start: Function, move: Function, end: Function, cancel: Function}}
 *   Feed it the three touch events; call cancel() when something else has
 *   claimed the interaction.
 */
export function createDoubleTapRecognizer({ onDoubleTap, now } = {}) {
  const clock =
    now ||
    (() =>
      typeof performance !== 'undefined' && performance.now
        ? performance.now()
        : Date.now());

  /** The press in progress, or null. */
  let press = null;
  /** The completed tap waiting for a partner, or null. */
  let pending = null;

  /** Forget everything. The sequence is over and did not qualify. */
  const cancel = () => {
    press = null;
    pending = null;
  };

  return {
    /**
     * A finger went down.
     * @param {object} e - touchstart
     */
    start(e) {
      // A second finger means a pinch, a two-finger pan, or a stray palm. None
      // of those is a tap, and none of them should leave a half-finished tap
      // behind to pair with the next one.
      if ((e?.touches?.length || 0) > 1) {
        cancel();
        return;
      }
      const at = pointOf(e);
      if (!at) {
        cancel();
        return;
      }
      press = { at, downAt: clock(), moved: false };
    },

    /**
     * A finger moved.
     * @param {object} e - touchmove
     */
    move(e) {
      if ((e?.touches?.length || 0) > 1) {
        cancel();
        return;
      }
      if (!press) return;
      const at = pointOf(e);
      if (!at) return;
      if (Math.hypot(at.x - press.at.x, at.y - press.at.y) > TAP_MOVE_PX) {
        press.moved = true;
      }
    },

    /**
     * A finger came up.
     * @param {object} e - touchend
     */
    end(e) {
      const current = press;
      press = null;

      // Fingers still down: this is one finger leaving a multi-touch gesture,
      // not a tap ending. The `start` guard has already cleared `press`, and
      // clearing `pending` here is what stops the *other* finger's touchend
      // from pairing with a legitimate tap that came before the pinch.
      if ((e?.touches?.length || 0) > 0) {
        pending = null;
        return;
      }

      if (!current || current.moved) {
        pending = null;
        return;
      }
      const at = pointOf(e) || current.at;
      const held = clock() - current.downAt;
      // A long press is how placement is armed; it is deliberately not a tap.
      if (held > TAP_MAX_MS) {
        pending = null;
        return;
      }
      // The finger may have drifted between the last move and the release.
      if (Math.hypot(at.x - current.at.x, at.y - current.at.y) > TAP_MOVE_PX) {
        pending = null;
        return;
      }

      const at_ms = clock();
      if (
        pending &&
        at_ms - pending.at_ms <= DOUBLE_TAP_MS &&
        Math.hypot(at.x - pending.x, at.y - pending.y) <= DOUBLE_TAP_SLOP_PX
      ) {
        pending = null;
        if (typeof onDoubleTap === 'function')
          onDoubleTap({ x: at.x, y: at.y });
        return;
      }
      pending = { x: at.x, y: at.y, at_ms };
    },

    cancel,
  };
}

registerEffects({ pool: particlePool });

export { Particle, ParticlePool, particlePool, whiteDwarfColor };
