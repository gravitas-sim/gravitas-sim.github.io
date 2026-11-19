import { describe, test, expect, beforeAll } from '@jest/globals';

import { loadAuthoringInputs } from '../tools/authoring/inputs.mjs';
import { checkCatalog } from '../js/authoring/rules.js';
import { openingValues, startButton } from '../js/widgets.js';
import { loadMap, judgeOpening } from '../tools/authoring/neutralStart.mjs';
import { judgeCatalog, group } from '../tools/neutral-start-report.mjs';
import { makeView, viewFindings } from '../tools/authoring/standardRules.mjs';

// =============================================================================
// Instruments that do not open at the answer
// -----------------------------------------------------------------------------
// A step can declare where its instrument opens (`tool.start`) apart from what
// its check accepts (`tool.values`); saved control values still go over either;
// a button returns the instrument there; and the detector grades the fields the
// opening readouts would fill, never the controls.
// =============================================================================

let inputs;
let map;
beforeAll(async () => {
  inputs = await loadAuthoringInputs();
  map = loadMap();
});

const stepOf = (lesson, sid) =>
  inputs.investigations
    .find(i => i.id === lesson)
    .steps.find(s => s.sid === sid);
const widgetOf = step => inputs.widgets.find(w => w.id === step.tool.id);
const judge = (lesson, sid, step = stepOf(lesson, sid)) =>
  judgeOpening(step, widgetOf(step), map[`${lesson}/${sid}`]);

// Io's Fire as 3.0 shipped it: its heating step opened at the values it asked the student to
// read, so it is the confirmed case of an instrument that opens at the answer. The lesson has
// since been revised, so the step is kept here as data and judged with the table row it had.
const near = (x, want, tol) => Number.isFinite(x) && Math.abs(x - want) <= tol;
const IO_3_0 = {
  sid: 'heating-at-the-maximum',
  type: 'measure',
  fields: [
    { id: 'power', label: 'Heating', unit: '1e13 W' },
    { id: 'orbit', label: 'Energy in one orbit (10¹⁹ J)', unit: '' },
  ],
  validate: v => {
    if (![v.power, v.orbit].every(Number.isFinite)) return null;
    return near(v.power, 9.33, 0.1) && near(v.orbit, 1.43, 0.03)
      ? { level: 'ok', message: 'ok' }
      : { level: 'error', message: 'no' };
  },
  tool: {
    id: 'tides-heating',
    values: { k2: 1.5, Q: 100, e: 0.0041 },
    hide: [],
  },
};
const IO_MAP = { power: 'Heating', orbit: 'Energy in one orbit (period)' };
const judgeIo = (step = IO_3_0, entry = IO_MAP) =>
  judgeOpening(step, widgetOf(step), entry);

describe('where an instrument opens', () => {
  const widget = {
    controls: [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ],
  };

  test('without a start, tool.values is where it opens, as before', () => {
    expect(openingValues(widget, { values: { a: 5 } })).toEqual({ a: 5, b: 2 });
    expect(openingValues(widget, undefined)).toEqual({ a: 1, b: 2 });
  });

  test('a start replaces the values for the opening position', () => {
    expect(
      openingValues(widget, { values: { a: 5, b: 6 }, start: { a: 3 } })
    ).toEqual({ a: 3, b: 2 });
  });

  test('values the student left behind go over the start', () => {
    const saved = c => ({ a: '9', b: '' })[c];
    expect(openingValues(widget, { start: { a: 3, b: 4 } }, saved)).toEqual({
      a: 9,
      b: 4,
    });
    expect(openingValues(widget, { values: { a: 3 } }, saved).a).toBe(9);
    expect(openingValues(widget, {}, () => 'x')).toEqual({ a: 1, b: 2 });
  });
});

describe('the way back to the start', () => {
  const widget = { controls: [{ id: 'a', value: 1 }] };
  const stripOf = () => {
    document.body.innerHTML = '<div id="s" hidden></div><p id="n">note</p>';
    return {
      toolActions: document.getElementById('s'),
      toolPresetNote: document.getElementById('n'),
    };
  };

  test('a step with no start has no button', () => {
    const els = stripOf();
    startButton(els, widget, { values: { a: 5 } }, { a: 7 }, () => {});
    expect(els.toolActions.children).toHaveLength(0);
    expect(els.toolActions.hidden).toBe(true);
  });

  test('the button returns the controls to the start, keeps its words and clears the note', () => {
    const els = stripOf();
    const values = { a: 7 };
    let painted = 0;
    startButton(els, widget, { start: { a: 3 } }, values, () => painted++);
    const [button] = els.toolActions.children;
    expect(els.toolActions.hidden).toBe(false);
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.textContent.length).toBeGreaterThan(10);
    button.click();
    expect(values).toEqual({ a: 3 });
    expect(painted).toBe(1);
    expect(els.toolPresetNote.textContent).toBe('');
  });
});

describe('the detector grades the fields the opening readouts fill', () => {
  test('Io: the heating step opens at the answer, and the controls alone say nothing', () => {
    const step = IO_3_0;
    expect(step.validate(step.tool.values)).toBeNull();
    const r = judgeIo();
    expect(r.verdict).toBe('opens-at-answer');
    expect(r.fields.power).toBeCloseTo(9.33, 2);
    expect(r.fields.orbit).toBeCloseTo(1.43, 2);
  });

  test('Io again, with a start declared elsewhere on the controls, is neutral', () => {
    const step = IO_3_0;
    const moved = {
      ...step,
      tool: { ...step.tool, start: { k2: 0.5, Q: 300, e: 0.002 } },
    };
    expect(judgeIo(moved).verdict).toBe('neutral');
  });

  test('Io as revised: the heating step opens away from both readings, so it is neutral', () => {
    const step = stepOf('ios-fire', 'heating-at-two-eccentricities');
    expect(step.tool.start).toEqual({ k2: 0.8, Q: 250, e: 0.001 });
    const r = judge('ios-fire', 'heating-at-two-eccentricities');
    expect(r.verdict).toBe('neutral');
    // The readout at the opening reads 1.18 x 10^12 W: its number is 1.18, in the wrong exponent.
    expect(r.fields.p1).toBeCloseTo(1.18, 2);
    expect(r.fields.p2).toBeCloseTo(1.18, 2);
  });

  test('Tides That Move the Moon as revised: the Q step opens at a Q that does not fit', () => {
    const r = judge('tides-that-move-the-moon', 'match-the-recession');
    expect(r.verdict).toBe('neutral');
    expect(r.fields.q).toBe(40);
  });

  test('Measuring the Moon: the opening state is rejected, so it is neutral', () => {
    const r = judge('measuring-the-moon', 'mark-the-disc-width');
    expect(r.verdict).toBe('neutral');
    expect(r.fields.pair).toBe(380);
    // The slant step opens with the circle at the disc's center, not on the plain.
    for (const sid of [
      'a-pair-that-stops-short',
      'measure-the-plain',
      'squeezed-at-the-plain',
    ])
      expect(judge('measuring-the-moon', sid).verdict).toBe('neutral');
  });

  test('a field and a control that share a name: the slider number is what is typed', () => {
    const r = judge('why-venus-is-hot', 'gray-depth-for-venus');
    expect(r.verdict).toBe('opens-at-answer');
    expect(r.fields).toEqual({ tau: 141.6 });
    const step = stepOf('why-venus-is-hot', 'gray-depth-for-venus');
    const away = { ...step, tool: { ...step.tool, start: { tau: 3 } } };
    expect(
      judge('why-venus-is-hot', 'gray-depth-for-venus', away).verdict
    ).toBe('neutral');
  });

  test('a step that reads a prepared state says so and is not judged', () => {
    const step = IO_3_0;
    const prepared = { ...step, prepared: true };
    expect(judgeIo(prepared).verdict).toBe('prepared');
    const view = makeView(
      {
        id: 'ios-fire',
        steps: [{ ...prepared, sid: 'heating-at-the-maximum' }],
      },
      {},
      {
        widgets: inputs.widgets,
        map: { 'ios-fire/heating-at-the-maximum': IO_MAP },
      }
    );
    expect(viewFindings(view).map(f => f.rule)).not.toContain(
      'leak/opens-at-answer'
    );
  });

  test('a step with no reviewed mapping is unmapped, never fine', () => {
    const step = IO_3_0;
    const r = judgeOpening(step, widgetOf(step), {});
    expect(r.verdict).toBe('unmapped');
    expect(r.reason).toMatch(/power, orbit/);
    // A field the table says is not an instrument reading cannot be filled either.
    const written = judge('orbital-energy', 'write-down-the-dividing-speed');
    expect(written.verdict).toBe('unmapped');
    expect(written.reason).toMatch(/back, gone/);
  });

  test('a field that names a field of its own, source.tool, is read without the table', () => {
    const step = IO_3_0;
    const declared = {
      ...step,
      fields: step.fields.map(f => ({
        ...f,
        source: {
          tool: f.id === 'power' ? 'Heating' : 'Energy in one orbit (period)',
        },
      })),
    };
    expect(judgeOpening(declared, widgetOf(step), undefined).verdict).toBe(
      'opens-at-answer'
    );
  });
});

describe('the rule and the three lists', () => {
  test('the rule finds Io as 3.0 shipped it, and nothing for the revised lesson or Measuring the Moon', () => {
    const find = (inv, sid, table = map) =>
      viewFindings(
        makeView(inv, {}, { widgets: inputs.widgets, map: table })
      ).filter(f => f.rule === 'leak/opens-at-answer' && f.sid === sid).length;
    const lesson = id => inputs.investigations.find(i => i.id === id);
    expect(
      find({ id: 'ios-fire', steps: [IO_3_0] }, 'heating-at-the-maximum', {
        'ios-fire/heating-at-the-maximum': IO_MAP,
      })
    ).toBe(1);
    expect(find(lesson('ios-fire'), 'heating-at-two-eccentricities')).toBe(0);
    expect(find(lesson('measuring-the-moon'), 'mark-the-disc-width')).toBe(0);
  });

  test('the catalog sorts into opens-at-answer, neutral, unmapped and prepared', () => {
    const lists = group(judgeCatalog(inputs, map));
    expect(lists['opens-at-answer']['ios-fire']).toBeUndefined();
    expect(lists.neutral['ios-fire']).toEqual([
      'heating-at-two-eccentricities',
    ]);
    expect(lists.neutral['tides-that-move-the-moon']).toEqual([
      'match-the-recession',
    ]);
    expect(lists.neutral['measuring-the-moon']).toEqual([
      'mark-the-disc-width',
      'a-pair-that-stops-short',
      'measure-the-plain',
      'squeezed-at-the-plain',
    ]);
    const unmapped = Object.values(lists.unmapped).flat();
    expect(unmapped.length).toBeGreaterThan(100);
  });

  test('a start is checked like a value: a control that is not there, a number outside the range', () => {
    const copy = { ...inputs };
    copy.investigations = inputs.investigations.map(inv =>
      inv.id !== 'ios-fire'
        ? inv
        : {
            ...inv,
            steps: inv.steps.map(s =>
              s.sid !== 'heating-at-two-eccentricities'
                ? s
                : { ...s, tool: { ...s.tool, start: { nope: 1, Q: 5000 } } }
            ),
          }
    );
    const found = checkCatalog(copy).filter(
      f => f.lesson === 'ios-fire' && /tool\.start/.test(f.message)
    );
    expect(found.map(f => f.rule).sort()).toEqual([
      'ref/control',
      'setup/value',
    ]);
  });
});
