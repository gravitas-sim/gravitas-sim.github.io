import { describe, test, expect, beforeAll } from '@jest/globals';
import { remixBuiltin } from '../js/composer/remixApi.js';
import { packLink } from '../js/composer/packLink.js';
import { remixDelta, remixLessonId } from '../js/platform/remix.js';
import {
  FORMAT,
  itemsOf,
  lessonKeyOf,
  validateCoursePack,
} from '../js/course/pack.js';
import {
  STATUS,
  auditCourse,
  dependencyGraph,
  estimate,
  pinFor,
  reviewCoursePack,
  upgradeCoursePack,
} from '../js/course/review.js';
import { courseApi, courseFacts, lessonFacts } from '../js/course/api.js';
import { itemLink } from '../js/course/links.js';
import { openedLink, openedPack } from '../js/course/packItems.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import { EN_COURSE } from '../js/i18n/en.course.js';
import { ES_COURSE } from '../js/i18n/es.course.js';

// =============================================================================
// A course item that references an investigation pack (Prompt 78 (c)): the pack
// travels in the item as its link, and its pin is the digest of its steps
// =============================================================================

const clone = v => JSON.parse(JSON.stringify(v));
const api = courseApi();
const load = id => loadInvestigation(id, 'en');
const ROOT = 'https://gravitas-sim.online/';

let pack;
let link;
let item;
let course;

const courseOf = (...items) => ({
  format: FORMAT,
  formatVersion: 2,
  id: 'my-course',
  version: '1.0.0',
  gravitas: '1.0.0',
  locales: ['en'],
  pinning: 'exact',
  title: { en: 'My course' },
  objectives: [{ id: 'tides', text: { en: 'Tides.' } }],
  units: [{ id: 'one', title: { en: 'One' }, items }],
});

beforeAll(async () => {
  const made = await remixBuiltin('tides', { id: 'my-tides' });
  const base = clone(made.pack);
  pack = made.pack;
  pack.steps[1].title = { en: 'A better title', es: 'Un mejor título' };
  link = (await packLink(pack, { root: ROOT, base })).fragment;
  const facts = lessonFacts((await openedLink(link)).lesson);
  item = {
    id: 'tides-mine',
    kind: 'pack',
    pack: 'my-tides',
    version: '1.0.0',
    link,
    pin: pinFor({ kind: 'pack' }, facts),
  };
  course = courseOf(item);
}, 120_000);

describe('the format', () => {
  test('a pack item is a valid item, and an exact course pins it', () => {
    expect(validateCoursePack(course, api)).toEqual([]);
    const bare = clone(course);
    delete bare.units[0].items[0].pin;
    expect(validateCoursePack(bare, api).map(e => e.code)).toEqual([
      'pinRequired',
    ]);
    bare.pinning = 'compatible';
    expect(validateCoursePack(bare, api)).toEqual([]);
  });

  test('refuses a link that is not a link, a pack id that is not an id, a field it has not', () => {
    for (const [field, value, code] of [
      ['link', 'javascript:alert(1)', 'packLink'],
      ['link', '', 'packLink'],
      ['link', `${link}${'A'.repeat(4000)}`, 'textLong'],
      ['pack', 'My Pack', 'packId'],
      ['version', '1', 'version'],
    ]) {
      const c = clone(course);
      c.units[0].items[0][field] = value;
      expect(validateCoursePack(c, api).map(e => e.code)).toContain(code);
    }
    const c = clone(course);
    c.units[0].items[0].lesson = 'tides';
    expect(validateCoursePack(c, api).length).toBeGreaterThan(0);
  });

  test('its progress key is the pack’s, as the engine keeps it', () => {
    expect(lessonKeyOf(item)).toBe(remixLessonId(pack));
    expect(lessonKeyOf(item)).toBe('rx-my-tides-1-0-0');
  });
});

describe('the pin is the digest of the pack’s steps', () => {
  test('a pack opens as the application opens it, and pins to the original’s digest when the steps are the same', async () => {
    const got = await openedPack(item);
    expect(got.ok).toBe(true);
    expect(got.lesson.id).toBe('rx-my-tides-1-0-0');
    const original = lessonFacts(await load('tides'));
    expect(item.pin.fp).toBe(original.fp);
    expect(item.pin.n).toBe(original.n);
  });

  test('reviews as the same, and a pin that has moved needs review', async () => {
    const facts = await courseFacts(course, { load, openPack: openedPack });
    expect(facts.lessons.has('rx-my-tides-1-0-0')).toBe(true);
    expect(reviewCoursePack(course, facts)[0].status).toBe(STATUS.SAME);
    const moved = clone(course);
    moved.units[0].items[0].pin.fp = '00000000';
    const r = reviewCoursePack(moved, facts)[0];
    expect(r.status).toBe(STATUS.CHANGED);
    expect(r.needsReview).toBe(true);
  });

  test('a removed step moves the digest, and the upgrade re-pins it', async () => {
    const base = (await remixBuiltin('tides', { id: 'base' })).pack;
    // The first step whose removal leaves a pack the rules still accept.
    let l2 = null;
    for (let i = 2; i < pack.steps.length - 1 && !l2; i++) {
      const fewer = clone(pack);
      fewer.steps.splice(i, 1);
      const f = (await packLink(fewer, { root: ROOT, base })).fragment;
      if ((await openedLink(f)).ok) l2 = f;
    }
    expect(l2).toBeTruthy();
    const c = clone(course);
    c.units[0].items[0].link = l2;
    const facts = await courseFacts(c, { load, openPack: openedPack });
    expect(reviewCoursePack(c, facts)[0].status).toBe(STATUS.CHANGED);
    const up = upgradeCoursePack(c, facts, ['tides-mine'], {
      today: '2026-10-09',
      newAssignmentId: () => 'x',
    });
    expect(up.upgraded).toEqual(['tides-mine']);
    expect(up.pack.units[0].items[0].pin.n).toBe(item.pin.n - 1);
    const again = await courseFacts(up.pack, { load, openPack: openedPack });
    expect(reviewCoursePack(up.pack, again)[0].status).toBe(STATUS.SAME);
  });

  test('a link that changes an expected value does not open: the item is missing', async () => {
    const bad = clone(pack);
    const i = bad.steps.findIndex(s => s.type === 'question' && 'answer' in s);
    bad.steps[i].answer = bad.steps[i].answer === 1 ? 2 : 1;
    const base = (await remixBuiltin('tides', { id: 'base' })).pack;
    const delta = remixDelta(bad, base);
    const evil = (await packLink(bad, { root: ROOT, base })).fragment;
    expect(delta).toBeTruthy();
    const c = clone(course);
    c.units[0].items[0].link = evil;
    const facts = await courseFacts(c, { load, openPack: openedPack });
    expect(facts.lessons.has('rx-my-tides-1-0-0')).toBe(false);
    expect(reviewCoursePack(c, facts)[0].status).toBe(STATUS.MISSING);
    expect(
      auditCourse(c, facts).some(
        f => f.code === 'missing' && f.level === 'error'
      )
    ).toBe(true);
    const got = await openedPack(c.units[0].items[0]);
    expect(got.ok).toBe(false);
    expect(got.message).toContain('answer');
  });

  test('a link for another pack, a damaged link and an installed-package link do not open', async () => {
    const other = { ...item, pack: 'someone-elses' };
    expect((await openedPack(other)).reason).toBe('identity');
    expect((await openedLink('i1zAAAA')).ok).toBe(false);
    const k = `i1r${Buffer.from('{"k":"a.b"}').toString('base64url')}`;
    expect((await openedLink(k)).reason).toBe('installed');
  });
});

describe('a page that cannot open it', () => {
  test('says unchecked, not missing, and does not ask for a review', async () => {
    const facts = await courseFacts(course, { load });
    const r = reviewCoursePack(course, facts)[0];
    expect(r.status).toBe(STATUS.UNCHECKED);
    expect(r.needsReview).toBe(false);
    const audit = auditCourse(course, facts);
    expect(audit.filter(f => f.level === 'error')).toEqual([]);
    expect(audit.some(f => f.code === 'packUnchecked')).toBe(true);
  });
});

describe('the rest of the review reads it as a lesson', () => {
  test('time comes from the pack’s own duration', async () => {
    const facts = await courseFacts(course, { load, openPack: openedPack });
    const t = estimate(course, facts).items.get('tides-mine');
    expect(t.lo).toBeGreaterThan(0);
    const audit = auditCourse(course, facts);
    expect(audit.filter(f => f.level === 'error')).toEqual([]);
  });

  test('the graph opens the pack’s lesson id and its scenarios', async () => {
    const facts = await courseFacts(course, { load, openPack: openedPack });
    const g = dependencyGraph(course, facts);
    expect(g.nodes.some(n => n.id === 'lesson:rx-my-tides-1-0-0')).toBe(true);
    expect(g.nodes.some(n => n.type === 'scenario-source')).toBe(true);
  });

  test('the link the course home opens is the item’s own', async () => {
    const l = await itemLink(item, { root: ROOT });
    expect(l).toEqual({ href: `${ROOT}#${link}`, kind: 'app' });
    expect(itemsOf(course)).toHaveLength(1);
  });
});

describe('the words', () => {
  test('every reason a link can fail has words in both languages', () => {
    for (const r of [
      'corrupt',
      'wrongKind',
      'newerVersion',
      'tooLarge',
      'notPack',
      'installed',
      'noOriginal',
      'delta',
      'invalid',
      'identity',
    ])
      for (const T of [EN_COURSE, ES_COURSE])
        expect(T[`course.pack.${r}`]).toEqual(expect.any(String));
  });
});
