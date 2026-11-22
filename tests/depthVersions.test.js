// =============================================================================
// Which version of an investigation a student reads, and how it is named
// -----------------------------------------------------------------------------
// DEPTH.md says who chooses: an assignment, a link, the student's saved choice,
// the course level. resolveDepth is that order as one function; the table below
// is the order, including what the progress record keeps (`choice`) when a link
// opens a version the student had not chosen. The names are one set of words in
// four places (the where line, the Library card, the activity builder, the
// report), held equal here.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { EN_DEPTH } from '../js/i18n/en.depth.js';
import { ES_DEPTH } from '../js/i18n/es.depth.js';
import { EN_LIBRARY } from '../js/i18n/en.library.js';
import { ES_LIBRARY } from '../js/i18n/es.library.js';
import { openDepth, resolveDepth } from '../js/investigations/depth.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import {
  readProgress,
  writeProgress,
} from '../js/investigations/progressSchema.js';
import { factsOf } from '../js/library/card.js';
import { registerMessages, setLocale, t } from '../js/i18n/index.js';

const ALL = ['core', 'quantitative', 'advanced'];
const TWO = ['core', 'quantitative'];
const asg = d => ({ d });

// [label, input, depth, source, choice kept in the record, kept (the notice)]
const TABLE = [
  [
    'an assignment outranks a link, a saved choice and the level',
    {
      assignment: asg('quantitative'),
      link: 'advanced',
      saved: 'core',
      level: 'advanced',
    },
    'quantitative',
    'assignment',
    null,
    null,
  ],
  [
    'an assignment that names no depth reads core, whatever was saved',
    { assignment: {}, saved: 'advanced', level: 'majors' },
    'core',
    'assignment',
    null,
    null,
  ],
  [
    'a link outranks the saved choice, and the record keeps the saved one',
    { link: 'quantitative', saved: 'core' },
    'quantitative',
    'link',
    'core',
    'core',
  ],
  [
    'a link to a deeper version than saved: the same',
    { link: 'advanced', saved: 'quantitative', level: 'majors' },
    'advanced',
    'link',
    'quantitative',
    'quantitative',
  ],
  [
    'a link to a shallower version than saved: the same',
    { link: 'core', saved: 'advanced' },
    'core',
    'link',
    'advanced',
    'advanced',
  ],
  [
    'a link the same as the saved choice has nothing to keep',
    { link: 'quantitative', saved: 'quantitative' },
    'quantitative',
    'link',
    'quantitative',
    null,
  ],
  [
    'a link with no saved choice is adopted: there is nothing to overwrite',
    { link: 'advanced', level: 'majors' },
    'advanced',
    'link',
    'advanced',
    null,
  ],
  [
    'the saved choice outranks the course level',
    { saved: 'core', level: 'advanced' },
    'core',
    'choice',
    'core',
    null,
  ],
  [
    'the course level when nothing else says (majors)',
    { level: 'majors' },
    'quantitative',
    'level',
    null,
    null,
  ],
  [
    'the course level when nothing else says (advanced)',
    { level: 'advanced' },
    'advanced',
    'level',
    null,
    null,
  ],
  [
    'an introductory course level is core',
    { level: 'introductory' },
    'core',
    'core',
    null,
    null,
  ],
  ['nothing at all is core', {}, 'core', 'core', null, null],
  [
    'a link to a version the lesson does not offer is passed over for the saved choice',
    { link: 'advanced', saved: 'quantitative', offered: TWO },
    'quantitative',
    'choice',
    'quantitative',
    null,
  ],
  [
    'a link that is not a version is passed over for the level',
    { link: 'deepest', level: 'majors' },
    'quantitative',
    'level',
    null,
    null,
  ],
  [
    'a saved choice the lesson no longer offers reads core (it blocks the level)',
    { saved: 'advanced', level: 'majors', offered: TWO },
    'core',
    'core',
    'advanced',
    null,
  ],
  [
    'a lesson with no deeper version is core',
    { link: 'advanced', saved: 'quantitative', level: 'majors', offered: [] },
    'core',
    'core',
    'quantitative',
    null,
  ],
];

describe('which version opens: the order DEPTH.md states', () => {
  test.each(TABLE)('%s', (_label, input, depth, source, choice, kept) => {
    expect(resolveDepth({ offered: ALL, ...input })).toEqual({
      depth,
      source,
      choice,
      kept,
    });
  });
});

describe('the notice a link or an activity leaves', () => {
  const lesson = withAllDepths(
    INVESTIGATIONS.find(i => i.id === 'keplers-laws')
  );
  const page = () => {
    document.body.innerHTML = readFileSync(
      new URL('../js/fragments/lesson.html', import.meta.url),
      'utf8'
    );
    return document.getElementById('investigationDepthNote');
  };

  test('a link over a saved choice says both and keeps the saved one on request', async () => {
    const note = page();
    const asked = [];
    const r = await openDepth(
      lesson,
      { depth: 'core', deepest: 'core' },
      null,
      'en',
      { link: 'quantitative', note, change: by => asked.push(by) }
    );
    expect(r.depth).toBe('quantitative');
    // Not the link's: the record's choice stays what the student chose.
    expect(r.depthChoice).toBe('core');
    expect(note.hidden).toBe(false);
    expect(note.querySelector('p').textContent).toBe(
      'This link opens the quantitative version. You had chosen the core version.'
    );
    const keep = note.querySelector('button');
    expect(keep.hidden).toBe(false);
    expect(keep.textContent).toBe('Keep mine');
    keep.click();
    expect(asked).toEqual([-1]);
    expect(r.said).toBe(note.querySelector('p').textContent);
  });

  test('keeping a deeper saved choice goes the other way', async () => {
    const note = page();
    const asked = [];
    await openDepth(
      lesson,
      { depth: 'advanced', deepest: 'advanced' },
      null,
      'en',
      { link: 'core', note, change: by => asked.push(by) }
    );
    note.querySelector('button').click();
    expect(asked).toEqual([2]);
  });

  test('an activity says it set the version and offers no way to keep another', async () => {
    const note = page();
    const r = await openDepth(
      lesson,
      { depth: 'core', deepest: 'core' },
      { d: 'quantitative' },
      'en',
      { link: 'advanced', note }
    );
    expect(r.depth).toBe('quantitative');
    expect(r.depthChoice).toBeNull();
    expect(note.hidden).toBe(false);
    expect(note.querySelector('p').textContent).toBe(
      'Your instructor set this activity to the quantitative version.'
    );
    expect(note.querySelector('button').hidden).toBe(true);
  });

  test('a link that matches, or no link, leaves no notice', async () => {
    const note = page();
    const same = await openDepth(
      lesson,
      { depth: 'quantitative', deepest: 'quantitative' },
      null,
      'en',
      { link: 'quantitative', note }
    );
    expect(note.hidden).toBe(true);
    expect(same.said).toBe('');
    await openDepth(lesson, { level: 'majors' }, null, 'en', { note });
    expect(note.hidden).toBe(true);
  });

  test('Spanish says the same', async () => {
    const note = page();
    await openDepth(lesson, { depth: 'core', deepest: 'core' }, null, 'es', {
      link: 'advanced',
      note,
    });
    registerMessages('es', ES_DEPTH);
    await setLocale('es', { persist: false });
    const again = page();
    await openDepth(lesson, { depth: 'core', deepest: 'core' }, null, 'es', {
      link: 'advanced',
      note: again,
    });
    expect(again.querySelector('p').textContent).toBe(
      'Este enlace abre la versión avanzada. Habías elegido la versión básica.'
    );
    expect(again.querySelector('button').textContent).toBe('Conservar la mía');
    await setLocale('en', { persist: false });
  });
});

describe('one name for one version', () => {
  const where = () => {
    document.body.innerHTML = readFileSync(
      new URL('../js/fragments/lesson.html', import.meta.url),
      'utf8'
    );
    return document.getElementById('investigationWhere').dataset;
  };

  test('the where line in the page carries the core name the depth words give', () => {
    const d = where();
    expect(d.coreEn).toBe(EN_DEPTH['inv.depth.core']);
    expect(d.coreEs).toBe(ES_DEPTH['inv.depth.core']);
  });

  test.each([
    ['en', EN_DEPTH, EN_LIBRARY],
    ['es', ES_DEPTH, ES_LIBRARY],
  ])(
    'the Library card names the versions as the depth words do (%s)',
    (_l, depthWords, lib) => {
      for (const d of ALL) {
        expect(lib[`lib.version.${d}`]).toBe(depthWords[`inv.depth.adj.${d}`]);
        // The full name is the adjective in the version's own words.
        expect(depthWords[`inv.depth.${d}`].toLowerCase()).toContain(
          depthWords[`inv.depth.adj.${d}`]
        );
      }
    }
  );

  test('the card lists the versions, three by default and two by name', () => {
    const tt = (id, v) => EN_LIBRARY[id].replace(/\{(\w+)\}/g, (_w, k) => v[k]);
    expect(factsOf({ depths: 3 }, tt)).toEqual([
      'Versions: core, quantitative, advanced',
    ]);
    expect(factsOf({ depths: 2, versions: ['core', 'advanced'] }, tt)).toEqual([
      'Versions: core, advanced',
    ]);
    expect(factsOf({}, tt)).toEqual([]);
  });

  test('a lesson with two versions names them in the built Library', () => {
    const lib = JSON.parse(
      readFileSync(new URL('../library/library.json', import.meta.url), 'utf8')
    );
    const two = lib.entries.filter(e => e.depths === 2);
    expect(two.length).toBeGreaterThan(0);
    for (const e of two) expect(e.versions).toHaveLength(2);
    // The usual three carry no list.
    for (const e of lib.entries.filter(e => e.depths === 3))
      expect(e.versions).toBeUndefined();
  });
});

describe('what a switch keeps, held against the saved record', () => {
  const laid = withAllDepths(INVESTIGATIONS.find(i => i.id === 'keplers-laws'));
  const deeper = laid.steps.find(s => s.depth === 'quantitative');
  const core = laid.steps.find(s => !s.depth || s.depth === 'core');
  const base = {
    lesson: laid,
    responses: {
      [`keplers-laws:${core.sid}`]: 'x',
      [`keplers-laws:${deeper.sid}:t1`]: '1.0000',
    },
    attempts: { [`keplers-laws:${core.sid}`]: 2 },
    visited: new Set([core.sid, deeper.sid]),
    stepSid: deeper.sid,
    startedAt: 'x',
  };
  const record = s =>
    readProgress(JSON.parse(JSON.stringify(writeProgress(s))), laid);

  test('going shallower and back changes the depth and nothing the student gave', () => {
    const at = record({
      ...base,
      depth: 'quantitative',
      deepest: 'quantitative',
    });
    const back = record({ ...base, depth: 'core', deepest: 'quantitative' });
    expect(back.responses).toEqual(at.responses);
    expect(back.attempts).toEqual(at.attempts);
    expect([...back.visited]).toEqual([...at.visited]);
    expect(back.startedAt).toBe(at.startedAt);
    expect(back.depth).toBe('core');
    expect(back.deepest).toBe('quantitative');
    // The sentence promises exactly this much, and the words say it.
    expect(EN_DEPTH['inv.depth.changed']).toMatch(
      /answers.*scene.*place in the lesson/
    );
    expect(ES_DEPTH['inv.depth.changed']).toMatch(
      /respuestas.*escena.*lugar en la lección/
    );
  });

  test('the sentence names no step of the version it switches to', () => {
    registerMessages('en', EN_DEPTH);
    const said = t('inv.depth.changed', { depth: 'advanced' });
    for (const s of laid.steps.filter(x => x.depth === 'advanced'))
      expect(said).not.toContain(s.title);
  });
});
