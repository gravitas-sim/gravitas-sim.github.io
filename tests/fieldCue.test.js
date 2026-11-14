import { describe, test, expect, beforeAll } from '@jest/globals';

import { INVESTIGATIONS } from '../js/data/investigations.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import { DEPTH_LESSONS, loadDepthSteps } from '../js/investigations/depth.js';
import { layDepth } from '../js/investigations/depthPure.js';
import { cueText, stepMarkup } from '../js/investigations/stepView.js';
import { cueFindings } from '../tools/authoring/cueRules.mjs';
import { checkCatalog } from '../js/authoring/rules.js';
import { loadAuthoringInputs } from '../tools/authoring/inputs.mjs';

// =============================================================================
// What an empty answer box may say
// -----------------------------------------------------------------------------
// A placeholder is on screen before the student has measured anything. Three
// things are held here: the engine never renders a cue that holds a numeral,
// whatever file or pack it came from; the authoring rule reads the numbers
// inside the text of a cue, not only a bare number; and in the shipped catalog,
// at every depth and in both languages, no input renders a value.
// =============================================================================

const ctx = { probe: {} };

describe('the engine guard', () => {
  test('a cue with a numeral in any notation is not shown', () => {
    for (const cue of [
      '9.33',
      '0,91',
      'e.g. 8.0 ± 0.1',
      'p. ej. 8,0 ± 0,1',
      '٣٫٥',
      '१२',
      '½',
      'from step 8',
    ])
      expect({ cue, shown: cueText(cue) }).toEqual({ cue, shown: '' });
  });

  test('a cue that is words is shown as it is', () => {
    expect(cueText('from the previous step')).toBe('from the previous step');
    expect(cueText('  ppm ')).toBe('ppm');
    expect(cueText('a value, then ± its uncertainty')).toBe(
      'a value, then ± its uncertainty'
    );
    expect(cueText(undefined)).toBe('');
    expect(cueText(12)).toBe('');
    expect(cueText('two significant figures')).toBe('two significant figures');
  });

  test('the panel and the rule have one definition of a numeral', () => {
    for (const cue of [
      '9.33',
      '0,91',
      'e.g. 8.0 ± 0.1',
      '٣٫٥',
      '½',
      'from step 8',
      'ppm',
      'a value, then ± its uncertainty',
      'from the previous step',
    ]) {
      const step = { kind: 'numeric', answer: 1e9, tolerance: 0 };
      const ruled = cueFindings({ ...step, placeholder: cue }, {}, ctx);
      expect({ cue, hidden: cueText(cue) === '' }).toEqual({
        cue,
        hidden: ruled.length > 0,
      });
    }
  });

  test('a numeric box falls back to the unit when its own cue has a number', () => {
    const numeric = placeholder => {
      const step = {
        type: 'question',
        kind: 'numeric',
        sid: 'n',
        title: 'N',
        body: 'B',
        prompt: 'P',
        unit: 'years',
        answer: 8,
        placeholder,
      };
      const html = stepMarkup(step, markupContext({ steps: [step] }, step));
      return placeholdersIn(html.join(''))[0];
    };
    expect(numeric('e.g. 8.0 ± 0.1')).not.toMatch(/\d/);
    expect(numeric('e.g. 8.0 ± 0.1')).toMatch(/years/);
    expect(numeric('a value, then ± its uncertainty')).toBe(
      'a value, then ± its uncertainty'
    );
  });

  test('a step from an old pack or an unmigrated file renders no value', () => {
    const step = {
      type: 'measure',
      sid: 'old',
      title: 'Old',
      body: 'Read it.',
      fields: [
        { id: 'a', label: 'A', unit: 'W', hint: '9.33' },
        { id: 'b', label: 'B', unit: 'W', hint: 'from the readout' },
        { id: 'c', label: 'C', unit: 'W', want: '4.2' },
      ],
    };
    const html = stepMarkup(step, markupContext({ steps: [step] }, step)).join(
      ''
    );
    expect(placeholdersIn(html)).toEqual(['', 'from the readout', '']);
  });
});

describe('the rule content/placeholder', () => {
  const measure = (hint, validate) => ({
    type: 'measure',
    fields: [
      { id: 'p', label: 'P', hint },
      { id: 'q', label: 'Q', want: '2' },
    ],
    validate,
  });
  const accepts = v => ({ level: Math.abs(v.p - 9.33) < 0.1 ? 'ok' : 'error' });
  const models = { p: 9.33, q: 2 };

  test('a bare number that the validator accepts fails', () => {
    const found = cueFindings(measure('9.33', accepts), models, ctx);
    expect(found.map(f => f.level)).toEqual(['error']);
  });

  test('a number inside text fails: "e.g. 8.0 ± 0.1" (red before, green after)', () => {
    const step = {
      kind: 'numeric',
      answer: 8.0,
      tolerance: 0.5,
      placeholder: 'e.g. 8.0 ± 0.1',
    };
    expect(cueFindings(step, {}, ctx).map(f => f.level)).toEqual(['error']);
    step.placeholder = 'a value, then ± its uncertainty';
    expect(cueFindings(step, {}, ctx)).toEqual([]);
  });

  test('a number within the tolerance of the answer fails, one outside is reviewed', () => {
    const step = { kind: 'numeric', answer: 634, tolerance: 40 };
    expect(
      cueFindings({ ...step, placeholder: 'e.g. 600 ± 30' }, {}, ctx)[0].level
    ).toBe('error');
    expect(
      cueFindings({ ...step, placeholder: 'about 5000' }, {}, ctx)[0].level
    ).toBe('warn');
  });

  test('a decimal comma and another numeral are read too', () => {
    const step = { kind: 'numeric', answer: 0.91, tolerance: 0.05 };
    expect(
      cueFindings({ ...step, placeholder: 'p. ej. 0,91' }, {}, ctx)[0].level
    ).toBe('error');
    expect(cueFindings({ ...step, placeholder: '٣٫٥' }, {}, ctx)[0].level).toBe(
      'warn'
    );
  });

  test('a cue of words, or no cue, is clean', () => {
    expect(
      cueFindings(measure('from the previous step', accepts), models, ctx)
    ).toEqual([]);
    expect(cueFindings(measure(undefined, accepts), models, ctx)).toEqual([]);
  });

  describe('in the catalog', () => {
    let inputs;
    beforeAll(async () => {
      inputs = await loadAuthoringInputs();
    });
    const placeholderRules = findings =>
      findings.filter(f => f.rule === 'content/placeholder');

    test('a numeric field cue in a core step is caught', () => {
      const tides = inputs.investigations.find(i => i.id === 'tides');
      // The file as it was before the split: the expected value under `hint`.
      const old = f => ({ ...f, hint: f.want, want: undefined });
      const at = tides.steps.findIndex(s => s.fields?.some(f => f.want));
      const draft = {
        ...tides,
        steps: tides.steps.map((s, i) =>
          i === at ? { ...s, fields: s.fields.map(old) } : s
        ),
      };
      const found = placeholderRules(
        checkCatalog({ ...inputs, investigations: [draft] })
      );
      // The Spanish reading of the step is checked too, and carries the same cue.
      expect(found.length).toBe(2 * tides.steps[at].fields.length);
      expect(new Set(found.map(f => f.step))).toEqual(new Set([at]));
      expect(new Set(found.map(f => f.level))).toEqual(new Set(['error']));
    });

    test('a placeholder on a deeper step is caught', async () => {
      const kepler = inputs.investigations.find(i => i.id === 'keplers-laws');
      const laid = layDepth(kepler, await loadDepthSteps('keplers-laws'));
      const steps = laid.steps.map(s => ({ ...s }));
      const at = steps.findIndex(s => s.sid === 'predict-with-an-error-bar');
      expect(steps[at].placeholder).toBeTruthy();
      steps[at].placeholder = 'e.g. 8.0 ± 0.1';
      const found = placeholderRules(
        checkCatalog({ ...inputs, investigations: [{ ...laid, steps }] })
      );
      // The Spanish reading of the same index is checked too, and is not translated here.
      expect(found.map(f => f.step)).toEqual([at, at]);
      expect(found[0].message).toMatch(/holds a value the step accepts/);
    });

    test('the shipped catalog has no finding', () => {
      expect(placeholderRules(checkCatalog(inputs))).toEqual([]);
    });
  });
});

// --- The whole catalog, as rendered -------------------------------------------

/** What the lesson panel needs to draw one step. */
function markupContext(inv, step) {
  return {
    id: `${inv.id ?? 'x'}:${step.sid}`,
    saved: undefined,
    active: inv,
    responses: {},
    visited: new Set(),
    shown: () => inv.steps,
    predictionAnsweredHere: () => false,
    recomputeFields: () => {},
  };
}

/** The placeholder attribute of every text input in a step's markup. */
function placeholdersIn(html) {
  return [...html.matchAll(/<input\b[^>]*>/g)]
    .map(m => /placeholder="([^"]*)"/.exec(m[0])?.[1])
    .filter(p => p !== undefined);
}

describe('every lesson, depth and language', () => {
  const found = { lessons: 0, steps: 0, inputs: 0, leaks: [] };

  beforeAll(async () => {
    // One at a time: a Jest VM loses a module that several import()s link at once.
    for (const { id } of INVESTIGATIONS) {
      for (const locale of ['en', 'es']) {
        let lesson = await loadInvestigation(id, locale);
        if (DEPTH_LESSONS.includes(id))
          lesson = layDepth(lesson, await loadDepthSteps(id, locale));
        found.lessons++;
        for (const step of lesson.steps) {
          found.steps++;
          for (const cue of [
            step.placeholder,
            ...(step.fields ?? []).map(f => f.hint),
          ])
            if (cueText(cue) !== (cue ?? '').trim())
              found.leaks.push(`${locale}:${id}:${step.sid}: ${cue}`);
          if (step.type !== 'measure' && step.kind !== 'numeric') continue;
          const html = stepMarkup(step, markupContext(lesson, step)).join('');
          for (const p of placeholdersIn(html)) {
            found.inputs++;
            // The unit of a numeric box ("g/cm³", "10^11 solar masses") is not a reading.
            const unitless = step.unit ? p.split(step.unit).join('') : p;
            if (/[\p{Nd}\p{No}\p{Nl}]/u.test(unitless))
              found.leaks.push(`rendered ${locale}:${id}:${step.sid}: ${p}`);
          }
        }
      }
    }
  }, 240000);

  test('the catalog was read in full', () => {
    expect(found.lessons).toBe(INVESTIGATIONS.length * 2);
    expect(INVESTIGATIONS).toHaveLength(124);
    expect(found.inputs).toBeGreaterThan(1000);
  });

  test('no field cue, step placeholder or rendered input holds a numeral', () => {
    expect(found.leaks).toEqual([]);
  });

  test('the ten numeric steps with their own cue say the form, in both languages', async () => {
    for (const locale of ['en', 'es']) {
      for (const [id, sid] of [
        ['keplers-laws', 'predict-with-an-error-bar'],
        ['keplers-laws', 'weigh-the-host-star'],
        ['transit-photometry', 'radius-with-an-error-bar'],
        ['transit-photometry', 'forward-model-the-dip'],
        ['weighing-stars', 'weigh-it-with-an-error-bar'],
        ['weighing-stars', 'weigh-one-star-with-an-error-bar'],
        ['missing-mass', 'dark-fraction-with-an-error-bar'],
        ['what-is-a-measurement', 'a-position-with-an-error-bar'],
        ['measuring-the-moon', 'a-diameter-with-an-error-bar'],
        ['weighing-jupiter', 'jupiters-mass'],
      ]) {
        const lesson = layDepth(
          await loadInvestigation(id, locale),
          await loadDepthSteps(id, locale)
        );
        const step = lesson.steps.find(s => s.sid === sid);
        expect(step.placeholder).toMatch(
          locale === 'en'
            ? /^a value, then ± its uncertainty$/
            : /incertidumbre/
        );
      }
    }
  }, 60000);
});
