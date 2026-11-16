import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The sandbox's time controls: one clock, a step you can take, Replay and
// Rewind to here (js/timeline.js, js/render.js).
//
// Thresholds are committed in tests/fixtures/time-controls/thresholds.json
// before the implementation existed. The comparison for "the world is back" is
// made through captureShareState with kind full: the capture a lesson's entry
// and exit use, and the one the timeline takes on leaving live.

const HERE = dirname(fileURLToPath(import.meta.url));
const THRESHOLDS = JSON.parse(
  readFileSync(join(HERE, 'fixtures/time-controls/thresholds.json'), 'utf8')
);

let world;
let physics;
let timeline;
let step;
let appState;
let tools;
let pauseAtEvent;

beforeAll(async () => {
  // world.js pulls in the renderer, which wants its canvases at import time.
  const find = globalThis.document.getElementById.bind(globalThis.document);
  globalThis.document.getElementById = id => {
    let el = find(id);
    if (!el) {
      el = globalThis.document.createElement(
        /canvas/i.test(id) ? 'canvas' : 'div'
      );
      el.id = id;
      globalThis.document.body.appendChild(el);
    }
    return el;
  };
  const ctx = new Proxy(
    {},
    {
      get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
      set: (t, k, v) => ((t[k] = v), true),
    }
  );
  globalThis.HTMLCanvasElement.prototype.getContext = () => ctx;
  world = await import('../js/world.js');
  physics = await import('../js/physics.js');
  await import('../js/bodyEffects.js');
  timeline = await import('../js/timeline.js');
  step = await import('../js/render.js');
  appState = await import('../js/appState.js');
  tools = await import('../js/sandboxTools.js');
  pauseAtEvent = await import('../js/pauseAtEvent.js');
  appState.registerCommands({
    captureShareState: world.captureShareState,
  });
});

/** A star with three planets on eccentric orbits, as a share link carries it. */
function buildWorld() {
  const star = new physics.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 });
  const bodies = [{ ...star.get_state(), type: 'StarObject' }];
  for (let i = 1; i <= 3; i++) {
    const r = 180 * i;
    const planet = new physics.Planet(
      { x: r, y: 0 },
      { x: 0, y: Math.sqrt(1 / r) * 14 * (1 - 0.12 * i) }
    );
    bodies.push({ ...planet.get_state(), type: 'Planet' });
  }
  world.applyShareState({ s: 'None', b: bodies });
  physics.resetSimulationTime();
  timeline.resetTimeline();
  appState.state.paused = true;
}

/** The full capture the timeline takes, in the form the tests compare. */
const fullCapture = () =>
  world.captureShareState({
    kind: 'full',
    includeCamera: false,
    forExperiment: true,
  });

/** Largest relative difference over positions, velocities and masses. */
function worstRelative(a, b) {
  expect(b.b.length).toBe(a.b.length);
  let worst = 0;
  const rel = (x, y) =>
    x === y ? 0 : Math.abs(x - y) / Math.max(Math.abs(x), Math.abs(y), 1e-300);
  a.b.forEach((s, i) => {
    const o = b.b[i];
    worst = Math.max(
      worst,
      rel(s.pos.x, o.pos.x),
      rel(s.pos.y, o.pos.y),
      rel(s.vel.x, o.vel.x),
      rel(s.vel.y, o.vel.y),
      rel(s.mass, o.mass)
    );
  });
  return worst;
}

const TOL = THRESHOLDS.restore.relativeTolerance;

/** One frame of running at a speed, as the render loop takes it. */
function runFrame(speed) {
  const dt = (1 / 60) * speed * 50 * physics.DT;
  if (timeline.tickTimeline(dt) && !appState.state.paused) {
    step.integrateFrame(dt);
  }
  return dt;
}

describe('one clock', () => {
  beforeEach(buildWorld);

  test.each([1, 750])(
    'the label, the elapsed time and the stopwatch agree at speed %s',
    speed => {
      const shown = [];
      timeline.bindTimelineUI({
        onChange: info => shown.push(info.simClock),
        onClock: () => {},
      });
      appState.SETTINGS.sim_speed = speed;
      appState.state.paused = false;
      tools.stopwatch().reset();
      tools.stopwatch().mark();
      for (let i = 0; i < 40; i++) {
        runFrame(speed);
        timeline.recordFrame();
      }
      const elapsed = physics.getSimulationTime();
      expect(elapsed).toBeGreaterThan(0);
      expect(timeline.getSimClock()).toBe(elapsed);
      expect(shown.at(-1)).toBe(elapsed);
      expect(tools.stopwatch().elapsed()).toBeCloseTo(
        elapsed,
        Math.max(0, 9 - Math.floor(Math.log10(elapsed)))
      );
      // Every recorded frame is stamped with the clock it was taken at.
      const stamps = timeline.recordedFrames().map(f => f.t);
      expect(stamps.at(-1)).toBe(elapsed);
      expect(stamps).toEqual([...stamps].sort((a, b) => a - b));
    }
  );

  test('a restore sets the one clock to the frame it lands on', () => {
    appState.state.paused = false;
    const clocks = [];
    for (let i = 0; i < 10; i++) {
      runFrame(1);
      timeline.recordFrame();
      clocks.push(physics.getSimulationTime());
    }
    timeline.scrubTo(3);
    expect(physics.getSimulationTime()).toBe(clocks[clocks.length - 1 - 3]);
    expect(timeline.getSimClock()).toBe(physics.getSimulationTime());
    timeline.returnToLive();
    expect(physics.getSimulationTime()).toBe(clocks.at(-1));
  });
});

describe('a step', () => {
  beforeEach(buildWorld);

  const settings = () => appState.SETTINGS;

  test.each([
    ['without a step cap', 0],
    ['with a step cap (several substeps)', 0.002],
  ])('one step equals one frame advance %s', (_, cap) => {
    settings().sim_speed = 5;
    settings().max_timestep = cap;
    physics.updatePhysicsSettings({ max_timestep: cap });
    appState.state.paused = true;
    const before = fullCapture();
    const t0 = physics.getSimulationTime();

    expect(step.stepOnce()).toBe(true);
    const viaStep = fullCapture();
    const tStep = physics.getSimulationTime();

    // The same step by hand, from the same state.
    world.applyShareState(JSON.parse(JSON.stringify(before)));
    physics.setSimulationTime(t0);
    const advance = (1 / 60) * 5 * 50 * physics.DT;
    const plan = (
      cap > 0 && advance > cap
        ? { substeps: Math.min(64, Math.ceil(advance / cap)) }
        : { substeps: 1 }
    ).substeps;
    for (let i = 0; i < plan; i++) physics.updatePhysics(advance / plan);
    const byHand = fullCapture();

    expect(tStep - t0).toBeCloseTo(advance, 12);
    expect(worstRelative(viaStep, byHand)).toBeLessThan(TOL);
    expect(timeline.getFrameCount()).toBeGreaterThanOrEqual(1);
    settings().max_timestep = 0;
    physics.updatePhysicsSettings({ max_timestep: 0 });
  });

  test('a step records the starting frame once and one frame per step', () => {
    expect(timeline.getFrameCount()).toBe(0);
    step.stepOnce();
    expect(timeline.getFrameCount()).toBe(2);
    step.stepOnce();
    step.stepOnce();
    expect(timeline.getFrameCount()).toBe(4);
  });

  test('a running world and a parked one take no step', () => {
    appState.state.paused = false;
    const t0 = physics.getSimulationTime();
    expect(step.stepOnce()).toBe(false);
    expect(physics.getSimulationTime()).toBe(t0);
    appState.state.paused = true;
    step.stepOnce();
    step.stepOnce();
    timeline.stepBack();
    expect(timeline.isScrubbing()).toBe(true);
    const parked = physics.getSimulationTime();
    expect(step.stepOnce()).toBe(false);
    expect(physics.getSimulationTime()).toBe(parked);
    timeline.returnToLive();
  });
});

describe('looking back and returning', () => {
  beforeEach(buildWorld);

  /** Run live for a while, then pause: some history to look at. */
  function recordSome(n = 30) {
    appState.state.paused = false;
    for (let i = 0; i < n; i++) {
      runFrame(5);
      timeline.recordFrame();
    }
  }

  test('Return to live restores the full capture within the threshold', () => {
    recordSome();
    appState.state.paused = false;
    const before = fullCapture();
    const clock = physics.getSimulationTime();
    const frames = timeline.getFrameCount();

    timeline.scrubTo(12);
    expect(timeline.isScrubbing()).toBe(true);
    // The world really is somewhere else while parked.
    expect(worstRelative(before, fullCapture())).toBeGreaterThan(1e-3);
    timeline.returnToLive();

    expect(timeline.isScrubbing()).toBe(false);
    expect(worstRelative(before, fullCapture())).toBeLessThan(TOL);
    expect(physics.getSimulationTime()).toBe(clock);
    // Nothing dropped: the recording is as long as it was, and the pause
    // state is the one the world was left in.
    expect(timeline.getFrameCount()).toBe(frames);
    expect(appState.state.paused).toBe(false);
  });

  test('the pause state held comes back, paused or running', () => {
    recordSome();
    appState.state.paused = true;
    timeline.scrubTo(5);
    appState.state.paused = false; // changed while parked
    timeline.returnToLive();
    expect(appState.state.paused).toBe(true);
  });

  test('a lesson step that sets the clock while parked is what Return to live resumes', () => {
    recordSome();
    appState.state.paused = false;
    appState.holdClock({ type: 'read' }, null); // a reading step holds ...
    timeline.scrubTo(5);
    appState.holdClock({ type: 'question' }, null); // ... the next one runs
    timeline.setParkedPause(appState.state.paused);
    expect(appState.state.paused).toBe(false);
    timeline.returnToLive();
    expect(appState.state.paused).toBe(false);
    // And the other way: a reading step reached while parked holds on return.
    timeline.scrubTo(5);
    appState.holdClock({ type: 'read' }, null);
    timeline.setParkedPause(appState.state.paused);
    timeline.returnToLive();
    expect(appState.state.paused).toBe(true);
    appState.holdClock({ type: 'question' }, null);
    expect(appState.state.paused).toBe(false);
  });

  test('a body the scrub dropped comes back from the capture, as itself', () => {
    recordSome();
    // A body born after the recording began: not in the early frames.
    const late = new physics.Planet({ x: 700, y: 50 }, { x: 0, y: 0.4 });
    physics.planets.push(late);
    const before = fullCapture();
    timeline.scrubTo(timeline.getFrameCount() - 1);
    expect(physics.planets.includes(late)).toBe(false);
    timeline.returnToLive();
    expect(worstRelative(before, fullCapture())).toBeLessThan(TOL);
    expect(physics.planets.length).toBe(4);
  });

  test('stepping back from live is a look, not a loss', () => {
    recordSome();
    const before = fullCapture();
    timeline.stepBack();
    timeline.stepBack();
    timeline.stepForward();
    timeline.stepForward();
    // Past the newest recorded frame, stepping forward is Return to live.
    timeline.stepForward();
    expect(timeline.isScrubbing()).toBe(false);
    expect(worstRelative(before, fullCapture())).toBeLessThan(TOL);
  });

  test('Replay ends in the live moment, and cancelled Replay does too', () => {
    recordSome();
    const dt = runFrame(5);
    void dt;
    // An armed watch the replay must not disturb.
    pauseAtEvent.armEvent(
      {
        kind: 'periapsis',
        bodyId: physics.planets[1].id,
        primaryId: physics.stars[0].id,
      },
      {
        resolveBody: id =>
          [...physics.planets, ...physics.stars].find(b => b.id === id) ?? null,
        pause: () => {},
        clockDays: () => physics.getSimulationTime(),
        transitLog: null,
        G: () => 1,
        onStep: () => () => {},
      }
    );
    const armedBefore = pauseAtEvent.armedEvent();
    expect(armedBefore).not.toBeNull();

    const before = fullCapture();
    const clock = physics.getSimulationTime();
    const frames = timeline.getFrameCount();

    // Played out: from the oldest frame to the live moment.
    appState.state.paused = true;
    const pausedBefore = appState.state.paused;
    expect(timeline.startReplay()).toBe(true);
    expect(timeline.isReplaying()).toBe(true);
    let guard = 0;
    while (timeline.isReplaying() && guard++ < 5000) timeline.tickTimeline(0.5);
    expect(timeline.isReplaying()).toBe(false);
    expect(timeline.isScrubbing()).toBe(false);
    expect(worstRelative(before, fullCapture())).toBeLessThan(TOL);
    expect(physics.getSimulationTime()).toBe(clock);
    expect(timeline.getFrameCount()).toBe(frames);
    expect(pauseAtEvent.armedEvent()).toEqual(armedBefore);
    expect(appState.state.paused).toBe(pausedBefore);

    // Cancelled part-way: the same return, by Escape or Pause.
    expect(timeline.startReplay()).toBe(true);
    for (let i = 0; i < 3; i++) timeline.tickTimeline(0.5);
    expect(timeline.isReplaying()).toBe(true);
    expect(physics.getSimulationTime()).toBeLessThan(clock);
    timeline.returnToLive();
    expect(timeline.isReplaying()).toBe(false);
    expect(worstRelative(before, fullCapture())).toBeLessThan(TOL);
    expect(physics.getSimulationTime()).toBe(clock);
    expect(timeline.getFrameCount()).toBe(frames);
    expect(pauseAtEvent.armedEvent()).toEqual(armedBefore);
    pauseAtEvent.disarm();
  });

  test('Replay shows the history forward at the current speed', () => {
    recordSome();
    timeline.startReplay();
    const seen = [];
    let guard = 0;
    while (timeline.isReplaying() && guard++ < 5000) {
      timeline.tickTimeline(0.25);
      seen.push(physics.getSimulationTime());
    }
    // Forward only, then the live moment last.
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    }
    expect(seen.length).toBeGreaterThan(3);
  });

  test('Rewind to here changes the world: later frames gone, clock set', () => {
    recordSome();
    const frames = timeline.getFrameCount();
    timeline.scrubTo(10);
    const at = physics.getSimulationTime();
    const shown = fullCapture();
    timeline.rewindToHere();
    expect(timeline.isScrubbing()).toBe(false);
    expect(timeline.getFrameCount()).toBe(frames - 10);
    expect(physics.getSimulationTime()).toBe(at);
    expect(timeline.recordedFrames().at(-1).t).toBe(at);
    // The shown frame is the world now, not a view of it.
    expect(worstRelative(shown, fullCapture())).toBeLessThan(TOL);
  });

  test('the recording is untouched by looking, and the export still reads it', () => {
    recordSome();
    const before = timeline.recordedFrames();
    timeline.scrubTo(7);
    timeline.scrubTo(2);
    timeline.returnToLive();
    const after = timeline.recordedFrames();
    expect(after.length).toBe(before.length);
    expect(after.map(f => f.t)).toEqual(before.map(f => f.t));
    expect(timeline.recordedExtent().frames).toBe(before.length);
  });
});

describe('the capture on leaving live', () => {
  test('is committed to a threshold that is a third of a frame', () => {
    expect(THRESHOLDS.capture.maxMilliseconds).toBe(5);
    expect(THRESHOLDS.capture.maxMilliseconds).toBeLessThan(16.7 / 3);
    expect(THRESHOLDS.restore.relativeTolerance).toBe(1e-11);
  });
});
