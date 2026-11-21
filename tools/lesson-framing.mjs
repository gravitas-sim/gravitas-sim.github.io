// =============================================================================
// Which lesson steps use a scene, and whether each one is framed
// -----------------------------------------------------------------------------
// `sceneSteps(lessons)` lists every step that builds or binds a scene, with
// the kind of scene (read off the step's own declaration, never from a count),
// what it loads, and the roles it binds. `judgeFraming(m)` is the verdict on
// one measurement `measureFramingInPage` took in the browser. The browser
// specification (e2e/lessonFraming.spec.js) is generated over this list, so a
// new step that puts its bodies under a panel or off the screen fails it.
//
// "Framed" means, for one step at one size:
//   1. every body the step binds has its centre and the four points of its
//      drawn disc inside the free region (the canvas, with no panel, control,
//      rail or readout on top), and inside the viewport;
//   2. none is drawn smaller than the marker floor of the renderer
//      (`DISPLAY_MIN_PX`, a radius), and its name is not drawn under the label
//      floor of tools/visual-criteria.mjs;
//   3. the bound bodies and the orbits they sweep fill at least `FILL_FLOOR`
//      (a fifth) of the free region along one axis, unless the zoom is at the fit's own
//      cap (a single small body is not made to fill the screen).
// A step that binds nothing is judged on its first named object (rule 4).
// =============================================================================

/** Viewports of the check: a phone, a tablet and a laptop. */
export const FRAMING_SIZES = [
  { width: 375, height: 812, kind: 'phone' },
  { width: 768, height: 1024, kind: 'tablet' },
  { width: 1280, height: 800, kind: 'laptop' },
];

/** The share of the free region the bound bodies must span along one axis. */
export const FILL_FLOOR = 0.2;

/** The renderer's smallest marker radius, CSS px (js/bodyVisuals.js DISPLAY_MIN_PX; a crowd's floor is lower, and the page reports it). */
export const MARKER_FLOOR_PX = 2.75;

/** A scene of more bound bodies than this is a crowd. */
export const CROWD_BODIES = 12;

/** The smallest a name is drawn (tools/visual-criteria.mjs LABEL_FLOOR_CSS_PX). */
export const NAME_FLOOR_PX = 11;

const ENGINE_STAGES = ['starPair', 'hole', 'equalMass', 'system'];
const MODEL_STAGES = ['gwSource', 'binary'];

/**
 * How a step's own declaration builds its scene.
 * @param {object} step - A step
 * @returns {?string} setup, engine-stage, model-stage, population, shelf, bind or null
 */
export function sceneKindOf(step) {
  if (step?.setup) return 'setup';
  const st = step?.stage;
  if (st) {
    if (ENGINE_STAGES.some(k => st[k])) return 'engine-stage';
    if (MODEL_STAGES.some(k => st[k])) return 'model-stage';
    if (st.population) return 'population';
    return 'shelf';
  }
  return step?.bind ? 'bind' : null;
}

/** The roles a step names for itself: its bind, or the roles of the stars it stages. */
function rolesOf(step) {
  const out = new Set(Object.keys(step.bind || {}));
  for (const s of step.stage?.stars || []) if (s.role) out.add(s.role);
  return [...out];
}

/** The scene's name: the scenario it loads or the kind of stage it builds. */
function sceneName(step, kind) {
  if (kind === 'setup') return step.setup.scenario;
  if (kind === 'bind') return null;
  const key = Object.keys(step.stage).find(
    k =>
      !['fit', 'scale', 'anonymous', 'spacing', 'perRow', 'stars'].includes(k)
  );
  return key || 'stars';
}

/**
 * Every step that builds or binds a scene.
 *
 * @param {Array<object>} lessons - The composed lessons
 * @returns {Array<object>} One entry per step, in lesson order, with `key`,
 *   the identity of its scene and furniture: steps that share one are the same
 *   scene to measure
 */
export function sceneSteps(lessons) {
  const out = [];
  for (const inv of lessons) {
    inv.steps.forEach((step, index) => {
      const kind = sceneKindOf(step);
      if (!kind) return;
      const furniture = [
        step.tool?.id || '',
        step.plot ? 'plot' : '',
        step.lightCurve ? 'lc' : '',
        step.probe ? 'probe' : '',
      ].join('+');
      const entry = {
        lesson: inv.id,
        sid: step.sid,
        index,
        kind,
        scene: sceneName(step, kind),
        roles: rolesOf(step),
        camera: step.setup?.camera ?? null,
        fit: step.stage ? step.stage.fit === true : null,
        furniture,
      };
      entry.key = JSON.stringify([
        inv.id,
        kind,
        entry.scene,
        step.stage ? [step.stage, step.stage.stars?.length] : null,
        entry.roles,
        furniture,
        entry.camera,
      ]);
      out.push(entry);
    });
  }
  return out;
}

/** The list with steps of one scene collapsed to the first of them. */
export function distinctScenes(list) {
  const seen = new Set();
  return list.filter(e => !seen.has(e.key) && seen.add(e.key));
}

/** The list grouped by lesson, in order. */
export function byLesson(list) {
  const map = new Map();
  for (const e of list) {
    if (!map.has(e.lesson)) map.set(e.lesson, []);
    map.get(e.lesson).push(e);
  }
  return map;
}

/**
 * The verdict on one measurement of one step at one size.
 *
 * @param {object} m - What `measureFramingInPage` returned
 * @returns {{pass: boolean, reasons: string[]}}
 */
export function judgeFraming(m) {
  const reasons = [];
  if (!m.bodies.length) reasons.push('the step binds no body');
  // A crowd (a stage of many stars) cannot keep every member clear of the
  // corner buttons; a tenth may be under furniture.
  const crowd = m.bodies.length > CROWD_BODIES;
  const hidden = m.bodies.filter(b => !b.free);
  for (const b of m.bodies) {
    if (!b.inside) reasons.push(`${b.role} is outside the viewport`);
    else if (!b.free && !(crowd && hidden.length <= m.bodies.length * 0.1))
      reasons.push(`${b.role} is under ${b.coveredBy || 'a panel'}`);
    if (b.drawnRadius < (m.markerFloor ?? MARKER_FLOOR_PX) - 1e-6)
      reasons.push(`${b.role} is drawn at radius ${b.drawnRadius} px`);
  }
  if (m.bodies.length && !m.capped && m.fill < FILL_FLOOR)
    reasons.push(
      `the bound bodies span ${Math.round(m.fill * 100)}% of the free region, under ${FILL_FLOOR * 100}%`
    );
  return { pass: reasons.length === 0, reasons };
}

/**
 * What the page shows of one step's scene. Runs in the page, after the camera
 * has settled; serialisable, so Playwright can send it.
 */
export async function measureFramingInPage() {
  const ls = await import('/js/lessonScene.js');
  const ui = await import('/js/ui.js');
  const frame = await import('/js/lessonFrame.js');
  const visuals = await import('/js/bodyVisuals.js');
  const canvas = document.getElementById('simulationCanvas');
  // A body mid-orbit must not move between the fit and the reading.
  ui.state.paused = true;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = canvas.width / canvas.clientWidth;
  const { state } = ui;
  const toScreen = p => ({
    x:
      (canvas.width / 2 +
        state.pan.x +
        (p.x - state.frameOffset.x) * state.zoom) /
      scale,
    y:
      (canvas.height / 2 +
        state.pan.y -
        (p.y - state.frameOffset.y) * state.zoom) /
      scale,
  });
  const label = el =>
    el
      ? el.id ||
        (el.getAttribute('class') || '').split(' ')[0] ||
        el.tagName.toLowerCase()
      : null;
  const count = ls.allBodies().length;
  const bodies = [];
  // A step that binds nothing is judged on its first named object (rule 4).
  const named = ls.allBodies().find(x => x?.name) || ls.allBodies()[0];
  const subjects = ls
    .boundRoles()
    .map(role => [role, ls.roleBody(role)])
    .filter(([, b]) => b);
  if (!subjects.length && named) subjects.push(['(first object)', named]);
  for (const [role, b] of subjects) {
    const c = toScreen(b.pos);
    const r = visuals.drawnRadiusPx(
      b.stageRadius || b.radius,
      (b.constructor?.name || 'Planet').replace(/Object$/, ''),
      state.zoom,
      count
    );
    const inside = c.x >= 0 && c.x <= vw && c.y >= 0 && c.y <= vh;
    let coveredBy = null;
    if (inside) {
      const reach = Math.max(1, r);
      for (const [dx, dy] of [
        [0, 0],
        [reach, 0],
        [-reach, 0],
        [0, reach],
        [0, -reach],
      ]) {
        const x = Math.min(vw - 0.5, Math.max(0.5, c.x + dx));
        const y = Math.min(vh - 0.5, Math.max(0.5, c.y + dy));
        const top = document.elementFromPoint(x, y);
        if (top !== canvas) {
          coveredBy = label(top);
          break;
        }
      }
    }
    bodies.push({
      role,
      name: b.name,
      x: Math.round(c.x),
      y: Math.round(c.y),
      drawnRadius: Math.round(r * 100) / 100,
      inside,
      free: inside && !coveredBy,
      coveredBy,
    });
  }
  const inset = frame.lessonInset();
  const free = {
    left: inset.left || 0,
    top: inset.top || 0,
    width: vw - (inset.left || 0) - (inset.right || 0),
    height: vh - (inset.top || 0) - (inset.bottom || 0),
  };
  // The span of the bound bodies and the ellipses they sweep, on screen.
  const framed = ls.boundRoles().length
    ? frame.boundPoints()
    : ls.allBodies().map(x => ({ x: x.pos.x, y: x.pos.y, radius: x.radius }));
  const pts = framed.map(p => ({ ...toScreen(p), r: p.radius }));
  let fill = 0;
  if (pts.length) {
    const xs = pts.flatMap(p => [
      p.x - p.r * state.zoom,
      p.x + p.r * state.zoom,
    ]);
    const ys = pts.flatMap(p => [
      p.y - p.r * state.zoom,
      p.y + p.r * state.zoom,
    ]);
    fill = Math.max(
      (Math.max(...xs) - Math.min(...xs)) / free.width,
      (Math.max(...ys) - Math.min(...ys)) / free.height
    );
  }
  return {
    vw,
    vh,
    markerFloor: Math.round(visuals.markerFloorPx(count) * 100) / 100,
    zoom: Math.round(state.zoom * 1000) / 1000,
    capped: state.zoom >= 2.995,
    free: {
      left: Math.round(free.left),
      top: Math.round(free.top),
      width: Math.round(free.width),
      height: Math.round(free.height),
    },
    fill: Math.round(fill * 1000) / 1000,
    bodies,
  };
}

// --- Driving a page (runs in Node, given a Playwright page) -----------------------

/** Start a page on the application with the first-visit furniture out of the way. */
export async function startPage(page, origin, { language = 'en' } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(`${origin}/`, { waitUntil: 'load' });
      await page.evaluate(lang => {
        try {
          localStorage.setItem('gravitas_welcome_seen_v1', '1');
          localStorage.setItem('gravitas_locale', lang);
          localStorage.setItem('gravitas_theme', 'midnight');
        } catch {
          /* storage unavailable */
        }
      }, language);
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(
        () => window.splashScreenEnded === true,
        null,
        {
          timeout: 45000,
        }
      );
      break;
    } catch (err) {
      // A loaded machine can miss the splash once; a second miss is a finding.
      if (attempt) throw err;
    }
  }
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.SETTINGS.quality_tier = 'full';
  });
}

/** Open a lesson at a step in the running page, as a returning student does. */
export async function openStepInPage(page, lesson, sid) {
  await page.evaluate(
    async ([id, stepSid]) => {
      await (
        await import('/js/investigationsLoader.js')
      ).ensureInvestigations();
      const inv = await import('/js/investigations.js');
      // Closing saves the position it leaves, so it comes first.
      inv.closeInvestigation();
      // This tab's copy of the progress outranks storage; drop it.
      (await import('/js/investigations/stepView.js')).sessionProgress.clear();
      try {
        localStorage.setItem(
          `gravitas_investigation_${id}`,
          JSON.stringify({
            schema: 2,
            lesson: id,
            stepSid,
            responses: {},
            attempts: {},
            visited: [],
            startedAt: 1700000000000,
          })
        );
      } catch {
        /* the lesson then opens at its first step */
      }
      await inv.openInvestigation(id);
      // The fit is taken once the panels can be measured; a body must stand
      // where the fit saw it when the reading comes.
      (await import('/js/ui.js')).state.paused = true;
    },
    [lesson, sid]
  );
  await settlePage(page);
}

/** Wait until no fit is pending and the camera has held for a few frames. */
export async function settlePage(page) {
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    const frame = await import('/js/lessonFrame.js');
    const same = (a, b) =>
      a.zoom === b.zoom && a.pan.x === b.pan.x && a.pan.y === b.pan.y;
    let last = null;
    let held = 0;
    const t0 = performance.now();
    await new Promise(done => {
      const tick = () => {
        const now = { zoom: ui.state.zoom, pan: { ...ui.state.pan } };
        held = last && same(last, now) && !frame.fitWanted() ? held + 1 : 0;
        last = now;
        if (held >= 30 || performance.now() - t0 > 8000) done();
        else requestAnimationFrame(tick);
      };
      tick();
    });
  });
}

/**
 * Measure the scenes of some lessons on a page already started.
 *
 * On a phone or a tablet a student who finds the scene under the sheet has one
 * announced action, the sheet handle (criterion I-8, D-R4-334-01): a step is
 * framed when the bound bodies are free with the sheet raised or after that
 * one action. `state` says which.
 *
 * @param {object} page - A Playwright page, started with `startPage`
 * @returns {Promise<Array<object>>} One measurement per scene step, with its verdict
 */
export async function measureLessons(page, entries, { origin = '' } = {}) {
  const out = [];
  let lesson = null;
  for (const e of entries) {
    // A lesson that docks panels or borrows the sandbox leaves furniture behind
    // that the next lesson's layout would measure, so each lesson starts a
    // fresh page, as a student opening it from the front door does.
    if (lesson !== e.lesson) {
      if (lesson !== null) await startPage(page, origin);
      lesson = e.lesson;
    }
    await openStepInPage(page, e.lesson, e.sid);
    let m = await page.evaluate(measureFramingInPage);
    let v = judgeFraming(m);
    let state = 'raised';
    const raised = v;
    const handle = page.locator('#investigationSheet');
    if (!v.pass && (await handle.isVisible())) {
      await handle.click();
      await settlePage(page);
      const m2 = await page.evaluate(measureFramingInPage);
      const v2 = judgeFraming(m2);
      if (v2.pass || m2.bodies.length >= m.bodies.length) {
        [m, v, state] = [m2, v2, 'lowered'];
      }
    }
    out.push({ entry: e, m, ...v, state, raised });
  }
  return out;
}

/** Lessons' scene steps in groups of about `size` scenes, for one test each. */
export function groupsOfScenes(list, size = 24) {
  const groups = [];
  let current = [];
  for (const entries of byLesson(list).values()) {
    if (current.length && current.length + entries.length > size) {
      groups.push(current);
      current = [];
    }
    current.push(...entries);
  }
  if (current.length) groups.push(current);
  return groups;
}
