import { describe, test, expect } from '@jest/globals';
import { checkAnswer, gradeAnswer, toleranceFor } from '../js/answerCheck.js';
import { matchMisconception, nextHintStage } from '../js/answerFeedback.js';
import RV from '../js/data/investigations/radial-velocity.js';
import KEPLER from '../js/data/investigations/keplers-laws.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';

// =============================================================================
// Answer entry, end to end
// -----------------------------------------------------------------------------
// The parser and the hint model have their own files. This is about the two
// meeting the real lesson data: that the steps which now declare units really
// accept the equivalent answers, that a decimal comma works in the questions a
// Spanish-speaking student will meet, and that the grading the site does is the
// grading the instructor key describes.
// =============================================================================

const stepBySid = (lesson, sid) => lesson.steps.find(s => s.sid === sid);

/** Lesson prose is written as wrapped template literals; the panel collapses it. */
const flat = text =>
  String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();

describe('the site and the answer key grade identically', () => {
  test('checkAnswer and gradeAnswer never disagree', () => {
    // The instructor materials call checkAnswer; the panel calls gradeAnswer.
    // If they can differ, a class is marked by one rule and taught by another.
    const probes = ['0.69', '0,69', '0.7', '1.38', '', 'x', '84 h', '8', '64'];
    for (const lesson of Object.values(INVESTIGATIONS)) {
      for (const step of lesson.steps) {
        if (step.kind !== 'numeric') continue;
        for (const locale of ['en', 'es']) {
          for (const probe of probes) {
            const boolean = checkAnswer(step, probe, { locale });
            const detailed = gradeAnswer(step, probe, { locale });
            expect(detailed.correct).toBe(boolean);
          }
        }
      }
    }
  });

  test('every numeric step in the catalogue accepts its own stated answer', () => {
    for (const lesson of Object.values(INVESTIGATIONS)) {
      for (const step of lesson.steps) {
        if (step.kind !== 'numeric') continue;
        expect(checkAnswer(step, String(step.answer))).toBe(true);
      }
    }
  });

  test('a blank is never correct anywhere in the catalogue', () => {
    // It used to parse as zero, so a step whose tolerance spanned zero would
    // have accepted an empty box.
    for (const lesson of Object.values(INVESTIGATIONS)) {
      for (const step of lesson.steps) {
        if (step.kind !== 'numeric') continue;
        expect(checkAnswer(step, '')).toBe(false);
        expect(gradeAnswer(step, '').status).toBe('unreadable');
        expect(gradeAnswer(step, '').reason).toBe('blank');
      }
    }
  });
});

describe('the radial-velocity questions', () => {
  const mass = stepBySid(RV, 'weigh-hd-209458-b');
  const density = stepBySid(RV, 'how-dense-is-it');

  test('the planet mass takes Jupiter masses, Earth masses or kilograms', () => {
    expect(checkAnswer(mass, '0.69')).toBe(true);
    expect(checkAnswer(mass, '0.69 M_jup')).toBe(true);
    // 0.69 Jupiter masses in Earth masses and in kilograms.
    expect(checkAnswer(mass, '219 M_earth')).toBe(true);
    expect(checkAnswer(mass, '1.31e27 kg')).toBe(true);
  });

  test('a Spanish decimal comma is the same answer', () => {
    expect(checkAnswer(mass, '0,69', { locale: 'es' })).toBe(true);
    expect(checkAnswer(density, '0,33', { locale: 'es' })).toBe(true);
  });

  test('a unit of the wrong kind is refused with a reason, not marked wrong', () => {
    const out = gradeAnswer(mass, '0.69 AU');
    expect(out.status).toBe('unreadable');
    expect(out.reason).toBe('incompatibleUnit');
    expect(out.detail).toMatchObject({ got: 'length', dimension: 'mass' });
  });

  test('reading the peak-to-peak range as K is named, and only that', () => {
    // Twice the mass, because mass is proportional to K here. This is the
    // factor-of-two error the whole section is written against.
    const doubled = gradeAnswer(mass, '1.38');
    expect(doubled.correct).toBe(false);
    expect(
      matchMisconception(mass, doubled.value, toleranceFor(mass))?.id
    ).toBe('peakToPeakForSemiAmplitude');

    // A number that is merely wrong gets no story attached to it.
    const merely = gradeAnswer(mass, '0.42');
    expect(
      matchMisconception(mass, merely.value, toleranceFor(mass))
    ).toBeNull();
  });

  test('the density question takes kg/m³ as well as g/cm³', () => {
    expect(checkAnswer(density, '0.33 g/cm³')).toBe(true);
    expect(checkAnswer(density, '330 kg/m3')).toBe(true);
  });

  test("Earth's density from the comparison row is recognised", () => {
    const out = gradeAnswer(density, '5.51');
    expect(out.correct).toBe(false);
    const missed = matchMisconception(
      density,
      out.value,
      toleranceFor(density)
    );
    expect(missed.id).toBe('earthNotPlanet');
    expect(flat(missed.message)).toMatch(/Earth’s density/);
  });

  test('both questions offer hints in order and a reveal at the end', () => {
    for (const step of [mass, density]) {
      expect(nextHintStage(step, [])).toBe('concept');
      expect(nextHintStage(step, ['concept'])).toBe('method');
      expect(nextHintStage(step, ['concept', 'method'])).toBe('reveal');
      expect(nextHintStage(step, ['concept', 'method', 'reveal'])).toBeNull();
    }
  });
});

describe("Kepler's questions", () => {
  const period = stepBySid(KEPLER, 'use-the-law');
  const starMass = stepBySid(KEPLER, 'weighing-another-star');

  test('the period takes years or days', () => {
    expect(checkAnswer(period, '8')).toBe(true);
    expect(checkAnswer(period, '8 years')).toBe(true);
    expect(checkAnswer(period, '2922 days')).toBe(true);
  });

  test('cubing and stopping is named', () => {
    const out = gradeAnswer(period, '64');
    expect(out.correct).toBe(false);
    const missed = matchMisconception(period, out.value, toleranceFor(period));
    expect(missed.id).toBe('cubedNotRooted');
    expect(flat(missed.message)).toMatch(/square root of 64/);
  });

  test('rooting the axis instead of its cube is named', () => {
    const missed = matchMisconception(period, 2, toleranceFor(period));
    expect(missed.id).toBe('rootedTheAxis');
  });

  test('a plainly wrong period gets no invented explanation', () => {
    expect(matchMisconception(period, 5, toleranceFor(period))).toBeNull();
    expect(matchMisconception(period, 30, toleranceFor(period))).toBeNull();
  });

  test('the stellar mass takes solar masses or kilograms', () => {
    expect(checkAnswer(starMass, '0.91')).toBe(true);
    expect(checkAnswer(starMass, '0.91 M_sun')).toBe(true);
    expect(checkAnswer(starMass, '1.81e30 kg')).toBe(true);
  });

  test('using the period in days is recognised as that mistake', () => {
    const wrong = 0.91 / 365.25 ** 2;
    const missed = matchMisconception(starMass, wrong, toleranceFor(starMass));
    expect(missed.id).toBe('periodInDays');
  });

  test('malformed input is refused rather than graded', () => {
    for (const raw of ['about 8', '8 or 9', '1.2.3', 'eight']) {
      const out = gradeAnswer(period, raw);
      expect(out.status).toBe('unreadable');
      expect(out.correct).toBe(false);
    }
  });
});

describe('every step that declares units declares them usably', () => {
  test('the declared canonical unit is one of the accepted ones', () => {
    for (const lesson of Object.values(INVESTIGATIONS)) {
      for (const step of lesson.steps) {
        if (!step.expect) continue;
        const accept = (step.expect.accept || []).map(u => u.toLowerCase());
        expect(accept).toContain(step.expect.unit.toLowerCase());
      }
    }
  });

  test('a step that declares units still accepts its own bare answer', () => {
    for (const lesson of Object.values(INVESTIGATIONS)) {
      for (const step of lesson.steps) {
        if (!step.expect) continue;
        expect(checkAnswer(step, String(step.answer))).toBe(true);
        expect(checkAnswer(step, `${step.answer} ${step.expect.unit}`)).toBe(
          true
        );
      }
    }
  });
});
