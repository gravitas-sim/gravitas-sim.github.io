import {
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  debris,
  particles,
  neutron_stars,
  white_dwarfs,
  accretion_disk_particles,
  updatePhysics,
  DT,
  gravity_ripples,
  screen_to_world,
  world_to_screen,
  findObjectAtPosition,
  setDetailScale,
  SOLAR_MASS_UNIT,
} from './physics.js';
import { hexToRgb, debugLog } from './utils.js';
import {
  SETTINGS,
  state,
  getDragPreview,
  getOrbitPreview,
  checkAreaSweepValidity,
} from './ui.js';
import { updateSonification } from './audio.js';
// Through the bridge, not the module: view3d.js pulls in three.js, and the
// render loop importing it would put 256KB on the start-up path for a panel
// that begins closed.
import { update3DScene } from './view3dBridge.js';
import { updateLightCurve, drawObserverIndicator } from './lightCurve.js';
import { tickTimeline } from './timeline.js';
import { readToken, onThemeChange } from './theme.js';
import { speedTrailColor } from './palette.js';
import { auToSim } from './units.js';
import { habitableZoneBounds, stellarPropertiesFor } from './habitability.js';

/**
 * Translate the legacy "habitable zone optimism" setting into a model name.
 *
 * The old slider ran from 0.5 to 2.0 and multiplied the width of an arbitrary
 * band. Shared links and saved settings still carry it, so it keeps working:
 * anything above the midpoint asks for the optimistic prescription, anything
 * below asks for the conservative one. New wording says which is which rather
 * than implying that 1.7 means something physical.
 *
 * @param {Object} settings - Live settings
 * @returns {string} 'conservative' or 'optimistic'
 */
export function habitableZoneModelFromSettings(settings) {
  const legacy = settings?.habitable_zone_optimism;
  // One stored value, so a shared link from before this change still selects a
  // zone and cannot disagree with the settings menu.
  return typeof legacy === 'number' && legacy >= 1.3
    ? 'optimistic'
    : 'conservative';
}

const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
const overlayDiv =
  document.getElementById('overlayStats') || document.getElementById('overlay');
// Starfield and rendering functions
const starfieldCanvas = document.getElementById('starfieldCanvas');
const starCtx = starfieldCanvas.getContext('2d');
const starfieldStars = [];

// Bloom offscreen canvas for soft glows
const bloomCanvas = document.createElement('canvas');
const bloomCtx = bloomCanvas.getContext('2d');

// Whether anything drew a glow into the bloom layer this frame.
//
// Compositing it costs a full-screen `drawImage` in `lighter` mode plus a
// full-screen clear, every frame, whether or not a single glow was drawn.
// Most scenarios have no bloom content at all, so most of the time that was
// two full-screen operations to add nothing.
//
// The flag is set by the getter rather than by eighteen call sites across
// physics.js, all of which read `window.bloomCtx` immediately before drawing
// into it. Reading it is the intent to draw, so the getter is the one place
// that cannot be forgotten when a new glow is added.
let bloomDirty = false;

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'bloomCtx', {
    configurable: true,
    get() {
      bloomDirty = true;
      return bloomCtx;
    },
  });
}
// ---------------------------------------------------------------------------
// Trail glow sprites
// ---------------------------------------------------------------------------
// One pre-rendered radial gradient per colour, reused for every trail point.
// Colours are quantised to 5 bits per channel so the cache stays small even
// when object colours vary; it is cleared outright if it ever grows past the
// cap, which cannot happen with the handful of base colours in practice.
const GLOW_SPRITE_SIZE = 64;
const GLOW_SPRITE_CACHE_LIMIT = 64;
const glowSpriteCache = new Map();

function getGlowSprite(r, g, b) {
  const qr = r & 0xf8;
  const qg = g & 0xf8;
  const qb = b & 0xf8;
  const key = (qr << 16) | (qg << 8) | qb;
  const cached = glowSpriteCache.get(key);
  if (cached) return cached;

  if (glowSpriteCache.size >= GLOW_SPRITE_CACHE_LIMIT) glowSpriteCache.clear();

  const c = document.createElement('canvas');
  c.width = GLOW_SPRITE_SIZE;
  c.height = GLOW_SPRITE_SIZE;
  const g2d = c.getContext('2d');
  const half = GLOW_SPRITE_SIZE / 2;
  const grad = g2d.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, `rgba(${qr}, ${qg}, ${qb}, 0.8)`);
  grad.addColorStop(0.5, `rgba(${qr}, ${qg}, ${qb}, 0.3)`);
  grad.addColorStop(1, `rgba(${qr}, ${qg}, ${qb}, 0)`);
  g2d.fillStyle = grad;
  g2d.fillRect(0, 0, GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE);
  glowSpriteCache.set(key, c);
  return c;
}

function resizeBloomCanvas() {
  bloomCanvas.width = canvas.width;
  bloomCanvas.height = canvas.height;
}

// Ensure canvas is properly sized on initialization
if (starfieldCanvas) {
  starfieldCanvas.width = window.innerWidth;
  starfieldCanvas.height = window.innerHeight;
  resizeBloomCanvas();

  // Generate initial starfield
  setTimeout(() => {
    generateStarfield();
  }, 100);
} else {
  console.error('Starfield canvas not found!');
}

/**
 * Create ambient gradient for starfield background
 * @returns {CanvasGradient} Linear gradient for ambient lighting effect
 */
const createAmbientGradient = () => {
  const grad = starCtx.createLinearGradient(0, 0, 0, starfieldCanvas.height);
  // Read from the design tokens so the canvas follows the active theme
  // instead of carrying its own copy of the palette.
  grad.addColorStop(0, readToken('--space-near') || '#141833');
  grad.addColorStop(1, readToken('--space-far') || '#05060d');
  return grad;
};

/**
 * Generate random starfield
 * Creates stars with random positions, brightness, and size
 */
function generateStarfield() {
  starfieldStars.length = 0;

  const totalStars = SETTINGS.star_density || 300; // Lower default density
  const W = starfieldCanvas.width;
  const H = starfieldCanvas.height;

  // Generate stars with smaller size in screen coordinates
  for (let i = 0; i < totalStars; i++) {
    // Assign depth layer for parallax (0.3 near, 0.6 mid, 1.0 far)
    const layerRand = Math.random();
    const depth = layerRand < 0.33 ? 0.3 : layerRand < 0.66 ? 0.6 : 1.0;
    starfieldStars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      b: Math.random() * 0.8 + 0.2, // Brightness: 0.2 to 1.0
      s: Math.random() * 1.0 + 0.5, // Size: 0.5 to 1.5 (smaller)
      twinkle: Math.random() * Math.PI * 2, // Random twinkle phase
      d: depth,
    });
  }

  starfieldDirty = true;
  drawStarfield();
}

// --- When the starfield actually needs repainting ----------------------------
//
// It lives on its own canvas, so whatever it painted last frame is still on
// screen. Repainting it is not free: every star is offset for parallax, tested
// against every active ripple, and tested against every black hole, neutron
// star and white dwarf for lensing. At three hundred stars and a dozen compact
// objects that is thousands of distance checks, and profiling put it at 2-10ms
// per frame, consistently more than drawing the simulation itself.
//
// Almost none of that changes between one frame and the next. What does:
//   - the view moves (pan or zoom)
//   - a gravitational-wave ripple is expanding
//   - a lensing object has moved
//   - the twinkle phase advances
//
// The first three are detected; the last is an amplitude-0.1 sine that nobody
// can see stepping at 20Hz. So the starfield repaints when the view changes,
// at 30Hz while something on it is genuinely moving, and at 20Hz otherwise.
let starfieldDirty = true;
let lastStarPaint = 0;
let lastStarPan = { x: 0, y: 0 };
let lastStarZoom = 0;

const STAR_DYNAMIC_MS = 1000 / 30;
const STAR_TWINKLE_MS = 1000 / 20;

/** Does anything on the starfield move by itself right now? */
function starfieldHasMotion() {
  if (SETTINGS.show_gravitational_waves && gravity_ripples.length) return true;
  if (SETTINGS.show_object_lensing === false) return false;
  if (SETTINGS.lensing_quality === 'off') return false;
  return (
    bh_list.length > 0 || neutron_stars.length > 0 || white_dwarfs.length > 0
  );
}

/**
 * Repaint the starfield if it is worth repainting.
 * @param {number} now - Frame timestamp
 */
function tickStarfield(now) {
  const moved =
    state.pan.x !== lastStarPan.x ||
    state.pan.y !== lastStarPan.y ||
    state.zoom !== lastStarZoom;

  if (!starfieldDirty && !moved) {
    const interval = starfieldHasMotion() ? STAR_DYNAMIC_MS : STAR_TWINKLE_MS;
    if (now - lastStarPaint < interval) return;
  }

  lastStarPan = { x: state.pan.x, y: state.pan.y };
  lastStarZoom = state.zoom;
  lastStarPaint = now;
  starfieldDirty = false;
  if (perf.enabled) perf.starPaints++;
  drawStarfield();
}

function drawStarfield() {
  const W = starfieldCanvas.width;
  const H = starfieldCanvas.height;

  // Clear the starfield canvas
  starCtx.setTransform(1, 0, 0, 1, 0, 0);
  starCtx.clearRect(0, 0, W, H);

  // Draw background gradient
  starCtx.fillStyle = SETTINGS.show_ambient_lighting
    ? createAmbientGradient()
    : readToken('--space-far') || '#05060d';
  starCtx.fillRect(0, 0, W, H);

  const c = 0.18; // Speed of light in world units per ms (tweak for simulation scale)
  // --- Gravitational wave ripples (placeholder effect) ---
  // (Removed: drawing of visible colored ripple arcs. Only lensing effect remains.)
  if (SETTINGS.show_gravitational_waves) {
    const now = performance.now();
    const FADE_OUT_MS = 1000; // 1 second fade-out
    for (let i = gravity_ripples.length - 1; i >= 0; i--) {
      const ripple = gravity_ripples[i];
      const age = now - ripple.created;
      const fadeStart = ripple.duration;
      // Keep ripple alive longer for 3D view propagation (up to 15s)
      // The 2D view stops rendering it after fadeEnd via the check at line 151.
      if (age > 15000) {
        gravity_ripples.splice(i, 1);
        continue;
      }
      // Compute fade factor for lensing
      let fade = 1.0;
      if (age > fadeStart) {
        fade = 1.0 - (age - fadeStart) / FADE_OUT_MS;
      }
      // The fade factor can be used in the lensing code below
      ripple._fade = fade; // Store for use in starfieldStars.forEach
    }
  }

  // Draw stars with parallax (slight offset vs. pan for depth illusion)
  const time = Date.now() * 0.001; // Current time for twinkling

  starfieldStars.forEach(st => {
    const parallax = st.d || 1.0;
    let sx = st.x - state.pan.x * 0.02 * parallax;
    let sy = st.y - state.pan.y * 0.02 * parallax;
    // Apply lensing distortion if within any active ripple
    if (SETTINGS.show_gravitational_waves) {
      for (let i = 0; i < gravity_ripples.length; i++) {
        const ripple = gravity_ripples[i];
        const now = performance.now();
        const age = now - ripple.created;
        if (age > ripple.duration + 1000) continue; // Only skip after fade-out
        // Amplitude and wavelength scale with merger mass
        const mass = ripple.mass || 1.0;
        const gw_strength =
          ripple.gw_strength !== undefined ? ripple.gw_strength : 1.0;

        // Enhanced effects for different merger types
        let amplitude, wavelength;
        if (ripple.kilonova) {
          // Kilonova creates moderate gravitational wave effects (reduced)
          amplitude =
            (10 + 12 * Math.log10(mass + 1)) *
            (ripple._fade !== undefined ? ripple._fade : 1.0) *
            gw_strength *
            1.2;
          wavelength = 80 + 40 * Math.log10(mass + 1);
        } else if (ripple.nswd_merger) {
          // Neutron star-white dwarf merger effects
          amplitude =
            (12 + 15 * Math.log10(mass + 1)) *
            (ripple._fade !== undefined ? ripple._fade : 1.0) *
            gw_strength *
            1.5;
          wavelength = 100 + 50 * Math.log10(mass + 1);
        } else if (ripple.wdwd_merger) {
          // White dwarf-white dwarf merger effects
          amplitude =
            (6 + 8 * Math.log10(mass + 1)) *
            (ripple._fade !== undefined ? ripple._fade : 1.0) *
            gw_strength *
            1.2;
          wavelength = 60 + 30 * Math.log10(mass + 1);
        } else {
          // Regular gravitational wave effects
          amplitude =
            (8 + 10 * Math.log10(mass + 1)) *
            (ripple._fade !== undefined ? ripple._fade : 1.0) *
            gw_strength;
          wavelength = 80 + 40 * Math.log10(mass + 1);
        }
        // Convert ripple center to screen
        const screen = world_to_screen({ x: ripple.x, y: ripple.y });
        const radius = c * age * state.zoom;
        const progress = age / ripple.duration;
        const limit = radius + 1.5 * wavelength;

        const dx = sx - screen.x;
        if (Math.abs(dx) > limit) continue; // Optimization: Bounding box check

        const dy = sy - screen.y;
        if (Math.abs(dy) > limit) continue; // Optimization: Bounding box check

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < limit && dist > 8) {
          // Sine-based lensing: offset outward, modulated by ripple
          const phase = (dist - radius) / wavelength;
          const local_amp = amplitude * Math.exp(-Math.abs(phase));
          const factor =
            local_amp * Math.sin(phase * Math.PI * 2 - progress * Math.PI * 2);

          // Enhanced distortion for different merger types
          if (ripple.kilonova) {
            // Add moderate chaotic distortion for kilonova (reduced)
            const chaos_factor = Math.sin(progress * Math.PI * 3) * 0.15;
            const enhanced_factor = factor * (1 + chaos_factor);
            sx += (dx / dist) * enhanced_factor;
            sy += (dy / dist) * enhanced_factor;
          } else if (ripple.nswd_merger) {
            // Add moderate chaotic distortion for NS-WD merger
            const chaos_factor = Math.sin(progress * Math.PI * 3) * 0.2;
            const enhanced_factor = factor * (1 + chaos_factor);
            sx += (dx / dist) * enhanced_factor;
            sy += (dy / dist) * enhanced_factor;
          } else if (ripple.wdwd_merger) {
            // Add subtle chaotic distortion for WD-WD merger
            const chaos_factor = Math.sin(progress * Math.PI * 2) * 0.1;
            const enhanced_factor = factor * (1 + chaos_factor);
            sx += (dx / dist) * enhanced_factor;
            sy += (dy / dist) * enhanced_factor;
          } else {
            sx += (dx / dist) * factor;
            sy += (dy / dist) * factor;
          }
        }
      }
    }
    // Gravitational lensing by compact objects (BH, NS, WD)
    let max_lens_strength = 0;
    let lens_dx = 0,
      lens_dy = 0;
    let lens_blur = 0;
    let lens_color = '#fff';
    // Helper to check and apply lensing for a given object
    function checkLensing(obj, strength, radius, blur, color) {
      const screen = world_to_screen(obj.pos);
      const dx = sx - screen.x;
      if (Math.abs(dx) > radius) return;
      const dy = sy - screen.y;
      if (Math.abs(dy) > radius) return;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        // Real light deflection falls off as 1/b (the Einstein angle), not
        // linearly. Using the physical profile puts a tight, bright ring of
        // distortion near the horizon and a long faint tail beyond it, which
        // is what makes the effect read as lensing rather than as a smudge.
        const core = Math.max(radius * 0.12, 1e-6);
        const b = Math.max(dist, core);
        const deflection = (strength * radius * core) / b;
        // Taper to zero at the edge so the distortion has no visible seam.
        const edge = 1 - dist / radius;
        const lens = deflection * edge * edge;
        if (lens > max_lens_strength) {
          max_lens_strength = lens;
          lens_dx = (dx / (dist + 1e-6)) * lens;
          lens_dy = (dy / (dist + 1e-6)) * lens;
          lens_blur = blur * edge;
          lens_color = color;
        }
      }
    }
    // Black holes
    const enableObjectLensing =
      SETTINGS.show_object_lensing !== false &&
      SETTINGS.lensing_quality !== 'off';
    if (enableObjectLensing) {
      const quality = SETTINGS.lensing_quality || 'medium';
      const qScale = quality === 'high' ? 1.6 : quality === 'low' ? 0.7 : 1;
      for (const bh of bh_list) {
        // Einstein radius grows as sqrt(M), so a supermassive hole bends a much
        // wider patch of sky than a stellar-mass one.
        const massScale = Math.sqrt(Math.max(0.2, bh.mass / 10000));
        const lens_radius = Math.max(
          24,
          bh.radius * state.zoom * 3.2 * massScale * qScale
        );
        checkLensing(bh, 3.0 * qScale, lens_radius, 2.5, '#fff');
      }
      // Neutron stars (stronger, blue tint)
      for (const ns of neutron_stars) {
        // Lensing starts close to the surface, but is more visible
        const ns_lens_radius = Math.max(18, 1.5 * ns.radius * state.zoom);
        checkLensing(ns, 1.3, ns_lens_radius, 2.8, '#6cf');
      }
      // White dwarfs (stronger, pale blue-white tint)
      for (const wd of white_dwarfs) {
        // Lensing starts close to the surface, but is visible
        const wd_lens_radius = Math.max(16, 1.3 * wd.radius * state.zoom);
        checkLensing(wd, 0.9, wd_lens_radius, 2.0, '#e0f7ff');
      }
    }
    if (max_lens_strength > 0) {
      sx += lens_dx;
      sy += lens_dy;
      // Add a blur/glow to the lensed star for extra visibility
      starCtx.save();
      starCtx.shadowColor = lens_color;
      starCtx.shadowBlur = 6 * lens_blur;
    }
    // Add subtle twinkling effect
    const twinkle = Math.sin(time * 2 + st.twinkle) * 0.1 + 0.9;
    const brightness = st.b * twinkle;
    starCtx.globalAlpha = brightness;
    starCtx.fillStyle = '#fff';
    starCtx.fillRect(sx, sy, st.s, st.s);
    if (max_lens_strength > 0) {
      starCtx.restore();
    }
  });

  starCtx.globalAlpha = 1;
}

// Remove all lensing-related functions and variables below this point.
// Only keep starfield rendering, generation, and unrelated rendering logic.

// Original drawScene function from index.html
const drawScene = () => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(
    canvas.width / 2 + state.pan.x,
    canvas.height / 2 + state.pan.y
  );
  ctx.scale(state.zoom, -state.zoom);

  /**
   * Brightness reference for a trail, in the object's own speed units.
   *
   * Trail brightness used to be scaled against a hard-coded 50 sim-units/time,
   * which silently deleted the trail of anything slower. A two-solar-mass binary
   * four AU apart orbits at 1.58 units/time, giving every one of its points an
   * intensity of 0.032 against a draw threshold of 0.05: the trail was computed,
   * aged and stored, and then skipped on every frame. Scenarios whose entire
   * subject is an orbit drew two dots and nothing else.
   *
   * Scaling against the fastest point in the object's own trail keeps what the
   * cue was for - periapsis brighter than apoapsis - while making it scale-free,
   * so a slow binary and a black-hole inspiral both read. The floor stops a
   * near-circular orbit, where every point is the same speed, from sitting at
   * the bottom of the ramp.
   *
   * @param {Array<{velocity: number}>} trail - The object's trail points
   * @returns {number} Speed to treat as full brightness, never zero
   */
  function trailSpeedScale(trail) {
    let peak = 0;
    for (let i = 0; i < trail.length; i++) {
      if (trail[i].velocity > peak) peak = trail[i].velocity;
    }
    return peak > 0 ? peak : 1;
  }

  // Slowest a trail point is ever drawn at, as a fraction of full brightness.
  // A circular orbit has no speed variation to show, so without a floor it would
  // render at whatever the ramp's bottom happens to be.
  const TRAIL_MIN_INTENSITY = 0.45;

  if (SETTINGS.show_trails) {
    [
      ...planets,
      ...gas_giants,
      ...asteroids,
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
    ].forEach(obj => {
      if (obj.alive && obj.trail.length > 1) {
        const baseColor =
          obj.baseColor ||
          SETTINGS[`${obj.obj_type.toLowerCase()}_base_color`] ||
          '#6495ed';
        // trail_colour_mode 'speed' maps each trail point's recorded velocity
        // onto a perceptual ramp, which makes an eccentric orbit read at a
        // glance: bright and hot at periapsis, cool and dim at apoapsis.
        const bySpeed = SETTINGS.trail_colour_mode === 'speed';
        const rgb = bySpeed
          ? speedTrailColor(Math.hypot(obj.vel.x, obj.vel.y))
          : hexToRgb(baseColor);
        // Relative to this object's own motion, so slow orbits still draw.
        const speedScale = trailSpeedScale(obj.trail);

        if (SETTINGS.trail_style === 'Cloud') {
          // Draw cloud-like trail with multiple passes
          for (let pass = 0; pass < 3; pass++) {
            const velocityScale = Math.max(
              0.6,
              Math.min(1.8, obj.trail[0].velocity / speedScale)
            );
            const trailWidth =
              ((2.5 - pass * 0.5) * velocityScale) / state.zoom;
            const maxAlpha = (0.6 - pass * 0.15) * velocityScale;

            ctx.lineWidth = trailWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${maxAlpha})`;
            ctx.beginPath();

            // Draw trail with smooth curves and fade-out (use world coordinates directly)
            ctx.moveTo(obj.trail[0].x, obj.trail[0].y);

            for (let i = 1; i < obj.trail.length; i++) {
              const age_factor = 1 - obj.trail[i].age / SETTINGS.trail_length;
              const velocity_factor = Math.max(
                TRAIL_MIN_INTENSITY,
                Math.min(1, obj.trail[i].velocity / speedScale)
              );
              const alpha = age_factor * velocity_factor * maxAlpha;

              ctx.globalAlpha = alpha;

              // Use quadratic curves for smoother trails
              if (i < obj.trail.length - 1) {
                const cp_x = (obj.trail[i].x + obj.trail[i + 1].x) / 2;
                const cp_y = (obj.trail[i].y + obj.trail[i + 1].y) / 2;
                ctx.quadraticCurveTo(
                  obj.trail[i].x,
                  obj.trail[i].y,
                  cp_x,
                  cp_y
                );
              } else {
                ctx.lineTo(obj.trail[i].x, obj.trail[i].y);
              }
            }
            ctx.stroke();
          }

          // Draw bright core trail
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
          ctx.lineWidth =
            Math.max(0.8, obj.trail[0].velocity / 120) / state.zoom;
          ctx.lineCap = 'round';
          ctx.beginPath();

          ctx.moveTo(obj.trail[0].x, obj.trail[0].y);

          for (let i = 1; i < obj.trail.length; i++) {
            const age_factor = 1 - obj.trail[i].age / SETTINGS.trail_length;
            ctx.globalAlpha = age_factor * 0.9;
            ctx.lineTo(obj.trail[i].x, obj.trail[i].y);
          }
          ctx.stroke();
        } else if (SETTINGS.trail_style === 'Glow') {
          // Draw glowing trail from a cached sprite. The gradient's shape is
          // identical for every point - only colour, alpha and radius vary - so
          // building it per point was pure waste. globalAlpha reproduces the
          // old per-stop alphas exactly (sprite bakes 0.8/0.3/0, multiplied by
          // intensity here).
          const sprite = getGlowSprite(rgb.r, rgb.g, rgb.b);
          const prevAlpha = ctx.globalAlpha;
          for (let i = 0; i < obj.trail.length; i++) {
            const age_factor = 1 - obj.trail[i].age / SETTINGS.trail_length;
            const velocity_factor = Math.max(
              TRAIL_MIN_INTENSITY,
              Math.min(1, obj.trail[i].velocity / speedScale)
            );
            const intensity = age_factor * velocity_factor;

            if (intensity > 0.05) {
              const radius = (3 + intensity * 7) / state.zoom;
              ctx.globalAlpha = intensity;
              ctx.drawImage(
                sprite,
                obj.trail[i].x - radius,
                obj.trail[i].y - radius,
                radius * 2,
                radius * 2
              );
            }
          }
          ctx.globalAlpha = prevAlpha;
        } else {
          // Simple style
          // Draw simple trail with fade-out
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
          ctx.lineWidth = 1.5 / state.zoom;
          ctx.lineCap = 'round';
          ctx.beginPath();

          ctx.moveTo(obj.trail[0].x, obj.trail[0].y);

          for (let i = 1; i < obj.trail.length; i++) {
            const age_factor = 1 - obj.trail[i].age / SETTINGS.trail_length;
            ctx.globalAlpha = age_factor * 0.8;
            ctx.lineTo(obj.trail[i].x, obj.trail[i].y);
          }
          ctx.stroke();
        }
      }
    });
    ctx.globalAlpha = 1;
  }

  // Render aim line for drag preview
  const preview = getDragPreview && getDragPreview();
  if (preview) {
    renderAimLine(preview);
  }

  [
    ...debris,
    ...asteroids,
    ...planets,
    ...gas_giants,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
  ].forEach(obj => {
    if (obj.alive) obj.draw(ctx);
  });

  // Draw habitable zones for stars that have the ring switched on.
  //
  // Every number comes from js/habitability.js, which the lesson instruments
  // read too. This block used to carry its own physics: 1 AU = 160 units (the
  // scenarios use 100), luminosity from mass as M^3.5 with a floor of
  // 0.01 L_sun (TRAPPIST-1 is 0.000553), and an "optimism" slider that widened
  // an arbitrary band around 1 AU. The ring was in the wrong place and,
  // for a red dwarf, wrong by a factor of several.
  const hzModel = habitableZoneModelFromSettings(SETTINGS);

  stars.forEach(star => {
    if (!star.alive || !star.showHabitableZone) return;

    const props = stellarPropertiesFor(star, SOLAR_MASS_UNIT);
    const bounds = habitableZoneBounds(props, hzModel);
    if (!isFinite(bounds.innerAU) || !isFinite(bounds.outerAU)) return;

    const innerR = auToSim(bounds.innerAU);
    const outerR = auToSim(bounds.outerAU);
    if (!isFinite(innerR) || !isFinite(outerR) || outerR <= innerR) return;

    ctx.save();

    // Soft fill between the edges
    ctx.fillStyle = 'rgba(80, 220, 160, 0.08)';
    ctx.beginPath();
    ctx.arc(star.pos.x, star.pos.y, outerR, 0, 2 * Math.PI);
    ctx.arc(star.pos.x, star.pos.y, innerR, 0, 2 * Math.PI, true);
    ctx.closePath();
    ctx.fill();

    // The two edges are drawn with different dash patterns as well as
    // different colors, so which is which does not depend on seeing color.
    ctx.lineWidth = 1.5 / state.zoom;
    ctx.setLineDash([10 / state.zoom, 6 / state.zoom]);
    ctx.strokeStyle = 'rgba(255, 180, 120, 0.9)';
    ctx.beginPath();
    ctx.arc(star.pos.x, star.pos.y, innerR, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.setLineDash([3 / state.zoom, 5 / state.zoom]);
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(star.pos.x, star.pos.y, outerR, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();

    // Screen-space labels. The band is named, and each edge is named, so the
    // ring is not a green region whose meaning has to be guessed.
    try {
      const label = (worldR, text, color, align) => {
        const p = world_to_screen({ x: star.pos.x, y: star.pos.y + worldR });
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.fillText(text, p.x, p.y);
      };
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (outerR * state.zoom > 30) {
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        // Below 2600 K the published polynomial is evaluated at its own
        // lower limit rather than extrapolated, which is a modeling choice
        // and not a measurement. The ring says so for the red dwarfs where
        // it applies, rather than quoting a clamped fit as fact.
        const bandName =
          hzModel === 'optimistic'
            ? 'Habitable zone (optimistic)'
            : 'Habitable zone (conservative)';
        label(
          (innerR + outerR) / 2,
          bounds.extrapolated
            ? `${bandName} · star cooler than the model covers`
            : bandName,
          'rgba(180, 255, 210, 0.95)',
          'center'
        );
        // Edge labels only once there is room for them to not collide.
        if ((outerR - innerR) * state.zoom > 46) {
          ctx.font = '10px Inter, system-ui, sans-serif';
          label(
            innerR,
            bounds.innerLabel,
            'rgba(255, 200, 150, 0.9)',
            'center'
          );
          label(
            outerR,
            bounds.outerLabel,
            'rgba(160, 215, 255, 0.9)',
            'center'
          );
        }
      }
      ctx.restore();
    } catch {
      // non-fatal; labels are cosmetic
    }
  });

  particles.forEach(p => p.draw(ctx));

  // Draw accretion disk particles (they are drawn by black holes but also independently for cleanup)
  accretion_disk_particles.forEach(ap => {
    if (ap.alive) ap.draw(ctx);
  });

  // Draw gravity ripples (behind black holes)

  ctx.globalAlpha = 1;

  bh_list.forEach(bh => bh.draw(ctx));

  // Draw enhanced hover effect for clickable objects - draw in world coordinates since canvas is already transformed
  if (!state.inspector_open && state.user_has_interacted) {
    const worldPos = screen_to_world(state.mouse);
    const hoveredObject = findObjectAtPosition(worldPos);
    if (hoveredObject) {
      // Draw enhanced circle in world coordinates (canvas is already transformed)
      const obj_pos = hoveredObject.object.pos;
      const baseRadius = hoveredObject.object.radius;
      const hoverRadius = baseRadius + 12 / state.zoom;

      // Create pulsing animation
      const pulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.7;
      const pulseRadius = hoverRadius + (pulse * 8) / state.zoom;

      // Outer glow ring with pulsing effect
      ctx.shadowColor = '#00aaff';
      ctx.shadowBlur = 20 / state.zoom;
      ctx.strokeStyle = `rgba(0, 170, 255, ${0.6 + pulse * 0.2})`;
      ctx.lineWidth = 4 / state.zoom;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(obj_pos.x, obj_pos.y, pulseRadius, 0, 2 * Math.PI);
      ctx.stroke();

      // Inner solid ring
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 3 / state.zoom;
      ctx.beginPath();
      ctx.arc(obj_pos.x, obj_pos.y, hoverRadius, 0, 2 * Math.PI);
      ctx.stroke();

      // Dashed inner ring for extra definition
      ctx.strokeStyle = 'rgba(0, 170, 255, 0.8)';
      ctx.lineWidth = 2 / state.zoom;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.arc(
        obj_pos.x,
        obj_pos.y,
        hoverRadius - 3 / state.zoom,
        0,
        2 * Math.PI
      );
      ctx.stroke();
      ctx.setLineDash([]);

      // Add sparkle effect for very bright objects
      if (
        hoveredObject.type === 'Star' ||
        hoveredObject.type === 'NeutronStar' ||
        hoveredObject.type === 'WhiteDwarf'
      ) {
        const sparkleTime = Date.now() * 0.01;
        const sparkleCount = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1 / state.zoom;

        for (let i = 0; i < sparkleCount; i++) {
          const angle =
            (sparkleTime + (i * Math.PI * 2) / sparkleCount) % (Math.PI * 2);
          const sparkleRadius = hoverRadius + 15 / state.zoom;
          const sparkleX = obj_pos.x + Math.cos(angle) * sparkleRadius;
          const sparkleY = obj_pos.y + Math.sin(angle) * sparkleRadius;

          ctx.beginPath();
          ctx.moveTo(sparkleX - 3 / state.zoom, sparkleY);
          ctx.lineTo(sparkleX + 3 / state.zoom, sparkleY);
          ctx.moveTo(sparkleX, sparkleY - 3 / state.zoom);
          ctx.lineTo(sparkleX, sparkleY + 3 / state.zoom);
          ctx.stroke();
        }
      }
    }
  }

  // Hover tooltip removed per request

  ctx.restore();

  // Render orbit preview as dashed screen-space path (green if bound, red if unbound)
  try {
    const orbitPreview = getOrbitPreview && getOrbitPreview();
    if (orbitPreview) {
      renderOrbitPreview(orbitPreview);
    }
  } catch {
    // ignore preview rendering errors
  }

  // If inspector orbit overlay is active, draw it as a blue dashed loop
  // Skip when area sweep is active to avoid visual overlap
  if (
    state.inspectorOrbitOverlay &&
    state.inspectorOrbitOverlay.active &&
    !(state.areaSweepOverlay && state.areaSweepOverlay.active)
  ) {
    const pts = state.inspectorOrbitOverlay.points || [];
    if (pts.length > 1) {
      ctx.save();
      ctx.setLineDash([12, 8]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(90, 160, 255, 0.95)';
      ctx.beginPath();
      const p0 = world_to_screen(pts[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < pts.length; i++) {
        const ps = world_to_screen(pts[i]);
        ctx.lineTo(ps.x, ps.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Label for inspector stable orbit
      let top = null;
      for (let i = 0; i < pts.length; i++) {
        const s = world_to_screen(pts[i]);
        if (!top || s.y < top.y) top = s;
      }
      if (top) {
        ctx.save();
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = 'rgba(90, 160, 255, 0.95)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        ctx.fillText('Stable Orbit', top.x, top.y - 8);
        ctx.restore();
      }
    }
  }

  // Kepler's 2nd Law area sweep overlay. Checked here rather than on a timer
  // so a stale overlay is never drawn even once.
  if (state.areaSweepOverlay && state.areaSweepOverlay.active) {
    checkAreaSweepValidity();
  }
  if (state.areaSweepOverlay && state.areaSweepOverlay.active) {
    const sweep = state.areaSweepOverlay;
    const sweepParent = sweep.parent;
    if (sweepParent && sweepParent.alive) {
      const WEDGE_COLORS = [
        'rgba(255, 107, 107, 0.28)',
        'rgba(78, 205, 196, 0.28)',
        'rgba(255, 195, 0, 0.28)',
        'rgba(107, 137, 255, 0.28)',
        'rgba(255, 159, 243, 0.28)',
        'rgba(0, 206, 158, 0.28)',
        'rgba(255, 159, 67, 0.28)',
        'rgba(165, 94, 234, 0.28)',
      ];
      const WEDGE_BORDER_COLORS = [
        'rgba(255, 107, 107, 0.7)',
        'rgba(78, 205, 196, 0.7)',
        'rgba(255, 195, 0, 0.7)',
        'rgba(107, 137, 255, 0.7)',
        'rgba(255, 159, 243, 0.7)',
        'rgba(0, 206, 158, 0.7)',
        'rgba(255, 159, 67, 0.7)',
        'rgba(165, 94, 234, 0.7)',
      ];
      const px = sweepParent.pos.x;
      const py = sweepParent.pos.y;
      const starScreen = world_to_screen({ x: px, y: py });
      const stride = 3;

      // Each wedge's area, and where to write it. The areas are equal to well
      // under a percent, but they do not look equal: a short fat wedge near the
      // star and a long thin one near apoapsis read as very different sizes to
      // the eye, which judges partly by linear extent. Printing the number on
      // each one turns "trust me" into something the student can check, which
      // is the whole point of the figure.
      const wedgeAreas = [];
      const wedgeLabelAt = [];
      for (let w = 0; w < sweep.wedges.length; w++) {
        const wedge = sweep.wedges[w];
        if (wedge.length < 2) {
          wedgeAreas.push(0);
          wedgeLabelAt.push(null);
          continue;
        }
        let twice = 0;
        let cx = 0;
        let cy = 0;
        for (let k = 0; k < wedge.length - 1; k++) {
          const a = wedge[k];
          const b = wedge[k + 1];
          const cross = a.x * b.y - b.x * a.y;
          twice += cross;
          cx += (a.x + b.x) * cross;
          cy += (a.y + b.y) * cross;
        }
        const area = Math.abs(twice) / 2;
        wedgeAreas.push(area);
        // Centroid of the swept sector, pulled toward the star so the label
        // sits inside the coloured region rather than out on the arc.
        wedgeLabelAt.push(
          twice !== 0
            ? { x: (cx / (3 * twice)) * 0.82, y: (cy / (3 * twice)) * 0.82 }
            : null
        );
      }

      for (let w = 0; w < sweep.wedges.length; w++) {
        const wedge = sweep.wedges[w];
        if (wedge.length < 2) continue;
        ctx.save();
        ctx.fillStyle = WEDGE_COLORS[w % WEDGE_COLORS.length];
        ctx.beginPath();
        ctx.moveTo(starScreen.x, starScreen.y);
        for (let k = 0; k < wedge.length; k += stride) {
          const s = world_to_screen({ x: px + wedge[k].x, y: py + wedge[k].y });
          ctx.lineTo(s.x, s.y);
        }
        const last = wedge[wedge.length - 1];
        const sLast = world_to_screen({ x: px + last.x, y: py + last.y });
        ctx.lineTo(sLast.x, sLast.y);
        ctx.lineTo(starScreen.x, starScreen.y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Area labels, drawn after every fill so no wedge paints over a label.
      if (state.zoom > 0.35) {
        const total = wedgeAreas.reduce((a, b) => a + b, 0);
        ctx.save();
        ctx.font =
          '600 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        for (let w = 0; w < wedgeLabelAt.length; w++) {
          const at = wedgeLabelAt[w];
          if (!at || !total) continue;
          const s = world_to_screen({ x: px + at.x, y: py + at.y });
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.fillText(
            `${((wedgeAreas[w] / total) * 100).toFixed(1)}%`,
            s.x,
            s.y
          );
        }
        ctx.restore();
      }

      if (sweep.orbitPoints.length > 1) {
        ctx.save();
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(200, 200, 255, 0.6)';
        ctx.beginPath();
        const op0 = world_to_screen({
          x: px + sweep.orbitPoints[0].x,
          y: py + sweep.orbitPoints[0].y,
        });
        ctx.moveTo(op0.x, op0.y);
        const orbitStride = Math.max(
          1,
          Math.floor(sweep.orbitPoints.length / 400)
        );
        for (
          let i = orbitStride;
          i < sweep.orbitPoints.length;
          i += orbitStride
        ) {
          const s = world_to_screen({
            x: px + sweep.orbitPoints[i].x,
            y: py + sweep.orbitPoints[i].y,
          });
          ctx.lineTo(s.x, s.y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      ctx.save();
      ctx.lineWidth = 1.5;
      for (let w = 0; w < sweep.wedges.length; w++) {
        const wedge = sweep.wedges[w];
        if (wedge.length === 0) continue;
        const first = wedge[0];
        const sf = world_to_screen({ x: px + first.x, y: py + first.y });
        ctx.strokeStyle = WEDGE_BORDER_COLORS[w % WEDGE_BORDER_COLORS.length];
        ctx.beginPath();
        ctx.moveTo(starScreen.x, starScreen.y);
        ctx.lineTo(sf.x, sf.y);
        ctx.stroke();
      }
      const lastW = sweep.wedges[sweep.wedges.length - 1];
      if (lastW && lastW.length > 0) {
        const lastPt = lastW[lastW.length - 1];
        const sl = world_to_screen({ x: px + lastPt.x, y: py + lastPt.y });
        ctx.strokeStyle = WEDGE_BORDER_COLORS[0];
        ctx.beginPath();
        ctx.moveTo(starScreen.x, starScreen.y);
        ctx.lineTo(sl.x, sl.y);
        ctx.stroke();
      }
      ctx.restore();

      let sweepTop = null;
      const labelStride = Math.max(
        1,
        Math.floor(sweep.orbitPoints.length / 200)
      );
      for (let i = 0; i < sweep.orbitPoints.length; i += labelStride) {
        const s = world_to_screen({
          x: px + sweep.orbitPoints[i].x,
          y: py + sweep.orbitPoints[i].y,
        });
        if (!sweepTop || s.y < sweepTop.y) sweepTop = s;
      }
      if (sweepTop) {
        ctx.save();
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = 'rgba(200, 200, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(
          "Kepler's 2nd Law: Equal Areas",
          sweepTop.x,
          sweepTop.y - 10
        );
        ctx.restore();
      }
    }
  }

  if (state.adding_mass) {
    // Draw drag line
    ctx.strokeStyle = 'lime';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(state.add_start_screen.x, state.add_start_screen.y);
    ctx.lineTo(state.mouse.x, state.mouse.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw start point
    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(
      state.add_start_screen.x,
      state.add_start_screen.y,
      8,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // Draw end point
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(state.mouse.x, state.mouse.y, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Draw velocity arrow
    const dx = state.mouse.x - state.add_start_screen.x;
    const dy = state.mouse.y - state.add_start_screen.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 20) {
      const angle = Math.atan2(dy, dx);
      const arrowLength = 20;
      const arrowAngle = Math.PI / 6;

      ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(state.mouse.x, state.mouse.y);
      ctx.lineTo(
        state.mouse.x - arrowLength * Math.cos(angle - arrowAngle),
        state.mouse.y - arrowLength * Math.sin(angle - arrowAngle)
      );
      ctx.moveTo(state.mouse.x, state.mouse.y);
      ctx.lineTo(
        state.mouse.x - arrowLength * Math.cos(angle + arrowAngle),
        state.mouse.y - arrowLength * Math.sin(angle + arrowAngle)
      );
      ctx.stroke();
    }
    // Removed orbit helper dashed preview path per request
  }

  if (SETTINGS.show_dynamic_overlays) {
    const lines = [
      `<span class="category-label">Planets:</span> ${planets.length} | <span class="category-label">Gas Giants:</span> ${gas_giants.length} | <span class="category-label">Asteroids:</span> ${asteroids.length}`,
      `<span class="category-label">Stars:</span> ${stars.length} | <span class="category-label">Neutron Stars:</span> ${neutron_stars.length} | <span class="category-label">White Dwarfs:</span> ${white_dwarfs.length}`,
      `<span class="category-label">Black Holes:</span> ${bh_list.length} | <span class="category-label">Particles:</span> ${particles.length} | <span class="category-label">Debris:</span> ${debris.length}`,
      `<div class="separator-line"></div>`,
      `<span class="important-stat"><span class="category-label">Zoom:</span> ${state.zoom.toFixed(2)}\u00d7<br/><span class="category-label">Sim Speed:</span> ${SETTINGS.sim_speed.toFixed(1)}\u00d7</span>`,
      `<span class="important-stat"><span class="category-label">Status:</span> ${state.paused ? 'Paused' : 'Running'}</span>`,
      `<div class="separator-line"></div>`,
      `🖱️ <span class="category-label">Controls:</span> Arrow Keys = Pan<br/>Scroll = Zoom<br/>Space = Pause/Resume`,
      `Click objects to inspect | ESC closes inspector`,
    ];
    overlayDiv.innerHTML = lines.join('<br>');
  } else {
    overlayDiv.innerHTML = '';
  }
};

// Render drag aim line based on simple two-body forward Euler integration
function renderAimLine(preview) {
  try {
    const primary = bh_list.length ? bh_list[0] : stars[0];
    if (!primary) return;
    const pos = { x: preview.position.x, y: preview.position.y };
    const vel = { x: preview.velocity.x, y: preview.velocity.y };
    const G = SETTINGS.gravitational_constant;
    const M = primary.mass;
    const dt = 0.01; // sim seconds
    const steps = 20;
    const soft2 = 1e-4;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.0 / state.zoom;
    ctx.setLineDash([6 / state.zoom, 6 / state.zoom]);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    for (let i = 0; i < steps; i++) {
      const dx = primary.pos.x - pos.x;
      const dy = primary.pos.y - pos.y;
      const r2 = dx * dx + dy * dy + soft2;
      const invR = 1 / Math.sqrt(r2);
      const a = (G * M) / r2;
      const ax = a * dx * invR;
      const ay = a * dy * invR;
      vel.x += ax * dt;
      vel.y += ay * dt;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      ctx.lineTo(pos.x, pos.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  } catch {
    // Ignore rendering preview errors
  }
}

// Render orbit preview using screen-space points and dashed line
function renderOrbitPreview(preview) {
  if (!preview || !Array.isArray(preview.points) || preview.points.length < 2)
    return;
  // Nondescript dashed line; turn blue when snapped to a stable orbit
  const color = preview.snapped
    ? 'rgba(90, 160, 255, 0.95)'
    : 'rgba(200, 200, 220, 0.9)';
  ctx.save();
  ctx.setLineDash([12, 8]);
  ctx.lineWidth = preview.snapped ? 3 : 2.5;
  ctx.strokeStyle = color;
  ctx.beginPath();
  const p0 = world_to_screen(preview.points[0]);
  ctx.moveTo(p0.x, p0.y);
  for (let i = 1; i < preview.points.length; i++) {
    const ps = world_to_screen(preview.points[i]);
    ctx.lineTo(ps.x, ps.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // If unsnapped and a collision was predicted, draw a red X at the collision point
  if (!preview.snapped && preview.collision && preview.collision.x != null) {
    const cs = world_to_screen({
      x: preview.collision.x,
      y: preview.collision.y,
    });
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.95)';
    ctx.lineWidth = 2.5;
    const size = 10; // pixels
    ctx.beginPath();
    ctx.moveTo(cs.x - size, cs.y - size);
    ctx.lineTo(cs.x + size, cs.y + size);
    ctx.moveTo(cs.x - size, cs.y + size);
    ctx.lineTo(cs.x + size, cs.y - size);
    ctx.stroke();
    ctx.restore();
  }

  // Label for stable orbit preview
  if (preview.snapped) {
    let top = null;
    for (let i = 0; i < preview.points.length; i++) {
      const s = world_to_screen(preview.points[i]);
      if (!top || s.y < top.y) top = s;
    }
    if (top) {
      ctx.save();
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = 'rgba(90, 160, 255, 0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      ctx.fillText('Stable Orbit', top.x, top.y - 8);
      ctx.restore();
    }
  }
}

// Performance monitoring
let frameCount = 0;
let lastPerformanceLog = 0;
let frameTimeSum = 0;
let adaptiveScale = 1;

/**
 * Per-phase frame timings, for development profiling.
 *
 * Off unless something sets `enabled`, so the cost in normal use is one boolean
 * test per phase per frame. It exists because "the starfield feels expensive"
 * is not a measurement: tools/perf-probe.mjs turns this on, runs a scenario and
 * reports where the frame budget actually goes, which is the only way to tell
 * whether a rendering change helped.
 */
export const perf = {
  enabled: false,
  frames: 0,
  starfield: 0,
  scene: 0,
  bloom: 0,
  // How many frames actually repainted each throttled layer. Time per frame is
  // the wrong measure for work that is skipped: on a machine slow enough that
  // every frame exceeds the repaint interval, nothing is ever skipped and the
  // saving looks like zero. The ratio of paints to frames is what the change
  // is really doing.
  starPaints: 0,
  bloomPaints: 0,
  reset() {
    this.frames = 0;
    this.starfield = 0;
    this.scene = 0;
    this.bloom = 0;
    this.starPaints = 0;
    this.bloomPaints = 0;
  },
};

/** Time one phase into the counters above. Free when profiling is off. */
function phase(bucket, fn) {
  if (!perf.enabled) return fn();
  const t = performance.now();
  const out = fn();
  perf[bucket] += performance.now() - t;
  return out;
}

// --- Idle rendering ----------------------------------------------------------
//
// A paused simulation is a still image, but the loop kept redrawing it sixty
// times a second: a tab left paused on a laptop held a core warm for nothing.
//
// It cannot simply stop, because plenty still changes while paused - panning,
// zooming, selecting, dragging an object into place, scrubbing the timeline.
// So rather than trying to enumerate every source of change and risking a
// frame that never arrives, any input at all opens a window of full-rate
// rendering. Outside that window, and only while paused, the scene redraws at
// 10Hz, which is invisible on a static picture.
const IDLE_REDRAW_MS = 100;
const INTERACTION_GRACE_MS = 700;
let interactionUntil = 0;
let lastIdleDraw = 0;

/** Render at full rate for a moment: something the user did may be animating. */
export function noteInteraction() {
  interactionUntil = performance.now() + INTERACTION_GRACE_MS;
}

if (typeof window !== 'undefined') {
  for (const ev of [
    'pointerdown',
    'pointermove',
    'wheel',
    'keydown',
    'touchmove',
  ]) {
    window.addEventListener(ev, noteInteraction, {
      passive: true,
      capture: true,
    });
  }
}

// Original gameLoop function from index.html
const gameLoop = timestamp => {
  const frameStart = performance.now();

  if (!state.last_time) state.last_time = timestamp;
  const dt_seconds = (timestamp - state.last_time) / 1000.0;
  state.last_time = timestamp;
  const dt_sim = Math.min(dt_seconds, 0.05) * SETTINGS.sim_speed * 50 * DT;
  // While scrubbing, tickTimeline holds the restored frame and physics is
  // skipped so the recorded state is what gets drawn.
  const mayIntegrate = tickTimeline(dt_sim);
  if (!state.paused && mayIntegrate) {
    // Symplectic Euler's error grows with the step, and it shows up first as a
    // slow change in eccentricity: an orbit that should be fixed visibly
    // reshapes over a minute or two. That is fine in a sandbox and fatal in a
    // lesson that asks students to measure a supposedly constant orbit, so a
    // scenario can cap the step it is integrated at and take several smaller
    // ones per frame instead.
    //
    // The ceiling is 64 rather than 16 because a tightly packed system needs a
    // genuinely small step: TRAPPIST-1's innermost planet has a year of a day
    // and a half, and at 16 substeps it was getting 225 steps per orbit, which
    // symplectic Euler turns into unbound orbits after a few hundred circuits.
    // Only scenarios that opt in pay for this, and those are small ones.
    const maxStep = SETTINGS.max_timestep || 0;
    if (maxStep > 0 && dt_sim > maxStep) {
      const n = Math.min(64, Math.ceil(dt_sim / maxStep));
      const sub = dt_sim / n;
      for (let i = 0; i < n; i++) updatePhysics(sub);
    } else {
      updatePhysics(dt_sim);
    }
  }

  // While paused and untouched, the picture cannot change; drop to 10Hz rather
  // than repainting an identical frame. tickTimeline above still runs, so a
  // scrub is never missed, and any input restores full rate immediately.
  const idle =
    state.paused &&
    frameStart > interactionUntil &&
    frameStart - lastIdleDraw < IDLE_REDRAW_MS;

  if (!idle) {
    lastIdleDraw = frameStart;
    // Draw star field first (background layer)
    phase('starfield', () => tickStarfield(timestamp));

    // Draw simulation objects (foreground layer)
    phase('scene', drawScene);
  }
  if (perf.enabled) perf.frames++;
  try {
    updateLightCurve(dt_sim);
    drawObserverIndicator(ctx, canvas.width, canvas.height);
  } catch {
    /* non-fatal */
  }
  updateSonification(timestamp);
  update3DScene(timestamp);

  // Composite the bloom layer additively, if anything drew into it. When
  // nothing did, the layer is already clear from the last frame that did, so
  // both the composite and the clear can be skipped outright.
  phase('bloom', () => {
    if (!bloomDirty) return;
    bloomDirty = false;
    if (perf.enabled) perf.bloomPaints++;
    try {
      if (
        bloomCanvas.width !== canvas.width ||
        bloomCanvas.height !== canvas.height
      ) {
        resizeBloomCanvas();
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(bloomCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      // Cleared here, which is what lets the next clean frame do nothing.
      bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
    } catch {
      // no-op
    }
  });

  // Performance monitoring
  const frameTime = performance.now() - frameStart;
  frameTimeSum += frameTime;
  frameCount++;

  // Log performance every 5 seconds
  if (timestamp - lastPerformanceLog > 5000) {
    const avgFrameTime = frameTimeSum / frameCount;
    if (avgFrameTime > 16.67) {
      // Only log if performance is poor
      debugLog(
        `Performance warning: Average frame time ${avgFrameTime.toFixed(1)}ms (target: 16.67ms for 60fps)`
      );
    }
    // Adaptive detail: adjust the render budget based on performance.
    // adaptiveScale is applied to the user's setting at read time - it must
    // never be written back into SETTINGS, or each pass would compound on the
    // last and the setting would run away instead of tracking frame time.
    if (SETTINGS.adaptive_detail) {
      const target = 1000 / (SETTINGS.target_fps || 60);
      if (avgFrameTime > target * 1.2) {
        adaptiveScale = Math.max(0.6, adaptiveScale * 0.9);
      } else if (avgFrameTime < target * 0.9) {
        adaptiveScale = Math.min(1, adaptiveScale * 1.05);
      }
      setDetailScale(adaptiveScale);
    } else if (adaptiveScale !== 1) {
      adaptiveScale = 1;
      setDetailScale(1);
    }
    frameTimeSum = 0;
    frameCount = 0;
    lastPerformanceLog = timestamp;
  }

  requestAnimationFrame(gameLoop);
};

// Original resizeCanvas function from index.html
function resizeCanvas() {
  // Never fall to zero: a 0x0 canvas makes every drawing and culling
  // calculation degenerate. Browsers can report 0 for a page that is not
  // being presented yet (background tab, hidden container).
  const W = Math.max(1, window.innerWidth || 0);
  const H = Math.max(1, window.innerHeight || 0);
  if (canvas.width === W && canvas.height === H) return;
  canvas.width = W;
  canvas.height = H; // sim layer
  starfieldCanvas.width = W;
  starfieldCanvas.height = H; // star layer
  generateStarfield(); // redraw background
}

// Dragging a window edge fires resize continuously, and each one reallocated
// three full-screen canvases and generated three hundred new stars. Coalescing
// into the next frame does that once per painted frame instead, and the early
// return above drops the ones where nothing actually changed.
let resizePending = false;
window.addEventListener('resize', () => {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    resizeCanvas();
  });
});

// The starfield is only repainted when it needs to be, so a theme switch has to
// mark it dirty rather than assume the next frame will pick the change up.
onThemeChange(() => {
  starfieldDirty = true;
  try {
    drawStarfield();
  } catch {
    /* canvas may not be ready during very early init */
  }
});

// Export functions
export { generateStarfield, drawStarfield, drawScene, gameLoop, resizeCanvas };
