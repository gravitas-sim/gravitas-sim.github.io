// =============================================================================
// The picture of a star's life, checked without drawing it
// -----------------------------------------------------------------------------
// js/lesson/evolutionScene.js turns a model moment into shapes, and both views
// of "Lives of Stars" paint from it - the panel and the main canvas. It is pure,
// so everything worth asserting about it can be asserted here: that the same
// moment always produces the same picture, that the picture is bounded, and
// that the stages which have no photosphere say so rather than being drawn as
// stars.
//
// The last of those is the defect this module was written for. The lesson's
// prose said "this is not a star yet" while the canvas showed an ordinary
// main-sequence disc, because the collapse existed only inside the widget.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  SCENE,
  extentOf,
  lostFractionOf,
  sceneFor,
} from '../js/lesson/evolutionScene.js';

const cloud = (within = 0.5, opts = {}) =>
  sceneFor({ stage: 'cloud', within }, { seed: 'm100', ...opts });
const track = (lost = 0, opts = {}) =>
  sceneFor(
    { stage: 'track', within: 0.5 },
    { seed: 'm100', lostFraction: lost, ...opts }
  );
const remnant = (kind, supernova, within = 0.5, opts = {}) =>
  sceneFor(
    { stage: 'remnant', within, endpoint: { kind, supernova } },
    { seed: 'm2000', ...opts }
  );

describe('the same moment always draws the same picture', () => {
  test('two calls with the same arguments are identical', () => {
    // What makes seek, replay and reset reproduce a frame. If this were not
    // true, dragging the playhead back would show a different cloud.
    for (const scene of [
      () => cloud(0.3),
      () => track(0.4),
      () => remnant('neutron-star', 'expected', 0.4),
    ]) {
      expect(JSON.stringify(scene())).toBe(JSON.stringify(scene()));
    }
  });

  test('a different seed draws a different cloud', () => {
    const a = sceneFor({ stage: 'cloud', within: 0.3 }, { seed: 'm100' });
    const b = sceneFor({ stage: 'cloud', within: 0.3 }, { seed: 'm2000' });
    expect(a.blobs).not.toEqual(b.blobs);
    // But the same number of them: the count is a constant, not a function of
    // anything a reader can turn up.
    expect(a.blobs.length).toBe(b.blobs.length);
  });

  test('nothing grows without bound', () => {
    // The instruction this was written against says restrained deterministic
    // particles, never thousands of bodies. The way to keep that true is for
    // the counts not to depend on anything.
    const counts = new Set();
    for (let i = 0; i <= 20; i++) {
      const s = cloud(i / 20);
      counts.add(s.blobs.length);
      expect(extentOf(s)).toBeLessThan(3);
    }
    expect(counts.size).toBe(1);
    for (let i = 0; i <= 20; i++) {
      const s = remnant('black-hole', 'expected', i / 20);
      expect(s.fronts.length).toBeLessThanOrEqual(3);
      expect(extentOf(s)).toBeLessThan(3);
    }
    for (let i = 0; i <= 20; i++) {
      expect(track(i / 20).shells.length).toBeLessThanOrEqual(3);
    }
  });
});

describe('a stage with no photosphere is not drawn as a star', () => {
  test('the cloud hides the star and offers no place on the diagram', () => {
    const s = cloud(0.4);
    expect(s.kind).toBe(SCENE.CLOUD);
    expect(s.hideStar).toBe(true);
    expect(s.modeled).toBe(false);
    expect(s.blobs.length).toBeGreaterThan(5);
    expect(s.glow).toBeTruthy();
    // Sized against the view, not against a star that does not exist yet.
    expect(s.roomHint).toBe('scene');
  });

  test('a neutron star and a black hole are marks, a white dwarf is a star', () => {
    expect(remnant('neutron-star', 'expected').remnant.drawn).toBe('mark');
    expect(remnant('black-hole', 'expected').remnant.drawn).toBe('mark');
    expect(remnant('neutron-star', 'expected').hideStar).toBe(true);
    const wd = remnant('white-dwarf', 'none');
    expect(wd.remnant.drawn).toBe('star');
    expect(wd.hideStar).toBe(false);
  });

  test('a remnant says it is a prescription rather than a track', () => {
    const s = remnant('black-hole', 'expected');
    expect(s.prescribed).toBe(true);
    expect(s.modeled).toBe(false);
  });
});

describe('what the model contributes, and what the drawing does', () => {
  test('ejecta appear only where the endpoint expects an explosion', () => {
    expect(
      remnant('neutron-star', 'expected', 0.5).fronts.length
    ).toBeGreaterThan(0);
    expect(remnant('white-dwarf', 'none', 0.5).fronts).toHaveLength(0);
    // A white dwarf is left by a star that shed a wind, not by an explosion,
    // and drawing one would be the lesson contradicting its own step 18.
    expect(remnant('white-dwarf', undefined, 0.9).fronts).toHaveLength(0);
  });

  test('the fronts expand as the stage runs and then leave', () => {
    const early = remnant('neutron-star', 'expected', 0.15);
    const mid = remnant('neutron-star', 'expected', 0.5);
    expect(extentOf(mid)).toBeGreaterThan(extentOf(early));
  });

  test('shells appear only once the track records mass being lost', () => {
    expect(track(0).shells).toHaveLength(0);
    expect(track(0.001).shells).toHaveLength(0);
    expect(track(0.2).shells.length).toBeGreaterThan(0);
    // And they reach further as more is lost, which is the one thing in this
    // illustration that is a measurement.
    expect(extentOf(track(0.4))).toBeGreaterThan(extentOf(track(0.05)));
  });

  test('the lost fraction comes from the two masses and nowhere else', () => {
    expect(lostFractionOf(20, 14)).toBeCloseTo(0.3, 12);
    expect(lostFractionOf(1, 1)).toBe(0);
    // Missing either mass is nothing lost rather than a guess.
    expect(lostFractionOf(null, 1)).toBe(0);
    expect(lostFractionOf(1, null)).toBe(0);
    expect(lostFractionOf(0, 1)).toBe(0);
    // And it never exceeds everything.
    expect(lostFractionOf(1, -5)).toBe(0);
    expect(lostFractionOf(20, 0)).toBe(1);
  });
});

describe('reduced motion', () => {
  test('parks the stage part-way rather than at nothing', () => {
    const still = cloud(0, { stillFrame: true });
    const first = cloud(0);
    // A frozen first frame of a collapse is a picture of nothing happening.
    expect(JSON.stringify(still)).not.toBe(JSON.stringify(first));
    expect(still.blobs.length).toBe(first.blobs.length);
    expect(still.glow.alpha).toBeGreaterThan(first.glow.alpha);
  });

  test('the still frame is the same wherever the playhead is', () => {
    // The point of the setting: nothing on screen moves as the model time
    // changes, so the picture cannot animate under a reader who asked it not
    // to.
    const a = cloud(0.1, { stillFrame: true });
    const b = cloud(0.9, { stillFrame: true });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('an explosion is shown mid-flight rather than not at all', () => {
    const s = remnant('neutron-star', 'expected', 0, { stillFrame: true });
    expect(s.fronts.length).toBeGreaterThan(0);
  });
});

describe('degenerate input', () => {
  test('a missing frame draws the ordinary star', () => {
    const s = sceneFor(null);
    expect(s.kind).toBe(SCENE.STAR);
    expect(s.hideStar).toBe(false);
  });

  test('a remnant with no endpoint is unfinished, not invented', () => {
    const s = sceneFor({ stage: 'remnant', within: 0.5 }, { seed: 'x' });
    expect(s.remnant.kind).toBe('unfinished');
    expect(s.fronts).toHaveLength(0);
    // Nothing is hidden: the star the model stopped on is still the best
    // answer there is, and replacing it with a mark would claim otherwise.
    expect(s.hideStar).toBe(false);
  });

  test('a position outside the stage is clamped rather than extrapolated', () => {
    expect(extentOf(cloud(-5))).toBeLessThan(3);
    expect(extentOf(cloud(99))).toBeLessThan(3);
  });
});
