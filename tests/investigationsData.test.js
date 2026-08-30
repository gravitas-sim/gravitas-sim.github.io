import { describe, test, expect } from '@jest/globals';
import {
  INVESTIGATIONS,
  getInvestigation,
  gradedSteps,
} from '../js/data/investigations.js';
import { getWidget } from '../js/widgets.js';

const STEP_TYPES = new Set([
  'read',
  'predict',
  'explore',
  'measure',
  'question',
  'ellipse',
  'wedges',
]);

/** The context a probe or an import is handed by the engine, stubbed. */
const stubContext = () => ({
  selected: null,
  bodies: [],
  G: 1,
  elements: () => null,
  energy: () => null,
  distance: v => `${v} u`,
  speed: v => `${v} u`,
  time: v => `${v} t`,
  mass: v => `${v} u`,
  years: v => v,
  au: v => v * 0.01,
  flux: () => 1,
  days: () => 0,
  observerAngle: () => 0,
  // No transits recorded yet: the state a step is in the moment it opens.
  photometry: () => ({
    baseline: 1,
    transits: [],
    seen: 0,
    log: [],
    last: null,
  }),
  find: () => null,
});

/** The same context once a couple of transits have gone past. */
const withTransits = () => {
  const log = [
    { seq: 1, mid: 0.8802, bottom: 0.981733, depth: 0.018332, duration: 0.14 },
    { seq: 2, mid: 4.4055, bottom: 0.981731, depth: 0.018334, duration: 0.14 },
  ];
  return {
    ...stubContext(),
    photometry: () => ({
      baseline: 1.000065,
      transits: log,
      seen: 2,
      log,
      last: log[1],
    }),
  };
};

describe('every lesson', () => {
  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s is well formed',
    (id, inv) => {
      expect(inv.title).toBeTruthy();
      expect(inv.subtitle).toBeTruthy();
      expect(inv.summary).toBeTruthy();
      expect(inv.objectives.length).toBeGreaterThan(0);
      expect(inv.steps.length).toBeGreaterThan(0);
      for (const [i, step] of inv.steps.entries()) {
        expect(STEP_TYPES.has(step.type)).toBe(true);
        expect(typeof step.title).toBe('string');
        expect(step.title.length).toBeGreaterThan(0);
        expect(typeof step.body).toBe('string');
        // A choice or prediction with an answer outside its own option list
        // marks every student wrong and gives no way to notice.
        if (step.options) {
          expect(step.answer).toBeGreaterThanOrEqual(0);
          expect(step.answer).toBeLessThan(step.options.length);
          expect(step.prompt).toBeTruthy();
        }
        if (step.kind === 'numeric') {
          expect(Number.isFinite(step.answer)).toBe(true);
          expect(step.tolerance).toBeGreaterThan(0);
        }
        if (step.kind === 'short') expect(step.rubric).toBeTruthy();
        if (step.type === 'measure') {
          expect(step.fields.length).toBeGreaterThan(0);
          const ids = step.fields.map(f => f.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
        expect(i).toBeGreaterThanOrEqual(0);
      }
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s uses only markup the panel renders',
    (id, inv) => {
      // prose() re-admits exactly these four; anything else reaches the screen
      // as visible angle brackets.
      const allowed = /<\/?(strong|em|sub|sup)>/g;
      for (const step of inv.steps) {
        const text = [step.body, step.tip, step.prompt, step.because]
          .filter(Boolean)
          .join(' ')
          .replace(allowed, '');
        expect(text).not.toMatch(/<[a-z/]/i);
      }
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s credits every figure it uses',
    (id, inv) => {
      for (const step of inv.steps) {
        if (!step.figure) continue;
        const f = step.figure;
        // These are other people's photographs. Shipping one without its
        // author and licence is a licence breach, not a formatting slip.
        expect(f.src).toMatch(/^images\/[\w.-]+$/);
        expect(f.alt.length).toBeGreaterThan(30);
        expect(f.caption).toBeTruthy();
        expect(f.author).toBeTruthy();
        expect(f.license).toBeTruthy();
        expect(f.licenseUrl).toMatch(/^https:\/\//);
        expect(f.source).toMatch(/^https:\/\//);
      }
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s names only widgets that exist',
    (id, inv) => {
      for (const step of inv.steps) {
        if (!step.tool) continue;
        expect(getWidget(step.tool.id)).toBeTruthy();
      }
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s has probes and imports that survive an empty simulation',
    (id, inv) => {
      const ctx = stubContext();
      for (const step of inv.steps) {
        if (step.probe) expect(() => step.probe(ctx)).not.toThrow();
        if (step.importFromSelection) {
          expect(() => step.importFromSelection(ctx)).not.toThrow();
        }
      }
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s computes and validates without throwing on blanks',
    (id, inv) => {
      for (const step of inv.steps) {
        if (step.type !== 'measure') continue;
        const blank = {};
        for (const f of step.fields) blank[f.id] = NaN;
        for (const f of step.fields) {
          if (f.compute) expect(() => f.compute(blank)).not.toThrow();
        }
        if (step.validate) {
          expect(() => step.validate(blank, stubContext())).not.toThrow();
        }
      }
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s pairs import buttons with row groups of the right width',
    (id, inv) => {
      for (const step of inv.steps) {
        if (!step.importFromSelection) continue;
        expect(Array.isArray(step.importGroups)).toBe(true);
        expect(step.importGroups.length).toBeGreaterThan(0);
        const known = new Set(step.fields.map(f => f.id));
        // Every row takes the same shape, because the import fills whichever
        // row is empty and has no way to adapt to a shorter one.
        const width = step.importGroups[0].length;
        for (const group of step.importGroups) {
          expect(group.length).toBe(width);
          for (const fid of group) expect(known.has(fid)).toBe(true);
        }
      }
    }
  );
});

describe('reading a recorded light curve', () => {
  const inv = getInvestigation('transit-photometry');
  const stepFor = title => inv.steps.find(s => s.title === title);

  test('every photometry step reports nothing rather than throwing when empty', () => {
    for (const step of inv.steps) {
      if (!step.importFromSelection) continue;
      expect(step.importFromSelection(stubContext())).toBeFalsy();
    }
  });

  test('the depth step copies the baseline and the bottom in one press', () => {
    const step = stepFor('Measure the dip');
    const values = step.importFromSelection(withTransits());
    expect(values).toHaveLength(2);
    expect(Number(values[0])).toBeCloseTo(1.000065, 5);
    expect(Number(values[1])).toBeCloseTo(0.981733, 5);
    // One press has to fill both fields: the row is the pair.
    expect(step.importGroups).toEqual([['base', 'bot']]);
  });

  test('the timing step records the most recent transit and its number', () => {
    const step = stepFor('Time two transits');
    const values = step.importFromSelection(withTransits());
    expect(Number(values[0])).toBeCloseTo(4.4055, 4);
    expect(Number(values[1])).toBe(2);
    expect(step.importGroups).toEqual([
      ['t1', 'n1'],
      ['t2', 'n2'],
    ]);
  });

  test('the timing step names the off-by-one in the orbit count', () => {
    const step = stepFor('Time two transits');
    const run = v => {
      const vals = { ...v };
      for (const f of step.fields) if (f.compute) vals[f.id] = f.compute(vals);
      return step.validate(vals, stubContext());
    };
    // Transit 2 to transit 5 is three orbits, not four.
    const wrong = run({ t1: 4.4055, n1: 2, t2: 14.98, n2: 5, n: 4 });
    expect(wrong.level).toBe('warn');
    expect(wrong.message).toMatch(/3<\/strong> times/);
    expect(run({ t1: 4.4055, n1: 2, t2: 14.98, n2: 5, n: 3 }).level).toBe('ok');
    // A student who types the times by hand and leaves the numbers blank is
    // not nagged about a count nobody recorded.
    expect(run({ t1: 0.88, t2: 4.4055, n: 1 }).level).toBe('ok');
  });

  test('the blended step copies the depth it just measured', () => {
    const step = stepFor('Recover the real planet');
    const values = step.importFromSelection(withTransits());
    expect(Number(values[0])).toBeCloseTo(0.018334, 5);
  });

  test('the readouts render with and without transits', () => {
    for (const step of inv.steps) {
      if (!step.probe) continue;
      for (const ctx of [stubContext(), withTransits()]) {
        const rows = step.probe(ctx);
        expect(rows.length).toBeGreaterThan(0);
        for (const r of rows)
          expect(String(r.value)).not.toMatch(/NaN|undefined/);
      }
    }
  });
});

describe('lookups', () => {
  test('finds a lesson by id and returns undefined otherwise', () => {
    expect(getInvestigation('transit-photometry').title).toBeTruthy();
    expect(getInvestigation('nope')).toBeUndefined();
  });

  test('graded steps exclude the reading', () => {
    const inv = getInvestigation('transit-photometry');
    const graded = gradedSteps(inv);
    expect(graded.length).toBeGreaterThan(0);
    expect(graded.some(s => s.type === 'read')).toBe(false);
  });
});

describe('the transit lesson', () => {
  const inv = getInvestigation('transit-photometry');
  const stepFor = title => inv.steps.find(s => s.title === title);
  const run = (step, values) => {
    const v = { ...values };
    for (const f of step.fields) if (f.compute) v[f.id] = f.compute(v);
    return { values: v, check: step.validate(v, stubContext()) };
  };

  test('is the length of a full laboratory session', () => {
    expect(inv.steps.length).toBeGreaterThanOrEqual(24);
  });

  test('the measured depth gives the published planet radius', () => {
    // 1.8333% is what the Transit Lab scenario actually produces.
    const { values, check } = run(
      stepFor('Correct it, and get a real radius'),
      {
        d2: 0.018333,
        rstar: 1.155,
      }
    );
    expect(values.rp_rj).toBeCloseTo(1.38, 1);
    expect(values.rp_re).toBeGreaterThan(15);
    expect(values.rp_re).toBeLessThan(16);
    expect(check.level).toBe('ok');
  });

  test('catches a depth entered as a percentage', () => {
    const { check } = run(stepFor('Correct it, and get a real radius'), {
      d2: 1.8333,
      rstar: 1.155,
    });
    expect(check.level).toBe('error');
    expect(check.message).toMatch(/fraction/);
  });

  test('two transits give the published period', () => {
    const step = stepFor('Time two transits');
    expect(run(step, { t1: 0.88, t2: 4.4055, n: 1 }).check.level).toBe('ok');
    // Ten orbits apart, which is the point the step is making about precision.
    expect(run(step, { t1: 0.88, t2: 36.13, n: 10 }).check.level).toBe('ok');
  });

  test('spots a skipped transit rather than accepting double the period', () => {
    const { check } = run(stepFor('Time two transits'), {
      t1: 0.88,
      t2: 7.931,
      n: 1,
    });
    expect(check.level).toBe('warn');
    expect(check.message).toMatch(/twice the period/);
  });

  test('spots a secondary eclipse timed as a transit', () => {
    const { check } = run(stepFor('Time two transits'), {
      t1: 0.88,
      t2: 2.64,
      n: 1,
    });
    expect(check.message).toMatch(/half the period/);
  });

  test('the period gives the published orbit and temperature', () => {
    const { values, check } = run(stepFor('From a period to an orbit'), {
      P_d: 3.5247,
      M: 1.148,
    });
    expect(values.a_au).toBeCloseTo(0.0475, 3);
    expect(values.a_over_r).toBeCloseTo(8.84, 1);
    expect(values.teq).toBeGreaterThan(1350);
    expect(values.teq).toBeLessThan(1550);
    expect(check.level).toBe('ok');
  });

  test('the blended pair recovers the companion and the true radius', () => {
    // The two depths the Transit Lab and Blended Binary scenarios produce.
    const { values, check } = run(stepFor('Recover the real planet'), {
      d_blend: 0.011241,
      d_clean: 0.018333,
    });
    expect(values.ratio).toBeCloseTo(1.631, 2);
    expect(values.dm).toBeCloseTo(0.5, 1);
    expect(values.corr).toBeCloseTo(1.277, 2);
    expect(values.rp_true).toBeCloseTo(15.5, 0);
    expect(check.level).toBe('ok');
  });

  test('rejects the two depths entered the wrong way round', () => {
    const { check } = run(stepFor('Recover the real planet'), {
      d_blend: 0.018333,
      d_clean: 0.011241,
    });
    expect(check.level).toBe('error');
    expect(check.message).toMatch(/shallower/);
  });

  test('sets up the unblended system before the blended one', () => {
    const withSetup = inv.steps
      .map((s, i) => ({ i, scenario: s.setup?.scenario }))
      .filter(s => s.scenario);
    expect(withSetup[0].scenario).toBe('Transit Lab');
    expect(withSetup.at(-1).scenario).toBe('Blended Binary');
    // The clean measurement has to come first, or the comparison in the last
    // step has nothing to compare against.
    const measureDip = inv.steps.findIndex(s => s.title === 'Measure the dip');
    expect(measureDip).toBeLessThan(withSetup.at(-1).i);
  });
});
