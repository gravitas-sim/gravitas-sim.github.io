import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  jest,
} from '@jest/globals';

// A lesson step's time and event window (js/investigations/eventWindow.js):
// a declared speed and pause, a watch the step arms for the student, and
// Replay and Rewind to here on the frames js/timeline.js recorded.
//
// The world is real (js/world.js, js/physics.js, js/timeline.js, the frame
// arithmetic of js/render.js) and so is the watcher (js/pauseAtEvent.js). Only
// the panel is a stand-in: it arms through the same armEvent with the same
// kind of dependency block, minus the DOM.

let world;
let physics;
let timeline;
let render;
let appState;
let events;
let watch;
let windowMod;
let lightCurve;
let autoArmFindings;

/** The clock in "days": any linear scale will do, and 3 shows it is used. */
const DAYS_PER_UNIT = 3;

const allBodies = () => [...physics.stars, ...physics.planets];

const deps = () => ({
  resolveBody: id => allBodies().find(b => b.id === id) ?? null,
  pause: () => {
    appState.state.paused = true;
  },
  clockDays: () => physics.getSimulationTime() * DAYS_PER_UNIT,
  onStep: physics.onPhysicsStep,
  G: () => physics.getPhysicsSetting('gravitational_constant'),
  transitLog: () => [],
});

jest.unstable_mockModule('../js/pauseAtEventBridge.js', () => ({
  unmountPauseAtEvent: async () => false,
  lastEvent: () => events?.lastEvent() ?? null,
  renderEventMarker() {},
  watchForPauseAtEvent() {},
  ensurePauseAtEvent: async () => ({
    watch: await import('../js/pauseAtEvent.js'),
    panel: {
      setPauseAtEventEnabled() {},
      presetSelection: () => true,
      armFromSpec: spec => events.armEvent(spec, deps()),
    },
  }),
}));

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
  render = await import('../js/render.js');
  appState = await import('../js/appState.js');
  events = await import('../js/pauseAtEvent.js');
  lightCurve = await import('../js/lightCurve.js');
  watch = await import('../js/investigations/eventWatch.js');
  windowMod = await import('../js/investigations/eventWindow.js');
  ({ autoArmFindings } = await import('../tools/authoring/autoArmRules.mjs'));
  appState.registerCommands({ captureShareState: world.captureShareState });
});

let body;
let announced;
let host;

/**
 * A star and three planets, named as a lesson names them, each starting at
 * apoapsis of an orbit with eccentricity 0.36 (0.8 of the circular speed), so
 * the first periapsis comes half an orbit in.
 */
function buildWorld() {
  const star = new physics.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 });
  const bodies = [{ ...star.get_state(), type: 'StarObject', name: 'Sun' }];
  const GM = physics.getPhysicsSetting('gravitational_constant') * star.mass;
  for (let i = 1; i <= 3; i++) {
    const r = 180 * i;
    const planet = new physics.Planet(
      { x: r, y: 0 },
      { x: 0, y: 0.8 * Math.sqrt(GM / r) }
    );
    bodies.push({ ...planet.get_state(), type: 'Planet', name: `World ${i}` });
  }
  world.applyShareState({ s: 'None', b: bodies });
  physics.resetSimulationTime();
  timeline.resetTimeline();
  appState.state.paused = true;
  // Slow enough that the orbits stay orbits at a frame's step.
  appState.SETTINGS.sim_speed = 5;
}

/** One frame at the current speed, as the render loop takes it. */
function runFrame() {
  const dt = (1 / 60) * appState.SETTINGS.sim_speed * 50 * physics.DT;
  if (timeline.tickTimeline(dt) && !appState.state.paused) {
    render.integrateFrame(dt);
    timeline.recordFrame();
  }
  lightCurve.updateLightCurve();
}

/** Run until the watch stops the world, or give up. */
function runUntilFired(limit = 6000) {
  appState.state.paused = false;
  for (let i = 0; i < limit && !appState.state.paused; i++) runFrame();
  return appState.state.paused;
}

const fullCapture = () =>
  world.captureShareState({
    kind: 'full',
    includeCamera: false,
    forExperiment: true,
  });

/** Everything a replay must leave as it found it. */
const snapshot = () => ({
  capture: fullCapture(),
  clock: physics.getSimulationTime(),
  frames: timeline.recordedFrames(),
  curve: lightCurve.lightCurveSeries(),
  armed: events.armedEvent(),
  watchState: watch.lessonWatchState(),
  lessonEvent: watch.lastLessonEvent(),
  paused: appState.state.paused,
});

const step = (pauseAt, extra = {}) => ({
  sid: 'catch',
  type: 'measure',
  pauseAt: { kind: 'periapsis', body: 'World 1', primary: 'Sun', ...pauseAt },
  ...extra,
});

const enter = (s, entering = true) => windowMod.syncWindow(s, entering, host);

beforeEach(async () => {
  windowMod.resetEventWindowForTests();
  events.resetPauseAtEvent();
  delete globalThis.document.documentElement.dataset.motion;
  buildWorld();
  body = globalThis.document.createElement('div');
  announced = [];
  host = {
    body: () => body,
    bodies: allBodies,
    setTime({ paused, speed }) {
      if (speed > 0) appState.SETTINGS.sim_speed = speed;
      if (typeof paused === 'boolean')
        timeline.setParkedPause((appState.state.paused = paused));
    },
    timeline,
    t: k => k,
    announce: m => announced.push(m),
    formatTime: x => `${x}`,
    locale: () => 'en',
  };
});

describe('step time', () => {
  test('a step sets its speed and pause on entry, and only on entry', async () => {
    appState.state.paused = true;
    await enter({ sid: 'run', time: { paused: false, speed: 40 } });
    expect(appState.SETTINGS.sim_speed).toBe(40);
    expect(appState.state.paused).toBe(false);
    // The reader's own change survives a re-render of the same step.
    appState.state.paused = true;
    appState.SETTINGS.sim_speed = 3;
    await enter({ sid: 'run', time: { paused: false, speed: 40 } }, false);
    expect(appState.state.paused).toBe(true);
    expect(appState.SETTINGS.sim_speed).toBe(3);
  });

  test('a step with no time leaves the transport alone', async () => {
    appState.state.paused = false;
    appState.SETTINGS.sim_speed = 12;
    await enter({ sid: 'read', type: 'read' });
    expect(appState.state.paused).toBe(false);
    expect(appState.SETTINGS.sim_speed).toBe(12);
  });
});

describe('the watch a step arms', () => {
  test('auto arms on entry; a plain pauseAt arms nothing', async () => {
    await enter(step({}));
    expect(events.armedEvent()).toBe(null);
    expect(watch.lessonWatchState()).toBe(watch.WATCH.IDLE);

    await enter(step({ auto: true }, { sid: 'auto' }));
    expect(events.armedEvent()).toMatchObject({ kind: 'periapsis' });
    expect(watch.lessonWatchState()).toBe(watch.WATCH.ARMED);
    expect(announced.at(-1)).toMatch(/Armed for you/);
  });

  test("a reader's own watch is refused, kept, and said", async () => {
    const own = allBodies().find(b => b.name === 'World 2');
    const sun = allBodies().find(b => b.name === 'Sun');
    expect(
      events.armEvent(
        { kind: 'apoapsis', bodyId: own.id, primaryId: sun.id },
        deps()
      ).ok
    ).toBe(true);
    await enter(step({ auto: true }));
    expect(watch.lessonWatchState()).toBe(watch.WATCH.FOREIGN);
    expect(events.armedEvent()).toMatchObject({
      kind: 'apoapsis',
      bodyId: own.id,
    });
    expect(announced.at(-1)).toMatch(/Your own watch is armed/);
    expect(body.textContent).toMatch(/Your own watch is armed/);
  });

  test('a step change releases the watch; a re-render does not', async () => {
    const s = step({ auto: true });
    await enter(s);
    await enter(s, false);
    expect(watch.lessonWatchState()).toBe(watch.WATCH.ARMED);
    await enter({ sid: 'next', type: 'read' });
    expect(events.armedEvent()).toBe(null);
    expect(watch.lessonWatchState()).toBe(watch.WATCH.IDLE);
  });

  test('the fired event carries its moment on the simulation clock', async () => {
    await enter(step({ auto: true }));
    expect(runUntilFired()).toBe(true);
    const e = watch.lastLessonEvent();
    expect(e.kind).toBe('periapsis');
    // Between the frame before the stop and the stop itself.
    expect(e.clock).toBeLessThanOrEqual(physics.getSimulationTime());
    expect(e.clock * DAYS_PER_UNIT).toBeCloseTo(e.timeDays, 9);
  });
});

describe('Replay', () => {
  /** Fire the step's event, run past it a little and arm the next one. */
  async function eventInTheMiddle(spec = { auto: true, replay: true }) {
    const s = step(spec);
    await enter(s);
    expect(runUntilFired()).toBe(true);
    lightCurve.setLightCurveEnabled(true);
    appState.state.paused = false;
    for (let i = 0; i < 20; i++) runFrame();
    // A watch armed while the replay plays must still be armed after it: the
    // next periapsis, armed from the panel as a student would.
    const p = allBodies().find(b => b.name === 'World 1');
    const sun = allBodies().find(b => b.name === 'Sun');
    expect(
      events.armEvent(
        { kind: 'periapsis', bodyId: p.id, primaryId: sun.id },
        deps()
      ).ok
    ).toBe(true);
    expect(watch.lessonWatchState()).toBe(watch.WATCH.ARMED);
    expect(windowMod.eventFrame().state).toBe('ready');
    return s;
  }

  test('a completed replay leaves everything as it found it', async () => {
    await eventInTheMiddle();
    const before = snapshot();
    expect(before.paused).toBe(false);
    windowMod.replay();
    expect(timeline.isReplaying()).toBe(true);
    // The frame loop's order: the timeline first, then the instruments, which
    // take nothing from a recorded frame. Compared the moment live is back.
    const dt = (1 / 60) * appState.SETTINGS.sim_speed * 50 * physics.DT;
    let n = 0;
    while (n++ < 2000) {
      timeline.tickTimeline(dt);
      if (!timeline.isReplaying()) break;
      lightCurve.updateLightCurve();
    }
    expect(timeline.isScrubbing()).toBe(false);
    expect(snapshot()).toEqual(before);
    // Running on, the curve only ever moves forward from where it was.
    for (let i = 0; i < 12; i++) runFrame();
    const t = lightCurve.lightCurveSeries().days;
    expect(t.length).toBeGreaterThan(before.curve.days.length);
    expect(t.every((v, k) => k === 0 || v >= t[k - 1])).toBe(true);
    // Said once, at the event, not every frame.
    expect(announced.filter(m => m === 'Replay: at the event.')).toHaveLength(
      1
    );
  });

  test('a cancelled replay leaves everything as it found it', async () => {
    await eventInTheMiddle();
    const before = snapshot();
    windowMod.replay();
    for (let i = 0; i < 5; i++) runFrame();
    expect(timeline.isReplaying()).toBe(true);
    // Escape, Pause or the LIVE button: all of them are Return to live.
    timeline.returnToLive();
    expect(snapshot()).toEqual(before);
  });

  test('leaving the step mid-replay puts the live scene back', async () => {
    await eventInTheMiddle();
    const before = snapshot();
    windowMod.replay();
    for (let i = 0; i < 5; i++) runFrame();
    await enter({ sid: 'next', type: 'read' });
    expect(timeline.isScrubbing()).toBe(false);
    const after = snapshot();
    expect(after.capture).toEqual(before.capture);
    expect(after.clock).toBe(before.clock);
    expect(after.frames).toEqual(before.frames);
  });

  test('reduced motion jumps to the event frame instead of playing', async () => {
    await eventInTheMiddle();
    globalThis.document.documentElement.dataset.motion = 'reduce';
    const e = watch.lastLessonEvent();
    windowMod.replay();
    expect(timeline.isReplaying()).toBe(false);
    expect(timeline.isScrubbing()).toBe(true);
    const shown = physics.getSimulationTime();
    expect(shown).toBeLessThanOrEqual(e.clock);
    // The newest recorded frame at or before the event.
    const later = timeline.recordedFrames().filter(f => f.t > shown);
    expect(later.every(f => f.t > e.clock)).toBe(true);
  });

  test('before the event there is nothing to replay, and the page says so', async () => {
    await enter(step({ auto: true, replay: true }));
    expect(windowMod.eventFrame().state).toBe('none');
    expect(body.textContent).toMatch(/once the event has happened/);
    windowMod.replay();
    expect(timeline.isScrubbing()).toBe(false);
  });

  test('an event older than the recording says its limit and offers to arm again', async () => {
    await enter(step({ auto: true, replay: true }));
    expect(runUntilFired()).toBe(true);
    appState.state.paused = false;
    for (let i = 0; i < 920; i++) runFrame();
    appState.state.paused = true;
    expect(windowMod.eventFrame().state).toBe('gone');
    await enter(step({ auto: true, replay: true }), false);
    expect(body.textContent).toMatch(/older than the recording/);
    expect(body.textContent).toMatch(/last 900 frames, about 90 s/);
    const before = snapshot();
    windowMod.replay();
    expect(timeline.isScrubbing()).toBe(false);
    expect(snapshot()).toEqual(before);
    const again = [...body.querySelectorAll('button')].find(
      b => b.textContent === 'Arm again'
    );
    expect(again).toBeTruthy();
  });
});

describe('Rewind to here', () => {
  async function parkedAtTheEvent(spec) {
    await enter(step({ auto: true, replay: true, ...spec }));
    expect(runUntilFired()).toBe(true);
    appState.state.paused = false;
    for (let i = 0; i < 20; i++) runFrame();
    appState.state.paused = true;
    globalThis.document.documentElement.dataset.motion = 'reduce';
    windowMod.replay();
    expect(timeline.isScrubbing()).toBe(true);
  }

  test('changes the world, drops later frames, and says so', async () => {
    await parkedAtTheEvent({ rewind: true });
    const shown = physics.getSimulationTime();
    const frames = timeline.getFrameCount();
    windowMod.rewind();
    expect(timeline.isScrubbing()).toBe(false);
    expect(physics.getSimulationTime()).toBe(shown);
    expect(timeline.getFrameCount()).toBeLessThan(frames);
    expect(timeline.recordedFrames().every(f => f.t <= shown)).toBe(true);
    expect(announced.at(-1)).toBe('transport.rewind.hint');
  });

  test('is not offered where the step does not allow it', async () => {
    await parkedAtTheEvent({});
    expect(
      [...body.querySelectorAll('button')].map(b => b.textContent)
    ).toEqual(['transport.replay']);
    windowMod.rewind();
    expect(timeline.isScrubbing()).toBe(true);
  });

  test('is disabled with a reason while nothing is shown from history', async () => {
    await enter(step({ auto: true, replay: true, rewind: true }));
    expect(runUntilFired()).toBe(true);
    await enter(step({ auto: true, replay: true, rewind: true }), false);
    const rewind = [...body.querySelectorAll('button')].find(
      b => b.textContent === 'transport.rewind'
    );
    expect(rewind.disabled).toBe(true);
    expect(body.textContent).toMatch(/Replay or step back to a frame first/);
  });
});

describe('the author rule interaction/auto-arm', () => {
  const lesson = steps => ({ id: 'x', steps });
  const auto = { kind: 'periapsis', body: 'A', primary: 'B', auto: true };

  test('fails an auto step that asks when, in either language', () => {
    const l = lesson([
      {
        title: 'Catch it',
        body: 'Watch.',
        prompt: 'When is the planet closest?',
        pauseAt: auto,
      },
    ]);
    expect(autoArmFindings(l)).toHaveLength(1);
    const quiet = lesson([
      { title: 'Catch it', body: 'Watch.', pauseAt: auto },
    ]);
    expect(autoArmFindings(quiet)).toEqual([]);
    const es = {
      x: { data: { steps: [{ body: '¿Cuándo está más cerca?' }] } },
    };
    expect(autoArmFindings(quiet, { es })).toHaveLength(1);
  });

  test('fails an auto step whose field is a time, passes one that is not', () => {
    const timed = lesson([
      {
        title: 'At periapsis',
        body: 'The scene stops there.',
        pauseAt: auto,
        fields: [{ id: 't', label: 'Event', unit: 'd' }],
      },
    ]);
    expect(autoArmFindings(timed)[0].message).toMatch(/unit of time/);
    const labelled = lesson([
      {
        title: 'x',
        body: 'y',
        pauseAt: auto,
        fields: [{ id: 't', label: 'Time of passage' }],
      },
    ]);
    expect(autoArmFindings(labelled)[0].message).toMatch(/labelled as a time/);
    const speed = lesson([
      {
        title: 'At periapsis',
        body: 'Read the speed when the scene stops.',
        pauseAt: auto,
        fields: [{ id: 'v', label: 'Speed', unit: 'km/s' }],
      },
    ]);
    expect(autoArmFindings(speed)).toEqual([]);
    // Not auto: the student arms, and the moment may be the question.
    const own = lesson([
      {
        title: 'x',
        body: 'When is it?',
        prompt: 'When?',
        pauseAt: { ...auto, auto: false },
      },
    ]);
    expect(autoArmFindings(own)).toEqual([]);
  });
});
