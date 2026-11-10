// =============================================================================
// The first-week record (Roadmap III Prompt 277)
// -----------------------------------------------------------------------------
// A collection marked `firstWeek` (js/course/pack.js) opens as a mode of Home:
// its items in order, the place to continue, and nothing else. Home cannot read
// a package (the reader and the link maker are no part of the sandbox's
// download), so the course home, which already holds both, resolves the
// collection once into the little Home needs and leaves it under one key:
//
//   { v: 1, id, t: {en, es?}, mo?: 'open'|'shut',
//     items: [{ t: {en, es?}, h, l?, d?, n?, o? }] }
//
//   t   a title, in the languages there are
//   h   the item's address on this site, from its root
//   l   the lesson an item opens, d its depth, n how many steps it has: a
//       lesson is done when that many were seen (the lesson's own record)
//   o   1 once an item that is not a lesson was opened from Home
//   mo  what the collection says of More (js/settingsSchema.js moreOpen)
//
// Home (js/welcome.js readWeek) checks every part again before showing it. A
// 2.0.0 build never looks at the key (tests/compat/kinds/first-week-record.mjs).
//
// Lazy and DOM-free, and it imports nothing: the course home hands over what
// it already has, as js/library/collections.js is handed its own.
// =============================================================================

export const FIRST_WEEK_VERSION = 1;

/** The Library entry an item stands for (js/library/format.js entryIdOfItem). */
const entryIdOf = item => {
  const prefix = {
    lesson: 'investigation',
    guide: 'investigation',
    scenario: 'scenario',
    dataset: 'dataset',
  }[item.kind];
  return prefix ? `${prefix}:${item[item.kind]}` : null;
};

/** A text in the languages it has, and nothing else of it. */
const pair = v => ({ en: v.en, ...(v.es ? { es: v.es } : {}) });

/**
 * The record Home keeps for a first-week collection.
 *
 * @param {object} pack - A valid collection with `firstWeek`
 * @param {object} deps
 * @param {(item: object) => Promise<?string>} deps.linkOf - An item's address
 *   from the site's root (`/...`), or null where it has none on this site
 * @param {Array<object>} deps.entries - The Library's entries (library.json)
 * @param {(item: object) => string} deps.nameOf - What to call an item the
 *   Library does not list
 * @param {?object} [deps.had] - The record already kept: an item opened from
 *   Home stays opened when the same collection's link is followed again
 * @returns {Promise<?object>} The record, or null when no item can be opened
 */
export async function weekRecord(pack, { linkOf, entries, nameOf, had }) {
  const byId = new Map(entries.map(e => [e.id, e]));
  const opened = new Set(
    had?.id === pack.id && Array.isArray(had.items)
      ? had.items.filter(i => i?.o === 1).map(i => i.h)
      : []
  );
  const items = [];
  for (const item of pack.units[0].items) {
    const h = await linkOf(item);
    if (!h) continue;
    const entry = byId.get(entryIdOf(item));
    items.push({
      t: pair(item.title ?? entry?.title ?? { en: nameOf(item) }),
      h,
      ...(item.kind === 'lesson'
        ? {
            l: item.lesson,
            ...(item.depth ? { d: item.depth } : {}),
            n: entry?.steps ?? 0,
          }
        : opened.has(h)
          ? { o: 1 }
          : {}),
    });
  }
  return items.length
    ? {
        v: FIRST_WEEK_VERSION,
        id: pack.id,
        t: pair(pack.title),
        ...(pack.more ? { mo: pack.more } : {}),
        items,
      }
    : null;
}
