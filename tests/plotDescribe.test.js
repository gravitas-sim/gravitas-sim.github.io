import { describe, test, expect } from '@jest/globals';
import {
  analyse,
  describe as describeChart,
  LIMITS,
  sentence,
  TEMPLATES,
  TEMPLATE_TEXT,
} from '../js/plot/describe.js';
import { holdsAnswer, heldAttribute } from '../js/lesson/held.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';

// =============================================================================
// Bounded descriptions of a chart's series (Prompt 280)
// -----------------------------------------------------------------------------
// A suite of synthetic series with their expected descriptions, each from a
// seeded stream so a failure is the same failure every time; the bound (a
// description names shapes and numbers and never says what they mean); the
// uncertainty style of Prompts 150 and 151; both languages; and, over every
// prediction the 124 shipped investigations hold, that no description or
// number reaches a reader before the result step.
// =============================================================================

/** A seeded stream (mulberry32) and Box-Muller normals. */
function stream(seed) {
  let a = seed >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

const T = Array.from({ length: 200 }, (_, i) => i * 0.1);
const make = (f, seed = 7) => {
  const g = stream(seed);
  return T.map(t => f(t, g));
};

const CASES = {
  periodic: make(
    (t, g) => 10 + 2 * Math.sin((2 * Math.PI * t) / 3.2) + 0.1 * g()
  ),
  trend: make((t, g) => 1 + 0.5 * t + 0.2 * g()),
  step: make((t, g) => (t < 9 ? 5 : 7) + 0.1 * g()),
  dip: make((t, g) => (t > 8 && t < 10 ? 0.97 : 1) + 0.002 * g()),
  dips: make((t, g) => (t % 5 > 2 && t % 5 < 3 ? 0.98 : 1) + 0.002 * g()),
  bump: make((t, g) => 1 + (t > 8 && t < 9 ? 0.5 : 0) + 0.01 * g()),
  constant: make(() => 3),
  irregular: make((t, g) => g()),
};

const text = (y, o = {}) =>
  describeChart([{ label: 'a', x: T, y, ...o.series }], o).text;

describe('the shapes a description names', () => {
  test('a periodic series: period, middle value and amplitude from the data', () => {
    const f = analyse(T, CASES.periodic);
    expect(f.shape).toBe('periodic');
    expect(Math.abs(f.period - 3.2)).toBeLessThan(0.02);
    expect(Math.abs(f.amplitude - 2)).toBeLessThan(0.1);
    expect(f.sigmaPeriod).toBeGreaterThan(0);
    // The period's own uncertainty covers the truth at 3 sigma.
    expect(Math.abs(f.period - 3.2)).toBeLessThan(3 * f.sigmaPeriod);
    expect(text(CASES.periodic)).toMatch(
      /A pattern that repeats about every 3\.2\d*\s±\s0\.00\d+ \(from the scatter of the points\)/
    );
  });

  test('a straight trend: slope with its uncertainty', () => {
    const f = analyse(T, CASES.trend);
    expect(f.shape).toBe('trend');
    expect(Math.abs(f.slope - 0.5)).toBeLessThan(3 * f.slopeSigma);
    expect(text(CASES.trend)).toMatch(
      /The values rise steadily, by 0\.4\d+\s±\s0\.00\d+/
    );
    expect(text(CASES.trend.map(v => -v))).toMatch(/fall steadily/);
  });

  test('a step: where, how big, and its uncertainty', () => {
    const f = analyse(T, CASES.step);
    expect(f.shape).toBe('step');
    expect(Math.abs(f.at - 8.95)).toBeLessThan(0.2);
    expect(Math.abs(f.size - 2)).toBeLessThan(3 * f.sigmaSize);
    expect(text(CASES.step)).toMatch(
      /A step near x = 8\.9\d*: .*from about 5\.0\d to about 6\.9\d/
    );
  });

  test('a dip is "a dip": its depth and duration, never what it is', () => {
    const f = analyse(T, CASES.dip);
    expect(f.shape).toBe('dips');
    expect(f.count).toBe(1);
    expect(Math.abs(f.depth - 0.03)).toBeLessThan(0.004);
    expect(Math.abs(f.duration - 2)).toBeLessThan(0.3);
    const words = text(CASES.dip);
    expect(words).toMatch(/A dip near x = 9\.0/);
    expect(words).not.toMatch(/transit|eclipse|planet|star/i);
  });

  test('dips that repeat have a period, from their spacing', () => {
    const f = analyse(T, CASES.dips);
    expect(f.shape).toBe('dips');
    expect(f.count).toBe(4);
    expect(Math.abs(f.period - 5)).toBeLessThan(0.1);
    expect(text(CASES.dips)).toMatch(
      /4 dips, the first near x = 2\.5.*They come about every 5\.00/
    );
  });

  test('a bump is "a rise"', () => {
    expect(analyse(T, CASES.bump).shape).toBe('bumps');
    expect(text(CASES.bump)).toMatch(/A rise near x = 8\.5.*climb 0\.5/);
  });

  test('a constant series is constant, and noise is not given a shape', () => {
    expect(analyse(T, CASES.constant).shape).toBe('constant');
    expect(text(CASES.constant)).toMatch(/constant at 3\.00/);
    expect(analyse(T, CASES.irregular).shape).toBe('irregular');
    expect(text(CASES.irregular)).toMatch(/No step, repeating pattern/);
  });

  test('a noise-free series states its numbers without an uncertainty', () => {
    const clean = T.map(t => 10 + 2 * Math.sin((2 * Math.PI * t) / 3.2));
    const f = analyse(T, clean);
    expect(f.shape).toBe('periodic');
    expect(Math.abs(f.period - 3.2)).toBeLessThan(0.02);
    const noStep = T.map(t => (t < 9 ? 5 : 7));
    expect(text(noStep)).toMatch(/a change of 2\.00\./);
  });

  test('a scatter: the correlation, with an interval that is not symmetric', () => {
    const g = stream(11);
    const x = Array.from({ length: 60 }, (_, i) => i);
    const y = x.map(v => 2 * v + 15 * g());
    const f = analyse(x, y, { scatter: true });
    expect(f.shape).toBe('scatter');
    expect(f.r).toBeGreaterThan(0.85);
    expect(f.rLow).toBeLessThan(f.r);
    expect(f.rHigh).toBeGreaterThan(f.r);
    const words = describeChart([{ x, y, mode: 'points' }]).text;
    expect(words).toMatch(
      /Correlation r = 0\.9\d+\s\+0\.0\d+\s−0\.0\d+ \(68% interval/
    );
    expect(words).toMatch(/the two rise together/);
    expect(words).toMatch(/Straight-line slope \d\.\d+\s±\s0\.\d+/);
    const flat = Array.from({ length: 60 }, () => g());
    expect(describeChart([{ x, y: flat, mode: 'points' }]).text).toMatch(
      /the interval includes zero/
    );
  });

  test('too few points, missing values and unsorted input', () => {
    expect(analyse([1, 2], [1, 2]).shape).toBe('few');
    expect(sentence(analyse([], []))).toMatch(/0 points/);
    const shuffled = T.map((t, i) => [t, CASES.step[i]]).reverse();
    const withHoles = shuffled.map(([t, y], i) => [t, i % 17 === 0 ? NaN : y]);
    const f = analyse(
      withHoles.map(p => p[0]),
      withHoles.map(p => p[1])
    );
    expect(f.shape).toBe('step');
    expect(f.n).toBe(T.length - Math.ceil(T.length / 17));
  });
});

describe('the stated uncertainty covers the truth at the stated rate', () => {
  // A fixed seeded ensemble: 200 noisy series per shape, the truth known. The
  // stated one-sigma should cover about 68% and two sigma about 95%; the bounds
  // are loose enough for 200 draws and tight enough to fail a factor of 1.4.
  const coverage = (truth, estimate) => {
    let one = 0;
    let two = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const g = stream(seed * 7919);
      const { value, sigma } = estimate(g);
      const z = Math.abs(value - truth) / sigma;
      if (z <= 1) one++;
      if (z <= 2) two++;
    }
    return { one: one / 200, two: two / 200 };
  };

  test('the period and the amplitude of a repeating pattern', () => {
    const run = pick => g =>
      pick(
        analyse(
          T,
          T.map(
            t => 10 + 2 * Math.sin((2 * Math.PI * t) / 3.2 + 0.7) + 0.1 * g()
          )
        )
      );
    const p = coverage(
      3.2,
      run(f => ({ value: f.period, sigma: f.sigmaPeriod }))
    );
    expect(p.one).toBeGreaterThan(0.55);
    expect(p.two).toBeGreaterThan(0.9);
    const a = coverage(
      2,
      run(f => ({ value: f.amplitude, sigma: f.sigmaAmplitude }))
    );
    expect(a.one).toBeGreaterThan(0.55);
    expect(a.two).toBeGreaterThan(0.9);
  });

  test('the slope of a trend and the size of a step', () => {
    const slope = coverage(0.5, g => {
      const f = analyse(
        T,
        T.map(t => 1 + 0.5 * t + 0.2 * g())
      );
      return { value: f.slope, sigma: f.slopeSigma };
    });
    expect(slope.one).toBeGreaterThan(0.55);
    expect(slope.two).toBeGreaterThan(0.9);
    const size = coverage(2, g => {
      const f = analyse(
        T,
        T.map(t => (t < 9 ? 5 : 7) + 0.1 * g())
      );
      return { value: f.size, sigma: f.sigmaSize };
    });
    expect(size.one).toBeGreaterThan(0.55);
    expect(size.two).toBeGreaterThan(0.9);
  });
});

describe('determinism, languages and style', () => {
  test('the same data give the same words, in any input order', () => {
    const a = text(CASES.periodic);
    const b = describeChart([
      {
        label: 'a',
        x: [...T].reverse(),
        y: [...CASES.periodic].reverse(),
      },
    ]).text;
    expect(b).toBe(a);
  });

  test('Spanish: the same shapes, the decimal comma, the same numbers', () => {
    const en = analyse(T, CASES.periodic);
    const es = describeChart([{ x: T, y: CASES.periodic }], {
      lang: 'es',
    }).text;
    expect(es).toMatch(
      /Un patrón que se repite cada 3,2\d*\s±\s0,00\d+ aproximadamente/
    );
    expect(es).toMatch(/x de 0 a 19,9/);
    expect(en.shape).toBe('periodic');
    const dip = describeChart([{ x: T, y: CASES.dip }], { lang: 'es' }).text;
    expect(dip).toMatch(/Una caída cerca de x = 9,0/);
    expect(dip).not.toMatch(/tránsito|eclipse|planeta|estrella/i);
  });

  test('English and Spanish have the same templates', () => {
    expect(Object.keys(TEMPLATES.es).sort()).toEqual(
      Object.keys(TEMPLATES.en).sort()
    );
  });

  test('the vocabulary names no interpretation, in either language', () => {
    const banned =
      /transit|eclips|orbit|planet|\bstar|flare|pulsat|binary|supernova|chirp|merger|redshift|exoplanet|tr[aá]nsito|[oó]rbita|planeta|estrella|erupci[oó]n|binaria|corrimiento/i;
    for (const lang of ['en', 'es']) {
      expect(TEMPLATE_TEXT[lang]).not.toMatch(banned);
    }
  });

  test('a chart is named, its axes are said, more series than six are counted', () => {
    const d = describeChart([{ label: 'Light', x: T, y: CASES.step }], {
      label: 'Brightness',
      xTitle: 'Time (d)',
      yTitle: 'Flux',
    }).text;
    expect(d).toMatch(/^Chart: Brightness\. Flux against Time \(d\)\. /);
    const many = Array.from({ length: LIMITS.series + 2 }, (_, i) => ({
      label: `s${i}`,
      x: T,
      y: CASES.trend,
    }));
    const text2 = describeChart(many).text;
    expect(text2).toMatch(/2 more series are not described here/);
    expect(
      describeChart([{ ...many[0], hidden: true }, many[1]]).series
    ).toHaveLength(1);
  });
});

describe('a held prediction is never described', () => {
  const HELD_WORDS =
    /highest|lowest|dip|rise|step|repeat|trend|constant|correlation|slope|stand out|\d+ more/i;

  test('held, a description is the axes and a sentence about why', () => {
    for (const lang of ['en', 'es']) {
      for (const [name, y] of Object.entries(CASES)) {
        const d = describeChart([{ x: T, y }], { lang, held: true });
        expect(d.held).toBe(true);
        expect(d.text).toMatch(lang === 'es' ? /^200 puntos/ : /^200 points/);
        expect(d.text).not.toMatch(HELD_WORDS);
        // The held text is the same whatever the data do.
        const other = describeChart([{ x: T, y: CASES.constant }], {
          lang,
          held: true,
        });
        expect(d.text).toBe(other.text);
        expect(d.series[0].facts.shape).toBe('few');
        expect(name.length).toBeGreaterThan(0);
      }
    }
  });

  const held = [];
  for (const inv of INVESTIGATIONS) {
    inv.steps.forEach((step, i) => {
      if (step.reveal) held.push({ inv, step, i });
    });
  }

  test('there are held predictions to test', () => {
    expect(INVESTIGATIONS.length).toBeGreaterThan(100);
    expect(held.length).toBeGreaterThan(150);
  });

  test('every shipped prediction is held from its own step to the step before its reveal', () => {
    for (const { inv, step, i } of held) {
      const at = inv.steps.findIndex(s => s.sid === step.reveal);
      expect(at).toBeGreaterThan(i);
      const visited = new Set(inv.steps.slice(0, i + 1).map(s => s.sid));
      visited.delete(step.reveal);
      for (let k = i; k < at; k++) {
        visited.add(inv.steps[k].sid);
        expect(holdsAnswer(inv.steps, inv.steps[k], visited)).toBe(true);
        expect(heldAttribute(inv.steps, inv.steps[k], visited)).toBe(
          ' data-answer-held'
        );
        // And what the chart then says is the held description.
        const d = describeChart([{ x: T, y: CASES.dips }], {
          held: holdsAnswer(inv.steps, inv.steps[k], visited),
        });
        expect(d.text).not.toMatch(HELD_WORDS);
      }
      // At the reveal step goToStep has visited it: nothing of its is held.
      visited.add(step.reveal);
      const stillHeld = inv.steps.some(
        (s, k) => k <= at && s.reveal && !visited.has(s.reveal)
      );
      expect(holdsAnswer(inv.steps, inv.steps[at], visited)).toBe(stillHeld);
    }
  });

  test('before the prediction, and with no lesson, nothing is held', () => {
    const { inv, i } = held[0];
    expect(holdsAnswer(inv.steps, inv.steps[0], new Set())).toBe(i === 0);
    expect(holdsAnswer(null, {}, new Set())).toBe(false);
    expect(holdsAnswer(inv.steps, { not: 'in the lesson' }, new Set())).toBe(
      false
    );
    expect(heldAttribute(inv.steps, { not: 'in it' }, new Set())).toBe('');
  });
});
