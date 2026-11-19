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
    const step = stepOf('ios-fire', 'heating-at-the-maximum');
    expect(step.validate(step.tool.values)).toBeNull();
    const r = judge('ios-fire', 'heating-at-the-maximum');
    expect(r.verdict).toBe('opens-at-answer');
    expect(r.fields.power).toBeCloseTo(9.33, 2);
    expect(r.fields.orbit).toBeCloseTo(1.43, 2);
  });

  test('Io again, with a start declared elsewhere on the controls, is neutral', () => {
    const step = stepOf('ios-fire', 'heating-at-the-maximum');
    const moved = {
      ...step,
      tool: { ...step.tool, start: { k2: 0.5, Q: 300, e: 0.002 } },
    };
    expect(judge('ios-fire', 'heating-at-the-maximum', moved).verdict).toBe(
      'neutral'
    );
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
    const step = stepOf('ios-fire', 'heating-at-the-maximum');
    const prepared = { ...step, prepared: true };
    expect(judge('ios-fire', 'heating-at-the-maximum', prepared).verdict).toBe(
      'prepared'
    );
    const view = makeView(
      {
        id: 'ios-fire',
        steps: [{ ...prepared, sid: 'heating-at-the-maximum' }],
      },
      {},
      { widgets: inputs.widgets, map }
    );
    expect(viewFindings(view).map(f => f.rule)).not.toContain(
      'leak/opens-at-answer'
    );
  });

  test('a step with no reviewed mapping is unmapped, never fine', () => {
    const step = stepOf('ios-fire', 'heating-at-the-maximum');
    const r = judgeOpening(step, widgetOf(step), {});
    expect(r.verdict).toBe('unmapped');
    expect(r.reason).toMatch(/power, orbit/);
    // A field the table says is not an instrument reading cannot be filled either.
    const written = judge('orbital-energy', 'write-down-the-dividing-speed');
    expect(written.verdict).toBe('unmapped');
    expect(written.reason).toMatch(/back, gone/);
  });

  test('a field that names a field of its own, source.tool, is read without the table', () => {
    const step = stepOf('ios-fire', 'heating-at-the-maximum');
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
  test('the rule finds Io and nothing for Measuring the Moon', () => {
    const find = (lesson, sid) => {
      const inv = inputs.investigations.find(i => i.id === lesson);
      return viewFindings(
        makeView(inv, {}, { widgets: inputs.widgets, map })
      ).filter(f => f.rule === 'leak/opens-at-answer' && f.sid === sid).length;
    };
    expect(find('ios-fire', 'heating-at-the-maximum')).toBe(1);
    expect(find('measuring-the-moon', 'mark-the-disc-width')).toBe(0);
  });

  test('the catalog sorts into opens-at-answer, neutral, unmapped and prepared', () => {
    const lists = group(judgeCatalog(inputs, map));
    expect(lists['opens-at-answer']['ios-fire']).toEqual([
      'heating-at-the-maximum',
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
              s.sid !== 'heating-at-the-maximum'
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
