// =============================================================================
// How the stars, their remnants and galaxies are painted
// -----------------------------------------------------------------------------
// The other drawers (planets to black holes) are in js/bodyDraw.js. Here: the
// star, neutron star, white dwarf, galaxy and accretion tracer, each
// the old draw(ctx) method with `this` passed as `o`, filed in the engine's
// table (registerBodyDrawers) on import; what every drawer shares (drawn radius,
// level of detail, lighting, bloom layer, visual clock); and the starfield model.
// =============================================================================

import { SOLAR_MASS_UNIT } from './constants.js';
import { formatNumber } from './format.js';
import { drawSolarLabel, hexToRgb, computeDynamicColor } from './utils.js';
import { mulberry32 } from './rng.js';
import { whiteDwarfColor } from './bodyEffects.js';
import {
  LOD,
  lodFor,
  lodAtLeast,
  dominantLight,
  starColor,
  paintStarDisc,
  spriteFor,
  drawnRadius,
  displayRadius,
  markerFloorPx,
  CROWD_SOFT_START,
} from './bodyVisuals.js';
import {
  state,
  stars,
  bh_list,
  liveBodyCount,
  physicsSettings,
  world_to_screen,
  getSimulationTime,
  registerBodyDrawers,
  currentTier,
  stellarPropertiesFor,
} from './physics.js';

// --- What every drawer shares -------------------------------------------------

// Halos and coronas draw where js/render.js says (it notes the glow); no one, no glow.
let bloomLayer = () => null;
const setBloomLayer = provider => {
  // A provider is a function or nothing: anything else would make the next
  // glow throw, and the draw sites' try/catch would swallow it into a glow that
  // silently never appears.
  bloomLayer = typeof provider === 'function' ? provider : () => null;
};

/**
 * The clock the black-hole drawing animates against.
 *
 * The simulated clock, so a paused world draws the same frame for as long as
 * it stays paused and two runs of one scenario draw the same picture at the
 * same time. It used to be Date.now(), which meant the flow kept turning while
 * the simulation was frozen and no two screenshots ever matched.
 *
 * Under reduced motion it returns a constant: the picture is complete and
 * legible, it simply does not move.
 *
 * @returns {number} Seconds
 */
const visualClockSeconds = () =>
  prefersReducedMotion() ? 0 : getSimulationTime();

/**
 * Radius to draw a body at, in world units.
 *
 * @param {Object} obj - Body with a model radius
 * @param {string} type - Which family, for the display policy
 * @returns {number} Radius to draw, never below a few screen pixels
 */
const drawRadius = (obj, type) =>
  // `stageRadius` is a presentation override: a lesson comparing stellar sizes
  // sets it to say how big to draw this body and nothing else. It is used
  // *instead of* the model radius rather than as well as it, so the family
  // display factor cannot compress a size the lesson has already chosen -
  // two scalings fighting each other is how a true-scale comparison stopped
  // being to scale. The engine radius is untouched, so collisions, tides and
  // every measured orbital property are the same whichever scale is showing.
  Number.isFinite(obj.stageRadius) && obj.stageRadius > 0
    ? Math.max(
        obj.stageRadius,
        markerFloorPx(liveBodyCount) / ((state && state.zoom) || 1)
      )
    : drawnRadius(obj.radius, type, (state && state.zoom) || 1, liveBodyCount);

/**
 * How much detail this body is worth, at its current size on screen.
 *
 * One call, so every family draws at the same thresholds and a reader zooming
 * out watches the whole scene simplify together rather than one class at a
 * time.
 *
 * Measured on the *display* radius before the floor, which is the size the
 * body is about to be drawn at, and deliberately not on the model radius. When
 * the two were the same number this distinction did not exist; now that a
 * planet is drawn at three eighths of its model radius, asking the model would
 * put surface marks and cloud bands on a body occupying three pixels. Before
 * the floor, because a body held at the floor is a marker standing in for
 * something too small to see, and drawing weather on it would be a fiction.
 *
 * @param {Object} obj - Body with a radius
 * @param {string} type - Which family, for the display policy
 * @returns {string} One of LOD
 */
const lodOf = (obj, type) => {
  const z = (state && state.zoom) || 1;
  return lodFor(displayRadius(obj.radius, type) * z, {
    tier: currentTier(),
    crowded: liveBodyCount > CROWD_SOFT_START,
  });
};

/**
 * The luminous bodies in the scene, as light sources, recomputed once a frame.
 *
 * Positions are held by reference, so a moving star needs no refresh; what is
 * cached is the array and the luminosity, which is the part that would
 * otherwise be recomputed once per lit body per frame. A hundred planets in a
 * two-star system asked for this two hundred times a frame before it was
 * memoised.
 *
 * @returns {Array<{pos: Object, luminosity: number}>} Sources, possibly empty
 */
let lightCacheFrame = -1;
let lightCacheList = [];
const luminousSources = () => {
  const frame = (state && state.frame_count) || 0;
  if (frame === lightCacheFrame && lightCacheList.length === stars.length) {
    return lightCacheList;
  }
  lightCacheFrame = frame;
  lightCacheList = [];
  for (const star of stars) {
    if (!star || star.alive === false) continue;
    const props = stellarPropertiesFor(star, SOLAR_MASS_UNIT);
    if (!(props.luminositySolar > 0)) continue;
    lightCacheList.push({
      pos: star.pos,
      luminosity: props.luminositySolar,
      teffK: props.teffK,
      star,
    });
  }
  return lightCacheList;
};

/**
 * The star that lights this body, or null in a scene with none.
 * @param {{x: number, y: number}} pos - Where the light is received
 * @returns {?Object} A light source
 */
const dominantStarFor = pos => dominantLight(pos, luminousSources());

/**
 * Does the reader want animation held still?
 *
 * Read through matchMedia rather than from a setting, because it is an
 * operating-system preference and the rest of the interface already honors it
 * that way (see the reduced-motion block in css/tokens.css). Cached: matchMedia
 * is not free and this is asked once per pulsar per frame.
 *
 * @returns {boolean} True when animation should be held
 */
let reducedMotionQuery = null;
const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  if (!reducedMotionQuery) {
    try {
      reducedMotionQuery = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      );
    } catch {
      return false;
    }
  }
  return Boolean(reducedMotionQuery.matches);
};

/**
 * How far a star's corona reaches, in stellar radii.
 *
 * Was three, at more than twice this alpha. A corona that wide is not a
 * corona; it is a glow that hides whatever is orbiting inside it, and on a
 * zoomed-in star it covered the inner planets entirely.
 */
const CORONA_SCALE = 1.9;

/** `rgba(...)` from a channel triple and an alpha. Avoids a template per call site. */
const rgba = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`;

// Color utilities (using utils)
/**
 * Compute dynamic color based on proximity to black holes
 * @param {string} base_color_hex - Base color in hex format
 * @param {Object} pos - Position object with x, y properties
 * @param {Array} bh_list - Array of black hole objects
 * @param {number} threshold - Distance threshold for color change
 * @param {Object} target_color - Target RGB color to blend towards
 * @returns {string} RGB color string
 * With the engine's own settings, so "Dynamic Object Properties" works.
 */
const compute_dynamic_color = (hex, pos, bh_list, threshold, target_color) =>
  computeDynamicColor(
    hex,
    pos,
    bh_list,
    threshold,
    target_color,
    physicsSettings
  );

// --- The drawers --------------------------------------------------------------

function drawStar(o, ctx) {
  const world_pos = o.pos; // Use direct world coordinates since canvas is already transformed
  const r = drawRadius(o, 'Star');
  const z = (state && state.zoom) || 1;
  const screenR = r * z;
  const level = lodOf(o, 'Star');

  // Color from the temperature, not from the mass directly.
  //
  // The two agree for a main-sequence star, because the temperature is
  // estimated from the mass when a star does not carry one - but a star that
  // DOES carry one, which is every star a scenario builds from real data, was
  // being colored from a mass-to-color table that knew nothing about it.
  // stellarPropertiesFor is the same function the habitable-zone ring and the
  // light curve read, so the color on screen and the physics in the panels
  // now come from one number. An explicit baseColor still wins: a scenario
  // that names a color means it.
  // Memoised on the star, keyed on the mass it was computed from.
  //
  // The color only changes when the star does, which is on accretion or a
  // merger - not sixty times a second. A cluster of five hundred stars was
  // otherwise running stellarPropertiesFor, which allocates, once per star
  // per frame to arrive at the same answer it gave on the previous one.
  if (
    !o._visual ||
    o._visual.mass !== o.mass ||
    o._visual.base !== o.baseColor ||
    o._visual.teff !== o.temperature ||
    o._visual.lum !== o.luminosityInSuns
  ) {
    const props = stellarPropertiesFor(o, SOLAR_MASS_UNIT);
    o._visual = {
      mass: o.mass,
      base: o.baseColor,
      // The temperature is part of the key, not just an input. Without it a
      // star whose temperature changed while its mass did not kept the
      // color it was memoised with - which is every star in an evolutionary
      // track, where the mass barely moves and the temperature moves by a
      // factor of ten.
      teff: o.temperature,
      lum: o.luminosityInSuns,
      rgb: o.baseColor
        ? hexToRgb(o.baseColor) || starColor(props.teffK)
        : starColor(props.teffK),
    };
  }
  const rgb = o._visual.rgb;

  if (level === LOD.POINT) {
    // A crisp, high-contrast dot and nothing else. No gradient, no bloom: at
    // three pixels a corona is one lighter ring of pixels that reads as blur.
    ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, r, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    // A limb-darkened disc from a cached sprite. The sprite is radially
    // symmetric, so the render pass's flipped Y axis does not matter, and it
    // is keyed on color and size buckets - a cluster of similar stars shares
    // one rather than building a gradient each, every frame.
    // The painter is in js/bodyVisuals.js so that the Stellar Lab's preview
    // and this draw the same star.
    const disc = spriteFor('star-disc', rgb, screenR, paintStarDisc);
    if (disc) {
      ctx.drawImage(disc, world_pos.x - r, world_pos.y - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      ctx.beginPath();
      ctx.arc(world_pos.x, world_pos.y, r, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // The corona, into the offscreen layer js/render.js composites additively.
  //
  // Tighter than what was here: the old bloom ran to three times the stellar
  // radius at 0.35 alpha, which on a zoomed-in star swallowed everything
  // near it and made a planet at half an astronomical unit look like it was
  // inside the photosphere. Restrained, and cached as a sprite rather than
  // built as a gradient per star per frame.
  try {
    const glow = lodAtLeast(level, LOD.SHADED) && screenR > 2 && bloomLayer();
    if (glow) {
      const coronaR = screenR * CORONA_SCALE;
      const halo = spriteFor('star-corona', rgb, coronaR, (sctx, size, c) => {
        const half = size / 2;
        const g = sctx.createRadialGradient(half, half, 0, half, half, half);
        g.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0.34)`);
        g.addColorStop(0.35, `rgba(${c.r},${c.g},${c.b},0.16)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        sctx.fillStyle = g;
        sctx.beginPath();
        sctx.arc(half, half, half, 0, 2 * Math.PI);
        sctx.fill();
      });
      const { x: screenX, y: screenY } = world_to_screen(world_pos);
      if (halo) {
        glow.drawImage(
          halo,
          screenX - coronaR,
          screenY - coronaR,
          coronaR * 2,
          coronaR * 2
        );
      }
    }
  } catch {
    // no-op
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const true_screen_pos = world_to_screen(world_pos);
  // Two different sizes, on purpose.
  //
  // The offset follows the *drawn* body, so a label sits just off the disc
  // the reader can see. Whether to label at all follows the *model* radius,
  // which is the size this decision has always been made on: gating on the
  // drawn size instead would have taken the names off every planet in the
  // Solar System the moment the displayed-size policy shrank them, which is
  // a labeling change nobody asked for.
  const screen_radius = r * state.zoom;
  const label_size = o.radius * state.zoom;

  if (label_size > 5) {
    const label_y_offset = screen_radius + 12;
    ctx.font = '12px Roboto Mono';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;

    // Show name for Solar System sun, mass for others - unless a lesson has
    // asked for neither. A step that puts three unlabeled stars up and asks
    // a reader to judge them by eye is undone by a mass printed under each
    // one, and that is the first screen of A Universe of Stars. The flag is
    // set by js/lessonStage.js from the step's own declaration and cleared
    // with the stage, so nothing else can leave a star anonymous.
    if (o.anonymous) {
      // Nothing. The lesson's object list still names it, so it is still
      // selectable and still reachable from the keyboard.
    } else if (o.isSolarSystemSun) {
      ctx.fillText(
        o.name,
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset
      );
    } else {
      drawSolarLabel(
        ctx,
        formatNumber(o.massInSuns),
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset
      );
      // Remove subscript 'sun' drawing
    }
  }
  ctx.restore();
}

function drawNeutronStar(o, ctx) {
  const world_pos = o.pos; // Use direct world coordinates since canvas is already transformed
  // The drawn radius, which everything below is proportioned to. A neutron
  // star is twenty kilometers across, so this is the marker floor at any
  // zoom a scenario is actually viewed at.
  const nsR = drawRadius(o, 'NeutronStar');

  // Pulsar effect
  o.pulsar_phase += 0.1;
  // The pulse, held still when the reader has asked for that.
  //
  // A pulsar beam sweeping at a few hertz is exactly the kind of repeating
  // motion prefers-reduced-motion exists for, and it is the only animation
  // in the body drawing that runs on its own whether or not the simulation
  // is playing. Held at its mid-brightness rather than switched off: the
  // beam is what says "this is a pulsar", and removing it would remove the
  // information along with the movement.
  const pulse_intensity = prefersReducedMotion()
    ? 0.65
    : 0.5 + 0.5 * Math.sin(o.pulsar_phase / o.pulsar_period);

  // Core
  ctx.fillStyle = compute_dynamic_color('#E6E6FA', o.pos, bh_list, 300.0, {
    r: 255,
    g: 255,
    b: 255,
  });
  ctx.beginPath();
  ctx.arc(world_pos.x, world_pos.y, nsR, 0, 2 * Math.PI);
  ctx.fill();

  // The magnetosphere ring: the cue that says "neutron star" rather than
  // "white dwarf". Both are small, bright and dense; this is a stated
  // boundary at a distance rather than a glow, which is the visual
  // difference between a magnetic field and an atmosphere.
  //
  // Gated on the level of detail like everything else, and its reach is
  // capped: magnetic_field_strength is unbounded in the constructor, and a
  // strongly magnetised star drew a ring several times its own size.
  const nsLevel = lodOf(o, 'NeutronStar');
  if (lodAtLeast(nsLevel, LOD.SHADED) && nsR * state.zoom > 2) {
    const field_radius =
      nsR * Math.min(3.0, 2 + (o.magnetic_field_strength || 0));
    const field_intensity = pulse_intensity * 0.3;

    ctx.strokeStyle = `rgba(0, 255, 255, ${field_intensity})`;
    ctx.lineWidth = 1 / state.zoom;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, field_radius, 0, 2 * Math.PI);
    ctx.stroke();
  }

  // Pulsar beams (only if isPulsar)
  if (o.isPulsar && nsR * state.zoom > 1) {
    const beam_length = nsR * 8;
    const beam_width = Math.max(0.5 / state.zoom, nsR * 0.3);

    ctx.strokeStyle = `rgba(255, 255, 255, ${pulse_intensity * 0.8})`;
    ctx.lineWidth = beam_width;
    ctx.lineCap = 'round';

    // Two beams at opposing angles
    for (let i = 0; i < 2; i++) {
      const angle = o.pulsar_phase + i * Math.PI;
      const beam_start_x = world_pos.x + Math.cos(angle) * nsR;
      const beam_start_y = world_pos.y + Math.sin(angle) * nsR;
      const beam_end_x = world_pos.x + Math.cos(angle) * beam_length;
      const beam_end_y = world_pos.y + Math.sin(angle) * beam_length;

      ctx.beginPath();
      ctx.moveTo(beam_start_x, beam_start_y);
      ctx.lineTo(beam_end_x, beam_end_y);
      ctx.stroke();
    }
  }

  // Label
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const true_screen_pos = world_to_screen(world_pos);
  // Two different sizes, on purpose.
  //
  // The offset follows the *drawn* body, so a label sits just off the disc
  // the reader can see. Whether to label at all follows the *model* radius,
  // which is the size this decision has always been made on: gating on the
  // drawn size instead would have taken the names off every planet in the
  // Solar System the moment the displayed-size policy shrank them, which is
  // a labeling change nobody asked for.
  const screen_radius = nsR * state.zoom;
  const label_size = o.radius * state.zoom;

  if (label_size > 2) {
    const label_y_offset = screen_radius * 8 + 12;
    ctx.font = '12px Roboto Mono';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    drawSolarLabel(
      ctx,
      formatNumber(o.massInSuns),
      true_screen_pos.x,
      true_screen_pos.y + label_y_offset,
      { suffix: ' NS' }
    );
  }
  ctx.restore();
}

function drawWhiteDwarf(o, ctx) {
  const world_pos = o.pos; // Use direct world coordinates since canvas is already transformed

  // Core with temperature-based color
  const temp_color = whiteDwarfColor(o.temperature);
  ctx.fillStyle = compute_dynamic_color(temp_color, o.pos, bh_list, 200.0, {
    r: 255,
    g: 255,
    b: 255,
  });
  const wdR = drawRadius(o, 'WhiteDwarf');
  const wdZ = (state && state.zoom) || 1;
  const wdLevel = lodOf(o, 'WhiteDwarf');

  ctx.beginPath();
  ctx.arc(world_pos.x, world_pos.y, wdR, 0, 2 * Math.PI);
  ctx.fill();

  // Glow, bounded and gated.
  //
  // The reach used to be 1.5 + T/20000 stellar radii, which for a hot young
  // dwarf is two and a half times the body and reads as a small star rather
  // than as the Earth-sized cinder it is. Capped, and skipped entirely at
  // the point level where a halo is one lighter ring of pixels.
  if (lodAtLeast(wdLevel, LOD.SHADED) && wdR * wdZ > 3) {
    const glow_radius = wdR * Math.min(2.0, 1.3 + (o.temperature || 0) / 40000);
    const glow_intensity = Math.min(0.32, (o.temperature / 20000) * 0.3);

    const grad = ctx.createRadialGradient(
      world_pos.x,
      world_pos.y,
      wdR,
      world_pos.x,
      world_pos.y,
      glow_radius
    );
    grad.addColorStop(0, `rgba(255, 255, 255, ${glow_intensity})`);
    grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, glow_radius, 0, 2 * Math.PI);
    ctx.fill();
  }

  // The cue that says "white dwarf" rather than "small hot star": a hard,
  // bright edge. A degenerate body has no atmosphere to soften its limb, and
  // this is the one place a picture can say that without making the object
  // bigger than it is. One screen pixel wide at any zoom, so it does not
  // grow into a second disc.
  if (lodAtLeast(wdLevel, LOD.DETAILED)) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1 / wdZ;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, wdR * 0.94, 0, 2 * Math.PI);
    ctx.stroke();
  }

  // Label
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const true_screen_pos = world_to_screen(world_pos);
  // Two different sizes, on purpose.
  //
  // The offset follows the *drawn* body, so a label sits just off the disc
  // the reader can see. Whether to label at all follows the *model* radius,
  // which is the size this decision has always been made on: gating on the
  // drawn size instead would have taken the names off every planet in the
  // Solar System the moment the displayed-size policy shrank them, which is
  // a labeling change nobody asked for.
  const screen_radius = wdR * state.zoom;
  const label_size = o.radius * state.zoom;

  if (label_size > 3) {
    const label_y_offset = screen_radius * 2 + 12;
    ctx.font = '12px Roboto Mono';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    drawSolarLabel(
      ctx,
      formatNumber(o.massInSuns),
      true_screen_pos.x,
      true_screen_pos.y + label_y_offset,
      { suffix: ' WD' }
    );
  }
  ctx.restore();
}

function drawGalaxy(o, ctx) {
  const { x, y } = o.pos;
  const r = drawRadius(o, 'Galaxy');

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.tilt);
  // Spirals are seen at some angle; ellipticals are round enough that
  // squashing them would just look like a spiral.
  if (o.galaxyType === 'spiral') ctx.scale(1, 0.42);

  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  halo.addColorStop(0, 'rgba(255, 246, 224, 0.95)');
  halo.addColorStop(0.28, 'rgba(255, 220, 170, 0.55)');
  halo.addColorStop(1, 'rgba(150, 170, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 2 * Math.PI);
  ctx.fill();

  if (o.galaxyType === 'spiral') {
    ctx.strokeStyle = 'rgba(186, 210, 255, 0.45)';
    ctx.lineWidth = Math.max(0.4, r * 0.05);
    ctx.lineCap = 'round';
    for (let arm = 0; arm < 2; arm++) {
      ctx.beginPath();
      for (let t = 0.3; t <= 1.02; t += 0.04) {
        // A logarithmic spiral, which is what real arms approximate: the
        // angle grows with the log of the radius rather than with the radius.
        const a = arm * Math.PI + Math.log(t / 0.3) * 2.4;
        const rr = r * t;
        const px = rr * Math.cos(a);
        const py = rr * Math.sin(a);
        if (t === 0.3) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  // The bright core, drawn round: it is the one part of a tilted disc that
  // is not foreshortened.
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 252, 238, 0.9)';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.6, r * 0.11), 0, 2 * Math.PI);
  ctx.fill();
}

function drawAccretionDiskParticle(o, ctx) {
  if (!o.alive || o.absorbed) return;

  const world_pos = o.pos;
  const color = o.getTemperatureColor();
  const beam = o.getDopplerFactor();

  // Enhanced drawing with glow effect for hot particles
  const glow_radius =
    o.radius * (1 + o.heating_intensity * 2) * (0.8 + beam * 0.25);
  const core_radius = o.radius * 0.6;

  // Draw glow effect for hot particles
  if (o.heating_intensity > 0.1) {
    const glow_alpha = Math.min(0.9, o.heating_intensity * 0.6 * beam);
    ctx.globalAlpha = glow_alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, glow_radius, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Draw core particle
  ctx.fillStyle = color;
  ctx.globalAlpha = Math.max(0.15, Math.min(1, 0.9 * beam));
  ctx.beginPath();
  ctx.arc(world_pos.x, world_pos.y, core_radius, 0, 2 * Math.PI);
  ctx.fill();

  // Draw bright center for very hot particles
  if (o.heating_intensity > 0.5) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 0.8 * beam)})`;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, core_radius * 0.4, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}

registerBodyDrawers({
  StarObject: drawStar,
  NeutronStar: drawNeutronStar,
  WhiteDwarf: drawWhiteDwarf,
  Galaxy: drawGalaxy,
  AccretionDiskParticle: drawAccretionDiskParticle,
});

export {
  drawRadius,
  lodOf,
  dominantStarFor,
  rgba,
  bloomLayer,
  setBloomLayer,
  visualClockSeconds,
  compute_dynamic_color,
};

// --- The background starfield (its own header follows) -----------------------

// =============================================================================
// The background sky: what is in it, and where
// -----------------------------------------------------------------------------
// Generation only. This module decides how many stars there are, where, how
// bright, what color and in which parallax layer; js/render.js decides how to
// paint them. Keeping the two apart is what lets the whole model be tested
// without a canvas, and what lets the painting be rewritten - as it has been,
// from ten thousand individual fills per repaint to three blits - without
// touching the sky itself.
//
// What was here before
// -----------------------------------------------------------------------------
// Ten thousand stars, uniformly distributed, uniformly white, all the same
// brightness range, all twinkling, regenerated from Math.random on every
// resize, and repainted in full: twenty times a second on an empty sky, and
// twenty-eight once anything on it lensed. Measured at 1440x900: 4.1ms a
// repaint for an empty scene, 19.6ms for a crowded one. See
// tools/starfield-probe.mjs.
//
// Four things follow from that and shape everything below.
//
// It has to be deterministic. A screenshot of a seeded scenario, an A/B run, a
// shared link and a reset all have to show the same sky, and Math.random gives
// none of them that. Everything here comes from the world seed and the
// viewport size.
//
// It has to look like a sky. A uniform brightness distribution reads as noise;
// a real field is overwhelmingly faint stars with a handful of bright ones,
// which is what makes it look deep. The distribution below is a restrained
// version of that, and the field looks denser than its point count because of
// it.
//
// It has to be paintable once. The stars are split into three parallax layers
// so js/render.js can pre-render each to its own canvas and blit them, rather
// than walking every star every frame. Nothing here changes between repaints,
// which is the property that makes the caching sound.
//
// And it has to be cheap to ask "which stars are near this point", because the
// lensing and gravitational-wave distortion need exactly that and used to get
// it by testing all ten thousand.
// =============================================================================

/** The three parallax depths, far to near. Also the paint order. */
export const LAYERS = Object.freeze(['far', 'mid', 'near']);

/** How much of the pan each layer moves by, as a fraction. */
export const LAYER_DEPTH = Object.freeze({ far: 1.0, mid: 0.6, near: 0.3 });

/** How the stars are split between them. Most of the sky is far away. */
const LAYER_SHARE = Object.freeze({ far: 0.55, mid: 0.3, near: 0.15 });

/**
 * Stars per megapixel of viewport, by quality tier.
 *
 * Chosen by measurement rather than by taste: at these counts the pre-rendered
 * layers below cost under a millisecond to build and nothing per frame, and
 * the magnitude distribution makes the field read as considerably denser than
 * the number suggests. The old fixed 10,000 was the same sky on a 320-pixel
 * phone and on a lecture projector - four times too dense on one and sparse on
 * the other.
 */
export const STARS_PER_MEGAPIXEL = Object.freeze({ full: 2600, low: 1000 });

/** Never fewer than this, however small the window. */
const MIN_STARS = 240;

/** At most this many stars are ever animated, whatever the field size. */
export const MAX_TWINKLERS = 48;

/** Linear interpolation, for reading a band's range. */
const lerp = (a, b, t) => a + (b - a) * t;

/** Never more than this, however large. A wall display is not a reason. */
const MAX_STARS = 9000;

/**
 * The star_density setting's default, and so the value that means "the natural
 * count for this window".
 *
 * The setting used to be the literal number of stars, which is why its default
 * is a round ten thousand. It is now read as a proportion of that: leaving it
 * alone gives the density this module chose for the window, halving it halves
 * the sky, and zero empties it. Keeping the same key and the same default
 * means saved states, share links and scenario definitions written before the
 * rewrite still describe the sky their author saw.
 */
export const DEFAULT_STAR_DENSITY = 10000;

/**
 * How many stars a viewport of this size gets.
 *
 * @param {number} width - Viewport width in pixels
 * @param {number} height - Viewport height in pixels
 * @param {string} [tier] - 'full' or 'low'
 * @param {number} [density] - The reader's star_density setting
 * @returns {number} A star count
 */
export function starCountFor(
  width,
  height,
  tier = 'full',
  density = DEFAULT_STAR_DENSITY
) {
  const w = Number(width);
  const h = Number(height);
  if (!(w > 0) || !(h > 0)) return MIN_STARS;
  const perMp = STARS_PER_MEGAPIXEL[tier] ?? STARS_PER_MEGAPIXEL.full;
  const megapixels = (w * h) / 1e6;
  const natural = Math.max(
    MIN_STARS,
    Math.min(MAX_STARS, Math.round(perMp * megapixels))
  );

  // A null reaches here from a settings object that has never been written to,
  // and means "unset" rather than "no stars".
  if (density == null) return natural;
  const asked = Number(density);
  if (!Number.isFinite(asked) || asked === DEFAULT_STAR_DENSITY) return natural;
  if (asked <= 0) return 0;
  // The floor is there so a small window still gets a sky, not to overrule a
  // reader who has deliberately asked for fewer stars.
  return Math.min(
    MAX_STARS,
    Math.round((natural * asked) / DEFAULT_STAR_DENSITY)
  );
}

/**
 * The colors a star may be.
 *
 * Deliberately short and deliberately weighted toward neutral. Real starlight
 * is subtly colored and a sky of saturated dots is confetti, so the first two
 * entries - both within a few percent of white - take four fifths of the
 * field, and the visibly warm and visibly blue entries are rare enough to read
 * as a detail somebody noticed rather than as decoration.
 */
export const STAR_PALETTE = Object.freeze([
  { r: 255, g: 255, b: 255 }, // neutral
  { r: 255, g: 248, b: 240 }, // barely warm
  { r: 255, g: 231, b: 208 }, // K, amber
  { r: 255, g: 208, b: 176 }, // M, orange
  { r: 226, g: 236, b: 255 }, // A, cool white
  { r: 199, g: 219, b: 255 }, // B, blue
]);

const PALETTE_CUMULATIVE = Object.freeze([0.6, 0.79, 0.88, 0.92, 0.98, 1.0]);

/**
 * Pick a palette entry from a uniform draw.
 * @param {number} u - A value in [0, 1)
 * @returns {number} An index into STAR_PALETTE
 */
export function paletteIndexFor(u) {
  for (let i = 0; i < PALETTE_CUMULATIVE.length; i++) {
    if (u < PALETTE_CUMULATIVE[i]) return i;
  }
  return 0;
}

/**
 * The three magnitude bands, and how much of the sky each is.
 *
 * Written as bands rather than as a curve because the requirement is a
 * statement about proportions - many very dim, fewer medium, a tiny number of
 * bright - and a curve makes that something you have to integrate to check. A
 * cube law was tried first and put thirteen per cent of the field above two
 * pixels, which is not a tiny number and reads as glitter.
 *
 * `size` is the square's side in pixels: the faint band is sub-pixel on
 * purpose, which is what a star at the limit of visibility looks like.
 */
export const MAGNITUDE_BANDS = Object.freeze([
  { share: 0.78, size: [0.5, 0.95], alpha: [0.14, 0.4] },
  { share: 0.19, size: [0.95, 1.7], alpha: [0.4, 0.75] },
  { share: 0.03, size: [1.7, 2.8], alpha: [0.8, 1.0] },
]);

/**
 * Which band a uniform draw falls in.
 * @param {number} u - A value in [0, 1)
 * @returns {number} 0 faint, 1 medium, 2 bright
 */
export function bandFor(u) {
  let cut = 0;
  for (let i = 0; i < MAGNITUDE_BANDS.length; i++) {
    cut += MAGNITUDE_BANDS[i].share;
    if (u < cut) return i;
  }
  return MAGNITUDE_BANDS.length - 1;
}

/**
 * One deterministic star field for a seed and a viewport.
 *
 * @param {object} options
 * @param {number} options.seed - The world seed
 * @param {number} options.width - Viewport width in pixels
 * @param {number} options.height - Viewport height in pixels
 * @param {string} [options.tier] - 'full' or 'low'
 * @param {number} [options.count] - Override the computed count, for tests
 * @returns {object} `{ layers, twinklers, count, width, height, seed, tier }`
 */
export function generateStarfield({
  seed,
  width,
  height,
  tier = 'full',
  density = DEFAULT_STAR_DENSITY,
  count,
}) {
  const w = Math.max(1, Math.round(width) || 1);
  const h = Math.max(1, Math.round(height) || 1);
  const total = count ?? starCountFor(w, h, tier, density);

  // Seeded on the viewport as well as the world, so a window resized and
  // restored gets its sky back rather than a new one - and so two people
  // opening the same link on the same size of screen see the same sky.
  const rand = mulberry32(mixSeed(seed, w, h, total));

  const layers = { far: [], mid: [], near: [] };
  const twinklers = [];

  for (let i = 0; i < total; i++) {
    const layer =
      i < total * LAYER_SHARE.far
        ? 'far'
        : i < total * (LAYER_SHARE.far + LAYER_SHARE.mid)
          ? 'mid'
          : 'near';

    const bandIndex = bandFor(rand());
    const band = MAGNITUDE_BANDS[bandIndex];
    const within = rand();
    // Nearer stars read as nearer by being a little brighter, which with
    // parallax is the only depth cue a flat field has. Kept small: a near
    // layer that is obviously brighter looks like two skies, not one.
    const depthGain = layer === 'near' ? 1.12 : layer === 'mid' ? 1.05 : 1;

    const star = {
      x: rand() * w,
      y: rand() * h,
      size: lerp(band.size[0], band.size[1], within) * depthGain,
      alpha: Math.min(
        1,
        lerp(band.alpha[0], band.alpha[1], within) * depthGain
      ),
      color: paletteIndexFor(rand()),
      phase: rand() * Math.PI * 2,
      band: bandIndex,
      // Recorded on the star rather than looked up later. The renderer needs
      // both of these per twinkler per repaint, and finding them by scanning
      // the layer arrays was an O(stars) walk forty-eight times a repaint.
      layer,
      twinkles: false,
    };
    layers[layer].push(star);

    // Only the bright ones twinkle, and only a handful of those. Atmospheric
    // scintillation is most visible on bright stars, and animating the whole
    // field was both wrong and the reason the layer could never be cached.
    if (bandIndex === 2 && twinklers.length < MAX_TWINKLERS) {
      star.twinkles = true;
      twinklers.push(star);
    }
  }

  return { layers, twinklers, count: total, width: w, height: h, seed, tier };
}

/**
 * Combine the world seed with the viewport into one 32-bit seed.
 * @param {number} seed - World seed
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {number} n - Star count
 * @returns {number} An unsigned 32-bit seed
 */
export function mixSeed(seed, w, h, n) {
  let x = (Number(seed) || 0) >>> 0;
  for (const v of [w, h, n]) {
    x ^= (v | 0) + 0x9e3779b9 + (x << 6) + (x >>> 2);
    x >>>= 0;
  }
  return x >>> 0;
}

// --- Asking which stars are near something ------------------------------------

/** Side of one bucket in the lookup grid, in pixels. */
export const GRID_CELL = 64;

/**
 * A spatial index over one field, for the distortion passes.
 *
 * The lensing and gravitational-wave effects displace the stars inside a disc
 * a few dozen pixels across. Finding them used to mean testing every star in
 * the sky against every compact object on screen - ten thousand times a dozen,
 * every repaint, which is where the crowded scene's 19.6ms went. A grid turns
 * that into a walk over the handful of buckets the disc touches.
 *
 * @param {object} field - From generateStarfield
 * @returns {object} An index with a `near` method
 */
export function indexStarfield(field) {
  const cols = Math.max(1, Math.ceil(field.width / GRID_CELL));
  const rows = Math.max(1, Math.ceil(field.height / GRID_CELL));
  const cells = new Map();

  for (const layer of LAYERS) {
    for (const star of field.layers[layer]) {
      const cx = Math.min(
        cols - 1,
        Math.max(0, Math.floor(star.x / GRID_CELL))
      );
      const cy = Math.min(
        rows - 1,
        Math.max(0, Math.floor(star.y / GRID_CELL))
      );
      const key = cy * cols + cx;
      let bucket = cells.get(key);
      if (!bucket) {
        bucket = [];
        cells.set(key, bucket);
      }
      bucket.push({ star, layer });
    }
  }

  return {
    cols,
    rows,
    cells,
    /**
     * Every star whose position is within `radius` of (x, y).
     *
     * @param {number} x - Center, pixels
     * @param {number} y - Center, pixels
     * @param {number} radius - Pixels
     * @returns {Array<{star: object, layer: string}>} Matches
     */
    near(x, y, radius) {
      const out = [];
      const minX = Math.max(0, Math.floor((x - radius) / GRID_CELL));
      const maxX = Math.min(cols - 1, Math.floor((x + radius) / GRID_CELL));
      const minY = Math.max(0, Math.floor((y - radius) / GRID_CELL));
      const maxY = Math.min(rows - 1, Math.floor((y + radius) / GRID_CELL));
      const r2 = radius * radius;
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          const bucket = cells.get(cy * cols + cx);
          if (!bucket) continue;
          for (const entry of bucket) {
            const dx = entry.star.x - x;
            const dy = entry.star.y - y;
            if (dx * dx + dy * dy <= r2) out.push(entry);
          }
        }
      }
      return out;
    },
  };
}
