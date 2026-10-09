// =============================================================================
// What a course pack is checked against: this build of Gravitas
// -----------------------------------------------------------------------------
// ./pack.js and ./review.js are pure. This gathers what they read, for the
// builder and the tests:
//
//   courseApi()      the languages, lessons, scenarios and datasets a pack may
//                    name, for the format's reference checks;
//   courseFacts()    every lesson a pack names, loaded (and every investigation
//                    pack it carries, when the page gives it ./packItems.js's
//                    openedPack to open them with) (its steps' hashes and
//                    digest, its package, its languages, what its steps use,
//                    whether it has an instructor guide), with the sequences
//                    Gravitas puts lessons in and the datasets' licenses.
//
// Lessons are loaded through the registry, the way the lesson engine loads
// them, only for the ones the pack names.
// =============================================================================

import { MANIFEST } from '../data/investigations/manifest.js';
import { MANIFEST as MANIFEST_ES } from '../data/investigations/manifest.es.js';
import { SEQUENCES } from '../data/investigations/sequences.js';
import { SCENARIO_INFO, scenarioId } from '../data/scenarioInfo.js';
import { PLATFORM_API } from '../platform/catalog.generated.js';
import { satisfies } from '../platform/semver.js';
import { lessonProvider } from '../assignments/provider.js';
import {
  assignmentIdFor,
  resolveSelection,
  shortHash,
} from '../assignments/assignment.js';
import { stepFingerprint } from '../investigations/progressBackup.js';
import { DATASETS, GUIDED } from './datasets.js';
import { itemsOf, lessonKeyOf } from './pack.js';
import { lessonDigest, minutesRange } from './review.js';

export { PLATFORM_API };
export const LOCALES = Object.freeze(['en', 'es']);

/** The lessons a course may name, with their card. */
export const LESSONS = MANIFEST;
const SPANISH = new Map(MANIFEST_ES.map(m => [m.id, m]));

/**
 * The datasets a course may name: the Observatory's built-in observations,
 * and the catalog's data packs when the catalog was read (`catalog`).
 * @param {object} [catalog] - catalog/catalog.json, parsed
 * @returns {Map<string, object>}
 */
export function datasetsOf(catalog) {
  const out = new Map();
  for (const d of DATASETS)
    out.set(d.id, {
      id: d.id,
      source: 'builtin',
      title: d.title,
      license: d.license,
      offline: 'precache',
      compatible: true,
    });
  for (const e of catalog?.entries || []) {
    if (e.type !== 'data-pack') continue;
    out.set(e.id, {
      id: e.id,
      source: 'catalog',
      title: e.title,
      version: e.version,
      license: (e.licenses || []).map(l => l.license).join('; ') || null,
      offline: 'install',
      gravitas: e.gravitas,
      compatible: satisfies(PLATFORM_API, e.gravitas || '*'),
    });
  }
  return out;
}

/** The lists ./pack.js checks references against. */
export function courseApi(catalog) {
  return {
    locales: [...LOCALES],
    lessons: MANIFEST.map(m => m.id),
    scenarios: Object.keys(SCENARIO_INFO),
    scenarioId,
    datasets: [...datasetsOf(catalog).keys()],
  };
}

/**
 * One lesson's facts, from the lesson as loaded.
 * @param {object} lesson - The merged English lesson
 */
export function lessonFacts(lesson) {
  const steps = lesson.steps || [];
  const pairs = steps.map(s => [s.sid, shortHash(stepFingerprint(s))]);
  const meta = MANIFEST.find(m => m.id === lesson.id);
  const es = SPANISH.get(lesson.id);
  const uses = { scenarios: new Set(), widgets: new Set() };
  for (const s of steps) {
    // By id: a lesson written before ids names its scenario in English, and
    // keeps that key because its steps' fingerprints are made from it.
    if (s.setup?.scenario)
      uses.scenarios.add(scenarioId(s.setup.scenario) ?? s.setup.scenario);
    if (s.tool?.id) uses.widgets.add(s.tool.id);
  }
  return {
    id: lesson.id,
    title: { en: meta?.title || lesson.title, ...(es ? { es: es.title } : {}) },
    duration: minutesRange(meta?.duration || lesson.duration),
    n: steps.length,
    fp: lessonDigest(pairs),
    hashes: new Map(pairs),
    sids: steps.map(s => s.sid),
    steps: steps.map(s => ({
      sid: s.sid,
      type: s.type,
      title: s.title || '',
      scenario: scenarioId(s.setup?.scenario) ?? s.setup?.scenario ?? null,
    })),
    pkg: lessonProvider(lesson.id),
    locales: es ? ['en', 'es'] : ['en'],
    uses: {
      scenarios: [...uses.scenarios],
      widgets: [...uses.widgets],
    },
    guide: GUIDED.includes(lesson.id),
    resolve: sids => resolveSelection(lesson, sids),
  };
}

/**
 * Everything ./review.js reads about a pack, with its lessons loaded.
 *
 * @param {object} pack - A /2 pack (only its lesson ids are read)
 * @param {{load: Function, catalog?: object}} opts - load(id) resolves to the
 *   merged English lesson (the registry's loadInvestigation)
 * @returns {Promise<object>}
 */
export async function courseFacts(
  pack,
  { load, catalog, known = new Map(), openPack = null }
) {
  const ids = new Set();
  for (const { item } of itemsOf(pack)) if (item?.lesson) ids.add(item.lesson);
  const have = new Set(MANIFEST.map(m => m.id));
  const lessons = new Map();
  // One at a time: a course names a handful, and Jest's module linker loses
  // a module several dynamic imports reach at once.
  for (const id of ids) {
    if (!have.has(id)) continue;
    if (!known.has(id)) known.set(id, lessonFacts(await load(id)));
    lessons.set(id, known.get(id));
  }

  // An investigation pack travels in its item as a link. Opening one needs
  // the lesson engine's checks (./packItems.js), which the builder's route has
  // no room for: a page that has them hands `openPack` in, and a pack nobody
  // opened is `unchecked` (./review.js), not missing.
  const unchecked = new Set();
  for (const { item } of itemsOf(pack)) {
    if (item?.kind !== 'pack') continue;
    const key = lessonKeyOf(item);
    if (!openPack) {
      unchecked.add(key);
      continue;
    }
    // Cached by link: the same id and version can name another pack.
    if (known.get(key)?.link !== item.link) {
      const got = await openPack(item);
      known.set(key, {
        link: item.link,
        ...(got.ok ? lessonFacts(got.lesson) : { failed: got.reason }),
      });
    }
    if (!known.get(key).failed) lessons.set(key, known.get(key));
  }

  return {
    platform: PLATFORM_API,
    locales: [...LOCALES],
    lessons,
    unchecked,
    scenarios: new Map(Object.keys(SCENARIO_INFO).map(k => [k, {}])),
    scenarioId,
    datasets: datasetsOf(catalog),
    sequences: SEQUENCES,
  };
}

/** A new assignment id for an item, as js/assignments/assignment.js makes one. */
export const newAssignmentId = (item, now = new Date()) =>
  assignmentIdFor(
    {
      lesson: item.lesson,
      sids: item.steps,
      title: item.title?.en || '',
    },
    now
  );
