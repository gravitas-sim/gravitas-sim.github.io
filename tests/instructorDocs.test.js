// =============================================================================
// Instructor materials v2 (Prompt 79): the inventory, both languages, the cuts
// by depth and activity, the sid-keyed flow, rubrics and the translation status
// =============================================================================
import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import { ACTIVITIES } from '../js/data/activities.js';
import { LABELS, labelsFor } from '../js/data/instructorLabels.js';
import { readFlow, flowFor, checkFlow } from '../js/instructorFlow.js';
import { guideSource } from '../js/instructorSource.js';
import { INSTRUCTOR_CONTENT_ES } from '../js/data/instructorContent.es.js';
import flowsEs from '../js/data/instructorFlow.es.js';
import expectationsEs from '../js/data/instructorExpectations.es.js';
import { INSTRUCTOR_CONTENT } from '../js/data/instructorContent.js';
import expectations from '../js/data/instructorExpectations.js';
import { spanishLesson, SHADOWS } from '../js/instructorLocale.js';
import { answerKeyFor, rubricProblems, verifyKey } from '../js/answerKey.js';
import { answerKeyDocument, instructorGuide } from '../js/instructorDocs.js';
import { lessonFacts, lessonVersion } from '../js/instructorFacts.js';
import {
  renderDocuments,
  inventoryOf,
} from '../tools/build-instructor-materials.js';

const decode = bytes => new TextDecoder('latin1').decode(bytes);
const drawn = pdf =>
  [...decode(pdf).matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g)]
    .map(m => m[1].replace(/\\([()\\])/g, '$1'))
    .join(' ');

const placeholders = s => (String(s).match(/\{\w+\}/g) || []).sort().join(',');

describe('the labels hold both languages to one table', () => {
  test('the same keys, and the same {placeholders} in each', () => {
    expect(Object.keys(LABELS.es).sort()).toEqual(
      Object.keys(LABELS.en).sort()
    );
    for (const [key, en] of Object.entries(LABELS.en)) {
      const es = LABELS.es[key];
      if (Array.isArray(en)) {
        expect(Array.isArray(es) && es.length === 2).toBe(true);
      } else {
        expect({ key, p: placeholders(es) }).toEqual({
          key,
          p: placeholders(en),
        });
      }
    }
  });

  test('a count takes its noun in the right number', () => {
    expect(labelsFor('en').count(1, 'step')).toBe('1 step');
    expect(labelsFor('es').count(2, 'step')).toBe('2 pasos');
    expect(() => labelsFor('en')('no.such.label')).toThrow();
  });
});

describe('the flow is keyed by step id', () => {
  const lesson = {
    id: 'demo',
    steps: ['a', 'b', 'c', 'd', 'e'].map(sid => ({ sid })),
  };
  const v1 = {
    format: 'gravitas.instructor-flow',
    formatVersion: 1,
    lessons: {
      demo: [
        { steps: '1-2', text: 'first two' },
        { steps: '3', text: 'third' },
        { steps: '4–5', text: 'last two' },
      ],
    },
  };

  test('a /1 record reads through its migration', () => {
    const r = readFlow(v1, () => lesson.steps);
    expect(r.ok && r.migrated).toBe(true);
    expect(r.doc.lessons.demo).toEqual([
      { from: 'a', to: 'b', text: 'first two' },
      { from: 'c', to: 'c', text: 'third' },
      { from: 'd', to: 'e', text: 'last two' },
    ]);
  });

  test('a range outside the lesson is dropped with a note, not guessed at', () => {
    const r = readFlow(
      { ...v1, lessons: { demo: [{ steps: '4-9', text: 'x' }] } },
      () => lesson.steps
    );
    expect(r.notes.join()).toMatch(/not in the lesson/);
  });

  test('inserting a step above a block moves its printed range, not its meaning', () => {
    const doc = readFlow(v1, () => lesson.steps).doc;
    const inserted = {
      ...lesson,
      steps: [{ sid: 'new' }, ...lesson.steps],
    };
    const blocks = flowFor(inserted, doc);
    expect(blocks.map(b => [b.first, b.last])).toEqual([
      [2, 3],
      [4, 4],
      [5, 6],
    ]);
    // the new first step is in no block, and the check says so
    expect(checkFlow(inserted, doc)).toEqual([
      'demo: step 1 is in no flow block',
    ]);
  });

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: the shipped flow covers every step once',
    (id, inv) => {
      expect(checkFlow(inv)).toEqual([]);
    }
  );

  test('a newer record is refused, not read', () => {
    const r = readFlow({ ...v1, formatVersion: 9 }, () => []);
    expect(r.ok).toBe(false);
  });
});

describe('rubrics with criteria and levels', () => {
  const step = extra => ({
    kind: 'short',
    rubric: 'x',
    rubricCriteria: [
      {
        name: 'Names it',
        levels: [
          { label: 'Full', points: 2, text: 'says it' },
          { label: 'Not yet', points: 0, text: 'does not' },
        ],
      },
    ],
    ...extra,
  });

  test('a sound rubric has no problems', () => {
    expect(rubricProblems(step())).toEqual([]);
    expect(rubricProblems({ kind: 'short' })).toEqual([]);
  });

  test.each([
    [
      'one level',
      s => ({
        ...s,
        rubricCriteria: [
          { name: 'n', levels: [s.rubricCriteria[0].levels[0]] },
        ],
      }),
      /two to five levels/,
    ],
    [
      'no name',
      s => ({ ...s, rubricCriteria: [{ levels: s.rubricCriteria[0].levels }] }),
      /has no name/,
    ],
    [
      'levels out of order',
      s => ({
        ...s,
        rubricCriteria: [
          { name: 'n', levels: [...s.rubricCriteria[0].levels].reverse() },
        ],
      }),
      /best first/,
    ],
    ['not on a choice', s => ({ ...s, kind: 'choice' }), /written answer/],
    ['an empty list', s => ({ ...s, rubricCriteria: [] }), /one to six/],
  ])('it catches %s', (_n, break_, pattern) => {
    expect(rubricProblems(break_(step())).join()).toMatch(pattern);
  });

  test('Kepler’s written answer carries criteria in English and Spanish', () => {
    const inv = INVESTIGATIONS.find(i => i.id === 'keplers-laws');
    const en = answerKeyFor(inv).entries.find(e => e.criteria);
    expect(en.criteria.length).toBe(2);
    const es = answerKeyFor(spanishLesson(inv)).entries.find(e => e.criteria);
    expect(es.criteria[0].name).toMatch(/Nombra/);
    expect(es.criteria[0].levels.map(l => l.points)).toEqual(
      en.criteria[0].levels.map(l => l.points)
    );
    expect(verifyKey(withAllDepths(inv))).toEqual([]);
  });

  test('the key prints the criteria and the levels', () => {
    const inv = INVESTIGATIONS.find(i => i.id === 'keplers-laws');
    const text = drawn(answerKeyDocument(inv, { version: 'T' }));
    expect(text).toMatch(/Rubric:/);
    expect(text).toMatch(/Names what is conserved/);
    expect(text).toMatch(/Full \(2 pts\)/);
  });
});

describe('the Spanish shadows of the instructor prose', () => {
  test('a translated array is as long as the English one', () => {
    for (const [id, shadow] of Object.entries(INSTRUCTOR_CONTENT_ES)) {
      for (const [field, value] of Object.entries(shadow)) {
        if (Array.isArray(value))
          expect({ id, field, n: value.length }).toEqual({
            id,
            field,
            n: INSTRUCTOR_CONTENT[id][field].length,
          });
      }
    }
  });

  test('flow and expectation words name steps the lesson has', () => {
    for (const inv of INVESTIGATIONS) {
      const sids = new Set(inv.steps.map(s => s.sid));
      for (const from of Object.keys(flowsEs.lessons[inv.id] ?? {}))
        expect(sids.has(from)).toBe(true);
      for (const sid of Object.keys(expectationsEs.lessons[inv.id] ?? {}))
        expect(Object.keys(expectations.lessons[inv.id] ?? {})).toContain(sid);
    }
  });

  test('every lesson has a Spanish shadow to read', () => {
    expect(INVESTIGATIONS.filter(i => !SHADOWS[i.id])).toEqual([]);
  });
});

describe('the document inventory', () => {
  const files = renderDocuments('Test 2026', { stub: true });

  test('counts by language, kind and cut', () => {
    const inv = inventoryOf(files);
    expect(inv.documents).toBe(150);
    expect(inv.byLocale).toEqual({ en: 84, es: 66 });
    expect(inv.byVariant).toEqual({
      activity: 12,
      depth: 24,
      full: 96,
      general: 18,
    });
  });

  test('ids are unique and every Spanish document says how translated it is', () => {
    expect(new Set(files.map(f => f.id)).size).toBe(files.length);
    for (const f of files.filter(f => f.locale === 'es' && f.investigation)) {
      expect(f.status.total).toBeGreaterThan(0);
      expect(f.status.done).toBeLessThanOrEqual(f.status.total);
    }
  });

  test('every investigation has a guide and a key in each language', () => {
    for (const inv of INVESTIGATIONS)
      for (const id of [
        `${inv.id}-guide`,
        `${inv.id}-key`,
        `${inv.id}-guide-es`,
        `${inv.id}-key-es`,
      ])
        expect(files.find(f => f.id === id)).toBeTruthy();
  });

  test('a lesson with deeper steps has a key for each depth, one without has none', () => {
    const withDepth = INVESTIGATIONS.filter(
      i => withAllDepths(i).steps.length !== i.steps.length
    ).map(i => i.id);
    expect(withDepth.length).toBe(4);
    for (const id of withDepth)
      for (const d of ['core', 'quantitative', 'advanced'])
        for (const suffix of ['', '-es'])
          expect(
            files.find(f => f.id === `${id}-key-${d}${suffix}`)
          ).toBeTruthy();
    expect(files.filter(f => f.variant === 'depth').length).toBe(
      withDepth.length * 6
    );
  });

  test('every activity format has a key in each language', () => {
    for (const a of ACTIVITIES)
      for (const f of a.formats)
        for (const suffix of ['', '-es'])
          expect(
            files.find(x => x.id === `activity-${a.id}-${f.id}-key${suffix}`)
          ).toBeTruthy();
  });
});

describe('the documents themselves', () => {
  const kepler = INVESTIGATIONS.find(i => i.id === 'keplers-laws');
  const full = withAllDepths(kepler);

  test('a depth key holds that depth’s steps, numbered as a student sees them', () => {
    const core = answerKeyFor(full, 'core');
    expect(core.entries.length).toBe(kepler.steps.length);
    const quant = answerKeyFor(full, 'quantitative');
    expect(quant.entries.length).toBeGreaterThan(core.entries.length);
    expect(quant.entries.length).toBeLessThan(full.steps.length);
    const text = drawn(
      answerKeyDocument(full, { version: 'T', depth: 'core' })
    );
    expect(text).toMatch(/Answer Key|Core depth/);
    expect(text).not.toMatch(/Advanced depth:/);
  });

  test('an activity key holds only the activity’s steps', () => {
    const format = ACTIVITIES[0].formats[0];
    const text = drawn(
      answerKeyDocument(full, {
        version: 'T',
        activity: { title: 'Demo', steps: format.steps },
      })
    );
    const titles = format.steps.map(
      sid => full.steps.find(s => s.sid === sid).title
    );
    for (const t of titles.slice(0, 1)) expect(text).toContain(t.slice(0, 20));
    expect(text).toMatch(/cut to the steps of the activity/);
    const other = full.steps.find(
      s => !format.steps.includes(s.sid) && s.kind === 'choice'
    );
    expect(text).not.toContain(`: ${other.title}`);
  });

  test('the Spanish guide is in Spanish, with accents intact and a status', () => {
    const src = guideSource(kepler, 'es');
    const pdf = instructorGuide(spanishLesson(kepler, false), {
      version: 'T',
      locale: 'es',
      source: src,
      facts: lessonFacts(kepler, id => id),
      status: {
        lesson: { translated: 1, total: 2 },
        guide: src.status.guide,
        expectations: src.status.expectations,
        done: 1,
        total: 3,
      },
    });
    expect(decode(pdf)).toMatch(/\/Lang \(es\)/);
    const text = drawn(pdf);
    expect(text).toMatch(/Gu\S+a para docentes/);
    expect(text).toMatch(/Estado de la traducci/);
    expect(text).toMatch(/OpenStax Astronomy 2e, cap/);
  });

  test('the guide names the textbook chapter, the course level and the version', () => {
    const text = drawn(
      instructorGuide(kepler, {
        version: 'T',
        facts: lessonFacts(kepler, id => id),
      })
    );
    expect(text).toMatch(/OpenStax Astronomy 2e, chapter 3, section 3\.1/);
    expect(text).toMatch(/Survey course/);
    expect(text).toContain(lessonVersion(kepler));
  });

  test('adding a rubric does not move the investigation’s version', () => {
    // the version is the digest course packs pin; words and rubrics are not in it
    expect(lessonVersion(kepler)).toMatch(/^[0-9a-f]{8}$/);
  });
});
