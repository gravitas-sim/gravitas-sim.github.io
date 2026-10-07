// Answers from the inference Worker that arrive after the sliders have moved,
// or in the wrong order. A gated fake realm holds every answer until the test
// releases it, so the order is the test's and not the machine's.

import { afterEach, describe, expect, test } from '@jest/globals';
import { setRvSpawn } from '../js/inference/rvClient.js';
import {
  loadRecording,
  trialParameters,
  setTrial,
  snapToBestAtPeriod,
  runSearch,
  lastSearch,
  resetWorkspace,
} from '../js/rvWorkspace.js';

const points = Array.from({ length: 12 }, (_, i) => ({
  day: i * 0.4,
  rv: 10 * Math.sin(i),
  sigma: 1,
  quality: 'ok',
  missed: false,
  truth: 0,
}));

/** Realms that answer only when told to; one per request, in request order. */
const realms = [];
const gate = () => {
  realms.length = 0;
  setRvSpawn(() => {
    const realm = {
      onmessage: null,
      postMessage: () => {},
      terminate() {},
    };
    realms.push(realm);
    return realm;
  });
};
const answer = (i, result) =>
  realms[i].onmessage({
    data: { type: 'result', result: { index: 0, status: 'ok', result } },
  });
const fit = p => ({ period: p, K: p * 2, phase: 0.1, gamma: 1 });
const settle = () => new Promise(r => setTimeout(r, 0));

afterEach(() => {
  resetWorkspace();
  setRvSpawn(null);
});

describe('answers that arrive late', () => {
  test('a slider moved while a snap was out is kept', async () => {
    gate();
    loadRecording({ points, config: {} });
    const snap = snapToBestAtPeriod();
    await settle();
    setTrial('K', 77);
    answer(0, fit(5));
    await snap;
    expect(trialParameters().K).toBe(77);
    expect(trialParameters().period).not.toBe(5);
  });

  test('a slider moved while a search was out is kept; the curve still lands', async () => {
    gate();
    loadRecording({ points, config: {} });
    const s = runSearch({ minPeriod: 1, maxPeriod: 4 });
    await settle();
    setTrial('phase', 1.5);
    answer(0, { best: fit(3), curve: [] });
    await s;
    expect(trialParameters().phase).toBe(1.5);
    expect(lastSearch().best.period).toBe(3);
  });

  test('a snap that finishes after a newer search is ignored', async () => {
    gate();
    loadRecording({ points, config: {} });
    const snap = snapToBestAtPeriod();
    const s = runSearch({ minPeriod: 1, maxPeriod: 4 });
    await settle();
    answer(1, { best: fit(3), curve: [] });
    await s;
    answer(0, fit(5));
    await snap;
    expect(trialParameters().period).toBe(3);
  });

  test('in request order both apply, the later last', async () => {
    gate();
    loadRecording({ points, config: {} });
    const snap = snapToBestAtPeriod();
    const s = runSearch({ minPeriod: 1, maxPeriod: 4 });
    await settle();
    answer(0, fit(5));
    await snap;
    answer(1, { best: fit(3), curve: [] });
    await s;
    expect(trialParameters().period).toBe(3);
  });

  test('an answer about a recording that has gone writes nothing', async () => {
    gate();
    loadRecording({ points, config: {} });
    const s = runSearch({ minPeriod: 1, maxPeriod: 4 });
    await settle();
    loadRecording({ points, config: {} });
    const before = trialParameters();
    answer(0, { best: fit(3), curve: [] });
    expect(await s).toBeUndefined();
    expect(trialParameters()).toEqual(before);
  });
});
