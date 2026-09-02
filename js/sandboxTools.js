// =============================================================================
// Sandbox measurement tools
// -----------------------------------------------------------------------------
// A ruler, a protractor and a stopwatch that live over the live simulation, plus
// two pieces of instrumentation that are always on: a scale bar and an elapsed
// simulated-time readout.
//
// The lessons already had measuring instruments and the sandbox had none, which
// meant a student could measure a period inside a lesson panel and then be given
// a whole simulation with nothing to measure it with. The arithmetic those
// instruments are built out of - a round number for a scale bar, an angle
// between two rays, a stopwatch that latches - is in js/instruments.js and is
// shared with the lesson widgets rather than written twice.
//
// Two rules shape everything here:
//
//   Every handle is stored in world coordinates. A ruler pinned to two screen
//   positions would slide off the thing it was measuring the moment the view
//   was panned or zoomed, and would report a different length each time. Stored
//   in the world, it stays on what it was put on and its reading does not
//   change with the zoom - which is the only behaviour that makes the number
//   trustworthy.
//
//   Everything draws onto the simulation canvas, in screen space, at the end of
//   the frame. That is what puts it into an exported screenshot: the export
//   composites the starfield and this canvas, so a screenshot documents its own
//   spatial and temporal scale without a second rendering path that could
//   disagree with the live one.
//
// This module owns no physics. It reads positions and the simulated clock and
// draws; nothing it does can change a trajectory.
// =============================================================================

import { AU_METERS } from './constants.js';
import { SIM_UNITS_PER_AU, formatTime } from './units.js';
import {
  world_to_screen,
  screen_to_world,
  getSimulationTime,
  bh_list,
  stars,
  neutron_stars,
  white_dwarfs,
  galaxies,
  planets,
  gas_giants,
  asteroids,
  comets,
} from './physics.js';
import {
  scaleBar,
  angleAtVertex,
  bearingDegrees,
  LatchStopwatch,
  INSTRUMENT_MONO,
} from './instruments.js';
import { formatNumber } from './format.js';
import { t } from './i18n/index.js';

/** Metres in one simulation length unit. */
const METERS_PER_UNIT = AU_METERS / SIM_UNITS_PER_AU;

// The instruments are drawn in one accent family so they read as a set and as
// something laid over the scene rather than part of it. Deliberately not the
// vector overlay's colors, which mean physical quantities.
const TOOL_INK = 'rgba(226, 240, 255, 0.95)';
const TOOL_LINE = 'rgba(120, 210, 255, 0.95)';
const TOOL_LINE_SOFT = 'rgba(120, 210, 255, 0.45)';
const TOOL_SHADOW = 'rgba(4, 8, 16, 0.85)';
const HANDLE_RADIUS = 7;
const GRAB_RADIUS = 14;

const tools = {
  ruler: {
    active: false,
    /** Both ends, in world units. */
    a: { x: -120, y: 0 },
    b: { x: 120, y: 0 },
  },
  protractor: {
    active: false,
    vertex: { x: 0, y: 0 },
    arm1: { x: 140, y: 0 },
    arm2: { x: 0, y: 140 },
  },
  stopwatch: {
    active: false,
    watch: new LatchStopwatch(),
  },
  /** Which handle the pointer is currently holding, or null. */
  drag: null,
};

/** @returns {object} The live tool state. Exposed for tests, not for mutation. */
export const sandboxToolState = () => tools;

/**
 * Whether a tool is switched on.
 * @param {string} name - 'ruler' | 'protractor' | 'stopwatch'
 * @returns {boolean} True when it is on
 */
export const isToolActive = name => !!tools[name]?.active;

/**
 * Switch a tool on or off.
 *
 * A tool switched on is placed across the middle of the current view rather
 * than at fixed world coordinates, so it appears where the user is looking
 * whatever they have panned to and however far they have zoomed out.
 *
 * @param {string} name - Tool name
 * @param {HTMLCanvasElement} [canvas] - Used to place a newly shown tool
 * @param {boolean} [force] - Explicit state; toggles when omitted
 * @returns {boolean} The tool's new state
 */
export function toggleTool(name, canvas, force) {
  const tool = tools[name];
  if (!tool) return false;
  const next = force === undefined ? !tool.active : !!force;
  if (next && !tool.active && canvas) placeInView(name, canvas);
  tool.active = next;
  if (name === 'stopwatch' && !next) tools.stopwatch.watch.reset();
  return tool.active;
}

/** Lay a tool out across the visible part of the world. */
function placeInView(name, canvas) {
  const w = canvas?.width || 800;
  const h = canvas?.height || 600;
  const at = (fx, fy) => screen_to_world({ x: w * fx, y: h * fy });
  // Deliberately different thirds of the view: with both tools out and both
  // laid across the middle, the protractor's vertex landed on the ruler and the
  // first thing a user had to do was untangle them.
  if (name === 'ruler') {
    tools.ruler.a = at(0.24, 0.7);
    tools.ruler.b = at(0.58, 0.7);
  } else if (name === 'protractor') {
    tools.protractor.vertex = at(0.62, 0.4);
    tools.protractor.arm1 = at(0.82, 0.4);
    tools.protractor.arm2 = at(0.7, 0.18);
  }
}

// --- Pointer handling ---------------------------------------------------------

/** Every draggable handle currently on screen, nearest-first hit testing. */
function handles() {
  const out = [];
  if (tools.ruler.active) {
    out.push({ tool: 'ruler', key: 'a' }, { tool: 'ruler', key: 'b' });
  }
  if (tools.protractor.active) {
    out.push(
      { tool: 'protractor', key: 'vertex' },
      { tool: 'protractor', key: 'arm1' },
      { tool: 'protractor', key: 'arm2' }
    );
  }
  return out;
}

/**
 * Offer a pointer press to the tools.
 *
 * Called before the simulation's own hit testing, and returns true when a
 * handle took the press, so that grabbing the end of a ruler does not also
 * select the body underneath it or start dragging a new object into existence.
 *
 * @param {{x: number, y: number}} screenPt - Pointer position, canvas pixels
 * @returns {boolean} True when a tool captured the pointer
 */
export function toolsPointerDown(screenPt) {
  let best = null;
  let bestDist = GRAB_RADIUS;
  for (const h of handles()) {
    const world = tools[h.tool][h.key];
    const s = world_to_screen(world);
    const d = Math.hypot(s.x - screenPt.x, s.y - screenPt.y);
    if (d <= bestDist) {
      bestDist = d;
      best = h;
    }
  }
  if (!best) return false;
  tools.drag = best;
  return true;
}

/**
 * Move the held handle.
 * @param {{x: number, y: number}} screenPt - Pointer position, canvas pixels
 * @returns {boolean} True when a handle is being dragged
 */
export function toolsPointerMove(screenPt) {
  if (!tools.drag) return false;
  const { tool, key } = tools.drag;
  const world = screen_to_world(screenPt);
  if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) return true;
  // The vertex carries its arms with it, so a protractor can be moved onto a
  // body without having to re-aim both rays afterwards.
  if (tool === 'protractor' && key === 'vertex') {
    const dx = world.x - tools.protractor.vertex.x;
    const dy = world.y - tools.protractor.vertex.y;
    for (const arm of ['arm1', 'arm2']) {
      tools.protractor[arm] = {
        x: tools.protractor[arm].x + dx,
        y: tools.protractor[arm].y + dy,
      };
    }
  }
  tools[tool][key] = world;
  return true;
}

/** Release the held handle. @returns {boolean} True if one was held */
export function toolsPointerUp() {
  const held = !!tools.drag;
  tools.drag = null;
  return held;
}

/** @returns {boolean} True while a handle is held */
export const toolsDragging = () => !!tools.drag;

// --- The stopwatch ------------------------------------------------------------

/**
 * The bodies the stopwatch can be latched to, and the primary each one orbits.
 * @returns {Array} Massive bodies that could serve as a primary
 */
const primaries = () =>
  [...bh_list, ...stars, ...neutron_stars, ...white_dwarfs, ...galaxies].filter(
    b => b && b.alive !== false
  );

/**
 * The body a given orbiter is treated as going around: the one whose pull on it
 * is strongest right now.
 *
 * The same rule the orbit helper and the area-sweep overlay use, so a student
 * who latches the stopwatch to a planet times it about the body the rest of the
 * application also says it is orbiting.
 *
 * @param {object} body - The orbiter
 * @returns {?object} The dominant attractor, or null
 */
export function dominantPrimary(body) {
  if (!body) return null;
  let best = null;
  let bestPull = 0;
  for (const p of primaries()) {
    if (p === body) continue;
    const r2 = Math.max(
      1e-6,
      (p.pos.x - body.pos.x) ** 2 + (p.pos.y - body.pos.y) ** 2
    );
    const pull = p.mass / r2;
    if (pull > bestPull) {
      bestPull = pull;
      best = p;
    }
  }
  return best;
}

/** Find a live body by id across every list the stopwatch may latch to. */
function bodyById(id) {
  if (id == null) return null;
  const lists = [
    planets,
    gas_giants,
    asteroids,
    comets,
    stars,
    neutron_stars,
    white_dwarfs,
  ];
  for (const list of lists) {
    for (const b of list) if (b.id === id && b.alive !== false) return b;
  }
  return null;
}

/**
 * Latch the stopwatch to a body's periapsis passages, or unlatch it.
 * @param {?object} body - The body, or null for manual timing
 */
export function latchStopwatchTo(body) {
  tools.stopwatch.latchTarget = body || null;
  tools.stopwatch.watch.latchTo(body ? body.id : null);
}

/** @returns {?object} The body the stopwatch is latched to */
export const stopwatchTarget = () =>
  tools.stopwatch.latchTarget && bodyById(tools.stopwatch.latchTarget.id)
    ? tools.stopwatch.latchTarget
    : null;

/** @returns {LatchStopwatch} The stopwatch itself */
export const stopwatch = () => tools.stopwatch.watch;

/**
 * Advance the stopwatch by a step of simulated time, and feed the latch.
 *
 * Called once per integrated frame from the render loop, with the same dt the
 * physics was advanced by, so the stopwatch measures simulated time rather than
 * wall-clock time: pausing pauses it, and changing the simulation speed does
 * not change a measured period.
 *
 * @param {number} dtSim - Simulated time integrated this frame
 */
export function tickSandboxTools(dtSim) {
  const watch = tools.stopwatch.watch;
  watch.tick(dtSim);
  const target = stopwatchTarget();
  if (!target) {
    if (watch.latchMode === 'periapsis') latchStopwatchTo(null);
    return;
  }
  const primary = dominantPrimary(target);
  if (!primary) return;
  watch.feedRadius(
    Math.hypot(target.pos.x - primary.pos.x, target.pos.y - primary.pos.y)
  );
}

// --- Drawing ------------------------------------------------------------------

/** Text with a dark halo, so a reading survives being drawn over a star. */
function halo(ctx, text, x, y) {
  ctx.save();
  ctx.strokeStyle = TOOL_SHADOW;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.restore();
  ctx.fillText(text, x, y);
}

/** A grab handle, filled when it is the one being held. */
function drawHandle(ctx, s, held) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(s.x, s.y, HANDLE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = held ? TOOL_LINE : 'rgba(8, 14, 26, 0.75)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = TOOL_LINE;
  ctx.stroke();
  ctx.restore();
}

/**
 * A distance in simulation units, written in both AU and km.
 *
 * Both, always, and in that order: AU is the unit the scene is laid out in and
 * km is the one a student has a feel for, and a ruler that showed only whichever
 * one happened to be convenient would be a ruler whose units changed while you
 * were using it.
 *
 * @param {number} units - Distance in simulation length units
 * @returns {string} e.g. "1.42 AU  ·  2.13e8 km"
 */
export function rulerReading(units) {
  const au = units / SIM_UNITS_PER_AU;
  const km = (units * METERS_PER_UNIT) / 1000;
  return `${formatNumber(au, { sig: 4 })} AU  ·  ${formatNumber(km, { sig: 4 })} km`;
}

/** The ruler: a line between two world-anchored handles, with tick marks. */
function drawRuler(ctx) {
  const a = world_to_screen(tools.ruler.a);
  const b = world_to_screen(tools.ruler.b);
  const dxw = tools.ruler.b.x - tools.ruler.a.x;
  const dyw = tools.ruler.b.y - tools.ruler.a.y;
  const lengthUnits = Math.hypot(dxw, dyw);
  const px = Math.hypot(b.x - a.x, b.y - a.y);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = TOOL_LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  // Ticks along the ruler, one per tenth, drawn perpendicular to it. Skipped
  // when the two ends are close enough together on screen that they would be a
  // smear rather than a scale.
  if (px > 60) {
    const ux = (b.x - a.x) / px;
    const uy = (b.y - a.y) / px;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = TOOL_LINE_SOFT;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const cx = a.x + (b.x - a.x) * t;
      const cy = a.y + (b.y - a.y) * t;
      const len = i % 5 === 0 ? 9 : 5;
      ctx.moveTo(cx - uy * len, cy + ux * len);
      ctx.lineTo(cx + uy * len, cy - ux * len);
    }
    ctx.stroke();
  }

  drawHandle(ctx, a, tools.drag?.tool === 'ruler' && tools.drag.key === 'a');
  drawHandle(ctx, b, tools.drag?.tool === 'ruler' && tools.drag.key === 'b');

  ctx.font = `600 12px ${INSTRUMENT_MONO}`;
  ctx.fillStyle = TOOL_INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  halo(ctx, rulerReading(lengthUnits), (a.x + b.x) / 2, (a.y + b.y) / 2 - 12);
  ctx.restore();
}

/** The protractor: a vertex, two arms, an arc between them and the angle. */
function drawProtractor(ctx) {
  const v = world_to_screen(tools.protractor.vertex);
  const p1 = world_to_screen(tools.protractor.arm1);
  const p2 = world_to_screen(tools.protractor.arm2);
  // Measured in world coordinates, not screen ones. The canvas transform flips
  // y, so an angle read off the screen positions would be the mirror image of
  // the angle in the simulation - equal for the enclosed angle, but not for
  // anything built on top of it.
  const deg = angleAtVertex(
    tools.protractor.vertex,
    tools.protractor.arm1,
    tools.protractor.arm2
  );

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = TOOL_LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(v.x, v.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.moveTo(v.x, v.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  const r = Math.min(
    56,
    Math.max(
      18,
      Math.min(
        Math.hypot(p1.x - v.x, p1.y - v.y),
        Math.hypot(p2.x - v.x, p2.y - v.y)
      ) * 0.55
    )
  );
  const a1 = Math.atan2(p1.y - v.y, p1.x - v.x);
  const a2 = Math.atan2(p2.y - v.y, p2.x - v.x);
  // The short way round, so the arc drawn is the angle reported.
  let sweep = a2 - a1;
  while (sweep > Math.PI) sweep -= 2 * Math.PI;
  while (sweep < -Math.PI) sweep += 2 * Math.PI;
  ctx.strokeStyle = TOOL_LINE_SOFT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(v.x, v.y, r, a1, a1 + sweep, sweep < 0);
  ctx.stroke();

  drawHandle(
    ctx,
    v,
    tools.drag?.tool === 'protractor' && tools.drag.key === 'vertex'
  );
  drawHandle(
    ctx,
    p1,
    tools.drag?.tool === 'protractor' && tools.drag.key === 'arm1'
  );
  drawHandle(
    ctx,
    p2,
    tools.drag?.tool === 'protractor' && tools.drag.key === 'arm2'
  );

  ctx.font = `600 12px ${INSTRUMENT_MONO}`;
  ctx.fillStyle = TOOL_INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labelAt = a1 + sweep / 2;
  halo(
    ctx,
    Number.isFinite(deg) ? `${deg.toFixed(1)}°` : '—',
    v.x + Math.cos(labelAt) * (r + 20),
    v.y + Math.sin(labelAt) * (r + 20)
  );
  ctx.restore();
}

// Whether this frame is being drawn to be saved.
//
// The clock, the stopwatch and the vector key are all in the readout panel,
// where the live numbers are, so painting them over the simulation as well is
// telling the user the same thing twice in two places. But a screenshot is not
// the readout: it is the canvas and the starfield and nothing else, and an
// image that cannot say how big or how long it is is a picture of some dots.
//
// So they are drawn for the frame the screenshot is taken from, and not
// otherwise. The scale bar stays either way: it is the one reading that is
// about the picture rather than about the run.
let capturing = false;

/**
 * Draw the provenance line on the next frame, for a screenshot.
 * @param {boolean} on - True while a capture is in flight
 */
export const setCaptureMode = on => {
  capturing = Boolean(on);
};

/** @returns {boolean} True while a frame is being prepared for export */
export const isCapturing = () => capturing;

/**
 * The always-on instrumentation, drawn along the bottom-left edge: a scale bar,
 * and - for a frame being saved - the simulated clock, the stopwatch and the
 * vector key.
 *
 * All of it goes on the simulation canvas rather than into HTML, so that the
 * screenshot export - which composites the starfield and this canvas and
 * nothing else - carries the scale and the time with it. A screenshot that
 * cannot say how big or how long it is is a picture of some dots.
 *
 * It is a line, not a panel. The bordered box that used to stand here also
 * held the integrator's name and two conservation-drift percentages, which say
 * something about the numerical method rather than about the scenario; those
 * have moved into the readout, where the rest of the live numbers are, and
 * appear only when Settings asks for them.
 *
 * @param {CanvasRenderingContext2D} ctx - Screen-space context
 * @param {HTMLCanvasElement} canvas - For its size
 * @param {object} settings - The live settings object
 * @param {number} zoom - Pixels per simulation length unit
 * @param {number} bottomInset - Pixels of chrome to stay clear of at the bottom
 * @param {Array} legend - Vector-overlay legend rows, {color, label, dash}
 */
export function drawInstrumentation(
  ctx,
  canvas,
  settings,
  zoom,
  bottomInset = 0,
  legend = []
) {
  const W = canvas.width || 0;
  const H = canvas.height || 0;
  if (W < 240 || H < 200) return;

  // A phone in portrait has about a third of the width a laptop does, and the
  // panel is laid out as a label on the left and a value on the right; below
  // this the two meet in the middle and the longer rows have to give way.
  const narrow = W < 560;

  // What the canvas itself has to carry, as one line along the bottom rather
  // than as a panel.
  //
  // There used to be a bordered box here holding the clock, the stopwatch, the
  // vector key, the integrator's name and two conservation-drift percentages.
  // Most of that is a statement about the engine rather than about the
  // scenario, and none of it needed a box: it was five rows of chrome sitting
  // over the simulation in the corner opposite the readout, which is where
  // readings belong and where they now are.
  //
  // What stays on the canvas is what a saved image cannot do without. A
  // screenshot has to document its own scale and its own clock, or it is a
  // picture of some objects at some size at some time. The vector key stays
  // for the same reason: an arrow whose colour is unexplained is a decoration.
  const readings = [];
  if (capturing && settings.show_elapsed_time !== false) {
    readings.push(formatTime(getSimulationTime()));
  }
  if (capturing) {
    for (const row of stopwatchRows()) {
      readings.push(narrow ? row.value : `${row.label} ${row.value}`);
    }
  }

  const pad = 12;
  const barY = H - pad - 10 - Math.max(0, bottomInset);

  ctx.save();
  ctx.font = `11px ${INSTRUMENT_MONO}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  // The key, one row of swatches above the scale line. Horizontal rather than
  // stacked: three arrows explained in three short phrases fit across the
  // bottom of any canvas wide enough to be worth drawing arrows on.
  let legendBottom = barY - 20;
  if (capturing && legend.length) {
    let x = pad + 2;
    const y = legendBottom;
    for (const l of legend) {
      const label = l.label;
      const w = 26 + ctx.measureText(label).width;
      // Anything that would run off the right edge is dropped rather than
      // wrapped: a key that reaches the far side of the canvas has stopped
      // being a key.
      if (x + w > W - pad) break;
      ctx.save();
      ctx.strokeStyle = l.color;
      ctx.lineWidth = l.dash ? 1.8 : 3;
      ctx.setLineDash(l.dash ? [5, 3] : []);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 18, y);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(214, 226, 244, 0.95)';
      ctx.fillText(label, x + 24, y);
      x += w + 14;
    }
    legendBottom -= 16;
  }

  if (settings.show_scale_bar !== false) {
    // The zoom is pixels per simulation unit, so this is the one line that
    // ties the drawn bar to the actual view transform. Nothing else in the
    // instrumentation depends on the zoom, which is why a scale bar is the
    // thing that makes a screenshot readable.
    const metersPerPx = METERS_PER_UNIT / (zoom > 0 ? zoom : 1);
    const barW = Math.min(160, W * 0.22);
    scaleBar(ctx, pad + 2, barY, barW, metersPerPx, {
      color: 'rgba(200, 214, 235, 0.9)',
      font: `11px ${INSTRUMENT_MONO}`,
    });
    // The clock sits on the scale bar's own baseline, past the end of the bar
    // and its label, so the two read as one line of provenance.
    if (readings.length) {
      ctx.font = `11px ${INSTRUMENT_MONO}`;
      ctx.fillStyle = TOOL_INK;
      ctx.fillText(readings.join('   '), pad + 2 + barW + 64, barY);
    }
  } else if (readings.length) {
    ctx.fillStyle = TOOL_INK;
    ctx.fillText(readings.join('   '), pad + 2, barY);
  }

  ctx.restore();
}

/**
 * What the stopwatch has to say, as label/value rows.
 *
 * Exported because the reading belongs in the readout panel with the other
 * measurements rather than in a second panel in the opposite corner. The
 * canvas still draws it beside the scale bar so that a screenshot carries its
 * own clock, and both callers get the same rows from here.
 *
 * @returns {Array<{label: string, value: string, emphasis?: boolean}>} Rows,
 *   empty when the stopwatch is not out
 */
export function stopwatchRows() {
  if (!tools.stopwatch.active) return [];
  const watch = tools.stopwatch.watch;
  const elapsed = watch.elapsed();
  const target = stopwatchTarget();
  const rows = [
    {
      label: target
        ? t('instrument.stopwatch.latched', {
            body: target.name || t('instrument.stopwatch.body'),
          })
        : t('instrument.stopwatch'),
      value:
        elapsed === null
          ? target
            ? t('instrument.stopwatch.waiting')
            : t('instrument.stopwatch.idle')
          : `${formatTime(elapsed)}  (${t(`instrument.stopwatch.state.${watch.status()}`)})`,
      emphasis: true,
    },
  ];
  if (watch.laps.length > 1) {
    const mean = watch.laps.reduce((a, b) => a + b, 0) / watch.laps.length;
    rows.push({
      label: t('instrument.stopwatch.mean', { n: watch.laps.length }),
      value: formatTime(mean),
    });
  }
  return rows;
}

/**
 * The draggable tools, drawn over the scene.
 * @param {CanvasRenderingContext2D} ctx - Screen-space context
 */
export function drawSandboxTools(ctx) {
  if (tools.ruler.active) drawRuler(ctx);
  if (tools.protractor.active) drawProtractor(ctx);
}

/** Exposed so a test can read what the protractor would report. */
export const protractorReading = () =>
  angleAtVertex(
    tools.protractor.vertex,
    tools.protractor.arm1,
    tools.protractor.arm2
  );

/** Exposed for the same reason: the bearing of each arm, in degrees. */
export const protractorArms = () => ({
  arm1: bearingDegrees(tools.protractor.vertex, tools.protractor.arm1),
  arm2: bearingDegrees(tools.protractor.vertex, tools.protractor.arm2),
});

/** Exposed so a test can read the ruler's length without a canvas. */
export const rulerLengthUnits = () =>
  Math.hypot(
    tools.ruler.b.x - tools.ruler.a.x,
    tools.ruler.b.y - tools.ruler.a.y
  );
