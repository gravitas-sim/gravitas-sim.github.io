// =============================================================================
// Model-checked expectations (Roadmap II, Prompt 66 step 7)
// -----------------------------------------------------------------------------
// Every literal numeric answer in a lesson is recomputed from the lesson's own
// model (the generated block below), carries a published source, or is on an
// allowlist that can only shrink. And the instructor expectations record is
// keyed by step sid, with a readVersioned migration from the number-keyed /1.
// See tools/authoring/modelChecked.mjs.
// =============================================================================
import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import {
  MODELS,
  SOURCED,
  UNCHECKED,
  UNCHECKED_CEILING,
  modelCheckFindings,
  numericLiterals,
  reproduces,
  significantDigits,
} from '../tools/authoring/modelChecked.mjs';
import {
  expectationsFor,
  readExpectations,
} from '../js/instructorExpectations.js';
import expectationsDoc from '../js/data/instructorExpectations.js';

/** What the allowlist holds; lower it when an entry is converted, never raise it. */
const UNCHECKED_COUNT = 7;

const literals = numericLiterals(INVESTIGATIONS);
const byKey = Object.fromEntries(literals.map(l => [l.key, l]));

describe('the digits a literal is written to', () => {
  test.each([
    [8.686, 4],
    [780, 2],
    [0.177, 3],
    [1000000, 1],
    [84, 2],
    [1, 1],
    [1.95, 3],
  ])('%s has %i', (x, n) => expect(significantDigits(x)).toBe(n));

  test('a value reproduces a literal by rounding to its digits, no looser', () => {
    expect(reproduces(8.6862, 8.686)).toBe(true);
    expect(reproduces(8.69, 8.686)).toBe(false);
    expect(reproduces(777.1, 780)).toBe(true);
  });
});

describe('the allowlist only shrinks', () => {
  test('there are 38 numeric literals, and each is in exactly one table', () => {
    expect(literals).toHaveLength(38);
    for (const l of literals) {
      const homes = [MODELS, SOURCED, UNCHECKED].filter(t => t[l.key]);
      expect({ key: l.key, homes: homes.length }).toEqual({
        key: l.key,
        homes: 1,
      });
    }
  });

  test('its size is pinned, and never above where it started', () => {
    expect(Object.keys(UNCHECKED)).toHaveLength(UNCHECKED_COUNT);
    expect(UNCHECKED_COUNT).toBeLessThanOrEqual(UNCHECKED_CEILING);
    expect(UNCHECKED_CEILING).toBe(34);
    expect(
      Object.keys(MODELS).length + Object.keys(SOURCED).length + UNCHECKED_COUNT
    ).toBe(38);
  });

  test('every entry names a real literal and gives a reason', () => {
    expect(
      modelCheckFindings(INVESTIGATIONS, {
        models: MODELS,
        sourced: SOURCED,
        unchecked: UNCHECKED,
      })
    ).toEqual([]);
  });
});

describe('the rule refuses what it should', () => {
  const tables = { models: {}, sourced: {}, unchecked: {} };
  const lesson = answer => ({
    id: 'fresh-lesson',
    steps: [
      {
        sid: 'a-sum',
        type: 'question',
        kind: 'numeric',
        answer,
      },
      { sid: 'a-choice', type: 'question', kind: 'choice', answer: 2 },
    ],
  });

  test('a new literal numeric answer', () => {
    const f = modelCheckFindings([lesson(42)], tables);
    expect(f).toHaveLength(1);
    expect(f[0].message).toMatch(/literal that nothing checks/);
    expect(f[0].step).toBe(0);
  });

  test('a multiple-choice index is not a numeric literal', () => {
    expect(numericLiterals([lesson(42)]).map(l => l.key)).toEqual([
      'fresh-lesson/a-sum',
    ]);
  });

  test('a sourced value is accepted only with a real source', () => {
    const key = 'fresh-lesson/a-sum';
    const ok = {
      ...tables,
      sourced: { [key]: { sources: [{ text: 'A table', doi: '10.1/x' }] } },
    };
    expect(modelCheckFindings([lesson(42)], ok)).toEqual([]);
    const bare = {
      ...tables,
      sourced: { [key]: { sources: [{ text: 'x' }] } },
    };
    expect(modelCheckFindings([lesson(42)], bare)[0].message).toMatch(
      /needs sources/
    );
  });

  test('a stale or unjustified allowlist entry', () => {
    const key = 'fresh-lesson/a-sum';
    const stale = {
      ...tables,
      unchecked: { 'fresh-lesson/gone': 'Long enough to be a reason.' },
      models: { [key]: {} },
    };
    const f = modelCheckFindings([lesson(42)], stale);
    expect(f.map(x => x.message).join('\n')).toMatch(/not a numeric literal/);
    const checked = {
      ...tables,
      models: { [key]: {} },
      unchecked: { [key]: 'Long enough to be a reason.' },
    };
    expect(modelCheckFindings([lesson(42)], checked)[0].message).toMatch(
      /checked now/
    );
    const bare = { ...tables, unchecked: { [key]: 'todo' } };
    expect(modelCheckFindings([lesson(42)], bare)[0].message).toMatch(
      /without a justification/
    );
  });
});

// -- The generated block: one proof per recomputed entry ----------------------
describe("recomputed from the lesson's own model", () => {
  const entries = Object.entries(MODELS);
  test.each(entries.length ? entries : [['none yet', null]])(
    '%s',
    async (key, entry) => {
      if (!entry) return;
      const l = byKey[key];
      expect(l).toBeTruthy();
      const value = await entry.value();
      // The same value, not a looser one: rounded to the digits the literal is
      // written to it is the literal, and it is inside the step's tolerance.
      expect({ key, value: Number(value.toPrecision(6)) }).toEqual({
        key,
        value: expect.any(Number),
      });
      expect(reproduces(value, l.step.answer)).toBe(true);
      expect(Math.abs(value - l.step.answer)).toBeLessThanOrEqual(
        l.step.tolerance
      );
      expect(entry.via).toMatch(/^js\//);
    }
  );
});

describe('the instructor expectations record', () => {
  test('is gravitas.instructor-expectations/2, keyed by sid', () => {
    expect(expectationsDoc.format).toBe('gravitas.instructor-expectations');
    expect(expectationsDoc.formatVersion).toBe(2);
    let total = 0;
    for (const inv of INVESTIGATIONS) {
      const e = expectationsFor(inv);
      const sids = new Set(inv.steps.map(s => s.sid));
      for (const [sid, text] of Object.entries(e)) {
        total++;
        expect({ id: inv.id, sid, known: sids.has(sid) }).toEqual({
          id: inv.id,
          sid,
          known: true,
        });
        expect(text.length).toBeGreaterThan(20);
      }
    }
    expect(total).toBe(241);
  });

  test('a /1 record keyed by step number migrates to the same text', () => {
    const inv = INVESTIGATIONS.find(i => i.id === 'hohmann-transfer');
    const sid = Object.keys(expectationsFor(inv))[0];
    const n = inv.steps.findIndex(s => s.sid === sid) + 1;
    const v1 = {
      format: 'gravitas.instructor-expectations',
      formatVersion: 1,
      lessons: { [inv.id]: { [n]: 'seen at the old number', 999: 'gone' } },
    };
    const r = readExpectations(v1, id => (id === inv.id ? inv.steps : []));
    expect(r.ok).toBe(true);
    expect(r.migrated).toBe(true);
    expect(r.doc.formatVersion).toBe(2);
    expect(r.doc.lessons[inv.id]).toEqual({ [sid]: 'seen at the old number' });
    expect(r.notes.join()).toMatch(/step 999 does not exist/);
    expect(expectationsFor(inv, v1)).toEqual({
      [sid]: 'seen at the old number',
    });
  });

  test('a newer or foreign record is refused with a reason', () => {
    const none = () => [];
    expect(
      readExpectations({ ...expectationsDoc, formatVersion: 3 }, none).reason
    ).toBe('newer');
    expect(
      readExpectations({ format: 'x', formatVersion: 2 }, none).reason
    ).toBe('format');
  });
});
