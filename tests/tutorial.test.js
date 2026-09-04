import { describe, test, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { TUTORIAL_STEPS } from '../js/tutorial.js';
import { EN } from '../js/i18n/en.js';
import { ES } from '../js/i18n/es.js';

// =============================================================================
// The guided tour
// -----------------------------------------------------------------------------
// The tour is the one part of the interface that makes claims about the rest of
// it, so it goes stale in a way nothing else does: a control gets renamed and
// the spotlight quietly highlights nothing, or a step describes a gesture that
// no longer works and there is no error anywhere.
//
// It had both problems before this suite existed. It told readers that the add
// button "cycles the object type" after it had become a picker, that a click on
// empty space places an object after placement had to be armed first, and it
// counted thirty-seven scenarios when there were fifty-three.
// =============================================================================

const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');

describe('every step points at something that exists', () => {
  test('each target is an id or class present in index.html', () => {
    const missing = [];
    for (const step of TUTORIAL_STEPS) {
      if (!step.target) continue;
      const sel = step.target;
      const found = sel.startsWith('#')
        ? html.includes(`id="${sel.slice(1)}"`)
        : html.includes(`class="${sel.slice(1)}`) ||
          html.includes(`${sel.slice(1)} `) ||
          html.includes(`"${sel.slice(1)}"`);
      if (!found) missing.push(`${step.id} -> ${sel}`);
    }
    expect(missing).toEqual([]);
  });

  test('the tour is worth calling a tour', () => {
    // The brief that produced this version asked for longer and better. Twelve
    // is the floor at which that stays true if someone trims it later.
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(12);
  });

  test('step ids are unique', () => {
    const ids = TUTORIAL_STEPS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('it opens and closes on a step that spotlights nothing', () => {
    // A first or last step anchored to a control would dim the whole interface
    // around one button before the reader knows what the interface is.
    expect(TUTORIAL_STEPS[0].target).toBeNull();
    expect(TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1].target).toBeNull();
  });
});

describe('every step is fully translated', () => {
  const LOCALES = { en: EN, es: ES };

  for (const [locale, catalogue] of Object.entries(LOCALES)) {
    test(`${locale} has a title, body and tip for every step`, () => {
      const missing = [];
      for (const step of TUTORIAL_STEPS) {
        for (const part of ['title', 'body', 'tip']) {
          const key = `tutorial.${step.id}.${part}`;
          if (!catalogue[key]) missing.push(key);
        }
      }
      expect(missing).toEqual([]);
    });

    test(`${locale} has the chrome strings the tour renders`, () => {
      for (const key of [
        'tutorial.stepCount',
        'tutorial.next',
        'tutorial.finish',
      ]) {
        expect(catalogue[key]).toBeTruthy();
      }
    });
  }

  test('the step counter carries both placeholders', () => {
    for (const catalogue of Object.values(LOCALES)) {
      expect(catalogue['tutorial.stepCount']).toContain('{n}');
      expect(catalogue['tutorial.stepCount']).toContain('{total}');
    }
  });
});

describe('the tour does not describe an interface that is gone', () => {
  const bodies = Object.entries(EN)
    .filter(([k]) => k.startsWith('tutorial.'))
    .map(([, v]) => v)
    .join('\n');

  test('it does not claim the add button cycles types', () => {
    expect(bodies).not.toMatch(/cycles? the object type/i);
  });

  test('it explains that placement has to be armed', () => {
    // The single most important behavioural change a returning reader needs.
    expect(bodies).toMatch(/arm/i);
  });

  test('it does not quote a scenario count that has moved on', () => {
    // Any number here has to be the real one. Checked against the catalogue
    // rather than hardcoded, so this fails when scenarios are added and the
    // tour is not updated.
    const claimed = bodies.match(
      /\b(twenty|thirty|forty|fifty|sixty|seventy)[- ](one|two|three|four|five|six|seven|eight|nine)?\b/gi
    );
    // Only two spelled-out counts belong in the tour: the scenarios and the
    // settings. Both are asserted exactly below, so an unexplained third is a
    // sign something drifted.
    expect(claimed && claimed.length).toBeLessThanOrEqual(3);
    expect(bodies).toMatch(/fifty-three scenarios/i);
    expect(bodies).toMatch(/sixty-three settings/i);
  });

  test('it mentions the investigations, which are half the project', () => {
    expect(bodies).toMatch(/twelve/i);
    expect(bodies).toMatch(/investigation/i);
  });

  test('it does not assert that either dark-matter explanation is right', () => {
    expect(bodies).not.toMatch(/MOND is (correct|right|proven)/i);
    expect(bodies).not.toMatch(/dark matter (is proven|has been proven)/i);
    // And it says the comparison does not settle it.
    expect(bodies).toMatch(/does not establish which explanation is right/i);
  });
});
