import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { loadAuthoringInputs } from '../tools/authoring/inputs.mjs';
import {
  checkCatalogue,
  RULE_INDEX,
  PROBE_CONTEXT_KEYS,
} from '../js/authoring/rules.js';

// =============================================================================
// The authoring checker
// -----------------------------------------------------------------------------
// Two halves, and the second is the one that matters.
//
// The first asserts the catalogue is clean, which is what `npm run author:check`
// tells an author. The second breaks a lesson on purpose, one fault at a time,
// and asserts the specific rule that should catch it does. A checker nobody has
// watched fail is a checker that reports zero because it is looking at nothing,
// and every rule below was written after watching this file catch it.
// =============================================================================

let inputs;

beforeAll(async () => {
  inputs = await loadAuthoringInputs();
});

/** A copy deep enough to break, shallow enough to keep the closures. */
function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = clone(v);
    return out;
  }
  return value;
}

/** The catalogue, with one lesson replaced by a mutated copy of itself. */
function mutated(lessonId, mutate) {
  const copy = { ...inputs };
  copy.investigations = inputs.investigations.map(inv => {
    if (inv.id !== lessonId) return inv;
    const draft = clone(inv);
    mutate(draft);
    return draft;
  });
  return copy;
}

const rulesFired = findings => new Set(findings.map(f => f.rule));

/** Run the checker over a mutated catalogue and return the rules it raised. */
function rulesAfter(lessonId, mutate) {
  return rulesFired(checkCatalogue(mutated(lessonId, mutate)));
}

describe('the catalogue as it stands', () => {
  test('every lesson and every step passes', () => {
    const errors = checkCatalogue(inputs).filter(f => f.level === 'error');
    // Printed rather than counted, so a failure says what is wrong with the
    // lesson instead of that a number changed.
    expect(
      errors.map(e => `${e.lesson} step ${e.step + 1} [${e.rule}] ${e.message}`)
    ).toEqual([]);
  });

  test('the whole catalogue is covered', () => {
    expect(inputs.investigations).toHaveLength(12);
    const steps = inputs.investigations.reduce((n, i) => n + i.steps.length, 0);
    expect(steps).toBe(370);
  });

  test('every rule the index describes is a rule the engine can raise', () => {
    // Both directions. An unraisable rule is documentation of something that
    // does not happen; a raisable rule missing from the index is a finding an
    // author cannot look up.
    const source = readFileSync('js/authoring/rules.js', 'utf8');
    for (const id of Object.keys(RULE_INDEX)) {
      expect(source.includes(`'${id}'`)).toBe(true);
    }
    const raised = [
      ...source.matchAll(/[EW]\('([a-z]+\/[a-zA-Z]+)'/g),
      ...source.matchAll(
        /(?:err|warn|add)\(\s*(?:'[a-z]+',\s*)?'([a-z]+\/[a-zA-Z]+)'/g
      ),
    ].map(m => m[1]);
    for (const id of new Set(raised)) {
      expect(Object.keys(RULE_INDEX)).toContain(id);
    }
  });
});

describe('the probe stub keeps up with the engine', () => {
  test('it offers everything the engine puts in a probe context', () => {
    // The stub in rules.mjs stands in for the object js/investigations.js hands
    // a probe. When the engine grows a member, a probe that uses it would be
    // reported as broken - so the stub is checked against the engine's source
    // rather than trusted to have been updated.
    const engine = readFileSync('js/investigations.js', 'utf8');
    const start = engine.indexOf('  return {\n    selected,');
    expect(start).toBeGreaterThan(-1);
    const block = engine.slice(start, engine.indexOf('\n}', start));
    const members = [...block.matchAll(/^ {4}([a-zA-Z_][\w]*)[:,]/gm)].map(
      m => m[1]
    );
    expect(members.length).toBeGreaterThan(10);
    const missing = members.filter(m => !PROBE_CONTEXT_KEYS.includes(m));
    expect(missing).toEqual([]);
  });
});

describe('it catches a broken identity', () => {
  test('a lesson with no id', () => {
    expect(rulesAfter('tides', l => delete l.id)).toContain('id/lesson');
  });

  test('a lesson id that is not kebab-case', () => {
    expect(rulesAfter('tides', l => (l.id = 'Tides Lesson'))).toContain(
      'id/lesson'
    );
  });

  test('two lessons sharing an id', () => {
    expect(rulesAfter('tides', l => (l.id = 'keplers-laws'))).toContain(
      'id/lesson'
    );
  });

  test('two response fields sharing an id', () => {
    const rules = rulesAfter('tides', l => {
      const s = l.steps.find(s => s.fields?.length > 1);
      s.fields[1].id = s.fields[0].id;
    });
    expect(rules).toContain('id/field');
  });
});

describe('it catches missing content', () => {
  test.each([
    ['title', 'content/lesson'],
    ['summary', 'content/lesson'],
    ['duration', 'content/lesson'],
    ['thumbnail', 'content/lesson'],
  ])('a lesson with no %s', (key, rule) => {
    expect(rulesAfter('tides', l => delete l[key])).toContain(rule);
  });

  test('a lesson with no objectives', () => {
    expect(rulesAfter('tides', l => (l.objectives = []))).toContain(
      'content/objectives'
    );
  });

  test('a step with no title', () => {
    expect(rulesAfter('tides', l => delete l.steps[3].title)).toContain(
      'content/step'
    );
  });

  test('a question that asks nothing', () => {
    const rules = rulesAfter('tides', l => {
      delete l.steps.find(s => s.type === 'question').prompt;
    });
    expect(rules).toContain('content/prompt');
  });

  test('a lesson that stops without closing', () => {
    expect(rulesAfter('tides', l => delete l.steps.at(-1).body)).toContain(
      'content/completion'
    );
  });
});

describe('it catches a reference to something that does not exist', () => {
  test('a scenario that was renamed', () => {
    const rules = rulesAfter('tides', l => {
      l.steps.find(s => s.setup?.scenario).setup.scenario = 'Earth-Moon Sytem';
    });
    expect(rules).toContain('ref/scenario');
  });

  test('a widget that was removed', () => {
    const rules = rulesAfter('tides', l => {
      l.steps.find(s => s.tool).tool.id = 'tide-strenght';
    });
    expect(rules).toContain('ref/widget');
  });

  test('a control the widget does not have', () => {
    const rules = rulesAfter('tides', l => {
      const s = l.steps.find(s => s.tool?.values);
      s.tool.values.notAControl = 1;
    });
    expect(rules).toContain('ref/control');
  });

  test('hiding a control the widget does not have', () => {
    const rules = rulesAfter('tides', l => {
      const s = l.steps.find(s => s.tool?.hide);
      s.tool.hide.push('notAControl');
    });
    expect(rules).toContain('ref/control');
  });

  test('a setting that is not a setting', () => {
    const rules = rulesAfter('goldilocks-question', l => {
      const s = l.steps.find(s => s.setup?.settings);
      s.setup.settings.habitable_zone_optimisim = 1;
    });
    expect(rules).toContain('ref/setting');
  });

  test('a probe that throws before anything is selected', () => {
    const rules = rulesAfter('tides', l => {
      l.steps[0].probe = ctx => [{ label: ctx.selected.name, value: '-' }];
    });
    expect(rules).toContain('ref/probe');
  });

  test('a probe that is not a function', () => {
    const rules = rulesAfter('tides', l => (l.steps[0].probe = 'the distance'));
    expect(rules).toContain('ref/probe');
  });
});

describe('it catches an impossible setup', () => {
  test('a control target outside the slider range', () => {
    const rules = rulesAfter('tides', l => {
      const s = l.steps.find(s => s.tool?.values);
      const key = Object.keys(s.tool.values)[0];
      s.tool.values[key] = 1e9;
    });
    expect(rules).toContain('setup/value');
  });

  test('a camera that cannot be pointed', () => {
    const rules = rulesAfter('tides', l => {
      l.steps.find(s => s.setup).setup.camera = { zoom: 0 };
    });
    expect(rules).toContain('setup/camera');
  });
});

describe('it catches a broken answer', () => {
  test('a choice whose answer is off the end of the options', () => {
    const rules = rulesAfter('tides', l => {
      const s = l.steps.find(s => s.kind === 'choice');
      s.answer = s.options.length;
    });
    expect(rules).toContain('answer/shape');
  });

  test('a choice with a repeated option', () => {
    const rules = rulesAfter('tides', l => {
      const s = l.steps.find(s => s.kind === 'choice');
      s.options[1] = s.options[0];
    });
    expect(rules).toContain('answer/options');
  });

  test('a numeric answer that is not a number', () => {
    const rules = rulesAfter('tides', l => {
      l.steps.find(s => s.kind === 'numeric').answer = 'about nine';
    });
    expect(rules).toContain('answer/shape');
  });

  test('a tolerance of zero, which grades nothing', () => {
    const rules = rulesAfter('tides', l => {
      l.steps.find(s => s.kind === 'numeric').tolerance = 0;
    });
    expect(rules).toContain('answer/tolerance');
  });

  test('a negative tolerance', () => {
    const rules = rulesAfter('tides', l => {
      l.steps.find(s => s.kind === 'numeric').tolerance = -2;
    });
    expect(rules).toContain('answer/tolerance');
  });

  test('a tolerance so wide the question is not asked', () => {
    const rules = rulesAfter('tides', l => {
      const s = l.steps.find(s => s.kind === 'numeric' && s.answer !== 0);
      s.tolerance = Math.abs(s.answer);
    });
    expect(rules).toContain('answer/tolerance');
  });

  test('a short answer with no rubric for the instructor', () => {
    const rules = rulesAfter('tides', l => {
      delete l.steps.find(s => s.kind === 'short').rubric;
    });
    expect(rules).toContain('answer/rubric');
  });

  test('a graded choice that explains nothing afterwards', () => {
    const rules = rulesAfter('tides', l => {
      delete l.steps.find(s => s.type === 'predict').because;
    });
    expect(rules).toContain('content/prompt');
  });
});

describe('it catches an interaction that cannot be completed', () => {
  test("a validator that rejects the author's own hint values", () => {
    const rules = rulesAfter('tides', l => {
      const s = l.steps.find(s => s.validate && s.fields?.some(f => f.hint));
      s.validate = () => ({ level: 'error', message: 'never right' });
    });
    expect(rules).toContain('interaction/validate');
  });

  test('a validator that throws before anything is typed', () => {
    const rules = rulesAfter('tides', l => {
      const s = l.steps.find(s => s.validate);
      s.validate = v => ({ level: v.nothing.here, message: '' });
    });
    expect(rules).toContain('ref/field');
  });

  test('a computed field that throws on the values the step suggests', () => {
    const rules = rulesAfter('tides', l => {
      const s = l.steps.find(s => s.fields?.some(f => f.hint));
      s.fields.push({
        id: 'boom',
        label: 'Boom',
        compute: v => v.missing.deeper,
      });
    });
    expect(rules).toContain('interaction/compute');
  });

  test('a computed field reading a field measured on an earlier step', () => {
    // The one this rule was written for. Retrograde Motion had three of these
    // and they were invisible: the arithmetic is correct, the field ids are
    // real, and they are real on the wrong step - so every box stayed blank
    // and nothing said why. The browser walker found it; this catches it in a
    // second and a half.
    const rules = rulesAfter('tides', l => {
      const s = l.steps.find(s => s.fields?.length);
      s.fields.push({
        id: 'derived',
        label: 'Derived',
        compute: v => v.measuredOnAnotherStep * 2,
      });
    });
    expect(rules).toContain('ref/field');
  });

  test('an empty checklist, which asks a student to do nothing', () => {
    const rules = rulesAfter('tides', l => {
      l.steps.find(s => s.checklist).checklist = [];
    });
    expect(rules).toContain('interaction/checklist');
  });
});

describe('it catches a translation that has come adrift', () => {
  function withTranslation(lessonId, mutate) {
    const copy = { ...inputs, translations: { ...inputs.translations } };
    copy.translations.es = { ...inputs.translations.es };
    const draft = clone(inputs.translations.es[lessonId].data);
    mutate(draft);
    copy.translations.es[lessonId] = {
      ...inputs.translations.es[lessonId],
      data: draft,
    };
    return rulesFired(checkCatalogue(copy));
  }

  test('a key the English lesson does not have, which is silently dropped', () => {
    const rules = withTranslation('tides', t => {
      t.sumary = 'Un resumen mal escrito';
    });
    expect(rules).toContain('i18n/shape');
  });

  test('a mistyped key inside a step', () => {
    const rules = withTranslation('tides', t => {
      t.steps[0].titel = 'Título';
    });
    expect(rules).toContain('i18n/shape');
  });

  test('more options than the English has', () => {
    const rules = withTranslation('tides', t => {
      const i = t.steps.findIndex(s => s?.options);
      t.steps[i].options.push('una opción de más');
    });
    expect(rules).toContain('i18n/shape');
  });

  test('a translation that moves an answer', () => {
    const rules = withTranslation('tides', t => {
      const i = t.steps.findIndex(s => s?.options);
      t.steps[i].answer = 0;
    });
    expect(rules).toContain('i18n/machinery');
  });
});

describe('it catches missing instructor material', () => {
  test('a lesson with no guidance at all', () => {
    const copy = { ...inputs, instructor: { ...inputs.instructor } };
    delete copy.instructor.tides;
    expect(rulesFired(checkCatalogue(copy))).toContain('instructor/present');
  });

  test('an empty guide section', () => {
    const copy = { ...inputs, instructor: { ...inputs.instructor } };
    copy.instructor.tides = { ...copy.instructor.tides, misconceptions: [] };
    expect(rulesFired(checkCatalogue(copy))).toContain('instructor/sections');
  });

  test('an expectation pointing past the end of the lesson', () => {
    const copy = { ...inputs, instructor: { ...inputs.instructor } };
    copy.instructor.tides = {
      ...copy.instructor.tides,
      expectations: { ...copy.instructor.tides.expectations, 999: 'stale' },
    };
    expect(rulesFired(checkCatalogue(copy))).toContain(
      'instructor/expectations'
    );
  });

  test('guidance for a lesson that no longer exists', () => {
    const copy = { ...inputs, instructor: { ...inputs.instructor } };
    copy.instructor['deleted-lesson'] = { topic: 'x' };
    expect(rulesFired(checkCatalogue(copy))).toContain('agree/instructorIds');
  });

  test('an unattributed quotation', () => {
    const rules = rulesAfter('keplers-laws', l => {
      delete l.steps.find(s => s.quote).quote.by;
    });
    expect(rules).toContain('instructor/attribution');
  });
});

describe('it catches artifacts that disagree', () => {
  test('a manifest title that is not the lesson title', () => {
    const copy = { ...inputs, manifests: { ...inputs.manifests } };
    copy.manifests.en = inputs.manifests.en.map(m =>
      m.id === 'tides' ? { ...m, title: 'Tides (old name)' } : m
    );
    expect(rulesFired(checkCatalogue(copy))).toContain('agree/manifest');
  });

  test('a manifest step count that is out of date', () => {
    const copy = { ...inputs, manifests: { ...inputs.manifests } };
    copy.manifests.en = inputs.manifests.en.map(m =>
      m.id === 'tides' ? { ...m, stepCount: m.stepCount + 1 } : m
    );
    expect(rulesFired(checkCatalogue(copy))).toContain('agree/counts');
  });

  test('a lesson missing from the manifest', () => {
    const copy = { ...inputs, manifests: { ...inputs.manifests } };
    copy.manifests.en = inputs.manifests.en.filter(m => m.id !== 'tides');
    expect(rulesFired(checkCatalogue(copy))).toContain('agree/manifest');
  });

  test('an answer key that no longer verifies', () => {
    // verifyKey is the site's own rule, imported rather than restated: an
    // answer key that disagrees with the site is a class marked wrong.
    const rules = rulesAfter('tides', l => {
      const s = l.steps.find(s => s.kind === 'numeric');
      s.tolerance = Number.NaN;
    });
    expect(rules).toContain('agree/answerKey');
  });
});
