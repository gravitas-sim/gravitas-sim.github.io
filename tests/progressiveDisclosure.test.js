// =============================================================================
// Task-aware progressive disclosure (Prompt 167)
// -----------------------------------------------------------------------------
// "More" is one pattern (DESIGN_SYSTEM.md): a native <details> that starts shut
// at the survey depths and open at the advanced one, remembered per surface. The
// rule that makes it safe is the task rule: a control that produces a quantity a
// step declares, its unit or its uncertainty is never folded on that step.
//
// The second describe reads every shipped step, at every depth, against the
// rule the instrument panel applies (js/widgets.js toolFold) and the markup the
// lesson panel is built from (js/fragments/lesson.html).
// =============================================================================

import {
  describe,
  expect,
  test,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';
import { readFileSync } from 'node:fs';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import {
  declaredQuantities,
  getWidget,
  toolFold,
  whenWidgetsReady,
} from '../js/widgets.js';
import {
  moreDefault,
  moreOpen,
  rememberMore,
  setMore,
  wireMore,
} from '../js/settingsSchema.js';
import { KEY_DISCLOSURE } from '../js/names.js';
import {
  ASSIGNMENT_KIND,
  buildAssignment,
  validateAssignment,
} from '../js/assignments/assignment.js';
import { assignmentForFormat } from '../js/activities/activities.js';
import { assignmentLink } from '../js/assignments/assignmentLink.js';
import { stepFingerprint } from '../js/investigations/progressBackup.js';
import { archiveOld, run } from './compat/harness.js';

const ids = list => list.map(c => c.id);

describe('when a More starts open', () => {
  beforeEach(() => localStorage.clear());

  test('shut at the survey depths, open at the advanced one', () => {
    expect(moreDefault('core')).toBe(false);
    expect(moreDefault('quantitative')).toBe(false);
    expect(moreDefault('advanced')).toBe(true);
    expect(moreOpen('lesson', undefined)).toBe(false);
    expect(moreOpen('lesson', 'advanced')).toBe(true);
  });

  test('an activity outranks the depth, and what the student chose outranks both', () => {
    expect(moreOpen('lesson', 'core', 'open')).toBe(true);
    expect(moreOpen('lesson', 'advanced', 'shut')).toBe(false);
    expect(moreOpen('lesson', 'core', 'nonsense')).toBe(false);
    rememberMore('lesson', true);
    expect(moreOpen('lesson', 'core', 'shut')).toBe(true);
    rememberMore('lesson', false);
    expect(moreOpen('lesson', 'advanced', 'open')).toBe(false);
  });

  test('is remembered per surface, in one preference, and a damaged one is ignored', () => {
    rememberMore('tool', true);
    expect(JSON.parse(localStorage.getItem(KEY_DISCLOSURE))).toEqual({
      tool: 1,
    });
    expect(moreOpen('lesson', 'core')).toBe(false);
    expect(moreOpen('tool', 'core')).toBe(true);
    localStorage.setItem(KEY_DISCLOSURE, '[1,2');
    expect(moreOpen('tool', 'advanced')).toBe(true);
    localStorage.setItem(KEY_DISCLOSURE, '[1]');
    expect(moreOpen('tool', 'core')).toBe(false);
  });
});

describe('wiring a details element', () => {
  beforeEach(() => localStorage.clear());
  const make = () => {
    document.body.innerHTML =
      '<details class="more"><summary><span class="gs-en">More</span>' +
      '<span class="gs-es">Más</span></summary><p>x</p></details>';
    return document.querySelector('details');
  };
  const press = (details, open) => {
    details.open = open;
    details.dispatchEvent(new Event('toggle'));
  };

  test('sets the starting state and says nothing about it', () => {
    const said = [];
    const d = make();
    wireMore(d, 'lesson', { depth: 'advanced', say: m => said.push(m) });
    expect(d.open).toBe(true);
    d.dispatchEvent(new Event('toggle'));
    expect(said).toEqual([]);
    expect(localStorage.getItem(KEY_DISCLOSURE)).toBeNull();
  });

  test('a press is remembered and announced once, in the language in use', () => {
    const said = [];
    const d = make();
    wireMore(d, 'lesson', {
      say: m => said.push(m),
      locale: () => 'es',
    });
    press(d, true);
    press(d, true);
    expect(said).toEqual(['Se muestra: Más.']);
    press(d, false);
    expect(said.at(-1)).toBe('Se oculta: Más.');
    expect(moreOpen('lesson', 'advanced')).toBe(false);
  });

  test('wiring again re-applies the state and adds no second listener', () => {
    const said = [];
    const d = make();
    const how = { say: m => said.push(m) };
    wireMore(d, 'lesson', how);
    wireMore(d, 'lesson', { ...how, depth: 'advanced' });
    expect(d.open).toBe(true);
    press(d, false);
    expect(said).toEqual(['More hidden.']);
  });

  test('a program that opens it for its own reason is neither remembered nor announced', () => {
    const said = [];
    const d = make();
    wireMore(d, 'settings', { say: m => said.push(m) });
    setMore(d, true);
    d.dispatchEvent(new Event('toggle'));
    expect(said).toEqual([]);
    expect(localStorage.getItem(KEY_DISCLOSURE)).toBeNull();
  });
});

describe('the rule an instrument panel folds by', () => {
  const controls = ['a', 'b', 'c'].map(id => ({ id }));

  test('a step that reads keeps the first slider and folds the rest and the presets', () => {
    const f = toolFold({ type: 'read' }, controls);
    expect(ids(f.open)).toEqual(['a']);
    expect(ids(f.folded)).toEqual(['b', 'c']);
    expect(f.presets).toBe(true);
  });

  test('a question with no number folds the presets only', () => {
    const f = toolFold({ type: 'question', kind: 'choice' }, controls);
    expect(ids(f.open)).toEqual(['a', 'b', 'c']);
    expect(f.presets).toBe(true);
  });

  test('a step that declares a quantity, measures or explores folds nothing', () => {
    for (const step of [
      { type: 'read', probe: () => [] },
      { type: 'question', kind: 'numeric', unit: 'AU' },
      { type: 'question', fields: [{ id: 'x', unit: 'km/s' }] },
      { type: 'measure' },
      { type: 'explore' },
      { type: 'predict', tolerance: 0.1 },
    ]) {
      const f = toolFold(step, controls);
      expect(ids(f.open)).toEqual(['a', 'b', 'c']);
      expect(f.folded).toEqual([]);
      expect(f.presets).toBe(false);
    }
  });

  test('declares each field with its unit, a numeric answer with its unit and the named readout', () => {
    expect(
      declaredQuantities({
        fields: [
          { id: 'v', unit: 'km/s' },
          { id: 'e', unit: '' },
        ],
        kind: 'numeric',
        unit: 'AU',
        probe: () => [],
      })
    ).toEqual(['v (km/s)', 'e', '(AU)', 'probe']);
    expect(declaredQuantities({ type: 'read' })).toEqual([]);
  });
});

describe('the task rule on every shipped step', () => {
  const lessons = INVESTIGATIONS.map(withAllDepths);
  const steps = lessons.flatMap(l => l.steps.map(s => [l.id, s]));
  let toolSteps = [];

  beforeAll(async () => {
    expect(await whenWidgetsReady()).toBe(true);
    toolSteps = steps.filter(([, s]) => s.tool);
  }, 60000);

  test('reads the shipped lessons: sixty lessons, more than a thousand steps', () => {
    expect(lessons.length).toBeGreaterThanOrEqual(60);
    expect(steps.length).toBeGreaterThan(1000);
    expect(toolSteps.length).toBeGreaterThan(500);
  });

  test('every instrument step: nothing it asks about is folded, nothing is lost', () => {
    const broken = [];
    let folds = 0;
    for (const [lesson, step] of toolSteps) {
      const widget = getWidget(step.tool.id);
      if (!widget) {
        broken.push(`${lesson}/${step.sid}: no widget ${step.tool.id}`);
        continue;
      }
      const shown = widget.controls.filter(
        c => !step.tool.hide?.includes(c.id)
      );
      const f = toolFold(step, shown);
      const asks =
        declaredQuantities(step).length > 0 ||
        step.type === 'measure' ||
        step.type === 'explore';
      if (asks && (f.folded.length || f.presets))
        broken.push(`${lesson}/${step.sid}: folds on a step that asks`);
      if (ids(f.open).concat(ids(f.folded)).join() !== ids(shown).join())
        broken.push(`${lesson}/${step.sid}: a control was lost`);
      if (shown.length && !f.open.length)
        broken.push(`${lesson}/${step.sid}: no control left visible`);
      if (f.folded.length || f.presets) folds++;
    }
    expect(broken).toEqual([]);
    // Some steps fold (the rule is not vacuous) and most do not (it is cautious).
    expect(folds).toBeGreaterThan(50);
    expect(folds).toBeLessThan(toolSteps.length / 2);
  });

  test('every step that names a unit or a field declares it', () => {
    const missing = [];
    for (const [lesson, step] of steps) {
      for (const f of step.fields || []) {
        const want = f.unit ? `${f.id} (${f.unit})` : f.id;
        if (!declaredQuantities(step).includes(want))
          missing.push(`${lesson}/${step.sid}: ${want}`);
      }
      if (
        step.unit &&
        !declaredQuantities(step).some(q => q.includes(step.unit))
      )
        missing.push(`${lesson}/${step.sid}: unit ${step.unit}`);
    }
    expect(missing).toEqual([]);
  });

  test('a lesson plot declares its axes, so the plot options never fold on it', () => {
    for (const [lesson, step] of steps.filter(([, s]) => s.plot)) {
      expect({ lesson, sid: step.sid, asks: declaredQuantities(step) }).toEqual(
        {
          lesson,
          sid: step.sid,
          asks: expect.arrayContaining(['plot']),
        }
      );
    }
  });
});

describe('the lesson panel keeps what a student works in and folds the rest', () => {
  beforeEach(() => {
    document.body.innerHTML = readFileSync(
      new URL('../js/fragments/lesson.html', import.meta.url),
      'utf8'
    );
  });
  const more = () => document.getElementById('investigationMore');

  test('help, depth switching, the progress backup and Restart fold', () => {
    for (const id of [
      'investigationHelp',
      'investigationDepth',
      'investigationBackupDownload',
      'investigationBackupRestore',
      'investigationReset',
    ])
      expect(more().contains(document.getElementById(id))).toBe(true);
    expect(more().tagName).toBe('DETAILS');
    expect(more().hasAttribute('open')).toBe(false);
  });

  test('the step, its answers, Back and Next, the reset of the scenario and the save status stay out', () => {
    for (const id of [
      'investigationBody',
      'investigationProbeWrap',
      'investigationPrev',
      'investigationNext',
      'investigationResetScenario',
      'investigationSaveStatus',
      'investigationProgressNotice',
      'investigationClose',
    ])
      expect(more().contains(document.getElementById(id))).toBe(false);
  });

  test("an instrument's explainer stays in its header, and its More starts hidden", () => {
    const explain = document.getElementById('investigationToolExplain');
    expect(explain.closest('header')).not.toBeNull();
    expect(
      document.getElementById('investigationToolMore').contains(explain)
    ).toBe(false);
    expect(document.getElementById('investigationToolMore').hidden).toBe(true);
  });
});

describe('an activity chooses whether the sections start open (mo)', () => {
  const lesson = INVESTIGATIONS.find(i => i.id === 'orbital-energy');
  const sid = lesson.steps[0].sid;
  const common = {
    lesson,
    chosen: [sid],
    title: 'Energy',
    id: 'p167fixed',
    now: new Date('2026-10-21T00:00:00Z'),
    fingerprint: stepFingerprint,
  };
  const payload = extra => ({
    k: ASSIGNMENT_KIND,
    v: 1,
    i: 'p167note',
    l: lesson.id,
    t: 'Energy',
    n: '',
    s: [sid],
    c: '2026-10-21',
    ...extra,
  });

  test('is written only when set: every other payload is what it was', () => {
    expect('mo' in buildAssignment(common)).toBe(false);
    expect('mo' in buildAssignment({ ...common, more: 'sometimes' })).toBe(
      false
    );
    const open = buildAssignment({ ...common, more: 'open' });
    const { mo, ...rest } = open;
    expect(mo).toBe('open');
    expect(rest).toEqual(buildAssignment(common));
    expect(buildAssignment({ ...common, more: 'shut' }).mo).toBe('shut');
  });

  test('is validated: open or shut, anything else is refused by name', () => {
    for (const ok of ['open', 'shut'])
      expect(validateAssignment(payload({ mo: ok })).ok).toBe(true);
    for (const bad of [0, 1, true, 'yes', null, ''])
      expect(validateAssignment(payload({ mo: bad }))).toMatchObject({
        ok: false,
        reason: 'badMore',
      });
  });

  test('an activity that says more builds one; one that does not, does not', () => {
    const format = { id: 'f', assignmentId: 'p167act', steps: [sid] };
    const act = extra => ({ id: 'x', ...extra });
    expect(
      assignmentForFormat(lesson, act({ more: 'open' }), format).assignment.mo
    ).toBe('open');
    expect(
      'mo' in assignmentForFormat(lesson, act({}), format).assignment
    ).toBe(false);
  });

  describe('the 2.0.0 reader', () => {
    let old;
    beforeAll(() => {
      old = archiveOld();
    });
    afterAll(() => old?.cleanup());

    test('opens a link that carries it and keeps the steps', async () => {
      const a = payload({ mo: 'shut' });
      const { fragment } = await assignmentLink(a, 'https://example.test/');
      const got = run(old.tree, 'assignment-link', 'read', { fragment }).value;
      expect(got.accepted).toBe(true);
      expect(got.value.s).toEqual(a.s);
    });
  });
});
