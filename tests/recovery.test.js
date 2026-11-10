import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from '@jest/globals';

// =============================================================================
// Prerequisites as advice, and the way back after a wrong answer
// (Roadmap III Prompt 276, part 2)
// -----------------------------------------------------------------------------
// The generated hint ladder is held to what a step's own check declares: a
// unit, the power of ten of the declared answer, and a formula only where the
// check is one. It never states the answer, never appears on a step whose
// author wrote hints (which today is every shipped numeric step), and every
// rung is in both languages. The attempts record (`:tries`) keeps the wrong
// answers in order, bounded. The slot drawn under a wrong answer, the Library
// card's advice and the lesson panel's advice are exercised in jsdom.
// =============================================================================

import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import {
  GENERATED_RUNGS,
  TRIES_LIMIT,
  TRY_LENGTH,
  decadeOf,
  fill,
  generatedLadder,
  generatedTaken,
  rungText,
  triesOf,
  withTry,
} from '../js/investigations/recovery.js';
import {
  readProgress,
  writeProgress,
} from '../js/investigations/progressSchema.js';
import { hintLadder, hintsFor } from '../js/answerFeedback.js';
import { libraryCardHtml } from '../js/library/card.js';
import { before } from '../js/investigations/next.js';
import { getLocale, setLocale } from '../js/i18n/index.js';
import { KEY_INVESTIGATION_PREFIX } from '../js/names.js';
import { BOUNDARY } from './compat/boundary.mjs';
import { REPO, archiveOld, run } from './compat/harness.js';

const numeric = extra => ({
  sid: 'q',
  type: 'question',
  kind: 'numeric',
  answer: 11.86,
  tolerance: 0.5,
  unit: 'yr',
  ...extra,
});

describe('the generated ladder', () => {
  test('holds the units, the order of magnitude and, only for a formula check, the formula', () => {
    expect(generatedLadder(numeric()).map(r => r.id)).toEqual([
      'units',
      'magnitude',
    ]);
    const steps = [
      {
        sid: 'time-it',
        title: 'Time one orbit',
        fields: [{ id: 'period', label: 'Period' }],
      },
    ];
    const withFormula = numeric({
      formula: { expr: 'P / 1[yr]', of: { P: 'time-it.period' } },
    });
    const ladder = generatedLadder(withFormula, steps);
    expect(ladder.map(r => r.id)).toEqual([...GENERATED_RUNGS]);
    expect(ladder[2]).toEqual({
      id: 'formula',
      expr: 'P / 1[yr]',
      of: [{ name: 'P', label: 'Period', title: 'Time one orbit' }],
    });
  });

  test('offers nothing the step does not declare', () => {
    // No unit: no units rung. Zero, or no answer yet: no order of magnitude.
    expect(
      generatedLadder(numeric({ unit: undefined })).map(r => r.id)
    ).toEqual(['magnitude']);
    expect(generatedLadder(numeric({ answer: 0 })).map(r => r.id)).toEqual([
      'units',
    ]);
    expect(
      generatedLadder(numeric({ answer: undefined, unit: ' ' })).map(r => r.id)
    ).toEqual([]);
    // A choice, a written answer and a measurement are not checked numbers.
    for (const step of [
      { kind: 'choice', options: ['a', 'b'], answer: 1 },
      { kind: 'short', prompt: 'Why?' },
      { type: 'measure', fields: [{ id: 'x', unit: 'km' }] },
      null,
    ])
      expect(generatedLadder(step)).toEqual([]);
  });

  test('stands aside wherever the author wrote hints', () => {
    const of = step => generatedLadder(step, [], hintLadder(step).length);
    expect(of(numeric({ hints: ['Think.'] }))).toEqual([]);
    expect(of(numeric({ hints: { concept: 'What is asked?' } }))).toEqual([]);
    // An empty ladder is no ladder: the generated one is offered.
    expect(of(numeric({ hints: [] })).length).toBe(2);
    expect(of(numeric()).length).toBe(2);
  });

  test('every shipped numeric step has authored hints, so none is given a generated one', () => {
    let checked = 0;
    const given = [];
    for (const inv of Object.values(INVESTIGATIONS)) {
      for (const step of withAllDepths(inv).steps) {
        if (step.kind !== 'numeric') continue;
        checked++;
        if (generatedLadder(step, inv.steps, hintLadder(step).length).length)
          given.push(`${inv.id}:${step.sid}`);
      }
    }
    expect(given).toEqual([]);
    expect(checked).toBeGreaterThan(200);
  });

  test('the power of ten is exact at the edges', () => {
    const cases = [
      [1, 0],
      [9.999, 0],
      [10, 1],
      [1000, 3],
      [999.9999, 2],
      [0.001, -3],
      [0.00099, -4],
      [-250, 2],
      [6.674e-11, -11],
      [1.989e30, 30],
    ];
    for (const [x, k] of cases) expect([x, decadeOf(x)]).toEqual([x, k]);
    for (let k = -30; k <= 30; k++) expect(decadeOf(Number(`1e${k}`))).toBe(k);
  });

  test('a rung says what it was made from and never the answer', () => {
    for (const lang of ['en', 'es']) {
      const said = id => {
        const step = numeric({
          answer: 4321.5,
          unit: 'km/s',
          formula: { expr: 'd / t', of: {} },
        });
        const rung = generatedLadder(step).find(r => r.id === id);
        return rungText(rung, lang);
      };
      setLocale(lang, { persist: false });
      expect(said('units')).toContain('km/s');
      expect(said('magnitude')).toContain('1000');
      expect(said('magnitude')).toContain('10000 km/s');
      expect(said('formula')).toContain('<code>d / t</code>');
      for (const id of GENERATED_RUNGS) expect(said(id)).not.toContain('4321');
    }
    setLocale('en', { persist: false });
    const small = generatedLadder(numeric({ answer: -0.004, unit: null }))[0];
    expect(rungText(small, 'en')).toMatch(
      /negative.*between 0\.001 and 0\.01\./
    );
    expect(rungText(small, 'es')).toContain('entre 0,001 y 0,01.');
    const big = generatedLadder(numeric({ answer: 1.989e30, unit: 'kg' }))[1];
    expect(rungText(big, 'en')).toContain(
      '10<sup>30</sup> and 10<sup>31</sup> kg'
    );
  });

  test('markup in what a step declares is escaped', () => {
    const step = numeric({
      unit: '<b>m</b>',
      formula: { expr: 'a < b', of: { a: 's.f' } },
    });
    const steps = [
      { sid: 's', title: '<i>T</i>', fields: [{ id: 'f', label: '<u>L</u>' }] },
    ];
    const text = generatedLadder(step, steps)
      .map(r => rungText(r, 'en'))
      .join(' ');
    expect(text).not.toMatch(/<(b|i|u)>/);
    expect(text).toContain('a &#60; b');
  });

  test('the rungs taken are read back in order, and nothing else is', () => {
    expect(generatedTaken('units,magnitude')).toEqual(['units', 'magnitude']);
    expect(generatedTaken('units,h1,reveal')).toEqual(['units']);
    expect(generatedTaken(undefined)).toEqual([]);
  });
});

describe('the attempts record', () => {
  test('keeps the wrong answers in order, once each in a row, bounded', () => {
    let v;
    v = withTry(v, ' 12 ');
    v = withTry(v, '12');
    v = withTry(v, '1,2  km');
    v = withTry(v, 3);
    expect(triesOf(v)).toEqual(['12', '1,2 km', '3']);
    expect(withTry(undefined, '   ')).toBeUndefined();
    for (let i = 0; i < 20; i++) v = withTry(v, `n${i}`);
    expect(triesOf(v).length).toBe(TRIES_LIMIT);
    expect(triesOf(v).slice(0, 3)).toEqual(['12', '1,2 km', '3']);
    expect(triesOf(withTry('', 'x'.repeat(200)))[0].length).toBe(TRY_LENGTH);
    expect(triesOf(withTry('', 'a\nb'))).toEqual(['a b']);
    expect(triesOf(42)).toEqual([]);
  });

  test('rides in the progress record as a sub-key of the step and is read back', () => {
    const lesson = { id: 'tides', steps: [{ sid: 'intro' }, { sid: 'guess' }] };
    const doc = writeProgress({
      lesson,
      responses: {
        'tides:guess': '12',
        'tides:guess:tries': withTry(withTry(undefined, '120'), '1.2'),
        'tides:guess:gen': 'units,magnitude',
      },
      attempts: { 'tides:guess': 3 },
      visited: new Set(['intro', 'guess']),
      stepSid: 'guess',
      startedAt: '2026-11-10T00:00:00.000Z',
    });
    const back = readProgress(JSON.parse(JSON.stringify(doc)), lesson);
    expect(back.notes).toEqual([]);
    expect(triesOf(back.responses['tides:guess:tries'])).toEqual([
      '120',
      '1.2',
    ]);
    expect(generatedTaken(back.responses['tides:guess:gen'])).toEqual([
      'units',
      'magnitude',
    ]);
    expect(back.attempts['tides:guess']).toBe(3);
  });
});

describe('the attempts record and the 2.0.0 readers', () => {
  let old;
  beforeAll(() => {
    old = archiveOld();
  });
  afterAll(() => old?.cleanup());

  test('a 2.0.0 build opens a record that carries it, keeps it, and saves it again', async () => {
    const row = BOUNDARY.find(b => b.id === 'progress-attempts');
    const made = run(old.tree, 'progress-store', 'make').value;
    const doc = await row.mutate(made);
    const read = run(old.tree, 'progress-store', 'read', doc);
    expect(read.ok).toBe(true);
    expect(read.value.accepted).toBe(true);
    expect(read.value.value.responses['tides:guess:tries']).toBe('120\n1.2');
    expect(read.value.value.responses['tides:guess:gen']).toBe(
      'units,magnitude'
    );
    // What it was is untouched: the answer, the count and the position.
    expect(read.value.value.responses['tides:guess']).toBe(0);
    expect(read.value.value.attempts['tides:guess']).toBe(1);
    const again = run(old.tree, 'progress-store', 'rewrite', doc);
    expect(again.ok).toBe(true);
    expect(again.value.responses['tides:guess:tries']).toBe('120\n1.2');
    // And the current build reads what the old one saved.
    const now = run(REPO, 'progress-store', 'read', again.value);
    expect(now.value.accepted).toBe(true);
    expect(triesOf(now.value.value.responses['tides:guess:tries'])).toEqual([
      '120',
      '1.2',
    ]);
  });
});

describe('the slot under a wrong answer', () => {
  let responses;
  let said;
  let saves;
  let step;
  let explainButton;
  const tick = () => new Promise(r => setTimeout(r, 0));
  const slot = () => document.querySelector('[data-recover]');
  const host = () => ({
    els: () => ({
      body: document.getElementById('body'),
      toolExplain: explainButton,
    }),
    responses: () => responses,
    stepId: () => 'l:q',
    currentStep: () => step,
    steps: () => [],
    save: () => saves++,
  });
  const draw = () => fill(host(), text => said.push(text), getLocale, hintsFor);
  beforeEach(() => {
    setLocale('en', { persist: false });
    document.body.innerHTML =
      '<div id="body"><div data-recover hidden></div></div>';
    responses = { 'l:q': '80' };
    said = [];
    saves = 0;
    step = numeric();
    explainButton = null;
  });

  test('offers each generated rung on request, in order, and records it', async () => {
    await draw();
    expect(slot().hidden).toBe(false);
    expect(slot().querySelectorAll('[data-gen]').length).toBe(0);
    expect(slot().textContent).toContain('Generated from this step');
    let button = slot().querySelector('button[data-gen-next]');
    expect(button.textContent).toBe(
      'Show a generated hint (1 of 2): the units'
    );
    button.click();
    await tick();
    expect(responses['l:q:gen']).toBe('units');
    expect(document.activeElement).toBe(slot().querySelector('[data-gen]'));
    expect(said[0]).toMatch(/^Generated hint shown\. The units\./);
    button = slot().querySelector('button[data-gen-next]');
    expect(button.textContent).toContain('(2 of 2): the order of magnitude');
    button.click();
    await tick();
    expect(responses['l:q:gen']).toBe('units,magnitude');
    expect(slot().querySelector('button[data-gen-next]')).toBeNull();
    expect(
      [...slot().querySelectorAll('[data-gen]')].map(p => p.dataset.gen)
    ).toEqual(['units', 'magnitude']);
    // Drawn again from the record, as after a reload.
    await draw();
    expect(slot().querySelectorAll('[data-gen]').length).toBe(2);
  });

  test('keeps the wrong answer on screen with the tries, once', async () => {
    await draw();
    expect(responses['l:q:tries']).toBe('80');
    expect(saves).toBe(1);
    // Drawn again with the same answer (a reload, a hint): not kept twice.
    await draw();
    expect(responses['l:q:tries']).toBe('80');
    expect(saves).toBe(1);
    responses['l:q'] = '0,8';
    await draw();
    expect(triesOf(responses['l:q:tries'])).toEqual(['80', '0,8']);
    // No slot, nothing kept: a right answer draws none.
    document.getElementById('body').innerHTML = '';
    responses['l:q'] = '8';
    await draw();
    expect(triesOf(responses['l:q:tries'])).toEqual(['80', '0,8']);
  });

  test('is empty and hidden on a step with authored hints and no instrument', async () => {
    step = numeric({ hints: ['Think.'] });
    await draw();
    expect(slot().hidden).toBe(true);
    expect(slot().innerHTML).toBe('');
    // The wrong answer is kept all the same.
    expect(responses['l:q:tries']).toBe('80');
  });

  test('opens the instrument’s explainer through the panel’s own button', async () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<header><button id="x" aria-expanded="false">What am I looking at?</button></header>'
    );
    explainButton = document.getElementById('x');
    let presses = 0;
    explainButton.addEventListener('click', () => {
      presses++;
      explainButton.setAttribute('aria-expanded', 'true');
    });
    step = numeric({ hints: ['Think.'], tool: { id: 'power-law-kepler' } });
    await draw();
    const button = slot().querySelector('button[data-recover-explain]');
    expect(button.textContent).toBe('Try again with the instrument explained');
    expect(slot().querySelector('[data-gen-next]')).toBeNull();
    button.click();
    button.click();
    // Pressed again while open, it does not close what the reader asked for.
    expect(presses).toBe(1);
    expect(document.activeElement).toBe(explainButton);
    expect(said.at(-1)).toContain('explanation of the instrument is open');
    // No instrument on the step, or its panel hidden: no button.
    step = numeric();
    await draw();
    expect(slot().querySelector('[data-recover-explain]')).toBeNull();
    step = numeric({ hints: ['Think.'], tool: { id: 'power-law-kepler' } });
    explainButton.closest('header').hidden = true;
    await draw();
    expect(slot().querySelector('[data-recover-explain]')).toBeNull();
  });

  test('says it in Spanish', async () => {
    setLocale('es', { persist: false });
    await draw();
    expect(slot().querySelector('button').textContent).toBe(
      'Mostrar una pista generada (1 de 2): las unidades'
    );
    slot().querySelector('button').click();
    await tick();
    expect(slot().querySelector('[data-gen]').textContent).toContain(
      'La respuesta se pide en yr.'
    );
    setLocale('en', { persist: false });
  });
});

describe('prerequisites as advice', () => {
  const entry = {
    id: 'investigation:orbital-energy',
    kind: 'investigation',
    format: 'lesson',
    title: { en: 'Bound', es: 'Ligado' },
    route: '/#investigation=orbital-energy',
    prerequisites: ['investigation:keplers-laws'],
    steps: 3,
  };
  const first = {
    id: 'investigation:keplers-laws',
    kind: 'investigation',
    format: 'lesson',
    title: { en: 'Kepler & <Laws>', es: 'Leyes de Kepler' },
    route: '/#investigation=keplers-laws',
    steps: 2,
  };

  test('a Library card links what to do first, outside the card’s own link, and locks nothing', () => {
    const o = { t: id => id, pick: w => w.en, progress: 'new' };
    const plain = libraryCardHtml(entry, o);
    expect(plain).not.toContain('lib-before');
    const html = libraryCardHtml(entry, { ...o, before: first });
    const box = document.createElement('ul');
    box.innerHTML = html;
    const advice = box.querySelector('.lib-before');
    expect(advice.textContent).toBe('lib.card.before Kepler & <Laws>');
    expect(advice.querySelector('a').getAttribute('href')).toBe(first.route);
    // Not inside the card's link, and the card's link is as it was.
    expect(advice.closest('a')).toBeNull();
    expect(box.querySelector('a.lib-link').getAttribute('href')).toBe(
      entry.route
    );
    expect(box.querySelectorAll('[disabled], [aria-disabled]').length).toBe(0);
  });

  describe('in the lesson panel', () => {
    const el = () => document.getElementById('before');
    const fetched = [];
    beforeEach(() => {
      localStorage.clear();
      fetched.length = 0;
      document.body.innerHTML =
        '<p id="before" hidden data-say-en="You may want this first:" data-say-es="Quizá quieras hacer antes:"></p>';
      globalThis.fetch = async url => {
        fetched.push(url);
        return { json: async () => ({ entries: [entry, first] }) };
      };
      setLocale('en', { persist: false });
    });

    test('names the unfinished prerequisite with a link', async () => {
      await before({ id: 'orbital-energy' }, null, el());
      expect(fetched).toEqual(['/library/library.json']);
      expect(el().hidden).toBe(false);
      expect(el().textContent).toBe('You may want this first: Kepler & <Laws>');
      expect(el().querySelector('a').getAttribute('href')).toBe(first.route);
      setLocale('es', { persist: false });
      await before({ id: 'orbital-energy' }, null, el());
      expect(el().textContent).toBe(
        'Quizá quieras hacer antes: Leyes de Kepler'
      );
    });

    test('says nothing once the prerequisite, or the investigation itself, is finished', async () => {
      localStorage.setItem(
        `${KEY_INVESTIGATION_PREFIX}keplers-laws`,
        JSON.stringify({ visited: ['a', 'b'] })
      );
      await before({ id: 'orbital-energy' }, null, el());
      expect(el().hidden).toBe(true);
      localStorage.clear();
      localStorage.setItem(
        `${KEY_INVESTIGATION_PREFIX}orbital-energy`,
        JSON.stringify({ visited: ['a', 'b', 'c'] })
      );
      await before({ id: 'orbital-energy' }, null, el());
      expect(el().hidden).toBe(true);
    });

    test('an assignment gets none, and no lesson asks nothing of the Library', async () => {
      await before({ id: 'orbital-energy' }, { t: 'Week 3' }, el());
      await before(null, null, el());
      expect(el().hidden).toBe(true);
      expect(fetched).toEqual([]);
    });

    test('stays hidden for an investigation with none, an unknown one, and offline', async () => {
      await before({ id: 'keplers-laws' }, null, el());
      expect(el().hidden).toBe(true);
      await before({ id: 'nothing-by-this-name' }, null, el());
      expect(el().hidden).toBe(true);
      globalThis.fetch = async () => {
        throw new Error('offline');
      };
      await before({ id: 'orbital-energy' }, null, el());
      expect(el().hidden).toBe(true);
    });
  });
});
