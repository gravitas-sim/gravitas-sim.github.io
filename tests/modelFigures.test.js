// The figures drawn from the model, against numbers derived from the
// integrator's own state by a path that shares no code with
// js/lessonFigures.js (tests/modelFigureScenes.js), at the bounds committed in
// tests/fixtures/model-figure-tolerances.json before the figures existed.
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { figureFor } from '../js/lessonFigures.js';
import {
  TOL,
  orbitScene,
  deriveOrbit,
  transitScene,
  deriveTransit,
} from './modelFigureScenes.js';

const dt = TOL.world.step;

/** The numbers a figure's SVG carries, read back from its data attributes. */
function read(svg) {
  const box = document.createElement('div');
  box.innerHTML = svg;
  const out = {};
  for (const el of box.querySelectorAll('[data-q]')) {
    const d = el.dataset;
    out[d.q] = Object.fromEntries(
      Object.entries(d)
        .filter(([k]) => k !== 'q')
        .map(([k, v]) => [k, Number(v)])
    );
  }
  return out;
}

const orbitOf = (params, locale = 'en') =>
  read(figureFor({ from: 'orbit', params }, locale).svg);
const transitOf = (params, locale = 'en') =>
  read(figureFor({ from: 'transit', params }, locale).svg);

/** Worst error of an orbit figure against a derivation, in units of a. */
function orbitMiss(fig, d, a) {
  const rel = x => Math.abs(x) / a;
  return Math.max(
    rel(fig.ellipse.a - d.a),
    Math.abs(fig.ellipse.e - d.e),
    rel(fig.periapsis.value - d.periapsis),
    rel(fig.apoapsis.value - d.apoapsis),
    rel(fig['empty-focus'].value - d.focalSeparation),
    rel(fig.periapsis.x - d.periapsisAt.x),
    rel(fig.periapsis.y - d.periapsisAt.y),
    rel(fig.apoapsis.x - d.apoapsisAt.x),
    rel(fig.apoapsis.y - d.apoapsisAt.y),
    rel(fig['empty-focus'].x - d.emptyFocusAt.x),
    rel(fig['empty-focus'].y - d.emptyFocusAt.y)
  );
}

describe('orbit figure from a recorded state', () => {
  const T = TOL.orbit.fromState.relativeToA;
  const cases = [
    { a: 100, e: 0.5, omegaDeg: 0, sense: 1, fraction: 0.25 },
    { a: 80, e: 0.2, omegaDeg: 37, sense: 1, fraction: 0.5 },
    { a: 100, e: 0.8, omegaDeg: 141, sense: -1, fraction: 0.3 },
    { a: 60, e: 0.05, omegaDeg: 263, sense: -1, fraction: 0.7 },
  ];
  for (const c of cases)
    test(`a ${c.a}, e ${c.e}, turned ${c.omegaDeg} deg, sense ${c.sense}`, () => {
      const { state } = orbitScene({ ...c, dt });
      const d = deriveOrbit(state);
      const miss = orbitMiss(
        orbitOf({ scenarioId: 'keplers-2nd-law', state }),
        d,
        d.a
      );
      console.log(
        `orbit from state a=${c.a} e=${c.e}: miss ${miss.toExponential(2)} (bound ${T})`
      );
      expect(miss).toBeLessThanOrEqual(T);
    });

  test('a state whose G is not the world’s fails the bound by far', () => {
    const { state } = orbitScene({ ...cases[0], dt });
    const d = deriveOrbit(state);
    const wrong = { ...state, G: state.G * 2 };
    const miss = orbitMiss(
      orbitOf({ scenarioId: 'keplers-2nd-law', state: wrong }),
      d,
      d.a
    );
    expect(miss).toBeGreaterThan(T * 1000);
  });
});

describe('orbit figure from the lesson constants', () => {
  const F = TOL.orbit.fromConstants;
  for (const { a, e } of F.cases)
    for (const fraction of F.periodFractions)
      test(`a ${a}, e ${e}, scene after ${fraction} of a period`, () => {
        const { state, wp } = orbitScene({ a, e, fraction, dt });
        const bound = 2 * (wp * dt) ** 2;
        const d = deriveOrbit(state);
        const miss = orbitMiss(orbitOf({ a, e }), d, a);
        console.log(
          `orbit from constants a=${a} e=${e} f=${fraction}: miss ${miss.toExponential(2)} (bound ${bound.toExponential(2)})`
        );
        expect(miss).toBeLessThanOrEqual(bound);
        // The negative controls: a figure that is not this scene's misses.
        expect(orbitMiss(orbitOf({ a, e: e + 0.05 }), d, a)).toBeGreaterThan(
          bound * 1000
        );
        expect(orbitMiss(orbitOf({ a: a * 1.01, e }), d, a)).toBeGreaterThan(
          bound * 1000
        );
      });
});

/** Worst error of a transit figure against a derivation; a missing shape is an infinite miss. */
function transitMiss(fig, d) {
  const miss = (shape, want) =>
    shape ? Math.abs(shape.value - want) : Infinity;
  return Math.max(
    miss(fig.planet, d.k),
    miss(fig.impact, d.b),
    miss(fig.path, d.contactLength),
    d.innerLength === null ? 0 : miss(fig.inner, d.innerLength)
  );
}

describe('transit figure from a recorded state', () => {
  const T = TOL.transit.fromState.absolute;
  for (const c of TOL.transit.fromConstants.cases)
    for (const phiDeg of TOL.transit.fromConstants.positionAnglesDeg)
      test(`b ${c.b}, position angle ${phiDeg}`, () => {
        const { state } = transitScene({
          ...c,
          phiDeg,
          orbitRadius: TOL.transit.fromConstants.orbitRadius,
          dt,
        });
        const d = deriveTransit(state);
        const fig = transitOf({ scenarioId: 'transit-lab', state });
        const miss = transitMiss(fig, d);
        console.log(
          `transit from state b=${c.b} phi=${phiDeg}: miss ${miss.toExponential(2)} (bound ${T})`
        );
        expect(miss).toBeLessThanOrEqual(T);
        const wrong = {
          ...state,
          observer: { ...state.observer, incDeg: state.observer.incDeg - 1 },
        };
        expect(
          transitMiss(transitOf({ scenarioId: 'transit-lab', state: wrong }), d)
        ).toBeGreaterThan(T * 1e6);
      });
});

describe('transit figure from the lesson constants', () => {
  const F = TOL.transit.fromConstants;
  for (const c of F.cases)
    for (const phiDeg of F.positionAnglesDeg)
      test(`b ${c.b}, position angle ${phiDeg}`, () => {
        const { state, track } = transitScene({
          ...c,
          phiDeg,
          orbitRadius: F.orbitRadius,
          dt,
        });
        const d = deriveTransit(state);
        const fig = transitOf({ k: c.k, b: c.b });
        expect(Math.abs(fig.planet.value - d.k)).toBeLessThanOrEqual(
          F.k.absolute
        );
        expect(Math.abs(fig.impact.value - d.b)).toBeLessThanOrEqual(
          F.b.absolute
        );
        expect(
          Math.abs(fig.path.value - track.contactLength)
        ).toBeLessThanOrEqual(F.contactLength.absolute);
        // Negative controls.
        const off = transitOf({ k: c.k, b: c.b + 0.05 });
        expect(Math.abs(off.impact.value - d.b)).toBeGreaterThan(
          F.b.absolute * 10
        );
        const big = transitOf({ k: c.k + 0.01, b: c.b });
        expect(Math.abs(big.planet.value - d.k)).toBeGreaterThan(
          F.k.absolute * 10
        );
      });
});

// --- Words, access, themes, declaration ---------------------------------------
import { fill } from '../js/lessonFigures.js';
import { FIGURES } from '../js/lesson/figureSpec.js';
import {
  figureProblems,
  figureFindings,
} from '../tools/authoring/figureRules.mjs';
import { checkLesson } from '../js/authoring/rules.js';
import { mergeTranslation } from '../js/data/investigations/i18n.js';
import { gradedSteps } from '../js/data/investigations/catalog.js';
import { SCENARIO_INFO, scenarioId } from '../js/data/scenarioInfo.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import { stepMarkup } from '../js/investigations/stepView.js';
import { LESSON, SHADOW } from './fixtures/model-figure-lesson.js';

const clone = x => JSON.parse(JSON.stringify(x));
const figureSteps = LESSON.steps.filter(s => s.figure);
const refs = {
  widgets: [],
  scenarios: SCENARIO_INFO,
  scenarioId,
  settingKeys: new Set(Object.keys(DEFAULT_SETTINGS)),
  gradedSteps,
};

describe('the words, in both languages', () => {
  test.each(figureSteps.map(s => [s.sid, s]))('%s', (sid, step) => {
    const whole = { ...step.figure, withhold: undefined };
    const en = figureFor(whole, 'en');
    const es = figureFor(clone({ ...whole, unit: undefined }), 'es');
    for (const r of [en, es]) {
      expect(r.ok).toBe(true);
      // As long as the photograph form's alt text must be.
      expect(r.alt.length).toBeGreaterThan(30);
      expect(r.svg).toMatch(/role="img" aria-label="[^"]{30,}"/);
      expect(r.alt + r.caption + r.numbers).not.toMatch(
        /NaN|undefined|null|Infinity/
      );
    }
    expect(en.alt).not.toEqual(es.alt);
    // What is modelled, what is schematic, and that it is an illustration.
    expect(en.caption).toMatch(/Modelled:.*Schematic:.*illustration/s);
    expect(es.caption).toMatch(/Modelado:.*Esquemático:.*ilustración/s);
    // Numbers are localized: a decimal comma in Spanish, a point in English.
    expect(en.numbers).toMatch(/\d\.\d/);
    expect(es.numbers).toMatch(/\d,\d/);
    expect(es.numbers).not.toMatch(/\d\.\d/);
  });

  test('a withheld quantity is not in the words, nor anything that fixes it; the shape is still drawn', () => {
    const f = clone(figureSteps[1].figure);
    const r = figureFor(f, 'en');
    expect(r.alt + r.numbers).not.toMatch(
      /eccentricity|periapsis distance|apoapsis distance|foci|0\.5/
    );
    expect(r.alt).toMatch(/Semi-major axis 100\./);
    expect(read(r.svg).ellipse.e).toBeCloseTo(0.5, 5);
    const es = figureFor(f, 'es');
    expect(es.alt + es.numbers).not.toMatch(
      /excentricidad|periastro|apoastro|focos|0,5/
    );
    // Unwithheld, it is all there.
    f.withhold = [];
    expect(figureFor(f, 'en').alt).toMatch(/eccentricity 0\.500/);
  });

  test.each(figureSteps.map(s => [s.sid, s]))(
    '%s: whatever is withheld, the words name at most one number of the two that fix the figure',
    (sid, step) => {
      for (const q of FIGURES[step.figure.from].quantities) {
        const f = { ...clone(step.figure), withhold: [q] };
        for (const locale of ['en', 'es']) {
          const r = figureFor(f, locale);
          // One number: one "; "-separated item at most.
          expect((r.numbers.match(/;/g) || []).length).toBe(0);
          expect(r.numbers).not.toContain(
            figureFor({ ...f, withhold: [] }, locale).numbers
          );
        }
      }
    }
  );
});

describe('the drawing', () => {
  test('is drawn with theme tokens that every theme defines, never a fixed colour', () => {
    const css = readFileSync(
      new URL('../css/tokens.css', import.meta.url),
      'utf8'
    );
    for (const s of figureSteps) {
      const svg = figureFor(s.figure, 'en').svg;
      expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
      for (const [, token] of svg.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
        // Defined for the base theme; the other three override values, and an
        // override of a token that was never defined would be a typo.
        expect(css).toMatch(new RegExp(`^\\s*${token}:`, 'm'));
      }
    }
  });

  test('every label is at least the 11 unit type the panel scales from', () => {
    for (const s of figureSteps) {
      const svg = figureFor(s.figure, 'en').svg;
      expect(svg).toMatch(/font:11px/);
      expect(svg).not.toMatch(/font-size:\s*(\d|10)(\.\d+)?px/);
    }
  });

  test('fill puts the picture and its caption in the placeholder, or hides it', () => {
    const el = document.createElement('figure');
    fill(el, figureSteps[0].figure, 'es');
    expect(el.querySelector('svg[role="img"]')).not.toBeNull();
    expect(el.querySelector('figcaption').textContent).toMatch(/Modelado/);
    const bad = document.createElement('figure');
    fill(bad, { from: 'orbit', params: { a: 10, e: 0.5 }, unit: 1 }, 'en');
    // Sound params with a silly unit still draw; a state with no orbit hides.
    const unbound = clone(ORBIT_UNBOUND);
    const gone = document.createElement('figure');
    fill(gone, unbound, 'en');
    expect(gone.hidden).toBe(true);
  });
});

const ORBIT_UNBOUND = {
  from: 'orbit',
  params: {
    scenarioId: 'keplers-2nd-law',
    state: {
      G: 1,
      primary: { x: 0, y: 0, vx: 0, vy: 0, m: 1 },
      body: { x: 10, y: 0, vx: 0, vy: 5, m: 0 },
    },
  },
};

describe('the declaration and the authoring rules', () => {
  const problems = f => figureProblems(f, id => id in SCENARIO_INFO);
  const orbit = { from: 'orbit', params: { a: 100, e: 0.5 } };

  test('the fixture lesson passes the rules, with no figure finding', () => {
    expect(
      figureFindings({
        investigations: [clone(LESSON)],
        scenarios: SCENARIO_INFO,
        scenarioId,
      })
    ).toEqual([]);
    const found = checkLesson(clone(LESSON), refs).filter(
      f => f.level === 'error'
    );
    expect(found).toEqual([]);
  });

  test('its Spanish shadow merges and keeps every number', () => {
    const es = mergeTranslation(clone(LESSON), clone(SHADOW));
    // `unit` is a symbol (STRUCTURAL in js/data/investigations/i18n.js): kept as the lesson has it.
    expect(es.steps[0].figure.unit).toBe('au');
    expect(es.steps[0].figure.params).toEqual(LESSON.steps[0].figure.params);
    expect(es.steps[1].figure.params.state).toEqual(
      LESSON.steps[1].figure.params.state
    );
  });

  test.each([
    ['an unknown id', { ...orbit, from: 'spiral' }, /names no figure/],
    ['no params', { from: 'orbit' }, /params is missing/],
    [
      'a missing param',
      { from: 'orbit', params: { a: 100 } },
      /params.e is missing/,
    ],
    [
      'an eccentricity of 1',
      { from: 'orbit', params: { a: 100, e: 1 } },
      /outside the range/,
    ],
    [
      'a stray param',
      { from: 'orbit', params: { a: 1, e: 0, q: 3 } },
      /q is not a parameter/,
    ],
    [
      'no transit at b',
      { from: 'transit', params: { k: 0.1, b: 1.2 } },
      /outside the range/,
    ],
    [
      'a state with no scenario',
      { from: 'orbit', params: { state: ORBIT_UNBOUND.params.state } },
      /scenarioId/,
    ],
    [
      'a state of another scenario name',
      {
        from: 'orbit',
        params: { scenarioId: 'nowhere', state: ORBIT_UNBOUND.params.state },
      },
      /names no scenario/,
    ],
    [
      'a state missing a number',
      {
        from: 'transit',
        params: { scenarioId: 'transit-lab', state: { star: { x: 0, y: 0 } } },
      },
      /star.r is not a number/,
    ],
    [
      'a withheld quantity it has not',
      { ...orbit, withhold: ['k'] },
      /withhold lists only/,
    ],
    [
      'both a photograph and a drawing',
      { ...orbit, src: 'images/x.jpg' },
      /not both/,
    ],
  ])('%s fails', (name, f, message) => {
    expect(problems(f).join('\n')).toMatch(message);
    const inv = clone(LESSON);
    inv.steps[0].figure = f;
    const found = figureFindings({
      investigations: [inv],
      scenarios: SCENARIO_INFO,
      scenarioId,
    });
    expect(found.map(x => [x.rule, x.lesson, x.step])).toContainEqual([
      'ref/figure',
      inv.id,
      0,
    ]);
  });

  test('the photograph form is left to its own test', () => {
    expect(
      problems({ src: 'images/transit-of-venus-2012.jpg', alt: 'x' })
    ).toEqual([]);
    expect(Object.keys(FIGURES)).toEqual(['orbit', 'transit']);
  });
});

describe('the step markup', () => {
  const ctx = step => ({
    id: step.sid,
    saved: undefined,
    active: null,
    responses: {},
    visited: new Set(),
    shown: () => [step],
    predictionAnsweredHere: () => false,
    recomputeFields: () => {},
  });

  test('a drawn figure leaves a placeholder and nothing else; a photograph is as it was', () => {
    const drawn = stepMarkup(figureSteps[0], ctx(figureSteps[0])).join('');
    expect(drawn).toMatch(
      /<figure class="inv-figure" data-figure-from="orbit"><\/figure>/
    );
    expect(drawn).not.toMatch(/<img|<svg/);
    const photo = {
      ...LESSON.steps[4],
      sid: 'p',
      figure: {
        src: 'images/a.jpg',
        alt: 'An alt text of some length',
        caption: 'c',
        author: 'A',
        license: 'L',
        licenseUrl: 'https://x.test/',
        source: 'https://x.test/',
      },
    };
    const html = stepMarkup(photo, ctx(photo)).join('');
    expect(html).toMatch(
      /<img src="images\/a.jpg" alt="An alt text of some length"/
    );
    expect(html).not.toMatch(/data-figure-from/);
  });
});
