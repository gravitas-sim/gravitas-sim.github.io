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
import { DEFAULT_PLAN, computeMission, G0 } from '../js/mission/solar.js';
import {
  KINDS,
  missionEnvelope,
  missionQuantities,
  planDigest,
  residualSeries,
  residualSummary,
  overlaySeries,
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
