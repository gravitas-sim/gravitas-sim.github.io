import {
  sampleFrame,
  renderScale,
  renderOverrides,
  onTierChange,
  setTier,
  currentTier,
  prefersReducedMotion,
} from './quality.js';

/** The last value of SETTINGS.quality_tier pushed into js/quality.js. */
let lastRequestedTier = null;
import {
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  debris,
  particles,
  neutron_stars,
  white_dwarfs,
  galaxies,
  accretion_disk_particles,
  updatePhysics,
  DT,
  gravity_ripples,
  screen_to_world,
  world_to_screen,
  findObjectAtPosition,
  setDetailScale,
  getTrailTick,
  trailBudget,
  barycenterBodies,
  SOLAR_MASS_UNIT,
  minInteractionDistance,
  getSimulationTime,
  conservationDrift,
  NOMINAL_RADIUS,
  DRAW_MIN_RADIUS_PX,
} from './physics.js';
import { hexToRgb, debugLog } from './utils.js';
import {
  LAYERS,
  LAYER_DEPTH,
  STAR_PALETTE,
  generateStarfield as buildStarfield,
  indexStarfield,
  beginCrowdFrame,
  crowdNotes,
  crowdTrails,
} from './bodyDrawSky.js';
import {
  LOD_POINT_MAX_PX,
  TRAIL_MIN_INTENSITY,
  glowStride,
  hitRadius,
  starColor,
  trailSpeedScale,
} from './bodyVisuals.js';
import { setBloomLayer } from './bodyDraw.js';
import {
  claim,
  frameScale,
  drawBodyMarks,
  labelFont,
  nameSpots,
  pixelScale,
} from './bodyLabels.js';
import { getWorldSeed } from './rng.js';
import { state, SETTINGS, registerCommands } from './appState.js';
import { barycenterOf, drawBarycenterCross } from './lesson/barycenter.js';
import { sceneFor } from './lesson/evolutionScene.js';
import { updateCanvasSummary, sceneWords } from './canvasSummary.js';

/**
 * Draw the crests a wave source has emitted.
 *
 * Centered on the source's own screen position, so the pattern travels with it
 * rather than with the camera. Bounded by construction: the crest list comes
 * from js/lesson/gwWavefronts.js, which caps it, and each ring is one stroked
 * circle.
 *
 * The low-quality tier gets fewer rings and no dashes. This is an
 * illustration, and on a machine that is struggling the simulation matters
 * more than the annotation over it.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas
 * @returns {void}
 */
function drawGwWavefronts(ctx) {
  const overlay = state.gwWaveOverlay;
  const crests = overlay.crests;
  if (!crests?.length) return;
  // The world origin, always. Both source stages put the system there: a
  // single body sits at it and a binary's two components are placed
  // symmetrically about it. The crests belong to the system rather than to
  // either component, so centring them on one body would be wrong for the
  // binary and indistinguishable for the other two.
  const at = world_to_screen({ x: 0, y: 0 });
  const lean = q('quality_tier') === 'low';
  const shown = lean ? crests.slice(-4) : crests;

  ctx.save();
  ctx.lineWidth = lean ? 1 : 1.4;
  if (!lean) ctx.setLineDash([]);
  for (const crest of shown) {
    const r = crest.r * state.zoom;
    if (!(r > 1)) continue;
    ctx.beginPath();
    ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(150, 214, 255, ${crest.alpha})`;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Whether the life-stage illustration is standing in for a body's own disc.
 *
 * True only for the one body the overlay names, and only at a stage that has
 * no photosphere to draw. Everything else paints normally.
 *
 * @param {object} obj - A body
 * @returns {boolean} Whether to skip its own painter
 */
function hiddenByEvolutionScene(obj) {
  const overlay = state.evolutionOverlay;
  if (!overlay?.active || obj.id !== overlay.bodyId || !overlay.frame) {
    return false;
  }
  return sceneFor(overlay.frame, {
    seed: overlay.seed,
    stillFrame: Boolean(overlay.stillFrame),
    lostFraction: overlay.lostFraction,
  }).hideStar;
}

/**
 * Draw the stage of a star's life around the protagonist.
 *
 * Reads state.evolutionOverlay, resolves the body it names, and paints the
 * shapes js/lesson/evolutionScene.js describes at that body's screen position
 * and drawn size. Nothing is written back: the overlay is a description of a
 * model moment, and this turns it into pixels.
 *
 * Every branch is bounded. The cloud is a fixed fourteen blobs, the shells
 * three, the ejecta three expanding fronts - none of it scales with anything a
 * reader can turn up, and none of it is a body the engine knows about.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas
 * @returns {void}
 */
function drawEvolutionScene(ctx) {
  const overlay = state.evolutionOverlay;
  // The protagonist can be a star for most of its life and a white dwarf, a
  // neutron star or a black hole at the end of it, so all four lists are
  // searched rather than the one the step started in.
  const body =
    stars.find(b => b.id === overlay.bodyId) ||
    white_dwarfs.find(b => b.id === overlay.bodyId) ||
    neutron_stars.find(b => b.id === overlay.bodyId) ||
    bh_list.find(b => b.id === overlay.bodyId);
  if (!body || !overlay.frame) return;

  const at = world_to_screen(body.pos);
  const drawn = Math.max(
    hitRadius(body.radius, body.obj_type, state.zoom, body.stageRadius),
    1
  );
  // Two kinds of illustration, two ways of sizing them. A wind blows off the
  // star's surface, so its shells are drawn against the star. A cloud and a
  // blast wave are not: a cloud is vastly larger than the star it becomes and
  // ejecta leave it behind at once, and both have no photosphere to measure
  // against anyway. Sizing those from the body gave a smudge a few pixels
  // across on the screen whose prose says "light-years".
  const scene = sceneFor(overlay.frame, {
    seed: overlay.seed,
    stillFrame: Boolean(overlay.stillFrame),
    lostFraction: overlay.lostFraction,
  });
  const viewSpan = Math.min(ctx.canvas.width, ctx.canvas.height);
  const room =
    scene.roomHint === 'scene'
      ? Math.max(70, Math.min(viewSpan / 5, 220))
      : Math.max(30, Math.min(drawn * 1.6, 240));

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // A collapsing cloud: no photosphere, so nothing here is a disc of star.
  for (const blob of scene.blobs) {
    ctx.beginPath();
    ctx.ellipse(
      at.x + blob.dx * room,
      at.y + blob.dy * room,
      blob.r * room,
      blob.r * room * 0.85,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgba(150, 170, 210, ${blob.alpha})`;
    ctx.fill();
  }
  if (scene.glow) {
    const g = ctx.createRadialGradient(
      at.x,
      at.y,
      0,
      at.x,
      at.y,
      Math.max(3, scene.glow.r * room * 3)
    );
    g.addColorStop(0, `rgba(255, 214, 150, ${scene.glow.alpha})`);
    g.addColorStop(1, 'rgba(255, 214, 150, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(at.x, at.y, Math.max(3, scene.glow.r * room * 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';

  // Material the track records the star having shed. Dashed, because these
  // are a schematic of a wind and not resolved shells anybody observed.
  if (scene.shells.length) {
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    for (const shell of scene.shells) {
      ctx.beginPath();
      ctx.ellipse(
        at.x,
        at.y,
        shell.rx * room,
        shell.ry * room,
        0,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = `rgba(196, 208, 232, ${shell.alpha})`;
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Ejecta, where the endpoint prescription expects an explosion. Solid and
  // brighter than the wind shells, because they are a different event.
  for (const front of scene.fronts) {
    ctx.beginPath();
    ctx.ellipse(
      at.x,
      at.y,
      front.rx * room,
      front.ry * room,
      0,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = `rgba(255, 196, 120, ${front.alpha})`;
    ctx.lineWidth = front.width ?? 2;
    ctx.stroke();
  }
  ctx.lineWidth = 1;

  // A remnant with no photosphere. The body itself is one of the engine's own
  // classes and is drawn by the ordinary painter; what this adds is the halo
  // that makes a four-pixel object findable on a canvas.
  if (scene.remnant?.drawn === 'mark') {
    ctx.beginPath();
    ctx.arc(at.x, at.y, Math.max(10, room * 0.3), 0, Math.PI * 2);
    ctx.strokeStyle =
      scene.remnant.kind === 'black-hole'
        ? 'rgba(255, 196, 120, 0.55)'
        : 'rgba(143, 168, 255, 0.45)';
    ctx.stroke();
  }
  ctx.restore();
}

import {
  getDragPreview,
  getOrbitPreview,
  checkAreaSweepValidity,
} from './preview.js';
import { updateSonification } from './audio.js';
// Through the bridge, not the module: view3d.js pulls in three.js, and the
// render loop importing it would put 256KB on the start-up path for a panel
// that begins closed.
import { update3DScene } from './view3dBridge.js';
import { updateLightCurve, drawObserverIndicator } from './lightCurve.js';
import { updateRadialVelocity } from './radialVelocity.js';
import { updateAstrometry } from './astrometry.js';
import { updateRotationCurve } from './instrumentGate.js';
import * as timeline from './timeline.js';
import {
  STEP_SECONDS,
  substepPlan,
  frameAdvance,
  pinnedStep,
} from './timestep.js';
import { drawOverlays } from './overlays.js';
import { readToken, onThemeChange } from './theme.js';
import { auToSim, formatTime } from './units.js';
import { habitableZoneBounds, stellarPropertiesFor } from './habitability.js';
import {
  resolveFrameOrigin,
  frameShifts,
  isWorldFrame,
  resetFrame,
} from './referenceFrame.js';
import {
  drawSandboxTools,
  drawInstrumentation,
  tickSandboxTools,
  stopwatchRows,
} from './sandboxTools.js';
import {
  drawBodyVectors,
  vectorLegendRows,
  drawPotentialWell,
} from './vectorOverlay.js';
import { isEmbed } from './presentation.js';
import { t, onLocaleChange } from './i18n/index.js';

// -----------------------------------------------------------------------------
// Palette: perceptual ramps for encoding physical quantities as color
// Speed is a continuous scalar, so it gets a sequential ramp that increases
// monotonically in lightness: readable in grayscale and for viewers with color
// vision deficiency, which a rainbow ramp is not. Folded in from js/palette.js
// (Prompt 107, slice 4) so the module extracted from js/ui.js adds no request.
// -----------------------------------------------------------------------------

// Viridis-like: dark blue → teal → green → yellow. Uniform in lightness, safe
// for every common form of color blindness.
const SPEED_STOPS = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
];

function sample(stops, t) {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return {
    r: Math.round(a[0] + (b[0] - a[0]) * f),
    g: Math.round(a[1] + (b[1] - a[1]) * f),
    b: Math.round(a[2] + (b[2] - a[2]) * f),
  };
}

// Speeds span orders of magnitude between a Kuiper-belt object and a body
// whipping past a black hole, so the ramp is logarithmic.
const SPEED_MIN = 2;
const SPEED_MAX = 260;
const LOG_MIN = Math.log(SPEED_MIN);
const LOG_SPAN = Math.log(SPEED_MAX) - LOG_MIN;

/**
 * Map an orbital speed onto the sequential ramp.
 * @param {number} speed - Speed in simulation units
 * @returns {{r:number,g:number,b:number}} RGB color
 */
function speedTrailColor(speed) {
  const s = Math.max(SPEED_MIN, Math.abs(speed) || SPEED_MIN);
  return sample(SPEED_STOPS, (Math.log(s) - LOG_MIN) / LOG_SPAN);
}

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

// The sky, and the three canvases it is painted onto once.
let starField = null;
let starIndex = null;
const starLayerCanvases = { far: null, mid: null, near: null };
/** True when the offscreen layers no longer match the field. */
let starLayersStale = true;
/** What the layers were built for, so a no-op rebuild can be skipped. */
let starLayerKey = '';

// Bloom offscreen canvas for soft glows
const bloomCanvas = document.createElement('canvas');
const bloomCtx = bloomCanvas.getContext('2d');

// Whether anything drew a glow into the bloom layer this frame.
let bloomDirty = false;

setBloomLayer(() => {
  bloomDirty = true;
  return bloomCtx;
});
// ---------------------------------------------------------------------------
// Trail glow sprites
// ---------------------------------------------------------------------------
// One pre-rendered radial gradient per color, reused for every trail point.
// Colors are quantised to 5 bits per channel so the cache stays small even
// when object colors vary; it is cleared outright if it ever grows past the
// cap, which cannot happen with the handful of base colors in practice.
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
 * Build the sky for the current seed, viewport and quality tier.
 *
 * Deterministic: the same world seed and the same window give the same sky, so
 * a reset, a replay, a screenshot, an A/B run and a shared link all show it.
 * The old field came from Math.random and was none of those things - two
 * students opening the same link got two different skies behind the same
 * simulation.
 */
function generateStarfield() {
  const W = starfieldCanvas.width;
  const H = starfieldCanvas.height;
  const tier = currentTier();
  starField = buildStarfield({
    seed: getWorldSeed(),
    width: W,
    height: H,
    tier,
    density: q('star_density'),
  });
  starIndex = indexStarfield(starField);
  starLayersStale = true;
  starfieldDirty = true;
  drawStarfield();
}

/** How much of the pan the sky moves by. Deliberately almost nothing. */
const PARALLAX = 0.02;

/** rgba() for a palette entry at an alpha. */
const starRgba = (index, alpha) => {
  const c = STAR_PALETTE[index] || STAR_PALETTE[0];
  return `rgba(${c.r},${c.g},${c.b},${alpha.toFixed(3)})`;
};

/**
 * Paint each parallax layer onto its own canvas.
 *
 * Called when the sky changes, not when the view does: a pan moves where the
 * layers are blitted, and moving a blit does not require repainting it.
 *
 * The twinkling stars are left out when they are going to be animated on top,
 * and painted in when they are not - which is what makes reduced motion a
 * still picture rather than a picture with a few holes in it.
 */
function rebuildStarLayers() {
  if (!starField) return;
  const { width: W, height: H } = starField;
  const animate = !prefersReducedMotion();
  const key = `${starField.seed}:${W}x${H}:${starField.count}:${animate}`;
  if (!starLayersStale && starLayerKey === key) return;

  for (const layer of LAYERS) {
    let canvas = starLayerCanvases[layer];
    if (!canvas) {
      canvas = document.createElement('canvas');
      starLayerCanvases[layer] = canvas;
    }
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.clearRect(0, 0, W, H);
    for (const star of starField.layers[layer]) {
      // A star that is going to be animated is drawn by the animation, not
      // here, or it would show through underneath its own twinkle.
      if (animate && star.twinkles) continue;
      ctx.fillStyle = starRgba(star.color, star.alpha);
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
  }

  starLayersStale = false;
  starLayerKey = key;
}

/**
 * Where a layer sits this frame, wrapped into the canvas.
 *
 * @param {string} layer - One of LAYERS
 * @param {number} W - Canvas width
 * @param {number} H - Canvas height
 * @returns {{x: number, y: number}} Offset in pixels, in [0, W) and [0, H)
 */
function layerOffset(layer, W, H) {
  const depth = LAYER_DEPTH[layer];
  const ox = state.pan.x * PARALLAX * depth;
  const oy = state.pan.y * PARALLAX * depth;
  return {
    x: ((ox % W) + W) % W,
    y: ((oy % H) + H) % H,
  };
}

// --- When the starfield actually needs repainting ----------------------------
//
// It lives on its own canvas, so last frame's paint is still on screen, and
// repainting it (parallax, ripple and lensing tests per star) cost 2-10ms a
// frame. It repaints when the view changes (pan, zoom), at 30Hz while a ripple
// or lensing object is moving, and at 20Hz otherwise; the twinkle phase alone
// is not worth a repaint.
let starfieldDirty = true;
let lastStarPaint = 0;
let lastStarPan = { x: 0, y: 0 };
let lastStarZoom = 0;

const STAR_DYNAMIC_MS = 1000 / 30;
const STAR_TWINKLE_MS = 1000 / 20;

/** Does anything on the starfield move by itself right now? */
function starfieldHasMotion() {
  if (q('show_gravitational_waves') && gravity_ripples.length) return true;
  if (q('show_object_lensing') === false) return false;
  if (q('lensing_quality') === 'off') return false;
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

/**
 * Every disc of sky that something is currently distorting, in screen pixels.
 *
 * This is the change that makes a crowded scene affordable. The distortion
 * used to be applied by testing every star against every ripple and every
 * compact object on every repaint - ten thousand stars against a dozen objects
 * was 19.6ms a repaint in Compact Object Zoo, more than the simulation itself.
 * The affected sky is a handful of small discs; everything outside them is
 * exactly the blitted layer and does not need to be reconsidered at all.
 *
 * @returns {Array<{x: number, y: number, r: number, kind: string, source: object}>}
 *   Discs, largest first
 */
function distortionRegions() {
  const regions = [];

  if (q('show_gravitational_waves')) {
    const now = performance.now();
    const c = 0.18;
    for (const ripple of gravity_ripples) {
      const age = now - ripple.created;
      if (age > ripple.duration + 1000) continue;
      const mass = ripple.mass || 1.0;
      const wavelength = 80 + 40 * Math.log10(mass + 1);
      const screen = world_to_screen({ x: ripple.x, y: ripple.y });
      const radius = c * age * state.zoom;
      // An annulus, not a disc.
      const band = 1.5 * wavelength;
      regions.push({
        x: screen.x,
        y: screen.y,
        r: radius + band,
        inner: Math.max(0, radius - band),
        kind: 'ripple',
        source: ripple,
      });
    }
  }

  if (q('show_object_lensing') !== false && q('lensing_quality') !== 'off') {
    const quality = q('lensing_quality') || 'medium';
    const qScale = quality === 'high' ? 1.6 : quality === 'low' ? 0.7 : 1;
    for (const bh of bh_list) {
      const massScale = Math.sqrt(Math.max(0.2, bh.mass / 10000));
      const r = Math.max(24, bh.radius * state.zoom * 3.2 * massScale * qScale);
      const screen = world_to_screen(bh.pos);
      regions.push({
        x: screen.x,
        y: screen.y,
        r,
        kind: 'lens',
        strength: 3.0 * qScale,
        blur: 2.5,
        color: '#fff',
      });
    }
    for (const ns of neutron_stars) {
      const r = Math.max(18, 1.5 * ns.radius * state.zoom);
      const screen = world_to_screen(ns.pos);
      regions.push({
        x: screen.x,
        y: screen.y,
        r,
        kind: 'lens',
        strength: 1.3,
        blur: 2.8,
        color: '#6cf',
      });
    }
    for (const wd of white_dwarfs) {
      const r = Math.max(16, 1.3 * wd.radius * state.zoom);
      const screen = world_to_screen(wd.pos);
      regions.push({
        x: screen.x,
        y: screen.y,
        r,
        kind: 'lens',
        strength: 0.9,
        blur: 2.0,
        color: '#e0f7ff',
      });
    }
  }

  return regions;
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
 * @returns {?{dx: number, dy: number, blur: number, color: string}} Displacement
 */
function displacementFrom(region, sx, sy) {
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
    return {
      dx: (dx / (dist + 1e-6)) * lens,
      dy: (dy / (dist + 1e-6)) * lens,
      blur: region.blur * edge,
      color: region.color,
    };
  }

  // A ripple.
  const ripple = region.source;
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
  const radius = c * age * state.zoom;
  const progress = age / ripple.duration;
  if (dist >= region.r || dist <= 8) return null;
  const phase = (dist - radius) / wavelength;
  const local = amplitude * Math.exp(-Math.abs(phase));
  let factor = local * Math.sin(phase * Math.PI * 2 - progress * Math.PI * 2);
  if (ripple.kilonova) factor *= 1 + Math.sin(progress * Math.PI * 3) * 0.15;
  else if (ripple.nswd_merger) {
    factor *= 1 + Math.sin(progress * Math.PI * 3) * 0.2;
  }
  return {
    dx: (dx / dist) * factor,
    dy: (dy / dist) * factor,
    blur: 0,
    color: '#fff',
  };
}

function drawStarfield() {
  const W = starfieldCanvas.width;
  const H = starfieldCanvas.height;
  if (!starField || starField.width !== W || starField.height !== H) {
    // The window changed size between the last build and this paint.
    generateStarfield();
    return;
  }
  rebuildStarLayers();

  starCtx.setTransform(1, 0, 0, 1, 0, 0);
  starCtx.clearRect(0, 0, W, H);

  const background = SETTINGS.show_ambient_lighting
    ? createAmbientGradient()
    : readToken('--space-far') || '#05060d';
  starCtx.fillStyle = background;
  starCtx.fillRect(0, 0, W, H);

  // Keep the ripple fade up to date; displacementFrom reads it.
  if (q('show_gravitational_waves')) {
    const now = performance.now();
    for (let i = gravity_ripples.length - 1; i >= 0; i--) {
      const ripple = gravity_ripples[i];
      const age = now - ripple.created;
      if (age > 15000) {
        gravity_ripples.splice(i, 1);
        continue;
      }
      ripple._fade =
        age > ripple.duration ? 1.0 - (age - ripple.duration) / 1000 : 1.0;
    }
  }

  // --- the sky, as three blits ------------------------------------------------
  const offsets = {};
  for (const layer of LAYERS) {
    const canvas = starLayerCanvases[layer];
    if (!canvas) continue;
    const off = layerOffset(layer, W, H);
    offsets[layer] = off;
    blitWrapped(canvas, off.x, off.y, W, H);
  }

  // --- the few that twinkle ---------------------------------------------------
  if (!prefersReducedMotion() && starField.twinklers.length) {
    const time = Date.now() * 0.001;
    for (const star of starField.twinklers) {
      const off = offsets[star.layer] || { x: 0, y: 0 };
      const sx = wrap(star.x - off.x, W);
      const sy = wrap(star.y - off.y, H);
      const flicker = Math.sin(time * 2 + star.phase) * 0.12 + 0.88;
      starCtx.fillStyle = starRgba(star.color, star.alpha * flicker);
      starCtx.fillRect(sx, sy, star.size, star.size);
    }
  }

  // --- and only the sky that something is bending -----------------------------
  const regions = distortionRegions();
  for (const region of regions) {
    if (!(region.r > 0)) continue;
    // Redraw the patch from scratch: background over the disc, then the stars
    // that belong in it, displaced.
    const inner = region.inner || 0;
    starCtx.beginPath();
    starCtx.arc(region.x, region.y, region.r, 0, 2 * Math.PI);
    if (inner > 0) {
      // Counter-clockwise, so the even-odd fill leaves the middle alone.
      starCtx.arc(region.x, region.y, inner, 0, 2 * Math.PI, true);
    }
    starCtx.fillStyle = background;
    starCtx.fill('evenodd');

    for (const layer of LAYERS) {
      const off = offsets[layer] || { x: 0, y: 0 };
      // The index is in unpanned coordinates, so the disc is asked for where
      // the layer's stars would have to be to land inside it.
      // Only the wrapped positions that can actually intersect the field. The
      // offsets are a fiftieth of the pan, so in almost every frame this is
      // one query rather than four.
      const xs = [region.x + off.x];
      const ys = [region.y + off.y];
      if (xs[0] - region.r > W) xs.push(xs[0] - W);
      else if (xs[0] + region.r > W) xs.push(xs[0] - W);
      if (ys[0] - region.r > H) ys.push(ys[0] - H);
      else if (ys[0] + region.r > H) ys.push(ys[0] - H);
      for (const cx of xs) {
        for (const cy of ys) {
          for (const found of starIndex.near(cx, cy, region.r)) {
            if (found.layer !== layer) continue;
            const star = found.star;
            let sx = wrap(star.x - off.x, W);
            let sy = wrap(star.y - off.y, H);
            if (inner > 0) {
              const ddx = sx - region.x;
              const ddy = sy - region.y;
              if (ddx * ddx + ddy * ddy < inner * inner) continue;
            }
            const push = displacementFrom(region, sx, sy);
            if (!push) continue;
            sx += push.dx;
            sy += push.dy;
            // A lensed star is drawn brighter and a little larger rather than
            // with a canvas shadow.
            const glow = push.blur > 0 ? Math.min(1, push.blur / 2.5) : 0;
            const size = star.size * (1 + glow * 0.9);
            const alpha = Math.min(1, star.alpha * (1 + glow * 0.6));
            starCtx.fillStyle = starRgba(star.color, alpha);
            starCtx.fillRect(sx, sy, size, size);
          }
        }
      }
    }
  }

  starCtx.globalAlpha = 1;
}

/** Wrap a coordinate into [0, size). */
const wrap = (v, size) => ((v % size) + size) % size;

/**
 * Blit one layer, wrapped, moving exactly one canvas worth of pixels: four
 * disjoint pieces that together are the canvas once, a quarter of the fill of
 * drawing it at four offsets (8.9ms down to the cost of an unpanned scene).
 *
 * @param {HTMLCanvasElement} canvas - The layer
 * @param {number} ox - Horizontal offset, already wrapped into [0, W)
 * @param {number} oy - Vertical offset, already wrapped into [0, H)
 * @param {number} W - Canvas width
 * @param {number} H - Canvas height
 */
function blitWrapped(canvas, ox, oy, W, H) {
  const rw = W - ox;
  const rh = H - oy;
  // The main body: everything below and right of the offset, moved to origin.
  if (rw > 0 && rh > 0) {
    starCtx.drawImage(canvas, ox, oy, rw, rh, 0, 0, rw, rh);
  }
  // The strip that wrapped round to the right.
  if (ox > 0 && rh > 0) {
    starCtx.drawImage(canvas, 0, oy, ox, rh, rw, 0, ox, rh);
  }
  // The strip that wrapped round to the bottom.
  if (oy > 0 && rw > 0) {
    starCtx.drawImage(canvas, ox, 0, rw, oy, 0, rh, rw, oy);
  }
  // And the corner both did.
  if (ox > 0 && oy > 0) {
    starCtx.drawImage(canvas, 0, 0, ox, oy, rw, rh, ox, oy);
  }
}

// Remove all lensing-related functions and variables below this point.
// Only keep starfield rendering, generation, and unrelated rendering logic.

// --- Reference-frame trail projection -----------------------------------------
// Trails are recorded in world coordinates. To draw them in another frame every
// point has to be moved by where that frame's origin was *when the point was
// recorded*, which no single canvas transform can express. These two pools let
// that happen without allocating on the render path: framedTrail refills them
// each time it is called and the caller draws before calling it again.
const framedPointPool = [];
const framedTrailView = [];

/**
 * A trail as the current reference frame would have seen it. Points older than
 * the origin's own history are dropped: they cannot be expressed in that frame.
 *
 * @param {Array} trail - The body's recorded trail, oldest first
 * @param {?object} shifts - From frameShifts, or null in the world frame
 * @param {number} newestTick - Tick the shifts are indexed against
 * @returns {Array} The trail itself in the world frame, or a reused view
 */
/**
 * A hex color for a star's trail, from the same temperature its disc uses.
 *
 * Memoised on the star beside the disc's own cache, because this runs for every
 * star on every frame and stellarPropertiesFor allocates.
 *
 * @param {Object} star - A StarObject
 * @returns {?string} A hex color, or null when the star has no usable state
 */
function trailColorForStar(star) {
  const teff = star._visual?.teff;
  if (star._trailColor && star._trailColorFor === teff) return star._trailColor;
  const { teffK } = stellarPropertiesFor(star, SOLAR_MASS_UNIT);
  const rgb = starColor(teffK);
  if (!rgb) return null;
  const hex = n => n.toString(16).padStart(2, '0');
  star._trailColor = `#${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`;
  star._trailColorFor = teff;
  return star._trailColor;
}

function framedTrail(trail, shifts, newestTick) {
  if (!shifts) return trail;

  // The unknown region is always a prefix - the origin's history is shorter, not
  // holed - so one scan back from the newest point finds where drawing starts.
  let start = 0;
  for (let i = trail.length - 1; i >= 0; i--) {
    const k = newestTick - trail[i].tick;
    if (k < 0 || k >= shifts.known.length || !shifts.known[k]) {
      start = i + 1;
      break;
    }
  }

  framedTrailView.length = 0;
  for (let i = start; i < trail.length; i++) {
    const p = trail[i];
    const k = newestTick - p.tick;
    let q = framedPointPool[framedTrailView.length];
    if (!q) {
      q = { x: 0, y: 0, age: 0, velocity: 0 };
      framedPointPool.push(q);
    }
    q.x = p.x + shifts.dx[k];
    q.y = p.y + shifts.dy[k];
    q.age = p.age;
    q.velocity = p.velocity;
    framedTrailView.push(q);
  }
  return framedTrailView;
}

const drawScene = () => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  frameScale(canvas);
  beginCrowdFrame();

  // Resolve the reference frame once per rendered frame. Everything downstream
  // reads state.frameOffset - the canvas transform below, world_to_screen for
  // hit-testing and bloom, the overlays - so choosing a frame does not need a
  // second code path anywhere. The world frame resolves to null and writes
  // zeroes, which is exactly the old behavior.
  let frameOrigin = resolveFrameOrigin(barycenterBodies());
  if (!frameOrigin && !isWorldFrame()) {
    // The body the frame was tied to has been absorbed or merged away. There
    // is no origin any more, so say so and fall back rather than leaving the
    // rail claiming a frame that no longer exists.
    resetFrame();
    frameOrigin = null;
  }
  state.frameOffset.x = frameOrigin ? frameOrigin.now.x : 0;
  state.frameOffset.y = frameOrigin ? frameOrigin.now.y : 0;

  // The potential well goes down first, under everything else on this canvas.
  // It is a picture of the field the bodies sit in, so anything drawn over it
  // is drawn over its own well, which is the right reading.
  if (SETTINGS.show_potential_well) {
    try {
      drawPotentialWell(
        ctx,
        canvas,
        screen_to_world,
        SETTINGS.gravitational_constant,
        minInteractionDistance(),
        [
          ...bh_list,
          ...stars,
          ...neutron_stars,
          ...white_dwarfs,
          ...galaxies,
          ...gas_giants,
          ...planets,
        ]
      );
    } catch {
      /* the underlay is never worth losing a frame over */
    }
  }

  ctx.save();
  ctx.translate(
    canvas.width / 2 + state.pan.x,
    canvas.height / 2 + state.pan.y
  );
  ctx.scale(state.zoom, -state.zoom);
  ctx.translate(-state.frameOffset.x, -state.frameOffset.y);

  if (SETTINGS.show_trails) {
    // The correction a trail point needs depends only on when it was recorded,
    // not on which body recorded it, so it is computed once for the whole scene
    // rather than once per body.
    const newestTick = getTrailTick();
    const shifts = frameOrigin
      ? frameShifts(frameOrigin, newestTick, trailBudget() + 2)
      : null;

    crowdTrails([
      ...planets,
      ...gas_giants,
      ...asteroids,
      ...comets,
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
      ...galaxies,
    ]).forEach(obj => {
      const trail = framedTrail(obj.trail, shifts, newestTick);
      if (obj.alive && trail.length > 1) {
        // A star with no authored color is colored by its temperature, the
        // same way its disc is. Without this branch the trails of every
        // generated star fell through to the settings default and a field of
        // stars of every temperature trailed one shade of blue.
        const baseColor =
          obj.baseColor ||
          (obj.obj_type === 'StarObject' ? trailColorForStar(obj) : null) ||
          SETTINGS[`${obj.obj_type.toLowerCase()}_base_color`] ||
          '#6495ed';
        // trail_color_mode 'speed' maps each trail point's recorded velocity
        // onto a perceptual ramp, which makes an eccentric orbit read at a
        // glance: bright and hot at periapsis, cool and dim at apoapsis.
        const bySpeed = SETTINGS.trail_color_mode === 'speed';
        const rgb = bySpeed
          ? speedTrailColor(Math.hypot(obj.vel.x, obj.vel.y))
          : hexToRgb(baseColor);
        // Relative to this object's own motion, so slow orbits still draw.
        const speedScale = trailSpeedScale(trail);

        if (SETTINGS.trail_style === 'Cloud') {
          // Draw cloud-like trail with multiple passes
          for (let pass = 0; pass < 3; pass++) {
            const velocityScale = Math.max(
              0.6,
              Math.min(1.8, trail[0].velocity / speedScale)
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
            ctx.moveTo(trail[0].x, trail[0].y);

            for (let i = 1; i < trail.length; i++) {
              const age_factor = 1 - trail[i].age / q('trail_length');
              const velocity_factor = Math.max(
                TRAIL_MIN_INTENSITY,
                Math.min(1, trail[i].velocity / speedScale)
              );
              const alpha = age_factor * velocity_factor * maxAlpha;

              ctx.globalAlpha = alpha;

              // Use quadratic curves for smoother trails
              if (i < trail.length - 1) {
                const cp_x = (trail[i].x + trail[i + 1].x) / 2;
                const cp_y = (trail[i].y + trail[i + 1].y) / 2;
                ctx.quadraticCurveTo(trail[i].x, trail[i].y, cp_x, cp_y);
              } else {
                ctx.lineTo(trail[i].x, trail[i].y);
              }
            }
            ctx.stroke();
          }

          // Draw bright core trail
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
          ctx.lineWidth = Math.max(0.8, trail[0].velocity / 120) / state.zoom;
          ctx.lineCap = 'round';
          ctx.beginPath();

          ctx.moveTo(trail[0].x, trail[0].y);

          for (let i = 1; i < trail.length; i++) {
            const age_factor = 1 - trail[i].age / q('trail_length');
            ctx.globalAlpha = age_factor * 0.9;
            ctx.lineTo(trail[i].x, trail[i].y);
          }
          ctx.stroke();
        } else if (SETTINGS.trail_style === 'Glow') {
          // One cached sprite per point (globalAlpha scales its baked 0.8/0.3/0
          // stops); the low tier blits fewer, spread over the whole trail, so the
          // stated span is kept (glowStride, js/bodyVisuals.js).
          const sprite = getGlowSprite(rgb.r, rgb.g, rgb.b);
          const prevAlpha = ctx.globalAlpha;
          const stride = glowStride(trail.length, currentTier());
          for (let i = 0; i < trail.length; i += stride) {
            const age_factor = 1 - trail[i].age / q('trail_length');
            const velocity_factor = Math.max(
              TRAIL_MIN_INTENSITY,
              Math.min(1, trail[i].velocity / speedScale)
            );
            const intensity = age_factor * velocity_factor;

            if (intensity > 0.05) {
              const radius = (3 + intensity * 7) / state.zoom;
              ctx.globalAlpha = intensity;
              ctx.drawImage(
                sprite,
                trail[i].x - radius,
                trail[i].y - radius,
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

          ctx.moveTo(trail[0].x, trail[0].y);

          for (let i = 1; i < trail.length; i++) {
            const age_factor = 1 - trail[i].age / q('trail_length');
            ctx.globalAlpha = age_factor * 0.8;
            ctx.lineTo(trail[i].x, trail[i].y);
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
    // Galaxies first, so a cluster member's diffuse glow sits behind anything
    // that happens to be in front of it rather than washing it out.
    ...galaxies,
    ...debris,
    ...asteroids,
    // Comets after the rocks and before the planets: a comet's tail is a wide
    // translucent wedge, and drawing it over a planet would tint the planet.
    // This collection was missing entirely, which is why the Solar System's ten
    // comets and every hand-placed one were never painted.
    ...comets,
    ...planets,
    ...gas_giants,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
  ].forEach(obj => {
    if (!obj.alive) return;
    // A body the lesson is drawing as something else. "Lives of Stars" runs
    // its protagonist back before the track begins, where there is no
    // photosphere and therefore nothing to draw a stellar disc for; the
    // illustration below paints a collapsing cloud in its place. Skipping the
    // disc is the point rather than a nicety - a main-sequence star drawn
    // under a cloud is the picture the reader is being asked to unlearn.
    if (hiddenByEvolutionScene(obj)) return;
    obj.draw(ctx);
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
        ctx.font = labelFont(12, 'Inter, system-ui, sans-serif');
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
          ctx.font = labelFont(11, 'Inter, system-ui, sans-serif');
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

  // Accretion tracers, drawn once. They used to be drawn here AND by their
  // parent black hole, so every one of them was painted twice - which on an
  // additive blend is not a subtle difference. Nothing creates them any more
  // (js/blackHole/render.js draws the flow instead), but a restored save can
  // still carry some, so the loop stays and is now the only place they appear.
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
      const baseRadius = hitRadius(
        hoveredObject.object.radius,
        hoveredObject.type,
        state.zoom
      );
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
  drawBodyMarks(ctx, world_to_screen);

  // Everything from here down is screen space, and everything from here down
  // lands in an exported screenshot, because the export composites the
  // starfield and this canvas and nothing else.
  //
  // The vectors go on before the measurement tools: a ruler laid across an
  // orbit should read over the arrows, not under them.
  let drawnVectors = null;
  try {
    const selected = state.selectedObject && state.selectedObject.object;
    if (selected) {
      drawnVectors = drawBodyVectors(ctx, selected, world_to_screen, SETTINGS);
    }
  } catch {
    /* an overlay is never worth losing a frame over */
  }

  // Render orbit preview as dashed screen-space path (green if bound, red if unbound)
  try {
    const orbitPreview = getOrbitPreview && getOrbitPreview();
    if (orbitPreview) {
      renderOrbitPreview(orbitPreview);
    }
  } catch {
    // ignore preview rendering errors
  }

  // The balance point, when a lesson step has asked for it.
  if (state.evolutionOverlay?.active) {
    drawEvolutionScene(ctx);
  }

  // Crests leaving a gravitational-wave source. Rings rather than a field:
  // this is a picture of something propagating outward at a finite speed and
  // nothing more - not a metric perturbation, not a potential, and not a
  // shell of matter. The lesson says so on every screen that shows it.
  if (state.gwWaveOverlay?.active) {
    drawGwWavefronts(ctx);
  }

  // The overlay carries only body ids; the point is recomputed from those
  // bodies every frame, so a student watches it stay still while two stars
  // swing round it (not a value pushed in by the panel). Any bodies.
  if (state.barycenterOverlay?.active) {
    const ids = state.barycenterOverlay.ids || [];
    const members = barycenterBodies().filter(o => ids.includes(o.id));
    const center = members.length >= 2 ? barycenterOf(members) : null;
    if (center) {
      state.barycenterOverlay.x = center.x;
      state.barycenterOverlay.y = center.y;
      state.barycenterOverlay.arms = members.map(o => ({
        id: o.id,
        name: o.name,
        r: Math.hypot(o.pos.x - center.x, o.pos.y - center.y),
      }));
      state.barycenterOverlay.separation =
        members.length === 2
          ? Math.hypot(
              members[0].pos.x - members[1].pos.x,
              members[0].pos.y - members[1].pos.y
            )
          : 0;
      drawBarycenterCross(
        ctx,
        world_to_screen(center),
        members.map(o => world_to_screen(o.pos))
      );
    }
  }
  sceneWords()?.drawMarker(ctx);

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
        // sits inside the colored region rather than out on the arc.
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
        const taken = nameSpots(); // fewer percentages, not a smear
        ctx.save();
        ctx.font = labelFont(11, 'ui-monospace, Menlo, monospace', '600');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        for (let w = 0; w < wedgeLabelAt.length; w++) {
          const at = wedgeLabelAt[w];
          if (!at || !total) continue;
          const s = world_to_screen({ x: px + at.x, y: py + at.y });
          const pct = `${((wedgeAreas[w] / total) * 100).toFixed(1)}%`;
          if (
            !claim(
              taken,
              s.x,
              s.y,
              ctx.measureText(pct).width,
              13 * pixelScale()
            )
          )
            continue;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.fillText(pct, s.x, s.y);
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
        ctx.font = labelFont(13, 'sans-serif', 'bold');
        ctx.fillStyle = 'rgba(200, 200, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(t('overlay.equalAreas'), sweepTop.x, sweepTop.y - 10);
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
    writeReadout(readoutHtml(drawnVectors));
    paintReadoutStatus();
  } else {
    writeReadout('');
  }

  // The same facts as text, for the description the canvas points at. Called
  // every frame and does nothing on almost all of them: it rewrites at most
  // once every 1.5 seconds, and only when the sentence has actually changed.
  //
  // Outside the show_dynamic_overlays branch on purpose. That setting hides a
  // visual panel; it must not also remove the only textual account of what is
  // on screen, which would make turning off an overlay an accessibility
  // regression for somebody who never saw it.
  updateCanvasSummary();

  // Last of all, so nothing paints over a reading.
  try {
    drawSandboxTools(ctx);
    drawInstrumentation(
      ctx,
      canvas,
      instrumentationSettings(),
      state.zoom,
      bottomChromeInset(),
      vectorLegendRows(drawnVectors, SETTINGS)
    );
  } catch {
    /* instrumentation is never worth losing a frame over */
  }
};

/**
 * The settings the canvas instrumentation is drawn under.
 *
 * The live settings everywhere except in an embed, where the integrator name
 * and the conservation drift are dropped. Those describe the *engine*; a figure
 * in a course page is about the scenario, and three rows of numerical-methods
 * diagnostics in the corner of somebody's reading is application chrome that
 * happens to be painted on a canvas. The scale bar and the clock stay, because
 * they describe the figure itself.
 *
 * A copy, never a write: presentation mode must not be able to change a setting
 * that a share link would then carry.
 *
 * @returns {Object} SETTINGS, or a shallow override of it
 */
// The run state lives in the panel's header rather than in its body: it is the
// one thing here that is a state and not a measurement, it is what a lecturer
// points at, and a colored dot reads across a room in a way a word does not.
const statusEl = () => document.getElementById('overlayStatus');
let paintedStatus = null;

function paintReadoutStatus() {
  const el = statusEl();
  if (!el) return;
  const key = state.paused ? 'paused' : 'running';
  if (key === paintedStatus) return;
  paintedStatus = key;
  el.dataset.state = key;
  const text = el.querySelector('.readout-status-text');
  if (text) text.textContent = t(`readout.status.${key}`);
}

// A language change rewrites the word without the run state having moved.
onLocaleChange(() => {
  paintedStatus = null;
  paintReadoutStatus();
});

/**
 * The live readout, top left: the handful of numbers that change while the
 * simulation runs. Object counts appear only for the kinds present.
 *
 * @param {Object|null} drawn - What the vector overlay drew this frame, so the
 *   key describes the arrows actually on screen
 * @returns {string} Markup for #overlayStats
 */
function readoutHtml(drawn) {
  const sections = [];

  // --- What the simulation is doing ---------------------------------------
  // Three numbers that are always worth having: how much simulated time has
  // passed, how far in the view is, and how fast it is running. Elapsed time
  // comes first because it is the one a measurement is quoted against.
  const metrics = [
    [t('readout.elapsed'), formatTime(getSimulationTime())],
    [t('readout.zoom'), `${state.zoom.toFixed(2)}\u00d7`],
    [t('readout.speed'), `${SETTINGS.sim_speed.toFixed(1)}\u00d7`],
    ...(sceneWords()?.frameMetric() || []),
  ];
  sections.push(
    `<dl class="readout-metrics">${metrics
      .map(
        ([k, v]) =>
          `<div class="readout-metric"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`
      )
      .join('')}</dl>`
  );

  // --- What is in the world ------------------------------------------------
  // Only the kinds that are there. A scenario with six planets and a black hole
  // said so on line one and then spent two more lines reporting six zeros; the
  // zeros are the least informative thing the panel could have been showing.
  const counts = [
    ['readout.count.planets', planets.length],
    ['readout.count.gasGiants', gas_giants.length],
    ['readout.count.asteroids', asteroids.length],
    ['readout.count.comets', comets.length],
    ['readout.count.stars', stars.length],
    ['readout.count.neutronStars', neutron_stars.length],
    ['readout.count.whiteDwarfs', white_dwarfs.length],
    ['readout.count.blackHoles', bh_list.length],
    ['readout.count.galaxies', galaxies.length],
    ['readout.count.particles', particles.length],
    ['readout.count.debris', debris.length],
  ].filter(([, n]) => n > 0);

  if (counts.length) {
    sections.push(
      `<ul class="readout-counts">${counts
        .map(
          ([id, n]) =>
            `<li class="readout-count"><b>${n}</b> <span>${escapeHtml(t(id))}</span></li>`
        )
        .join('')}</ul>`
    );
  } else {
    // An empty sandbox is a state worth naming rather than showing a blank gap.
    sections.push(
      `<p class="readout-empty">${escapeHtml(t('readout.count.empty'))}</p>`
    );
  }

  for (const note of [sceneWords()?.sourcesStatement(), ...crowdNotes()])
    if (note)
      sections.push(`<p class="readout-caveat">${escapeHtml(note)}</p>`);

  // --- Measurements in progress -------------------------------------------
  // The stopwatch and the vector key used to be painted on the canvas in a
  // panel of their own in the bottom-left corner. They are readings, and this
  // is where the readings are.
  const watch = stopwatchRows();
  if (watch.length) {
    sections.push(
      `<dl class="readout-metrics is-measure">${watch
        .map(
          r =>
            `<div class="readout-metric"><dt>${escapeHtml(r.label)}</dt><dd>${escapeHtml(r.value)}</dd></div>`
        )
        .join('')}</dl>`
    );
  }

  const legend = vectorLegendRows(drawn, SETTINGS);
  if (legend.length) {
    sections.push(
      `<ul class="readout-legend">${legend
        .map(
          l =>
            `<li><span class="readout-swatch${l.dash ? ' is-dashed' : ''}"
               style="--swatch:${escapeHtml(l.color)}" aria-hidden="true"></span>
             ${escapeHtml(l.label)}</li>`
        )
        .join('')}</ul>`
    );
  }

  // --- Conservation check ---------------------------------------------------
  if (SETTINGS.show_conservation_diagnostics && !isEmbed()) {
    const drift = conservationDrift();
    // The check's markup and words load the first time it is switched on, so
    // a launch that never asks for it does not download them.
    if (drift && readoutView)
      sections.push(readoutView.conservationReadoutHtml(drift, formatTime));
    else if (drift)
      readoutViewLoading ??= import('./conservationReadoutView.js').then(
        m => (readoutView = m)
      );
  }

  return sections.join('');
}

/** The conservation check's module, once loaded (js/conservationReadoutView.js). */
let readoutView = null;
let readoutViewLoading = null;

/**
 * Whether the reader has opened the conservation explanation.
 *
 * Module state rather than DOM state, because the DOM state does not survive:
 * the readout is rebuilt from a string, and anything the reader did to the old
 * elements went with them.
 */
let conservationHelpOpen = false;

/** The markup currently in the panel, so an identical frame writes nothing. */
let lastReadoutHtml = null;

/**
 * Put the readout on screen, without destroying what the reader was doing.
 * Most frames write nothing (the markup is identical); when it changes, the
 * <details> open state and focus on its summary are carried across, so the
 * explanation behaves like an element and not a repainted picture of one.
 *
 * @param {string} html - The readout's markup, or '' to clear it
 */
function writeReadout(html) {
  const volatileHost = readoutVolatileHost();
  if (html !== lastReadoutHtml) {
    lastReadoutHtml = html;
    volatileHost.innerHTML = html;
  }
  syncConservationHelp(Boolean(html) && html.includes('readout-conservation'));
}

/** The child that holds the numbers, created once. */
function readoutVolatileHost() {
  let host = overlayDiv.querySelector('.readout-volatile');
  if (!host) {
    overlayDiv.replaceChildren();
    host = document.createElement('div');
    host.className = 'readout-volatile';
    overlayDiv.append(host);
  }
  return host;
}

/**
 * The explanation, built once and kept.
 *
 * Deliberately NOT part of the markup above. That string is rebuilt whenever
 * any number in it changes, which for a live drift figure is several times a
 * second, and an element replaced several times a second cannot be clicked:
 * the press lands on a node that has already been detached. Keyboard focus had
 * the same problem. So the interactive part is a real element with a lifetime,
 * and only the numbers are repainted.
 *
 * @param {boolean} wanted - True when the conservation block is on screen
 */
function syncConservationHelp(wanted) {
  let details = overlayDiv.querySelector('.readout-conservation-help');
  if (!wanted) {
    details?.remove();
    return;
  }
  const fresh = !details;
  if (!details) {
    details = document.createElement('details');
    details.className = 'readout-conservation-help';
    details.addEventListener('toggle', () => {
      conservationHelpOpen = details.open;
    });
    overlayDiv.append(details);
  }
  // Rebuilt only when the language changed, so the element itself survives.
  const wantKey = t('readout.conservation.what');
  const rebuilt = details.dataset.key !== wantKey;
  if (rebuilt) {
    details.dataset.key = wantKey;
    const summary = document.createElement('summary');
    summary.textContent = wantKey;
    details.replaceChildren(summary);
    for (const id of [
      'readout.conservation.explain',
      'readout.conservation.doThis',
      'readout.conservation.notSpeed',
    ]) {
      const p = document.createElement('p');
      p.textContent = t(id);
      details.append(p);
    }
  }
  // Only when this element did not exist a moment ago, or was just rebuilt for
  // a language change. Assigning it on every sync raced the reader: `toggle`
  // fires asynchronously after the browser has opened the <details>, so a
  // frame landing between the keypress and the event read the old flag and
  // shut it again. The element survives repaints - that is what the comment at
  // the top of this function is about - so its own open state is the state,
  // and the flag exists only to carry that state across a rebuild.
  if (fresh || rebuilt) details.open = conservationHelpOpen;
}

/** Text into markup. Every value above is a number or a translated string. */
const escapeHtml = v =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function instrumentationSettings() {
  if (!isEmbed()) return SETTINGS;
  const override = { ...SETTINGS, show_conservation_diagnostics: false };
  // A figure 200px tall in a narrow course module has no room for a readout
  // panel: it would sit in the middle of the simulation rather than under it.
  // The scale bar stays - one line at the very bottom, and the one piece of
  // instrumentation a figure cannot do without.
  if ((canvas.height || 0) < 260) override.show_elapsed_time = false;
  return override;
}

// How much of the bottom-left corner the page's own chrome is using: the
// scale bar is painted on the canvas, the transport bar is HTML over it, and
// both move, so it is measured, a few times a second (a layout read mid-paint
// forces a style flush).
let chromeInset = 0;
let chromeMeasuredAt = 0;
const CHROME_MEASURE_MS = 400;

function measureChrome() {
  const now = performance.now();
  if (now - chromeMeasuredAt < CHROME_MEASURE_MS) return;
  chromeMeasuredAt = now;
  const H = window.innerHeight || canvas.height || 0;

  let inset = 0;
  // The lecture bar replaces the transport bar in lecture mode and sits in the
  // same band, so it has to be measured too or the canvas instrumentation is
  // drawn underneath it.
  for (const id of ['timelineBar', 'tutorialBtn', 'lectureBar']) {
    const el = document.getElementById(id);
    if (!el || el.hidden) continue;
    const r = el.getBoundingClientRect();
    // Only chrome that actually sits over the corner the instrumentation uses.
    if (r.width <= 0 || r.height <= 0) continue;
    // The lecture bar is centered, so it reaches the corner the instrumentation
    // uses without starting there; every other piece of chrome measured here
    // is anchored left.
    if (r.left > 520 && id !== 'lectureBar') continue;
    if (r.bottom < H - 160) continue;
    inset = Math.max(inset, H - r.top + 8);
  }
  chromeInset = inset;
}

function bottomChromeInset() {
  measureChrome();
  return chromeInset;
}

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

/**
 * Which token carries a type's color.
 *
 * The same eight hues the object glyphs and the canvas labels use, so the
 * marker under the pointer is recognizably the thing the picker showed and the
 * thing that will appear when the button is released.
 */
const PREVIEW_HUE = Object.freeze({
  Star: '--hue-star',
  Planet: '--hue-planet',
  GasGiant: '--hue-gasgiant',
  Asteroid: '--hue-asteroid',
  Comet: '--hue-comet',
  WhiteDwarf: '--hue-dwarf',
  NeutronStar: '--hue-neutron',
  BlackHole: '--hue-blackhole',
});

/** Cached, because a token read is a getComputedStyle on every frame. */
let previewHueCache = new Map();
onThemeChange(() => {
  previewHueCache = new Map();
});

/** The current theme's color for an object type. */
function previewHue(type) {
  const token = PREVIEW_HUE[type] || '--accent';
  if (!previewHueCache.has(token)) {
    previewHueCache.set(token, readToken(token) || '#9ad8ff');
  }
  return previewHueCache.get(token);
}

/**
 * Draw where the object will appear, as the object.
 *
 * The preview used to begin at an unmarked point on a dashed line, so the one
 * thing a reader wanted to know before letting go - what am I about to create,
 * and exactly where - was the one thing not shown. This marks the start with a
 * disc the size the body will actually be drawn at, in the type's own color,
 * and follows the same level of detail the renderer would: below a few pixels
 * it is a point, because that is what the body will be.
 *
 * @param {{x: number, y: number}} at - Start point in screen pixels
 */
function drawPreviewStart(at) {
  const type = SETTINGS.input_object_type;
  const hue = previewHue(type);
  // The radius the body will be drawn at, which is not its physical radius:
  // small bodies have a floor so they stay visible, and the preview has to
  // agree with what appears or it is a promise the renderer breaks.
  const world = NOMINAL_RADIUS[type] ?? NOMINAL_RADIUS.Planet;
  const screenR = Math.max(DRAW_MIN_RADIUS_PX, world * state.zoom);

  ctx.save();
  // A dark casing first, so the marker is visible over a white dwarf or a
  // daylight background as well as over empty sky.
  ctx.beginPath();
  ctx.arc(at.x, at.y, screenR + 2, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (screenR <= LOD_POINT_MAX_PX) {
    // Point level: a dot, plus a ring so the reader can find it.
    ctx.beginPath();
    ctx.arc(at.x, at.y, screenR, 0, 2 * Math.PI);
    ctx.fillStyle = hue;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(at.x, at.y, screenR + 5, 0, 2 * Math.PI);
    ctx.strokeStyle = hue;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.25;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(at.x, at.y, screenR, 0, 2 * Math.PI);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = hue;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hue;
    ctx.lineWidth = 1.75;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The drag, as an arrow.
 *
 * Drawn twice - a dark wide stroke and a light narrow one over it - so it holds
 * up against a star, a daylight theme and empty sky without needing to know
 * which it is on. A single translucent white line disappeared over anything
 * bright, and the direction of the throw is the whole content of the gesture.
 *
 * @param {{x: number, y: number}} from - Start, screen pixels
 * @param {{x: number, y: number}} to - Current pointer, screen pixels
 */
function drawVelocityArrow(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 6) return;

  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(14, Math.max(7, len * 0.22));
  const tip = { x: to.x, y: to.y };
  const back = { x: to.x - ux * head, y: to.y - uy * head };
  const wing = head * 0.55;

  const stroke = (color, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(back.x, back.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(back.x - uy * wing, back.y + ux * wing);
    ctx.lineTo(back.x + uy * wing, back.y - ux * wing);
    ctx.closePath();
    ctx.stroke();
  };

  ctx.save();
  stroke('rgba(0, 0, 0, 0.6)', 5);
  stroke('rgba(255, 255, 255, 0.95)', 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(back.x - uy * wing, back.y + ux * wing);
  ctx.lineTo(back.x + uy * wing, back.y - ux * wing);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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
      ctx.font = labelFont(14, 'sans-serif', 'bold');
      ctx.fillStyle = 'rgba(90, 160, 255, 0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      ctx.fillText(t('overlay.stableOrbit'), top.x, top.y - 8);
      ctx.restore();
    }
  }

  // Last, over the path: what is being placed, and which way it is being
  // thrown. Both are what the reader is deciding about.
  const start = world_to_screen(preview.points[0]);
  if (state.holdCurrent) {
    drawVelocityArrow(start, world_to_screen(state.holdCurrent));
  }
  drawPreviewStart(start);
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
// A paused simulation is a still image, but plenty still changes while paused
// (panning, zooming, dragging, scrubbing), so rather than enumerate those, any
// input opens a window of full-rate rendering. Outside it, while paused or
// while panels cover the whole canvas, the scene redraws at 10Hz.
const IDLE_REDRAW_MS = 100;
const INTERACTION_GRACE_MS = 700;
let interactionUntil = 0;
let lastIdleDraw = 0;
let coverCheckedAt = 0;
let covered = false;

/** Whether panels hide the whole canvas: a hit test on a grid, 4 times a second. */
function canvasCovered(now) {
  if (now - coverCheckedAt < 250) return covered;
  coverCheckedAt = now;
  covered = true;
  for (let i = 1; i < 8 && covered; i++)
    for (let j = 1; j < 8; j++)
      if (
        document.elementFromPoint(
          (window.innerWidth * i) / 8,
          (window.innerHeight * j) / 8
        ) === canvas
      ) {
        covered = false;
        break;
      }
  return covered;
}

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

// A pinned frame time (the bench, a controlled run, a measuring lesson step)
// replaces the measured one: js/timestep.js holds the pins.
export { MAX_SUBSTEPS, substepPlan, setFixedStep } from './timestep.js';

/** One frame's simulated time: substeps, then the stopwatch and the label. */
export function integrateFrame(dtSim) {
  const { substeps, step } = substepPlan(dtSim, SETTINGS.max_timestep);
  for (let i = 0; i < substeps; i++) updatePhysics(step);
  tickSandboxTools(dtSim);
  timeline.syncClock();
}

/** One step while paused and live (the period key). */
export function stepOnce() {
  if (!timeline.beginStep()) return false;
  integrateFrame(frameAdvance(STEP_SECONDS, SETTINGS.sim_speed, DT));
  timeline.recordFrame();
  return true;
}
registerCommands({ stepOnce });

// Original gameLoop function from index.html
const gameLoop = timestamp => {
  // A hidden document runs nothing, and the first frame back is a zero step.
  if (document.hidden) {
    state.last_time = 0;
    requestAnimationFrame(gameLoop);
    return;
  }
  const frameStart = performance.now();

  if (!state.last_time) state.last_time = timestamp;
  const measured = (timestamp - state.last_time) / 1000.0;
  state.last_time = timestamp;
  const dt_seconds = pinnedStep() || measured;
  const dt_sim = frameAdvance(dt_seconds, SETTINGS.sim_speed, DT);
  // While scrubbing, tickTimeline holds the restored frame and physics is
  // skipped so the recorded state is what gets drawn.
  const mayIntegrate = timeline.tickTimeline(dt_sim);
  if (!state.paused && mayIntegrate) {
    integrateFrame(dt_sim);
  }

  // While paused and untouched, the picture cannot change; drop to 10Hz rather
  // than repainting an identical frame. tickTimeline above still runs, so a
  // scrub is never missed, and any input restores full rate immediately.
  const idle =
    (state.paused || canvasCovered(frameStart)) &&
    !timeline.isReplaying() &&
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
    // Returns on a cheap guard when the panel is closed, like the light curve.
    updateRadialVelocity();
    updateAstrometry();
    updateRotationCurve();
    drawObserverIndicator(ctx, canvas.width, canvas.height);
    // Whatever a lazily loaded panel has registered. Empty, and free, until
    // one has.
    drawOverlays(ctx, canvas.width, canvas.height);
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

  // The tier measures the interval between frames (what the reader sees); the
  // adaptive-detail block below measures the work inside one. Both are wanted.
  // The reader's choice is pushed in here, not watched for with an event: a
  // string comparison per frame is cheaper than a listener kept correct across
  // every path that writes SETTINGS.
  if (SETTINGS.quality_tier !== lastRequestedTier) {
    lastRequestedTier = SETTINGS.quality_tier;
    setTier(lastRequestedTier || 'auto');
  }
  sampleFrame(timestamp);

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
    // Adaptive detail: adaptiveScale is applied at read time and never written
    // back into SETTINGS, or each pass would compound on the last.
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

/**
 * A setting, as the current quality tier wants it.
 *
 * The tier's overrides are applied at the point of reading rather than written
 * into SETTINGS. Writing them would be a one-way door: the reader's own choice
 * of lensing quality would be destroyed the first time a machine dipped below
 * the threshold, and restored to whatever the tier happened to say rather than
 * to what they picked.
 *
 * @param {string} key - A settings key
 * @returns {any} The effective value
 */
function q(key) {
  const overrides = renderOverrides();
  return overrides && key in overrides ? overrides[key] : SETTINGS[key];
}

// Original resizeCanvas function from index.html
function resizeCanvas() {
  // Never fall to zero: a 0x0 canvas makes drawing and culling degenerate, and
  // a page not yet presented (background tab) can report 0. renderScale() folds
  // the tier, the device-pixel ratio and a pixel budget into one multiplier on
  // the CSS box; js/ui.js converts pointer events through the same ratio.
  const cssW = window.innerWidth || 0;
  const cssH = window.innerHeight || 0;
  const scale = renderScale(cssW, cssH);
  const W = Math.max(1, Math.round(cssW * scale));
  const H = Math.max(1, Math.round(cssH * scale));
  if (canvas.width === W && canvas.height === H) return;
  canvas.width = W;
  canvas.height = H; // sim layer
  starfieldCanvas.width = W;
  starfieldCanvas.height = H; // star layer
  generateStarfield(); // redraw background
}

// Dragging a window edge fires resize continuously; coalescing into the next
// frame reallocates the canvases once per painted frame, not once per event.
let resizePending = false;
window.addEventListener('resize', () => {
  if (resizePending) return;
  resizePending = true;
  requestAnimationFrame(() => {
    resizePending = false;
    resizeCanvas();
  });
});

// A tier change can leave the backing store's size as it was, and resizeCanvas
// returns early then, so the tier says when its answer changed. Scheduled, not
// immediate: it arrives from inside sampleFrame, and reallocating canvases
// mid-frame drops a frame when the machine can least afford it.
onTierChange(() => {
  requestAnimationFrame(() => {
    // The tier also sets the star density, so the sky is regenerated even when
    // the store kept its size (about a millisecond, on a rare event).
    resizeCanvas();
    generateStarfield();
    starfieldDirty = true;
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
