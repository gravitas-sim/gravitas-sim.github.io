// =============================================================================
// The mission lab's results as evidence (Roadmap II Prompt 106)
// -----------------------------------------------------------------------------
//   - each kind of result is a valid gravitas.artifact/1 whose numbers say what
//     they are (the plan's choices assumed, the model's results derived);
//   - the propellant and the delta-v are checked against the rocket equation,
//     computed here and not read from the lab;
//   - the comparison's last residual is the direct flight's miss;
//   - a plan in a link round-trips and a foreign one is refused;
//   - the address, a saved mission and the figure bridge;
//   - the notebook and My work hold a mission, and cannot attach it.
// =============================================================================

import { describe, test, expect, jest } from '@jest/globals';
import { PACK, DATA } from '../js/data/ephemeris/solarSystem2025.js';
import { createEphemeris } from '../js/mission/ephemeris.js';
import {
  AIM_KM,
  DAY_S,
  DEFAULT_PLAN,
  G0,
  MAX_AIMS,
  computeMission,
  departurePeriapsis,
  flyDirect,
} from '../js/mission/solar.js';
import { BODIES } from '../js/mission/bodies.js';
import { lambert } from '../js/mission/lambert.js';
import { add, norm, propagate, sub } from '../js/mission/twobody.js';
import { jdOfDate } from '../js/mission/ephemeris.js';
import {
  KINDS,
  missionEnvelope,
  missionQuantities,
  planDigest,
  residualSeries,
  residualSummary,
  overlaySeries,
  trackAt,
} from '../js/mission/evidence.js';
import { validateArtifact } from '../js/platform/artifact.js';
import {
  PLAN_LINK,
  MAX_LINK,
  planFragment,
  readPlan,
  readPlanFragment,
} from '../js/mission/link.js';
import {
  addressOf,
  bridgeServices,
  planOf,
  problemText,
  savedPlan,
} from '../js/mission/lab/address.js';
import { artifactEntry } from '../js/notebook/artifactEntry.js';
import { SOURCE } from '../js/notebook/entry.js';
import { ARTIFACT_SOURCES } from '../js/notebook/ledger.js';
import {
  MADE_FORMAT,
  MADE_VERSION,
  buildOf,
  newId,
  fileOf,
  hrefOf,
  listMade,
  readMade,
  saveMade,
} from '../js/myWork/made.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';
import { EN_MISSIONEVIDENCE } from '../js/i18n/en.missionEvidence.js';
import { ES_MISSIONEVIDENCE } from '../js/i18n/es.missionEvidence.js';

const clone = o => JSON.parse(JSON.stringify(o));
const eph = createEphemeris(PACK, DATA);
const PLAN = { ...clone(DEFAULT_PLAN), correct: { day: 30 } };
const pack = { id: PACK.id, version: PACK.version };
const solve = plan => ({ ...computeMission(eph, plan), pack });
const result = solve(PLAN);
const q = (env, id) => env.quantities.find(x => x.id === id);

describe('a result is an envelope', () => {
  test('the plan solved', () => {
    expect(result.ok).toBe(true);
  });

  test.each(KINDS)(
    '%s validates, and every number is assumed or derived',
    k => {
      const env = missionEnvelope(k, result);
      expect(validateArtifact(env)).toEqual([]);
      expect(env.source.kind).toBe('simulation');
      expect(env.source.id).toBe('mission-lab');
      expect(env.source.digest).toBe(planDigest(result.plan, result));
      for (const x of env.quantities) {
        expect(['assumed', 'derived']).toContain(x.origin);
        expect(x.uncertainty).toEqual({ kind: 'none' });
      }
      expect(env.warnings).toEqual(['missionModel', 'notOperational']);
      expect(env.made.mission.pack).toBe(`${pack.id}@${pack.version}`);
      expect(env.made.mission.timeScale).toBe('TDB');
      expect(q(env, 'depart.jd').origin).toBe('assumed');
    }
  );

  test('one plan shares one digest, a changed plan does not', () => {
    const other = solve({
      ...clone(PLAN),
      depart: { ...PLAN.depart, tofDays: 300 },
    });
    expect(other.ok).toBe(true);
    expect(planDigest(other.plan, other)).not.toBe(
      planDigest(result.plan, result)
    );
    expect(planDigest(result.plan, result)).toBe(
      planDigest(clone(result.plan), result)
    );
  });

  test('a result that is not ok, or a kind that is not one, gives null', () => {
    expect(missionEnvelope('budget', { ok: false })).toBeNull();
    expect(missionEnvelope('budget', null)).toBeNull();
    expect(missionEnvelope('orbit', result)).toBeNull();
    expect(missionQuantities('orbit', result)).toBeNull();
  });

  test('the dates say their time scale, in both languages', () => {
    for (const k of ['q.depart.jd', 'q.event', 'q.burn.jd']) {
      expect(EN_MISSIONEVIDENCE[`mle.${k}`]).toContain('TDB');
      expect(ES_MISSIONEVIDENCE[`mle.${k}`]).toContain('TDB');
    }
  });

  test('the envelope id changes with the numbers', () => {
    const a = missionEnvelope('budget', result);
    const b = missionEnvelope(
      'budget',
      solve({ ...clone(PLAN), vehicle: { dryKg: 6000, ispS: 320 } })
    );
    expect(a.id).not.toBe(b.id);
  });
});

describe('the budget agrees with the rocket equation, worked here', () => {
  const env = missionEnvelope('budget', result);
  test('the total is the sum of the burns', () => {
    const burns = env.quantities.filter(x => /^burn\..*\.dv$/.test(x.id));
    const sum = burns.reduce((s, x) => s + x.value, 0);
    expect(q(env, 'dv.total').value).toBeCloseTo(sum, 6);
  });

  test('each burn’s propellant is the mass before times 1 - exp(-dv / ve)', () => {
    const burns = env.quantities.filter(x => /^burn\..*\.dv$/.test(x.id));
    expect(burns.length).toBeGreaterThan(2);
    const isp = q(env, 'vehicle.isp').value;
    for (const dv of burns) {
      const id = dv.id.slice(5, -3);
      const m0 = q(env, `burn.${id}.massBefore`).value;
      const p = q(env, `burn.${id}.propellant`).value;
      const expected = m0 * (1 - Math.exp(-dv.value / (isp * G0)));
      expect(Math.abs(p - expected) / expected).toBeLessThan(1e-3);
    }
    // And an absolute value, not only a ratio: a 150 s Isp costs more than 300 s.
    expect(q(env, 'exhaust.interplanetary').value).toBeCloseTo(
      (isp * G0) / 1000,
      6
    );
  });
});

describe('the comparison', () => {
  test('its last residual is the direct flight’s miss of Mars', () => {
    const s = residualSummary(residualSeries(result));
    expect(Math.abs(s.last - result.direct.missKm)).toBeLessThan(1);
    expect(s.max).toBeGreaterThanOrEqual(s.last);
    expect(s.first).toBeGreaterThanOrEqual(0);
    const env = missionEnvelope('comparison', result);
    expect(q(env, 'residual.last').value).toBeCloseTo(s.last, 6);
    expect(q(env, 'correction.dv')).toBeDefined();
  });

  test('the overlay has a distance for each spacecraft and a residual per day', () => {
    const o = overlaySeries(result);
    expect(o.length).toBe(residualSeries(result).length);
    for (const r of o) {
      expect(r.patched).toBeGreaterThanOrEqual(0);
      expect(r.direct).toBeGreaterThanOrEqual(0);
    }
    expect(residualSummary([])).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// The residual, against a reference that shares none of the lab's sampling.
//
// How the reference is made: the test flies the same spacecraft again, with
// the lab's own relations (departure hyperbola periapsis, a Lambert leg to
// Mars, the corrective aim loop) but with the track sampled 4000 times on
// each leg (0.0075 d on the first leg at day 30, 0.07 d on the second) instead
// of the lab's 120 over the whole flight, and reads that dense track by
// straight lines at each of the patched arc's 61 days (error a*h^2/8 with
// a < 6e-6 km/s^2: under 30 km at 0.07 d, which the tolerances below allow). The patched arc is
// propagated again here from the Lambert departure velocity. Nothing is read
// from the lab's own 'direct' or 'arc' views, and nothing is paired by index.
// -----------------------------------------------------------------------------
// The reference's largest residual and its day at 4000 samples a leg (km, day),
// pinned: 2059496 on arrival without a correction, 329190 on day 144.2 with
// one on day 30, and 209174 on day 46.35 with one on day 45.
const PINNED_MAX = {
  0: { km: 2059495.8, day: 309 },
  30: { km: 329190.2, day: 144.2 },
  45: { km: 209174.4, day: 46.35 },
};
const DENSE = 4000;
function referenceResiduals(plan) {
  const E = BODIES.earth;
  const muS = BODIES.sun.GM;
  const jd0 = jdOfDate(plan.depart.date);
  const tof = plan.depart.tofDays;
  const A = eph.stateAt('earth', jd0);
  const B = eph.stateAt('mars', jd0 + tof);
  const tr = lambert({ mu: muS, r1: A.r, r2: B.r, tof: tof * DAY_S });
  const peri = departurePeriapsis(
    E.GM,
    E.radius + plan.depot.altitude,
    sub(tr.v1, A.v)
  );
  const ship = { r: add(A.r, peri.r), v: add(A.v, peri.v) };
  const opts = { bodies: plan.direct.bodies };
  let track;
  if (!plan.correct) {
    track = flyDirect(eph, ship, jd0, tof, {
      ...opts,
      samples: DENSE * 4,
    }).track;
  } else {
    const d = plan.correct.day;
    const first = flyDirect(eph, ship, jd0, d, { ...opts, samples: DENSE });
    const aimOpts = { bodies: plan.direct.bodies.filter(b => b !== 'mars') };
    let aim = [...B.r];
    let second;
    for (let k = 0; k < MAX_AIMS; k++) {
      const re = lambert({
        mu: muS,
        r1: first.end.r,
        r2: aim,
        tof: (tof - d) * DAY_S,
      });
      second = flyDirect(eph, { r: first.end.r, v: re.v1 }, jd0 + d, tof - d, {
        ...aimOpts,
        samples: DENSE,
      });
      const miss = sub(second.end.r, B.r);
      if (norm(miss) <= AIM_KM) break;
      aim = sub(aim, miss);
    }
    track = [
      ...first.track,
      ...second.track.slice(1).map(t => ({ ...t, day: t.day + d })),
    ];
  }
  const at = day => {
    let i = track.findIndex(t => t.day >= day);
    if (i <= 0) i = 1;
    const a = track[i - 1];
    const b = track[i];
    const w = (day - a.day) / (b.day - a.day);
    return a.r.map((c, k) => c + w * (b.r[k] - c));
  };
  const out = [];
  for (let k = 0; k <= 60; k++) {
    const day = (tof * k) / 60;
    const p = propagate(muS, A.r, tr.v1, day * DAY_S);
    const r = at(day);
    out.push({
      day,
      km: Math.hypot(r[0] - p.r[0], r[1] - p.r[1], r[2] - p.r[2]),
    });
  }
  return out;
}

describe('the residual is read by day, against an independent flight', () => {
  // Reported by the review of the first version, which paired the arc's k-th
  // point with the flight's 2k-th: at a correction on day 30 it reported
  // 2.38e6 km for the largest residual, and at day 45 3.39e6 km. The values
  // pinned here are the reference's: 3.29e5 km (day 30) and 1.91e5 km (day 45).
  const CASES = [
    ['no correction', null],
    ['a correction on day 30', { day: 30 }],
    ['a correction on day 45', { day: 45 }],
  ];
  test.each(CASES)(
    '%s: the largest residual, its day and the overlay column',
    (_, correct) => {
      const plan = { ...clone(DEFAULT_PLAN), correct };
      const solved = solve(plan);
      expect(solved.ok).toBe(true);
      const ref = referenceResiduals(plan);
      const refMax = ref.reduce((a, b) => (b.km > a.km ? b : a));
      const got = residualSeries(solved);
      const summary = residualSummary(got);
      // Absolute, in kilometers: the dense reference and the lab agree to a
      // small fraction of the residual and to a few km at the smallest.
      expect(got).toHaveLength(61);
      for (let k = 0; k < 61; k++) {
        expect(got[k].day).toBeCloseTo(ref[k].day, 9);
        // Within the first ten days the flight is still curving round the
        // Earth, which a reading from samples 2.6 days apart cannot follow
        // closer than about 650 km (measured: 653 km on day 5.15 with a
        // correction on day 45); after that it is a few tens of km.
        const slack = ref[k].day < 10 ? 700 : 0;
        expect(Math.abs(got[k].km - ref[k].km)).toBeLessThan(
          40 + slack + 2e-4 * ref[k].km
        );
      }
      expect(Math.abs(summary.max - refMax.km)).toBeLessThan(
        40 + 2e-4 * refMax.km
      );
      expect(summary.maxDay).toBeCloseTo(refMax.day, 9);
      const overlay = overlaySeries(solved);
      expect(overlay.map(o => o.day)).toEqual(ref.map(r => r.day));
      overlay.forEach((o, k) => {
        expect(o.residual).toBe(got[k].km);
        // Equal to the series just checked against the reference.
      });
      // The envelope holds the same numbers.
      const env = missionEnvelope('comparison', solved);
      expect(q(env, 'residual.max').value).toBe(summary.max);
      expect(q(env, 'residual.max.day').value).toBe(summary.maxDay);
      const pin = PINNED_MAX[String(correct?.day ?? 0)];
      expect(Math.abs(summary.max - pin.km)).toBeLessThan(1e-3 * pin.km);
      expect(summary.maxDay).toBeCloseTo(pin.day, 6);
    }
  );

  test('trackAt reads each leg of a corrected flight from its own side of the kink', () => {
    const track = [0, 10, 20, 30, 40, 50, 60].map(day => ({
      day,
      // Slope 1 before day 30 and slope 5 after it: a kink.
      r: [day <= 30 ? day : 30 + 5 * (day - 30), 0, 0],
    }));
    expect(trackAt(track, 25, 30)[0]).toBeCloseTo(25, 9);
    expect(trackAt(track, 45, 30)[0]).toBeCloseTo(105, 9);
    expect(trackAt(track, 61, 30)).toBeNull();
    expect(trackAt(track, -1, 30)).toBeNull();
  });
});

describe('a plan in a link', () => {
  test('round trips', () => {
    const f = planFragment(PLAN);
    expect(f.startsWith(`${PLAN_LINK}.`)).toBe(true);
    expect(f.length).toBeLessThanOrEqual(MAX_LINK);
    const back = readPlanFragment(`#${f}`);
    expect(back).toEqual({ ok: true, plan: readPlan(PLAN) });
    expect(back.plan).toEqual(PLAN);
  });

  test('refusals say why, and extra fields are dropped', () => {
    expect(readPlanFragment('#other.abc').code).toBe('notLink');
    expect(readPlanFragment(`#${PLAN_LINK}.${'a'.repeat(MAX_LINK)}`).code).toBe(
      'tooLong'
    );
    expect(readPlanFragment(`#${PLAN_LINK}.%%%`).code).toBe('unreadable');
    expect(
      readPlanFragment(`#${PLAN_LINK}.${globalThis.btoa('{"a":1}')}`).code
    ).toBe('notPlan');
    expect(planFragment({})).toBeNull();
    const extra = { ...clone(PLAN), evil: '<script>' };
    expect(readPlan(extra)).not.toHaveProperty('evil');
    const bad = clone(PLAN);
    bad.direct.bodies = ['pluto'];
    expect(readPlan(bad)).toBeNull();
    bad.direct.bodies = ['jupiter'];
    bad.depart.date = 'tomorrow';
    expect(readPlan(bad)).toBeNull();
  });
});

const store = () => {
  const data = new Map();
  return {
    get length() {
      return data.size;
    },
    key: i => [...data.keys()][i],
    getItem: k => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, String(v)),
  };
};
const missionRecord = (name = 'Mission to Mars') => ({
  format: MADE_FORMAT,
  formatVersion: MADE_VERSION,
  id: newId(),
  kind: 'mission',
  from: 'mission-lab',
  name,
  savedAt: new Date().toISOString(),
  app: buildOf(),
  attachedTo: [],
  mission: {
    file: {
      format: 'gravitas.mission-plan',
      formatVersion: 1,
      kind: 'missionLab',
      inputs: PLAN,
    },
  },
});

describe('My work', () => {
  test('lists a saved mission, opens it in the lab, and gives back the file', () => {
    const s = store();
    const saved = saveMade(missionRecord(), s);
    expect(saved.ok).toBe(true);
    const [m] = listMade(s);
    expect(m.kind).toBe('mission');
    expect(hrefOf(m)).toBe(`/mission/lab/?open=${m.id}`);
    expect(fileOf(m).name).toBe('mission-to-mars.mission-plan.json');
    expect(savedPlan(m.id, s)).toEqual({ ok: true, plan: PLAN });
    expect(savedPlan('nothere', s).code).toBe('noSaved');
  });

  test('a damaged record is refused and a mission cannot be attached', () => {
    const bad = missionRecord();
    bad.mission.file.kind = 'other';
    expect(readMade(bad).ok).toBe(false);
    const r = missionRecord();
    r.attachedTo = ['e1'];
    expect(readMade(r).record.attachedTo).toEqual([]);
  });
});

describe('the address', () => {
  test('reads embed, open and a plan link', () => {
    expect(addressOf('', '')).toEqual({ embed: null, open: null, link: null });
    expect(addressOf('?embed=1', '').embed).not.toBeNull();
    expect(addressOf('?open=abc-123', '').open).toBe('abc-123');
    expect(addressOf('?open=../x', '').open).toBeNull();
    expect(addressOf('', '#plan1.xyz').link).toBe('#plan1.xyz');
    expect(planOf({ open: null, link: null })).toBeNull();
    const f = `#${planFragment(PLAN)}`;
    expect(planOf({ open: null, link: f }).plan).toEqual(PLAN);
  });

  test('every problem has words in both languages', () => {
    for (const c of ['noSaved', 'notPlan', 'tooLong', 'unreadable']) {
      expect(problemText(c, 'en')).not.toBe(problemText(c, 'es'));
    }
  });
});

describe('the figure bridge', () => {
  test('play steps the slider to the end and stops; restart rewinds', async () => {
    jest.useFakeTimers();
    const slider = {
      value: '0',
      max: '300',
      disabled: false,
      dispatchEvent: jest.fn(),
    };
    const win = {
      Event: class {},
      setInterval: (...a) => globalThis.setInterval(...a),
      clearInterval: id => globalThis.clearInterval(id),
    };
    const restart = jest.fn(async () => {});
    const b = bridgeServices({ slider, restart }, win);
    expect(b.playing()).toBe(false);
    b.play(true);
    expect(b.playing()).toBe(true);
    jest.advanceTimersByTime(150 * 80);
    expect(slider.value).toBe('300');
    expect(b.playing()).toBe(false);
    await b.restart();
    expect(restart).toHaveBeenCalled();
    expect(slider.value).toBe('0');
    jest.useRealTimers();
  });
});

describe('the notebook and the words', () => {
  test('mission-lab is a source whose entries are envelopes', () => {
    expect(ARTIFACT_SOURCES).toContain(SOURCE.MISSION_LAB);
    const env = missionEnvelope('timeline', result);
    const entry = artifactEntry({
      source: SOURCE.MISSION_LAB,
      envelope: env,
      title: 'Mission timeline',
      capturedAt: 1_800_000_000_000,
      context: { page: 'mission' },
    });
    expect(entry.snapshot.artifact.source.digest).toBe(env.source.digest);
  });

  test('both languages name the source, the flags and every panel string', () => {
    for (const k of [
      'nb.source.mission-lab',
      'nb.flag.missionModel',
      'nb.flag.notOperational',
    ]) {
      expect(EN_DEFERRED[k]).toBeTruthy();
      expect(ES_DEFERRED[k]).toBeTruthy();
    }
    expect(Object.keys(ES_MISSIONEVIDENCE).sort()).toEqual(
      Object.keys(EN_MISSIONEVIDENCE).sort()
    );
  });
});
