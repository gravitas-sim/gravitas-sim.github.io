#!/usr/bin/env node
// =============================================================================
// The Library: one index of everything a student or instructor can open
// -----------------------------------------------------------------------------
//   node tools/build-library.mjs           write library/library.json, the
//                                          coverage table in LIBRARY.md and
//                                          Home's Library cards
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = rel => import(pathToFileURL(path.join(ROOT, rel)).href);

export const OUT = 'library/library.json';
export const DOC = 'LIBRARY.md';
export { FORMAT, FORMAT_VERSION } from '../js/library/format.js';
import { FORMAT, FORMAT_VERSION } from '../js/library/format.js';

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
  scenario: ['sandbox'],
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

/** The fields the coverage table counts, as the prompt names them. */
export const COVERED = Object.freeze([
  'summary',
  'level',
  'duration',
  'mathematics',
  'calculation',
  'subjects',
  'prerequisites',
  'thumbnail',
]);

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
    steps: e.steps ?? null,
    thumbnail: e.thumbnail ?? null,
    route: e.route,
  };
}

/**
 * Build the Library from its sources.
 * @returns {Promise<object>} A gravitas.library/1 document
 */
export async function buildLibrary() {
  const { MANIFEST } = await load('js/data/investigations/manifest.js');
  const { MANIFEST: MANIFEST_ES } = await load(
    'js/data/investigations/manifest.es.js'
  );
  const { BROWSE_META } = await load('js/data/investigations/browseData.js');
  const { DISCOVERY } = await load('js/data/investigations/discovery.js');
  const {
    SEQUENCES,
    LENGTH,
    lengthOf,
    calculationOf,
    DEMO_MINUTES,
    PERIOD_MINUTES,
  } = await load('js/data/investigations/sequences.js');
  const { INVESTIGATIONS } = await load('js/data/investigations.js');
  const { EN } = await load('js/i18n/en.js');
  const { ES } = await load('js/i18n/es.js');
  const { EN_DEFERRED } = await load('js/i18n/en.deferred.js');
  const { ES_DEFERRED } = await load('js/i18n/es.deferred.js');

  /** The bucket a number of minutes falls in: lengthOf's rule. */
  const lengthFor = d =>
    !d
      ? null
      : d.max <= DEMO_MINUTES
        ? LENGTH.DEMO
        : d.max <= PERIOD_MINUTES
          ? LENGTH.PERIOD
          : LENGTH.LONG;
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
        length: lengthOf(m),
        mathematics: d?.mathematics,
        calculation: calculationOf(m),
        subjects: BROWSE_META[m.id]?.tags,
        prerequisites: (d?.prerequisites || []).map(p => `investigation:${p}`),
        steps: m.stepCount,
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
  for (const set of guideSets) {
    const { GUIDES } = await load(set.file);
    const en = Object.values(await load(set.catalog[0]))[0];
    const esCat = Object.values(await load(set.catalog[1]))[0];
    const ids = [];
    for (const g of GUIDES) {
      const minutes = Object.values(g.minutes || {});
      const duration = minutes.length
        ? { min: Math.min(...minutes), max: Math.max(...minutes) }
        : null;
      const id = `investigation:${g.id}`;
      ids.push(id);
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
          subjects: g.tags,
          steps: g.steps.length,
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
  const { encodeTagged } = await load('js/shareState.js');
  const { parseSeed, formatSeed } = await load('js/rng.js');
  const seed = formatSeed(parseSeed(SCENARIO_SEED));
  for (const [key, info] of Object.entries(SCENARIO_INFO)) {
    const subjects = info.tags.map(tag => {
      const s = SCENARIO_SUBJECTS[tag];
      if (!s) throw new Error(`scenario tag "${tag}" has no Library subject`);
      return s;
    });
    entries.push(
      entry({
        id: `scenario:${slug(key)}`,
        kind: 'scenario',
        format: 'sandbox',
        source: 'js/data/scenarioInfo.js',
        title: words(EN, ES, `scenario.${key}.title`),
        summary: words(EN, ES, `scenario.${key}.summary`),
        subjects,
        thumbnail: info.thumbnail,
        route: `/#${await encodeTagged('', 1, { v: 1, s: key, seed })}`,
      })
    );
  }

  // --- Datasets ----------------------------------------------------------------
  const { FIXTURES } = await load('js/observatory/fixtures.js');
  const { EN_OBSERVATORY } = await load('js/i18n/en.observatory.js');
  const { ES_OBSERVATORY } = await load('js/i18n/es.observatory.js');
  for (const f of FIXTURES) {
    entries.push(
      entry({
        id: `dataset:${f.id}`,
        kind: 'dataset',
        format: 'observation',
        source: 'js/observatory/fixtures.js',
        title: words(EN_OBSERVATORY, ES_OBSERVATORY, `obs.fixture.${f.id}`),
        subjects: f.tags,
        route: `/observatory/?open=${f.id}`,
      })
    );
  }
  const catalog = JSON.parse(
    readFileSync(path.join(ROOT, 'catalog/catalog.json'), 'utf8')
  );
  const fromCatalog = (e, kind, format) =>
    entry({
      id: `${kind}:${e.id}`,
      kind,
      format,
      source: 'catalog/catalog.json',
      title: both(e.title.en, e.title.es),
      summary: e.summary ? both(e.summary.en, e.summary.es) : null,
      route: '/catalog/',
    });
  for (const e of catalog.entries.filter(x => x.type === 'data-pack'))
    entries.push(fromCatalog(e, 'dataset', 'data-pack'));

  // --- Courses -----------------------------------------------------------------
  const { BUILTIN_COURSES } = await load('js/data/courses/index.js');
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
    const levels = sorted(named.map(l => DISCOVERY[l]?.audience));
    entries.push(
      entry({
        id: `course:${id}`,
        kind: 'course',
        format: 'course',
        source: 'js/data/courses/index.js',
        title: both(pack.title.en, pack.title.es),
        summary: both(pack.summary.en, pack.summary.es),
        // The level its lessons share, when they share one.
        level: levels.length === 1 ? levels[0] : null,
        duration,
        length: lengthFor(duration),
        subjects: named.flatMap(l => BROWSE_META[l]?.tags || []),
        steps: items.length,
        route: `/course/?course=${id}`,
      })
    );
  }
  for (const e of catalog.entries.filter(x => x.type === 'course-pack'))
    entries.push(fromCatalog(e, 'course', 'course-pack'));

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

  // --- The vocabularies --------------------------------------------------------
  const subjects = sorted(entries.flatMap(e => e.subjects || [])).map(id => ({
    id,
    label: words(EN_DEFERRED, ES_DEFERRED, `inv.tag.${id}`),
    count: entries.filter(e => e.subjects?.includes(id)).length,
  }));

  const sequences = SEQUENCES.map(s => ({
    id: s.id,
    title: words(EN_DEFERRED, ES_DEFERRED, s.titleId),
    blurb: words(EN_DEFERRED, ES_DEFERRED, s.blurbId),
    entries: s.lessons.map(l => `investigation:${l.id}`),
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

  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    kinds: [...KINDS],
    subjects,
    sequences,
    entries,
  };
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
const HOME_START = '<!-- library:home -->';
const HOME_END = '<!-- /library:home -->';
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
 * Home's "In the Library" cards: one per kind, with how many there are and
 * the first two of them, each a link into the Library narrowed to that kind.
 * Static markup in Home's fragment, so Home costs no JavaScript for it.
 */
export async function renderHome(library) {
  const { EN_LIBRARY } = await load('js/i18n/en.library.js');
  const { ES_LIBRARY } = await load('js/i18n/es.library.js');
  const cards = library.kinds.map(kind => {
    const of = library.entries.filter(e => e.kind === kind);
    const label = {
      en: `${EN_LIBRARY[`lib.kind.${kind}`]} (${of.length})`,
      es: `${ES_LIBRARY[`lib.kind.${kind}`]} (${of.length})`,
    };
    const first = of.slice(0, 2);
    const note = {
      en: first.map(e => e.title.en).join(' · '),
      es: first.map(e => e.title.es).join(' · '),
    };
    return `<a class="wel-link" href="/library/?kind=${kind}"><span class="wel-link-label">${bilingual(label)}</span><span class="wel-link-note">${bilingual(note)}</span></a>`;
  });
  return `<div class="wel-links">\n${cards.join('\n')}\n</div>`;
}

/** Home's fragment with its Library cards rewritten. */
export function withHome(doc, cards) {
  const a = doc.indexOf(HOME_START);
  const b = doc.indexOf(HOME_END);
  if (a < 0 || b < a) throw new Error(`${HOME} has no ${HOME_START} block`);
  return `${doc.slice(0, a + HOME_START.length)}\n${cards}\n${doc.slice(b)}`;
}

async function main() {
  const check = process.argv.includes('--check');
  const library = await buildLibrary();
  const outputs = [
    [OUT, renderJson(library)],
    [DOC, withCoverage(readFileSync(path.join(ROOT, DOC), 'utf8'), library)],
    [
      HOME,
      withHome(
        readFileSync(path.join(ROOT, HOME), 'utf8'),
        await renderHome(library)
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
