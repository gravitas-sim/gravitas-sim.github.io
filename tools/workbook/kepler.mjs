// =============================================================================
// The Kepler's Laws workbook: what is measured, and what grades it
// -----------------------------------------------------------------------------
// One lesson's worth of engine-computed measurement, and the lesson's own
// verdict on every number in it. Split out from the generator so that the
// science and the typesetting fail separately: a check that says "the table
// drifted" and a check that says "the PDF drifted" are different news.
//
// The rule this file is built to keep
// -----------------------------------------------------------------------------
// Every number printed in the workbook is produced by a function that lives in
// js/data/investigations/keplers-laws.js - the lesson's own `probe` and
// `importFromSelection` - run against a world built by js/world/build.js. Every
// number is then handed back to that same lesson's own `validate`, as text, in
// the shape js/investigations.js would have handed it. Nothing in this file
// knows what a correct answer looks like.
//
// The honest consequence: if a lesson author retunes a tolerance, this build
// fails. That is the point. See section 5 of the spike brief.
// =============================================================================

import { createHash } from 'node:crypto';

import { INVESTIGATIONS } from '../../js/data/investigations.js';
import { velocityUnitToMs } from '../../js/units.js';
import {
  buildScenario,
  lessonContext,
  allBodies,
  advanceToDay,
  runToEvent,
  fixedStepPlan,
  clockDays,
  simDays,
} from './world.mjs';

/** The lesson under test. One, on purpose. */
export const LESSON_ID = 'keplers-laws';

/**
 * The world seed.
 *
 * Kepler's 2nd Law and TRAPPIST-1 place every body by hand and do not consume
 * the generator, but the Solar System's asteroid belt and comets do. A fixed
 * seed is what makes the body list - and therefore `ctx.find` - the same on
 * every machine.
 */
export const SEED = 'gravitas-workbook-keplers-laws-v1';

/**
 * The schedule: every moment the workbook takes a reading at, named.
 *
 * Two kinds of moment, and the difference matters to a reader:
 *
 *   `day`    an explicit simulated time. Reached by a whole number of
 *            identical integration steps and by nothing else.
 *   `event`  a physical condition - periapsis, apoapsis - located by the
 *            application's own Pause at Event watcher. The time it lands on is
 *            an output of the run, not an input, and the workbook prints it.
 */
export const SCHEDULE = Object.freeze([
  { id: 'kepler-t0', scenario: "Kepler's 2nd Law", at: { day: 0 } },
  {
    id: 'kepler-periapsis',
    scenario: "Kepler's 2nd Law",
    at: {
      event: {
        kind: 'periapsis',
        body: 'Eccentric Orbiter',
        primary: 'Kepler Star',
      },
      maxDays: 2000,
    },
  },
  {
    id: 'kepler-apoapsis',
    scenario: "Kepler's 2nd Law",
    at: {
      event: {
        kind: 'apoapsis',
        body: 'Eccentric Orbiter',
        primary: 'Kepler Star',
      },
      maxDays: 2000,
    },
  },
  { id: 'solar-t0', scenario: 'Solar System', at: { day: 0 } },
  { id: 'solar-one-year', scenario: 'Solar System', at: { day: 365.25 } },
  { id: 'trappist-t0', scenario: 'TRAPPIST-1 System', at: { day: 0 } },
]);

/** Round for print, as a string, so the printed digits are the graded digits. */
const fix = (v, n) => (Number.isFinite(v) ? v.toFixed(n) : '');

/** The step with this sid, out of the one lesson this spike touches. */
export function stepOf(sid) {
  const lesson = INVESTIGATIONS.find(i => i.id === LESSON_ID);
  if (!lesson) throw new Error(`No lesson ${LESSON_ID}`);
  const step = lesson.steps.find(s => s.sid === sid);
  if (!step) throw new Error(`No step ${sid} in ${LESSON_ID}`);
  return step;
}

/** The lesson itself. */
export const lesson = () => INVESTIGATIONS.find(i => i.id === LESSON_ID);

/**
 * Fill a step's answer sheet the way the panel would, and grade it.
 *
 * Mirrors js/investigations.js's `fieldValues` + `recomputeFields`: raw text in,
 * derived fields computed by the STEP's own `compute` and rounded to the STEP's
 * own `decimals`, then everything to Number alongside its `_text`. That
 * rounding is part of the pipeline a student's answer goes through, so a
 * workbook whose printed precision is too coarse for the lesson's tolerance
 * must fail here rather than pass on unrounded internals.
 *
 * @param {object} step - A lesson step
 * @param {Object<string,string>} entered - Field id -> what the workbook printed
 * @param {?object} ctx - A lesson context, for validators that take one
 * @returns {{values: object, verdict: ?object}} The sheet and the lesson's verdict
 */
export function gradeWithLesson(step, entered, ctx) {
  const responses = { ...entered };
  const read = () => {
    const out = {};
    for (const f of step.fields || []) {
      const raw = responses[f.id];
      out[f.id] = raw === undefined || raw === '' ? NaN : Number(raw);
      out[`${f.id}_text`] = raw ?? '';
    }
    return out;
  };
  for (const f of step.fields || []) {
    if (!f.compute) continue;
    let next;
    try {
      next = f.compute(read());
    } catch {
      next = NaN;
    }
    responses[f.id] = Number.isFinite(next)
      ? next.toFixed(f.decimals ?? 2)
      : '';
  }
  const values = read();
  const verdict = step.validate ? step.validate(values, ctx) || null : null;
  return { values, verdict };
}

/** Strip the markup a lesson's verdict writes for the panel. */
export const plain = html =>
  String(html ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Carry a Kepler's 2nd Law world through its first periapsis and then its
 * first apoapsis, returning the event each time.
 *
 * Factored out because `gradeAll` has to replay it. The two validators that
 * take a context read the eccentric orbit's elements, and the state those
 * should be read in is the state the panel would be in when it marked the
 * work: at the far end, after both readings have been taken. Grading from a
 * freshly built world would read the same numbers today - a and e are
 * conserved to five decimals across the orbit - and would be the wrong thing
 * to have written down.
 *
 * `at` is called the moment each event fires, while the world is still in the
 * state that event describes. It is a callback and not a returned list for
 * exactly that reason: the first version of this returned both events and then
 * sampled, which read the apoapsis state into the periapsis row. The build
 * refused to write it, which is the invariant doing its job, but the shape
 * that made the mistake possible is worth not having.
 *
 * @param {object} world - From `buildScenario`
 * @param {Function} body - Exact-name body lookup in that world
 * @param {?Function} at - Called as (scheduleId, event) at each event
 * @returns {Promise<void>} When the world is sitting at the second extreme
 */
async function runKeplerExtremes(world, body, at = null) {
  for (const [id, kind] of [
    ['kepler-periapsis', 'periapsis'],
    ['kepler-apoapsis', 'apoapsis'],
  ]) {
    const entry = SCHEDULE.find(s => s.id === id);
    const event = await runToEvent(
      world,
      { kind, bodyId: 'target', primaryId: 'primary' },
      pid =>
        body(pid === 'target' ? entry.at.event.body : entry.at.event.primary),
      entry.at.maxDays
    );
    if (event.refused) {
      throw new Error(
        `Pause at Event refused a ${kind} watch: ${event.refused}`
      );
    }
    if (at) at(id, event);
  }
}

/**
 * Run the whole schedule and produce the workbook's scientific content.
 *
 * @returns {Promise<object>} The science block, ready to serialize
 */
export async function measure() {
  const samples = {};
  const stepPlans = {};

  // --- Kepler's 2nd Law: the shape of one orbit, and its two extremes -------
  {
    const world = await buildScenario("Kepler's 2nd Law", SEED);
    const plan = fixedStepPlan(world.settings);
    stepPlans["Kepler's 2nd Law"] = plan;
    const body = name =>
      allBodies(world.physics).find(b => (b.name || '') === name) || null;

    // t = 0, read through the step's own probe.
    const twoOrbits = stepOf('measure-the-two-orbits');
    const atBuild = {};
    for (const name of ['Circular Orbiter', 'Eccentric Orbiter']) {
      const ctx = lessonContext(world, body(name));
      atBuild[name] = twoOrbits.probe(ctx).map(r => ({ ...r }));
    }
    samples['kepler-t0'] = { day: clockDays(world.physics), probe: atBuild };

    // The two extremes, located by the application's own watcher. Periapsis
    // first: the orbit is built at periapsis, so the watcher has to carry it a
    // whole revolution, which is the honest test of the integrator.
    const fastSlow = stepOf('fast-and-slow-in-numbers');
    await runKeplerExtremes(world, body, (id, event) => {
      const ctx = lessonContext(world, body('Eccentric Orbiter'));
      const el = ctx.elements();
      samples[id] = {
        day: clockDays(world.physics),
        event: {
          kind: event.kind,
          timeDays: event.timeDays,
          bracketDays: event.bracketDays,
          overshootDays: event.overshootDays,
        },
        // AU and km/s, through the context's own converters, as the readout
        // the student is told to copy from shows them.
        distanceAu: ctx.au(el.r),
        // Read after the world is built, never before: js/units.js derives its
        // time and velocity scale from the simulation's gravitational
        // constant, which js/physics.js sets when a scenario's settings are
        // applied. A conversion cached at start-up is the default scenario's,
        // silently, for every scenario after it.
        speedKms: (el.v * velocityUnitToMs()) / 1000,
        probe: fastSlow.probe(ctx).map(r => ({ ...r })),
      };
    });
  }

  // --- Solar System: the third law, at two named times ----------------------
  {
    const world = await buildScenario('Solar System', SEED);
    stepPlans['Solar System'] = fixedStepPlan(world.settings);
    const fourPlanets = stepOf('measure-four-planets');
    const ordered = () =>
      allBodies(world.physics)
        .filter(b => PLANET_ORDER.includes(b.name))
        .sort(
          (a, b) => PLANET_ORDER.indexOf(a.name) - PLANET_ORDER.indexOf(b.name)
        );

    for (const id of ['solar-t0', 'solar-one-year']) {
      const entry = SCHEDULE.find(s => s.id === id);
      const advance = advanceToDay(world, entry.at.day);
      const rows = [];
      for (const b of ordered()) {
        // The lesson's own "copy this reading into the table" function. Not a
        // formula lifted out of it: the function itself.
        const row = fourPlanets.importFromSelection(lessonContext(world, b));
        if (row) rows.push(row);
      }
      samples[id] = {
        day: clockDays(world.physics),
        steps: advance.steps,
        rows,
      };
    }
  }

  // --- TRAPPIST-1: weighing a star ------------------------------------------
  {
    const world = await buildScenario('TRAPPIST-1 System', SEED);
    stepPlans['TRAPPIST-1 System'] = fixedStepPlan(world.settings);
    const weigh = stepOf('weigh-trappist-1-yourself');
    const rows = [];
    for (const b of allBodies(world.physics).filter(b =>
      /^TRAPPIST-1[b-h]$/.test(b.name || '')
    )) {
      const ctx = lessonContext(world, b);
      const el = ctx.elements();
      rows.push({
        name: b.name,
        aAu: fix(ctx.au(el.a), 4),
        periodDays: fix(simDays(el.period), 4),
        probe: weigh.probe(ctx).map(r => ({ ...r })),
      });
    }
    samples['trappist-t0'] = { day: 0, rows };
  }

  return { seed: SEED, stepPlans, samples };
}

/** The eight, in orbital order, so the table is not seeded by list order. */
const PLANET_ORDER = [
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
];

/**
 * Grade every table in the workbook with the lesson's own validators.
 *
 * @param {object} science - From `measure`
 * @returns {Promise<Array<object>>} One record per graded step
 */
export async function gradeAll(science) {
  const out = [];

  // 1. measure-the-two-orbits - needs a context, so its world is rebuilt at
  //    the state the reading was taken in: t = 0.
  {
    const world = await buildScenario("Kepler's 2nd Law", SEED);
    const ctx = lessonContext(world, null);
    const step = stepOf('measure-the-two-orbits');
    const rowsOf = name =>
      Object.fromEntries(
        science.samples['kepler-t0'].probe[name].map(r => [r.label, r.value])
      );
    const circ = rowsOf('Circular Orbiter');
    const ecc = rowsOf('Eccentric Orbiter');
    const au = s => String(s).replace(/\s*AU$/, '');
    out.push(
      record(
        step,
        gradeWithLesson(
          step,
          {
            circ_e: circ['Eccentricity e'],
            ecc_e: ecc['Eccentricity e'],
            ecc_peri: au(ecc['Closest (periapsis)']),
            ecc_apo: au(ecc['Furthest (apoapsis)']),
          },
          ctx
        )
      )
    );
  }

  // 2. fast-and-slow-in-numbers - the two extremes the watcher found. The
  //    world is carried through both of them before it grades, so the context
  //    is the one the panel would have had when it marked the second reading.
  {
    const world = await buildScenario("Kepler's 2nd Law", SEED);
    const named = n =>
      allBodies(world.physics).find(b => (b.name || '') === n) || null;
    await runKeplerExtremes(world, named);
    const ctx = lessonContext(world, null);
    const step = stepOf('fast-and-slow-in-numbers');
    const peri = science.samples['kepler-periapsis'];
    const apo = science.samples['kepler-apoapsis'];
    out.push(
      record(
        step,
        gradeWithLesson(
          step,
          {
            v_peri: fix(peri.speedKms, 1),
            r_peri: fix(peri.distanceAu, 3),
            v_apo: fix(apo.speedKms, 1),
            r_apo: fix(apo.distanceAu, 3),
          },
          ctx
        )
      )
    );
  }

  // 3 and 4. The third law, from the Solar System table at t = 0.
  {
    const step = stepOf('measure-four-planets');
    const rows = science.samples['solar-t0'].rows;
    const entered = {};
    rows.slice(0, 8).forEach(([name, a, P], i) => {
      entered[`p${i + 1}_name`] = name;
      entered[`p${i + 1}_a`] = a;
      entered[`p${i + 1}_P`] = P;
    });
    out.push(record(step, gradeWithLesson(step, entered, null)));

    const outer = rows.reduce((best, r) =>
      Number(r[1]) > Number(best[1]) ? r : best
    );
    const lawStep = stepOf('work-the-law-out-step');
    out.push(
      record(
        lawStep,
        gradeWithLesson(lawStep, { k_a: outer[1], k_P: outer[2] }, null)
      )
    );
  }

  // 5. Weighing TRAPPIST-1, once per planet: all seven must agree, which is
  //    the lesson's own claim and worth holding it to.
  {
    const step = stepOf('weigh-trappist-1-yourself');
    for (const row of science.samples['trappist-t0'].rows) {
      out.push(
        record(
          step,
          gradeWithLesson(
            step,
            { w_name: row.name, w_a: row.aAu, w_Pd: row.periodDays },
            null
          ),
          row.name
        )
      );
    }
  }

  return out;
}

/** One graded record, in the shape the report and the PDF both read. */
function record(step, { values, verdict }, subject = null) {
  return {
    sid: step.sid,
    title: step.title,
    subject,
    level: verdict?.level ?? 'none',
    message: plain(verdict?.message),
    entered: Object.fromEntries(
      (step.fields || []).map(f => [f.id, values[`${f.id}_text`]])
    ),
  };
}

/** A stable digest of the scientific table, for the PDF's provenance block. */
export const digestOf = science =>
  createHash('sha256')
    .update(JSON.stringify(science))
    .digest('hex')
    .slice(0, 16);
