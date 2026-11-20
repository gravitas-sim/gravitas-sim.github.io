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
  scenarioOrbit,
  scenarioTransit,
  worldG,
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

// The tests read the numbers a figure carries, which a shipped figure with a
// withhold does not (keepData).
const keep = { keepData: true };
const orbitOf = (params, locale = 'en') =>
  read(figureFor({ from: 'orbit', params }, locale, keep).svg);
const transitOf = (params, locale = 'en') =>
  read(figureFor({ from: 'transit', params }, locale, keep).svg);

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

  test('the same bound holds at the app’s own G of 2, not only the integrator’s 1', () => {
    const { state } = orbitScene({ ...cases[0], dt, G: 2 });
    expect(worldG()).toBe(2);
    expect(state.G).toBe(2);
    const d = deriveOrbit(state);
    const miss = orbitMiss(
      orbitOf({ scenarioId: 'keplers-2nd-law', state }),
      d,
      d.a
    );
    expect(miss).toBeLessThanOrEqual(T);
    // The same positions and velocities under G = 1 are another orbit.
    const other = orbitMiss(
      orbitOf({ scenarioId: 'keplers-2nd-law', state: { ...state, G: 1 } }),
      d,
      d.a
    );
    expect(other).toBeGreaterThan(T * 1000);
  });

  test('a state recorded from another scenario is another figure', () => {
    const mine = deriveOrbit(ORBIT_STATE);
    const { state } = orbitScene({ ...cases[1], dt });
    const miss = orbitMiss(
      orbitOf({ scenarioId: 'keplers-2nd-law', state }),
      mine,
      mine.a
    );
    expect(miss).toBeGreaterThan(T * 1000);
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
import { formatNumber } from '../js/format.js';
import { FIGURES } from '../js/lesson/figureSpec.js';
import {
  figureProblems,
  figureFindings,
  figureLeaks,
} from '../tools/authoring/figureRules.mjs';
import { SCENARIO_PRESETS } from '../js/scenarios.js';
import { checkLesson } from '../js/authoring/rules.js';
import { mergeTranslation } from '../js/data/investigations/i18n.js';
import { gradedSteps } from '../js/data/investigations/catalog.js';
import { SCENARIO_INFO, scenarioId } from '../js/data/scenarioInfo.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import { stepMarkup, bindStepInputs } from '../js/investigations/stepView.js';
import {
  LESSON,
  SHADOW,
  ORBIT_STATE,
  TRANSIT_STATE,
} from './fixtures/model-figure-lesson.js';

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
  const esLesson = mergeTranslation(clone(LESSON), clone(SHADOW));
  test.each(figureSteps.map((s, i) => [s.sid, s, i]))('%s', (sid, step) => {
    const esStep = esLesson.steps.find(x => x.sid === sid);
    const whole = { ...step.figure, withhold: undefined };
    const en = figureFor(whole, 'en');
    // The Spanish figure as the merged lesson has it, its unit and all.
    const es = figureFor({ ...esStep.figure, withhold: undefined }, 'es');
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
    // The unit is a word of the language: au in English, ua in Spanish.
    if (step.figure.lengthUnit) {
      expect(en.numbers + en.alt).toMatch(/\d\u00a0au\b/);
      expect(en.numbers + en.alt).not.toMatch(/\bua\b/);
      expect(es.numbers + es.alt).toMatch(/\d\u00a0ua\b/);
      expect(es.numbers + es.alt).not.toMatch(/\bau\b/);
    }
  });

  test('a withheld quantity is not in the words, nor anything that fixes it; the shape is still drawn', () => {
    const f = clone(figureSteps[1].figure);
    const r = figureFor(f, 'en', keep);
    const e = deriveOrbit(ORBIT_STATE).e;
    const eText = formatNumber(e, { sig: 3, locale: 'en' });
    expect(r.alt + r.numbers).not.toMatch(
      /eccentricity|periapsis distance|apoapsis distance|foci/
    );
    expect(r.alt + r.numbers).not.toContain(eText);
    expect(r.alt).toMatch(/Semi-major axis \d/);
    expect(read(r.svg).ellipse.e).toBeCloseTo(e, 9);
    const es = figureFor(f, 'es');
    expect(es.alt + es.numbers).not.toMatch(
      /excentricidad|periastro|apoastro|focos/
    );
    expect(es.alt + es.numbers).not.toContain(
      formatNumber(e, { sig: 3, locale: 'es' })
    );
    // Unwithheld, it is all there.
    f.withhold = [];
    expect(figureFor(f, 'en').alt).toContain(`eccentricity ${eText}`);
  });

  test('a figure with a withhold ships no numeric data attribute; the test path keeps them', () => {
    const f = clone(figureSteps[1].figure);
    f.withhold = ['e'];
    const shipped = figureFor(f, 'en').svg;
    expect(shipped).not.toMatch(/data-(q|x|y|value|a|e)=/);
    expect(shipped).not.toContain(
      String(deriveOrbit(ORBIT_STATE).e).slice(0, 8)
    );
    expect(figureFor(f, 'en', keep).svg).toMatch(/data-value="/);
    // Unwithheld, the shipped figure keeps them.
    f.withhold = [];
    expect(figureFor(f, 'en').svg).toMatch(/data-q="ellipse"/);
    const t = { ...clone(figureSteps[3].figure), withhold: ['b'] };
    expect(figureFor(t, 'en').svg).not.toMatch(/data-(q|x|y|value|a|e)=/);
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

  test('fill puts the picture and its caption under the step text, or nothing', () => {
    const body = host();
    fill(body.querySelector('.inv-step-body'), figureSteps[0], 'es');
    const el = body.querySelector('.inv-step-body + figure.inv-figure');
    expect(el.dataset.modelFigure).toBe(figureSteps[0].sid);
    expect(el.querySelector('svg[role="img"]')).not.toBeNull();
    expect(el.querySelector('figcaption').textContent).toMatch(/Modelado/);
    // The numbers have a class of their own, not the credit line's.
    expect(el.querySelector('.inv-figure-readout')).not.toBeNull();
    expect(el.querySelector('.inv-figure-credit')).toBeNull();
    // A state with no orbit in it draws nothing.
    const gone = host();
    fill(
      gone.querySelector('.inv-step-body'),
      { sid: 'x', ...ORBIT_UNBOUND },
      'en'
    );
    expect(gone.querySelector('figure')).toBeNull();
    body.remove();
    gone.remove();
  });

  test('fill draws once, and not into text that has left the page', () => {
    const body = host();
    const at = body.querySelector('.inv-step-body');
    fill(at, figureSteps[0], 'en');
    fill(at, figureSteps[0], 'en');
    expect(body.querySelectorAll('figure')).toHaveLength(1);
    const off = document.createElement('div');
    off.innerHTML = '<div class="inv-step-body"></div>';
    fill(off.firstChild, figureSteps[0], 'en');
    expect(off.querySelector('figure')).toBeNull();
    body.remove();
  });
});

/** A panel in the document, with a step's text in it. */
function host() {
  const el = document.createElement('div');
  el.innerHTML = '<div class="inv-step-body"><p>Text</p></div>';
  document.body.append(el);
  return el;
}

describe('the drawn geometry is the tested numbers', () => {
  const near = (got, want, tol) =>
    expect(Math.abs(got - want)).toBeLessThanOrEqual(tol + 1e-9);
  const num = (el, a) => Number(el.getAttribute(a));
  const svgOf = f => {
    const box = document.createElement('div');
    box.innerHTML = figureFor(f, 'en', keep).svg;
    return box.firstChild;
  };

  for (const omegaDeg of [0, 37, 141, 263]) {
    test(`orbit turned ${omegaDeg} deg: the pixels map back to the data`, () => {
      const svg = svgOf({
        from: 'orbit',
        params: { a: 100, e: 0.6, omegaDeg },
      });
      const q = name => svg.querySelector(`[data-q="${name}"]`);
      const ell = q('ellipse');
      const peri = q('periapsis');
      const apo = q('apoapsis');
      const emp = q('empty-focus');
      const foc = q('focus');
      const world = el => ({ x: num(el, 'data-x'), y: num(el, 'data-y') });
      const mid = {
        x: (world(peri).x + world(apo).x) / 2,
        y: (world(peri).y + world(apo).y) / 2,
      };
      const cx = num(ell, 'cx');
      const cy = num(ell, 'cy');
      const k = num(ell, 'rx') / num(ell, 'data-a');
      // One pixel position of a world point, through the inverse mapping.
      const back = (px, py) => ({
        x: mid.x + (px - cx) / k,
        y: mid.y - (py - cy) / k,
      });
      // Pixel rounding is 0.05; in world units that over the scale.
      // Rounding: 0.05 px on each pixel, and the scale is read from a radius
      // rounded to 0.1 px, so a point far from the centre is off by that share.
      const tol = el => {
        const [px, py] = centre(el);
        return (
          (0.051 +
            ((Math.abs(px - cx) + Math.abs(py - cy)) * 0.05) / num(ell, 'rx')) /
          k
        );
      };
      const centre = el =>
        el === peri
          ? [num(el, 'x') + 4, num(el, 'y') + 4]
          : el === apo
            ? (() => {
                const m = el.getAttribute('d').match(/M([\d.]+) ([\d.]+)/);
                return [Number(m[1]), Number(m[2]) + 5.5];
              })()
            : [num(el, 'cx'), num(el, 'cy')];
      for (const el of [peri, apo, emp, foc]) {
        const [px, py] = centre(el);
        const w = back(px, py);
        near(w.x, world(el).x, tol(el));
        near(w.y, world(el).y, tol(el));
      }
      // The chord is drawn between the apsides' own pixels.
      const chord = svg.querySelector('line.mf-d');
      const [p1x, p1y] = centre(peri);
      const [a1x, a1y] = centre(apo);
      near(num(chord, 'x1'), p1x, 0.06);
      near(num(chord, 'y1'), p1y, 0.06);
      near(num(chord, 'x2'), a1x, 0.06);
      near(num(chord, 'y2'), a1y, 0.06);
      // The ellipse is turned by the angle of its periapsis (y is down on
      // the page), about its own centre, and its axes are a and b.
      const [, rot, rcx, rcy] = ell
        .getAttribute('transform')
        .match(/rotate\((-?[\d.]+) ([\d.]+) ([\d.]+)\)/)
        .map(Number);
      expect([rcx, rcy]).toEqual([cx, cy]);
      const omega = Math.atan2(world(peri).y - mid.y, world(peri).x - mid.x);
      // The turn, in degrees, wrapped to a half turn either side.
      const turn =
        ((((rot - (-omega * 180) / Math.PI + 540) % 360) + 360) % 360) - 180;
      near(turn, 0, 0.002);
      const rx = num(ell, 'rx');
      near(num(ell, 'ry'), rx * Math.sqrt(1 - 0.6 ** 2), 0.06);
      // The periapsis lies on the drawn ellipse's major axis end.
      near(p1x - cx, rx * Math.cos(-omega), 0.1);
      near(p1y - cy, rx * Math.sin(-omega), 0.1);
    });
  }

  for (const [name, params] of [
    ['constants', { k: 0.1, b: 0.4 }],
    ['a recorded state', { scenarioId: 'transit-lab', state: TRANSIT_STATE }],
  ])
    test(`transit from ${name}: the pixels map back to the data`, () => {
      const svg = svgOf({ from: 'transit', params });
      const q = n => svg.querySelector(`[data-q="${n}"]`);
      const star = q('star');
      const R = num(star, 'r');
      const planet = q('planet');
      const b = Number(q('impact').dataset.value);
      const k = Number(planet.dataset.value);
      // The impact parameter is the planet's height above the star's centre.
      near((num(star, 'cy') - num(planet, 'cy')) / R, b, 0.06 / R);
      near(num(planet, 'r') / R, k, 0.06 / R);
      // The chord runs from first to last contact, with its 14 px overhang.
      const path = q('path');
      const half = (num(path, 'x2') - num(path, 'x1') - 28) / 2 / R;
      near(half, Number(path.dataset.value) / 2, 0.1 / R);
      // The contact discs sit at the contact distance.
      const contacts = [...svg.querySelectorAll('circle.mf-c')];
      expect(contacts).toHaveLength(2);
      near(
        (num(contacts[1], 'cx') - num(contacts[0], 'cx')) / 2 / R,
        Math.sqrt((1 + k) ** 2 - b * b),
        0.1 / R
      );
      // The inner chord is the second to the third contact.
      const inner = q('inner');
      near(
        (num(inner, 'x2') - num(inner, 'x1')) / R,
        Number(inner.dataset.value),
        0.1 / R
      );
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
  const problems = f =>
    figureProblems(
      f,
      id => id in SCENARIO_INFO,
      id =>
        SCENARIO_PRESETS[scenarioId(id)]?.gravitational_constant ??
        DEFAULT_SETTINGS.gravitational_constant
    );
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
    // The unit is a word, so the shadow translates it; the numbers are structural.
    expect(LESSON.steps[0].figure.lengthUnit).toBe('au');
    expect(es.steps[0].figure.lengthUnit).toBe('ua');
    expect(es.steps[0].figure.from).toBe('orbit');
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

  const G = id =>
    SCENARIO_PRESETS[scenarioId(id)]?.gravitational_constant ??
    DEFAULT_SETTINGS.gravitational_constant;
  const known = id => id in SCENARIO_INFO;

  test('a state is tied to its scenario: the same G, or an error', () => {
    const f = clone(figureSteps[1].figure);
    expect(figureProblems(f, known, G)).toEqual([]);
    expect(G('keplers-2nd-law')).toBe(ORBIT_STATE.G);
    // The app's own G is 2: a state recorded there, named for a scenario that
    // runs under 1, was not recorded from that scenario.
    expect(DEFAULT_SETTINGS.gravitational_constant).toBe(2);
    f.params.state = { ...f.params.state, G: 2 };
    expect(figureProblems(f, known, G).join('\n')).toMatch(
      /state.G is 2, but scenario "keplers-2nd-law" runs under G = 1/
    );
    // Named for a scenario that does run under 2, it passes.
    const [two] = Object.keys(SCENARIO_INFO).filter(id => G(id) === 2);
    if (two) {
      f.params.scenarioId = two;
      expect(figureProblems(f, known, G)).toEqual([]);
    }
    // Where the scenario's G cannot be resolved, it is not guessed.
    f.params.scenarioId = 'keplers-2nd-law';
    expect(figureProblems(f, known)).toEqual([]);
  });

  test('the fixture states are the scenarios’ own, as the world builder leaves them', () => {
    const close = (a, b, path = '') => {
      if (typeof a === 'number')
        return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
      return Object.keys(b).every(k => close(a[k], b[k], `${path}.${k}`));
    };
    expect(
      close(scenarioOrbit('keplers-2nd-law', 'Eccentric Orbiter'), ORBIT_STATE)
    ).toBe(true);
    expect(close(scenarioTransit('transit-lab', 0.4), TRANSIT_STATE)).toBe(
      true
    );
    expect(ORBIT_STATE.G).toBe(worldG());
  });

  test('a transit state with the planet behind the star, or a body with no size, draws nothing', () => {
    const behind = clone(TRANSIT_STATE);
    behind.planet.x = -behind.planet.x;
    const flat = clone(TRANSIT_STATE);
    flat.planet.r = 0;
    for (const [state, message] of [
      [behind, /behind the star/],
      [flat, /radii must be greater than zero/],
    ]) {
      const f = {
        from: 'transit',
        params: { scenarioId: 'transit-lab', state },
      };
      expect(figureFor(f, 'en').ok).toBe(false);
      expect(figureProblems(f, known, G).join('\n')).toMatch(message);
    }
    // And in front, it is drawn.
    expect(
      figureFor(
        {
          from: 'transit',
          params: { scenarioId: 'transit-lab', state: TRANSIT_STATE },
        },
        'en'
      ).ok
    ).toBe(true);
  });

  test('a step whose answer is a quantity its figure names is an error, until it is withheld', () => {
    const f = { from: 'orbit', params: { a: 100, e: 0.5 } };
    const leaking = [
      { figure: f, answer: 0.5 },
      { figure: f, fields: [{ want: 100 }] },
      { figure: f, fields: [{ want: '50 au' }] },
      { figure: { from: 'transit', params: { k: 0.1, b: 0.4 } }, answer: 0.4 },
    ];
    for (const step of leaking) expect(figureLeaks(step)).not.toEqual([]);
    expect(figureLeaks({ figure: f, answer: 12345 })).toEqual([]);
    expect(
      figureLeaks({ figure: { ...f, withhold: ['e'] }, answer: 0.5 })
    ).toEqual([]);
    const inv = clone(LESSON);
    inv.steps[0].answer = 0.5;
    const found = figureFindings({
      investigations: [inv],
      scenarios: SCENARIO_INFO,
      scenarioId,
    });
    expect(found.map(x => [x.rule, x.step])).toContainEqual(['ref/figure', 0]);
    expect(found[0].message).toMatch(/eccentricity|\be\b/);
  });

  test('the photograph form is left to its own test', () => {
    expect(
      problems({ src: 'images/transit-of-venus-2012.webp', alt: 'x' })
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

  test('a drawn figure adds nothing to the markup (its module fills it in); a photograph is as it was', () => {
    const drawn = stepMarkup(figureSteps[0], ctx(figureSteps[0])).join('');
    expect(drawn).not.toMatch(/<img|<svg|<figure/);
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

describe('the figure arrives after an import, and the panel may have moved on', () => {
  let body;
  let at;
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
  const bind = () =>
    bindStepInputs({
      els: () => ({ body }),
      responses: () => ({}),
      attempts: () => ({}),
      stepId: () => LESSON.steps[at].sid,
      currentStep: () => LESSON.steps[at],
      steps: () => LESSON.steps,
      save: () => {},
      renderStep: () => {},
      refreshMeasurements: () => {},
    });
  const paint = () => {
    body.innerHTML = stepMarkup(LESSON.steps[at], ctx(LESSON.steps[at])).join(
      ''
    );
    bind();
  };
  // Let the dynamic import settle, and then some.
  const settle = async () => {
    await import('../js/lessonFigures.js');
    await new Promise(r => setTimeout(r, 40));
  };
  beforeEach(() => {
    body = document.createElement('div');
    document.body.append(body);
    at = 0;
  });
  afterEach(() => body.remove());

  test('a step that is still the step gets its figure, tagged with its sid', async () => {
    paint();
    await settle();
    const fig = body.querySelectorAll('figure.inv-figure');
    expect(fig).toHaveLength(1);
    expect(fig[0].dataset.modelFigure).toBe(LESSON.steps[0].sid);
  });

  test('moving to another step before the import resolves draws nothing for the old one', async () => {
    paint();
    // Before the module has resolved: the student is on the next step, which
    // has no figure of this form (a text step).
    at = 4;
    body.innerHTML = stepMarkup(LESSON.steps[4], ctx(LESSON.steps[4])).join('');
    await settle();
    expect(body.querySelector('figure')).toBeNull();
  });

  test('rendering twice while the import is pending leaves one figure', async () => {
    paint();
    paint();
    paint();
    await settle();
    expect(body.querySelectorAll('figure.inv-figure')).toHaveLength(1);
  });

  test('binding twice onto the same text leaves one figure', async () => {
    paint();
    bind();
    await settle();
    expect(body.querySelectorAll('figure.inv-figure')).toHaveLength(1);
  });

  test('a panel taken out of the page before the import resolves is not drawn into', async () => {
    paint();
    const gone = body.querySelector('.inv-step-body');
    body.innerHTML = '';
    await settle();
    expect(gone.nextElementSibling).toBeNull();
    expect(body.querySelector('figure')).toBeNull();
  });
});
