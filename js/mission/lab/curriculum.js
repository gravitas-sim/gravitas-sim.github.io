// =============================================================================
// The mission lab's curriculum: one mission to Mars, in three guided parts
// -----------------------------------------------------------------------------
// Data, in the shape js/guideDocs.js lays out for instructors (GUIDES, each
// with its steps), and the functions that check a step against the reader's
// own lab: the plan they have made and what the Worker computed from it
// (js/mission/solar.js). Nothing is checked against prose or against the key;
// a reader whose plan differs is checked against their own numbers.
//
//   ml-orbit    in Earth orbit: meeting the depot (the rendezvous case)
//   ml-window   leaving for Mars: the launch window and its trade-offs
//   ml-cruise   on the way: the patched conic against the direct flight,
//               and the correction a real mission would need
//
// Step kinds:
//
//   read      words only
//   choose    a choice: a prediction (`correct: null`, recorded, never
//             marked), or a question whose right option is computed
//   answer    a number read from the lab, within `tolerance`
//   do        something to do in the lab, checked by `check(state)`; `go`
//             is what doing it means, for "Show me" and the reference run
//   explain   a written explanation of at least `minWords` words, recorded
//             for the instructor and never marked
//
// A state is {plan, mission, window}: the plan, the Worker's answer for it
// (computeMission), and the last transfer window.
// =============================================================================

import { BODIES } from '../bodies.js';
import { planeChange } from '../transfers.js';
import { dateOfJd, jdOfDate, JD_J2000 } from '../ephemeris.js';

const DEG = Math.PI / 180;

/** The window the lab opens on: the 2026 Earth-Mars opportunity, a day a column. */
export const DEFAULT_WINDOW = Object.freeze({
  from: 'earth',
  to: 'mars',
  departStart: jdOfDate('2026-09-01') - JD_J2000,
  departSpan: 150,
  departSteps: 151,
  tofMin: 150,
  tofMax: 400,
  tofSteps: 126,
});

const ALL = ['venus', 'earth', 'mars', 'jupiter'];
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const flownAsDesigned = s =>
  s.mission?.ok && sameSet(s.mission.direct.bodies, ALL) && s.mission.direct.start === 'periapsis';

/** The window's cheapest cell, as a date and a whole time of flight. */
export function bestOf(w) {
  if (!w?.best) return null;
  return { date: dateOfJd(JD_J2000 + w.best.depart), tofDays: Math.round(w.best.tof), total: w.best.total, c3: w.best.c3 };
}

/** The cheapest total among the window's cells of about 200 days. */
export function fastestNear(w, days = 200, halfWidth = 10) {
  const o = w.options;
  let best = Infinity;
  for (let i = 0; i < w.rows; i++)
    for (let j = 0; j < o.tofSteps; j++) {
      const tof = o.tofSteps === 1 ? o.tofMin : o.tofMin + ((o.tofMax - o.tofMin) * j) / (o.tofSteps - 1);
      const k = i * o.tofSteps + j;
      if (Math.abs(tof - days) <= halfWidth && w.cellStatus[k] === 0 && w.total[k] < best) best = w.total[k];
    }
  return best;
}

export const GUIDES = [
  {
    id: 'ml-orbit',
    target: 'earth-orbit',
    minutes: { intro: 15, advanced: 25 },
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      { id: 'predict', kind: 'choose', path: 'both', options: ['climb', 'turn', 'same'], correct: null },
      {
        id: 'dv',
        kind: 'answer',
        path: 'both',
        unit: 'm/s',
        tolerance: 1,
        answer: s => s.mission.rendezvous.total * 1000,
      },
      {
        id: 'wait',
        kind: 'answer',
        path: 'both',
        unit: 'min',
        tolerance: 1,
        answer: s => s.mission.rendezvous.wait / 60,
      },
      {
        id: 'compare',
        kind: 'choose',
        path: 'both',
        options: ['climb', 'turn', 'same'],
        correct: 'computed',
        correctOf: s => (turnCost(s) > s.mission.rendezvous.total * 1000 * 1.1 ? 'turn' : turnCost(s) * 1.1 < s.mission.rendezvous.total * 1000 ? 'climb' : 'same'),
      },
      {
        id: 'phase',
        kind: 'do',
        path: 'advanced',
        check: s => s.mission?.ok && s.mission.rendezvous.wait < 600,
        go: s => ({ depot: { ...s.plan.depot, phaseDeg: Number(((s.mission.rendezvous.lead / DEG) + 0.3).toFixed(2)) } }),
      },
      {
        id: 'waitAgain',
        kind: 'answer',
        path: 'advanced',
        unit: 'min',
        tolerance: 1,
        answer: s => s.mission.rendezvous.wait / 60,
      },
      { id: 'limits', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'ml-window',
    target: 'window-2026',
    minutes: { intro: 20, advanced: 30 },
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      { id: 'predict', kind: 'choose', path: 'both', options: ['yes', 'no'], correct: null },
      {
        id: 'open',
        kind: 'do',
        path: 'both',
        check: s => s.window?.options?.from === 'earth' && s.window.options.to === 'mars' && s.window.status === 'ok',
        go: () => ({ window: { ...DEFAULT_WINDOW } }),
      },
      {
        id: 'best',
        kind: 'do',
        path: 'both',
        check: s => {
          const b = bestOf(s.window);
          return !!b && s.mission?.ok && s.plan.depart.date === b.date && s.plan.depart.tofDays === b.tofDays;
        },
        go: s => ({ depart: { date: bestOf(s.window).date, tofDays: bestOf(s.window).tofDays } }),
      },
      {
        id: 'c3',
        kind: 'answer',
        path: 'both',
        unit: 'km²/s²',
        tolerance: 0.05,
        answer: s => s.mission.patched.c3,
      },
      {
        id: 'fast',
        kind: 'choose',
        path: 'both',
        options: ['more', 'about', 'less'],
        correct: 'computed',
        correctOf: s => {
          const f = fastestNear(s.window);
          const b = s.window.best.total;
          return f > b * 1.02 ? 'more' : f < b * 0.98 ? 'less' : 'about';
        },
      },
      {
        id: 'vinf',
        kind: 'answer',
        path: 'advanced',
        unit: 'km/s',
        tolerance: 0.01,
        answer: s => s.mission.patched.vinfArr,
      },
      {
        id: 'declination',
        kind: 'answer',
        path: 'advanced',
        unit: '°',
        tolerance: 0.1,
        answer: s => s.mission.patched.declination / DEG,
      },
      { id: 'limits', kind: 'read', path: 'both' },
    ],
  },
  {
    id: 'ml-cruise',
    target: 'direct-flight',
    minutes: { intro: 25, advanced: 40 },
    steps: [
      { id: 'intro', kind: 'read', path: 'both' },
      { id: 'predict', kind: 'choose', path: 'both', options: ['km1e3', 'km1e4', 'km1e5', 'km1e6'], correct: null },
      {
        id: 'fly',
        kind: 'do',
        path: 'both',
        check: s => flownAsDesigned(s) && !s.plan.correct,
        go: () => ({ direct: { bodies: [...ALL], start: 'periapsis' }, correct: null }),
      },
      {
        id: 'miss',
        kind: 'answer',
        path: 'both',
        unit: 'million km',
        tolerance: 0.05,
        answer: s => s.mission.direct.missKm / 1e6,
      },
      {
        id: 'test',
        kind: 'do',
        path: 'both',
        check: s => s.mission?.ok && s.mission.direct.bodies.length === 0 && s.mission.direct.start === 'center' && !s.plan.correct,
        go: () => ({ direct: { bodies: [], start: 'center' }, correct: null }),
      },
      {
        id: 'diagnose',
        kind: 'choose',
        path: 'both',
        options: ['integration', 'planets', 'earth', 'mars'],
        // The lab's own measurement (reference case D1): from the Earth's
        // center the other planets move the arrival by under 2e5 km, and the
        // Earth's pull on a real departure by over 1e6 km.
        correct: 'earth',
      },
      { id: 'explain', kind: 'explain', path: 'both', minWords: 25 },
      {
        id: 'correct',
        kind: 'do',
        path: 'both',
        check: s => flownAsDesigned(s) && s.plan.correct?.day === 30,
        go: () => ({ direct: { bodies: [...ALL], start: 'periapsis' }, correct: { day: 30 } }),
      },
      {
        id: 'cost',
        kind: 'answer',
        path: 'both',
        unit: 'm/s',
        tolerance: 1,
        answer: s => s.mission.correction.dv * 1000,
      },
      {
        id: 'late',
        kind: 'do',
        path: 'advanced',
        check: s => flownAsDesigned(s) && s.plan.correct?.day === 200,
        go: () => ({ direct: { bodies: [...ALL], start: 'periapsis' }, correct: { day: 200 } }),
      },
      {
        id: 'lateCost',
        kind: 'answer',
        path: 'advanced',
        unit: 'm/s',
        tolerance: 1,
        answer: s => s.mission.correction.dv * 1000,
      },
      {
        id: 'early',
        kind: 'choose',
        path: 'advanced',
        options: ['early', 'late', 'same'],
        // Reference case D2: day 10 < 30 < 100 < 200.
        correct: 'early',
      },
      {
        id: 'propellant',
        kind: 'answer',
        path: 'both',
        unit: 'kg',
        tolerance: 5,
        answer: s => s.mission.budget.interplanetary.propellantKg,
      },
      { id: 'limits', kind: 'read', path: 'both' },
    ],
  },
];

/** What turning the depot orbit's plane by 5 degrees would cost, m/s. */
export function turnCost(s) {
  const r = BODIES.earth.radius + s.plan.depot.altitude;
  return planeChange(Math.sqrt(BODIES.earth.GM / r), 5 * DEG) * 1000;
}

/** The steps of a guide on a path. */
export const stepsOn = (guide, path) => guide.steps.filter(s => s.path === 'both' || s.path === path);

/** A typed number: a decimal comma as well as a point. */
export function parseAnswer(text) {
  const s = String(text ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  return Number(s);
}

/** Words in an explanation, in any script. */
export const wordCount = text => (String(text ?? '').match(/[\p{L}\p{N}]+/gu) || []).length;

/** The right option of a choose step for this state; null for a prediction. */
export function correctOption(step, state) {
  if (step.correct === 'computed') return step.correctOf(state);
  return step.correct ?? null;
}

/**
 * Whether a step is passed, for a reader's input and state.
 * @returns {{passed: boolean, expected?: number|string}}
 */
export function evaluate(step, state, input) {
  if (step.kind === 'read') return { passed: true };
  if (step.kind === 'do') return { passed: !!step.check(state) };
  if (step.kind === 'explain') return { passed: wordCount(input) >= step.minWords };
  if (step.kind === 'choose') {
    const right = correctOption(step, state);
    if (right === null) return { passed: typeof input === 'string' && step.options.includes(input) };
    return { passed: input === right, expected: right };
  }
  if (!state.mission?.ok) return { passed: false };
  const expected = step.answer(state);
  const typed = parseAnswer(input);
  return {
    passed: typed !== null && Math.abs(typed - expected) <= step.tolerance + 1e-9 * Math.abs(expected),
    expected,
  };
}

/** What the guides work on, for the answer key's list (gd.target.*). */
export const TARGETS = {
  'earth-orbit': {},
  'window-2026': {},
  'direct-flight': {},
};

/** Everything js/guideDocs.js lays out. */
export const SUITE = { GUIDES, TARGETS };
