// Prompt 66 step 3: one fitter. The sandbox RV workspace's circular model and
// Monte Carlo run in the inference core's Worker, through the scheduler, and
// give the digits they gave on the workspace's own thread.

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { installRealm, reinstallRealm, uninstallRealm } from './rvRealm.js';
import { runRv, runMonteCarlo, setRvSpawn } from '../js/inference/rvClient.js';
import { usablePoints } from '../js/inference/rvCircular.js';
import { CASES, measure } from './rvCircularFixtures.js';

beforeAll(installRealm);
afterAll(uninstallRealm);

const golden = JSON.parse(
  readFileSync(new URL('./fixtures/rvCircularGolden.json', import.meta.url))
);

describe('identical numbers on the existing fixtures', () => {
  test('every search, fit and Monte Carlo matches the digest written before the move', async () => {
    // A SHA-256 of each result with every digit and the sign of zero: bit for
    // bit. The golden file was written from js/rvFit.js and js/rvUncertainty.js
    // on v2 at c40cda5, run on the main thread; this runs the moved code in
    // the realm, and the results cross a message boundary on the way back.
    const got = await measure({
      usablePoints,
      periodSearch: (usable, bounds) =>
        runRv('rv-search', { points: usable, bounds }),
      fitAtPeriod: (usable, period) =>
        runRv('rv-fit', { points: usable, period }),
      runMonteCarlo,
    });
    expect(got).toEqual(golden);
  });

  test('the golden covers every case, and the Monte Carlo of all but one', () => {
    expect(Object.keys(golden)).toEqual(CASES.map(c => c.name));
    expect(
      CASES.filter(c => !c.noMonteCarlo).every(c => golden[c.name].monteCarlo)
    ).toBe(true);
  });
});

describe('through the scheduler', () => {
  const c = CASES[0];

  test('a canceled Monte Carlo answers with the trials it finished', async () => {
    const seen = [];
    const out = await runMonteCarlo(
      {
        points: c.points,
        params: { gamma: -3, K: 40, period: 3.5, phase: 1.1 },
        ...c.bounds,
        trials: 600,
        seed: 'cancel',
      },
      {
        onProgress: p => seen.push(p.done),
        shouldCancel: () => seen.length >= 3,
      }
    );
    expect(out.outcome).toBe('canceled');
    expect(out.completed).toBeGreaterThan(0);
    expect(out.completed).toBeLessThan(600);
    // Progress is a count of trials, in batches, ending at what ran.
    expect(seen[0]).toBeGreaterThan(0);
  });

  test('a search with bad bounds or too few points is null, not an error', async () => {
    expect(
      await runRv('rv-search', { points: c.points, bounds: {} })
    ).toBeNull();
    expect(
      await runRv('rv-search', {
        points: c.points.slice(0, 2),
        bounds: c.bounds,
      })
    ).toBeNull();
  });

  test('a realm that fails is an error the caller sees', async () => {
    setRvSpawn(() => {
      throw new Error('no Worker here');
    });
    await expect(
      runRv('rv-fit', { points: c.points, period: 3.5 })
    ).rejects.toThrow(/workerFailed|rv-fit/);
    reinstallRealm();
  });
});
