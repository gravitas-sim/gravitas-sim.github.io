// =============================================================================
// The generated Spanish structured notes (Prompt 170)
// -----------------------------------------------------------------------------
// One page per investigation, made from structured fields and the Spanish that
// exists, never from the guide's prose or a key. These tests hold what the page
// promises: it exists for every investigation, says in its first line that the
// guide prose and the keys are English, lists every step with the marking the
// answer key derives, names the misconceptions the steps name, marks a text
// that has no Spanish rather than passing English off as Spanish, and carries
// the two digests the translation-freshness ledger computes.
// =============================================================================

import { TextDecoder } from 'node:util';

import { describe, test, expect } from '@jest/globals';

import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import { INSTRUCTOR_CONTENT } from '../js/data/instructorContent.js';
import { LABELS } from '../js/data/instructorLabels.js';
import { answerKeyFor, plainText } from '../js/answerKey.js';
import { digest as ledgerDigest } from '../js/composer/compile.js';
import {
  ENGLISH_MARK,
  digest,
  notesModel,
  structuredNotes,
} from '../js/instructorNotes.js';
import { SHADOWS, SHADOW_MARK, spanishLesson } from '../js/instructorLocale.js';

const decode = bytes => new TextDecoder('latin1').decode(bytes);
const lines = pdf =>
  [...decode(pdf).matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g)].map(m =>
    m[1].replace(/\\([()\\])/g, '$1')
  );
const lessonOf = id => INVESTIGATIONS.find(i => i.id === id);
const pages = new Map();
const pageOf = base => {
  if (!pages.has(base.id))
    pages.set(
      base.id,
      lines(structuredNotes(base, { version: 'T', lessonOf }))
    );
  return pages.get(base.id);
};

describe('every investigation has Spanish structured notes', () => {
  test('and the first line says the guide prose and the keys are English', () => {
    for (const base of INVESTIGATIONS) {
      const first = pageOf(base)[0];
      // The kicker is drawn in capitals; compare without case.
      expect(first.toLowerCase()).toContain('notas generadas');
      expect(first.toLowerCase()).toContain('solo están en inglés');
    }
  });

  test('the step list is every step, numbered as in the full key', () => {
    for (const base of INVESTIGATIONS) {
      const full = withAllDepths(base);
      const m = notesModel(base, lessonOf);
      expect(m.steps.map(s => s.sid)).toEqual(full.steps.map(s => s.sid));
      expect(m.steps.map(s => s.n)).toEqual(full.steps.map((_, i) => i + 1));
    }
  });

  test('a marked step is one the key derives a mark for', () => {
    for (const base of INVESTIGATIONS) {
      const key = answerKeyFor(withAllDepths(base));
      const expected = key.entries.filter(
        e =>
          e.category === 'graded' ||
          e.category === 'prediction' ||
          (e.category === 'written' && !e.reflect)
      ).length;
      const m = notesModel(base, lessonOf);
      expect({ id: base.id, marked: m.marked }).toEqual({
        id: base.id,
        marked: expected,
      });
    }
  });

  test('the named misconceptions are exactly the ones the steps name', () => {
    for (const base of INVESTIGATIONS) {
      const expected = withAllDepths(base).steps.flatMap(s =>
        (s.misconceptions ?? []).filter(x => x?.say).map(x => x.id)
      );
      const named = notesModel(base, lessonOf).steps.flatMap(s =>
        s.misconceptions.map(x => x.id)
      );
      expect({ id: base.id, named }).toEqual({ id: base.id, named: expected });
    }
  });

  test('every objective of every investigation is on its page', () => {
    for (const base of INVESTIGATIONS) {
      const m = notesModel(base, lessonOf);
      expect(m.objectives.length).toBe(
        (withAllDepths(base).objectives ?? []).length
      );
      expect(m.objectives.length).toBeGreaterThan(0);
    }
  });

  test('the page holds no guide prose and no key', () => {
    for (const base of INVESTIGATIONS) {
      const text = pageOf(base).join(' ');
      const c = INSTRUCTOR_CONTENT[base.id];
      // A distinctive stretch of the English overview is not on the page.
      expect(text).not.toContain(String(c.overview).slice(0, 48));
      expect(text).not.toMatch(/Correct answer|Respuesta correcta/);
    }
  });
});

describe('what is Spanish and what is not', () => {
  test('every shipped lesson has a shadow, so every text the page prints is counted', () => {
    for (const base of INVESTIGATIONS) {
      expect(SHADOWS[base.id]).toBeTruthy();
      const { status } = notesModel(base, lessonOf);
      expect(status.total).toBeGreaterThan(0);
      expect(status.done).toBeLessThanOrEqual(status.total);
      expect(status.rest).toBe(status.total - status.done);
    }
  });

  test('a lesson with no Spanish prints its English with the marker, and counts none as done', () => {
    const base = { ...lessonOf('orbital-energy'), id: 'no-such-lesson' };
    const m = notesModel(base, lessonOf);
    expect(m.status.done).toBe(0);
    const text = lines(structuredNotes(base, { version: 'T', lessonOf })).join(
      ' '
    );
    expect(text).toContain(ENGLISH_MARK);
    expect(text).toContain(plainText(base.objectives[0]).slice(0, 30));
  });

  test('a text a shadow supplies is Spanish; the mark never reaches the page', () => {
    const marked = spanishLesson(lessonOf('orbital-energy'), true, true);
    expect(marked.title.startsWith(SHADOW_MARK)).toBe(true);
    for (const base of INVESTIGATIONS)
      expect(pageOf(base).join(' ')).not.toContain(SHADOW_MARK);
    // And asking without the mark is the guides' own read, unchanged.
    expect(spanishLesson(lessonOf('orbital-energy')).title).not.toContain(
      SHADOW_MARK
    );
  });
});

describe('the digests are the ledger’s', () => {
  const base = lessonOf('orbital-energy');

  test('they use the freshness ledger’s digest function over the texts printed', () => {
    const m = notesModel(base, lessonOf);
    expect(m.digests.en).toMatch(/^[0-9a-f]{8}$/);
    expect(m.digests.es).toMatch(/^[0-9a-f]{8}$/);
    expect(m.digests.en).not.toBe(m.digests.es);
    expect(digest('x')).toMatch(/^[0-9a-f]{8}$/);
    expect(pageOf(base).join(' ')).toContain(m.digests.en);
    expect(pageOf(base).join(' ')).toContain(m.digests.es);
  });

  test('the digest is the ledger’s function, on every text of every page', () => {
    for (const b of INVESTIGATIONS) {
      const m = notesModel(b, lessonOf);
      for (const t of [
        m.title.text,
        ...m.objectives.map(o => o.text),
        '',
        'ñ¿é',
      ])
        expect(digest(t)).toBe(ledgerDigest(t));
    }
  });

  test('a changed English objective moves the English digest and not the Spanish', () => {
    const before = notesModel(base, lessonOf).digests;
    const edited = {
      ...base,
      objectives: [
        base.objectives[0] + ' (edited)',
        ...base.objectives.slice(1),
      ],
    };
    const after = notesModel(edited, lessonOf).digests;
    expect(after.en).not.toBe(before.en);
    expect(after.es).toBe(before.es);
  });

  test('regenerating is deterministic', () => {
    expect(notesModel(base, lessonOf)).toEqual(notesModel(base, lessonOf));
  });
});

describe('the notes’ own words', () => {
  test('every notes label exists in both languages', () => {
    const keys = Object.keys(LABELS.en).filter(k =>
      /^(notes\.|doc\.notes)/.test(k)
    );
    expect(keys.length).toBeGreaterThan(30);
    for (const k of keys) expect(LABELS.es[k]).toBeDefined();
  });

  test('the Spanish labels say the Spanish is unread', () => {
    expect(LABELS.es['notes.about']).toMatch(
      /Ninguna persona con dominio pleno/
    );
    expect(LABELS.en['notes.about']).toMatch(/Nobody fluent in Spanish/);
  });
});
