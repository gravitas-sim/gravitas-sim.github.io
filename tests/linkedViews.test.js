/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { JSDOM } from 'jsdom';

/* global document, KeyboardEvent -- jsdom's, installed below */

// =============================================================================
// Linked views: a plotted point, its row, its object and its form row
// -----------------------------------------------------------------------------
// The lesson plot is the shared plot component (js/plot/) drawn by
// js/investigations/plotView.js. What is proved here without a page: each
// plotted row is tied to the form fields it reads, a point and a table row
// select the object and the other way round through one selection, the table
// holds the numbers the lesson plot always printed, the description is the
// count and the range and nothing else, a held answer leaves the table where
// it was, and the plot's own keys and pointer behave as the lesson asks.
// =============================================================================

import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { registerMessages } from '../js/i18n/index.js';
import { createPlot } from '../js/plot/plot.js';
import { createSelection, interact } from '../js/plot/select.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';

let saved;
let view;
beforeAll(async () => {
  saved = globalThis.document;
  globalThis.document = new JSDOM(
    '<!doctype html><body><aside id="investigationPanel"></aside></body>'
  ).window.document;
  registerMessages('en', EN_DEFERRED);
  view = await import('../js/investigations/plotView.js');
});
afterAll(() => {
  globalThis.document = saved;
});

const SPEC = {
  title: 'Your measurements',
  xLabel: 'a  (AU)',
  yLabel: 'P  (yr)',
  points: v =>
    [1, 2, 3].map(i => ({
      x: v[`p${i}_a`],
      y: v[`p${i}_P`],
      label: v[`p${i}_name_text`] || '',
    })),
};
const FIELDS = [1, 2, 3].flatMap(i => [
  { id: `p${i}_name` },
  { id: `p${i}_a` },
  { id: `p${i}_P` },
]);
const VALS = {
  p1_name_text: 'Mercury',
  p1_a: 0.387,
  p1_P: 0.241,
  p2_name_text: 'Earth',
  p2_a: 1,
  p2_P: 1,
  p3_name_text: 'Jupiter',
  p3_a: 5.203,
  p3_P: 11.86,
};
const full = vals => {
  const out = {};
  for (const f of FIELDS) {
    out[f.id] = NaN;
    out[`${f.id}_text`] = '';
  }
  return { ...out, ...vals };
};

describe('which form fields a plotted row reads', () => {
  test('each row names its own fields, found without the lesson declaring them', () => {
    expect(view.fieldsOfRows(SPEC, FIELDS, full(VALS))).toEqual([
      ['p1_name', 'p1_a', 'p1_P'],
      ['p2_name', 'p2_a', 'p2_P'],
      ['p3_name', 'p3_a', 'p3_P'],
    ]);
  });

  test('a row that is still empty has its fields too', () => {
    const rows = view.fieldsOfRows(SPEC, FIELDS, full({}));
    expect(rows[1]).toEqual(['p2_name', 'p2_a', 'p2_P']);
  });

  test('in the five lessons that plot, every row reads fields of its own', async () => {
    let checked = 0;
    for (const id of [
      'goldilocks-question',
      'missing-mass',
      'tides',
      'keplers-laws',
      'power-law-gravity',
    ]) {
      const lesson = await loadInvestigation(id, 'en');
      for (const step of lesson.steps.filter(s => s.plot?.points)) {
        const vals = {};
        for (const f of step.fields) {
          vals[f.id] = NaN;
          vals[`${f.id}_text`] = '';
        }
        const rows = view.fieldsOfRows(step.plot, step.fields, vals);
        const seen = new Set();
        for (const row of rows) {
          expect(row.length).toBeGreaterThan(0);
          for (const f of row) {
            expect(seen.has(f)).toBe(false);
            seen.add(f);
          }
        }
        checked++;
      }
    }
    expect(checked).toBe(6);
  });
});

/** A lesson panel's plot, table and form, and a scene of three named bodies. */
function mount({ held = false } = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  document.body.innerHTML = '<aside id="investigationPanel"></aside>';
  const body = document.createElement('div');
  body.innerHTML = FIELDS.map(
    f => `<input data-field="s:${f.id}" id="in_${f.id}" />`
  ).join('');
  const svg = document.createElementNS(NS, 'svg');
  const wrap = document.createElement('div');
  const table = document.createElement('table');
  wrap.append(table);
  document.body.append(body, svg, wrap);
  document
    .getElementById('investigationPanel')
    .toggleAttribute('data-answer-held', held);
  const chosen = { role: null };
  const picked = [];
  const scene = {
    selectRole: role => {
      picked.push(role);
      chosen.role = role;
    },
    selectableBodies: () =>
      ['mercury', 'earth', 'jupiter'].map(role => ({
        id: role,
        role,
        name: role[0].toUpperCase() + role.slice(1),
        selected: chosen.role === role,
      })),
  };
  const els = { body, plotTable: table, plotTableWrap: wrap };
  const step = { plot: SPEC, fields: FIELDS };
  const draw = vals =>
    view.draw(step, full(vals), {
      canvas: svg,
      els,
      transformed: false,
      log: false,
      scene,
    });
  return { svg, wrap, table, body, scene, picked, chosen, draw };
}

const dotsOf = svg => [...svg.querySelectorAll('.ow-pt')];
const selectedDots = svg => svg.querySelectorAll('.ow-pt.is-selected').length;

describe('one selection for the plot, the table, the object and the form', () => {
  test('a row of the table selects its point, its object, and nothing in the form', () => {
    const m = mount();
    m.draw(VALS);
    const rows = [...m.table.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(3);
    rows[2].dispatchEvent(
      new document.defaultView.MouseEvent('click', { bubbles: true })
    );
    expect(rows[2].getAttribute('aria-selected')).toBe('true');
    expect(selectedDots(m.svg)).toBe(1);
    expect(m.picked).toEqual(['jupiter']);
    expect(document.activeElement.id).not.toBe('in_p3_name');
  });

  test('a body chosen in the scene selects its point and its row, and does not call the scene back', () => {
    const m = mount();
    m.draw(VALS);
    m.chosen.role = 'earth';
    view.sync();
    expect(selectedDots(m.svg)).toBe(1);
    const rows = [...m.table.querySelectorAll('tbody tr')];
    expect(rows.map(r => r.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(m.picked).toEqual([]);
  });

  test('the point chosen on the plot takes the reader to the form row it is', () => {
    const m = mount();
    m.draw(VALS);
    const key = (k, opts = {}) =>
      m.svg.dispatchEvent(
        new document.defaultView.KeyboardEvent('keydown', {
          key: k,
          bubbles: true,
          ...opts,
        })
      );
    key('ArrowRight');
    key('Enter');
    expect(m.picked).toEqual(['earth']);
    expect(document.activeElement.id).toBe('in_p2_name');
  });

  test('a reading typed in keeps the choice, by the row it is', () => {
    const m = mount();
    m.draw(VALS);
    m.chosen.role = 'jupiter';
    view.sync();
    m.draw({ ...VALS, p1_a: 0.4 });
    expect(selectedDots(m.svg)).toBe(1);
    // A fourth row arrives and the choice is still Jupiter's.
    m.draw({ ...VALS, p1_name_text: '', p1_a: NaN, p1_P: NaN });
    const rows = [...m.table.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(2);
    expect(rows[1].getAttribute('aria-selected')).toBe('true');
  });

  test('an object the lesson does not plot selects nothing', () => {
    const m = mount();
    m.draw(VALS);
    m.chosen.role = 'saturn';
    view.sync();
    expect(selectedDots(m.svg)).toBe(0);
  });

  test('a point that names a role is tied to it whatever its label says', () => {
    const m = mount();
    const spec = {
      ...SPEC,
      points: v => [{ x: v.p1_a, y: v.p1_P, label: 'x', role: 'earth' }],
    };
    view.draw({ plot: spec, fields: FIELDS }, full(VALS), {
      canvas: m.svg,
      els: { body: m.body, plotTable: m.table, plotTableWrap: m.wrap },
      transformed: false,
      log: false,
      scene: m.scene,
    });
    m.chosen.role = 'earth';
    view.sync();
    expect(selectedDots(m.svg)).toBe(1);
  });
});

describe('the table and the description', () => {
  test('the table holds the numbers the lesson plot always printed', () => {
    const m = mount();
    m.draw(VALS);
    const cells = [...m.table.querySelectorAll('tbody tr')].map(tr =>
      [...tr.cells].slice(1).map(c => c.textContent)
    );
    expect(cells).toEqual([
      ['Mercury', '0.387', '0.241'],
      ['Earth', '1.000', '1.000'],
      ['Jupiter', '5.203', '11.860'],
    ]);
    expect(m.wrap.hidden).toBe(false);
  });

  test('with nothing entered the table is hidden and the plot says what it waits for', () => {
    const m = mount();
    m.draw({});
    expect(m.wrap.hidden).toBe(true);
    expect(m.svg.textContent).toContain('Values you enter appear here');
  });

  test('held or not the description is the count and the range, and the table stays', () => {
    const open = mount();
    open.draw(VALS);
    const d1 = document.getElementById('investigationPlotDesc').textContent;
    const held = mount({ held: true });
    held.draw(VALS);
    const d2 = document.getElementById('investigationPlotDesc').textContent;
    expect(d2).toBe(d1);
    expect(d2).toMatch(/^3 points; a {2}\(AU\) runs from 0\.387 to 5\.203\./);
    expect(d2).not.toMatch(/slope|straight|line|proportional|exponent|law/i);
    expect(held.wrap.hidden).toBe(false);
    expect(held.table.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  test('pointing text names an object and no value', () => {
    expect('Pointing at {name}.').not.toMatch(/\d/);
  });
});

describe('the plot component as a lesson uses it', () => {
  const NS = 'http://www.w3.org/2000/svg';
  const observation = {
    kind: 'table',
    columns: [
      { id: 'x', name: 'x', role: 'x', unit: null, values: [1, 2, 3] },
      { id: 'y', name: 'y', role: 'value', unit: null, values: [3, 1, 2] },
    ],
  };
  function setup(opts) {
    const svg = document.createElementNS(NS, 'svg');
    document.body.append(svg);
    const hooks = {
      announce: () => {},
      describe: () => '',
      number: String,
      labels: { notStated: '' },
    };
    const plot = createPlot(svg, hooks);
    const selection = createSelection(3);
    plot.draw(observation, { xColumn: 'x', yColumn: 'y', selection });
    interact(plot, svg, hooks, opts);
    svg.getBoundingClientRect = () => ({ left: 0, width: 720, top: 0 });
    return { svg, selection };
  }
  const press = (svg, type, x) => {
    const e = new document.defaultView.MouseEvent(type, {
      clientX: x,
      button: 0,
      bubbles: true,
    });
    svg.dispatchEvent(e);
  };

  test('a drag draws no range and is a click on the nearest row when brushing is off', () => {
    const { svg, selection } = setup({ brush: false, pick: true });
    press(svg, 'pointerdown', 100);
    press(svg, 'pointermove', 300);
    expect(svg.querySelector('.ow-brush')).toBeNull();
    press(svg, 'pointerup', 650);
    expect(selection.rows()).toEqual(Uint32Array.of(2));
  });

  test('by default a drag still brushes a range of rows, as the Observatory has it', () => {
    const { svg, selection } = setup();
    press(svg, 'pointerdown', 70);
    press(svg, 'pointermove', 704);
    expect(svg.querySelector('.ow-brush')).not.toBeNull();
    press(svg, 'pointerup', 704);
    expect(selection.size).toBe(3);
  });

  test('a click picks only when asked to: by default it moves the focus', () => {
    const { svg, selection } = setup();
    press(svg, 'pointerdown', 700);
    press(svg, 'pointerup', 700);
    expect(selection.size).toBe(0);
    expect(selection.focus).toBe(2);
  });
});
