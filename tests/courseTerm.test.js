// =============================================================================
// A course or an activity for the next term (Prompt 168, js/instructorTerm.js)
// -----------------------------------------------------------------------------
// The new copy is valid, keeps last term's file untouched, has fresh submission
// keys, says what the re-pin found, and last term's links still open what they
// opened.
// =============================================================================

import './galacticFetch.js';
import { describe, test, expect, beforeAll } from '@jest/globals';

import { itemsOf, MAX_TERM, validateCoursePack } from '../js/course/pack.js';
import {
  courseApi,
  courseFacts,
  newAssignmentId,
} from '../js/course/api.js';
import {
  startActivityTerm as startActivity,
  startTerm as start,
  termLabel,
  titleWithTerm,
} from '../js/instructorTerm.js';
import { assignmentPayload, courseLink } from '../js/course/links.js';
import {
  STATUS,
  reviewCoursePack,
  shortHash,
  upgradeCoursePack,
} from '../js/course/review.js';
import { INTRO_ASTRONOMY } from '../js/data/courses/intro-astronomy.js';
import { BUILTIN_COURSES } from '../js/data/courses/index.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import {
  validateAssignment,
  assignmentIdFor,
} from '../js/assignments/assignment.js';
import { readFileSync } from 'node:fs';

/** What the course builder's page and the kit hand js/instructorTerm.js. */
const lib = {
  STATUS,
  itemsOf,
  reviewCoursePack,
  upgradeCoursePack,
  shortHash,
  newAssignmentId,
};
const startTerm = (pack, facts, opts) => start(pack, facts, { ...opts, lib });
const startActivityTerm = (a, term, now, was) =>
  startActivity(a, term, now, was, assignmentIdFor);

const clone = v => JSON.parse(JSON.stringify(v));
/**
 * The place a student keeps an assignment's answers: a hash of the lesson, the
 * steps and the title (js/investigations/stepView.js keyForAssignment, which
 * needs the lesson engine's host to run; the first test below holds this copy
 * to the source).
 */
const keyForAssignment = a => shortHash(`${a.l}|${a.s.join(',')}|${a.t}`);
const api = courseApi();
const load = id => loadInvestigation(id, 'en');
const TODAY = '2027-01-12';

let facts;
beforeAll(async () => {
  facts = await courseFacts(INTRO_ASTRONOMY, { load });
}, 60_000);

const assignments = pack =>
  itemsOf(pack)
    .map(x => x.item)
    .filter(i => i.kind === 'assignment');

describe("the student's key", () => {
  test('is still the lesson, the steps and the title, so a new title is a new place', () => {
    expect(readFileSync('js/investigations/stepView.js', 'utf8')).toContain(
      "shortHash(`${a.l}|${a.s.join(',')}|${a.t}`)"
    );
  });
});

describe('the term label', () => {
  test('is trimmed, collapsed and plain', () => {
    expect(termLabel('  Spring   2027 ')).toEqual({
      ok: true,
      term: 'Spring 2027',
    });
    expect(termLabel('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(termLabel('x'.repeat(MAX_TERM)).ok).toBe(true);
    expect(termLabel('x'.repeat(MAX_TERM + 1)).reason).toBe('long');
    expect(termLabel('Spring <b>').reason).toBe('markup');
    expect(termLabel('A &amp; B').reason).toBe('markup');
  });

  test('is appended to a title, replacing the one it carried, within 120 characters', () => {
    expect(titleWithTerm('A first transit', 'Fall 2026')).toBe(
      'A first transit (Fall 2026)'
    );
    expect(
      titleWithTerm('A first transit (Fall 2026)', 'Spring 2027', 'Fall 2026')
    ).toBe('A first transit (Spring 2027)');
    expect(
      titleWithTerm('A first transit (Fall 2026)', null, 'Fall 2026')
    ).toBe('A first transit');
    // A title that is not a term's is left alone when the term does not match.
    expect(titleWithTerm('A (b)', 'x', 'y')).toBe('A (b) (x)');
    const long = titleWithTerm('word '.repeat(40), 'Spring 2027');
    expect(long.length).toBeLessThanOrEqual(120);
    expect(long.endsWith(' (Spring 2027)')).toBe(true);
    expect(titleWithTerm('', 'Spring 2027')).toBe('Spring 2027');
  });
});

describe('a course for a term', () => {
  test('is a valid pack, the file it came from is unchanged, and the term is only on the copy', () => {
    const before = clone(INTRO_ASTRONOMY);
    const { pack } = startTerm(INTRO_ASTRONOMY, facts, {
      term: 'Spring 2027',
      today: TODAY,
    });
    expect(INTRO_ASTRONOMY).toEqual(before);
    expect(validateCoursePack(pack, api)).toEqual([]);
    expect(pack.term).toBe('Spring 2027');
    expect(INTRO_ASTRONOMY.term).toBeUndefined();
    expect(pack.id).toBe(`${INTRO_ASTRONOMY.id}-spring-2027`);
    expect(pack.gravitas).toBe(facts.platform);
  });

  test('gives every assignment a fresh id, a new date and the term in both titles', () => {
    const { pack, report } = startTerm(INTRO_ASTRONOMY, facts, {
      term: 'Spring 2027',
      today: TODAY,
    });
    const then = assignments(INTRO_ASTRONOMY);
    const now = assignments(pack);
    expect(now.length).toBe(then.length);
    expect(now.length).toBeGreaterThan(0);
    now.forEach((item, i) => {
      expect(item.assignment.id).not.toBe(then[i].assignment.id);
      expect(item.assignment.created).toBe(TODAY);
      expect(item.title.en).toBe(`${then[i].title.en} (Spring 2027)`);
      expect(item.title.es).toBe(`${then[i].title.es} (Spring 2027)`);
      // The Spanish is still marked as written from this English.
      expect(item.title.esOf).toBe(shortHash(item.title.en));
    });
    expect(report.rekeyed).toHaveLength(now.length);
    expect(report.rekeyed[0].from).toBe(then[0].assignment.id);
    expect(report.rekeyed[0].to).toBe(now[0].assignment.id);
  });

  test('the place a student keeps answers is new with a term and the same without', () => {
    const [a] = assignments(INTRO_ASTRONOMY);
    const keyOf = (item, locale = 'en') =>
      keyForAssignment(assignmentPayload(item, locale));
    const withTerm = startTerm(INTRO_ASTRONOMY, facts, {
      term: 'Spring 2027',
      today: TODAY,
    }).pack;
    const b = assignments(withTerm)[0];
    expect(keyOf(b)).not.toBe(keyOf(a));
    expect(keyOf(b, 'es')).not.toBe(keyOf(a, 'es'));
    // First use as it comes: the title, and so the key, is the course's own.
    const asIs = startTerm(INTRO_ASTRONOMY, facts, { today: TODAY }).pack;
    expect(asIs.term).toBeUndefined();
    expect(keyOf(assignments(asIs)[0])).toBe(keyOf(a));
    // The id is dated, so even then it is a fresh submission code.
    expect(assignments(asIs)[0].assignment.id).not.toBe(a.assignment.id);
  });

  test('a term on a term replaces the label and does not stack', () => {
    const first = startTerm(INTRO_ASTRONOMY, facts, {
      term: 'Fall 2026',
      today: '2026-09-01',
    }).pack;
    const second = startTerm(first, facts, {
      term: 'Spring 2027',
      today: TODAY,
    }).pack;
    const base = assignments(INTRO_ASTRONOMY)[0].title.en;
    expect(assignments(second)[0].title.en).toBe(`${base} (Spring 2027)`);
    expect(second.term).toBe('Spring 2027');
    expect(validateCoursePack(second, api)).toEqual([]);
  });

  test('reports nothing changed when the lessons are as they were pinned', () => {
    const { report } = startTerm(INTRO_ASTRONOMY, facts, {
      term: 'Spring 2027',
      today: TODAY,
    });
    expect(report.items.length).toBeGreaterThan(5);
    expect(report.items.every(i => i.result === 'same')).toBe(true);
    expect(report.changed).toBe(0);
    expect(report.refused).toEqual([]);
    expect(report.version.from).toBe(report.version.to);
  });

  test('reports what changed between the pins, from the step digests', () => {
    // Pretend the course was pinned against lessons that have since changed:
    // a lesson's digest, an assignment's step hash and a step that is gone.
    const old = clone(INTRO_ASTRONOMY);
    const [item] = assignments(old);
    item.pin.f[1] = 'deadbeef';
    item.steps.push('a-step-that-was-removed');
    item.pin.f.push('0badf00d');
    const lessonItem = itemsOf(old)
      .map(x => x.item)
      .find(i => i.kind === 'lesson');
    lessonItem.pin.fp = 'cafef00d';
    const { pack, report } = startTerm(old, facts, {
      term: 'Spring 2027',
      today: TODAY,
    });
    const row = id => report.items.find(r => r.id === id);
    expect(row(item.id).result).toBe('repinned');
    expect(row(item.id).changedSteps).toEqual([item.steps[1]]);
    expect(row(item.id).missingSteps).toEqual(['a-step-that-was-removed']);
    expect(row(lessonItem.id).result).toBe('repinned');
    expect(row(lessonItem.id).standing).toBe('changed');
    expect(report.changed).toBe(2);
    // The dropped step is gone, the pins are the lessons as they are now.
    expect(assignments(pack)[0].steps).not.toContain('a-step-that-was-removed');
    expect(validateCoursePack(pack, api)).toEqual([]);
    expect(report.version.to).not.toBe(report.version.from);
    // And the pack that came in still says what it said.
    expect(assignments(old)[0].steps).toContain('a-step-that-was-removed');
  });

  test('every course Gravitas ships becomes a valid copy for a term', async () => {
    for (const [id, get] of Object.entries(BUILTIN_COURSES)) {
      const shipped = await get();
      const f = await courseFacts(shipped, { load });
      const { pack } = startTerm(shipped, f, {
        term: 'Spring 2027',
        today: TODAY,
      });
      expect({ id, problems: validateCoursePack(pack, api) }).toEqual({
        id,
        problems: [],
      });
    }
  }, 120_000);

  test("last term's links are files that still open: the old course and the old assignment", async () => {
    const root = 'https://gravitas-sim.online/';
    const { pack } = startTerm(INTRO_ASTRONOMY, facts, {
      term: 'Spring 2027',
      today: TODAY,
    });
    const old = await courseLink(INTRO_ASTRONOMY, { root });
    const now = await courseLink(pack, { root });
    expect(old.url).not.toBe(now.url);
    expect(old.comfortable).toBe(true);
    expect(now.comfortable).toBe(true);
    const a = assignmentPayload(assignments(INTRO_ASTRONOMY)[0], 'en');
    expect(validateAssignment(a).ok).toBe(true);
    expect(
      validateAssignment(assignmentPayload(assignments(pack)[0], 'en')).ok
    ).toBe(true);
  });
});

describe('an activity for a term', () => {
  const activity = {
    k: 'gravitas.assignment',
    v: 1,
    i: '261001abcdef',
    l: 'keplers-laws',
    t: 'Week 3: Kepler',
    n: 'Before Friday.',
    s: ['where-is-the-star'],
    f: ['00000001'],
    c: '2026-10-01',
  };

  test('has a new id, date and title, and keeps its steps, note and pin', () => {
    const now = new Date('2027-01-12T10:00:00Z');
    const next = startActivityTerm(activity, 'Spring 2027', now);
    expect(next.t).toBe('Week 3: Kepler (Spring 2027)');
    expect(next.i).toBe(
      assignmentIdFor(
        { lesson: 'keplers-laws', sids: activity.s, title: next.t },
        now
      )
    );
    expect(next.i).not.toBe(activity.i);
    expect(next.c).toBe('2027-01-12');
    expect(next.s).toEqual(activity.s);
    expect(next.f).toEqual(activity.f);
    expect(next.n).toBe(activity.n);
    expect(activity.t).toBe('Week 3: Kepler');
    expect(validateAssignment(next).ok).toBe(true);
    expect(keyForAssignment(next)).not.toBe(keyForAssignment(activity));
  });

  test('takes the last term off when told which it was', () => {
    const a = startActivityTerm(activity, 'Fall 2026');
    const b = startActivityTerm(a, 'Spring 2027', new Date(), 'Fall 2026');
    expect(b.t).toBe('Week 3: Kepler (Spring 2027)');
  });
});

describe('the term on a pack', () => {
  test('is optional, plain and short', () => {
    const p = clone(INTRO_ASTRONOMY);
    expect(validateCoursePack(p, api)).toEqual([]);
    p.term = 'Spring 2027';
    expect(validateCoursePack(p, api)).toEqual([]);
    for (const bad of ['', ' Spring', 'a<b', 'x'.repeat(MAX_TERM + 1), 7]) {
      p.term = bad;
      expect(validateCoursePack(p, api).map(e => e.code)).toContain('term');
    }
  });
});

describe("the id of a term's copy", () => {
  test('carries the term so each term is a draft of its own, and replaces the last', async () => {
    const { idWithTerm } = await import('../js/instructorTerm.js');
    expect(idWithTerm('intro-astronomy', 'Spring 2027')).toBe(
      'intro-astronomy-spring-2027'
    );
    expect(
      idWithTerm('intro-astronomy-fall-2026', 'Spring 2027', 'Fall 2026')
    ).toBe('intro-astronomy-spring-2027');
    expect(idWithTerm('intro-astronomy-fall-2026', null, 'Fall 2026')).toBe(
      'intro-astronomy'
    );
    expect(idWithTerm('intro-astronomy', '!!!')).toBe('intro-astronomy');
    const { pack, report } = startTerm(INTRO_ASTRONOMY, facts, {
      term: 'Spring 2027',
      today: TODAY,
    });
    expect(pack.id).toBe('intro-astronomy-spring-2027');
    expect(report.id).toEqual({
      from: 'intro-astronomy',
      to: 'intro-astronomy-spring-2027',
    });
    expect(validateCoursePack(pack, api)).toEqual([]);
  });
});

describe('the pages that offer it', () => {
  test('Teach lists every course Gravitas ships, and only those, with a use-as-is link', () => {
    const html = readFileSync('teaching/index.html', 'utf8');
    const linked = [
      ...html.matchAll(/href="\/studio\/course\/\?use=([a-z0-9-]+)"/g),
    ]
      .map(m => m[1])
      .sort();
    expect(linked).toEqual(Object.keys(BUILTIN_COURSES).sort());
    // And the section comes before the eight steps.
    expect(html.indexOf('id="path-minimal"')).toBeLessThan(
      html.indexOf('id="path-why"')
    );
  });

  test('the words the panel and the kit read exist in both languages', async () => {
    const { WORDS } = await import('../js/instructorTermText.js');
    const used = new Set();
    const kitUsed = new Set();
    const view = readFileSync('js/instructorTermView.js', 'utf8');
    for (const m of view.matchAll(/\bT\(\s*'([a-z]+\.[A-Za-z.]+)'/g))
      used.add(m[1]);
    const kit = readFileSync('js/teach/kit.js', 'utf8');
    for (const m of kit.matchAll(/\bW\(\s*'([a-z]+\.[A-Za-z.]+)'/g))
      used.add(m[1]);
    for (const m of kit.matchAll(/\bT\(\s*'(term\.[A-Za-z.]+)'/g))
      kitUsed.add(m[1]);
    // The panel builds `p.${mode}.lede`, `p.${mode}.h`, `p.${mode}.go` and a
    // hint per mode, and a standing per status.
    for (const mode of ['use', 'next']) {
      for (const k of ['lede', 'h']) used.add(`p.${mode}.${k}`);
      used.add(`p.go.${mode}`);
      used.add(`p.term.hint.${mode}`);
    }
    for (const status of Object.values(STATUS)) used.add(`st.${status}`);
    for (const reason of ['empty', 'long', 'markup'])
      used.add(`p.term.${reason}`);
    for (const k of ['activity', 'course']) kitUsed.add(`term.what.${k}`);
    expect(used.size).toBeGreaterThan(30);
    const kitWords = (await import('../js/teach/kitText.js')).WORDS;
    for (const l of ['en', 'es']) {
      for (const id of used)
        expect({ id, l, has: id in WORDS[l] }).toEqual({ id, l, has: true });
      for (const id of kitUsed)
        expect({ id, l, has: id in kitWords[l] }).toEqual({
          id,
          l,
          has: true,
        });
    }
  });

  test('both words tables fill every slot their sentences name', async () => {
    const { WORDS } = await import('../js/instructorTermText.js');
    for (const l of ['en', 'es'])
      for (const [id, text] of Object.entries(WORDS[l]))
        expect({ id, ok: !/\s{2,}|\{\s|\s\}/.test(text) }).toEqual({
          id,
          ok: true,
        });
    // The same slots in both languages, so a sentence cannot lose a value in translation.
    const slots = t => [...t.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    for (const id of Object.keys(WORDS.en))
      expect({ id, slots: slots(WORDS.es[id]) }).toEqual({
        id,
        slots: slots(WORDS.en[id]),
      });
  });
});
