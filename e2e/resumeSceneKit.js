// =============================================================================
// The two halves of the resume-equals-walking check (e2e/resumeScene.spec.js)
// -----------------------------------------------------------------------------
// `probe` runs in the page and reads the engine; `differences`, `sampleSteps`
// and the drivers run in the spec's own process. Kept apart from the spec so
// the comparison rules can be tried against a hand-made pair of records
// (tests/resumeSceneCompare.test.js) without a browser.
// =============================================================================

import { loadInvestigation } from '../js/data/investigations/registry.js';
import { openDepth } from '../js/investigations/depth.js';
import { writeProgress } from '../js/investigations/progressSchema.js';
import { holdsClock } from '../js/timestep.js';
import { inDepth } from '../js/investigations/progressSchema.js';
import { stageOf } from '../js/lesson/stage.js';

export const progressKey = id => `gravitas_investigation_${id}`;

/**
 * Positions are compared only when both screens are at the same simulation
 * time, to this many seconds. A scene that ran between two steps has moved,
 * and walking there and arriving there are then different afternoons.
 */
export const SAME_TIME = 1e-9;

/** Relative tolerance on a position or velocity at the same time (the engine is deterministic: this is rounding). */
export const POSITION_TOLERANCE = 1e-9;

/** Installed in the page once: what is on screen, and the two ways to a step. */
export async function installProbe(page) {
  await page.evaluate(() => {
    const LISTS = [
      'bh_list',
      'stars',
      'planets',
      'gas_giants',
      'asteroids',
      'comets',
      'neutron_stars',
      'white_dwarfs',
      'galaxies',
      'debris',
    ];
    const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const frame = () =>
      new Promise(r => window.requestAnimationFrame(() => r()));
    const settle = async () => {
      for (let i = 0; i < 400; i++) {
        if (
          !document
            .getElementById('investigationPanel')
            ?.hasAttribute('aria-busy')
        )
          break;
        await wait(10);
      }
      await frame();
    };
    const sidOf = id => {
      try {
        return (
          JSON.parse(localStorage.getItem(`gravitas_investigation_${id}`))
            ?.stepSid ?? null
        );
      } catch {
        return null;
      }
    };
    window.__resume = {
      sidOf,
      /** Wait for a step's instrument to be drawn (it is a lazy chunk), up to a few seconds. */
      async tool(expected) {
        if (!expected) return;
        // The panel may still hold the step before's controls: wait for ones
        // that are showing, but not for long where the instrument has none.
        for (let i = 0; i < 150; i++) {
          const panel = document.getElementById('investigationTool');
          if (
            !panel?.hidden &&
            panel.querySelector('input, select')?.offsetParent
          )
            break;
          await wait(10);
        }
        await frame();
      },
      /** What is on screen now. */
      async state() {
        const P = await import('/js/physics.js');
        const A = await import('/js/appState.js');
        const L = await import('/js/lessonStage.js');
        const E = await import('/js/engine/state.js');
        const T = await import('/js/timestep.js');
        // What the reader can touch (a hidden panel keeps the controls of the
        // step before), without the controls an instrument moves itself: a
        // cursor sweeping a curve reads differently every time it is looked at.
        const controls = () =>
          [
            ...document.querySelectorAll(
              '#investigationTool input, #investigationTool select'
            ),
          ]
            .filter(el => el.offsetParent !== null)
            .map(el => [
              el.id || el.name || el.className,
              el.type === 'checkbox' || el.type === 'radio'
                ? el.checked
                : el.value,
            ]);
        const first = controls();
        if (first.length) await wait(250);
        const again = controls();
        const instrument = first.filter(
          ([name, value], i) => again[i]?.[0] === name && again[i][1] === value
        );
        // Read after the wait: an instrument restands its scene on a later frame
        // (a star becomes the remnant its track ends in), so wait for the bodies
        // to stop changing kind or number.
        const kinds = () =>
          JSON.stringify(
            LISTS.map(key =>
              (P[key] || []).map(o => [
                o.obj_type ?? null,
                String(o.name ?? ''),
              ])
            )
          );
        if (first.length) {
          let seen = kinds();
          for (let i = 0; i < 4; i++) {
            await wait(200);
            const now = kinds();
            if (now === seen) break;
            seen = now;
          }
        }
        const bodies = [];
        for (const key of LISTS)
          for (const o of P[key] || [])
            bodies.push({
              list: key,
              kind: o.obj_type ?? null,
              name: String(o.name ?? ''),
              mass: num(o.mass),
              radius: num(o.radius),
              x: num(o.pos?.x),
              y: num(o.pos?.y),
              vx: num(o.vel?.x),
              vy: num(o.vel?.y),
            });
        return {
          // An instrument that moves itself (its controls changed while looked at)
          // moves the scene with it, so the scene is a function of dwell time.
          animated: first.length > instrument.length,
          bodies,
          time: E.getSimulationTime(),
          paused: Boolean(A.state.paused),
          speed: A.SETTINGS.sim_speed,
          pinned: T.pinnedStep(),
          stage: L.stageKey(),
          staged: L.stagedStars().map(e => [
            e.role ?? null,
            e.star?.name ?? null,
          ]),
          canvas: document.body.dataset.lessonCanvas ?? null,
          instrument,
        };
      },
      /** Open a lesson over a stored record (or none) and wait for its scene. */
      async open(id, text) {
        const inv = await import('/js/investigations.js');
        inv.closeInvestigation();
        // A record kept in memory for the session outranks storage: a returning student has none.
        (
          await import('/js/investigations/stepView.js')
        ).sessionProgress.clear();
        if (text == null)
          localStorage.removeItem(`gravitas_investigation_${id}`);
        else localStorage.setItem(`gravitas_investigation_${id}`, text);
        await inv.openInvestigation(id);
        await settle();
      },
      /** Press Next; the sid arrived at, or null if the step did not change. */
      async next(id) {
        const was = sidOf(id);
        document.getElementById('investigationNext')?.click();
        for (let i = 0; i < 300; i++) {
          await wait(10);
          const now = sidOf(id);
          if (now && now !== was) {
            await settle();
            return now;
          }
        }
        return null;
      },
    };
  });
}

/**
 * A lesson as it opens at a depth: its core steps plus the depth's own.
 * @param {string} id - The lesson
 * @param {string} [depth] - core, quantitative or advanced
 * @returns {Promise<object>} The merged lesson
 */
export async function lessonFor(id, depth = 'core') {
  const lesson = await loadInvestigation(id);
  if (depth === 'core' || !lesson.depths) return lesson;
  const opened = await openDepth(lesson, { depth, deepest: depth }, null, 'en');
  return opened.inv;
}

const progressText = (lesson, sid, depth) =>
  JSON.stringify(
    writeProgress({
      lesson,
      responses: {},
      attempts: {},
      visited: [],
      stepSid: sid,
      startedAt: null,
      spent: 0,
      ...(depth && depth !== 'core' ? { depth, deepest: depth } : {}),
    })
  );

/**
 * Walk a lesson from its first step at one depth with the Next button.
 * @param {?Set<string>} [only] - Record the state only at these steps (the walk still passes through all)
 * @returns {Promise<Array<{sid: string, state: ?object}>>} The state at each step reached
 */
export async function walk(page, id, depth = 'core', only = null) {
  const lesson = await lessonFor(id, depth);
  // A depth other than core opens from a record that names it; the first step is the first step of the depth.
  const text =
    depth === 'core' ? null : progressText(lesson, lesson.steps[0].sid, depth);
  await page.evaluate(([i, t]) => window.__resume.open(i, t), [id, text]);
  const out = [];
  const last = lesson.steps.filter(x => inDepth(x, depth)).at(-1)?.sid;
  let sid = await page.evaluate(i => window.__resume.sidOf(i), id);
  for (let guard = 0; guard < 400; guard++) {
    if (!only || only.has(sid)) {
      const tool = Boolean(lesson.steps.find(x => x.sid === sid)?.tool);
      await page.evaluate(t => window.__resume.tool(t), tool);
      out.push({
        sid,
        state: await page.evaluate(() => window.__resume.state()),
      });
    } else out.push({ sid, state: null });
    // Next on the last step opens the ending, not another step.
    if (sid === last) break;
    const next = await page.evaluate(i => window.__resume.next(i), id);
    if (!next || out.some(o => o.sid === next)) break;
    sid = next;
  }
  return out;
}

/** Open a lesson at a step from a saved record, as a returning student does. */
export async function resume(page, id, sid, depth = 'core') {
  const lesson = await lessonFor(id, depth);
  await page.evaluate(
    ([i, t]) => window.__resume.open(i, t),
    [id, progressText(lesson, sid, depth)]
  );
  await page.evaluate(
    t => window.__resume.tool(t),
    Boolean(lesson.steps.find(x => x.sid === sid)?.tool)
  );
  return page.evaluate(() => window.__resume.state());
}

const close = (a, b) =>
  a === b ||
  (a !== null &&
    b !== null &&
    Math.abs(a - b) <=
      POSITION_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b)));

/**
 * Whether a step states its own clock: a setup (which starts the scene paused
 * or running, #719), a `time`, or a reading step that holds the clock. A step
 * that states nothing carries the reader's own play or pause from the step
 * before, which a returning student has no record of; its clock is reported
 * under `carried` and not counted as a difference.
 */
export const statesClock = step =>
  Boolean(step?.setup || step?.time) || holdsClock(step);

/**
 * What differs between the screen reached by walking and the one reached by
 * resuming, as short strings; empty when they are the same.
 * @param {object} walked - state() after walking to the step
 * @param {object} resumed - state() after opening it from a saved record
 * @param {object} [step] - The lesson's step, to know which clock it states
 * @returns {{differences: string[], carried: string[]}}
 */
export function compare(walked, resumed, step) {
  const out = [];
  const carried = [];
  const clock = statesClock(step);
  for (const k of ['canvas', 'stage']) {
    if (walked[k] !== resumed[k])
      out.push(
        `${k}: walked ${JSON.stringify(walked[k])}, resumed ${JSON.stringify(resumed[k])}`
      );
  }
  for (const k of ['paused', 'speed', 'pinned']) {
    if (walked[k] !== resumed[k])
      (clock ? out : carried).push(
        `${k}: walked ${JSON.stringify(walked[k])}, resumed ${JSON.stringify(resumed[k])}`
      );
  }
  if (JSON.stringify(walked.staged) !== JSON.stringify(resumed.staged))
    out.push(
      `staged roles: walked ${JSON.stringify(walked.staged)}, resumed ${JSON.stringify(resumed.staged)}`
    );
  if (JSON.stringify(walked.instrument) !== JSON.stringify(resumed.instrument))
    out.push(
      `instrument: walked ${JSON.stringify(walked.instrument)}, resumed ${JSON.stringify(resumed.instrument)}`
    );
  const sig = b => `${b.list}/${b.kind}/${b.name}`;
  const sameTime = Math.abs(walked.time - resumed.time) <= SAME_TIME;
  if (walked.animated || resumed.animated)
    return { differences: out, carried: [...carried, 'animated instrument'] };
  const wb = walked.bodies.map(sig);
  const rb = resumed.bodies.map(sig);
  // A scene that ran has lost the comets and debris the engine culls or
  // disperses, so the resumed screen may hold more of those and nothing else.
  const lost = wb.filter(v => !rb.includes(v));
  const extra = rb.filter(
    v => !wb.includes(v) && (sameTime || !/^(comets|debris)\//.test(v))
  );
  if (lost.length || extra.length) {
    out.push(
      `bodies: walked ${wb.length}, resumed ${rb.length}; only walked ${JSON.stringify(lost.slice(0, 4))}, only resumed ${JSON.stringify(extra.slice(0, 4))}`
    );
  } else if (
    sameTime &&
    walked.paused &&
    resumed.paused &&
    wb.length === rb.length
  ) {
    for (let i = 0; i < walked.bodies.length; i++) {
      const a = walked.bodies[i];
      const b = resumed.bodies[i];
      for (const f of ['mass', 'radius', 'x', 'y', 'vx', 'vy'])
        if (!close(a[f], b[f])) {
          out.push(`${sig(a)} ${f}: walked ${a[f]}, resumed ${b[f]}`);
          break;
        }
    }
  }
  return { differences: out, carried };
}

/**
 * The steps whose scene is compared, by sid, for one lesson at one depth (the
 * sampling rule, said once): the first and last step of the depth's path; every
 * step that declares a setup, a stage, a bind or an instrument; the step after
 * each of those (a step that declares none inherits or clears what they left,
 * which is where a resume goes wrong); and, at a depth other than core, every
 * step of that depth, because those are the steps the depth adds.
 * `all` compares every step of the path.
 * @param {object} lesson - The lesson as loaded
 * @param {string} [depth] - 'core', 'quantitative' or 'advanced'
 * @param {boolean} [all] - Every step
 * @returns {Set<string>} The sids
 */
export function sampleSteps(lesson, depth = 'core', all = false) {
  const path = lesson.steps.filter(s => inDepth(s, depth));
  const chosen = new Set();
  path.forEach((step, i) => {
    const declares = Boolean(
      step.setup || step.stage || step.bind || step.tool || stageOf(path, step)
    );
    const added = depth !== 'core' && step.depth === depth;
    if (all || i === 0 || i === path.length - 1 || declares || added)
      chosen.add(step.sid);
    if (declares && path[i + 1]) chosen.add(path[i + 1].sid);
  });
  return chosen;
}

/**
 * The lessons a default run always takes, whatever the stride, one or more for
 * each kind the resume rules treat differently: a staged lesson with a deeper
 * path whose last steps have no stage (weighing-stars), lessons whose steps
 * are all stage-less (listening-to-spacetime, a-universe-of-stars), a staged
 * lesson with deeper steps (keplers-laws) and the remnant instrument
 * (lives-of-stars). The assignment is its own test and always runs.
 */
export const KIND_LESSONS = [
  'keplers-laws',
  'weighing-stars',
  'listening-to-spacetime',
  'a-universe-of-stars',
  'lives-of-stars',
];

/** The default stride: every third lesson, plus the kinds above. 1 takes all. */
export const DEFAULT_EVERY = 3;

/** Whether the lesson at manifest position `at` is in a run with this stride. */
export const inSample = (at, id, every = DEFAULT_EVERY, offset = 0) =>
  every <= 1 || KIND_LESSONS.includes(id) || (at - offset) % every === 0;
