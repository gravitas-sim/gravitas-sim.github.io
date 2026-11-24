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
import { hexToRgb, computeDynamicColor } from './utils.js';
import { bodyLabel } from './bodyLabels.js';
import { mulberry32 } from './rng.js';
import { whiteDwarfColor, tracerColor } from './bodyEffects.js';
import {
  LOD,
  lodFor,
  lodAtLeast,
  dominantLight,
  lightDirection,
  phaseCos,
  starColor,
  paintStarDisc,
  spriteFor,
  drawnRadius,
  displayRadius,
  markerFloorPx,
  CROWD_SOFT_START,
  LOD_SHADED_MAX_PX,
} from './bodyVisuals.js';
import { SETTINGS } from './appState.js';
import { builtPopulation } from './quality.js';
import { t } from './i18n/index.js';
import {
  state,
  stars,
  planets,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
  bh_list,
  liveBodyCount,
  physicsSettings,
  world_to_screen,
  getSimulationTime,
  registerBodyDrawers,
  currentTier,
  stellarPropertiesFor,
  GAS_GIANT_TO_STAR_THRESHOLD,
  JUPITER_MASS_UNIT,
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
 * The simulated clock, so a paused world draws the same frame and two runs of
 * a scenario match; it was Date.now(), so the flow kept turning while paused.
 * Under reduced motion it returns a constant: complete, legible, still.
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
  // sets it to say how big to draw this body. It is used *instead of* the
  // model radius so the family display factor cannot compress a size the
  // lesson chose. The engine radius is untouched, so collisions, tides and
  // measured orbits are the same at either scale.
  Number.isFinite(obj.stageRadius) && obj.stageRadius > 0
    ? Math.max(
        obj.stageRadius,
        markerFloorPx(liveBodyCount) / ((state && state.zoom) || 1)
      )
    : drawnRadius(obj.radius, type, (state && state.zoom) || 1, liveBodyCount);

// --- A crowd: trails, detail and notes (drawing only; no body is moved, hidden or removed) ---

/** Trails kept in a crowd: the selected body and this many heaviest. */
let CROWD_TRAIL_BODIES = 12;
/** Bodies drawn in full per frame in a crowd. */
let CROWD_DETAIL_CAP = 16;

/** For tests and measurement. */
const setCrowdCaps = ({ trails, detail }) => {
  if (trails !== undefined) CROWD_TRAIL_BODIES = trails;
  if (detail !== undefined) CROWD_DETAIL_CAP = detail;
};

/** A scene of this many live bodies or more is a crowd. */
const isCrowd = (n = liveBodyCount) => n >= CROWD_SOFT_START;

const selectedBody = () => state.selectedObject?.object ?? null;

let trailsThinned = false;

/** The bodies whose trails are drawn: all, or in a crowd the selected and the heaviest. */
function crowdTrails(list) {
  if (!trailsThinned) return list;
  const keep = new Set();
  const picked = selectedBody();
  if (picked && list.includes(picked)) keep.add(picked);
  const top = [];
  for (const o of list) {
    if (!o.alive || o === picked) continue;
    const m = o.mass || 0;
    let i = top.length;
    while (i > 0 && (top[i - 1].mass || 0) < m) i--;
    if (i < CROWD_TRAIL_BODIES) {
      top.splice(i, 0, o);
      if (top.length > CROWD_TRAIL_BODIES) top.pop();
    }
  }
  for (const o of top) keep.add(o);
  return list.filter(o => keep.has(o));
}

// --- Detail ---------------------------------------------------------------------

const DETAILED = new Set();
const FAMILIES = [
  ['Planet', () => planets],
  ['GasGiant', () => gas_giants],
  ['Asteroid', () => asteroids],
  ['Comet', () => comets],
  ['Star', () => stars],
  ['NeutronStar', () => neutron_stars],
  ['WhiteDwarf', () => white_dwarfs],
  ['BlackHole', () => bh_list],
];

/** Once a frame: grant full detail to the cap's worth of large bodies nearest the selection (or the view's middle). The low tier grants none. */
function beginCrowdFrame() {
  DETAILED.clear();
  trailsThinned = isCrowd() && !!SETTINGS.show_trails;
  if (!isCrowd() || currentTier() === 'low' || CROWD_DETAIL_CAP <= 0) return;
  const z = state.zoom || 1;
  const picked = selectedBody();
  const c = picked?.pos ?? {
    x: -state.pan.x / z + state.frameOffset.x,
    y: state.pan.y / z + state.frameOffset.y,
  };
  const big = [];
  for (const [type, list] of FAMILIES)
    for (const o of list()) {
      if (!o.alive || !o.pos) continue;
      if (displayRadius(o.radius, type) * z <= LOD_SHADED_MAX_PX) continue;
      big.push({ o, d: (o.pos.x - c.x) ** 2 + (o.pos.y - c.y) ** 2 });
    }
  if (big.length > CROWD_DETAIL_CAP) big.sort((a, b) => a.d - b.d);
  for (const { o } of big.slice(0, CROWD_DETAIL_CAP)) DETAILED.add(o);
}

/** Whether this body was granted full detail this frame. */
const crowdDetail = o => DETAILED.has(o);

// --- What the readout says ---------------------------------------------------------

/** Sentences on what the tier or the crowd left out; empty when nothing. */
function crowdNotes() {
  const out = [];
  const built = builtPopulation();
  if (built)
    out.push(
      t('canvas.reducedPopulation', { n: built.built, total: built.wanted })
    );
  if (trailsThinned)
    out.push(
      t('canvas.crowdTrails', { n: CROWD_TRAIL_BODIES, total: liveBodyCount })
    );
  return out;
}

/**
 * How much detail this body is worth, at its current size on screen.
 *
 * One call, so every family uses the same thresholds and the whole scene
 * simplifies together as a reader zooms out.
 *
 * Measured on the *display* radius before the floor, not the model radius: a
 * planet is drawn at three eighths of its model radius, so the model radius
 * would put surface marks on a three-pixel body. Before the floor, because a
 * body held at the floor is a marker for something too small to see.
 *
 * @param {Object} obj - Body with a radius
 * @param {string} type - Which family, for the display policy
 * @returns {string} One of LOD
 */
const lodOf = (obj, type) => {
  const z = (state && state.zoom) || 1;
  return lodFor(displayRadius(obj.radius, type) * z, {
    tier: currentTier(),
    crowded: isCrowd(liveBodyCount),
    detailed: crowdDetail(obj),
  });
};

/**
 * The luminous bodies in the scene, as light sources, recomputed once a frame.
 *
 * Positions are held by reference, so a moving star needs no refresh; the
 * cached part is the array and the luminosity, which would otherwise be
 * recomputed once per lit body per frame.
 *
 * A Star-class body below the mass at which a gas giant becomes a star is not a
 * light: the Galilean scenario's Jupiter is one, and it lit its own moons.
 *
 * @returns {Array<{pos: Object, luminosity: number}>} Sources, possibly empty
 */
let lightCacheFrame = -1;
let lightCacheStars = null;
let lightCacheCount = -1;
let lightCacheFirst = null;
let lightCacheList = [];
const luminousSources = () => {
  // The frame, and which stars: a rebuilt world can have as many as the last.
  const frame = (state && state.frame_count) || 0;
  if (
    frame === lightCacheFrame &&
    stars === lightCacheStars &&
    stars.length === lightCacheCount &&
    stars[0] === lightCacheFirst
  ) {
    return lightCacheList;
  }
  lightCacheFrame = frame;
  lightCacheStars = stars;
  lightCacheCount = stars.length;
  lightCacheFirst = stars[0];
  lightCacheList = [];
  for (const star of stars) {
    if (!star || star.alive === false) continue;
    if (star.mass < GAS_GIANT_TO_STAR_THRESHOLD * JUPITER_MASS_UNIT) continue;
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

/** The star each body was lit by last, so the choice holds (LIGHT_HOLD). */
const lightOf = new WeakMap();

/**
 * The star that lights this body, or null in a scene with none.
 * @param {{x: number, y: number}} pos - Where the light is received
 * @param {object} [body] - The body, so its light holds between frames
 * @returns {?Object} A light source
 */
const dominantStarFor = (pos, body) => {
  const s = dominantLight(pos, luminousSources(), body && lightOf.get(body));
  if (body) lightOf.set(body, s?.star ?? null);
  return s;
};

/**
 * What lights a body and from where its phase is seen: the one answer the
 * drawing, the inspector and the canvas description share.
 *
 * The observer is the planet or giant whose Hill sphere the body is inside,
 * the nearest if several: the Hill radius is the host's distance times the
 * cube root of the mass ratio over three, the host being the star that pulls
 * on the planet hardest. Not the strongest pull on the body itself (the orbit
 * helper's rule, js/orbital.js): the Sun pulls the real Moon about twice as
 * hard as the Earth does. A body inside no Hill sphere goes round a star and
 * shows the half-lit disc seen from above the orbital plane. With no star,
 * `source` is null and the direction is the fixed one.
 *
 * @param {object} body - A planet, moon or giant
 * @returns {{source: ?object, light: object, observer: ?object, cosA: number}}
 */
const lightingFor = body => {
  const source = dominantStarFor(body.pos, body);
  const light = lightDirection(body.pos, source ? source.pos : null);
  let observer = null;
  let nearest = Infinity;
  for (const c of source ? [...planets, ...gas_giants] : []) {
    if (c === body || c.alive === false || !(c.mass > body.mass)) continue;
    const d = Math.hypot(c.pos.x - body.pos.x, c.pos.y - body.pos.y);
    // The host: the star pulling on c hardest (js/orbital.js's rule, inlined
    // so start-up does not fetch that module's chunk).
    let host = null;
    let pull = 0;
    for (const st of d < nearest ? stars : []) {
      const q =
        st.mass / ((st.pos.x - c.pos.x) ** 2 + (st.pos.y - c.pos.y) ** 2);
      if (q > pull) [host, pull] = [st, q];
    }
    if (!host) continue;
    const D = Math.hypot(host.pos.x - c.pos.x, host.pos.y - c.pos.y);
    if (d < D * Math.cbrt(c.mass / (3 * host.mass)))
      [observer, nearest] = [c, d];
  }
  const cosA = observer ? (phaseCos(body.pos, light, observer.pos) ?? 0) : 0;
  return { source, light, observer, cosA };
};

/**
 * Does the reader want animation held still?
 *
 * Read through matchMedia because it is an operating-system preference the
 * rest of the interface honors that way (see css/tokens.css). Cached: it is
 * asked once per pulsar per frame.
 *
 * @returns {boolean} True when animation should be held
 */
let reducedMotionQuery = null;
const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  if (document.documentElement.dataset.motion) return true;
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
 * How far a star's corona reaches, in stellar radii. It was three, at more
 * than twice this alpha: that wide it hides orbiting inner planets.
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
    // A limb-darkened disc from a cached sprite, radially symmetric so the
    // flipped Y axis does not matter, keyed on color and size buckets so a
    // cluster of similar stars shares one. The painter is in js/bodyVisuals.js
    // so the Stellar Lab preview draws the same star.
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
  // Tighter than the old bloom (three stellar radii at 0.35 alpha), which on a
  // zoomed-in star swallowed everything near it. Cached as a sprite rather
  // than built as a gradient per star per frame.
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

  // The offset follows the drawn disc; naming follows the model radius. A
  // lesson can ask for neither (`anonymous`): the star stays selectable from
  // the lesson's object list.
  if (!o.anonymous)
    bodyLabel(o, world_to_screen(world_pos), r * state.zoom, {
      px: 12,
      gate: o.radius * state.zoom > 5,
      value: formatNumber(o.massInSuns),
      known: o.name,
      ...(o.isSolarSystemSun && { name: o.name }),
    });
}

function drawNeutronStar(o, ctx) {
  const world_pos = o.pos; // Use direct world coordinates since canvas is already transformed
  // The drawn radius, which everything below is proportioned to. A neutron
  // star is twenty kilometers across, so this is the marker floor at any
  // zoom a scenario is actually viewed at.
  const nsR = drawRadius(o, 'NeutronStar');

  // Pulsar effect
  o.pulsar_phase += 0.1;
  // The pulse, held still under reduced motion. A beam sweeping at a few hertz
  // is the only body animation that runs whether or not the simulation is
  // playing. Held at mid-brightness rather than removed, since the beam is
  // what says "this is a pulsar".
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

  // The magnetosphere ring is the cue for "neutron star" rather than "white
  // dwarf": a stated boundary at a distance rather than an atmosphere-like
  // glow. Gated on the level of detail, and its reach is capped, because
  // magnetic_field_strength is unbounded in the constructor and a strongly
  // magnetised star drew a ring several times its own size.
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
  bodyLabel(o, world_to_screen(world_pos), nsR * state.zoom * 8, {
    px: 12,
    gate: o.radius * state.zoom > 2,
    value: formatNumber(o.massInSuns),
    suffix: ' NS',
    known: o.name,
  });
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

  // Glow, bounded and gated. The reach was 1.5 + T/20000 stellar radii, which
  // for a hot young dwarf reads as a small star rather than an Earth-sized
  // cinder. Capped, and skipped at the point level, where a halo is one
  // lighter ring of pixels.
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
  bodyLabel(o, world_to_screen(world_pos), wdR * state.zoom * 2, {
    px: 12,
    gate: o.radius * state.zoom > 3,
    value: formatNumber(o.massInSuns),
    suffix: ' WD',
    known: o.name,
  });
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
  const color = tracerColor(o);
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
  CROWD_DETAIL_CAP,
  CROWD_TRAIL_BODIES,
  setCrowdCaps,
  beginCrowdFrame,
  crowdDetail,
  crowdNotes,
  crowdTrails,
  isCrowd,
  dominantStarFor,
  lightingFor,
  rgba,
  bloomLayer,
  setBloomLayer,
  visualClockSeconds,
  compute_dynamic_color,
};

// --- The background starfield (its own header follows) -----------------------

// =============================================================================
// The background sky: what is in it, and where
// Generation only (js/render.js paints it): deterministic from the world seed
// and the viewport, mostly faint stars with a few bright ones, in three
// parallax layers each painted once, and cheap to ask which stars are near a
// point. See tools/starfield-probe.mjs for what the old sky cost.
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
 * Chosen by measurement: at these counts the pre-rendered layers cost under a
 * millisecond to build and nothing per frame, and the magnitude distribution
 * makes the field read denser than its count. The old fixed 10,000 was four
 * times too dense on a 320-pixel phone and sparse on a projector.
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
 * The setting was once the literal star count, hence the round ten thousand.
 * It is now a proportion of it: the default gives this module's density for
 * the window, halving halves the sky, zero empties it. The key and default are
 * unchanged, so saved states, share links and scenario definitions keep the
 * sky their author saw.
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
 * Short and weighted toward neutral: real starlight is subtly colored and
 * saturated dots are confetti, so the first two entries (within a few percent
 * of white) take four fifths of the field and the warm and blue ones stay rare.
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
 * Bands rather than a curve, because the requirement is about proportions
 * (many very dim, fewer medium, a tiny number bright) and a curve must be
 * integrated to check. A cube law put thirteen per cent of the field above two
 * pixels, which reads as glitter.
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
 * Lensing and gravitational-wave effects displace the stars inside a disc a
 * few dozen pixels across. Testing every star against every compact object
 * cost 19.6 ms a repaint in the crowded scene; a grid walks only the buckets
 * the disc touches.
 *
 * Each entry is {star, layer, mark, style}. `mark` and `style` are scratch for
 * the caller: a painter that queries one disc at several wrapped centres stamps
 * `mark` with a number of its own, so a star that more than one query returns
 * is drawn once, and keeps the colour string of the star as it is when it is
 * not lensed in `style`.
 *
 * @param {object} field - From generateStarfield
 * @returns {object} An index with a `near` method
 */
export function indexStarfield(field) {
  const cols = Math.max(1, Math.ceil(field.width / GRID_CELL));
  const rows = Math.max(1, Math.ceil(field.height / GRID_CELL));
  // One grid per layer, so a painter that wants one layer does not walk (and
  // discard) the other two.
  const grids = {};

  for (const layer of LAYERS) {
    const cells = (grids[layer] = new Map());
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
      bucket.push({ star, layer, mark: 0, style: null });
    }
  }

  return {
    cols,
    rows,
    /**
     * Every star whose position is within `radius` of (x, y).
     *
     * @param {number} x - Center, pixels
     * @param {number} y - Center, pixels
     * @param {number} radius - Pixels
     * @param {string} [layer] - Only this layer's stars (default: all, a layer
     *   at a time)
     * @param {Array} [out] - Emptied and filled instead of a new array
     * @returns {Array<{star: object, layer: string}>} Matches
     */
    near(x, y, radius, layer, out) {
      if (out) out.length = 0;
      else out = [];
      const minX = Math.max(0, Math.floor((x - radius) / GRID_CELL));
      const maxX = Math.min(cols - 1, Math.floor((x + radius) / GRID_CELL));
      const minY = Math.max(0, Math.floor((y - radius) / GRID_CELL));
      const maxY = Math.min(rows - 1, Math.floor((y + radius) / GRID_CELL));
      const r2 = radius * radius;
      for (const name of layer ? [layer] : LAYERS) {
        const cells = grids[name];
        for (let cy = minY; cy <= maxY; cy++) {
          for (let cx = minX; cx <= maxX; cx++) {
            const bucket = cells.get(cy * cols + cx);
            if (!bucket) continue;
            for (let k = 0; k < bucket.length; k++) {
              const entry = bucket[k];
              const dx = entry.star.x - x;
              const dy = entry.star.y - y;
              if (dx * dx + dy * dy <= r2) out.push(entry);
            }
          }
        }
      }
      return out;
    },
  };
}

/**
 * Does a disc cover every pixel of a w x h canvas? Conservatively: the farthest
 * corner has to be inside by `margin` pixels, so no covered pixel is one the
 * disc's antialiased edge only partly reaches.
 *
 * @param {number} x - Disc centre, pixels
 * @param {number} y - Disc centre, pixels
 * @param {number} r - Disc radius, pixels
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 * @param {number} [margin] - Pixels of slack at the farthest corner
 * @returns {boolean} True when the whole canvas is inside the disc
 */
export function discCoversRect(x, y, r, w, h, margin = 2) {
  const fx = Math.max(Math.abs(x), Math.abs(x - w));
  const fy = Math.max(Math.abs(y), Math.abs(y - h));
  return Math.sqrt(fx * fx + fy * fy) + margin <= r;
}

/**
 * What a ripple looks like right now, independent of which star is asked.
 *
 * @param {object} ripple - A gravity ripple
 * @param {number} zoom - The camera zoom
 * @returns {{amplitude: number, wavelength: number, radius: number, progress: number}}
 */
function rippleWave(ripple, zoom) {
  const now = performance.now();
  const age = now - ripple.created;
  const mass = ripple.mass || 1.0;
  const gw = ripple.gw_strength !== undefined ? ripple.gw_strength : 1.0;
  const fade = ripple._fade !== undefined ? ripple._fade : 1.0;
  let amplitude = (8 + 10 * Math.log10(mass + 1)) * fade * gw;
  let wavelength = 80 + 40 * Math.log10(mass + 1);
  if (ripple.kilonova) {
    amplitude = (10 + 12 * Math.log10(mass + 1)) * fade * gw * 1.2;
  } else if (ripple.nswd_merger) {
    amplitude = (12 + 15 * Math.log10(mass + 1)) * fade * gw * 1.5;
    wavelength = 100 + 50 * Math.log10(mass + 1);
  } else if (ripple.wdwd_merger) {
    amplitude = (6 + 8 * Math.log10(mass + 1)) * fade * gw * 1.2;
    wavelength = 60 + 30 * Math.log10(mass + 1);
  }
  const c = 0.18;
  return {
    amplitude,
    wavelength,
    radius: c * age * zoom,
    progress: age / ripple.duration,
  };
}

/**
 * How far one region displaces a star at a screen position.
 *
 * The profiles are unchanged from what they were when every star was tested
 * against every object: a 1/b Einstein-angle falloff for a lens, tapered to
 * zero at the edge so the patch has no seam, and the same sine envelope for a
 * ripple. Only which stars are asked has changed.
 *
 * @param {object} region - From distortionRegions
 * @param {number} sx - Star position, screen pixels
 * @param {number} sy - Star position, screen pixels
 * @param {number} zoom - The camera zoom, which sets how far a ripple has run
 * @returns {?{dx: number, dy: number, blur: number, color: string}} Displacement,
 *   in an object that is reused by the next call: read it before asking again
 */
const pushScratch = { dx: 0, dy: 0, blur: 0, color: '#fff' };
export function displacementFrom(region, sx, sy, zoom) {
  const dx = sx - region.x;
  const dy = sy - region.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (region.kind === 'lens') {
    if (dist >= region.r) return null;
    const core = Math.max(region.r * 0.12, 1e-6);
    const b = Math.max(dist, core);
    const deflection = (region.strength * region.r * core) / b;
    const edge = 1 - dist / region.r;
    const lens = deflection * edge * edge;
    if (!(lens > 0)) return null;
    pushScratch.dx = (dx / (dist + 1e-6)) * lens;
    pushScratch.dy = (dy / (dist + 1e-6)) * lens;
    pushScratch.blur = region.blur * edge;
    pushScratch.color = region.color;
    return pushScratch;
  }

  // A ripple. Its amplitude, wavelength and the wavefront are the same for
  // every star in the region, so they are worked out once per region, at one
  // instant, instead of once per star (each with a clock read and a handful of
  // logarithms).
  if (dist >= region.r || dist <= 8) return null;
  const ripple = region.source;
  const w = region.wave || (region.wave = rippleWave(ripple, zoom));
  const phase = (dist - w.radius) / w.wavelength;
  const local = w.amplitude * Math.exp(-Math.abs(phase));
  const progress = w.progress;
  let factor = local * Math.sin(phase * Math.PI * 2 - progress * Math.PI * 2);
  if (ripple.kilonova) factor *= 1 + Math.sin(progress * Math.PI * 3) * 0.15;
  else if (ripple.nswd_merger) {
    factor *= 1 + Math.sin(progress * Math.PI * 3) * 0.2;
  }
  pushScratch.dx = (dx / dist) * factor;
  pushScratch.dy = (dy / dist) * factor;
  pushScratch.blur = 0;
  pushScratch.color = '#fff';
  return pushScratch;
}
