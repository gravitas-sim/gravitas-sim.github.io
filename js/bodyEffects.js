// =============================================================================
// The effects: the particle pool and the particle
// -----------------------------------------------------------------------------
// What the engine spawns for the eye: the particle pool, the particle and its
// drawing, and the looks of the bursts. Filed with the engine by registerEffects
// on import; a realm that never imports this has an empty pool that spawns
// nothing. Every random draw stays in the engine, so the stream is the same with
// or without this module (D-DECOMP-16, D-DECOMP-17). Also here: the color tables
// (white dwarf, disk tracer) and the double-tap recognizer js/gestures.js held.
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

/** The color a white dwarf is drawn in, from its temperature (Kelvin). */
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

// The size and color of each burst the engine throws (counts, speeds and
// lifetimes are random draws, so js/physics.js BURSTS keeps them).
const burstLooks = {
  absorb: { start: 5, end: 1 },
  tracer: { start: 8, end: 2 },
  starMerge: { start: 8, end: 2, color: 'rgb(255, 220, 100)' },
  starPlanet: { start: 4, end: 1, color: 'rgb(255, 200, 100)' },
  starGas: { start: 6, end: 2, color: 'rgb(135, 206, 235)' },
  starAsteroid: { start: 3, end: 1, color: 'rgb(200, 150, 100)' },
  rocky: { start: 5, end: 1, color: 'rgb(255, 100, 50)' },
  collapseStar: { start: 12, end: 3, color: 'rgb(255, 255, 255)' },
  collapseNS: { start: 10, end: 2, color: 'rgb(200, 200, 255)' },
  collapseWD: { start: 8, end: 2, color: 'rgb(255, 200, 200)' },
  gasAccretion: { start: 4, end: 1, color: 'rgb(255, 190, 120)' },
  gasMerge: { start: 6, end: 2, color: 'rgb(135, 206, 235)' },
  gasStar: { start: 10, end: 3, color: 'rgb(255, 255, 0)' },
};
/** The color of a disk tracer and of its absorption burst (an rgb() string). */
const tracerColor = o => {
  // Enhanced temperature-based color with dramatic effects
  const temp = o.temperature;
  const brightness = o.brightness_multiplier;

  // Pulsing effect
  const pulse_factor = 0.8 + 0.4 * Math.sin(o.pulse_phase);
  const final_brightness = brightness * pulse_factor;

  if (temp < 3000) {
    const intensity = Math.floor(final_brightness * 150);
    return `rgb(${Math.min(255, intensity)}, ${Math.floor(intensity * 0.3)}, 0)`;
  } else if (temp < 8000) {
    const intensity = Math.floor(final_brightness * 200);
    return `rgb(${Math.min(255, intensity)}, ${Math.floor(intensity * 0.8)}, ${Math.floor(intensity * 0.2)})`;
  } else if (temp < 15000) {
    const intensity = Math.floor(final_brightness * 220);
    return `rgb(${Math.min(255, intensity)}, ${Math.min(255, intensity)}, ${Math.floor(intensity * 0.6)})`;
  } else if (temp < 30000) {
    const intensity = Math.floor(final_brightness * 240);
    return `rgb(${Math.min(255, intensity)}, ${Math.min(255, intensity)}, ${Math.min(255, intensity)})`;
  } else {
    const intensity = Math.floor(final_brightness * 250);
    return `rgb(${Math.floor(intensity * 0.8)}, ${Math.floor(intensity * 0.9)}, ${Math.min(255, intensity)})`;
  }
};

// -----------------------------------------------------------------------------
// Touch gesture recognition (was js/gestures.js)
// -----------------------------------------------------------------------------
// A double tap is two brief one-finger taps, close in time and in space, with
// nothing in between; a second finger, a drag, a hold or a cancel ends the
// sequence (a pinch's two touchend events must not reset the camera). Pure and
// injectable: it takes its clock and touches no DOM (tests/doubleTap.test.js).
// -----------------------------------------------------------------------------

export const DOUBLE_TAP_MS = 320; // longest gap between two taps, ms
export const DOUBLE_TAP_SLOP_PX = 32; // furthest apart two taps may land, px
export const TAP_MAX_MS = 250; // longest a finger may stay down, ms
export const TAP_MOVE_PX = 12; // furthest a finger may travel, px

/** The first touch point of an event, in CSS pixels, or null. */
function pointOf(e) {
  const list = e?.changedTouches?.length ? e.changedTouches : e?.touches;
  const touch = list && list[0];
  if (!touch) return null;
  return { x: touch.clientX, y: touch.clientY };
}

/**
 * A double-tap recognizer: feed it the touch events, call cancel() when
 * something else claims the interaction.
 * @param {object} options
 * @param {Function} options.onDoubleTap - Called with the tap point
 * @param {Function} [options.now] - Clock, for tests
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
    start(e) {
      // A second finger is a pinch, a pan or a stray palm, not a tap.
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

    end(e) {
      const current = press;
      press = null;

      // Fingers still down: one finger leaving a multi-touch gesture. Clearing
      // `pending` stops the other finger's touchend pairing with an earlier tap.
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

registerEffects({
  pool: particlePool,
  looks: burstLooks,
  tracer: tracerColor,
});

export {
  Particle,
  ParticlePool,
  particlePool,
  whiteDwarfColor,
  tracerColor,
  burstLooks,
};
