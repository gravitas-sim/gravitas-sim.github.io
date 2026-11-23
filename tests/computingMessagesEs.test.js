import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { registerMessages, setLocale } from '../js/i18n/index.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';
import { lessonText } from '../js/i18n/lesson.js';
import { loadInvestigation } from '../js/data/investigations/loaders.js';
import {
  COMPUTING_ES,
  computingMessage,
  templateKey,
} from '../js/i18n/computingMessagesEs.js';

import INTEGRATORS from '../js/data/investigations/integrators-in-practice.js';
import EXTENDING from '../js/data/investigations/extending-an-experiment.js';
import PERIODOGRAMS from '../js/data/investigations/two-periodograms.js';
import SAMPLING from '../js/data/investigations/sampling-a-posterior.js';
import REFITTING from '../js/data/investigations/refitting-a-transit.js';

// =============================================================================
// The check messages of the five computing lessons, in Spanish
// -----------------------------------------------------------------------------
// js/i18n/computingMessagesEs.js holds a template for every sentence the five
// lessons' checks can return, with the student's numbers cut out. This runs
// every check of the five lessons (each menu choice, the answers of every other
// run, the wrong ones, the empty ones) and holds what the student would read to
// that catalog: every sentence is Spanish, every numeral of the English is in the
// Spanish in Spanish form, the catalog has no entry that no check produces, and
// the English reader and every other lesson are untouched.
// =============================================================================

const LESSONS = [INTEGRATORS, EXTENDING, PERIODOGRAMS, SAMPLING, REFITTING];

/** The numerals of a sentence, as a check writes them (an independent oracle). */
const NUMERAL = /−?\d+(?:,\d{3})+(?:\.\d+)?|−?\d+(?:\.\d+)?/g;
const numerals = text => text.match(NUMERAL) ?? [];
/** An English numeral in Spanish form: decimal comma, point between thousands. */
const spanish = n => n.replace(/[.,]/g, c => (c === '.' ? ',' : '.'));
/** A Spanish numeral: a point only between thousands, a comma for the decimals. */
const SPANISH_NUMERAL = /−?\d+(?:\.\d{3})+(?:,\d+)?|−?\d+(?:,\d+)?/g;

/**
 * Every sentence the checks of the five lessons return, with the lesson, the
 * step and the values that produced it.
 *
 * Each validating step is run over the menu choices and over the rows the
 * answer key lists for them (the answers of the other runs), each field in
 * turn wrong, empty or a little off, and the baseline run's numbers, so the
 * branches that name another run, the wrong way round and the empty menu are
 * all reached.
 */
function sentences() {
  const found = new Map();
  const run = (lesson, step, values) => {
    for (const word of [undefined, 'none', 'x']) {
      const v = {
        ...values,
        ...(word === undefined ? {} : { where_text: word }),
      };
      let verdict;
      try {
        verdict = step.validate(v);
      } catch {
        continue;
      }
      const m = verdict?.message;
      if (typeof m === 'string' && !/Infinit|NaN/.test(m) && !found.has(m))
        found.set(m, { lesson: lesson.id, sid: step.sid, values: v });
    }
  };
  for (const lesson of LESSONS) {
    for (const step of lesson.steps) {
      if (!step.validate) continue;
      const fields = step.fields ?? [];
      const menus = fields.filter(
        f => Array.isArray(f.options) && f.options.every(Number.isFinite)
      );
      const rows = new Set(fields.flatMap(f => Object.keys(f.by ?? {})));
      const bases = [
        Object.fromEntries(fields.map(f => [f.id, Number(f.want)])),
        ...[...rows].map(r =>
          Object.fromEntries(
            fields.map(f => [
              f.id,
              Number(f.by && r in f.by ? f.by[r] : f.want),
            ])
          )
        ),
      ];
      // The baseline run's own numbers (the tables of the lessons are private).
      if (step.sid === 'choose-the-second-step')
        bases.push({
          verlet: 0.001768,
          rk4: -6.47e-8,
          ratioVerlet: 1,
          ratioRk4: 1,
        });
      if (step.sid === 'move-the-definition-yours')
        bases.push({ edge: 0.255, extended: 0.596 });
      let menuChoices = [{}];
      for (const f of menus)
        menuChoices = menuChoices.flatMap(c =>
          [...f.options, NaN].map(o => ({ ...c, [f.id]: o }))
        );
      for (const base of bases)
        for (const choice of menuChoices) {
          const v = { ...base, ...choice };
          run(lesson, step, v);
          for (const f of fields) {
            if (f.id in choice) continue;
            for (const k of [NaN, 0, 1.02, 0.5, 2, 1.0004, 0.97])
              run(lesson, step, {
                ...v,
                [f.id]: Number.isNaN(k) ? NaN : v[f.id] * k,
              });
          }
          for (const count of [0, 1, 2, 3]) run(lesson, step, { ...v, count });
          if (!('count' in v)) run(lesson, step, { ...v, count: NaN });
        }
    }
  }
  return found;
}

/** What a student reads: the check's sentence, then the keyed catalog's pass. */
const shown = (lesson, { sid, values }) =>
  lessonText(lesson.steps.find(s => s.sid === sid).validate(values).message);

describe('the sentences the five checks can return', () => {
  const all = sentences();
  const byId = Object.fromEntries(LESSONS.map(l => [l.id, l]));

  test('there are a lot of them, from every lesson', () => {
    expect(all.size).toBeGreaterThan(130);
    const lessons = new Set([...all.values()].map(w => w.lesson));
    expect(lessons).toEqual(new Set(LESSONS.map(l => l.id)));
  });

  describe('in English', () => {
    test('opening the lessons in English wraps nothing and fetches no catalog', async () => {
      for (const l of LESSONS) {
        const opened = await loadInvestigation(l.id, 'en');
        // The very module the registry holds: no copy, no wrapped check.
        expect(opened).toBe(l);
        for (const step of l.steps)
          if (step.validate)
            expect(opened.steps.find(s => s.sid === step.sid).validate).toBe(
              step.validate
            );
      }
    });
  });

  describe('in Spanish', () => {
    let spoken;
    beforeAll(async () => {
      registerMessages('es', ES_DEFERRED, true);
      await setLocale('es', { persist: false });
      // The catalog comes with the Spanish words of the lessons, not by itself.
      spoken = {};
      for (const l of LESSONS)
        spoken[l.id] = await loadInvestigation(l.id, 'es');
    });

    test('the lessons come back as copies, so the English ones are not touched', async () => {
      for (const l of LESSONS) {
        expect(spoken[l.id]).not.toBe(l);
        const english = await loadInvestigation(l.id, 'en');
        expect(english).toBe(l);
        for (const step of l.steps)
          if (step.validate)
            expect(english.steps.find(s => s.sid === step.sid).validate).toBe(
              step.validate
            );
      }
    });

    test('the wrapped checks still return the same level and every other field', () => {
      for (const [m, where] of all) {
        const english = byId[where.lesson].steps
          .find(s => s.sid === where.sid)
          .validate(where.values);
        const asked = spoken[where.lesson].steps
          .find(s => s.sid === where.sid)
          .validate(where.values);
        expect(asked.level).toBe(english.level);
        expect(Object.keys(asked)).toEqual(Object.keys(english));
        expect(typeof asked.message).toBe(typeof m);
      }
    });

    test('every sentence of every check is translated', () => {
      const english = [];
      for (const [m, where] of all)
        if (shown(spoken[where.lesson], where) === m) english.push(m);
      expect(english).toEqual([]);
    });

    test('the Spanish keeps every numeral of the English, in Spanish form', () => {
      const wrong = [];
      for (const [m, where] of all) {
        const want = numerals(m).map(spanish).sort();
        const got = (
          shown(spoken[where.lesson], where).match(SPANISH_NUMERAL) ?? []
        ).sort();
        if (JSON.stringify(want) !== JSON.stringify(got))
          wrong.push([m, want, got]);
      }
      expect(wrong).toEqual([]);
    });

    test('no decimal point is left in a number but between thousands', () => {
      for (const [, where] of all) {
        const text = shown(spoken[where.lesson], where);
        expect(
          (text.match(/\d\.\d+(?!\d)/g) ?? []).filter(x => !/\.\d{3}$/.test(x))
        ).toEqual([]);
      }
    });

    test('every entry of the catalog is produced by a check', () => {
      const used = new Set(
        [...all.keys()].map(m => templateKey(m.replace(NUMERAL, '#')))
      );
      expect(Object.keys(COMPUTING_ES).filter(k => !used.has(k))).toEqual([]);
    });

    test('no two sentences share a key, so none can take the other’s translation', () => {
      const byKey = new Map();
      for (const m of all.keys()) {
        const shape = m.replace(NUMERAL, '#');
        const k = templateKey(shape);
        if (byKey.has(k)) expect(byKey.get(k)).toBe(shape);
        byKey.set(k, shape);
      }
    });

    test('a sentence that is Spanish reads as Spanish', () => {
      const english =
        /\b(the|and|your|you|with|from|then|that|this|which|but|are|is|of)\b/i;
      for (const [key, text] of Object.entries(COMPUTING_ES)) {
        expect([key, text.trim().length > 20]).toEqual([key, true]);
        expect([key, english.test(text.replace(/[A-Za-z-]+\*/g, ''))]).toEqual([
          key,
          false,
        ]);
        // A sentence: it opens with a letter and ends with a stop or a closing mark.
        expect([
          key,
          /[.»)]$/.test(text),
          /^[A-ZÁÉÍÓÚ¿¡a-z]/.test(text),
        ]).toEqual([key, true, true]);
        // The tú of the lessons' Spanish, never usted.
        expect([key, /\b(usted|ustedes)\b/i.test(text)]).toEqual([key, false]);
        // Every placeholder is a number the English has: the highest is below
        // the most numerals any sentence carries.
        for (const [, i] of text.matchAll(/\{(\d+)\}/g))
          expect(Number(i)).toBeLessThan(8);
      }
    });

    test('the sentences carry the student’s numbers in Spanish form', () => {
      const pick = (id, sid, values) => shown(spoken[id], { sid, values });
      const baseline = n => ({
        second: n,
        verlet: 0.001768,
        rk4: -6.47e-8,
        ratioVerlet: 1,
        ratioRk4: 1,
      });
      expect(
        pick('integrators-in-practice', 'choose-the-second-step', baseline(438))
      ).toBe(
        'Esas son las derivas de la ejecución de referencia, de 500 pasos. Has elegido 438: pon los pasos en 438 en la página de cálculo y ejecuta de nuevo.'
      );
      expect(
        pick('extending-an-experiment', 'move-the-definition-yours', {
          cutoff: 2,
          edge: 0.255,
          extended: 0.596,
        })
      ).toBe(
        'Esos son los números de la ejecución de referencia, con umbral 3. Has elegido 2: pon el umbral en 2 en la página de cálculo y ejecuta de nuevo.'
      );
      const held = [...all].find(([m]) =>
        m.startsWith('With a/R* held at 8.5, Rp/R* is')
      );
      expect(shown(spoken[held[1].lesson], held[1])).toMatch(
        /^Con a\/R\* fijado en 8,5, Rp\/R\* es 0,1211, con un intervalo del 68 por ciento de 0,00028 de anchura/
      );
      const box = [...all].find(([m]) =>
        m.startsWith('With the limit at 3 hours the best box is 2.6')
      );
      expect(shown(spoken[box[1].lesson], box[1])).toMatch(
        /^Con el límite en 3 horas, la mejor caja dura 2,6 horas, dentro del intervalo/
      );
      const negative = computingMessage(
        'The run is right. The shift is the difference between the two values, yours with the limb darkening fitted and the new one, divided by the new sigma. From your own entries your shift should be about −0.5.'
      );
      expect(negative).toMatch(/debería ser de unos −0,5\.$/);
    });

    test('an unknown sentence stays as it was', () => {
      expect(
        computingMessage('Some new sentence about 12 steps.')
      ).toBeUndefined();
      expect(lessonText('Some new sentence about 12 steps.')).toBe(
        'Some new sentence about 12 steps.'
      );
    });
  });

  describe('where the catalog is reached from', () => {
    const walk = dir =>
      readdirSync(dir, { withFileTypes: true }).flatMap(e =>
        e.isDirectory()
          ? walk(`${dir}/${e.name}`)
          : e.name.endsWith('.js')
            ? [`${dir}/${e.name}`]
            : []
      );

    test('only the Spanish words of the five lessons import it', () => {
      const importers = walk('js')
        .filter(f => readFileSync(f, 'utf8').includes('computingMessagesEs'))
        .filter(f => f !== 'js/i18n/computingMessagesEs.js')
        .sort();
      expect(importers).toEqual(
        LESSONS.map(l => `js/data/investigations/es/${l.id}.js`).sort()
      );
    });

    test('it imports nothing, so no shared chunk is made for it', () => {
      const source = readFileSync('js/i18n/computingMessagesEs.js', 'utf8');
      expect(source.match(/^\s*import\b/gm)).toBeNull();
      expect(source.match(/\bimport\(/g)).toBeNull();
    });
  });
});
