// =============================================================================
// The effects: particles and the four merger explosions
// -----------------------------------------------------------------------------
// What the engine spawns for the eye: the particle pool, the particle and its
// drawing, and the kilonova, small kilonova, neutron star-white dwarf and white
// dwarf pair explosions, as they were in js/physics.js (same draws, same order,
// same clock reads). Filed with the engine by registerEffects on import; a realm
// that never imports this has an empty pool and no explosions. Also here: the
// white dwarf color table (only its drawer reads it) and, to pay for this
// module's request, the double-tap recognizer js/gestures.js held.
// =============================================================================

import { SOLAR_MASS_UNIT } from './constants.js';
import { state, gravity_ripples, registerEffects } from './physics.js';

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

/** Create a spectacular kilonova explosion when neutron stars merge (pos, mass). */
const createKilonovaExplosion = (pos, mass) => {
  // Kilonova parameters based on mass
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(2.0, massInSuns / 2.0); // Scale with mass

  const particleCount = Math.floor(200 + massInSuns * 50); // 200-400 particles based on mass

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 300 + 200) * explosionIntensity; // 200-500 speed units

    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    // Random position within explosion radius
    const radius = Math.random() * 50;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle),
    };

    // Kilonova colors: bright blue-white to orange-red
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 200)', // Bright yellow
      'rgb(255, 200, 100)', // Orange
      'rgb(255, 150, 50)', // Bright orange
      'rgb(255, 100, 0)', // Red-orange
      'rgb(200, 100, 255)', // Purple (r-process elements)
      'rgb(100, 200, 255)', // Blue (gamma rays)
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 3.0 + 2.0, // 2-5 second lifetime
      Math.random() * 15 + 10, // 10-25 start size
      Math.random() * 3 + 1, // 1-4 end size
      color
    );

    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.5 + 0.5;
    }
  }

  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 3000, // 3 seconds - reduced from 5 seconds
    mass: massInSuns,
    gw_strength: 0.4, // Reduced strength from 1.0 to 0.4
    kilonova: true, // Special flag for kilonova GW
  });

  for (let i = 0; i < 50; i++) {
    const angle = (i / 50) * 2 * Math.PI;
    const speed = 150 + Math.random() * 100;
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 2.0 + 1.0, // 1-3 second lifetime
      Math.random() * 8 + 5, // 5-13 start size
      Math.random() * 2 + 1, // 1-3 end size
      'rgb(255, 255, 255)' // White shockwave
    );
  }
};

/** Create a smaller kilonova explosion when neutron stars merge but don't form a black hole (pos, mass). */
const createSmallKilonovaExplosion = (pos, mass) => {
  // Kilonova parameters based on mass (reduced intensity)
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.0, massInSuns / 3.0); // Reduced intensity for smaller explosions

  const particleCount = Math.floor(100 + massInSuns * 25); // 100-200 particles (half of full kilonova)

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 200 + 150) * explosionIntensity; // 150-350 speed units (reduced)

    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    // Random position within explosion radius (smaller)
    const radius = Math.random() * 30;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle),
    };

    // Kilonova colors: bright blue-white to orange-red (same as full kilonova)
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 200)', // Bright yellow
      'rgb(255, 200, 100)', // Orange
      'rgb(255, 150, 50)', // Bright orange
      'rgb(255, 100, 0)', // Red-orange
      'rgb(200, 100, 255)', // Purple (r-process elements)
      'rgb(100, 200, 255)', // Blue (gamma rays)
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 2.0 + 1.5, // 1.5-3.5 second lifetime (shorter)
      Math.random() * 10 + 6, // 6-16 start size (smaller)
      Math.random() * 2 + 1, // 1-3 end size (smaller)
      color
    );

    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.3 + 0.3; // Reduced glow
    }
  }

  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 2000, // 2 seconds (shorter than full kilonova)
    mass: massInSuns,
    gw_strength: 0.2, // Reduced strength
    kilonova: true, // Special flag for kilonova GW
  });

  for (let i = 0; i < 25; i++) {
    const angle = (i / 25) * 2 * Math.PI;
    const speed = 100 + Math.random() * 75; // Reduced speed
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 1.5 + 0.8, // 0.8-2.3 second lifetime (shorter)
      Math.random() * 6 + 3, // 3-9 start size (smaller)
      Math.random() * 1.5 + 0.5, // 0.5-2 end size (smaller)
      'rgb(255, 255, 255)' // White shockwave
    );
  }
};

/** Create a moderate explosion when neutron star and white dwarf merge (pos, mass). */
const createNSWDExplosion = (pos, mass) => {
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.5, massInSuns / 1.5); // Moderate intensity

  const particleCount = Math.floor(80 + massInSuns * 30); // 80-150 particles

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 200 + 150) * explosionIntensity; // 150-350 speed units

    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    const radius = Math.random() * 30;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle),
    };

    // NS-WD colors: white to blue-white
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 220)', // Bright white-yellow
      'rgb(220, 255, 255)', // Cyan-white
      'rgb(200, 220, 255)', // Blue-white
      'rgb(255, 220, 200)', // Pink-white
      'rgb(180, 200, 255)', // Light blue
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 2.0 + 1.5, // 1.5-3.5 second lifetime
      Math.random() * 10 + 6, // 6-16 start size
      Math.random() * 2 + 1, // 1-3 end size
      color
    );

    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.3 + 0.3; // Moderate glow
    }
  }

  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 3000, // 3 seconds
    mass: massInSuns,
    gw_strength: 0.6, // Moderate strength
    nswd_merger: true, // Special flag for NS-WD merger
  });

  for (let i = 0; i < 25; i++) {
    const angle = (i / 25) * 2 * Math.PI;
    const speed = 120 + Math.random() * 80;
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 1.5 + 0.8, // 0.8-2.3 second lifetime
      Math.random() * 6 + 4, // 4-10 start size
      Math.random() * 2 + 1, // 1-3 end size
      'rgb(255, 255, 255)' // White shockwave
    );
  }
};

/** Create a smaller explosion when white dwarfs merge (pos, mass). */
const createWDWDExplosion = (pos, mass) => {
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.0, massInSuns / 1.0); // Smaller intensity

  const particleCount = Math.floor(40 + massInSuns * 20); // 40-80 particles

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 150 + 100) * explosionIntensity; // 100-250 speed units

    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    const radius = Math.random() * 20;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle),
    };

    // WD-WD colors: white to yellow
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 240)', // Off-white
      'rgb(255, 250, 220)', // Cream
      'rgb(255, 240, 200)', // Light yellow
      'rgb(255, 230, 180)', // Pale yellow
      'rgb(240, 240, 255)', // Very light blue
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 1.5 + 1.0, // 1-2.5 second lifetime
      Math.random() * 6 + 4, // 4-10 start size
      Math.random() * 2 + 1, // 1-3 end size
      color
    );

    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.2 + 0.2; // Subtle glow
    }
  }

  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 2000, // 2 seconds
    mass: massInSuns,
    gw_strength: 0.3, // Smaller strength
    wdwd_merger: true, // Special flag for WD-WD merger
  });

  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * 2 * Math.PI;
    const speed = 80 + Math.random() * 60;
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 1.0 + 0.5, // 0.5-1.5 second lifetime
      Math.random() * 4 + 3, // 3-7 start size
      Math.random() * 1 + 1, // 1-2 end size
      'rgb(255, 255, 255)' // White shockwave
    );
  }
};

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

registerEffects({
  pool: particlePool,
  kilonova: createKilonovaExplosion,
  smallKilonova: createSmallKilonovaExplosion,
  neutronStarWhiteDwarf: createNSWDExplosion,
  whiteDwarfPair: createWDWDExplosion,
});

export { Particle, ParticlePool, particlePool, whiteDwarfColor };
