// =============================================================================
// gravitas.course-pack, as the SDK sees it: /1 and /2
// -----------------------------------------------------------------------------
// /1 belongs to the platform (js/platform/course.js), which the catalog page
// also validates installed courses with: units of lessons, with notes.
// /2 is what the course-pack builder writes (js/course/pack.js,
// COURSE_PACKS.md): items (lessons, assignments, scenarios, datasets and
// readings) with objectives, prerequisites, times, paths, and a pin on every
// lesson it names - the lesson's step digest, its step count and its package
// version - so an archived pack can say what it was made with.
//
// Both are re-exported rather than copied, so the SDK, the catalog, the
// builder and the tests can never disagree about what a pack is. The /1 names
// are the ones this module has always had; /2's carry a 2.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export {
  FORMAT,
  FORMAT_VERSION,
  validateCoursePack,
} from '../../js/platform/course.js';
export {
  FORMAT_VERSION as FORMAT_VERSION_2,
  itemsOf,
  migrateCoursePack,
  validateCoursePack as validateCoursePack2,
} from '../../js/course/pack.js';
export { reviewCoursePack, STATUS } from '../../js/course/review.js';

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

/** The catalog, as the builder reads it, for the data packs a course may name. */
function catalog() {
  try {
    return JSON.parse(
      readFileSync(path.join(REPO, 'catalog', 'catalog.json'), 'utf8')
    );
  } catch {
    return undefined;
  }
}

/**
 * What a /2 pack is checked against: this build's languages, lessons,
 * scenarios and datasets, and the data packs installed beside them.
 * @param {Iterable<string>} [dataPacks] - Installed data-pack ids
 */
export async function courseApi2(dataPacks = []) {
  const { courseApi } = await import('../../js/course/api.js');
  const api = courseApi(catalog());
  return { ...api, datasets: [...new Set([...api.datasets, ...dataPacks])] };
}

/**
 * Each item of a /2 pack against this build: the same, changed, moved or
 * missing, and whether an instructor has to look before sending students to
 * it (js/course/review.js). The pins are what this is about.
 * @param {object} pack - A /2 pack that passed validateCoursePack2
 */
export async function reviewPins(pack) {
  const [{ courseFacts }, { loadInvestigation }, { reviewCoursePack }] =
    await Promise.all([
      import('../../js/course/api.js'),
      import('../../js/data/investigations/registry.js'),
      import('../../js/course/review.js'),
    ]);
  const facts = await courseFacts(pack, {
    load: id => loadInvestigation(id, 'en'),
    catalog: catalog(),
  });
  return reviewCoursePack(pack, facts);
}
