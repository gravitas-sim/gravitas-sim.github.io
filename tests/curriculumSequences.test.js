// Roadmap II, Prompt 97: the six sequences and the shipped course packs.
import {
  SEQUENCES,
  SEQUENCE_DEPTHS,
} from '../js/data/investigations/sequences.js';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import { BUILTIN_COURSES } from '../js/data/courses/index.js';
import { courseApi, courseFacts } from '../js/course/api.js';
import { validateCoursePack, itemsOf } from '../js/course/pack.js';
import { auditCourse, textsOf, translationState } from '../js/course/review.js';
import { itemLink } from '../js/course/links.js';

describe('the sequences', () => {
  test('are the six named ones, each ordered, and cover every investigation', () => {
    expect(SEQUENCES.map(s => s.id)).toEqual([
      'the-sky',
      'gravity-and-orbits',
      'light-and-stars',
      'planets-and-exoplanets',
      'galaxies-and-the-universe',
      'observing-and-measuring',
    ]);
    const named = new Set(SEQUENCES.flatMap(s => s.lessons.map(l => l.id)));
    expect(MANIFEST.filter(m => !named.has(m.id)).map(m => m.id)).toEqual([]);
  });

  test('every needs is earlier in its sequence, and every depth is one the lesson offers', () => {
    const offered = new Map(MANIFEST.map(m => [m.id, m.depths || 1]));
    const ids = new Set(SEQUENCES.map(s => s.id));
    for (const s of SEQUENCES) {
      s.after.forEach(a => expect(ids.has(a)).toBe(true));
      const seen = new Set();
      for (const l of s.lessons) {
        for (const n of l.needs || []) expect(seen.has(n)).toBe(true);
        expect(SEQUENCE_DEPTHS.indexOf(l.depth)).toBeGreaterThanOrEqual(0);
        expect(SEQUENCE_DEPTHS.indexOf(l.depth)).toBeLessThan(
          offered.get(l.id)
        );
        seen.add(l.id);
      }
    }
  });
});

describe('the shipped course packs', () => {
  const ids = ['astronomy-semester', 'observing-lab', 'upper-level-modules'];
  test.each(ids)(
    '%s is valid, audits clean and is translated',
    async id => {
      const pack = await BUILTIN_COURSES[id]();
      expect(validateCoursePack(pack, courseApi())).toEqual([]);
      const facts = await courseFacts(pack, {
        load: lid => loadInvestigation(lid, 'en'),
      });
      const bad = auditCourse(pack, facts).filter(
        f => !['guide', 'licenseNotStated'].includes(f.code)
      );
      expect(bad).toEqual([]);
      for (const x of textsOf(pack))
        expect(translationState(x.v, 'es')).toBe('done');
      expect(['survey', 'majors', 'upper']).toContain(pack.courseLevel);
      expect(itemsOf(pack).length).toBeGreaterThan(8);
    },
    60_000
  );

  test('a lesson with no depth opens at its course level', async () => {
    const item = { kind: 'lesson', lesson: 'keplers-laws' };
    const at = level =>
      itemLink(item, { root: 'https://x/', level }).then(l => l.href);
    expect(await at('survey')).toBe('https://x/#investigation=keplers-laws');
    expect(await at('majors')).toBe(
      'https://x/#investigation=keplers-laws/quantitative'
    );
    expect(await at('upper')).toBe(
      'https://x/#investigation=keplers-laws/advanced'
    );
    const own = { ...item, depth: 'core' };
    expect(
      (await itemLink(own, { root: 'https://x/', level: 'upper' })).href
    ).toBe('https://x/#investigation=keplers-laws/core');
  });
});

describe('the default short route', () => {
  test('every investigation has one, of at least two steps and no more than 25 estimated minutes', async () => {
    const { shortRoute, SHORT_ROUTE_MAX } =
      await import('../js/assignments/shortRoute.js');
    for (const m of MANIFEST) {
      const r = shortRoute(await loadInvestigation(m.id, 'en'));
      expect({ id: m.id, ok: r.sids.length >= 2 }).toEqual({
        id: m.id,
        ok: true,
      });
      expect(r.minutes).toBeLessThanOrEqual(SHORT_ROUTE_MAX);
      expect(r.sids).toEqual(expect.arrayContaining(r.chosen));
    }
  }, 60_000);
});

describe('scenario concept tags', () => {
  test('every tag is used by a lesson that builds one of its scenarios, or covered in the curation file', async () => {
    const { SCENARIO_INFO, scenarioId } =
      await import('../js/data/scenarioInfo.js');
    const curation = JSON.parse(
      (await import('node:fs')).readFileSync(
        'tools/library-curation.json',
        'utf8'
      )
    );
    const used = new Set();
    for (const m of MANIFEST) {
      const lesson = await loadInvestigation(m.id, 'en');
      for (const s of lesson.steps) {
        const key = scenarioId(s.setup?.scenario) ?? s.setup?.scenario;
        for (const tag of SCENARIO_INFO[key]?.tags || []) used.add(tag);
      }
    }
    const tags = new Set(
      Object.values(SCENARIO_INFO).flatMap(i => i.tags || [])
    );
    const ids = new Set(MANIFEST.map(m => m.id));
    for (const [tag, lessons] of Object.entries(curation.conceptCoverage)) {
      expect(tags.has(tag)).toBe(true);
      lessons.forEach(l => expect(ids.has(l)).toBe(true));
      used.add(tag);
    }
    expect([...tags].filter(t => !used.has(t))).toEqual([]);
  }, 60_000);
});
