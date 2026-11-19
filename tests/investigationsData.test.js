import { describe, test, expect } from '@jest/globals';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  INVESTIGATIONS,
  getInvestigation,
  gradedSteps,
  seriesPosition,
} from '../js/data/investigations.js';
import { SCENARIO_INFO, scenarioId } from '../js/data/scenarioInfo.js';
import { getWidget, whenWidgetsReady } from '../js/widgets.js';

// Some instrument families are fetched on demand (js/widgets.js,
// LAZY_FAMILIES), so the whole catalog is awaited before any lookup.
await whenWidgetsReady();

const repoFile = rel => fileURLToPath(new URL(`../${rel}`, import.meta.url));

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
  // No pair staged, which is the case a probe has to survive: this test runs
  // with no simulation at all, and a probe that assumes a scene is a probe
  // that throws on the first frame of a cold load.
  barycenter: () => null,
  restageStarPair: () => false,
  restageHole: () => false,
  // No star observed, which is the case with no simulation: a probe that
  // assumes a spectrograph has something pointed at it is a probe that throws
  // on the first frame of a cold load.
  rvNow: () => null,
  // No planet, no star, no zone: an authoring check runs with nothing in
  // orbit, and a probe that assumes a habitable zone exists is a probe
  // that throws before a reader ever sees the step.
  habitability: () => null,
  // No baseline with no world, which is the honest answer during a rebuild
  // and the case a probe reading drift has to survive.
  conservation: () => null,
  // Nothing has transited with no world, so a probe that reads geometry
  // before a frame has been computed gets the same answer it gets on the
  // first frame of a real one.
  transitGeometry: () => null,
  // No run to judge, which is 'cannot tell' rather than 'stale'.
  runMatchesScene: () => null,
  // The bench has never been opened, which is the state every lesson step
  // starts in and the one a probe reading a run has to survive.
  experiment: () => null,
  // The stable-binding accessors. Every role is unbound here, which is the
  // case a probe has to survive: the lesson may be on a step whose stage has
  // not been built yet, or whose star has merged out from under it.
  role: () => null,
  roleStatus: () => 'unbound',
  roleOf: () => null,
  roles: () => [],
  selectRole: () => false,
  mode: () => ({ mode: 'nbody', model: null, roles: [] }),
  // Closed-form arithmetic on one number, so the stub answers honestly rather
  // than with a shape: a probe that divides by one of these is really checked.
  holeFacts: () => ({
    massInSuns: 1,
    massKg: 1.989e30,
    rsM: 2953.2,
    rsKm: 2.9532,
    density: 1.8e19,
    temperature: 6.17e-8,
    lifetimeYears: 6.6e67,
    iscoM: 8859.6,
  }),
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
    series: () => ({ x: [], y: [] }),
  }),
  // The rotation-curve instrument with nothing to plot, which is the state a
  // step is in the moment it opens and before the panel has been shown.
  rotationCurve: () => ({
    bodies: [],
    center: { x: 0, y: 0, mass: 0 },
    points: [],
    G: 1,
    halo: null,
    rFitMin: 0,
    fit: null,
    visibleMass: 0,
    enclosedAtEdge: 0,
  }),
  cluster: () => null,
  haloOn: () => false,
  find: () => null,
});

/**
 * A recorded curve as the panel records it: a flat stretch at 1.000065, then a
 * transit with sloping sides and a limb-darkened floor (1.2 percent at the
 * edge of the floor, 1.83 at the middle), then flat again. Times in days.
 */
const CURVE = (() => {
  const x = [];
  const y = [];
  for (let i = 0; i <= 200; i++) {
    const t = 0.8 + i * 0.01;
    const d = Math.abs(t - 1.5);
    const floor = d < 0.07 ? 0.0183 - 0.0063 * (d / 0.07) ** 2 : 0;
    const side = d >= 0.07 && d < 0.14 ? 0.012 * (1 - (d - 0.07) / 0.07) : 0;
    x.push(t);
    y.push(1.000065 - floor - side);
  }
  return { x, y };
})();

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
      series: () => CURVE,
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
        // A reflection is never marked, so it has no rubric (author:check forbids one).
        if (step.kind === 'short' && !step.reflect)
          expect(step.rubric).toBeTruthy();
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
        // A figure drawn from the model has no photograph to credit.
        if (!step.figure || step.figure.from) continue;
        const f = step.figure;
        // These are other people's photographs. Shipping one without its
        // author and license is a license breach, not a formatting slip.
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
          if (f.compute)
            expect(() => f.compute(blank, () => NaN)).not.toThrow();
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

  test('the depth step takes two stretches of the recorded curve, never the panel’s own levels', () => {
    const step = stepFor('Choose the two stretches');
    expect(step.importFromSelection).toBeUndefined();
    expect(Object.keys(step.series)).toEqual(['outside', 'inside']);
    for (const read of Object.values(step.series)) {
      const d = read(withTransits());
      expect(d.x).toHaveLength(201);
      expect(d.unit).toBe('days');
    }
    // The readout says where the plot runs, not its levels nor where the dip is.
    const rows = step.probe(withTransits()).map(r => `${r.label} ${r.value}`);
    expect(rows.join(' ')).not.toMatch(/1\.0000|0\.9817|contact/);
  });

  test('the depth step judges the two stretches, and names the slip', () => {
    const step = stepFor('Choose the two stretches');
    const judge = (base, bot) => {
      const v = { base, bot };
      for (const f of step.fields) if (f.compute) v[f.id] = f.compute(v);
      return step.validate(v, stubContext());
    };
    // A stretch on the floor (about 1.7 percent) is accepted.
    expect(judge(1.000065, 0.9831).level).toBe('ok');
    // An ingress-only stretch (a shallow mean) is told about the sloping sides.
    const sides = judge(1.000065, 0.9925);
    expect(sides.level).toBe('warn');
    expect(sides.message).toMatch(/sloping sides/);
    // A baseline stretch that includes part of a dip pulls its mean below one.
    const inDip = judge(0.9986, 0.9831);
    expect(inDip.level).toBe('error');
    expect(inDip.message).toMatch(/averages in part of a dip/);
    // The two stretches swapped.
    expect(judge(0.9831, 1.000065).level).toBe('error');
    // Two flat stretches, or one stretch twice, are not called swapped.
    const flat = judge(1.000065, 1.000065);
    expect(flat.level).toBe('warn');
    expect(flat.message).toMatch(/almost the same mean/);
    expect(flat.message).not.toMatch(/swapped/);
  });

  test('a depth the stretches check accepts is never refused by the radius step', () => {
    const measure = stepFor('Choose the two stretches');
    const radius = stepFor('Correct it, and get a real radius');
    const judge = d => {
      const v = { base: 1, bot: 1 - d };
      for (const f of measure.fields) if (f.compute) v[f.id] = f.compute(v);
      return measure.validate(v, stubContext());
    };
    let accepted = 0;
    for (let d = 0.0125; d <= 0.0196; d += 0.00005) {
      if (judge(d).level !== 'ok') continue;
      accepted++;
      const v = { d2: d, rstar: 1.155 };
      for (const f of radius.fields) if (f.compute) v[f.id] = f.compute(v);
      expect(radius.validate(v, stubContext()).level).toBe('ok');
    }
    expect(accepted).toBeGreaterThan(100);
    // The floor's edge, where the planet is just fully on the disk, is
    // 1.32 percent for the clean system and that over 1.631 for the blend.
    expect(judge(0.0132).level).toBe('ok');
    const blend = stepFor('Compare the two curves');
    const jb = d => {
      const v = { base: 1, bot: 1 - d };
      for (const f of blend.fields) if (f.compute) v[f.id] = f.compute(v);
      return blend.validate(v, stubContext());
    };
    expect(jb(0.0132 / 1.631).level).toBe('ok');
    expect(jb(0.0072).level).toBe('warn');
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

  test('the blended pair is measured from stretches too, with nothing copied', () => {
    const measure = stepFor('Compare the two curves');
    const find = stepFor('Find the hidden companion');
    expect(measure.importFromSelection).toBeUndefined();
    expect(find.importFromSelection).toBeUndefined();
    expect(Object.keys(measure.series)).toEqual(['outside', 'inside']);
    // The scene is not cleared by a redraw of the step: a taken reading redraws it.
    expect(measure.clearLightCurve).toBeUndefined();
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

  /** The two depths come from the earlier steps' own answers, through `e`. */
  const hidden = (clean, blend, typed) => {
    const step = stepFor('Find the hidden companion');
    const e = (sid, id) =>
      sid === 'choose-the-two-stretches' && id === 'depth' ? clean : blend;
    const v = { ...typed };
    for (const f of step.fields) if (f.compute) v[f.id] = f.compute(v, e);
    return { values: v, check: step.validate(v, stubContext()) };
  };

  test('the blended pair recovers the companion and the true radius', () => {
    // The two depths the Transit Lab and Blended Binary scenarios produce.
    const { values, check } = hidden(0.018333, 0.011241, {
      dm: 0.5,
      rp_true: 15.5,
    });
    expect(values.ratio).toBeCloseTo(1.631, 2);
    expect(values.rp_blend).toBeCloseTo(12.1, 0);
    expect(check.level).toBe('ok');
  });

  test('names the logarithm slip and the radius slip', () => {
    const base = [0.018333, 0.011241];
    // Ratio instead of ratio minus one: -2.5 log10(1.631) = -0.53.
    expect(hidden(...base, { dm: 0.53, rp_true: 15.5 }).check.message).toMatch(
      /subtract one/
    );
    // The ratio instead of its square root multiplies the radius too far.
    expect(hidden(...base, { dm: 0.5, rp_true: 19.7 }).check.message).toMatch(
      /square root/
    );
  });

  test('rejects the two depths the wrong way round', () => {
    const { check } = hidden(0.011241, 0.018333, { dm: 0.5, rp_true: 15.5 });
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
    const measureDip = inv.steps.findIndex(
      s => s.title === 'Choose the two stretches'
    );
    expect(measureDip).toBeLessThan(withSetup.at(-1).i);
  });
});

// =============================================================================
// The lesson browser's view of the catalog
// -----------------------------------------------------------------------------
// The browser reads every card from these fields, so a lesson added without
// them shows a placeholder card rather than a broken one - and these tests say
// so out loud instead of leaving it to be noticed in a screenshot.
// =============================================================================

describe('every lesson carries what its card needs', () => {
  const IDS = INVESTIGATIONS.map(i => i.id);

  test.each(IDS)('%s has a subtitle, a duration and a level', id => {
    const inv = getInvestigation(id);
    expect(inv.subtitle.trim().length).toBeGreaterThan(10);
    // Two numbers and a unit: the card turns this into the chip on the
    // thumbnail, and the header sums it into hours of work.
    expect(inv.duration).toMatch(/^\d+[-–]\d+\s*min$/);
    expect(inv.level.trim().length).toBeGreaterThan(3);
  });

  test.each(IDS)('%s lists what the student will be able to do', id => {
    const { objectives } = getInvestigation(id);
    expect(Array.isArray(objectives)).toBe(true);
    expect(objectives.length).toBeGreaterThanOrEqual(3);
  });

  test.each(IDS)('%s names a committed thumbnail', id => {
    const { thumbnail } = getInvestigation(id);
    // Two homes. A lesson built on a scenario borrows that scenario's capture;
    // a lesson that stages its own scene has a card drawn from its own opening
    // stage by tools/generate-lesson-cards.mjs.
    expect(thumbnail).toMatch(
      /^images\/(scenarios|investigations)\/[a-z0-9-]+\.webp$/
    );
    const file = repoFile(thumbnail);
    expect(existsSync(file)).toBe(true);
    // A blank or failed capture encodes to almost nothing.
    expect(statSync(file).size).toBeGreaterThan(2048);
  });

  test.each(IDS)(
    '%s borrows the capture of a scenario it actually uses',
    id => {
      // The card is claiming to show the system the lesson opens in. If it
      // borrows some other scenario's capture, the card is lying.
      const inv = getInvestigation(id);
      const used = new Set(
        inv.steps.map(s => s.setup?.scenario).filter(Boolean)
      );
      const owners = [...used]
        .map(key => SCENARIO_INFO[scenarioId(key)]?.thumbnail)
        .filter(Boolean);
      // A card is a picture of the first screen, so what decides is what the
      // lesson *opens* in. A lesson that stands up its own scene on screen one
      // opens in no scenario at all, so there is no capture it could honestly
      // borrow, and it must not borrow one anyway: that would advertise a
      // system the lesson never shows.
      //
      // Staging a screen part way through does not change what the card is a
      // picture of. The Goldilocks Question opens in, and spends most of
      // itself in, the Habitable Zone Lab; it stages one ellipse on screen 27
      // because that scenario is deliberately circular. Its card is honest,
      // and forcing it to draw its own would make it a picture of screen 27.
      if (inv.steps[0]?.stage) {
        expect(inv.thumbnail).toBe(`images/investigations/${id}.webp`);
        return;
      }
      // Anything that stages later still has to borrow from a scenario it
      // really uses, which the check below enforces for every lesson.
      expect(owners).toContain(inv.thumbnail);
    }
  );
});

describe('series positions are derived, not written down', () => {
  test('a lesson outside a series has no position', () => {
    const loner = INVESTIGATIONS.find(i => !i.series);
    expect(loner).toBeTruthy();
    expect(seriesPosition(loner)).toBeNull();
  });

  test('a series numbers its members 1..n in catalog order', () => {
    const named = [...new Set(INVESTIGATIONS.map(i => i.series))].filter(
      Boolean
    );
    expect(named.length).toBeGreaterThan(0);
    for (const label of named) {
      const members = INVESTIGATIONS.filter(i => i.series === label);
      // A series of one is not a series; it would put a "1/1" pill on a card
      // for no reason.
      expect(members.length).toBeGreaterThan(1);
      expect(members.map(m => seriesPosition(m).index)).toEqual(
        members.map((_, i) => i + 1)
      );
      for (const m of members) {
        expect(seriesPosition(m).of).toBe(members.length);
        expect(seriesPosition(m).label).toBe(label);
      }
    }
  });

  test('a lesson that is not in the catalog gets nothing', () => {
    expect(seriesPosition(null)).toBeNull();
    expect(seriesPosition({ id: 'nope' })).toBeNull();
  });
});
