import { describe, test, expect } from '@jest/globals';
import { MANIFEST } from '../js/data/investigations/registry.js';
import {
  NO_FILTERS,
  metaFor,
  tagsOf,
  PROGRESS,
  filterCatalogue,
  fold,
  isFiltered,
  loosening,
  matchesQuery,
  progressBucket,
  subjectsOf,
} from '../js/data/investigations/browse.js';
import {
  CALCULATIONS,
  DEMO_MINUTES,
  LENGTH,
  LENGTHS,
  PERIOD_MINUTES,
  SEQUENCES,
  calculationOf,
  durationMinutes,
  lengthOf,
  resolveSequence,
} from '../js/data/investigations/sequences.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';

/** Nobody has opened anything. */
const unread = () => ({ done: 0, total: 10, started: false });

describe('the filters are generated from the catalogue', () => {
  test('every subject offered is a subject some lesson declares', () => {
    const declared = new Set(MANIFEST.flatMap(inv => tagsOf(inv)));
    const offered = subjectsOf(MANIFEST);
    expect(offered.length).toBe(declared.size);
    offered.forEach(({ tag, count }) => {
      expect(declared.has(tag)).toBe(true);
      // The count on the menu is the number of lessons behind it, so a reader
      // never picks a subject and lands on an empty grid.
      expect(count).toBe(
        MANIFEST.filter(inv => tagsOf(inv).includes(tag)).length
      );
      expect(count).toBeGreaterThan(0);
    });
  });

  test('every subject has a name in both languages', () => {
    subjectsOf(MANIFEST).forEach(({ tag }) => {
      expect(typeof EN_DEFERRED[`inv.tag.${tag}`]).toBe('string');
      expect(typeof ES_DEFERRED[`inv.tag.${tag}`]).toBe('string');
    });
  });

  test('every lesson lands in exactly one bucket of each kind', () => {
    MANIFEST.forEach(inv => {
      expect(LENGTHS).toContain(lengthOf(inv));
      expect(CALCULATIONS).toContain(calculationOf(inv));
      expect(tagsOf(inv).length).toBeGreaterThan(0);
    });
  });

  test('every bucket a menu offers has at least one lesson in it', () => {
    // A menu option that can only ever produce an empty result is worse than
    // no option: it reads as a promise the catalogue does not keep.
    LENGTHS.forEach(value =>
      expect(
        filterCatalogue(MANIFEST, { length: value }, unread).length
      ).toBeGreaterThan(0)
    );
    CALCULATIONS.forEach(value =>
      expect(
        filterCatalogue(MANIFEST, { calculation: value }, unread).length
      ).toBeGreaterThan(0)
    );
  });
});

describe('how long a lesson takes is read off the lesson', () => {
  test('the upper end of the range is the number used', () => {
    expect(durationMinutes('35-45 min')).toBe(45);
    expect(durationMinutes('20 min')).toBe(20);
    expect(durationMinutes('')).toBe(null);
    expect(durationMinutes(undefined)).toBe(null);
  });

  test('the buckets follow the thresholds, not a stored label', () => {
    expect(lengthOf({ duration: `${DEMO_MINUTES} min` })).toBe(LENGTH.DEMO);
    expect(lengthOf({ duration: `${DEMO_MINUTES + 1} min` })).toBe(
      LENGTH.PERIOD
    );
    expect(lengthOf({ duration: `${PERIOD_MINUTES} min` })).toBe(LENGTH.PERIOD);
    expect(lengthOf({ duration: `${PERIOD_MINUTES + 1} min` })).toBe(
      LENGTH.LONG
    );
    // An unreadable duration is treated as long, so an unknown lesson is never
    // advertised as a demonstration.
    expect(lengthOf({ duration: 'a while' })).toBe(LENGTH.LONG);
  });

  test('no lesson longer than a demonstration is called one', () => {
    MANIFEST.filter(inv => lengthOf(inv) === LENGTH.DEMO).forEach(inv =>
      expect(durationMinutes(inv.duration)).toBeLessThanOrEqual(DEMO_MINUTES)
    );
  });

  test('calculation counts numeric steps rather than judging difficulty', () => {
    // Read off the generated metadata by id, so this is the real count for a
    // real lesson rather than a number invented by the test.
    expect(metaFor('orbital-energy').numericCount).toBe(0);
    expect(calculationOf({ id: 'orbital-energy' })).toBe('none');
    expect(metaFor('keplers-laws').numericCount).toBe(2);
    expect(calculationOf({ id: 'keplers-laws' })).toBe('some');
    expect(metaFor('hohmann-transfer').numericCount).toBe(6);
    expect(calculationOf({ id: 'hohmann-transfer' })).toBe('lots');
    // A lesson the generator has never seen filters as no arithmetic rather
    // than throwing in the middle of the grid.
    expect(metaFor('not-a-lesson')).toEqual({ tags: [], numericCount: 0 });
    expect(calculationOf({ id: 'not-a-lesson' })).toBe('none');
  });
});

describe('search', () => {
  test('accents and case are folded away', () => {
    expect(fold('Energía Órbital')).toBe('energia orbital');
    expect(matchesQuery({ title: 'Energía orbital' }, 'energia')).toBe(true);
    expect(matchesQuery({ title: 'Energía orbital' }, 'ENERGÍA')).toBe(true);
  });

  test('all the words have to appear, in any order', () => {
    const entry = { id: 'transit-photometry', title: 'Transit photometry' };
    expect(matchesQuery(entry, 'photometry transit')).toBe(true);
    expect(matchesQuery(entry, 'transit exoplanets')).toBe(true);
    expect(matchesQuery(entry, 'transit spectroscopy')).toBe(false);
    expect(matchesQuery(entry, '   ')).toBe(true);
  });

  test('the tags are searchable even though they are not printed on a card', () => {
    const hits = filterCatalogue(MANIFEST, { query: 'spaceflight' }, unread);
    expect(hits.map(row => row.entry.id).sort()).toEqual(
      MANIFEST.filter(inv => tagsOf(inv).includes('spaceflight'))
        .map(inv => inv.id)
        .sort()
    );
  });
});

describe('filtering', () => {
  test('an empty filter set is the whole catalogue, in catalogue order', () => {
    const rows = filterCatalogue(MANIFEST, NO_FILTERS, unread);
    expect(rows.map(row => row.entry.id)).toEqual(MANIFEST.map(inv => inv.id));
    expect(isFiltered(NO_FILTERS)).toBe(false);
    expect(isFiltered({ ...NO_FILTERS, query: 'x' })).toBe(true);
    expect(isFiltered({ ...NO_FILTERS, subject: 'orbits' })).toBe(true);
  });

  test('filters compose: each one only narrows', () => {
    const subject = filterCatalogue(MANIFEST, { subject: 'orbits' }, unread);
    const both = filterCatalogue(
      MANIFEST,
      { subject: 'orbits', length: LENGTH.DEMO },
      unread
    );
    expect(both.length).toBeLessThanOrEqual(subject.length);
    both.forEach(row => {
      expect(tagsOf(row.entry)).toContain('orbits');
      expect(row.length).toBe(LENGTH.DEMO);
    });
  });

  test('progress buckets follow saved progress', () => {
    expect(progressBucket({ started: false, done: 0, total: 5 })).toBe(
      PROGRESS.NEW
    );
    expect(progressBucket({ started: true, done: 2, total: 5 })).toBe(
      PROGRESS.GOING
    );
    expect(progressBucket({ started: true, done: 5, total: 5 })).toBe(
      PROGRESS.DONE
    );

    const first = MANIFEST[0].id;
    const progressOf = id =>
      id === first
        ? { started: true, done: 5, total: 5 }
        : { started: false, done: 0, total: 5 };
    const done = filterCatalogue(
      MANIFEST,
      { progress: PROGRESS.DONE },
      progressOf
    );
    expect(done.map(row => row.entry.id)).toEqual([first]);
    expect(
      filterCatalogue(MANIFEST, { progress: PROGRESS.NEW }, progressOf).length
    ).toBe(MANIFEST.length - 1);
  });

  test('an impossible combination names the filter worth dropping', () => {
    // No galaxies lesson is short enough for a demonstration, and the empty
    // panel has to say which of the two choices is the obstacle.
    const filters = { subject: 'galaxies', length: LENGTH.DEMO };
    expect(filterCatalogue(MANIFEST, filters, unread)).toHaveLength(0);
    const relax = loosening(MANIFEST, filters, unread);
    expect(relax.key).toBe('subject');
    expect(relax.count).toBe(
      filterCatalogue(MANIFEST, { length: LENGTH.DEMO }, unread).length
    );
  });

  test('a single filter that found nothing has nothing to suggest', () => {
    expect(loosening(MANIFEST, { query: 'zzzz' }, unread)).toBe(null);
  });
});

describe('the curated sequences', () => {
  test('every lesson named exists in the catalogue', () => {
    const ids = new Set(MANIFEST.map(inv => inv.id));
    SEQUENCES.forEach(sequence => {
      expect(sequence.lessons.length).toBeGreaterThan(1);
      sequence.lessons.forEach(step => expect(ids.has(step.id)).toBe(true));
      // A sequence naming the same lesson twice would number it twice.
      const named = sequence.lessons.map(step => step.id);
      expect(new Set(named).size).toBe(named.length);
    });
  });

  test('a prerequisite always comes earlier in the same sequence', () => {
    SEQUENCES.forEach(sequence => {
      const seen = new Set();
      sequence.lessons.forEach(step => {
        (step.needs || []).forEach(id => expect(seen.has(id)).toBe(true));
        seen.add(step.id);
      });
    });
  });

  test('every line of prose has a message id in both languages', () => {
    SEQUENCES.forEach(sequence => {
      [sequence.titleId, sequence.blurbId].forEach(id => {
        expect(typeof EN_DEFERRED[id]).toBe('string');
        expect(typeof ES_DEFERRED[id]).toBe('string');
      });
      sequence.lessons.forEach(step => {
        expect(typeof EN_DEFERRED[step.whyId]).toBe('string');
        expect(typeof ES_DEFERRED[step.whyId]).toBe('string');
      });
    });
  });

  test('resolving carries the derived fit rather than an authored one', () => {
    SEQUENCES.forEach(sequence => {
      resolveSequence(sequence, MANIFEST).forEach(step => {
        expect(step.fit).toBe(lengthOf(step.entry));
        expect(LENGTHS).toContain(step.fit);
        // No sequence entry may declare a fit of its own; that is the whole
        // guard against a seventy-minute lesson being sold as a demo.
        expect(sequence.lessons.some(l => 'fit' in l)).toBe(false);
      });
    });
  });

  test('a lesson dropped from the catalogue shortens a sequence rather than breaking it', () => {
    const [sequence] = SEQUENCES;
    const gone = sequence.lessons[0].id;
    const trimmed = MANIFEST.filter(inv => inv.id !== gone);
    const steps = resolveSequence(sequence, trimmed);
    expect(steps.map(step => step.id)).not.toContain(gone);
    expect(steps.length).toBe(sequence.lessons.length - 1);
    // And no surviving step still points at the lesson that went.
    steps.forEach(step => expect(step.needs).not.toContain(gone));
  });

  test('the sequences between them reach most of the catalogue', () => {
    const covered = new Set(
      SEQUENCES.flatMap(sequence => sequence.lessons.map(step => step.id))
    );
    expect(covered.size).toBeGreaterThanOrEqual(10);
  });
});
