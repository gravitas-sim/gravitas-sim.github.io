// =============================================================================
// gravitas.course-manifest/1: a course, as a machine reads it
// -----------------------------------------------------------------------------
// The pack (./pack.js) is what an instructor edits; the manifest is what it
// resolves to in one build of Gravitas: every item with what it opens, its
// pin and how that pin stands, its time, where it works offline, its license,
// its languages and its links; the dependency graph; the time each path takes;
// and what is still for the instructor to do. Written beside the pack by the
// builder, for a repository, a learning platform's import script or an
// archive to read without running Gravitas.
//
// Pure: the builder passes the links it made (./links.js).
// =============================================================================

import { itemsOf } from './pack.js';
import {
  auditCourse,
  dependencyGraph,
  estimate,
  offlineOf,
  reviewItem,
} from './review.js';

export const MANIFEST_FORMAT = 'gravitas.course-manifest';
export const MANIFEST_FORMAT_VERSION = 1;

const LICENSE_WORDS = {
  'public-domain': 'public domain',
  'cc-by-4.0': 'CC BY 4.0',
  'no-license-stated': 'no license stated',
};

/** The license an item's content is under, in words. */
export function licenseOf(item, facts) {
  switch (item.kind) {
    case 'lesson':
    case 'assignment':
      return 'CC BY 4.0 (Gravitas teaching material)';
    case 'scenario':
      return 'MIT (Gravitas software)';
    case 'dataset': {
      const l = facts.datasets.get(item.dataset)?.license;
      return l ? LICENSE_WORDS[l] || l : null;
    }
    case 'reading':
      return item.license || null;
  }
  return null;
}

/** What an item opens, by kind. */
const refOf = item =>
  item.kind === 'lesson' || item.kind === 'assignment'
    ? { lesson: item.lesson, ...(item.steps ? { steps: item.steps } : {}) }
    : item.kind === 'scenario'
      ? { scenario: item.scenario, seed: item.seed }
      : item.kind === 'dataset'
        ? { dataset: item.dataset }
        : {
            reading: {
              ...item.cite,
              ...(item.access ? { access: item.access } : {}),
            },
          };

/**
 * @param {object} pack - A valid /2 pack
 * @param {object} facts - ./api.js courseFacts()
 * @param {{links: Map<string, object>, course: ?string}} made - each item's
 *   href per locale, and the course home link
 */
export function courseManifest(pack, facts, { links, course }) {
  const time = estimate(pack, facts);
  const items = itemsOf(pack).map(({ item, unit }) => {
    const v = reviewItem(item, facts, pack.pinning);
    const lesson = item.lesson && facts.lessons.get(item.lesson);
    return {
      id: item.id,
      unit: unit.id,
      kind: item.kind,
      path: item.path || 'core',
      opens: refOf(item),
      minutes: time.items.get(item.id),
      objectives: item.objectives || [],
      needs: item.needs || [],
      ...(item.pin ? { pin: item.pin } : {}),
      status: v.status,
      needsReview: v.needsReview,
      offline: offlineOf(item, facts),
      license: licenseOf(item, facts),
      locales: lesson ? lesson.locales : [...pack.locales],
      links: links.get(item.id) || {},
    };
  });
  const findings = auditCourse(pack, facts);
  return {
    format: MANIFEST_FORMAT,
    formatVersion: MANIFEST_FORMAT_VERSION,
    course: {
      id: pack.id,
      version: pack.version,
      title: pack.title,
      locales: pack.locales,
      pinning: pack.pinning,
      gravitas: pack.gravitas,
      ...(course ? { home: course } : {}),
    },
    platform: facts.platform,
    minutes: time.paths,
    items,
    dependencies: dependencyGraph(pack, facts),
    // What an instructor still has to do, or decide, before the course runs.
    remaining: findings
      .filter(f => f.level !== 'error')
      .map(({ level, code, path, vars }) => ({ level, code, path, ...vars })),
  };
}
