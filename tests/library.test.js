// =============================================================================
// The Library (Roadmap II Prompt 54, LIBRARY.md)
// -----------------------------------------------------------------------------
// library/library.json is generated (tools/build-library.mjs) from the sources
// that own each thing. This holds it to its schema, to its generator, to the
// routes it emits, and to the lesson browser inside the application: the
// browser's lessons are the Library's investigations of format "lesson", read
// from the same tables, and filtered by the same functions.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DecompressionStream } from 'node:stream/web';

import { valid } from './jsonSchemaSubset.js';
import {
  COVERED,
  FORMATS,
  KINDS,
  LEVELS,
  MATHEMATICS,
  SCENARIO_SUBJECTS,
  coverage,
  rawWorldLink,
  renderCoverage,
  renderHome,
} from '../tools/build-library.mjs';
import { routeProblem, routeTables } from '../tools/library-routes.mjs';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import { BROWSE_META } from '../js/data/investigations/browseData.js';
import {
  calculationOf,
  lengthOf,
} from '../js/data/investigations/sequences.js';
import {
  NO_FILTERS,
  filterCatalog,
  loosening,
  tagsOf,
} from '../js/data/investigations/browse.js';
import { SCENARIO_TAGS } from '../js/data/scenarioTags.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import { FIXTURES } from '../js/observatory/fixtures.js';
import { GUIDES as EXOPLANET } from '../js/observatory/guides/exoplanet.js';
import { GUIDES as POPULATIONS } from '../js/observatory/guides/populations.js';
import { GUIDES as LAB3D } from '../js/lab3d/guides/curriculum.js';
import { GUIDES as MISSION } from '../js/mission/lab/curriculum.js';
import { EN_LIBRARY } from '../js/i18n/en.library.js';
import { ES_LIBRARY } from '../js/i18n/es.library.js';
import { FORMAT, FORMAT_VERSION, checkLibrary } from '../js/library/format.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(ROOT, f), 'utf8');
const library = JSON.parse(read('library/library.json'));
const schema = JSON.parse(read('sdk/schemas/library-1.schema.json'));
const SUBJECTS = new Set(Object.values(BROWSE_META).flatMap(m => m.tags));
const lessons = library.entries.filter(e => e.format === 'lesson');

describe('library/library.json', () => {
  test('is what the generator writes, with its coverage table and Home cards', () => {
    const out = execFileSync(
      process.execPath,
      ['tools/build-library.mjs', '--check'],
      { cwd: ROOT, encoding: 'utf8' }
    );
    expect(out).toMatch(/125|\d+ entries/);
  });

  test('writes world links uncompressed, so every Node writes the same bytes', async () => {
    const scenarios = library.entries.filter(e => e.kind === 'scenario');
    expect(scenarios.length).toBeGreaterThan(0);
    const { decodePayload } = await import('../js/shareState.js');
    for (const e of scenarios) {
      expect([e.id, e.route.startsWith('/#1r')]).toEqual([e.id, true]);
      // The app reads it back as the world the entry names.
      const payload = await decodePayload(e.route.slice(2));
      expect([e.id, payload.s in SCENARIO_INFO]).toEqual([e.id, true]);
      expect(e.route).toBe(`/#${rawWorldLink(payload)}`);
    }
  });

  test('fits its schema, entry by entry', () => {
    for (const e of library.entries)
      expect({ id: e.id, ok: valid(schema.$defs.entry, e, schema) }).toEqual({
        id: e.id,
        ok: true,
      });
    expect(valid(schema, library)).toBe(true);
    expect(library.format).toBe(FORMAT);
    expect(library.formatVersion).toBe(FORMAT_VERSION);
    expect(checkLibrary(library)).toBe(library);
    expect(() => checkLibrary({ ...library, formatVersion: 2 })).toThrow();
  });

  test("the schema's vocabularies are the generator's", () => {
    const entry = schema.$defs.entry.properties;
    expect(entry.kind.enum).toEqual([...KINDS]);
    expect(entry.format.enum).toEqual(Object.values(FORMATS).flat());
    expect(entry.level.anyOf[1].enum).toEqual([...LEVELS]);
    expect(entry.mathematics.anyOf[1].enum).toEqual([...MATHEMATICS]);
    for (const e of library.entries)
      expect([e.id, FORMATS[e.kind].includes(e.format)]).toEqual([e.id, true]);
  });

  test('a schema refuses what the page would not read', () => {
    const bad = JSON.parse(JSON.stringify(library));
    bad.entries[0].kind = 'lesson';
    expect(valid(schema, bad)).toBe(false);
    const other = JSON.parse(JSON.stringify(library));
    other.formatVersion = 2;
    expect(valid(schema, other)).toBe(false);
  });

  test('has every id once, and names only ids it has', () => {
    const ids = library.entries.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const known = new Set(ids);
    for (const s of library.sequences)
      for (const id of s.entries)
        expect([s.id, id, known.has(id)]).toEqual([s.id, id, true]);
    for (const e of library.entries)
      for (const id of e.prerequisites || [])
        expect([e.id, id, known.has(id)]).toEqual([e.id, id, true]);
    const subjects = new Set(library.subjects.map(s => s.id));
    for (const e of library.entries)
      for (const s of e.subjects || [])
        expect([e.id, subjects.has(s)]).toEqual([e.id, true]);
  });

  test('every subject is one of the lessons', () => {
    for (const s of library.subjects)
      expect([s.id, SUBJECTS.has(s.id)]).toEqual([s.id, true]);
  });

  test('holds every kind the platform model names for it', () => {
    for (const kind of KINDS)
      expect([kind, library.entries.some(e => e.kind === kind)]).toEqual([
        kind,
        true,
      ]);
  });
});

describe('every route opens what it names', () => {
  test('each resolves against the source its page reads', async () => {
    globalThis.DecompressionStream ??= DecompressionStream;
    const tables = await routeTables();
    const problems = [];
    for (const e of library.entries) {
      const why = await routeProblem(e.route, tables);
      if (why) problems.push(`${e.id}: ${why}`);
    }
    expect(problems).toEqual([]);
  });

  test('a wrong id is caught, not passed', async () => {
    const tables = await routeTables();
    expect(await routeProblem('/#investigation=nothing', tables)).toMatch(
      /no investigation/
    );
    expect(await routeProblem('/observatory/?guide=exo-none', tables)).toMatch(
      /no guide/
    );
    expect(await routeProblem('/observatory/?open=none', tables)).toMatch(
      /no observation/
    );
    expect(await routeProblem('/course/?course=none', tables)).toMatch(
      /no built-in course/
    );
    expect(await routeProblem('/nowhere/', tables)).toMatch(/no page/);
    expect(await routeProblem('/#activity=x/y', tables)).toMatch(
      /does not route/
    );
  });
});

describe('the lesson browser is a filtered view of the Library', () => {
  test("its lessons are the Library's, in the same order", () => {
    expect(lessons.map(e => e.id)).toEqual(
      MANIFEST.map(m => `investigation:${m.id}`)
    );
  });

  test('with the same subjects, length and arithmetic', () => {
    for (const m of MANIFEST) {
      const e = library.entries.find(x => x.id === `investigation:${m.id}`);
      expect({
        id: m.id,
        subjects: e.subjects,
        length: e.length,
        calc: e.calculation,
      }).toEqual({
        id: m.id,
        subjects: BROWSE_META[m.id].tags.length
          ? [...BROWSE_META[m.id].tags].sort()
          : null,
        length: lengthOf(m),
        calc: calculationOf(m),
      });
    }
  });

  test('and the same filter finds the same lessons in both', () => {
    for (const subject of SUBJECTS) {
      const inApp = filterCatalog(MANIFEST, { ...NO_FILTERS, subject }).map(
        r => r.entry.id
      );
      const inLibrary = filterCatalog(library.entries, {
        ...NO_FILTERS,
        subject,
        format: 'lesson',
      }).map(r => r.entry.id.replace('investigation:', ''));
      expect([subject, inLibrary]).toEqual([subject, inApp]);
    }
  });
});

describe('filtering the Library', () => {
  const english = library.entries.map(e => ({
    ...e,
    title: e.title.en,
    summary: e.summary?.en ?? '',
  }));
  const ids = rows => rows.map(r => r.entry.id);

  test('kind, format and level narrow it', () => {
    const activities = filterCatalog(english, {
      ...NO_FILTERS,
      kind: 'activity',
    });
    expect(activities.length).toBe(
      library.entries.filter(e => e.kind === 'activity').length
    );
    expect(activities.every(r => r.entry.kind === 'activity')).toBe(true);
    const observatory = filterCatalog(english, {
      ...NO_FILTERS,
      format: 'observatory',
    });
    expect(
      ids(observatory).every(id => /^investigation:(exo|pop)-/.test(id))
    ).toBe(true);
    expect(observatory.length).toBe(EXOPLANET.length + POPULATIONS.length);
    const beginner = filterCatalog(english, {
      ...NO_FILTERS,
      level: 'beginner',
    });
    expect(beginner.every(r => r.entry.level === 'beginner')).toBe(true);
  });

  test('an entry without a length or arithmetic is not filed under one', () => {
    // Every kind declares both since Prompt 76 (R-L), so the rule is held
    // against entries made without them.
    const bare = english.map(e =>
      e.kind === 'scenario' ? { ...e, length: null, calculation: null } : e
    );
    const demo = filterCatalog(bare, { ...NO_FILTERS, length: 'demo' });
    expect(demo.some(r => r.entry.kind === 'scenario')).toBe(false);
    const none = filterCatalog(bare, { ...NO_FILTERS, calculation: 'none' });
    expect(none.some(r => r.entry.calculation === null)).toBe(false);
  });

  test('the search reads titles, subjects and the id, accents folded', () => {
    expect(
      ids(filterCatalog(english, { ...NO_FILTERS, query: 'hohmann' }))
    ).toContain('investigation:hohmann-transfer');
    const spanish = library.entries.map(e => ({
      ...e,
      title: e.title.es,
      summary: e.summary?.es ?? '',
    }));
    expect(
      filterCatalog(spanish, { ...NO_FILTERS, query: 'orbitas' }).length
    ).toBeGreaterThan(0);
    expect(tagsOf(library.entries[0])).toEqual(library.entries[0].subjects);
  });

  test('an empty result offers the filter to drop', () => {
    const f = { ...NO_FILTERS, kind: 'course', length: 'demo' };
    expect(filterCatalog(english, f)).toEqual([]);
    expect(loosening(english, f)?.key).toBeTruthy();
  });
});

describe('the metadata holes are filled (Prompt 76, R-L)', () => {
  const of = kind => library.entries.filter(e => e.kind === kind);

  test.each(['scenario', 'dataset', 'course', 'experiment', 'activity'])(
    'every %s states a summary, level, duration, mathematics and prerequisites',
    kind => {
      for (const e of of(kind)) {
        for (const f of ['summary', 'level', 'duration', 'mathematics'])
          expect([e.id, f, e[f] === null]).toEqual([e.id, f, false]);
        expect([e.id, Array.isArray(e.prerequisites)]).toEqual([e.id, true]);
      }
    }
  );

  test('every investigation names a textbook chapter and a course level', () => {
    for (const e of of('investigation')) {
      expect(e.textbook?.chapter).toBeGreaterThanOrEqual(1);
      expect(e.textbook.chapter).toBeLessThanOrEqual(30);
      expect(['survey', 'majors', 'upper']).toContain(e.courseLevel);
    }
  });

  test('a course takes the most advanced of what it names', () => {
    const course = of('course').find(e => e.id === 'course:intro-astronomy');
    expect(course.level).toBe('intro');
    expect(course.mathematics).toBe('logarithms');
  });

  test('the curation file names only what exists', async () => {
    const { buildLibrary } = await import('../tools/build-library.mjs');
    // buildLibrary throws for a record that names nothing or a source with none.
    await expect(buildLibrary()).resolves.toBeTruthy();
  });
});

describe('the sources carry what the Library reads', () => {
  test('every guide declares its level, duration and subjects', () => {
    for (const g of [...EXOPLANET, ...POPULATIONS, ...LAB3D, ...MISSION]) {
      expect([g.id, LEVELS.includes(g.level)]).toEqual([g.id, true]);
      expect([g.id, g.minutes.intro > 0]).toEqual([g.id, true]);
      expect([
        g.id,
        g.tags.length > 0 && g.tags.every(t => SUBJECTS.has(t)),
      ]).toEqual([g.id, true]);
    }
  });

  test("every observation is filed under the lessons' subjects", () => {
    for (const f of FIXTURES)
      expect([
        f.id,
        f.tags.length > 0 && f.tags.every(t => SUBJECTS.has(t)),
      ]).toEqual([f.id, true]);
  });

  test('every gallery tag has a subject', () => {
    expect(Object.keys(SCENARIO_SUBJECTS).sort()).toEqual(
      Object.keys(SCENARIO_TAGS).sort()
    );
    for (const s of Object.values(SCENARIO_SUBJECTS))
      expect([s, SUBJECTS.has(s)]).toEqual([s, true]);
  });
});

describe('what is written beside it', () => {
  test("LIBRARY.md's coverage table is the generator's", () => {
    expect(read('LIBRARY.md')).toContain(renderCoverage(library));
    const rows = coverage(library);
    expect(rows.map(r => r.kind)).toEqual([...KINDS]);
    for (const r of rows) expect(Object.keys(r.has)).toEqual([...COVERED]);
  });

  test("Home's Library cards are the generator's, one per kind", async () => {
    const cards = await renderHome(library);
    expect(read('js/fragments/home.html')).toContain(cards);
    for (const kind of KINDS)
      expect(cards).toContain(`href="/library/?kind=${kind}"`);
  });

  test('the page speaks both languages, id for id', () => {
    expect(Object.keys(ES_LIBRARY).sort()).toEqual(
      Object.keys(EN_LIBRARY).sort()
    );
    for (const kind of KINDS) {
      expect(EN_LIBRARY[`lib.kind.${kind}`]).toBeTruthy();
      expect(EN_LIBRARY[`lib.badge.${kind}`]).toBeTruthy();
    }
    for (const format of Object.values(FORMATS).flat())
      expect(EN_LIBRARY[`lib.format.${format}`]).toBeTruthy();
  });
});
