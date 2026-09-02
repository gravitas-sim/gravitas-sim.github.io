// =============================================================================
// Integrity of the lesson content, across every investigation at once
// -----------------------------------------------------------------------------
// Each family of instruments has its own suite - transitWidgets.test.js,
// darkMatterWidgets.test.js and so on - and each of those checks the lessons
// that use it. That leaves a specific gap, and it is the gap a new lesson falls
// straight into: nothing checked the *whole* catalog. A step naming a widget
// that was never registered, a preset setting a slider that no longer exists, a
// setup naming a scenario that has been renamed - all of those would ship, and
// what a student sees is a blank instrument or a step that silently does nothing.
//
// So this suite deliberately knows nothing about any particular lesson. It walks
// every investigation, every step, every tool reference and every scenario name.
// Adding a lesson adds its coverage here for free.
//
// Every test collects a list of problems and then asserts the list is empty,
// rather than asserting inside the loop. Two reasons: this jest does not accept a
// message argument to expect(), so an assertion in a loop over 300 steps fails
// with no indication of which step; and a report of all fifteen broken
// references is more useful than a report of the first one.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS, getInvestigation } from '../js/data/investigations.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import { allWidgets, getWidget, widgetDefaults } from '../js/widgets.js';

/** Every (lesson, step number, step) triple, for tests that want them all. */
const EVERY_STEP = INVESTIGATIONS.flatMap(inv =>
  inv.steps.map((step, i) => ({ lesson: inv.id, n: i + 1, step }))
);

/** Only the steps that reach for an instrument. */
const TOOL_STEPS = EVERY_STEP.filter(s => s.step.tool);

/** A widget's presets, which one instrument declares as a function of the step. */
/**
 * The presets a step actually shows, resolved exactly as the engine resolves
 * them.
 *
 * Two rules, and getting either wrong makes this suite lie. A step can suppress
 * presets outright with `presets: false`, which several do; and one instrument
 * declares its presets as a function of the step so it can withhold the button
 * that would give the answer away.
 *
 * @param {Object} w - A widget
 * @param {Object} [spec] - The step's tool spec
 * @returns {Array} Presets the student can actually press
 */
function presetsOf(w, spec = {}) {
  if (spec.presets === false) return [];
  const declared =
    typeof w.presets === 'function' ? w.presets(spec) : w.presets;
  return declared || [];
}

const where = s => `${s.lesson} step ${s.n} ("${s.step.title}")`;

describe('the lesson catalog', () => {
  test('there are lessons, and each has an id, a title and steps', () => {
    expect(INVESTIGATIONS.length).toBeGreaterThan(5);
    const bad = [];
    for (const inv of INVESTIGATIONS) {
      if (typeof inv.id !== 'string' || !/^[a-z0-9-]+$/.test(inv.id)) {
        bad.push(`${inv.id}: id is not a slug`);
      }
      if (!inv.title || inv.title.length < 4) bad.push(`${inv.id}: no title`);
      if (!inv.steps?.length || inv.steps.length < 4) {
        bad.push(`${inv.id}: too few steps`);
      }
      if (getInvestigation(inv.id) !== inv) {
        bad.push(`${inv.id}: not findable by its own id`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('lesson ids are unique', () => {
    const ids = INVESTIGATIONS.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every step declares a type the engine knows how to render', () => {
    // The engine branches on these. A typo produces a screen with a title and
    // nothing on it, which is not something a reader of the lesson file notices.
    const KNOWN = new Set([
      'read',
      'explore',
      'measure',
      'predict',
      'question',
      'wedges',
      'ellipse',
    ]);
    const bad = EVERY_STEP.filter(s => !KNOWN.has(s.step.type)).map(
      s => `${where(s)}: unknown type "${s.step.type}"`
    );
    expect(bad).toEqual([]);
  });

  test('every step has a title worth showing', () => {
    const bad = EVERY_STEP.filter(
      s => typeof s.step.title !== 'string' || s.step.title.length < 3
    ).map(where);
    expect(bad).toEqual([]);
  });

  test('every graded step carries an answer the grader can use', () => {
    const bad = [];
    for (const s of EVERY_STEP) {
      const { step } = s;
      if ((step.kind === 'choice' || step.type === 'predict') && step.options) {
        if (!Array.isArray(step.options) || step.options.length < 2) {
          bad.push(`${where(s)}: fewer than two options`);
        } else if (
          !Number.isInteger(step.answer) ||
          step.answer < 0 ||
          step.answer >= step.options.length
        ) {
          bad.push(`${where(s)}: answer index ${step.answer} out of range`);
        }
      }
      if (step.kind === 'numeric') {
        if (!Number.isFinite(step.answer)) {
          bad.push(`${where(s)}: numeric step with no finite answer`);
        }
        if (step.tolerance !== undefined && !(step.tolerance > 0)) {
          bad.push(`${where(s)}: tolerance is not positive`);
        }
      }
      if (step.kind === 'short' && (step.rubric || '').length < 40) {
        bad.push(`${where(s)}: short answer with no usable rubric`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('every measure step asks for fields with unique, usable ids', () => {
    const bad = [];
    for (const s of EVERY_STEP) {
      if (s.step.type !== 'measure') continue;
      const fields = s.step.fields;
      if (!Array.isArray(fields) || !fields.length) {
        bad.push(`${where(s)}: measure step with no fields`);
        continue;
      }
      const ids = fields.map(f => f.id);
      if (new Set(ids).size !== ids.length) {
        bad.push(`${where(s)}: duplicate field id`);
      }
      for (const f of fields) {
        if (typeof f.id !== 'string' || !/^[A-Za-z0-9_]+$/.test(f.id)) {
          bad.push(`${where(s)}: field id "${f.id}" is not usable as a key`);
        }
        if (typeof f.label !== 'string' || f.label.length < 3) {
          bad.push(`${where(s)}: field "${f.id}" has no label`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('instrument references', () => {
  test('there are tool steps to check', () => {
    // A guard on the sweeps below: if the lessons stopped declaring tools, every
    // other test in this block would pass by vacuum.
    expect(TOOL_STEPS.length).toBeGreaterThan(30);
  });

  test('every widget a step names is registered', () => {
    const missing = TOOL_STEPS.filter(s => !getWidget(s.step.tool.id)).map(
      s =>
        `${where(s)} names widget "${s.step.tool.id}", which is not registered`
    );
    expect(missing).toEqual([]);
  });

  test('widget ids are unique across the whole registry', () => {
    const seen = new Set();
    const dupes = [];
    for (const w of allWidgets()) {
      if (seen.has(w.id)) dupes.push(w.id);
      seen.add(w.id);
    }
    expect(dupes).toEqual([]);
  });

  test('every registered widget has the shape the engine expects', () => {
    const bad = [];
    for (const w of allWidgets()) {
      if (getWidget(w.id) !== w)
        bad.push(`${w.id}: not findable by its own id`);
      if (typeof w.draw !== 'function') bad.push(`${w.id}: no draw()`);
      if (typeof w.readout !== 'function') bad.push(`${w.id}: no readout()`);
      if (!Array.isArray(w.controls)) bad.push(`${w.id}: no controls array`);
      if (typeof w.title !== 'string') bad.push(`${w.id}: no title`);
    }
    expect(bad).toEqual([]);
  });

  test('every registered widget is used by some lesson', () => {
    // A widget nobody reaches is either a mistake in a lesson or dead weight in
    // the bundle, and both are worth knowing about.
    const used = new Set(TOOL_STEPS.map(s => s.step.tool.id));
    const orphans = allWidgets()
      .map(w => w.id)
      .filter(id => !used.has(id));
    expect(orphans).toEqual([]);
  });

  test('every tool value a step presets is a control, in range', () => {
    const bad = [];
    for (const s of TOOL_STEPS) {
      const values = s.step.tool.values;
      if (!values) continue;
      const w = getWidget(s.step.tool.id);
      if (!w) continue; // reported by the registration test
      for (const [key, raw] of Object.entries(values)) {
        const c = w.controls.find(x => x.id === key);
        if (!c) {
          bad.push(`${where(s)}: "${key}" is not a control of ${w.id}`);
          continue;
        }
        const value = Number(raw);
        if (!Number.isFinite(value)) {
          bad.push(`${where(s)}: ${key} is not a number`);
        } else if (value < c.min || value > c.max) {
          bad.push(
            `${where(s)}: ${key} = ${value} outside [${c.min}, ${c.max}]`
          );
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('every control a step hides is a control the widget has', () => {
    const bad = [];
    for (const s of TOOL_STEPS) {
      const hide = s.step.tool.hide;
      if (!hide) continue;
      const w = getWidget(s.step.tool.id);
      if (!w) continue;
      for (const id of hide) {
        if (!w.controls.some(c => c.id === id)) {
          bad.push(`${where(s)}: hides "${id}", which ${w.id} does not have`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('a preset offered to a step never changes a control that step hides', () => {
    // Otherwise a student on a step that deliberately hides a slider can press
    // one button and move it invisibly, which is how a lesson gives away the
    // answer it has just asked for. This caught exactly that in the
    // rotation-curve fitting instrument, where a "published decomposition"
    // button was reachable on the steps that ask for a fit without a halo.
    //
    // The comparison is against the value the control actually starts at on this
    // step - what the step pinned, or the widget's own default - not against the
    // pinned value alone. A preset that sets a hidden control to the value it
    // already holds changes nothing and is harmless.
    const bad = [];
    for (const s of TOOL_STEPS) {
      const hide = s.step.tool.hide || [];
      if (!hide.length) continue;
      const w = getWidget(s.step.tool.id);
      if (!w) continue;
      const start = widgetDefaults(w, s.step.tool.values);
      for (const p of presetsOf(w, s.step.tool)) {
        for (const [key, value] of Object.entries(p.values)) {
          if (!hide.includes(key)) continue;
          if (Number(value) !== Number(start[key])) {
            bad.push(
              `${where(s)}: preset "${p.label}" moves hidden control ` +
                `"${key}" from ${start[key]} to ${value}`
            );
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('every control declares a usable range with its default inside it', () => {
    const bad = [];
    for (const w of allWidgets()) {
      for (const c of w.controls || []) {
        const at = `${w.id}.${c.id}`;
        if (typeof c.label !== 'string' || !c.label.length) {
          bad.push(`${at}: no label`);
        }
        if (
          !Number.isFinite(c.min) ||
          !Number.isFinite(c.max) ||
          c.min >= c.max
        ) {
          bad.push(`${at}: range [${c.min}, ${c.max}] is not usable`);
          continue;
        }
        if (!(c.step > 0)) bad.push(`${at}: step is not positive`);
        if (!(c.value >= c.min && c.value <= c.max)) {
          bad.push(`${at}: default ${c.value} outside its own range`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('every widget produces a clean readout from its own defaults', () => {
    // The cheapest possible smoke test of the whole registry, and it catches the
    // commonest breakage: a widget whose compute() started needing a control its
    // defaults do not supply.
    const bad = [];
    for (const w of allWidgets()) {
      let rows;
      try {
        rows = w.readout(widgetDefaults(w), undefined, {});
      } catch (err) {
        bad.push(`${w.id}: readout threw - ${err.message}`);
        continue;
      }
      if (!Array.isArray(rows) || !rows.length) {
        bad.push(`${w.id}: readout produced nothing`);
        continue;
      }
      for (const r of rows) {
        if (typeof r.label !== 'string' || !r.label.length) {
          bad.push(`${w.id}: a row has no label`);
        }
        if (/NaN|undefined|Infinity/.test(String(r.value))) {
          bad.push(`${w.id}: row "${r.label}" reads "${r.value}"`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('a widget that advances its own animation can also rewind it', () => {
    // `animated: true` only means "repaint every frame", and a panel that reads
    // live simulation state legitimately needs that with no animation of its
    // own - the live energy readout is one. What does have to hold is the
    // pairing: a widget with a step() has internal state, and internal state
    // that cannot be reset survives a slider change and shows the student the
    // previous run.
    const bad = [];
    for (const w of allWidgets()) {
      const hasStep = typeof w.step === 'function';
      const hasReset = typeof w.reset === 'function';
      if (hasStep && !hasReset) bad.push(`${w.id}: has step(), no reset()`);
      if (hasStep && !w.animated) {
        bad.push(`${w.id}: has step() but is not marked animated`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('scenario references', () => {
  test('every scenario a step sets up is in the catalog', () => {
    // A renamed scenario key leaves the lesson showing whatever was on screen
    // before, which reads to a student as "the step did nothing".
    const bad = EVERY_STEP.filter(
      s => s.step.setup?.scenario && !SCENARIO_INFO[s.step.setup.scenario]
    ).map(
      s => `${where(s)} sets up "${s.step.setup.scenario}", not in the catalog`
    );
    expect(bad).toEqual([]);
  });

  test('every lesson names a scenario at least once', () => {
    const bad = INVESTIGATIONS.filter(
      inv => !inv.steps.some(st => st.setup?.scenario)
    ).map(inv => `${inv.id} never names a scenario`);
    expect(bad).toEqual([]);
  });

  test('every lesson thumbnail points into the committed image set', () => {
    const shape =
      /^images\/(scenarios|investigations)\/[a-z0-9-]+\.(webp|png|jpg)$/;
    const bad = INVESTIGATIONS.filter(
      inv => inv.thumbnail && !shape.test(inv.thumbnail)
    ).map(inv => `${inv.id}: "${inv.thumbnail}"`);
    expect(bad).toEqual([]);
  });
});

describe('plots a lesson draws from a student’s own numbers', () => {
  test('every plot spec survives an empty response set', () => {
    // A student reaches a plot step before typing anything, every time. A points
    // function that assumed its fields were filled would throw and take the
    // whole step down with it.
    const bad = [];
    for (const s of EVERY_STEP) {
      const plot = s.step.plot;
      if (!plot) continue;
      if (typeof plot.points !== 'function') {
        bad.push(`${where(s)}: plot has no points() function`);
        continue;
      }
      let pts;
      try {
        pts = plot.points({});
      } catch (err) {
        bad.push(`${where(s)}: plot.points({}) threw - ${err.message}`);
        continue;
      }
      if (!Array.isArray(pts)) {
        bad.push(`${where(s)}: plot.points({}) did not return an array`);
        continue;
      }
      if (plot.transform) {
        if (typeof plot.transform.map !== 'function') {
          bad.push(`${where(s)}: plot.transform has no map()`);
          continue;
        }
        try {
          for (const p of pts) plot.transform.map(p);
        } catch (err) {
          bad.push(`${where(s)}: plot.transform.map threw - ${err.message}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
