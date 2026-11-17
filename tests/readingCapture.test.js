// =============================================================================
// Readings taken, not retyped
// -----------------------------------------------------------------------------
// A field filled by the student's press of a button: the text as printed, how
// it was taken beside it, an announcement and one ledger entry. And the
// interval reading: mean, number of points and standard error over a chosen
// stretch of a series, with the standard error a hand calculation gives.
// =============================================================================

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import * as figures from '../js/investigations/figures.js';
import {
  fieldModule,
  slots,
  stepMarkup,
} from '../js/investigations/stepView.js';
import { predictionState } from '../js/lesson/held.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { captureToNotebook, setCaptureSink } from '../js/widgetRuntime.js';
import { fromReading } from '../js/notebook/capture.js';
import { SOURCE } from '../js/notebook/entry.js';
import { validateArtifact } from '../js/platform/artifact.js';
import { emptyProbeContext, readingProblems } from '../js/authoring/rules.js';
import { registerMessages } from '../js/i18n/index.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';
import { ensureWidget, getWidget } from '../js/widgets.js';

registerMessages('en', EN_DEFERRED);
registerMessages('es', ES_DEFERRED);

const Y = [2, 4, 4, 4, 5, 5, 7, 9];
const X = [0, 1, 2, 3, 4, 5, 6, 7];

describe('the interval reading', () => {
  test('matches the hand calculation (mean, n, sample sd over sqrt n)', () => {
    const all = figures.spanStats(X, Y, 0, 7);
    expect(all.n).toBe(8);
    expect(all.mean).toBe(5);
    // sum of squares 32, sample variance 32 / 7, standard error sqrt(32 / 7 / 8)
    expect(all.se).toBeCloseTo(0.7559289, 6);
    const part = figures.spanStats(X, Y, 3, 6);
    expect(part.n).toBe(4);
    expect(part.mean).toBe(5.25);
    expect(part.se).toBeCloseTo(0.6291529, 6);
    expect(figures.spanStats(X, Y, 1, 3).se).toBe(0);
  });

  test('refuses fewer than two points, orders reversed bounds, clips and says so', () => {
    expect(figures.spanStats(X, Y, 3, 3.5)).toMatchObject({ ok: false, n: 1 });
    expect(figures.spanStats(X, Y, 6, 3)).toMatchObject({
      ok: true,
      lo: 3,
      hi: 6,
      n: 4,
      clipped: false,
    });
    expect(figures.spanStats(X, Y, -5, 100)).toMatchObject({
      ok: true,
      lo: 0,
      hi: 7,
      n: 8,
      clipped: true,
    });
    // Points that are not numbers are not points.
    expect(figures.spanStats([0, 1, 2, 3], [1, NaN, 3, 5], 0, 3).n).toBe(3);
  });
});

describe('the number a row gives a field', () => {
  test('is the digits as printed, never rounded or converted', () => {
    expect(figures.numberText({ value: '3.2504 d' })).toBe('3.2504');
    expect(figures.numberText({ value: '1,2300 UA' })).toBe('1,2300');
    expect(figures.numberText({ value: '−0.50' })).toBe('−0.50');
    expect(figures.numberText({ value: '12.0 × 10^3', text: '12.0' })).toBe(
      '12.0'
    );
    expect(figures.numberText({ value: 'none' })).toBe(null);
  });

  test('reads the printed text of every instrument the first pilots use', async () => {
    const tools = [
      'depth-size',
      'geometry',
      'spectrum',
      'dilution',
      'resolve',
      'binary',
      'balance',
      'binary-compare',
      'visual-binary',
      'tide-vectors',
      'tide-strength',
      'tide-compare',
      'tide-balance',
      'roche-model',
      'tide-disrupt',
      'moon-marks',
      'tides-heating',
    ];
    let rowsSeen = 0;
    for (const id of tools) {
      await ensureWidget(id);
      const w = getWidget(id);
      expect(w).toBeTruthy();
      const values = Object.fromEntries(
        (w.controls || []).map(c => [c.id, c.value])
      );
      let rows = [];
      try {
        rows = w.readout(values, w.live ? emptyProbeContext() : undefined, {
          id,
        });
      } catch {
        rows = [];
      }
      for (const row of rows) {
        const text = figures.numberText(row);
        if (text === null) continue;
        rowsSeen++;
        // A verbatim piece of what is printed: nothing rounded, nothing converted.
        expect(String(row.value)).toContain(text);
      }
    }
    expect(rowsSeen).toBeGreaterThan(10);
  });
});

describe('predictionState', () => {
  const lessons = INVESTIGATIONS.map(inv => ({
    inv,
    held: inv.steps.filter(s => s.reveal),
  })).filter(x => x.held.length);
  const total = lessons.reduce((n, x) => n + x.held.length, 0);

  test('there are predictions to test', () => {
    expect(total).toBeGreaterThan(150);
  });

  test('none before the prediction; uncommitted, committed, revealed through it', () => {
    for (const { inv, held } of lessons) {
      for (const step of held) {
        const at = inv.steps.indexOf(step);
        const key = `${inv.id}:${step.sid}`;
        const before = inv.steps.slice(0, at).filter(s => s.reveal);
        // Only a lesson with no earlier prediction has nothing before this one.
        if (!before.length && at > 0) {
          expect(predictionState(inv.steps, inv.steps[0], new Set(), {})).toBe(
            'none'
          );
        }
        const reached = new Set(inv.steps.slice(0, at + 1).map(s => s.sid));
        reached.delete(step.reveal);
        // The latest held prediction governs, so test on the prediction's own step.
        const laterHeld = inv.steps
          .slice(
            at + 1,
            inv.steps.indexOf(inv.steps.find(s => s.sid === step.reveal))
          )
          .some(s => s.reveal);
        const answered = {
          ...Object.fromEntries(before.map(s => [`${inv.id}:${s.sid}`, 1])),
        };
        reached.forEach(sid => {
          const s = inv.steps.find(x => x.sid === sid);
          if (s?.reveal) reached.delete(s.reveal);
        });
        if (laterHeld) continue;
        expect(predictionState(inv.steps, step, reached, answered)).toBe(
          'uncommitted'
        );
        expect(
          predictionState(inv.steps, step, reached, { ...answered, [key]: 0 })
        ).toBe('committed');
        reached.add(step.reveal);
        const stillHeld = inv.steps.some(
          (s, k) => k <= at && s.reveal && !reached.has(s.reveal)
        );
        if (!stillHeld) {
          expect(
            predictionState(inv.steps, step, reached, { ...answered, [key]: 0 })
          ).toBe('revealed');
        }
      }
    }
  });

  test('a lesson with no prediction, and a step that is not in it', () => {
    expect(predictionState([{ sid: 'a' }], { sid: 'a' }, new Set(), {})).toBe(
      'none'
    );
    expect(predictionState(null, {}, new Set(), {})).toBe('none');
    expect(
      predictionState([{ sid: 'a', reveal: 'b' }], { sid: 'x' }, new Set(), {})
    ).toBe('none');
  });

  test('a field of an answer is not the answer', () => {
    const steps = [{ sid: 'p', reveal: 'r' }, { sid: 'm' }, { sid: 'r' }];
    expect(
      predictionState(steps, steps[1], new Set(['p', 'm']), { 'x:p:field': 1 })
    ).toBe('uncommitted');
    expect(
      predictionState(steps, steps[1], new Set(['p', 'm']), { 'x:p': 2 })
    ).toBe('committed');
  });
});

describe('a step that takes readings', () => {
  let LESSON = 'fixture0';
  let counter = 0;
  const step = {
    sid: 'read',
    type: 'measure',
    title: 'Read it',
    body: 'Read the period.',
    probe: () => [
      { id: 'period', label: 'Period', value: '3.2504 d' },
      { id: 'sma', label: 'Axis', value: '1,2300 AU' },
    ],
    series: { flux: () => ({ x: X, y: Y, unit: 'd' }) },
    fields: [
      {
        ...{ id: 'p', label: 'Period', unit: 'd' },
        source: { probe: 'period' },
      },
      { ...{ id: 'a', label: 'Axis', unit: 'AU' }, source: { probe: 'sma' } },
      {
        ...{ id: 'm', label: 'Mean level' },
        source: { span: 'flux', stat: 'mean' },
      },
      { ...{ id: 'n', label: 'Points' }, source: { span: 'flux', stat: 'n' } },
      {
        ...{ id: 'e', label: 'Standard error' },
        source: { span: 'flux', stat: 'se' },
      },
    ],
  };
  const predict = {
    sid: 'pred',
    type: 'predict',
    title: 'P',
    body: 'b',
    reveal: 'read',
  };
  let responses;
  let body;
  let sink;
  let saved;
  const steps = [predict, step];

  const ctx = () => ({ selected: { name: 'Alpha' }, clock: () => 12.5 });
  function paint(visited = new Set(['pred'])) {
    body.innerHTML = stepMarkup(step, {
      id: `${LESSON}:read`,
      saved: undefined,
      active: { id: LESSON, steps },
      responses,
      visited,
      shown: () => steps,
      predictionAnsweredHere: () => null,
      recomputeFields: () => {},
    }).join('');
    figures.take(host(), { mount: true });
  }
  const host = () => ({
    step,
    id: `${LESSON}:read`,
    responses,
    probeContext: ctx,
    body,
    save: () => saved++,
    renderStep: () => paint(),
    capture: captureToNotebook,
    tool: () => null,
  });
  const said = () => document.getElementById('srStatus').textContent.trim();

  beforeEach(() => {
    LESSON = `fixture${++counter}`;
    document.body.innerHTML =
      '<div id="srStatus" aria-live="polite"></div><div id="body"></div>';
    body = document.getElementById('body');
    responses = {};
    saved = 0;
    sink = [];
    fieldModule(figures);
    setCaptureSink((make, opts) => {
      sink.push({ make, opts });
      return Promise.resolve(true);
    });
  });
  afterEach(() => {
    slots.field = null;
    setCaptureSink(null);
  });

  test('offers no button before the prediction is committed, and says why', () => {
    paint();
    expect(body.querySelector('[data-take]')).toBeNull();
    expect(body.textContent).toContain('Make your prediction first.');
    responses[`${LESSON}:pred`] = 1;
    paint();
    expect(body.querySelectorAll('[data-take]').length).toBe(2);
    expect(body.querySelector('[data-span]')).not.toBeNull();
  });

  test('the button is named for what it reads, never its value', () => {
    responses[`${LESSON}:pred`] = 1;
    paint();
    const btn = body.querySelector('[data-take="p"]');
    expect(btn.getAttribute('aria-label')).toBe('Take reading: Period');
    expect(btn.getAttribute('aria-label')).not.toMatch(/3\.25/);
    expect(btn.tagName).toBe('BUTTON');
  });

  test('a press writes the printed text, how it was taken, says so and keeps one ledger entry', async () => {
    responses[`${LESSON}:pred`] = 1;
    paint();
    body.querySelector('[data-take="p"]').click();
    expect(responses[`${LESSON}:read:p`]).toBe('3.2504');
    // The panel was redrawn; the reader's place is back on the button.
    expect(document.activeElement).toBe(body.querySelector('[data-take="p"]'));
    expect(responses[`${LESSON}:read:p:locale`]).toBe('en');
    const src = JSON.parse(responses[`${LESSON}:read:p:src`]);
    expect(src).toMatchObject({
      k: 'c',
      r: 'period',
      x: '3.2504',
      l: 'Period',
      b: 'Alpha',
      t: 12.5,
    });
    expect(said()).toBe('Reading taken: Period, 3.2504 d.');
    expect(body.querySelector('[data-src]').textContent).toBe(
      'Taken from Period.'
    );
    expect(saved).toBeGreaterThan(0);
    await new Promise(r => setTimeout(r, 30));
    expect(sink.length).toBe(1);
    expect(sink[0].opts).toEqual({ quiet: true });
    const entry = sink[0].make({ fromReading }, {});
    expect(entry.source).toBe(SOURCE.LESSON_READING);
    expect(entry.snapshot.quantities[0]).toMatchObject({
      value: 3.2504,
      unit: 'd',
    });
    expect(entry.snapshot.quantities[0].note).toContain('3.2504');
  });

  test('a decimal comma stays a decimal comma and is read under that convention', () => {
    responses[`${LESSON}:pred`] = 1;
    paint();
    body.querySelector('[data-take="a"]').click();
    expect(responses[`${LESSON}:read:a`]).toBe('1,2300');
    expect(responses[`${LESSON}:read:a:locale`]).toBe('es');
  });

  test('taking the same reading again is refused in words', async () => {
    responses[`${LESSON}:pred`] = 1;
    paint();
    body.querySelector('[data-take="p"]').click();
    body.querySelector('[data-take="p"]').click();
    expect(said()).toContain('already recorded');
    await new Promise(r => setTimeout(r, 30));
    expect(sink.length).toBe(1);
  });

  test('a row that is not showing is refused, and nothing is written', () => {
    responses[`${LESSON}:pred`] = 1;
    const showing = step.probe;
    step.probe = () => [];
    try {
      paint();
      body.querySelector('[data-take="p"]').click();
    } finally {
      step.probe = showing;
    }
    expect(responses[`${LESSON}:read:p`]).toBeUndefined();
    expect(said()).toContain('nothing to read');
  });

  test('typing over a taken value marks it typed', () => {
    responses[`${LESSON}:pred`] = 1;
    paint();
    body.querySelector('[data-take="p"]').click();
    figures.typed(responses, `${LESSON}:read:p`, body);
    expect(JSON.parse(responses[`${LESSON}:read:p:src`]).k).toBe('t');
    expect(body.querySelector('[data-src]').textContent).toBe('Typed by you.');
    // A value that was never taken gains no record, so it reads as it always did.
    figures.typed(responses, `${LESSON}:read:a`, body);
    expect(responses[`${LESSON}:read:a:src`]).toBeUndefined();
    expect(figures.readings(responses, `${LESSON}:read`, step).p.k).toBe('t');
  });

  test('an interval: bounds typed, the result read once, a press fills three fields', async () => {
    responses[`${LESSON}:pred`] = 1;
    paint();
    const g = body.querySelector('[data-span]');
    const [from, to] = g.querySelectorAll('[data-bound]');
    expect(from.labels[0].textContent).toBe('From');
    expect(g.getAttribute('role')).toBe('group');
    expect(g.querySelector('[data-span-step]').textContent).toContain('0.04');
    from.value = '3';
    from.dispatchEvent(new Event('input'));
    to.value = '6';
    to.dispatchEvent(new Event('input'));
    expect(g.querySelector('[data-span-result]').textContent).toContain(
      '4 points, 3 to 6: mean 5.25, standard error 0.63'
    );
    g.querySelector('[data-take-span]').click();
    expect(responses[`${LESSON}:read:m`]).toBe('5.25');
    expect(responses[`${LESSON}:read:n`]).toBe('4');
    expect(responses[`${LESSON}:read:e`]).toBe('0.63');
    expect(JSON.parse(responses[`${LESSON}:read:e:src`])).toMatchObject({
      k: 's',
      r: 'flux',
      a: 3,
      b: 6,
      n: 4,
    });
    expect(said()).toContain(
      'Reading taken: Mean level, mean 5.25, 4 points, standard error 0.63'
    );
    await new Promise(r => setTimeout(r, 30));
    expect(sink.length).toBe(3);
    const mean = sink[0].make({ fromReading }, {});
    expect(mean.snapshot.quantities[0]).toMatchObject({
      value: 5.25,
      uncertainty: 0.63,
    });
  });

  test('an interval of one point, or none chosen, is refused in words', () => {
    responses[`${LESSON}:pred`] = 1;
    paint();
    const g = body.querySelector('[data-span]');
    g.querySelector('[data-take-span]').click();
    expect(said()).toContain('Choose both bounds');
    const [from, to] = g.querySelectorAll('[data-bound]');
    from.value = '3';
    from.dispatchEvent(new Event('input'));
    to.value = '3.5';
    to.dispatchEvent(new Event('input'));
    g.querySelector('[data-take-span]').click();
    expect(said()).toContain('Fewer than two points');
    expect(responses[`${LESSON}:read:m`]).toBeUndefined();
  });

  test('the steps of every shipped lesson are unchanged by the new slot', () => {
    const plain = {
      sid: 's',
      type: 'measure',
      title: 't',
      body: 'b',
      fields: [{ id: 'x', label: 'X' }],
    };
    const make = () =>
      stepMarkup(plain, {
        id: 'l:s',
        saved: undefined,
        active: { id: 'l', steps: [plain] },
        responses: {},
        visited: new Set(),
        shown: () => [plain],
        predictionAnsweredHere: () => null,
        recomputeFields: () => {},
      }).join('');
    slots.field = null;
    const before = make();
    fieldModule(figures);
    expect(make()).toBe(before);
  });
});

describe('the authoring rule that a source exists', () => {
  const ctx = emptyProbeContext();
  const base = {
    probe: () => [{ id: 'a', label: 'A', value: '1' }],
    series: { s: () => ({ x: [], y: [] }) },
  };
  test('accepts a row, a series and a statistic that exist', () => {
    const step = {
      ...base,
      fields: [
        { ...{ id: 'x' }, source: { probe: 'a' } },
        { ...{ id: 'y' }, source: { span: 's', stat: 'se' } },
      ],
    };
    expect(readingProblems(step, { ctx })).toEqual([]);
  });
  test('names each thing that is missing', () => {
    const step = {
      ...base,
      fields: [
        { ...{ id: 'x' }, source: { probe: 'nope' } },
        { ...{ id: 'y' }, source: { span: 'gone', stat: 'mean' } },
        { ...{ id: 'z' }, source: { span: 's', stat: 'median' } },
        { ...{ id: 'w' }, source: { probe: 'a', tool: 'b' } },
        { ...{ id: 'v', compute: () => 1 }, source: { probe: 'a' } },
        { ...{ id: 'u' }, source: { tool: 'r' } },
      ],
    };
    const found = readingProblems(step, { ctx });
    expect(found.length).toBe(6);
    expect(found.join('\n')).toMatch(/no probe row has the id "nope"/);
    expect(found.join('\n')).toMatch(/no series "gone"/);
    expect(found.join('\n')).toMatch(/stat is one of/);
    expect(found.join('\n')).toMatch(/one of probe, tool or span/);
    expect(found.join('\n')).toMatch(/computed field/);
    expect(found.join('\n')).toMatch(/no tool row has the id "r"/);
  });
  test('a step with no sources is not touched', () => {
    expect(readingProblems({ fields: [{ id: 'x' }] }, { ctx })).toEqual([]);
  });
});

describe('the ledger entry', () => {
  test('keeps the printed text beside the number', () => {
    const e = fromReading({
      label: 'Period',
      value: 3.25,
      text: '3,25',
      unit: 'd',
      src: { k: 'c' },
    });
    expect(e.source).toBe(SOURCE.LESSON_READING);
    expect(e.snapshot.quantities[0]).toMatchObject({ value: 3.25, unit: 'd' });
    expect(e.snapshot.quantities[0].note).toContain('3,25');
    expect(validateArtifact(e.snapshot.artifact)).toEqual([]);
  });
});

jest.setTimeout(30000);
