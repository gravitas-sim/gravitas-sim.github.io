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
//   scenario     a world link (#1z...): the scenario and its seed word, as
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
} from '../shareState.js';
import {
  ASSIGNMENT_KIND,
  ASSIGNMENT_SCHEMA,
  ASSIGNMENT_TAG,
} from '../assignments/assignment.js';
import { formatSeed, parseSeed } from '../rng.js';
import { FORMAT_VERSION } from './pack.js';

export { COMFORTABLE_URL_LENGTH };
/** Where the builder leaves the draft the course home previews (?draft=1). */
export const PREVIEW_KEY = 'gravitas_course_preview';
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
    v: ASSIGNMENT_SCHEMA,
    i: item.assignment.id,
    l: item.lesson,
    t: text(item.title, locale),
    n: text(item.intro, locale),
    s: [...item.steps],
    ...(item.pin?.f ? { f: [...item.pin.f] } : {}),
    c: item.assignment.created,
    ...(item.pin?.pkg ? { p: [...item.pin.pkg] } : {}),
  };
}

/** The world payload a scenario item makes: the scenario at its seed. */
export const scenarioPayload = item => ({
  v: 1,
  s: item.scenario,
  seed: formatSeed(parseSeed(item.seed)),
  ...(item.paused ? { p: 1 } : {}),
});

/**
 * An item's link, in one language.
 * @returns {Promise<{href: string, kind: string}|null>} kind: 'app', 'data',
 *   'catalog' (install first) or 'external'
 */
export async function itemLink(item, { root, locale = 'en' }) {
  switch (item.kind) {
    case 'lesson':
      return {
        href: `${root}#investigation=${encodeURIComponent(item.lesson)}`,
        kind: 'app',
      };
    case 'assignment':
      return {
        href: `${root}#${await encodeTagged(ASSIGNMENT_TAG, ASSIGNMENT_SCHEMA, assignmentPayload(item, locale))}`,
        kind: 'app',
      };
    case 'scenario':
      return {
        href: `${root}#${await encodeTagged('', 1, scenarioPayload(item))}`,
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

/** The course home's link for a pack, and whether it is a comfortable length. */
export async function courseLink(pack, { root }) {
  const url = `${root}course/#${await encodeTagged(COURSE_TAG, FORMAT_VERSION, pack)}`;
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
