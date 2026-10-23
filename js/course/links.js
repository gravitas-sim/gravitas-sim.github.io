// =============================================================================
// A course's links: ordinary ones, and the course home's own
// -----------------------------------------------------------------------------
// Every link is made from the pack and nothing else, so the same pack always
// makes the same links: that is what makes them stable. Nothing is sent
// anywhere, and every link opens on a static site.
//
//   lesson       /#investigation=<id>, the lesson browser's own link
//   assignment   the assignment link the teaching page makes (#a2z...), from
//                the id, date, steps and pins the pack records, so a pack
//                opened a year later makes the link it made then; one per
//                language, since an assignment's title and introduction are
//                one language's words
//   pack         the investigation link the item carries (#i1z...), as the
//                Composer's Publish made it
//   scenario     a world link (#2z...): the scenario and its seed word, as
//                Share writes one, and the figure embed of the same world
//   dataset      /observatory/?open=<id> for a built-in observation, and
//                /observatory/?installed=<id> for a catalog package, which a
//                student installs from /catalog/ first
//   reading      its https address or its DOI
//   course home  /course/#c2z...: the whole pack, compressed, in the fragment
//
// `root` is the site's root, ending in a slash, so a link made in the builder
// and on the course home are the same link.
// =============================================================================

import {
  COMFORTABLE_URL_LENGTH,
  decodeTagged,
  encodeTagged,
  LINK_VERSION,
} from '../shareState.js';
import {
  ASSIGNMENT_KIND,
  assignmentVersion,
  ASSIGNMENT_TAG,
} from '../assignments/assignment.js';
import { formatSeed, parseSeed } from '../rng.js';
import {
  FORMAT_VERSION,
  GUIDE_DEPTHS,
  LEVEL_DEPTH,
  guideRoute,
  packVersion,
  withVersion,
} from './pack.js';
import { KEY_COURSE_PREVIEW } from '../names.js';

export { COMFORTABLE_URL_LENGTH };
/** Where the builder leaves the draft the course home previews (?draft=1). */
export const PREVIEW_KEY = KEY_COURSE_PREVIEW;
/** The tag of a course home fragment: a world starts with a digit, an assignment with 'a'. */
export const COURSE_TAG = 'c';

/** The site root, from a page's own address and how deep the page is. */
export const rootOf = (href, depth) =>
  new URL(`${'../'.repeat(depth)}`, href).href;

const text = (v, locale) => (v && (v[locale] || v.en)) || '';

/** The assignment payload an item makes, as js/assignments/assignment.js builds one. */
export function assignmentPayload(item, locale) {
  return {
    k: ASSIGNMENT_KIND,
    v: item.pin?.pkg || item.depth ? 2 : 1,
    i: item.assignment.id,
    l: item.lesson,
    t: text(item.title, locale),
    n: text(item.intro, locale),
    s: [...item.steps],
    ...(item.pin?.f ? { f: [...item.pin.f] } : {}),
    c: item.assignment.created,
    ...(item.pin?.pkg ? { p: [...item.pin.pkg] } : {}),
    ...(item.depth ? { d: item.depth } : {}),
  };
}

/**
 * The world payload a scenario item makes: the scenario at its seed, as the
 * pack names it - by id, or in English in a pack older than ids, which the
 * link's reader resolves. Resolving it here would cost this page the table.
 */
export const scenarioPayload = item => ({
  v: LINK_VERSION,
  s: item.scenario,
  seed: formatSeed(parseSeed(item.seed)),
  ...(item.paused ? { p: 1 } : {}),
});

/**
 * An item's link, in one language.
 * A lesson with no depth of its own opens at the depth of the course's level
 * (`level`, a pack's courseLevel): core for a survey course, quantitative for
 * majors, advanced for upper-level. An item's own depth wins.
 * @returns {Promise<{href: string, kind: string}|null>} kind: 'app', 'data',
 *   'catalog' (install first) or 'external'
 */
export async function itemLink(item, { root, locale = 'en', level }) {
  switch (item.kind) {
    case 'lesson': {
      const own = item.depth;
      const bound = level && LEVEL_DEPTH[level];
      const depth = own || (bound !== 'core' && bound);
      return {
        href: `${root}#investigation=${encodeURIComponent(item.lesson)}${depth ? `/${depth}` : ''}`,
        kind: 'app',
      };
    }
    case 'pack':
      // The investigation travels in the item as its own link (Prompt 78).
      return { href: `${root}#${item.link}`, kind: 'app' };
    case 'assignment': {
      const a = assignmentPayload(item, locale);
      return {
        href: `${root}#${await encodeTagged(ASSIGNMENT_TAG, assignmentVersion(a), a)}`,
        kind: 'app',
      };
    }
    case 'scenario':
      return {
        href: `${root}#${await encodeTagged('', LINK_VERSION, scenarioPayload(item))}`,
        kind: 'app',
      };
    case 'guide':
      return {
        href: `${root}${guideRoute(item.guide)}?guide=${encodeURIComponent(item.guide)}&path=${GUIDE_DEPTHS[item.depth ?? 'core']}`,
        kind: 'app',
      };
    case 'dataset':
      return item.dataset.includes('.')
        ? {
            href: `${root}observatory/?installed=${encodeURIComponent(item.dataset)}`,
            kind: 'catalog',
          }
        : {
            href: `${root}observatory/?open=${encodeURIComponent(item.dataset)}`,
            kind: 'data',
          };
    case 'reading':
      if (item.cite?.url) return { href: item.cite.url, kind: 'external' };
      if (item.cite?.doi)
        return {
          href: `https://doi.org/${item.cite.doi.split('/').map(encodeURIComponent).join('/')}`,
          kind: 'external',
        };
      return null;
  }
  return null;
}

/**
 * The course home's link for a pack, and whether it is a comfortable length.
 * The prefix is the pack's lowest version (c2, or c3 for a collection, a term
 * or outcomes), so a 2.0.0 course home opens every link it could before.
 */
export async function courseLink(pack, { root }) {
  const url = `${root}course/#${await encodeTagged(COURSE_TAG, packVersion(pack), withVersion(pack))}`;
  return {
    url,
    length: url.length,
    comfortable: url.length <= COMFORTABLE_URL_LENGTH,
    limit: COMFORTABLE_URL_LENGTH,
  };
}

/** The pack a course home fragment holds. Throws 'wrongKind', 'newerVersion' or 'corrupt'. */
export async function readCourseFragment(hash) {
  const { payload } = await decodeTagged(COURSE_TAG, hash, FORMAT_VERSION);
  return payload;
}
