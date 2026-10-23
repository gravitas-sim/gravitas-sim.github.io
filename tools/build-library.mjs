#!/usr/bin/env node
// =============================================================================
// The Library: one index of everything a student or instructor can open
// -----------------------------------------------------------------------------
//   node tools/build-library.mjs           write library/library.json, the
//                                          coverage table in LIBRARY.md and
//                                          Home's first-week start
//   node tools/build-library.mjs --check   fail when either is not what this writes
//
// Roadmap II Prompt 54 (LIBRARY.md). Every entry is read from the source that
// already owns the thing it describes, and nothing here is written by hand
// except how those sources map onto one record:
//
//   investigations  the lesson manifest (both languages), browseData.js,
//                   discovery.js and the four sets of guides: the
//                   Observatory's two suites, the 3-D lab's and the mission
//                   lab's
//   activities      js/data/activities.js, a classroom format cut from a lesson
//   scenarios       js/data/scenarioInfo.js and the scenario catalogs
//   datasets        the Observatory's fixtures and the catalog's data packs
//   courses         the built-in course packs and the catalog's course packs
//   experiments     the scenarios the experiment runner can sweep
//
// A field a source does not declare is null (or, for a list, absent from the
// source and so null), never guessed, and the coverage table counts them per
// kind: that table is what Prompt 76 starts from.
//
// The lesson browser inside the application filters with the same functions
// the Library page does (js/data/investigations/browse.js), and its lessons
// are the Library's investigations of format "lesson", in the same order with
// the same subjects, length and calculation; tests/library.test.js holds the
// two to that.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildRelations, problems } from './build-relations.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = rel => import(pathToFileURL(path.join(ROOT, rel)).href);

export const OUT = 'library/library.json';
export const SEARCH_OUT = 'library/search-index.json';
export const DOC = 'LIBRARY.md';
export { FORMAT, FORMAT_VERSION } from '../js/library/format.js';
import { FORMAT, FORMAT_VERSION } from '../js/library/format.js';
import {
  BAND_LENGTH,
  bandOfMinutes,
  lessonBand,
} from '../js/data/instructorTimeBands.js';

/** The nouns of PLATFORM_MODEL.md the Library holds, in the order it offers them. */
export const KINDS = Object.freeze([
  'investigation',
  'activity',
  'scenario',
  'dataset',
  'course',
  'experiment',
]);

/**
 * How each kind is delivered: the surface that runs it, or the classroom
 * format it is cut to.
 */
export const FORMATS = Object.freeze({
  investigation: ['lesson', 'observatory', 'lab3d', 'mission'],
  activity: ['demonstration', 'route', 'guided', 'lab'],
  scenario: ['sandbox', 'system3d'],
  dataset: ['observation', 'data-pack'],
  course: ['course', 'course-pack'],
  experiment: ['sweep'],
});

/** Who it is written for: discovery.js's audiences. */
export const LEVELS = Object.freeze(['beginner', 'intro']);

/** What it asks a student to work out: discovery.js's vocabulary. */
export const MATHEMATICS = Object.freeze([
  'none',
  'arithmetic',
  'algebra',
  'logarithms',
]);

/** The courses an investigation is tagged for (Prompt 76). */
export const COURSE_LEVELS = Object.freeze(['survey', 'majors', 'upper']);

/** The fields the coverage table counts, as the prompt names them. */
export const COVERED = Object.freeze([
  'summary',
  'level',
  'duration',
  'mathematics',
  'calculation',
  'subjects',
  'prerequisites',
  'textbook',
  'courseLevel',
  'thumbnail',
]);

/** What tools/library-curation.json holds: what no source file owns. */
export const CURATION = 'tools/library-curation.json';

/**
 * The scenario gallery's concept tags, as the lessons' subjects.
 *
 * Two vocabularies grew up separately: the gallery's answers "what could I
 * teach with this?" (js/data/scenarioTags.js), the lessons' "what is this
 * about?" (browseData.js). The Library's subject filter is one list, so each
 * gallery tag is read as the lesson subject it means. A new gallery tag fails
 * the build here until it is given one.
 */
export const SCENARIO_SUBJECTS = Object.freeze({
  'orbits-kepler': 'orbits',
  'solar-system': 'solar-system',
  exoplanets: 'exoplanets',
  detection: 'observing',
  habitability: 'habitability',
  'binary-systems': 'stars',
  tides: 'gravity',
  chaos: 'chaos',
  'stellar-evolution': 'stellar-evolution',
  'compact-objects': 'compact-objects',
  relativity: 'waves',
  'galaxies-clusters': 'galaxies',
  'dark-matter': 'galaxies',
  resonance: 'resonance',
});

/** The seed every scenario link names, so a Library link is one world. */
export const SCENARIO_SEED = 'library';

/**
 * A world link in its uncompressed form ("1r", which js/shareState.js reads
 * exactly as it reads "1z"). The application's encodeTagged() deflates when
 * that is shorter, and deflate's bytes are zlib's to choose: Node 20 and
 * Node 24 compress the same payload differently, so an index written with it
 * is fresh on one and stale on the other. These payloads are a scenario key
 * and a seed, where deflate saves a few characters at most.
 */
export const rawWorldLink = payload =>
  `1r${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;

const sorted = list => [...new Set(list)].sort();
const both = (en, es) => ({ en, es: es ?? en });
const words = (en, es, key) => {
  if (en[key] === undefined) throw new Error(`no message "${key}"`);
  return both(en[key], es[key]);
};
const slug = s =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * A duration as minutes, from the lessons' "35-45 min" or a number.
 * @returns {?{min: number, max: number}}
 */
export function durationOf(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return { min: value.min, max: value.max };
  const n = String(value).match(/\d+/g)?.map(Number);
  if (!n?.length) return null;
  return { min: Math.min(...n), max: Math.max(...n) };
}

/**
 * The record, with every field in one order, so a card, a filter and the
 * schema can rely on each being there.
 */
function entry(e) {
  return {
    id: e.id,
    kind: e.kind,
    format: e.format,
    source: e.source,
    title: e.title,
    summary: e.summary ?? null,
    level: e.level ?? null,
    duration: e.duration ?? null,
    length: e.length ?? null,
    mathematics: e.mathematics ?? null,
    calculation: e.calculation ?? null,
    subjects: e.subjects?.length ? sorted(e.subjects) : null,
    prerequisites: e.prerequisites ?? null,
    textbook: e.textbook ?? null,
    courseLevel: e.courseLevel ?? null,
    steps: e.steps ?? null,
    ...(e.depths ? { depths: e.depths } : {}),
    thumbnail: e.thumbnail ?? null,
    route: e.route,
    // A built-in course's units, for /my-work/'s per-unit progress.
    ...(e.units ? { units: e.units } : {}),
  };
}

/**
 * Build the Library from its sources.
 * @returns {Promise<object>} A gravitas.library/1 document
 */
export async function buildLibrary() {
  const cards = (await load('js/data/investigations/manifest.js')).MANIFEST;
  const cardsEs = (await load('js/data/investigations/manifest.es.js'))
    .MANIFEST;
  const { SUMMARIES } = await load('js/data/investigations/summaries.js');
  const { SUMMARIES_ES } = await load('js/data/investigations/summaries.es.js');
  // Cards carry no summary; each one is read from its own file, once.
  const MANIFEST = cards.map(m => ({ ...m, summary: SUMMARIES[m.id] }));
  const MANIFEST_ES = cardsEs.map(m => ({
    ...m,
    summary: SUMMARIES_ES[m.id],
  }));
  const { BROWSE_META } = await load('js/data/investigations/browseData.js');
  const { DISCOVERY } = await load('js/data/investigations/discovery.js');
  const { SEQUENCES, lengthOf, calculationOf } = await load(
    'js/data/investigations/sequences.js'
  );
  const { SEQUENCE_ALIASES } = await load('js/data/sequenceAliases.js');
  const { INVESTIGATIONS } = await load('js/data/investigations.js');
  const curation = JSON.parse(readFileSync(path.join(ROOT, CURATION), 'utf8'));
  const usedCuration = new Set();
  /** A curated record, once; the file is held to naming only what exists. */
  const curated = (section, id) => {
    const rec = curation[section]?.[id];
    if (!rec) throw new Error(`${CURATION}: no ${section} record for "${id}"`);
    usedCuration.add(`${section}/${id}`);
    return rec;
  };
  const top = (values, vocabulary) =>
    values.length
      ? vocabulary[Math.max(...values.map(v => vocabulary.indexOf(v)))]
      : null;
  const { EN } = await load('js/i18n/en.js');
  const { ES } = await load('js/i18n/es.js');
  const { EN_DEFERRED } = await load('js/i18n/en.deferred.js');
  const { ES_DEFERRED } = await load('js/i18n/es.deferred.js');

  /**
   * The length facet reads the editorial band table (Prompt 174,
   * js/data/instructorTimeBands.js): a lesson's band at its default depth, and
   * the band of an upper bound for everything that declares minutes.
   */
  const lengthFor = d => (!d ? null : BAND_LENGTH[bandOfMinutes(d.max)]);
  /**
   * calculationOf's rule (sequences.js), for a count of numbers to work out:
   * that one reads a lesson's count from browseData.js by its id.
   */
  const bucket = n => (!n ? 'none' : n >= 4 ? 'lots' : 'some');

  const es = new Map(MANIFEST_ES.map(m => [m.id, m]));
  const lessons = new Map(INVESTIGATIONS.map(l => [l.id, l]));
  const entries = [];

  // --- Investigations: lessons ------------------------------------------------
  for (const m of MANIFEST) {
    const e = es.get(m.id) || m;
    const d = DISCOVERY[m.id];
    entries.push(
      entry({
        id: `investigation:${m.id}`,
        kind: 'investigation',
        format: 'lesson',
        source: 'js/data/investigations/manifest.js',
        title: both(m.title, e.title),
        summary: both(m.summary, e.summary),
        level: d?.audience,
        duration: durationOf(m.duration),
        length: BAND_LENGTH[lessonBand(m.id)] ?? lengthOf(m),
        mathematics: d?.mathematics,
        calculation: calculationOf(m),
        subjects: BROWSE_META[m.id]?.tags,
        prerequisites: (d?.prerequisites || []).map(p => `investigation:${p}`),
        textbook: d?.textbook,
        courseLevel: d?.courseLevel,
        steps: m.stepCount,
        ...(m.depths ? { depths: m.depths } : {}),
        thumbnail: m.thumbnail,
        route: `/#investigation=${m.id}`,
      })
    );
  }

  // --- Investigations: the guided investigations of the other surfaces --------
  const guideSets = [
    {
      format: 'observatory',
      file: 'js/observatory/guides/exoplanet.js',
      catalog: ['js/i18n/en.exoplanet.js', 'js/i18n/es.exoplanet.js'],
      route: '/observatory/',
    },
    {
      format: 'observatory',
      file: 'js/observatory/guides/populations.js',
      catalog: ['js/i18n/en.populations.js', 'js/i18n/es.populations.js'],
      route: '/observatory/',
    },
    {
      format: 'lab3d',
      file: 'js/lab3d/guides/curriculum.js',
      catalog: ['js/i18n/en.lab3dGuides.js', 'js/i18n/es.lab3dGuides.js'],
      route: '/3d/',
    },
    {
      format: 'mission',
      file: 'js/mission/lab/curriculum.js',
      catalog: [
        'js/i18n/en.missionLabGuides.js',
        'js/i18n/es.missionLabGuides.js',
      ],
      route: '/mission/lab/',
    },
  ];
  const guideSeries = [];
  /** What an entry is built on, for tools/build-relations.mjs. */
  const uses = new Map();
  for (const set of guideSets) {
    const { GUIDES } = await load(set.file);
    const en = Object.values(await load(set.catalog[0]))[0];
    const esCat = Object.values(await load(set.catalog[1]))[0];
    const ids = [];
    const { TARGETS } =
      set.format === 'observatory' ? await load(set.file) : {};
    for (const g of GUIDES) {
      const minutes = Object.values(g.minutes || {});
      const duration = minutes.length
        ? { min: Math.min(...minutes), max: Math.max(...minutes) }
        : null;
      const id = `investigation:${g.id}`;
      const c = curated('guides', g.id);
      ids.push(id);
      if (TARGETS) {
        const opened = new Set(
          g.steps.map(st => st.go?.open ?? st.check?.target).filter(Boolean)
        );
        const data = [...opened].flatMap(t => {
          const target = TARGETS[t];
          if (!target) return [];
          const name = /^installed:([^@]+)@/.exec(target.observation)?.[1];
          return [
            name ? `dataset:community.${name}` : `dataset:${target.fixture}`,
          ];
        });
        uses.set(id, [...new Set(data)].sort());
      }
      entries.push(
        entry({
          id,
          kind: 'investigation',
          format: set.format,
          source: set.file,
          title: words(en, esCat, `gd.${g.id}.title`),
          summary: words(en, esCat, `gd.${g.id}.summary`),
          level: g.level,
          duration,
          length: lengthFor(duration),
          calculation: bucket(g.steps.filter(s => s.kind === 'answer').length),
          mathematics: c.mathematics,
          prerequisites: c.prerequisites,
          textbook: c.textbook,
          courseLevel: c.courseLevel,
          subjects: g.tags,
          steps: g.steps.length,
          ...(g.depths ? { depths: g.depths.length } : {}),
          route: `${set.route}?guide=${g.id}`,
        })
      );
    }
    guideSeries.push({ file: set.file, ids });
  }

  // --- Activities --------------------------------------------------------------
  const { ACTIVITIES } = await load('js/data/activities.js');
  const { EN_ACTIVITIES } = await load('js/i18n/en.activities.js');
  const { ES_ACTIVITIES } = await load('js/i18n/es.activities.js');
  for (const a of ACTIVITIES) {
    const lesson = lessons.get(a.lesson);
    const manifest = MANIFEST.find(m => m.id === a.lesson);
    for (const f of a.formats) {
      const title = words(EN_ACTIVITIES, ES_ACTIVITIES, a.titleId);
      const name = words(EN_ACTIVITIES, ES_ACTIVITIES, f.nameId);
      const chosen = new Set(f.steps);
      const numeric = (lesson?.steps || []).filter(
        s => chosen.has(s.sid) && s.kind === 'numeric'
      ).length;
      const duration = { min: f.minutes, max: f.minutes };
      entries.push(
        entry({
          id: `activity:${a.id}/${f.id}`,
          kind: 'activity',
          format: f.id,
          source: 'js/data/activities.js',
          title: {
            en: `${title.en} (${name.en})`,
            es: `${title.es} (${name.es})`,
          },
          summary: words(EN_ACTIVITIES, ES_ACTIVITIES, a.questionId),
          // A cut of the lesson: who it is for, and what it is about, are the
          // lesson's.
          level: DISCOVERY[a.lesson]?.audience,
          duration,
          length: lengthFor(duration),
          calculation: bucket(numeric),
          // The investigation's own, which a cut of it can only go below.
          mathematics: DISCOVERY[a.lesson]?.mathematics,
          prerequisites: (DISCOVERY[a.lesson]?.prerequisites || []).map(
            p => `investigation:${p}`
          ),
          textbook: DISCOVERY[a.lesson]?.textbook,
          courseLevel: DISCOVERY[a.lesson]?.courseLevel,
          subjects: BROWSE_META[a.lesson]?.tags,
          steps: f.steps.length,
          thumbnail: manifest?.thumbnail,
          route: `/?activity=${a.id}&format=${f.id}#activity=${a.id}/${f.id}`,
        })
      );
    }
  }

  // --- Scenarios ---------------------------------------------------------------
  const { SCENARIO_INFO } = await load('js/data/scenarioInfo.js');
  const { parseSeed, formatSeed } = await load('js/rng.js');
  const seed = formatSeed(parseSeed(SCENARIO_SEED));
  for (const [key, info] of Object.entries(SCENARIO_INFO)) {
    const subjects = info.tags.map(tag => {
      const s = SCENARIO_SUBJECTS[tag];
      if (!s) throw new Error(`scenario tag "${tag}" has no Library subject`);
      return s;
    });
    const open = curation.scenarioDefaults;
    entries.push(
      entry({
        id: `scenario:${slug(key)}`,
        kind: 'scenario',
        format: 'sandbox',
        source: 'js/data/scenarioInfo.js',
        title: words(EN, ES, `scenario.${key}.title`),
        summary: words(EN, ES, `scenario.${key}.summary`),
        // A world is open-ended: it asks nothing to be worked out, and a
        // student needs no other investigation first. It is as advanced as
        // the most advanced subject it is about.
        level: top(
          subjects.map(sub => {
            const level = curation.scenarioLevelBySubject[sub];
            if (!level)
              throw new Error(`${CURATION}: subject "${sub}" has no level`);
            return level;
          }),
          LEVELS
        ),
        duration: open.duration,
        length: lengthFor(open.duration),
        mathematics: open.mathematics,
        calculation: 'none',
        prerequisites: open.prerequisites,
        subjects,
        thumbnail: info.thumbnail,
        route: `/#${rawWorldLink({ v: 1, s: key, seed })}`,
      })
    );
  }

  // --- The 3-D lab's reference systems (Prompt 105) -----------------------------
  const { REFERENCES } = await load('js/lab3d/references.js');
  const { EN_LAB3DLAB } = await load('js/i18n/en.lab3dLab.js');
  const { ES_LAB3DLAB } = await load('js/i18n/es.lab3dLab.js');
  for (const r of REFERENCES) {
    const c = curated('systems3d', r.id);
    const open = curation.scenarioDefaults;
    entries.push(
      entry({
        id: `scenario:3d-${slug(r.id)}`,
        kind: 'scenario',
        format: 'system3d',
        source: 'js/lab3d/references.js',
        title: words(EN_LAB3DLAB, ES_LAB3DLAB, `l3.ref.${r.id}`),
        summary: c.summary,
        level: 'intro',
        duration: open.duration,
        length: lengthFor(open.duration),
        mathematics: open.mathematics,
        calculation: 'none',
        prerequisites: open.prerequisites,
        subjects: c.subjects,
        route: `/3d/?system=${r.id}`,
      })
    );
  }

  // --- Datasets ----------------------------------------------------------------
  const { FIXTURES } = await load('js/observatory/fixtures.js');
  const { EN_OBSERVATORY } = await load('js/i18n/en.observatory.js');
  const { ES_OBSERVATORY } = await load('js/i18n/es.observatory.js');
  /** A dataset's curated fields: what working with it asks of a student. */
  const datasetFields = id => {
    const c = curated('datasets', id);
    return {
      summary: c.summary,
      level: c.level,
      duration: c.duration,
      length: lengthFor(c.duration),
      mathematics: c.mathematics,
      calculation: c.mathematics === 'none' ? 'none' : 'some',
      prerequisites: c.prerequisites,
      ...(c.subjects ? { subjects: c.subjects } : {}),
    };
  };
  for (const f of FIXTURES) {
    entries.push(
      entry({
        id: `dataset:${f.id}`,
        kind: 'dataset',
        format: 'observation',
        source: 'js/observatory/fixtures.js',
        title: words(EN_OBSERVATORY, ES_OBSERVATORY, `obs.fixture.${f.id}`),
        ...datasetFields(f.id),
        subjects: f.tags,
        route: `/observatory/?open=${f.id}`,
      })
    );
  }
  const catalog = JSON.parse(
    readFileSync(path.join(ROOT, 'catalog/catalog.json'), 'utf8')
  );
  const fromCatalog = (e, kind, format, more = {}) =>
    entry({
      id: `${kind}:${e.id}`,
      kind,
      format,
      source: 'catalog/catalog.json',
      title: both(e.title.en, e.title.es),
      summary: e.summary ? both(e.summary.en, e.summary.es) : null,
      ...more,
      route: '/catalog/',
    });
  for (const e of catalog.entries.filter(x => x.type === 'data-pack'))
    entries.push(fromCatalog(e, 'dataset', 'data-pack', datasetFields(e.id)));

  // --- Courses -----------------------------------------------------------------
  const { BUILTIN_COURSES } = await load('js/data/courses/index.js');
  const sum = list => list.reduce((a, b) => a + b, 0);
  /**
   * A course, from the investigations it names: as advanced, as mathematical
   * and as calculating as the most of them, and starting from nothing, since a
   * course is the order its investigations were put in.
   */
  const MATH_ORDER = MATHEMATICS;
  const CALC_ORDER = ['none', 'some', 'lots'];
  const courseEntry = (
    id,
    format,
    source,
    pack,
    named,
    duration,
    units,
    count,
    route,
    more = {}
  ) =>
    entry({
      id,
      kind: 'course',
      format,
      source,
      title: both(pack.title.en, pack.title.es),
      summary: both(pack.summary.en, pack.summary.es),
      level: top(sorted(named.map(l => DISCOVERY[l]?.audience)), LEVELS),
      duration,
      length: lengthFor(duration),
      mathematics: top(
        sorted(named.map(l => DISCOVERY[l]?.mathematics)),
        MATH_ORDER
      ),
      calculation: top(
        sorted(named.map(l => bucket(BROWSE_META[l]?.numericCount))),
        CALC_ORDER
      ),
      subjects: named.flatMap(l => BROWSE_META[l]?.tags || []),
      prerequisites: [],
      // A pack's own declaration wins over the highest level it names.
      courseLevel:
        pack.courseLevel ??
        top(sorted(named.map(l => DISCOVERY[l]?.courseLevel)), COURSE_LEVELS),
      steps: count,
      ...(units ? { units } : {}),
      ...more,
      route,
    });
  for (const [id, loader] of Object.entries(BUILTIN_COURSES)) {
    const pack = await loader();
    const items = pack.units.flatMap(u => u.items);
    const named = items.filter(i => i.lesson).map(i => i.lesson);
    // Its length is its items': a reading's minutes, or the lesson's own.
    let min = 0;
    let max = 0;
    for (const i of items) {
      const d = i.minutes
        ? { min: i.minutes, max: i.minutes }
        : i.lesson
          ? durationOf(MANIFEST.find(m => m.id === i.lesson)?.duration)
          : null;
      min += d?.min || 0;
      max += d?.max || 0;
    }
    const duration = max ? { min, max } : null;
    entries.push(
      courseEntry(
        `course:${id}`,
        'course',
        'js/data/courses/index.js',
        pack,
        named,
        duration,
        pack.units.map(u => ({
          title: both(u.title.en, u.title.es),
          lessons: u.items.filter(i => i.lesson).map(i => i.lesson),
        })),
        items.length,
        `/course/?course=${id}`
      )
    );
  }
  for (const e of catalog.entries.filter(x => x.type === 'course-pack')) {
    // The pack's own course file, from the extension it was built from.
    const pack = JSON.parse(
      readFileSync(
        path.join(ROOT, e.source, e.provides.courses[0].file),
        'utf8'
      )
    );
    const named = pack.units.flatMap(u => u.lessons.map(l => l.lesson));
    const d = named.map(l =>
      durationOf(MANIFEST.find(m => m.id === l)?.duration)
    );
    const duration = d.every(Boolean)
      ? { min: sum(d.map(x => x.min)), max: sum(d.map(x => x.max)) }
      : null;
    entries.push(
      courseEntry(
        `course:${e.id}`,
        'course-pack',
        'catalog/catalog.json',
        pack,
        named,
        duration,
        null,
        named.length,
        '/catalog/',
        {
          summary: both(e.summary.en, e.summary.es),
        }
      )
    );
  }

  // --- Experiments -------------------------------------------------------------
  const { SWEEPABLE } = await load('js/experiments/sweep.js');
  const { EN_EXPERIMENTS } = await load('js/i18n/en.experiments.js');
  const { ES_EXPERIMENTS } = await load('js/i18n/es.experiments.js');
  for (const [key, spec] of Object.entries(SWEEPABLE)) {
    const info = SCENARIO_INFO[key];
    const params = spec.parameters.map(p =>
      words(EN_DEFERRED, ES_DEFERRED, p.labelKey)
    );
    entries.push(
      entry({
        id: `experiment:${slug(key)}`,
        kind: 'experiment',
        format: 'sweep',
        source: 'js/experiments/sweep.js',
        title: words(
          EN_EXPERIMENTS,
          ES_EXPERIMENTS,
          `exp.scenario.${slug(key)}`
        ),
        ...(() => {
          const c = curated('experiments', slug(key));
          return {
            level: c.level,
            duration: c.duration,
            length: lengthFor(c.duration),
            mathematics: c.mathematics,
            calculation: 'some',
            prerequisites: c.prerequisites,
          };
        })(),
        // What it varies, in the runner's own words.
        summary: {
          en: params.map(p => p.en).join(' · '),
          es: params.map(p => p.es).join(' · '),
        },
        subjects: info?.tags.map(tag => SCENARIO_SUBJECTS[tag]),
        thumbnail: info?.thumbnail,
        route: '/experiments/',
      })
    );
  }

  for (const [section, records] of Object.entries(curation)) {
    if (!['datasets', 'experiments', 'guides'].includes(section)) continue;
    for (const id of Object.keys(records))
      if (!usedCuration.has(`${section}/${id}`))
        throw new Error(`${CURATION}: ${section}/${id} names nothing`);
  }

  // --- The vocabularies --------------------------------------------------------
  const blurbs = curation.topics?.blurbs ?? {};
  const subjects = sorted(entries.flatMap(e => e.subjects || [])).map(id => {
    const blurb = blurbs[id];
    if (!blurb?.en || !blurb?.es)
      throw new Error(
        `${CURATION}: topics.blurbs has no paragraph for "${id}"`
      );
    return {
      id,
      label: words(EN_DEFERRED, ES_DEFERRED, `inv.tag.${id}`),
      blurb,
      count: entries.filter(e => e.subjects?.includes(id)).length,
    };
  });
  for (const id of Object.keys(blurbs))
    if (!subjects.some(s => s.id === id))
      throw new Error(`${CURATION}: topics.blurbs/${id} names no subject`);

  const sequences = SEQUENCES.map(s => ({
    id: s.id,
    title: words(EN_DEFERRED, ES_DEFERRED, s.titleId),
    blurb: words(EN_DEFERRED, ES_DEFERRED, s.blurbId),
    entries: s.lessons.map(l => `investigation:${l.id}`),
    depths: s.lessons.map(l => l.depth),
    after: s.after,
  }));
  // The Observatory's suites are sequences too: each says to work through
  // its guides in order.
  const { EN_GUIDES } = await load('js/i18n/en.guides.js');
  const { ES_GUIDES } = await load('js/i18n/es.guides.js');
  const { EN_EXOPLANET } = await load('js/i18n/en.exoplanet.js');
  const { ES_EXOPLANET } = await load('js/i18n/es.exoplanet.js');
  const { EN_POPULATIONS } = await load('js/i18n/en.populations.js');
  const { ES_POPULATIONS } = await load('js/i18n/es.populations.js');
  const intro = {
    exoplanet: [EN_EXOPLANET, ES_EXOPLANET],
    populations: [EN_POPULATIONS, ES_POPULATIONS],
  };
  for (const [suite, file] of [
    ['exoplanet', 'js/observatory/guides/exoplanet.js'],
    ['populations', 'js/observatory/guides/populations.js'],
  ]) {
    sequences.push({
      id: `observatory-${suite}`,
      title: words(EN_GUIDES, ES_GUIDES, `gd.suite.${suite}`),
      blurb: words(...intro[suite], `gd.suite.${suite}.intro`),
      entries: guideSeries.find(g => g.file === file).ids,
    });
  }

  // --- What a student sees, and where to begin (Prompt 163) -------------------
  const { kinds: shown } = JSON.parse(
    readFileSync(path.join(ROOT, 'tools/navigation-inventory.json'), 'utf8')
  );
  const kindShown = Object.fromEntries(
    KINDS.map(k => [k, shown.internal[k] ?? k])
  );
  for (const k of Object.values(kindShown))
    if (!shown.students.includes(k))
      throw new Error(
        `tools/navigation-inventory.json: "${k}" is not a kind students see`
      );
  const have = new Set(entries.map(e => e.id));
  // The scenarios a lesson's steps open: what the lesson is built on.
  for (const [id, lesson] of lessons) {
    const opened = lesson.steps
      .map(st => st.setup?.scenario)
      .filter(Boolean)
      .map(key => `scenario:${slug(key.replace(/['’]/g, ''))}`)
      .filter(sid => have.has(sid));
    if (opened.length)
      uses.set(`investigation:${id}`, [...new Set(opened)].sort());
  }
  // Each start whose entries a collection can hold is also written as one
  // (Prompt 164): a course package with profile `collection`, checked by the
  // package's own validator, and what the page draws the start from. A start
  // that names a course has no collection: a course is not an item of one.
  const { itemOfEntry } = await load('js/library/collections.js');
  const { validateCoursePack } = await load('js/course/pack.js');
  const { courseApi } = await load('js/course/api.js');
  const { shortHash } = await load('js/assignments/assignment.js');
  const { PLATFORM_API } = await load('js/platform/catalog.generated.js');
  const byId = new Map(entries.map(e => [e.id, e]));
  const textOf = (en, es) => ({ en, es, esOf: shortHash(en) });
  const starts = (curation.starts?.groups ?? []).map(g => {
    for (const id of g.entries)
      if (!have.has(id))
        throw new Error(
          `${CURATION}: starts/${g.id} names ${id}, which is not in the Library`
        );
    const start = {
      id: g.id,
      level: g.level,
      audience: g.audience,
      entries: g.entries,
    };
    const items = g.entries.map(id => itemOfEntry(byId.get(id)));
    if (items.every(Boolean)) {
      const collection = {
        format: 'gravitas.course-pack',
        formatVersion: 2,
        id: `start-${g.id}`,
        version: '1.0.0',
        gravitas: PLATFORM_API,
        locales: ['en', 'es'],
        pinning: 'compatible',
        profile: 'collection',
        title: textOf(g.audience.en, g.audience.es),
        units: [{ id: 'start', title: textOf('Start', 'Inicio'), items }],
      };
      const bad = validateCoursePack(collection, courseApi());
      if (bad.length)
        throw new Error(
          `${CURATION}: starts/${g.id} is not a collection: ${bad
            .map(e => `${e.path} ${e.code}`)
            .join('; ')}`
        );
      start.collection = collection;
    }
    return start;
  });
  const { firstWeek } = JSON.parse(
    readFileSync(path.join(ROOT, 'tools/navigation-inventory.json'), 'utf8')
  );
  const listed = new Set(starts.flatMap(g => g.entries));
  for (const start of firstWeek.starts)
    if (start.entry && !listed.has(start.entry))
      throw new Error(
        `Home's first-week start ${start.entry} is in no Library start (${CURATION})`
      );

  // What the entry is built on: measured observations or the simulation. A
  // lesson or a course is not filed under either: it can use both.
  const dataOf = e =>
    e.kind === 'dataset'
      ? curation.datasets?.[e.id.replace(/^dataset:/, '')]?.kind === 'model'
        ? 'synthetic'
        : 'authentic'
      : e.format === 'observatory'
        ? 'authentic'
        : e.kind === 'scenario' || e.kind === 'experiment'
          ? 'synthetic'
          : null;
  for (const e of entries) {
    const data = dataOf(e);
    if (data) e.data = data;
  }

  const library = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    kinds: [...KINDS],
    kindShown,
    subjects,
    starts,
    sequences,
    // Old sequence ids a stored link may still carry, to the current id.
    sequenceAliases: { ...SEQUENCE_ALIASES },
    entries,
  };
  // The relations (tools/build-relations.mjs) are derived from the rest.
  const relations = buildRelations(library, { uses });
  for (const e of entries) e.rel = relations.get(e.id);
  const bad = problems(library);
  if (bad.length) throw new Error(`relations:\n  ${bad.join('\n  ')}`);
  return library;
}

/**
 * What the search reads that the index does not carry: each lesson's learning
 * objectives, in both languages (the Spanish from the lesson's shadow file).
 * A separate file, fetched on the first search, so the page's first view
 * does not pay for words only a search looks at.
 * @param {object} library - The built library
 * @returns {Promise<object>} A gravitas.library-search/1 document
 */
export async function buildSearchIndex(library) {
  const { INVESTIGATIONS } = await load('js/data/investigations.js');
  const objectives = {};
  for (const e of library.entries) {
    if (e.kind !== 'investigation' || e.format !== 'lesson') continue;
    const id = e.id.replace(/^investigation:/, '');
    const lesson = INVESTIGATIONS.find(l => l.id === id);
    const en = lesson?.objectives ?? [];
    if (!en.length) continue;
    const shadow = (await load(`js/data/investigations/es/${id}.js`)).default;
    // Arrays line up by index with the English; a null keeps the English.
    objectives[e.id] = {
      en,
      es: en.map((line, i) => shadow.objectives?.[i] ?? line),
    };
  }
  return { format: 'gravitas.library-search', formatVersion: 1, objectives };
}

/** The search index, one lesson a line. */
export function renderSearchIndex(index) {
  const rows = Object.entries(index.objectives).map(
    ([id, words]) => `    ${JSON.stringify(id)}: ${JSON.stringify(words)}`
  );
  return `{\n  "format": ${JSON.stringify(index.format)},\n  "formatVersion": ${index.formatVersion},\n  "objectives": {\n${rows.join(',\n')}\n  }\n}\n`;
}

/**
 * How many entries of each kind carry each field.
 * @param {object} library - A gravitas.library/1 document
 * @returns {Array<{kind: string, total: number, has: Object<string, number>}>}
 */
export function coverage(library) {
  return KINDS.map(kind => {
    const of = library.entries.filter(e => e.kind === kind);
    const has = {};
    for (const field of COVERED)
      has[field] = of.filter(e => e[field] !== null).length;
    return { kind, total: of.length, has };
  });
}

/** The coverage table, as LIBRARY.md carries it. */
export function renderCoverage(library) {
  const rows = coverage(library);
  const head = `| Kind | Entries | ${COVERED.join(' | ')} |`;
  const rule = `|---|---:|${COVERED.map(() => '---:').join('|')}|`;
  const body = rows.map(
    r =>
      `| ${r.kind} | ${r.total} | ${COVERED.map(f =>
        r.has[f] === r.total ? 'all' : r.has[f] === 0 ? '**none**' : r.has[f]
      ).join(' | ')} |`
  );
  return [head, rule, ...body].join('\n');
}

/**
 * The file: one line per subject, sequence and entry, so a diff names what
 * changed and the file stays about half the size an indented one would be.
 */
export function renderJson(library) {
  const list = items =>
    `[\n${items.map(i => `    ${JSON.stringify(i)}`).join(',\n')}\n  ]`;
  const head = Object.entries(library)
    .map(
      ([k, v]) =>
        `  ${JSON.stringify(k)}: ${Array.isArray(v) && typeof v[0] === 'object' ? list(v) : JSON.stringify(v)}`
    )
    .join(',\n');
  return `{\n${head}\n}\n`;
}

const START = '<!-- library:coverage -->';
const END = '<!-- /library:coverage -->';

/** LIBRARY.md with its coverage block rewritten. */
export function withCoverage(doc, library) {
  const a = doc.indexOf(START);
  const b = doc.indexOf(END);
  if (a < 0 || b < a) throw new Error(`${DOC} has no ${START} block`);
  return `${doc.slice(0, a + START.length)}\n${renderCoverage(library)}\n${doc.slice(b)}`;
}

const HOME = 'js/fragments/home.html';
const HOME_START = '<!-- first-week:home -->';
const HOME_END = '<!-- /first-week:home -->';
const html = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
/** Both languages, as the shell writes them; css/shell.css shows one. */
const bilingual = ({ en, es }) =>
  `<span class="gs-en">${html(en)}</span><span class="gs-es" lang="es">${html(es)}</span>`;

/**
 * Home's recommended start, one per audience (Prompt 162): the committed list
 * in tools/navigation-inventory.json (`firstWeek`), each entry read from the
 * Library so no title or route is restated, and each action a button. A list
 * that names a Library entry that does not exist fails here, not on the page.
 * Static markup in Home's fragment, so Home costs no JavaScript for it.
 */
export function renderHome(library) {
  const { firstWeek } = JSON.parse(
    readFileSync(path.join(ROOT, 'tools/navigation-inventory.json'), 'utf8')
  );
  const items = firstWeek.starts.map(start => {
    const who = `<span class="wel-start-for">${bilingual(start.audience)}</span>`;
    if (start.action)
      return `<li class="wel-start-item">${who}<button type="button" class="ui-button wel-start-go" data-action="${start.action}">${bilingual(start.label)}</button></li>`;
    const entry = library.entries.find(e => e.id === start.entry);
    if (!entry)
      throw new Error(
        `The first-week list names ${start.entry}, which is not in the Library`
      );
    const lesson =
      entry.kind === 'investigation'
        ? ` data-lesson="${html(entry.id.split(':')[1])}"`
        : '';
    return `<li class="wel-start-item">${who}<a class="wel-start-go" href="${html(entry.route)}"${lesson}>${bilingual(entry.title)}</a></li>`;
  });
  return `<ul class="wel-start">\n${items.join('\n')}\n</ul>`;
}

/** Home's fragment with its first-week block rewritten. */
export function withHome(doc, block) {
  const a = doc.indexOf(HOME_START);
  const b = doc.indexOf(HOME_END);
  if (a < 0 || b < a) throw new Error(`${HOME} has no ${HOME_START} block`);
  return `${doc.slice(0, a + HOME_START.length)}\n${block}\n${doc.slice(b)}`;
}

async function main() {
  const check = process.argv.includes('--check');
  const library = await buildLibrary();
  const outputs = [
    [OUT, renderJson(library)],
    [SEARCH_OUT, renderSearchIndex(await buildSearchIndex(library))],
    [DOC, withCoverage(readFileSync(path.join(ROOT, DOC), 'utf8'), library)],
    [
      HOME,
      withHome(
        readFileSync(path.join(ROOT, HOME), 'utf8'),
        renderHome(library)
      ),
    ],
  ];
  let stale = 0;
  for (const [file, text] of outputs) {
    const full = path.join(ROOT, file);
    let current = null;
    try {
      current = readFileSync(full, 'utf8');
    } catch {
      /* missing: stale */
    }
    if (current === text) {
      console.log(`  unchanged  ${file}`);
      continue;
    }
    if (check) {
      console.error(`  STALE      ${file}: run node tools/build-library.mjs`);
      stale++;
    } else {
      writeFileSync(full, text);
      console.log(`  wrote      ${file}`);
    }
  }
  if (check && stale) process.exitCode = 1;
  else
    console.log(
      `${library.entries.length} entries: ${coverage(library)
        .map(r => `${r.total} ${r.kind}`)
        .join(', ')}`
    );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  await main();
