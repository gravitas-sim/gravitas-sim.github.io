// =============================================================================
// One population, several views of it
// -----------------------------------------------------------------------------
// The last three screens of "A Universe of Stars" put a synthetic population
// on the canvas and a plot of it in the panel, and then ask the reader to move
// a brightness cut and watch what a survey would have kept. The claim the
// screens make - "the same four hundred stars, not a new sample" - is a claim
// about identity, and it was not true of the code:
//
//   * the canvas filtered on intrinsic luminosity and the panel on flux at a
//     distance. Two definitions, two numbers, agreeing only because 1e-4 of
//     relative flux at 100 pc is one solar luminosity;
//   * the panel's slider moved the plot and left the canvas standing;
//   * and the canvas subsample was strided over the stars that PASSED the cut,
//     so moving the cut did not add or remove stars from a fixed shelf - it
//     put a different hundred and twenty stars up. A reader lowering the
//     threshold to bring the M dwarfs back got a different sky.
//
// These tests are about that identity. They compare star ids across threshold
// moves rather than counting rows, because a count that happens to match is
// exactly what the old code produced.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { populationSample } from '../js/lessonStage.js';
import {
  brightSubset,
  fluxAt,
  synthesisePopulation,
} from '../js/stellar/population.js';
import A_UNIVERSE_OF_STARS from '../js/data/investigations/a-universe-of-stars.js';

const BASE = {
  seed: 'stellar-population-1',
  count: 400,
  show: 400,
  distancePc: 100,
};
const ids = r => r.shown.map(s => s.id);
const at = thresholdFlux => populationSample({ ...BASE, thresholdFlux });

describe('the population underneath never changes', () => {
  test('every star has an id, and the ids are unique', () => {
    const all = synthesisePopulation({ seed: BASE.seed, count: BASE.count });
    expect(all.stars.length).toBeGreaterThan(300);
    expect(all.stars.every(s => typeof s.id === 'string')).toBe(true);
    expect(new Set(all.stars.map(s => s.id)).size).toBe(all.stars.length);
  });

  test('the same seed draws the same stars, star for star', () => {
    const a = synthesisePopulation({ seed: BASE.seed, count: BASE.count });
    const b = synthesisePopulation({ seed: BASE.seed, count: BASE.count });
    expect(a.stars.map(s => s.id)).toEqual(b.stars.map(s => s.id));
    expect(a.stars.map(s => s.massSun)).toEqual(b.stars.map(s => s.massSun));
  });

  test('lowering the cut restores exactly the same stars', () => {
    // A -> B -> A, by identity. Not "the same number of stars".
    const a = ids(at(null));
    const b = ids(at(1e-4));
    const back = ids(at(null));
    expect(back).toEqual(a);
    expect(b).not.toEqual(a);
    // And around again from a different starting point.
    expect(ids(at(1e-4))).toEqual(b);
  });

  test('raising the cut removes stars and never substitutes one', () => {
    const loose = ids(at(1e-4));
    const tight = ids(at(1e-3));
    expect(tight.length).toBeLessThan(loose.length);
    expect(loose.length).toBeGreaterThan(3);
    for (const id of tight) expect(loose).toContain(id);
    // Order too: the survivors are the same list with gaps, not a re-sort.
    expect(tight).toEqual(loose.filter(id => tight.includes(id)));
  });

  test('the canvas subsample is fixed, so the cut acts on one shelf', () => {
    // The defect this replaces: the stride was taken over the stars that
    // passed, so the shelf itself changed shape as the cut moved.
    const none = at(null);
    expect(none.shown).toHaveLength(none.subsample);
    for (const flux of [1e-6, 1e-5, 1e-4, 1e-3, 1e-2]) {
      expect(at(flux).subsample).toBe(none.subsample);
      // Everything on the canvas under a cut was on the canvas without one.
      for (const id of ids(at(flux))) expect(ids(none)).toContain(id);
    }
  });
});

describe('one selection function, one distance, one definition of flux', () => {
  test('the scene keeps exactly the stars the panel keeps', () => {
    const survey = synthesisePopulation({
      seed: BASE.seed,
      count: BASE.count,
    });
    for (const flux of [1e-5, 1e-4, 1e-3]) {
      const panel = brightSubset(survey, {
        distancePc: BASE.distancePc,
        thresholdFlux: flux,
      });
      const scene = at(flux);
      // The count the scene reports for "passes the cut" is the panel's own.
      expect(scene.visible).toBe(panel.kept);
      // And every star the scene stands is one the panel would have kept.
      const keptIds = new Set(panel.stars.map(s => s.id));
      for (const id of ids(scene)) expect(keptIds.has(id)).toBe(true);
    }
  });

  test('the cut is a flux cut at a stated distance, not a luminosity cut', () => {
    // They coincide when every star is at one distance, which is the model's
    // simplification and is stated in the readout. What must not happen is
    // the two views computing it two ways: moving the distance has to move
    // the selection, and under an intrinsic-luminosity rule it would not.
    const near = populationSample({
      ...BASE,
      distancePc: 10,
      thresholdFlux: 1e-4,
    });
    const far = populationSample({
      ...BASE,
      distancePc: 1000,
      thresholdFlux: 1e-4,
    });
    expect(near.visible).toBeGreaterThan(far.visible);
    expect(fluxAt(1, 10)).toBeGreaterThan(fluxAt(1, 1000));
  });

  test('the four populations are four different numbers', () => {
    const s = at(1e-4);
    // Drawn, then modeled, then passing the cut - three shrinking numbers -
    // and a bounded canvas subsample of the modeled ones, of which the ones
    // that pass are what stands on screen.
    expect(s.requested).toBeGreaterThan(s.total);
    expect(s.total).toBeGreaterThan(s.visible);
    expect(s.subsample).toBeLessThanOrEqual(s.total);
    expect(s.shown.length).toBeLessThanOrEqual(s.subsample);
    // At the lesson's own settings the shelf holds the whole modeled set, so
    // the canvas shows every star the cut keeps rather than whichever of a
    // hundred and twenty happened to be bright. The readout still reports the
    // subsample separately; it is a different quantity that is equal here.
    const cap = populationSample({ ...BASE, show: 120, thresholdFlux: 1e-4 });
    expect(cap.subsample).toBeLessThan(cap.total);
    expect(cap.shown.length).toBeLessThan(s.shown.length);
  });
});

describe('the lesson declares one survey', () => {
  const steps = A_UNIVERSE_OF_STARS.steps.filter(x => x.stage?.population);

  test('every population step uses one seed, one count and one distance', () => {
    expect(steps.length).toBeGreaterThan(1);
    const shape = steps.map(x => {
      const p = x.stage.population;
      return `${p.seed}:${p.count}:${p.show}:${p.perRow}:${p.distancePc}`;
    });
    expect(new Set(shape).size).toBe(1);
  });

  test('the only difference between the two views is the cut', () => {
    const cuts = new Set(
      steps.map(x => x.stage.population.thresholdFlux ?? null)
    );
    expect(cuts.size).toBe(2);
    expect(cuts.has(null)).toBe(true);
    // And no step still carries the old intrinsic-luminosity key, which the
    // sampler no longer reads and which would now be silently ignored.
    for (const x of steps) {
      expect(x.stage.population.threshold).toBeUndefined();
    }
  });

  test('the declared cut is the one the slider opens on', () => {
    // The slider's default is 10^-4. A step whose stage opens on a different
    // cut is a step whose first reading disagrees with its own control.
    const bright = steps
      .map(x => x.stage.population.thresholdFlux)
      .filter(Number.isFinite);
    expect(bright.length).toBeGreaterThan(0);
    for (const f of bright) expect(f).toBeCloseTo(10 ** -4, 12);
  });
});
