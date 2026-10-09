// =============================================================================
// gravitas.course-pack/2, held to its JSON Schema
// -----------------------------------------------------------------------------
// sdk/schemas/course-pack-2.schema.json (Roadmap II Prompt 61, repaired in R-F)
// is held as tests/formatSchemasStudentWork.test.js holds the investigation
// pack:
//
//   - the pack the builder ships as its example, and the one a /1 pack
//     migrates to, fit it, and the reader reads them;
//   - what the reader refuses, the schema refuses too. Where the reader
//     refuses for a reason no schema can state - a rule across items, a
//     reference to a lesson or a dataset - the case is listed as the
//     validator's alone; where the reader accepts what the schema, which
//     states the format as written, refuses, the case is listed too
//     (./schemaCorpus.js holds());
//   - every table in the schema is the code's own, and the schema's title,
//     $id and version are its row in FORMATS.md (tools/formats.mjs).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { valid } from './jsonSchemaSubset.js';
import { LEGACY_NAMES } from './scenarioLegacyKeys.js';
import { as, holds, isItsRow } from './schemaCorpus.js';
import * as CP from '../js/course/pack.js';
import { courseApi } from '../js/course/api.js';
import { INTRO_ASTRONOMY } from '../js/data/courses/intro-astronomy.js';
import { packApi } from '../js/composer/api.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(REPO, file), 'utf8');
const schema = name => JSON.parse(read(`sdk/schemas/${name}.schema.json`));
const clone = v => JSON.parse(JSON.stringify(v));

const api = courseApi();
const reads = d => CP.validateCoursePack(d, api).length === 0;
const s = schema('course-pack-2');
const item = (d, id) => d.units.flatMap(u => u.items).find(i => i.id === id);

describe('the course pack /2 schema', () => {
  test('is its row in FORMATS.md, at the version the code writes', () => {
    isItsRow(
      'course-pack-2',
      'gravitas.course-pack',
      CP.FORMAT_VERSION,
      'gravitas.course-pack (builder form)'
    );
  });

  test('the builder’s example fits it, and so does every kind of item it holds', () => {
    expect(INTRO_ASTRONOMY.formatVersion).toBe(2);
    expect(reads(INTRO_ASTRONOMY)).toBe(true);
    expect(valid(s, INTRO_ASTRONOMY)).toBe(true);
    // Every kind but the pack (tests/remixCourse.test.js) is in it, or this
    // proves less than it says.
    const kinds = new Set(
      INTRO_ASTRONOMY.units.flatMap(u => u.items.map(i => i.kind))
    );
    expect([...kinds].sort()).toEqual(
      CP.ITEM_KINDS.filter(k => k !== 'pack').sort()
    );
    // The SDK's example, an exact pack with every lesson pinned.
    const example = JSON.parse(
      read('sdk/examples/orbits-first-week/course.json')
    );
    expect([reads(example), valid(s, example)]).toEqual([true, true]);
  });

  test('a /1 pack, migrated, fits it', () => {
    const v1 = JSON.parse(read('sdk/examples/finding-exoplanets/course.json'));
    const migrated = CP.migrateCoursePack(v1, { platform: '1.0.0' });
    expect(migrated.formatVersion).toBe(2);
    expect([reads(migrated), valid(s, migrated)]).toEqual([true, true]);
    // And /1 itself is not /2.
    expect(valid(s, v1)).toBe(false);
  });

  test('and refuses what validateCoursePack refuses, where a schema can say it', () => {
    const cases = [
      ['both', 'the wrong format', d => (d.format = 'gravitas.course')],
      ['both', 'version 1', d => (d.formatVersion = 1)],
      ['both', 'version 3', d => (d.formatVersion = 3)],
      ['both', 'an id that is not public', d => (d.id = 'Intro Astronomy')],
      ['both', 'a version that is not one', d => (d.version = '1.0')],
      ['both', 'no platform', d => delete d.gravitas],
      ['both', 'no English', d => (d.locales = ['es'])],
      ['both', 'a locale Gravitas lacks', d => d.locales.push('fr')],
      ['both', 'no locales', d => (d.locales = [])],
      ['both', 'a pinning that is neither', d => (d.pinning = 'loose')],
      ['both', 'an unknown field', d => (d.author = 'x')],
      ['both', 'a title with markup', d => (d.title.en = '<b>Course</b>')],
      [
        'both',
        'a title with an entity',
        d => (d.title.en = 'Orbits &amp; gravity'),
      ],
      ['both', 'a title with no English', d => delete d.title.en],
      ['both', 'a blank English title', d => (d.title.en = '  ')],
      [
        'both',
        'a title of 121 characters',
        d => (d.title.en = 'x'.repeat(121)),
      ],
      ['both', 'a digest that is not one', d => (d.title.esOf = 'xyz')],
      ['both', 'a text that is not text', d => (d.summary = 'a string')],
      [
        'both',
        'an audience of 301 characters',
        d => (d.audience = { en: 'x'.repeat(301) }),
      ],
      [
        'both',
        'thirteen objectives',
        d =>
          (d.objectives = Array.from({ length: 13 }, (_, i) => ({
            id: `o${i}`,
            text: { en: 'x' },
          }))),
      ],
      [
        'both',
        'an objective with an extra field',
        d => (d.objectives[0].extra = 1),
      ],
      [
        'both',
        'an objective id that is not public',
        d => (d.objectives[0].id = 'Orbits'),
      ],
      [
        'both',
        'seven prerequisites',
        d => (d.prerequisites = Array(7).fill({ text: { en: 'x' } })),
      ],
      [
        'both',
        'a prerequisite of two kinds',
        d =>
          (d.prerequisites = [{ lesson: 'keplers-laws', text: { en: 'x' } }]),
      ],
      [
        'both',
        'a prerequisite lesson that does not exist',
        d => (d.prerequisites = [{ lesson: 'nope' }]),
      ],
      ['both', 'no units', d => (d.units = [])],
      ['both', 'a unit with no items', d => (d.units[0].items = [])],
      ['both', 'a unit with an extra field', d => (d.units[0].order = 1)],
      ['both', 'a unit with no title', d => delete d.units[0].title],
      ['both', 'an item of no kind', d => (d.units[0].items[0].kind = 'quiz')],
      [
        'both',
        'an item with an extra field',
        d => (item(d, 'keplers-laws').grade = 1),
      ],
      [
        'both',
        'an item id that is not public',
        d => (item(d, 'keplers-laws').id = 'Kepler'),
      ],
      [
        'both',
        'a path that is not one',
        d => (item(d, 'keplers-laws').path = 'bonus'),
      ],
      [
        'both',
        'zero minutes',
        d => (item(d, 'watch-the-solar-system').minutes = 0),
      ],
      [
        'both',
        '601 minutes',
        d => (item(d, 'watch-the-solar-system').minutes = 601),
      ],
      [
        'both',
        'minutes of 1.5',
        d => (item(d, 'watch-the-solar-system').minutes = 1.5),
      ],
      [
        'both',
        'a lesson Gravitas lacks',
        d => (item(d, 'keplers-laws').lesson = 'nope'),
      ],
      [
        'both',
        'a pin with no digest',
        d => delete item(d, 'keplers-laws').pin.fp,
      ],
      [
        'both',
        'a pin digest of the wrong length',
        d => (item(d, 'keplers-laws').pin.fp = 'abc'),
      ],
      ['both', 'a pin of no steps', d => (item(d, 'keplers-laws').pin.n = 0)],
      [
        'both',
        'a pin with an extra field',
        d => (item(d, 'keplers-laws').pin.at = 1),
      ],
      [
        'both',
        'a package that is not a pair',
        d => (item(d, 'keplers-laws').pin.pkg = ['gravitas.x']),
      ],
      [
        'both',
        'a pin with step hashes on a lesson',
        d => (item(d, 'keplers-laws').pin.f = ['aaaaaaaa']),
      ],
      [
        'both',
        'an assignment with no steps',
        d => (item(d, 'a-first-transit').steps = []),
      ],
      [
        'both',
        'an assignment step that is not an id',
        d => (item(d, 'a-first-transit').steps[0] = 'a b'),
      ],
      [
        'both',
        'an assignment naming a step twice',
        d => (item(d, 'a-first-transit').steps = ['x', 'x']),
      ],
      [
        'both',
        'an assignment with no assignment id',
        d => delete item(d, 'a-first-transit').assignment,
      ],
      [
        'both',
        'an assignment date that is not one',
        d => (item(d, 'a-first-transit').assignment.created = 'May'),
      ],
      [
        'both',
        'an assignment pin with no step hashes',
        d => delete item(d, 'a-first-transit').pin.f,
      ],
      [
        'both',
        'a scenario Gravitas lacks',
        d => (item(d, 'watch-the-solar-system').scenario = 'Nowhere'),
      ],
      [
        'both',
        'a seed with a space',
        d => (item(d, 'watch-the-solar-system').seed = 'a b'),
      ],
      [
        'both',
        'a scenario with no seed',
        d => delete item(d, 'watch-the-solar-system').seed,
      ],
      [
        'both',
        'a scenario paused as text',
        d => (item(d, 'watch-the-solar-system').paused = 'yes'),
      ],
      [
        'both',
        'a scenario with no minutes',
        d => delete item(d, 'watch-the-solar-system').minutes,
      ],
      [
        'both',
        'a dataset with no minutes',
        d => delete item(d, 'a-real-spectrum').minutes,
      ],
      [
        'both',
        'a reading with no citation',
        d => delete item(d, 'reading-orbits-and-gravity').cite,
      ],
      [
        'both',
        'a citation with no authors',
        d => delete item(d, 'reading-orbits-and-gravity').cite.authors,
      ],
      [
        'both',
        'a year of 1400',
        d => (item(d, 'reading-orbits-and-gravity').cite.year = 1400),
      ],
      [
        'both',
        'a DOI that is not one',
        d => (item(d, 'reading-orbits-and-gravity').cite.doi = 'doi:abc'),
      ],
      [
        'both',
        'a reading access that is not one',
        d => (item(d, 'reading-orbits-and-gravity').access = 'free'),
      ],
      [
        'both',
        'a licence with markup',
        d => (item(d, 'reading-orbits-and-gravity').license = '<b>CC</b>'),
      ],
      [
        'both',
        'a reading with no title',
        d => delete item(d, 'reading-orbits-and-gravity').title,
      ],
      // The reader's alone: rules across fields and references to this build.
      [
        'validator',
        'an item id used twice',
        d => (item(d, 'retrograde-motion').id = 'keplers-laws'),
      ],
      [
        'validator',
        'a unit id used twice',
        d => (d.units[1].id = d.units[0].id),
      ],
      [
        'validator',
        'an objective id used twice',
        d => (d.objectives[1].id = d.objectives[0].id),
      ],
      [
        'validator',
        'an item objective the course lacks',
        d => (item(d, 'keplers-laws').objectives = ['nope']),
      ],
      [
        'validator',
        'a need on a later item',
        d => (item(d, 'keplers-laws').needs = ['orbital-energy']),
      ],
      [
        'validator',
        'a need that is not an item',
        d => (item(d, 'keplers-laws').needs = ['nope']),
      ],
      [
        'validator',
        'the core needing an optional item',
        d => (item(d, 'keplers-laws').needs = ['reading-orbits-and-gravity']),
      ],
      [
        'validator',
        'a lesson named twice as a lesson',
        d => (item(d, 'retrograde-motion').lesson = 'keplers-laws'),
      ],
      [
        'validator',
        'a dataset Gravitas lacks',
        d => (item(d, 'a-real-spectrum').dataset = 'no-such-set'),
      ],
      [
        'validator',
        'a pin without step hashes on an assignment of three steps',
        d => item(d, 'a-first-transit').pin.f.pop(),
      ],
      [
        'both',
        'an assignment pin hash that is not a hash',
        d => (item(d, 'a-first-transit').pin.f[0] = 'zzzzzzzz'),
      ],
      [
        'validator',
        'an exact pack with a lesson unpinned',
        d => {
          d.pinning = 'exact';
          delete item(d, 'keplers-laws').pin;
        },
      ],
      [
        'validator',
        'a text in a locale the file lacks',
        d => {
          d.locales = ['en'];
        },
      ],
      [
        'validator',
        'a reading address that is not canonical',
        d =>
          (item(d, 'reading-orbits-and-gravity').cite.url =
            'https://openstax.org'),
      ],
      [
        'both',
        'a reading address with credentials',
        d =>
          (item(d, 'reading-orbits-and-gravity').cite.url =
            'https://u:p@openstax.org/x'),
      ],
      [
        'both',
        'more than 30 items in a unit',
        d => {
          const u = d.units[0];
          const base = u.items[0];
          u.items = Array.from({ length: 31 }, (_, i) => ({
            ...clone(base),
            id: `r${i}`,
          }));
        },
      ],
      [
        'both',
        'a hostile key',
        as(
          JSON.parse(
            '{"format":"gravitas.course-pack","formatVersion":2,"__proto__":{"x":1},"units":[]}'
          )
        ),
      ],
      ['both', 'an array', as([])],
      ['both', 'null', as(null)],
      ['both', 'a string', as('gravitas.course-pack')],
      // The schema's alone: what the reader leaves to other checks.
      [
        'fine',
        'a pack in English only',
        d => {
          d.locales = ['en'];
          const strip = v => {
            if (Array.isArray(v)) return v.forEach(strip);
            if (v && typeof v === 'object') {
              if (typeof v.en === 'string') {
                delete v.es;
                delete v.esOf;
              }
              Object.values(v).forEach(strip);
            }
          };
          strip(d);
        },
      ],
      [
        'fine',
        'a compatible pack with a lesson unpinned',
        d => {
          d.pinning = 'compatible';
          delete item(d, 'keplers-laws').pin;
        },
      ],
      [
        'fine',
        'a scenario named in English, as a pack made before ids does',
        d => (item(d, 'watch-the-solar-system').scenario = LEGACY_NAMES[0]),
      ],
    ];
    const c = cases.map(([which, label, change]) =>
      typeof change === 'object'
        ? [which, label, () => change]
        : [which, label, change]
    );
    holds(s, INTRO_ASTRONOMY, reads, c);
  });

  test('its tables are the code’s', () => {
    const src = read('js/course/pack.js');
    const literals = (text, re) => [...text.matchAll(re)].map(m => m[1]);
    expect(s.properties.format.const).toBe(CP.FORMAT);
    expect(s.properties.formatVersion.const).toBe(CP.FORMAT_VERSION);
    expect(s.properties.locales.items.enum).toEqual(api.locales);
    expect(s.properties.pinning.enum).toEqual([...CP.PINNING]);
    expect(s.$defs.lesson.enum).toEqual(api.lessons);
    expect(s.$defs.itemScenario.properties.scenario.enum).toEqual([
      ...packApi().scenarios,
      ...LEGACY_NAMES,
    ]);
    expect(s.$defs.itemLesson.properties.path.enum).toEqual([...CP.PATHS]);
    expect(s.$defs.itemReading.properties.access.enum).toEqual([...CP.ACCESS]);
    // One branch for each kind of item, and each has exactly its fields (the
    // common ones and its own).
    const fields = src.match(
      /const PACK_FIELDS = new Set\(\[([\s\S]*?)\]\)/
    )[1];
    expect(Object.keys(s.properties).sort()).toEqual(
      literals(fields, /'([a-zA-Z]+)'/g).sort()
    );
    const common = literals(
      src.match(/const COMMON_ITEM = \[([\s\S]*?)\]/)[1],
      /'([a-zA-Z]+)'/g
    );
    const own = Object.fromEntries(
      [
        ...src
          .match(/const ITEM_FIELDS = \{([\s\S]*?)\n\};/)[1]
          .matchAll(/(\w+): \[([^\]]*)\]/g),
      ].map(m => [m[1], literals(m[2], /'([a-zA-Z]+)'/g)])
    );
    const branches = s.$defs.item.anyOf.map(b => {
      const name = b.$ref.replace('#/$defs/', '');
      return s.$defs[name];
    });
    expect(branches.map(b => b.properties.kind.const).sort()).toEqual(
      [...CP.ITEM_KINDS].sort()
    );
    for (const b of branches) {
      const kind = b.properties.kind.const;
      expect({ kind, fields: Object.keys(b.properties).sort() }).toEqual({
        kind,
        fields: [...common, ...own[kind]].sort(),
      });
      expect(b.additionalProperties).toBe(false);
    }
    // The limits are the code's.
    expect(s.properties.units.maxItems).toBe(CP.MAX_UNITS);
    expect(s.$defs.unit.properties.items.maxItems).toBe(CP.MAX_ITEMS_PER_UNIT);
    expect(s.properties.objectives.maxItems).toBe(CP.MAX_OBJECTIVES);
    expect(s.properties.prerequisites.maxItems).toBe(CP.MAX_PREREQUISITES);
    expect(s.$defs.itemAssignment.properties.steps.maxItems).toBe(
      CP.MAX_ASSIGNMENT_STEPS
    );
    expect(s.$defs.itemLesson.properties.minutes.maximum).toBe(600);
  });
});
