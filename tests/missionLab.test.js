// =============================================================================
// The mission lab: the ephemeris pack, the mission model, the guides
// -----------------------------------------------------------------------------
// tools/validate-mission.mjs runs the lab's reference cases in Node and
// writes their table into MISSION_LAB.md; tools/build-ephemeris.mjs --check
// holds the pack to its manifest. These are the checks around them:
//
//   - the pack: it decodes to what its manifest says, it refuses a time it
//     does not hold, it is continuous, and the held-out states are inside its
//     stated bounds, which the tool's own check also says (run as Node);
//   - the model: a plan's refusals, the capture burn and the rocket equation,
//     the departure hyperbola, and a mission computed from the default plan;
//   - the Worker protocol: a mission, a window on the pack, dates outside it;
//   - the guides: every step's words in both languages, the checks against a
//     state, the committed key against a fresh reference run (as Node), the
//     report's bytes, and the instructor documents;
//   - the lab's reference cases, every measure within its tolerance.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { PACK, DATA } from '../js/data/ephemeris/solarSystem2025.js';
import { CHECK } from '../js/data/ephemeris/solarSystem2025Check.js';
import {
  JD_J2000,
  checkRows,
  createEphemeris,
  dateOfJd,
  jdOfDate,
} from '../js/mission/ephemeris.js';
import {
  DEFAULT_PLAN,
  captureBurn,
  computeMission,
  departurePeriapsis,
  planProblems,
  propellant,
  G0,
} from '../js/mission/solar.js';
import { handle, labWindowProblems } from '../js/mission/labCore.js';
import { LAB_CASES } from '../js/mission/labReferences.js';
import { runCase } from '../js/mission/references.js';
import {
  DEFAULT_WINDOW,
  GUIDES,
  correctOption,
  evaluate,
  parseAnswer,
  stepsOn,
  wordCount,
} from '../js/mission/lab/curriculum.js';
import {
  MISSION_LAB_KEY,
  MISSION_LAB_SUITE,
} from '../js/data/missionLabKey.js';
import { EN_MISSIONLAB } from '../js/i18n/en.missionLab.js';
import { ES_MISSIONLAB } from '../js/i18n/es.missionLab.js';
import { EN_MISSIONLABGUIDES } from '../js/i18n/en.missionLabGuides.js';
import { ES_MISSIONLABGUIDES } from '../js/i18n/es.missionLabGuides.js';
import {
  missionLabAnswerKey,
  missionLabInstructorGuide,
} from '../js/missionLabDocs.js';
import { BODIES } from '../js/mission/bodies.js';
import { norm, sub } from '../js/mission/twobody.js';

const eph = createEphemeris(PACK, DATA);
const manifest = JSON.parse(
  readFileSync('ephemeris-packs/solar-system-2025-2045.json', 'utf8')
);
const clone = x => JSON.parse(JSON.stringify(x));

describe('the ephemeris pack', () => {
  test('is what its manifest says: range, frame, bodies, sizes', () => {
    expect(PACK.format).toBe('gravitas.ephemeris-pack');
    expect(PACK.range).toEqual(manifest.range);
    expect(PACK.timeScale).toBe('TDB');
    expect(PACK.frame).toMatch(/ecliptic of J2000/);
    expect(PACK.bodies.map(b => b.id)).toEqual([
      'venus',
      'earth',
      'mars',
      'jupiter',
    ]);
    for (const b of PACK.bodies) {
      const m = manifest.bodies.find(x => x.id === b.id);
      expect([b.segments, b.bytes, b.degree, b.segmentDays]).toEqual([
        m.segments,
        m.bytes,
        m.degree,
        m.segmentDays,
      ]);
      expect(Buffer.from(DATA[b.id], 'base64').length).toBe(b.bytes);
      expect(b.maxError.positionKm).toBeLessThan(10);
      expect(b.maxError.velocityKmS).toBeLessThan(1e-4);
    }
  });

  test('refuses a time it does not hold, and a body it does not have', () => {
    expect(() => eph.stateAt('mars', PACK.range.startJd - 1)).toThrow(
      /outside/
    );
    expect(() => eph.stateAt('mars', PACK.range.stopJd + 1e-6)).toThrow(
      /outside/
    );
    expect(() => eph.stateAt('saturn', PACK.range.startJd)).toThrow(/no body/);
    expect(() => eph.stateAt('earth', PACK.range.stopJd)).not.toThrow();
    expect(() => createEphemeris({ ...PACK, format: 'x' }, DATA)).toThrow();
    expect(() =>
      createEphemeris(PACK, { ...DATA, mars: DATA.mars.slice(0, -8) })
    ).toThrow();
  });

  test('the held-out states are inside the stated bounds', () => {
    for (const b of PACK.bodies) {
      const rows = checkRows(CHECK, b.id);
      expect(rows.length).toBe(CHECK.rows[b.id]);
      expect(rows.length).toBeGreaterThan(90);
      for (const r of rows) {
        const s = eph.stateAt(b.id, r[0]);
        expect(norm(sub(s.r, r.slice(1, 4)))).toBeLessThanOrEqual(
          b.maxError.positionKm
        );
        expect(norm(sub(s.v, r.slice(4, 7)))).toBeLessThanOrEqual(
          b.maxError.velocityKmS
        );
      }
    }
  });

  test('inside a segment, the velocity is the position\u2019s derivative', () => {
    // Away from the seams, where each side is its own fit and may jump by the
    // stated error (reference case E2 bounds the jumps).
    for (const id of ['earth', 'mars']) {
      for (const jd of [2461000.25, 2463000.75, 2466510.3]) {
        const h = 1e-3;
        const a = eph.stateAt(id, jd - h);
        const b = eph.stateAt(id, jd + h);
        const v = eph.stateAt(id, jd).v;
        const fd = sub(b.r, a.r).map(x => x / (2 * h * 86400));
        expect(norm(sub(fd, v))).toBeLessThan(1e-5);
      }
    }
  });

  test('the Earth is at 1 AU, and dates round-trip', () => {
    for (let jd = PACK.range.startJd; jd < PACK.range.stopJd; jd += 97) {
      const d = norm(eph.stateAt('earth', jd).r) / 149597870.7;
      expect(d).toBeGreaterThan(0.98);
      expect(d).toBeLessThan(1.02);
    }
    expect(dateOfJd(jdOfDate('2026-11-01'))).toBe('2026-11-01');
    expect(jdOfDate('2026-02-30')).toBeNaN();
    expect(jdOfDate('2000-01-01') + 0.5).toBe(JD_J2000);
  });

  test('its tool checks it against its manifest, offline (as Node)', () => {
    const out = execFileSync('node', ['tools/build-ephemeris.mjs', '--check'], {
      encoding: 'utf8',
    });
    expect(out).toMatch(/is current/);
  });
});

describe('the mission model', () => {
  test('a plan names what is wrong with it', () => {
    const codes = patch =>
      planProblems({ ...clone(DEFAULT_PLAN), ...patch }, eph).map(
        p => `${p.path}:${p.code}`
      );
    expect(codes({})).toEqual([]);
    expect(codes({ depart: { date: '2026-13-01', tofDays: 300 } })).toEqual([
      'depart.date:date',
    ]);
    expect(codes({ depart: { date: '2044-12-01', tofDays: 300 } })).toEqual([
      'depart.date:outOfRange',
    ]);
    expect(codes({ depot: { altitude: 300, phaseDeg: 10 } })).toEqual([
      'depot.altitude:sameOrbit',
    ]);
    expect(
      codes({ arrive: { periapsisAltitude: 400, apoapsisAltitude: 300 } })
    ).toEqual(['arrive.apoapsisAltitude:value']);
    expect(codes({ correct: { day: 305 } })).toEqual(['correct.day:value']);
    expect(
      codes({ direct: { bodies: ['pluto'], start: 'periapsis' } })
    ).toEqual(['direct.bodies:value']);
    expect(codes({ direct: { bodies: [], start: 'moon' } })).toEqual([
      'direct.start:value',
    ]);
    expect(
      computeMission(eph, {
        ...clone(DEFAULT_PLAN),
        vehicle: { dryKg: -1, ispS: 300 },
      })
    ).toMatchObject({ ok: false, status: 'input' });
  });

  test('the capture burn and the rocket equation', () => {
    const c = captureBurn(BODIES.mars.GM, 3796.19, 3796.19, 2.57);
    expect(c.dv).toBeCloseTo(
      Math.sqrt(2.57 ** 2 + (2 * BODIES.mars.GM) / 3796.19) -
        Math.sqrt(BODIES.mars.GM / 3796.19),
      12
    );
    expect(captureBurn(1, 2, 1, 1).status).toBe('input');
    const e = captureBurn(BODIES.mars.GM, 3796.19, 36396.19, 2.57);
    expect(e.dv).toBeLessThan(c.dv);
    const p = propellant([{ dv: 1 }], 1000, 300);
    expect(p.propellantKg).toBeCloseTo(
      1000 * (Math.exp(1000 / (300 * G0)) - 1),
      9
    );
    expect(G0).toBe(9.80665);
  });

  test('the departure periapsis leaves along the asymptote it is built for', () => {
    const v = [2.1, -1.4, 0.9];
    const p = departurePeriapsis(BODIES.earth.GM, 6778.137, v);
    expect(norm(p.r)).toBeCloseTo(6778.137, 6);
    // Periapsis velocity is perpendicular to the radius.
    expect(Math.abs(p.r.reduce((q, x, k) => q + x * p.v[k], 0))).toBeLessThan(
      1e-6
    );
    // The orbit's plane contains the asymptote.
    const h = [
      p.r[1] * p.v[2] - p.r[2] * p.v[1],
      p.r[2] * p.v[0] - p.r[0] * p.v[2],
      p.r[0] * p.v[1] - p.r[1] * p.v[0],
    ];
    expect(
      Math.abs(h.reduce((q, x, k) => q + x * v[k], 0)) / (norm(h) * norm(v))
    ).toBeLessThan(1e-12);
  });

  test('the default mission: its design, its direct flight, its budget and timeline', () => {
    const m = computeMission(eph, clone(DEFAULT_PLAN));
    expect(m.ok).toBe(true);
    expect(m.patched.c3).toBeCloseTo(9.26, 1);
    expect(m.patched.departDv).toBeCloseTo(3.595, 2);
    expect(m.direct.missKm).toBeGreaterThan(1e6);
    expect(m.burns.map(b => b.id)).toEqual([
      'meet1',
      'meet2',
      'depart',
      'capture',
    ]);
    expect(m.events.map(e => e.jd)).toEqual(
      [...m.events.map(e => e.jd)].sort((a, b) => a - b)
    );
    expect(m.budget.total).toBeCloseTo(
      m.burns.reduce((s, b) => s + b.dv, 0),
      12
    );
    expect(m.views.direct.length).toBe(121);
  });
});

describe('the lab Worker', () => {
  test('a cancel that arrives before its request is kept, and read at the first chance', async () => {
    // The client sends a cancel the moment it is pressed; the handshake means
    // that can be before the Worker has the request it names.
    await handle({ type: 'cancel', id: 'w-early' }, () => {});
    const out = [];
    await handle(
      {
        type: 'window',
        id: 'w-early',
        options: { ...DEFAULT_WINDOW, departSteps: 200, tofSteps: 200 },
      },
      m => out.push(m)
    );
    const r = out.find(m => m.type === 'result').result;
    expect(r.status).toBe('canceled');
    expect(r.rows).toBeGreaterThan(0);
    expect(r.rows).toBeLessThan(200);

    await handle({ type: 'cancel', id: 'v-early' }, () => {});
    const got = [];
    await handle({ type: 'validate', id: 'v-early' }, m => got.push(m));
    expect(got.find(m => m.type === 'result').result).toEqual({
      status: 'canceled',
      cases: [],
    });
  });

  test('a mission, a window on the pack, and what it refuses', async () => {
    const out = [];
    const post = m => out.push(m);
    await handle(
      {
        type: 'solve',
        id: 1,
        problem: { kind: 'mission', plan: clone(DEFAULT_PLAN) },
      },
      post
    );
    await handle(
      {
        type: 'solve',
        id: 2,
        problem: {
          kind: 'mission',
          plan: {
            ...clone(DEFAULT_PLAN),
            depart: { date: '2044-12-01', tofDays: 300 },
          },
        },
      },
      post
    );
    await handle(
      {
        type: 'window',
        id: 3,
        options: { ...DEFAULT_WINDOW, departSteps: 5, tofSteps: 5 },
      },
      post
    );
    await handle(
      {
        type: 'window',
        id: 4,
        options: { ...DEFAULT_WINDOW, departStart: 16000 },
      },
      post
    );
    await handle({ type: 'solve', id: 5, problem: { kind: 'hohmann' } }, post);
    const by = id => out.filter(m => m.id === id && m.type !== 'progress');
    expect(by(1)[0].result.ok).toBe(true);
    expect(by(2)[0]).toMatchObject({
      type: 'refused',
      problems: [{ path: 'depart.date', code: 'outOfRange' }],
    });
    expect(by(3)[0].result.counts.ok).toBe(25);
    expect(by(4)[0]).toMatchObject({
      type: 'refused',
      problems: [{ code: 'outOfRange' }],
    });
    expect(by(5)[0].type).toBe('error');
    expect(labWindowProblems(DEFAULT_WINDOW)).toEqual([]);
  });
});

describe('the guides', () => {
  const holes = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

  test('English and Spanish have the same ids and placeholders, in both catalogs', () => {
    for (const [en, es] of [
      [EN_MISSIONLAB, ES_MISSIONLAB],
      [EN_MISSIONLABGUIDES, ES_MISSIONLABGUIDES],
    ]) {
      expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
      for (const id of Object.keys(en))
        expect([id, holes(es[id])]).toEqual([id, holes(en[id])]);
    }
  });

  test('every step has its words, and every choice its options', () => {
    for (const g of GUIDES) {
      for (const part of ['title', 'summary'])
        expect(EN_MISSIONLABGUIDES[`gd.${g.id}.${part}`]).toBeTruthy();
      expect(EN_MISSIONLABGUIDES[`gd.target.${g.target}`]).toBeTruthy();
      for (const s of g.steps) {
        for (const part of ['title', 'body', 'ok'])
          expect([
            s.id,
            part,
            typeof EN_MISSIONLABGUIDES[`gd.${g.id}.${s.id}.${part}`],
          ]).toEqual([s.id, part, 'string']);
        for (const o of s.options || [])
          expect(
            EN_MISSIONLABGUIDES[`gd.${g.id}.${s.id}.opt.${o}`]
          ).toBeTruthy();
        if (s.kind === 'answer')
          expect(EN_MISSIONLABGUIDES[`gd.${g.id}.${s.id}.ok`]).toContain(
            '{value}'
          );
      }
    }
    // The page's own ids, literal ones.
    const page =
      readFileSync('js/missionLabPage.js', 'utf8') +
      readFileSync('js/mission/lab/guidePanel.js', 'utf8');
    const html = readFileSync('mission/lab/index.html', 'utf8');
    const ids = [
      ...page.matchAll(/\bt\(\s*'([^']+)'/g),
      ...html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g),
    ].map(m => m[1]);
    for (const id of ids)
      expect([id, id in EN_MISSIONLAB || id in EN_MISSIONLABGUIDES]).toEqual([
        id,
        true,
      ]);
  });

  test('a step is checked against the state it is given', () => {
    const state = {
      plan: clone(DEFAULT_PLAN),
      mission: computeMission(eph, clone(DEFAULT_PLAN)),
      window: null,
    };
    const [orbit] = GUIDES;
    const dv = orbit.steps.find(s => s.id === 'dv');
    const right = state.mission.rendezvous.total * 1000;
    expect(
      evaluate(dv, state, String(right.toFixed(1)).replace('.', ',')).passed
    ).toBe(true);
    expect(evaluate(dv, state, String(right + 5)).passed).toBe(false);
    expect(evaluate(dv, state, 'fifty').passed).toBe(false);
    expect(evaluate(dv, { ...state, mission: null }, '57').passed).toBe(false);
    const compare = orbit.steps.find(s => s.id === 'compare');
    expect(correctOption(compare, state)).toBe('turn');
    expect(evaluate(compare, state, 'climb').passed).toBe(false);
    const predict = orbit.steps.find(s => s.id === 'predict');
    expect(evaluate(predict, state, 'climb').passed).toBe(true);
    expect(evaluate(predict, state, 'nonsense').passed).toBe(false);
    const explain = GUIDES[2].steps.find(s => s.kind === 'explain');
    expect(evaluate(explain, state, 'too short').passed).toBe(false);
    expect(evaluate(explain, state, 'palabra '.repeat(25)).passed).toBe(true);
    expect(wordCount('La Tierra sigue atrayendo, ¿no?')).toBe(5);
    expect(parseAnswer(' 1,5 ')).toBe(1.5);
    expect(parseAnswer('0,91', 'es')).toBe(0.91);
    expect(parseAnswer('1.234,5', 'es')).toBe(1234.5);
    expect(parseAnswer('1.2.3')).toBeNull();
    // A "do" step's own go passes its check.
    const phase = orbit.steps.find(s => s.id === 'phase');
    const plan = { ...state.plan, ...phase.go(state) };
    expect(
      phase.check({ ...state, plan, mission: computeMission(eph, plan) })
    ).toBe(true);
    expect(phase.check(state)).toBe(false);
  });

  test('the committed key is a fresh reference run (as Node)', () => {
    const fresh = JSON.parse(
      execFileSync('node', ['tools/mission-lab-key.mjs', '--json'], {
        encoding: 'utf8',
        maxBuffer: 1 << 24,
      })
    );
    expect(fresh.key).toEqual(MISSION_LAB_KEY);
    // The structure the instructor documents read is the curriculum's.
    expect(fresh.suite).toEqual(MISSION_LAB_SUITE);
    expect(
      MISSION_LAB_SUITE.GUIDES.map(g => g.steps.map(s => `${s.id}:${s.kind}`))
    ).toEqual(GUIDES.map(g => g.steps.map(s => `${s.id}:${s.kind}`)));
    for (const g of GUIDES)
      for (const path of ['intro', 'advanced'])
        expect(
          MISSION_LAB_KEY.filter(r => r.guide === g.id && r.path === path).map(
            r => r.step
          )
        ).toEqual(stepsOn(g, path).map(s => s.id));
  });

  test('the instructor documents lay out every part, and name the explanation', () => {
    const text = bytes => Buffer.from(bytes).toString('latin1');
    const guide = text(missionLabInstructorGuide({ version: 'test' }));
    const key = text(missionLabAnswerKey(MISSION_LAB_KEY, { version: 'test' }));
    expect(guide.startsWith('%PDF')).toBe(true);
    expect(key.startsWith('%PDF')).toBe(true);
    expect(guide).toContain('Explain \\(recorded\\)');
    expect(key).toContain('Written;');
  });
});

describe('the lab’s reference cases', () => {
  test.each(LAB_CASES.map(c => [c.id, c]))(
    '%s is within every tolerance',
    (_id, c) => {
      const measures = runCase(c);
      expect(measures.filter(m => !m.ok)).toEqual([]);
      expect(measures.length).toBeGreaterThan(0);
    },
    60000
  );
});
