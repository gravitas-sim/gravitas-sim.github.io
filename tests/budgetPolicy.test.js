import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  LABEL,
  effectiveDeferredKb,
  ledgerTotals,
  raisedCeilings,
  readLedger,
  readPolicy,
  rebaseline,
  validate,
} from '../tools/budget-policy.mjs';
import {
  judgeData,
  propose,
  readDataBudget,
  measure,
} from '../tools/data-budget.mjs';

// =============================================================================
// The budget policy (Prompt 133): tooling that does nothing until Carl switches
// it on. These pin that it is off, that it is internally consistent, that the
// proposals raise nothing, and that the one command that can grant allowance
// refuses everything it should.
// =============================================================================

const clone = x => JSON.parse(JSON.stringify(x));
const policy = () => clone(readPolicy());
const ledger = () => clone(readLedger());
const request = (over = {}) => ({
  kb: 5,
  release: '2.1.0',
  tranche: 'T1A',
  allocation: 'a lazy family',
  reason: 'the first family',
  label: LABEL,
  ...over,
});
const clean = { dirty: false, ci: false };

describe('the committed policy is off and raises nothing', () => {
  test('the mode is "exact" until Carl adopts it', () => {
    expect(readPolicy().mode).toBe('exact');
  });

  test('the files are consistent and the ledger is empty', () => {
    expect(validate({ policy: readPolicy(), ledger: readLedger() })).toEqual(
      []
    );
    expect(readLedger().entries).toEqual([]);
    expect(readPolicy().allowance.grantedKb).toBe(0);
  });

  test("the proposed deferred ceiling is today's: core plus cap, nothing granted", () => {
    const p = readPolicy();
    const source = readFileSync('tools/bundle-budget.mjs', 'utf8');
    const today = Number(
      /id: 'deferred',[\s\S]*?limit: ([0-9.]+)/.exec(source)[1]
    );
    expect(
      Math.round(
        (p.workflowCeilings.deferredCoreKb + p.allowance.capCumulativeKb) * 10
      ) / 10
    ).toBe(today);
    expect(effectiveDeferredKb(p)).toBeLessThanOrEqual(today);
  });

  test("every proposed workflow ceiling equals today's route ceiling", () => {
    const routes = JSON.parse(readFileSync('tools/route-budgets.json', 'utf8'))
      .routes.sources;
    for (const [name, v] of Object.entries(
      readPolicy().workflowCeilings.routes
    )) {
      if (typeof v === 'string') continue;
      expect(routes[name].kb).toBe(v.kb);
      expect(routes[name].requests).toBe(v.requests);
    }
  });

  test("the initial ceiling is the bundle budget's", () => {
    const source = readFileSync('tools/bundle-budget.mjs', 'utf8');
    expect(
      Number(/id: 'initial',[\s\S]*?limit: ([0-9.]+)/.exec(source)[1])
    ).toBe(readPolicy().workflowCeilings.initialKb);
  });
});

describe('the two modes', () => {
  test('"declared" requires the bundle budget to equal the policy ceiling', () => {
    const p = policy();
    p.mode = 'declared';
    expect(
      validate({ policy: p, ledger: ledger(), realDeferredKb: 1985.8 })
    ).toEqual([]);
    expect(
      validate({ policy: p, ledger: ledger(), realDeferredKb: 2044.4 })
    ).toEqual([expect.stringContaining('must equal the policy')]);
  });

  test('"exact" does not compare them: the standing approval still moves the real ceiling', () => {
    expect(
      validate({ policy: policy(), ledger: ledger(), realDeferredKb: 2044.4 })
    ).toEqual([]);
  });

  test('an unknown mode is refused', () => {
    const p = policy();
    p.mode = 'loose';
    expect(validate({ policy: p, ledger: ledger() })[0]).toMatch(
      /mode must be/
    );
  });

  test('a raised ceiling is found, a lowered or equal one is not', () => {
    const before = { a: 100, b: { kb: 10, requests: 5 }, c: 7 };
    const after = { a: 100.1, b: { kb: 10, requests: 6 }, c: 6 };
    expect(raisedCeilings(before, after)).toEqual([
      'a kb: 100 to 100.1',
      'b requests: 5 to 6',
    ]);
    expect(raisedCeilings(before, before)).toEqual([]);
  });
});

describe('the ledger', () => {
  test('a grant writes an entry whose running total adds up', () => {
    const one = rebaseline(
      { policy: policy(), ledger: ledger() },
      request(),
      clean
    );
    const two = rebaseline(
      one,
      request({ kb: 7, release: '2.2.0', allocation: 'a pack' }),
      clean
    );
    expect(two.ledger.entries.map(e => e.runningKb)).toEqual([5, 12]);
    expect(two.policy.allowance.grantedKb).toBe(12);
    expect(effectiveDeferredKb(two.policy)).toBe(1997.8);
    expect(validate({ policy: two.policy, ledger: two.ledger })).toEqual([]);
  });

  test('a hand-edited running total is caught', () => {
    const one = rebaseline(
      { policy: policy(), ledger: ledger() },
      request(),
      clean
    );
    one.ledger.entries[0].runningKb = 4;
    expect(ledgerTotals(one.ledger).problems[0]).toMatch(/running total/);
  });

  test('drawing more than was granted is caught', () => {
    const one = rebaseline(
      { policy: policy(), ledger: ledger() },
      request(),
      clean
    );
    one.policy.allowance.grantedKb = 1;
    expect(validate(one).join()).toMatch(/drawn against/);
  });
});

describe('the re-baseline command refuses', () => {
  const state = () => ({ policy: policy(), ledger: ledger() });

  test('a dirty working tree', () => {
    expect(() =>
      rebaseline(state(), request(), { dirty: true, ci: false })
    ).toThrow(/not clean/);
  });

  test('CI, so it is never automatic', () => {
    expect(() =>
      rebaseline(state(), request(), { dirty: false, ci: true })
    ).toThrow(/never run automatically/);
  });

  test('a missing or wrong label', () => {
    expect(() => rebaseline(state(), request({ label: '' }), clean)).toThrow(
      /labelled/
    );
    expect(() => rebaseline(state(), request({ label: 'ok' }), clean)).toThrow(
      /labelled/
    );
  });

  test('a workflow ceiling', () => {
    expect(() =>
      rebaseline(state(), request(), { ...clean, workflow: 'the front door' })
    ).toThrow(/workflow ceiling/);
  });

  test('a grant over the per-release cap, and one over the cumulative cap', () => {
    expect(() => rebaseline(state(), request({ kb: 20.1 }), clean)).toThrow(
      /per-release/
    );
    let s = state();
    for (const [release, kb] of [
      ['a', 20],
      ['b', 20],
      ['c', 20],
      ['e', 20],
      ['f', 20],
      ['g', 20],
      ['h', 20],
      ['i', 20],
      ['j', 7.5],
    ])
      s = rebaseline(s, request({ kb, release }), clean);
    expect(() =>
      rebaseline(s, request({ kb: 0.2, release: 'd' }), clean)
    ).toThrow(/cumulative cap/);
  });

  test('a missing field or a non-positive amount', () => {
    expect(() => rebaseline(state(), request({ reason: '' }), clean)).toThrow(
      /--reason/
    );
    expect(() => rebaseline(state(), request({ kb: 0 }), clean)).toThrow(
      /positive/
    );
    expect(() => rebaseline(state(), request({ kb: -3 }), clean)).toThrow(
      /positive/
    );
  });

  test('anything that leaves the ceiling below the measurement', () => {
    // Granting is never what lowers a ceiling, but a core set under the
    // measurement is caught by validate, and a grant cannot fix that silently.
    const p = policy();
    p.workflowCeilings.deferredCoreKb = 1900;
    expect(
      validate({ policy: p, ledger: ledger(), measuredDeferredKb: 1985.8 })[0]
    ).toMatch(/below the measurement/);
    expect(() =>
      rebaseline({ policy: p, ledger: ledger() }, request({ kb: 1 }), {
        ...clean,
        measuredDeferredKb: 1985.8,
      })
    ).toThrow(/below the measurement/);
  });

  test('nothing but the allowance and the ledger changes', () => {
    const before = state();
    const after = rebaseline(before, request(), clean);
    expect({ ...after.policy, allowance: null }).toEqual({
      ...before.policy,
      allowance: null,
    });
    expect(after.policy.workflowCeilings).toEqual(
      before.policy.workflowCeilings
    );
  });
});

describe('the data plane budget', () => {
  test('every ceiling has a key, a unit and a way of being measured', () => {
    const { ceilings } = readDataBudget();
    expect(new Set(ceilings.map(c => c.key)).size).toBe(ceilings.length);
    for (const c of ceilings) {
      expect(c.ceiling).toBeGreaterThan(0);
      expect(c.unit).toBeTruthy();
      expect(c.measuredBy).toBeTruthy();
    }
  });

  test('what the tree can measure is under its proposed ceiling', () => {
    const rows = judgeData(readDataBudget(), measure());
    expect(rows.filter(r => r.status === 'over')).toEqual([]);
    expect(rows.filter(r => r.status === 'ok').length).toBeGreaterThanOrEqual(
      6
    );
  });

  test('a browser-probe ceiling with no measurement is "not measured", never a pass', () => {
    // No shipped route decodes images yet; the decoded-memory probe's resident
    // figure is the bound read back (two planes, the ceiling by construction),
    // so tools/data-budget.mjs does not report it as a measurement.
    const measured = measure();
    expect('decodedImageBytesPerPage' in measured).toBe(false);
    const rows = judgeData(readDataBudget(), measured);
    const probe = rows.find(r => r.key === 'decodedImageBytesPerPage');
    expect(probe.status).toBe('not measured');
    expect(
      judgeData(
        { ceilings: [{ key: 'x', ceiling: 1, unit: 'b' }] },
        { x: 2 }
      )[0].status
    ).toBe('over');
  });

  test('the proposal rounds a +10% allowance up to a whole KiB', () => {
    expect(
      propose({
        packGzipBytes: 1000,
        precacheFirstVisitGzipBytes: 2000,
        precacheIdleGzipBytes: 3000,
      })
    ).toEqual({
      packGzipBytes: 2048,
      precacheFirstVisitGzipBytes: 3072,
      precacheIdleGzipBytes: 4096,
    });
  });
});
