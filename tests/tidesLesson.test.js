/**
 * @jest-environment jsdom
 */
// =============================================================================
// Tides: the student chooses the distances and the masses, and hunts the Roche
// crossing
// -----------------------------------------------------------------------------
// The lesson's checks are held against the instruments and against physics done
// here from Newton's law alone, not from js/tidalPhysics.js: the stretch the
// panel reports goes as one over the distance cubed and as the mass once, to
// the accuracy of the exact near-and-far difference; the crossing the hunt
// accepts is the balance of stretch against grip; any four distances a
// reader could choose pass, a swapped pair or a reading taken elsewhere is
// refused in words, and the answers saved under the four steps that were
// retired come back as an earlier version. The model-versus-picture
// differences (the panel's stretch is the first-order one) are stated in
// DECISION_REGISTER.md.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import ES from '../js/data/investigations/es/tides.js';
import { canvasProblems } from '../js/lesson/canvasKind.js';
import { matchMisconception } from '../js/answerFeedback.js';
import { readProgress } from '../js/investigations/progressSchema.js';
import { earlierAnswers, wasIn } from '../js/investigations/stepView.js';

const LESSON = INVESTIGATIONS.find(l => l.id === 'tides');
const step = sid => LESSON.steps.find(s => s.sid === sid);

// Physics from Newton's law, with its own constants (SI).
const G = 6.6743e-11;
const M_EARTH = 5.972e24;
const R_EARTH = 6.371e6;
const M_MOON = 7.342e22;
const D_MOON = 3.844e8;
/** Half the difference between the pull on the near and the far face: the stretch across a body. */
const stretchAcross = (M, d, R) =>
  (G * M * ((d - R) ** -2 - (d + R) ** -2)) / 2;
/** The distance, in Earth radii, where 2GMR/d^3 equals the body's own gravity G m/R^2 at density rho. */
const crossing = rho =>
  Math.cbrt((3 * M_EARTH) / (2 * Math.PI * rho)) / R_EARTH;

let widgets;
beforeAll(async () => {
  const m = await import('../js/tidalWidgets.js');
  await m.messagesReady;
  widgets = Object.fromEntries(m.TIDAL_WIDGETS.map(w => [w.id, w]));
});

const grid = (lo, hi, by) =>
  Array.from({ length: Math.round((hi - lo) / by) + 1 }, (_, i) =>
    Number((lo + i * by).toFixed(2))
  );
const DISTANCES = grid(0.2, 2, 0.05);
const MASSES = grid(0.25, 4, 0.25);
/** What the panel prints for the stretch, to two decimals, as a reader types it. */
const printed = (dist, mass = 1) =>
  Number(widgets['tide-strength'].compute({ dist, mass }).relative.toFixed(2));

const fourDistances = ds => {
  const v = {};
  ds.forEach((d, i) => {
    v[`d${i + 1}`] = d;
    v[`t${i + 1}`] = printed(d);
  });
  return v;
};

describe('the physics the panel stands on, done independently', () => {
  test('the stretch across a body goes as one over the distance cubed to 1.5 percent over the slider range', () => {
    for (const d of DISTANCES) {
      const exact =
        stretchAcross(M_MOON, d * D_MOON, R_EARTH) /
        stretchAcross(M_MOON, D_MOON, R_EARTH);
      expect(Math.abs(exact * d ** 3 - 1)).toBeLessThan(0.015);
    }
  });

  test('halving the distance multiplies the stretch by 8 (7.9 to 8.2 with the exact difference), and the mass enters once', () => {
    for (const d of [2, 1, 0.8, 0.4]) {
      const r =
        stretchAcross(M_MOON, (d / 2) * D_MOON, R_EARTH) /
        stretchAcross(M_MOON, d * D_MOON, R_EARTH);
      expect(r).toBeGreaterThan(7.9);
      expect(r).toBeLessThan(8.2);
    }
    for (const m of MASSES)
      expect(
        widgets['tide-strength'].compute({ dist: 1, mass: m }).relative
      ).toBeCloseTo(m, 9);
  });

  test('the panel reads 1.00 for the real Moon and the 2.2 to 1 Moon over Sun of the lesson is right', () => {
    expect(printed(1, 1)).toBe(1);
    const moon = M_MOON / D_MOON ** 3;
    const sun = 1.989e30 / 1.496e11 ** 3;
    expect(moon / sun).toBeGreaterThan(2.1);
    expect(moon / sun).toBeLessThan(2.3);
  });

  test('the crossings the hunt accepts are where the panel’s two bars are equal, and the closed form agrees', () => {
    const B = widgets['tide-balance'];
    for (const rho of [600, 3300, 6000]) {
      let lo = 1.0;
      let hi = 8;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        B.compute({ dist: mid, density: rho }).ratio > 1
          ? (lo = mid)
          : (hi = mid);
      }
      const bars = (lo + hi) / 2;
      expect(bars).toBeCloseTo(crossing(rho), 2);
      expect(bars).toBeCloseTo(2 ** (1 / 3) * Math.cbrt(5514 / rho), 1);
    }
    expect(crossing(600)).toBeGreaterThan(crossing(3300));
    expect(crossing(3300)).toBeGreaterThan(crossing(6000));
  });

  test('a Moon-sized body would touch the Earth before the iron bars met, and the lesson says so', () => {
    const R_MOON = 1.7374e6;
    const touch = 1 + R_MOON / R_EARTH;
    expect(touch).toBeCloseTo(1.2727, 3);
    expect(crossing(6000)).toBeLessThan(touch);
    expect(crossing(600)).toBeGreaterThan(touch);
    const text = step('how-density-moved-it').body;
    expect(text).toMatch(/1\.27 Earth\s+radii/);
    expect(text).toMatch(/1\.22/);
    const at = LESSON.steps.findIndex(x => x.sid === 'how-density-moved-it');
    expect(ES.steps[at].body).toMatch(/1,27 radios terrestres/);
  });

  test('the first-order balance is within a few percent of the exact stretch, even for iron at the slider’s inner end', () => {
    const R = 1.7374e6;
    for (const rho of [600, 6000]) {
      const d = crossing(rho) * R_EARTH;
      const grip = (G * ((4 / 3) * Math.PI * R ** 3 * rho)) / R ** 2;
      const ratio = stretchAcross(M_EARTH, d, R) / grip;
      expect(ratio).toBeGreaterThan(1);
      expect(ratio).toBeLessThan(1.12);
    }
  });
});

describe('the four distances', () => {
  const s = () => step('choose-four-distances');

  test('every four distances on the slider that span a factor of four read from the panel pass', () => {
    let n = 0;
    for (let a = 0; a < DISTANCES.length; a += 3)
      for (let b = a + 1; b < DISTANCES.length; b += 4)
        for (let c = b + 1; c < DISTANCES.length; c += 5)
          for (let d = c + 1; d < DISTANCES.length; d += 3) {
            const ds = [DISTANCES[a], DISTANCES[b], DISTANCES[c], DISTANCES[d]];
            const span = Math.max(...ds) / Math.min(...ds);
            const r = s().validate(fourDistances(ds), {}, {});
            expect(r.level).toBe(span >= 4 ? 'ok' : 'warn');
            if (span >= 4) n++;
          }
    expect(n).toBeGreaterThan(50);
  });

  test('the readings in any order pass, so the row a distance is typed in does not matter', () => {
    expect(s().validate(fourDistances([2, 0.5, 1, 0.25]), {}, {}).level).toBe(
      'ok'
    );
    expect(
      s().validate(fourDistances([0.3, 0.9, 1.4, 1.9]), {}, {}).level
    ).toBe('ok');
  });

  test('near and far swapped is refused in words, and so is a stretch read at the wrong distance', () => {
    const v = fourDistances([2, 1, 0.5, 0.25]);
    const swapped = { ...v, t1: v.t4, t4: v.t1 };
    const r = s().validate(swapped, {}, {});
    expect(r.level).toBe('warn');
    expect(r.message).toMatch(/swapped|opposite/);
    const wrong = { ...v, t3: printed(0.8) };
    expect(s().validate(wrong, {}, {}).level).toBe('warn');
  });

  test('rows that agree with each other but not with the panel (another mass) are refused', () => {
    const v = fourDistances([2, 1, 0.5, 0.25]);
    const doubled = Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, k[0] === 't' ? 2 * x : x])
    );
    const r = s().validate(doubled, {}, {});
    expect(r.level).toBe('warn');
    expect(r.message).toMatch(/agree with each other/);
  });

  test('a narrow span, a repeated distance and a reading taken elsewhere are refused', () => {
    expect(
      s().validate(fourDistances([1, 1.2, 1.4, 1.6]), {}, {}).message
    ).toMatch(/span less than a factor of four/);
    expect(s().validate(fourDistances([1, 1, 0.5, 0.25]), {}, {}).level).toBe(
      'warn'
    );
    const v = fourDistances([2, 1, 0.5, 0.25]);
    const taken = { t2: { k: 'c', s: { dist: 0.5 } } };
    expect(s().validate(v, {}, taken).message).toMatch(/slider was/);
    expect(s().validate({ ...v, d2: -1 }, {}, {}).level).toBe('error');
    expect(s().validate({}, {}, {})).toBeNull();
  });

  test('the messages that say well done carry no number, so each can be translated whole', () => {
    const a = s().validate(fourDistances([2, 1, 0.5, 0.25]), {}, {});
    const b = s().validate(fourDistances([2, 1, 0.5, 0.125]), {}, {});
    expect(a.level).toBe('ok');
    expect(a.message).toBe(b.message);
    expect(a.message).not.toMatch(/\d/);
  });

  test('the cube law is not offered before the halving is asked: no transform on the four-distance graph', () => {
    expect(s().plot.transform).toBeUndefined();
    expect(JSON.stringify(s().plot)).not.toMatch(/distance³|distance cubed/);
    expect(
      s().validate(fourDistances([2, 1, 0.5, 0.25]), {}, {}).message
    ).not.toMatch(/1 ÷|cube|³/);
  });

  test('no number in the step, hint or tip names the prescribed distances, and no field opens with a value', () => {
    const fields = s().fields;
    expect(fields).toHaveLength(8);
    expect(fields.every(f => !('hint' in f) && !('placeholder' in f))).toBe(
      true
    );
    const words = JSON.stringify([s().body, s().tip, s().tool.note]);
    expect(words).not.toMatch(/\b0\.25\b|\b0\.13\b|\b64\b/);
  });
});

describe('the factor per halving', () => {
  const s = () => step('the-factor-per-halving');
  const ask = n => matchMisconception(s(), n, s().tolerance);

  test('every halving pair a reader could read from the panel gives a factor inside the tolerance', () => {
    for (const d of DISTANCES.filter(
      x =>
        x / 2 >= 0.2 && Math.abs((x / 2) * 20 - Math.round((x / 2) * 20)) < 1e-9
    )) {
      const factor = printed(d / 2) / printed(d);
      expect(Math.abs(factor - s().answer)).toBeLessThanOrEqual(s().tolerance);
    }
  });

  test('the ordinary-pull answer and the wrong-way answer are named in words', () => {
    expect(ask(4)?.id).toBe('inverse-square');
    expect(ask(0.125)?.id).toBe('wrong-way');
    expect(ask(0.5)?.id).toBe('wrong-way');
    expect(ask(8)).toBeNull();
    for (const m of s().misconceptions) expect(m.say).not.toMatch(/\d/);
  });

  test('it reveals the prediction that was made before the four distances', () => {
    expect(step('bring-the-companion-closer').reveal).toBe(s().sid);
    expect(s().evidence).toHaveLength(8);
  });
});

describe('a distance that was not used, estimated and then read', () => {
  const pick = () => step('pick-a-new-distance');
  const read = () => step('read-the-new-distance');
  const earlier = used => (sid, field) =>
    sid === 'choose-four-distances' ? used[Number(field[1]) - 1] : undefined;
  const gapOf = (d5, used) =>
    pick()
      .fields.find(f => f.id === 'gap')
      .compute({ d5 }, earlier(used));

  test('a distance beside one already used is refused, a gap between two is accepted, outside the slider is refused', () => {
    const used = [2, 1, 0.5, 0.25];
    expect(gapOf(0.52, used)).toBeCloseTo(0.02, 9);
    expect(pick().validate({ d5: 0.52, gap: gapOf(0.52, used) }).level).toBe(
      'warn'
    );
    expect(pick().validate({ d5: 0.7, gap: gapOf(0.7, used) }).level).toBe(
      'ok'
    );
    expect(pick().validate({ d5: 3, gap: 1 }).level).toBe('warn');
    // The slider moves in steps of 0.05: a distance it cannot be set to is
    // refused here, so the reading taken there is never off the estimate.
    for (const off of [0.73, 1.234, 0.52])
      expect(pick().validate({ d5: off, gap: 1 }).message).toMatch(/0\.05/);
    for (const on of [0.2, 0.65, 1.35, 2])
      expect(pick().validate({ d5: on, gap: 1 }).level).toBe('ok');
    expect(pick().validate({})).toBeNull();
  });

  test('the reading must belong to the distance that was chosen', () => {
    for (const d of [0.35, 0.7, 1.45, 1.8]) {
      expect(read().validate({ d5r: d, t5: printed(d) }).level).toBe('ok');
      expect(
        read().validate({ d5r: d, t5: printed(d === 0.7 ? 1.45 : 0.7) }).level
      ).toBe('warn');
    }
    expect(read().validate({ t5: 2 }).level).toBe('warn');
    expect(read().validate({})).toBeNull();
  });

  test('the estimate is a prediction in the unit of the reading it is set beside, revealed after the reading', () => {
    const est = step('estimate-the-new-stretch');
    expect(est).toMatchObject({
      type: 'predict',
      kind: 'estimate',
      unit: '× lunar tide',
    });
    const at = sid => LESSON.steps.findIndex(x => x.sid === sid);
    expect(est.reveal).toBe('the-estimate-and-the-reading');
    expect(at(est.reveal)).toBeGreaterThan(at('read-the-new-distance'));
    expect(step(est.reveal).evidence[0]).toEqual({
      step: 'read-the-new-distance',
      field: 't5',
    });
  });
});

describe('the three masses', () => {
  const s = () => step('choose-three-masses');
  const rows = ms => {
    const v = {};
    ms.forEach((m, i) => {
      v[`m${i + 1}`] = m;
      v[`s${i + 1}`] = printed(1, m);
    });
    return v;
  };

  test('any three masses at least a factor of two apart pass, closer ones are told to spread out', () => {
    let n = 0;
    for (let a = 0; a < MASSES.length; a++)
      for (let b = a + 1; b < MASSES.length; b++)
        for (let c = b + 1; c < MASSES.length; c++) {
          const ms = [MASSES[a], MASSES[b], MASSES[c]];
          const ok = Math.max(...ms) / Math.min(...ms) >= 2;
          expect(s().validate(rows(ms), {}, {}).level).toBe(ok ? 'ok' : 'warn');
          if (ok) n++;
        }
    expect(n).toBeGreaterThan(100);
  });

  test('a distance that moved, or another distance for every row, is refused', () => {
    const v = rows([0.5, 1, 3]);
    expect(s().validate({ ...v, s2: printed(0.6, 1) * 2 }, {}, {}).level).toBe(
      'warn'
    );
    const near = Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, k[0] === 's' ? x * 3 : x])
    );
    expect(s().validate(near, {}, {}).message).toMatch(/agree with each other/);
    const taken = { s1: { k: 'c', s: { mass: 2 } } };
    expect(s().validate(v, {}, taken).message).toMatch(/slider was/);
  });

  test('the mass prediction is revealed on the step that writes the relationship down, with the readings', () => {
    expect(step('now-change-the-companion').reveal).toBe(
      'the-relationship-written-down'
    );
    const at = sid => LESSON.steps.findIndex(x => x.sid === sid);
    expect(at('the-relationship-written-down')).toBeGreaterThan(
      at('what-the-mass-graph-says')
    );
    expect(step('the-relationship-written-down').evidence).toHaveLength(6);
  });
});

describe('the hunt for the crossing', () => {
  const s = () => step('hunt-the-crossing');
  const B = () => widgets['tide-balance'];

  test('the panel withholds where the bars meet on a hunt and prints it otherwise', () => {
    const v = { dist: 5, density: 3300 };
    const plain = B().readout(v, null, {});
    const hunted = B().readout(v, null, { hunt: true });
    expect(plain.length - hunted.length).toBe(1);
    expect(plain.some(r => /equal at/i.test(r.label))).toBe(true);
    expect(hunted.some(r => /equal at/i.test(r.label))).toBe(false);
    expect(hunted.some(r => /Earth radii/.test(String(r.value)))).toBe(false);
  });

  test('every slider position within 0.12 of each crossing is accepted, and no other', () => {
    for (const ice of grid(1.2, 6, 0.05))
      for (const iron of [1.2, 1.25, 1.3, 2, 3]) {
        const r = s().validate({ ice, iron });
        const good =
          Math.abs(ice - crossing(600)) <= 0.12 &&
          Math.abs(iron - crossing(6000)) <= 0.12;
        if (good) expect(r.level).toBe('ok');
        else expect(r.level).toBe('warn');
      }
  });

  test('the two swapped, or a crossing found at the wrong density, is refused with the reason', () => {
    expect(s().validate({ ice: 1.25, iron: 2.65 }).message).toMatch(
      /swapped between/
    );
    expect(s().validate({ ice: 1.5, iron: 1.2 }).message).toMatch(/comet ice/);
    expect(s().validate({ ice: 2.65, iron: 1.5 }).message).toMatch(/iron/);
    expect(s().validate({})).toBeNull();
    expect(JSON.stringify(s().validate({ ice: 1, iron: 1 }))).not.toMatch(/\d/);
  });

  test('the prediction before it is held until the sentence that follows it, and the reading does not open at its answer', () => {
    const predict = step('a-denser-body-closer-in');
    expect(predict.reveal).toBe('how-density-moved-it');
    expect(predict.options[predict.answer]).toMatch(/closer to the planet/);
    expect(s().tool.values).toEqual({ dist: 5, density: 3300 });
    expect(step('stretch-against-grip').tool.hunt).toBe(true);
    expect(step('stretch-against-grip').checklist.join(' ')).not.toMatch(
      /reports|Comet ice|Iron/
    );
    expect(step('stretch-against-grip').body).not.toMatch(/1\.5|equal here/);
  });
});

describe('the lesson as a whole', () => {
  test('ids are unique, and the Spanish has one entry for each step with the same number of fields, options and slips', () => {
    const sids = LESSON.steps.map(x => x.sid);
    expect(new Set(sids).size).toBe(sids.length);
    expect(ES.steps).toHaveLength(sids.length);
    LESSON.steps.forEach((x, i) => {
      const es = ES.steps[i];
      if (x.fields) expect(es.fields).toHaveLength(x.fields.length);
      if (x.options) expect(es.options).toHaveLength(x.options.length);
      if (x.misconceptions)
        expect(es.misconceptions).toHaveLength(x.misconceptions.length);
    });
  });

  test('the canvas is the Earth and Moon for the opening, quiet for the instruments, and the black hole scene for the end', () => {
    expect(canvasProblems(LESSON)).toEqual([]);
    const at = sid => LESSON.steps.findIndex(x => x.sid === sid);
    expect(at('three-points-three-pulls')).toBeLessThan(
      at('what-the-far-side-arrow')
    );
    expect(step('what-the-far-side-arrow').canvas).toBe('quiet');
    const end = step('the-extreme-case-running-live');
    expect(end.canvas).toBe('scene');
    expect(end.setup.scenario).toBe('Tidal Disruption Event');
    for (const x of LESSON.steps.slice(
      at('what-the-far-side-arrow'),
      at('the-extreme-case-running-live')
    ))
      expect(x.bind || x.stage || x.setup).toBeUndefined();
  });

  test('every misconception names a wrong option, and the predictions reveal later steps', () => {
    for (const x of LESSON.steps) {
      for (const m of x.misconceptions ?? [])
        if (x.options) {
          expect(m.option).not.toBe(x.answer);
          expect(m.option).toBeLessThan(x.options.length);
        }
      if (x.type === 'predict')
        expect(LESSON.steps.findIndex(y => y.sid === x.reveal)).toBeGreaterThan(
          LESSON.steps.indexOf(x)
        );
    }
    for (const sid of [
      'so-why-two-bulges',
      'what-the-far-side-arrow',
      'not-one-distance',
    ])
      expect(step(sid).misconceptions.length).toBeGreaterThanOrEqual(3);
  });

  test('the Sun is not weighed against the Moon before its prediction', () => {
    const at = sid => LESSON.steps.findIndex(x => x.sid === sid);
    const before = LESSON.steps
      .slice(0, at('the-sun-against-the-moon'))
      .map(x =>
        [x.body, x.tip, x.because, (x.checklist || []).join(' ')].join(' ')
      )
      .join(' ');
    expect(before).not.toMatch(/180 times|more than a factor of two/);
  });
});

describe('saved work under the steps this lesson retired', () => {
  const OLD = {
    'tides:four-distances:d1': '2',
    'tides:four-distances:t1': '0.13',
    'tides:four-distances:d2': '1',
    'tides:four-distances:t2': '1',
    'tides:how-steeply-does-it-fall': 8,
    'tides:three-masses:m1': '1',
    'tides:three-masses:s1': '1',
    'tides:where-the-balance-tips': '1.5',
    'tides:bring-the-companion-closer': 2,
    'tides:so-why-two-bulges': 2,
  };
  const SAVED = {
    schema: 2,
    lesson: 'tides',
    stepSid: 'the-sun-against-the-moon',
    responses: OLD,
    attempts: {},
    visited: ['bring-the-companion-closer'],
    startedAt: '2026-10-01T00:00:00.000Z',
  };
  const read = readProgress(SAVED, LESSON);

  test('the answers under the four retired ids are an earlier version and the kept steps keep their answers', () => {
    expect(read.responses['tides:bring-the-companion-closer']).toBe(2);
    expect(read.responses['tides:so-why-two-bulges']).toBe(2);
    const rows = earlierAnswers(LESSON, read.earlier.responses);
    expect(rows.map(r => [r.id, r.r.to]).sort()).toEqual([
      ['four-distances', 'choose-four-distances'],
      ['how-steeply-does-it-fall', 'the-factor-per-halving'],
      ['three-masses', 'choose-three-masses'],
      ['where-the-balance-tips', 'hunt-the-crossing'],
    ]);
    for (const r of rows) {
      expect(LESSON.steps.map(x => x.sid)).toContain(r.r.to);
      expect(wasIn(r.r.was, 'en').length).toBeGreaterThan(20);
      expect(wasIn(r.r.was, 'es').length).toBeGreaterThan(20);
    }
  });

  test('no retired id is a live step, and every successor is', () => {
    for (const [id, r] of Object.entries(LESSON.retired)) {
      expect(LESSON.steps.some(x => x.sid === id)).toBe(false);
      expect(LESSON.steps.some(x => x.sid === r.to)).toBe(true);
    }
  });
});
