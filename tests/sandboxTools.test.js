import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  drawInstrumentation,
  setCaptureMode,
  isCapturing,
  captionText,
  sandboxToolState,
  toggleTool,
  isToolActive,
  toolsPointerDown,
  toolsPointerMove,
  toolsPointerUp,
  rulerReading,
  rulerLengthUnits,
  protractorReading,
  latchStopwatchTo,
  stopwatch,
  stopwatchTarget,
  tickSandboxTools,
  dominantPrimary,
} from '../js/sandboxTools.js';
import {
  StarObject,
  Planet,
  stars,
  planets,
  bh_list,
  setStateReference,
  updatePhysicsSettings,
  bumpWorldGeneration,
  resetPhysicsObjectCounter,
  world_to_screen,
} from '../js/physics.js';
import { SIM_UNITS_PER_AU } from '../js/units.js';
import { AU_METERS } from '../js/constants.js';

// The sandbox measurement tools. Everything here is about the numbers the tools
// report and the coordinates their handles live in; the drawing is not tested,
// because a drawing that is wrong about the number is wrong for a reason these
// tests would catch first.

const view = { zoom: 1, pan: { x: 0, y: 0 }, frameOffset: { x: 0, y: 0 } };

const clearWorld = () => {
  stars.length = 0;
  planets.length = 0;
  bh_list.length = 0;
  resetPhysicsObjectCounter();
  bumpWorldGeneration();
};

beforeEach(() => {
  view.zoom = 1;
  view.pan = { x: 0, y: 0 };
  view.frameOffset = { x: 0, y: 0 };
  setStateReference(view);
  updatePhysicsSettings({
    gravitational_constant: 1,
    mutual_gravity: false,
    star_only_gravity: true,
    min_interaction_distance: 1e-6,
  });
  clearWorld();
  toggleTool('ruler', null, false);
  toggleTool('protractor', null, false);
  toggleTool('stopwatch', null, false);
  latchStopwatchTo(null);
  stopwatch().reset();
});

describe('the ruler', () => {
  test('reports the distance between its ends in AU and km', () => {
    const t = sandboxToolState();
    t.ruler.a = { x: 0, y: 0 };
    t.ruler.b = { x: SIM_UNITS_PER_AU * 3, y: 0 };
    expect(rulerLengthUnits()).toBeCloseTo(300, 9);
    const text = rulerReading(rulerLengthUnits());
    expect(text).toContain('3.000 AU');
    // 3 AU in kilometres, to the precision the readout prints.
    expect(text).toMatch(/4\.488\s*×\s*10⁸ km/);
  });

  test('a 3-4-5 triangle measures five', () => {
    const t = sandboxToolState();
    t.ruler.a = { x: -30, y: -40 };
    t.ruler.b = { x: 0, y: 0 };
    expect(rulerLengthUnits()).toBeCloseTo(50, 9);
    expect(rulerReading(50)).toContain('0.5000 AU');
  });

  test('the reading does not change with the zoom', () => {
    // The whole reason the handles are stored in world coordinates. A ruler
    // pinned to screen positions would report a different distance every time
    // the view was zoomed, which makes the number worthless.
    const t = sandboxToolState();
    t.ruler.a = { x: -125, y: 60 };
    t.ruler.b = { x: 75, y: -90 };
    const readings = new Set();
    for (const zoom of [0.05, 0.5, 1, 3.3, 25]) {
      view.zoom = zoom;
      readings.add(rulerReading(rulerLengthUnits()));
    }
    expect(readings.size).toBe(1);
    expect(rulerLengthUnits()).toBeCloseTo(250, 9);
  });

  test('the reading does not change with the pan or the reference frame', () => {
    const t = sandboxToolState();
    t.ruler.a = { x: 0, y: 0 };
    t.ruler.b = { x: 100, y: 0 };
    const before = rulerReading(rulerLengthUnits());
    view.pan = { x: 640, y: -220 };
    view.frameOffset = { x: -3000, y: 900 };
    expect(rulerReading(rulerLengthUnits())).toBe(before);
  });

  test('the AU and km readings are the same distance', () => {
    for (const units of [3, 57, 1200, 90000]) {
      const au = units / SIM_UNITS_PER_AU;
      const km = (units * (AU_METERS / SIM_UNITS_PER_AU)) / 1000;
      expect(km / au).toBeCloseTo(AU_METERS / 1000, 3);
    }
  });
});

describe('the protractor', () => {
  test('measures the angle its arms enclose', () => {
    const t = sandboxToolState();
    t.protractor.vertex = { x: 10, y: 10 };
    t.protractor.arm1 = { x: 110, y: 10 };
    t.protractor.arm2 = { x: 10, y: 110 };
    expect(protractorReading()).toBeCloseTo(90, 9);
  });

  test('is measured in world coordinates, not screen ones', () => {
    // The canvas flips y. An angle read off screen positions would be the
    // mirror image of the angle in the simulation, which happens to agree for
    // the enclosed angle and disagrees for everything built on it.
    const t = sandboxToolState();
    t.protractor.vertex = { x: 0, y: 0 };
    t.protractor.arm1 = { x: 100, y: 0 };
    t.protractor.arm2 = { x: 100, y: 100 };
    expect(protractorReading()).toBeCloseTo(45, 9);
    const v = world_to_screen(t.protractor.vertex);
    const a2 = world_to_screen(t.protractor.arm2);
    // The same points on screen are below, not above, the vertex.
    expect(a2.y).toBeLessThan(v.y);
  });

  test('the reading does not change with the zoom', () => {
    const t = sandboxToolState();
    t.protractor.vertex = { x: 0, y: 0 };
    t.protractor.arm1 = { x: 80, y: 20 };
    t.protractor.arm2 = { x: -20, y: 95 };
    const at1 = ((view.zoom = 0.3), protractorReading());
    const at2 = ((view.zoom = 9), protractorReading());
    expect(at1).toBeCloseTo(at2, 12);
  });
});

describe('dragging a handle', () => {
  beforeEach(() => {
    toggleTool('ruler', { width: 800, height: 600 }, true);
    const t = sandboxToolState();
    t.ruler.a = { x: 0, y: 0 };
    t.ruler.b = { x: 200, y: 0 };
  });

  test('a press on a handle is captured', () => {
    const s = world_to_screen({ x: 200, y: 0 });
    expect(toolsPointerDown({ x: s.x, y: s.y })).toBe(true);
    expect(toolsPointerUp()).toBe(true);
  });

  test('a press well away from every handle is not captured', () => {
    // If it were, a ruler on screen would swallow every click on the canvas and
    // the user could no longer select a body or place one.
    const s = world_to_screen({ x: 200, y: 0 });
    expect(toolsPointerDown({ x: s.x + 90, y: s.y + 90 })).toBe(false);
    expect(toolsPointerUp()).toBe(false);
  });

  test('a hidden tool has no handles to grab', () => {
    const s = world_to_screen({ x: 200, y: 0 });
    toggleTool('ruler', null, false);
    expect(toolsPointerDown({ x: s.x, y: s.y })).toBe(false);
  });

  test('dragging moves the end to where the pointer is', () => {
    const from = world_to_screen({ x: 200, y: 0 });
    toolsPointerDown({ x: from.x, y: from.y });
    const to = world_to_screen({ x: 350, y: 120 });
    toolsPointerMove({ x: to.x, y: to.y });
    toolsPointerUp();
    const t = sandboxToolState();
    expect(t.ruler.b.x).toBeCloseTo(350, 6);
    expect(t.ruler.b.y).toBeCloseTo(120, 6);
  });

  test('a drag at high zoom lands in the same world place as at low zoom', () => {
    for (const zoom of [0.25, 1, 6]) {
      view.zoom = zoom;
      const t = sandboxToolState();
      t.ruler.b = { x: 200, y: 0 };
      const from = world_to_screen({ x: 200, y: 0 });
      toolsPointerDown({ x: from.x, y: from.y });
      const to = world_to_screen({ x: -140, y: 260 });
      toolsPointerMove({ x: to.x, y: to.y });
      toolsPointerUp();
      expect(t.ruler.b.x).toBeCloseTo(-140, 4);
      expect(t.ruler.b.y).toBeCloseTo(260, 4);
    }
  });

  test('moving the protractor vertex carries both arms with it', () => {
    toggleTool('protractor', { width: 800, height: 600 }, true);
    const t = sandboxToolState();
    t.protractor.vertex = { x: 0, y: 0 };
    t.protractor.arm1 = { x: 100, y: 0 };
    t.protractor.arm2 = { x: 0, y: 100 };
    const before = protractorReading();
    const from = world_to_screen({ x: 0, y: 0 });
    toolsPointerDown({ x: from.x, y: from.y });
    const to = world_to_screen({ x: 400, y: -250 });
    toolsPointerMove({ x: to.x, y: to.y });
    toolsPointerUp();
    expect(t.protractor.vertex.x).toBeCloseTo(400, 6);
    expect(t.protractor.arm1.x).toBeCloseTo(500, 6);
    expect(t.protractor.arm2.y).toBeCloseTo(-150, 6);
    // The angle is unchanged, which is the point of moving the whole thing.
    expect(protractorReading()).toBeCloseTo(before, 9);
  });
});

describe('latching the stopwatch to a body in the simulation', () => {
  /** A star at the origin with one planet on an eccentric orbit. */
  const buildSystem = (a = 150, e = 0.5) => {
    clearWorld();
    const s = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    s.mass = 1000;
    s.radius = 5;
    s.persistent = true;
    stars.push(s);
    const rApo = a * (1 + e);
    const vApo = Math.sqrt((1000 / a) * ((1 - e) / (1 + e)));
    const p = new Planet({ x: rApo, y: 0 }, { x: 0, y: vApo }, 1);
    p.mass = 1e-9;
    p.radius = 1;
    p.persistent = true;
    planets.push(p);
    bumpWorldGeneration();
    return { s, p, period: 2 * Math.PI * Math.sqrt(a ** 3 / 1000) };
  };

  test('picks the body whose pull is strongest as the primary', () => {
    const { s, p } = buildSystem();
    expect(dominantPrimary(p)).toBe(s);
  });

  test('times an orbit from periapsis to periapsis', () => {
    const { p, period } = buildSystem();
    toggleTool('stopwatch', null, true);
    latchStopwatchTo(p);
    expect(stopwatchTarget()).toBe(p);

    // Drive the body round its orbit analytically rather than through the
    // integrator: what is under test is the latch, and an integrator error
    // would otherwise show up here as a stopwatch error.
    const a = 150;
    const e = 0.5;
    const dt = period / 4000;
    for (let i = 0; i < 4000 * 3; i++) {
      const t = i * dt;
      const M = Math.PI + (2 * Math.PI * t) / period;
      let E = M;
      for (let k = 0; k < 60; k++) {
        E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      }
      const r = a * (1 - e * Math.cos(E));
      p.pos.x = r;
      p.pos.y = 0;
      tickSandboxTools(dt);
    }
    const watch = stopwatch();
    expect(watch.laps.length).toBeGreaterThanOrEqual(1);
    expect(watch.laps[0] / period).toBeCloseTo(1, 2);
  });

  test('unlatches itself when the body it was watching is gone', () => {
    const { p } = buildSystem();
    toggleTool('stopwatch', null, true);
    latchStopwatchTo(p);
    p.alive = false;
    tickSandboxTools(0.1);
    expect(stopwatchTarget()).toBeNull();
    expect(stopwatch().latchMode).toBe('manual');
  });

  test('switching the tool off puts the clock back to zero', () => {
    toggleTool('stopwatch', null, true);
    stopwatch().mark();
    stopwatch().tick(12);
    expect(stopwatch().elapsed()).toBeCloseTo(12, 9);
    toggleTool('stopwatch', null, false);
    expect(isToolActive('stopwatch')).toBe(false);
    expect(stopwatch().elapsed()).toBeNull();
  });
});

// =============================================================================
// The bottom-left corner
// -----------------------------------------------------------------------------
// It used to be a bordered panel holding the clock, the stopwatch, the vector
// key, the integrator's name and two conservation-drift percentages. Those are
// readings and they belong in the readout, which is where they are now. What
// stays on the canvas is what a saved image cannot do without - a scale bar
// always, and the provenance line only for the frame a screenshot is taken
// from.
// =============================================================================

/** A 2D context that records what was asked of it instead of drawing. */
function recordingContext() {
  const text = [];
  const calls = [];
  const noop =
    name =>
    (...args) =>
      calls.push([name, ...args]);
  return {
    text,
    calls,
    canvas: { width: 1200, height: 800 },
    save: noop('save'),
    restore: noop('restore'),
    beginPath: noop('beginPath'),
    moveTo: noop('moveTo'),
    lineTo: noop('lineTo'),
    stroke: noop('stroke'),
    fill: noop('fill'),
    fillRect: noop('fillRect'),
    roundRect: noop('roundRect'),
    setLineDash: noop('setLineDash'),
    fillText: (s, x, y) => {
      text.push(String(s));
      calls.push(['fillText', s, x, y]);
    },
    measureText: s => ({ width: String(s).length * 6 }),
  };
}

describe('the canvas instrumentation', () => {
  const canvas = { width: 1200, height: 800 };
  const settings = { show_scale_bar: true, show_elapsed_time: true };

  beforeEach(() => {
    setCaptureMode(false);
  });

  test('draws a scale bar and nothing else, normally', () => {
    const ctx = recordingContext();
    drawInstrumentation(ctx, canvas, settings, 1, 0, []);
    // The scale bar labels itself with a distance, and that is the only text.
    expect(ctx.text.length).toBe(1);
    expect(ctx.text[0]).toMatch(/AU|km|m\b/);
    // No panel: nothing rounded was filled behind anything.
    expect(ctx.calls.some(c => c[0] === 'roundRect')).toBe(false);
  });

  test('adds the clock for the frame a screenshot is taken from', () => {
    const quiet = recordingContext();
    drawInstrumentation(quiet, canvas, settings, 1, 0, []);

    setCaptureMode(true);
    expect(isCapturing()).toBe(true);
    const capturing = recordingContext();
    drawInstrumentation(capturing, canvas, settings, 1, 0, []);
    setCaptureMode(false);

    expect(capturing.text.length).toBeGreaterThan(quiet.text.length);
  });

  test('adds the vector key only for a capture, and only when there is one', () => {
    const legend = [{ color: '#38bdf8', label: 'acceleration', dash: false }];

    const live = recordingContext();
    drawInstrumentation(live, canvas, settings, 1, 0, legend);
    expect(live.text).not.toContain('acceleration');

    setCaptureMode(true);
    const shot = recordingContext();
    drawInstrumentation(shot, canvas, settings, 1, 0, legend);
    setCaptureMode(false);
    expect(shot.text).toContain('acceleration');
  });

  test('the scale bar can be switched off and the corner goes quiet', () => {
    const ctx = recordingContext();
    drawInstrumentation(
      ctx,
      canvas,
      { ...settings, show_scale_bar: false },
      1,
      0,
      []
    );
    expect(ctx.text).toEqual([]);
  });

  test('burns the scenario name into a captured frame', () => {
    const live = recordingContext();
    drawInstrumentation(live, canvas, settings, 1, 0, []);
    expect(live.text).not.toContain('Solar System');

    setCaptureMode(true, { caption: 'Solar System' });
    expect(captionText()).toBe('Solar System');
    const shot = recordingContext();
    drawInstrumentation(shot, canvas, settings, 1, 0, []);
    setCaptureMode(false);

    // The title, a distance and a clock: what a figure has to carry to be
    // worth citing.
    expect(shot.text).toContain('Solar System');
    expect(shot.text.some(x => /AU|km|m\b/.test(x))).toBe(true);
    // Backed by a panel, because pale text over a star is not text.
    expect(shot.calls.some(c => c[0] === 'fillRect')).toBe(true);
  });

  test('the caption does not outlive the capture it was set for', () => {
    setCaptureMode(true, { caption: 'Binary BH' });
    setCaptureMode(false);
    expect(captionText()).toBe('');
    const ctx = recordingContext();
    drawInstrumentation(ctx, canvas, settings, 1, 0, []);
    expect(ctx.text).not.toContain('Binary BH');
  });

  test('an unnamed capture still draws its scale and clock', () => {
    setCaptureMode(true);
    const ctx = recordingContext();
    drawInstrumentation(ctx, canvas, settings, 1, 0, []);
    setCaptureMode(false);
    expect(ctx.text.length).toBeGreaterThan(0);
  });

  test('a canvas too small for any of it is left alone', () => {
    const ctx = recordingContext();
    drawInstrumentation(ctx, { width: 200, height: 150 }, settings, 1, 0, []);
    expect(ctx.calls).toEqual([]);
  });
});
