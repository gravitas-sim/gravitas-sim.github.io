import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS, getInvestigation } from '../js/data/investigations.js';
import {
  INSTRUCTOR_CONTENT,
  instructorContentFor,
} from '../js/data/instructorContent.js';
import {
  answerKeyFor,
  verifyKey,
  gradedEntries,
  questionCounts,
  entryFor,
  plainText,
} from '../js/answerKey.js';
import { checkAnswer, toleranceFor } from '../js/answerCheck.js';
import {
  instructorGuide,
  answerKeyDocument,
  adoptersGuide,
  curriculumMap,
} from '../js/instructorDocs.js';

describe('answer keys are derived, not written', () => {
  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: every derived answer is accepted by the site',
    (id, inv) => {
      // The one guarantee that matters: a key handed to a class agrees with the
      // website that class is using.
      expect(verifyKey(inv)).toEqual([]);
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: one key entry per step, numbered from one',
    (id, inv) => {
      const key = answerKeyFor(inv);
      expect(key.entries).toHaveLength(inv.steps.length);
      expect(key.entries[0].step).toBe(1);
      expect(key.entries.at(-1).step).toBe(inv.steps.length);
      expect(key.title).toBe(inv.title);
      expect(key.duration).toBe(inv.duration);
    }
  );

  test('a multiple-choice entry carries the option list and the right index', () => {
    const inv = getInvestigation('black-holes');
    const step = inv.steps[12]; // step 13, the event-horizon misconception check
    const e = entryFor(step, 12);
    expect(e.category).toBe('graded');
    expect(e.options).toHaveLength(step.options.length);
    expect(e.answerIndex).toBe(step.answer);
    expect(e.answerText).toBe(plainText(step.options[step.answer]));
    expect(checkAnswer(step, e.answerIndex)).toBe(true);
  });

  test('a numeric entry quotes the tolerance the site actually applies', () => {
    for (const inv of INVESTIGATIONS) {
      for (const [i, step] of inv.steps.entries()) {
        if (step.kind !== 'numeric') continue;
        const e = entryFor(step, i);
        expect(e.tolerance).toBe(toleranceFor(step));
        // The stated range is exactly the accepted range, at both ends.
        expect(checkAnswer(step, e.acceptedLow)).toBe(true);
        expect(checkAnswer(step, e.acceptedHigh)).toBe(true);
        expect(
          checkAnswer(step, e.acceptedLow - Math.abs(e.tolerance) * 0.01 - 1e-9)
        ).toBe(false);
      }
    }
  });

  test('markup never reaches the printed page', () => {
    for (const inv of INVESTIGATIONS) {
      const key = answerKeyFor(inv);
      const text = JSON.stringify(key);
      expect(text).not.toMatch(/<strong>|<em>|<sub>|<sup>|\\\\n/);
    }
  });

  test('prediction steps are separated from graded ones', () => {
    // A prediction is recorded but never marked wrong, and a key that presents
    // one as a graded question invites an instructor to grade it.
    const counts = questionCounts(getInvestigation('black-holes'));
    expect(counts.predictions).toBe(5);
    const key = answerKeyFor(getInvestigation('black-holes'));
    for (const e of gradedEntries(key)) {
      expect(['graded', 'prediction']).toContain(e.category);
    }
  });
});

describe('instructor content lines up with the lessons', () => {
  test('every implemented investigation has instructor content', () => {
    for (const inv of INVESTIGATIONS) {
      expect(instructorContentFor(inv.id)).toBeTruthy();
    }
  });

  test('no instructor content describes an investigation that does not exist', () => {
    for (const id of Object.keys(INSTRUCTOR_CONTENT)) {
      expect(getInvestigation(id)).toBeTruthy();
    }
  });

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: every section a guide needs is present and specific',
    (id, inv) => {
      const c = instructorContentFor(id);
      expect(c.topic).toBeTruthy();
      expect(c.placement.length).toBeGreaterThan(40);
      expect(c.overview.length).toBeGreaterThan(200);
      expect(c.priorKnowledge.length).toBeGreaterThanOrEqual(3);
      expect(c.keyConcepts.length).toBeGreaterThanOrEqual(3);
      expect(c.flow.length).toBeGreaterThanOrEqual(4);
      expect(c.features.length).toBeGreaterThanOrEqual(3);
      // The prompt asks for 3-6 misconceptions; fewer is not worth a section.
      expect(c.misconceptions.length).toBeGreaterThanOrEqual(4);
      expect(c.teachingNotes.length).toBeGreaterThanOrEqual(4);
      expect(c.discussion.length).toBeGreaterThanOrEqual(3);
      expect(c.extensions.length).toBeGreaterThanOrEqual(2);
      expect(c.modelNotes.length).toBeGreaterThan(120);
      for (const m of c.misconceptions) {
        expect(m.claim).toBeTruthy();
        expect(m.response.length).toBeGreaterThan(40);
      }
      for (const k of c.keyConcepts) {
        expect(k.heading).toBeTruthy();
        expect(k.body.length).toBeGreaterThan(80);
      }
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: the flow covers every step exactly once',
    (id, inv) => {
      // A guide whose roadmap skips steps sends an instructor looking for a
      // section of the lesson that is not where the guide says it is.
      const seen = new Set();
      for (const block of instructorContentFor(id).flow) {
        const [a, b] = block.steps.split(/[–-]/).map(s => Number(s.trim()));
        const end = Number.isFinite(b) ? b : a;
        expect(a).toBeGreaterThanOrEqual(1);
        expect(end).toBeLessThanOrEqual(inv.steps.length);
        for (let n = a; n <= end; n++) {
          expect(seen.has(n)).toBe(false);
          seen.add(n);
        }
      }
      expect(seen.size).toBe(inv.steps.length);
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: every step an expectation names really is one that needs one',
    (id, inv) => {
      const c = instructorContentFor(id);
      for (const [num, text] of Object.entries(c.expectations || {})) {
        const step = inv.steps[Number(num) - 1];
        expect(step).toBeTruthy();
        // Expectations exist for screens where a student observes something:
        // measurements, activities, and reading screens that carry a live
        // instrument. A pure-text screen has nothing to observe, so an
        // expectation attached to one is a mistake in the guide.
        const observable =
          step.type === 'measure' ||
          step.type === 'explore' ||
          (step.type === 'read' && Boolean(step.tool));
        expect(observable).toBe(true);
        expect(text.length).toBeGreaterThan(30);
      }
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: every measurement step has an expected observation',
    (id, inv) => {
      // A measure step with no stated expectation is the one place an
      // instructor is left without an answer to give.
      const c = instructorContentFor(id);
      for (const [i, step] of inv.steps.entries()) {
        if (step.type !== 'measure') continue;
        expect(c.expectations?.[i + 1]).toBeTruthy();
      }
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: teaching notes that cite a step cite one that exists',
    (id, inv) => {
      const c = instructorContentFor(id);
      const prose = [...c.teachingNotes, ...c.features.map(f => f.name)].join(
        ' '
      );
      for (const m of prose.matchAll(/steps? (\d+)(?:\s*[–-]\s*(\d+))?/gi)) {
        for (const n of [m[1], m[2]].filter(Boolean).map(Number)) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(inv.steps.length);
        }
      }
    }
  );
});

describe('grading at the edge of a tolerance', () => {
  test('a value exactly on the stated boundary is accepted', () => {
    // 7.6 - 8 is -0.4000000000000004 in binary floating point, so an exact
    // boundary answer used to be rejected by four parts in 10^16.
    const step = { kind: 'numeric', answer: 8, tolerance: 0.4 };
    expect(checkAnswer(step, 7.6)).toBe(true);
    expect(checkAnswer(step, 8.4)).toBe(true);
    expect(checkAnswer(step, '7.6')).toBe(true);
  });

  test('the slack is far too small to accept a wrong answer', () => {
    const step = { kind: 'numeric', answer: 8, tolerance: 0.4 };
    expect(checkAnswer(step, 7.59)).toBe(false);
    expect(checkAnswer(step, 8.41)).toBe(false);
    expect(checkAnswer(step, 7)).toBe(false);
  });

  test('every quoted range is exactly the range the site accepts', () => {
    for (const inv of INVESTIGATIONS) {
      for (const [i, step] of inv.steps.entries()) {
        if (step.kind !== 'numeric') continue;
        const e = entryFor(step, i);
        expect(checkAnswer(step, e.acceptedLow)).toBe(true);
        expect(checkAnswer(step, e.acceptedHigh)).toBe(true);
        const pad = Math.abs(e.tolerance) * 0.01;
        expect(checkAnswer(step, e.acceptedLow - pad)).toBe(false);
        expect(checkAnswer(step, e.acceptedHigh + pad)).toBe(false);
      }
    }
  });
});

describe('the generated documents', () => {
  const decode = bytes => new TextDecoder('latin1').decode(bytes);
  const pageCount = pdf =>
    (decode(pdf).match(/\/Type\s*\/Page[^s]/g) || []).length;
  const isValidPdf = pdf => {
    const s = decode(pdf);
    return (
      s.startsWith('%PDF-') &&
      s.includes('xref') &&
      s.includes('startxref') &&
      s.trimEnd().endsWith('%%EOF')
    );
  };
  /** Every string the document actually draws. */
  const drawn = pdf =>
    [...decode(pdf).matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g)].map(m =>
      m[1].replace(/\\([()\\])/g, '$1')
    );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: the instructor guide builds a valid PDF',
    (id, inv) => {
      const pdf = instructorGuide(inv, { version: 'Test 2026' });
      expect(isValidPdf(pdf)).toBe(true);
      expect(pageCount(pdf)).toBeGreaterThanOrEqual(3);
      const text = drawn(pdf).join(' ');
      // Every numbered section the template promises must actually appear.
      for (const heading of [
        '1. Overview',
        '2. Learning objectives',
        '3. Prior knowledge',
        '4. Key concepts',
        '5. Investigation flow',
        '6. Interactive features',
        '7. Common misconceptions',
        '8. Teaching notes',
        '9. Discussion questions',
        '10. Optional extensions',
        '11. Model notes',
      ]) {
        expect(text).toContain(heading);
      }
      expect(text).toContain(inv.duration);
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: the answer key builds a valid PDF and covers every graded step',
    (id, inv) => {
      const pdf = answerKeyDocument(inv, { version: 'Test 2026' });
      expect(isValidPdf(pdf)).toBe(true);
      const text = drawn(pdf).join(' ');
      const key = answerKeyFor(inv);
      for (const e of key.entries) {
        if (e.category === 'reading') continue;
        expect(text).toContain(`Step ${e.step}:`);
      }
      // And the correct answer is actually printed, not merely referenced.
      for (const e of gradedEntries(key)) {
        if (!e.answerText) continue;
        expect(text).toContain(e.answerLabel + '. ');
      }
    }
  );

  test('reading-only steps are left out of the key', () => {
    const inv = getInvestigation('black-holes');
    const text = [
      ...new TextDecoder('latin1')
        .decode(answerKeyDocument(inv))
        .matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g),
    ]
      .map(m => m[1])
      .join(' ');
    const reading = answerKeyFor(inv).entries.filter(
      e => e.category === 'reading'
    );
    expect(reading.length).toBeGreaterThan(0);
    for (const e of reading) expect(text).not.toContain(`Step ${e.step}:`);
  });

  test('the adopter guide and curriculum map build and name every lesson', () => {
    for (const pdf of [
      adoptersGuide(INVESTIGATIONS, { version: 'Test 2026' }),
      curriculumMap(INVESTIGATIONS, { version: 'Test 2026' }),
    ]) {
      expect(isValidPdf(pdf)).toBe(true);
      // Titles are transliterated to WinAnsi, so both sides are reduced to
      // letters before comparing rather than guessing how an apostrophe lands.
      const letters = t => t.replace(/[^A-Za-z]/g, '');
      const text = letters(drawn(pdf).join(' '));
      for (const inv of INVESTIGATIONS) {
        expect(text).toContain(letters(plainText(inv.title)));
      }
    }
  });

  test('nothing reaches the page as an unmapped character', () => {
    // The PDF fonts are WinAnsi. Anything outside it becomes a literal "?", so
    // a stray unicode dash would print as a question mark in a document sent
    // to faculty.
    for (const inv of INVESTIGATIONS) {
      for (const pdf of [instructorGuide(inv), answerKeyDocument(inv)]) {
        for (const s of drawn(pdf)) {
          if (!s.includes('?')) continue;
          // A real question mark follows a word; a placeholder follows a space
          // or sits alone.
          expect(s).toMatch(/[A-Za-z0-9,'")\]]\s*\?/);
        }
      }
    }
  });

  test('documents are US Letter and carry a page number on every page', () => {
    const pdf = instructorGuide(getInvestigation('keplers-laws'));
    const s = decode(pdf);
    expect(s).toContain('/MediaBox [0 0 612 792]');
    const pages = pageCount(pdf);
    const numbered = (s.match(/Page \d+ of \d+/g) || []).length;
    expect(numbered).toBe(pages);
  });
});
