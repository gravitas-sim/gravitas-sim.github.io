// =============================================================================
// The recommended starts are collections (Roadmap III Prompt 164)
// -----------------------------------------------------------------------------
// tools/build-library.mjs writes each start whose entries a collection can hold
// as a course package with profile `collection`, and js/libraryPage.js draws the
// start from it. This holds the written packages to the validator, to the
// entries they stand for and to the link a collection travels by.
// =============================================================================

import { readFileSync } from 'node:fs';
import '../js/library/collectionsDeps.js';
import { describe, expect, test } from '@jest/globals';
import { validateCoursePack } from '../js/course/pack.js';
import { courseApi } from '../js/course/api.js';
import { courseLink, readCourseFragment } from '../js/course/links.js';
import { itemOfEntry, readsAsCollection } from '../js/library/collections.js';
import { entryIdOfItem } from '../js/library/format.js';
import { shortHash } from '../js/assignments/assignment.js';

const library = JSON.parse(readFileSync('library/library.json', 'utf8'));
const byId = new Map(library.entries.map(e => [e.id, e]));

describe('every start a collection can hold is one', () => {
  test('a start has a collection exactly when every entry can be an item', () => {
    for (const start of library.starts) {
      const holdable = start.entries.every(id => itemOfEntry(byId.get(id)));
      expect({ id: start.id, has: 'collection' in start }).toEqual({
        id: start.id,
        has: holdable,
      });
    }
  });

  test('the two that are collections today, and the two that are not, with the reason', () => {
    const have = library.starts.filter(s => s.collection).map(s => s.id);
    expect(have).toEqual(['new', 'course']);
    // measure: an Observatory investigation is not an item of a package;
    // teach: a course is not an item of a course.
    const why = id =>
      library.starts
        .find(s => s.id === id)
        .entries.map(e => byId.get(e).format);
    expect(why('measure')).toContain('observatory');
    expect(why('teach')).toEqual(['course']);
  });

  test('each reads as a collection, passes the package validator and names the entries it was made from', () => {
    for (const start of library.starts.filter(s => s.collection)) {
      const c = start.collection;
      expect(validateCoursePack(c, courseApi())).toEqual([]);
      expect(readsAsCollection(c)).toBe(true);
      expect(c.id).toBe(`start-${start.id}`);
      expect(c.units[0].items.map(entryIdOfItem)).toEqual(start.entries);
      expect(c.title.en).toBe(start.audience.en);
      expect(c.title.es).toBe(start.audience.es);
      expect(c.title.esOf).toBe(shortHash(start.audience.en));
    }
  });

  test('each travels by link and file, and reads back equal', async () => {
    for (const start of library.starts.filter(s => s.collection)) {
      const { url, comfortable } = await courseLink(start.collection, {
        root: 'https://example.test/',
      });
      expect(comfortable).toBe(true);
      expect(await readCourseFragment(url.split('#')[1])).toEqual(
        start.collection
      );
      expect(JSON.parse(JSON.stringify(start.collection))).toEqual(
        start.collection
      );
    }
  });
});
