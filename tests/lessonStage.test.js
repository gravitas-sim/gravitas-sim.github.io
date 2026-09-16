// =============================================================================
// The canvas as a comparison workspace
// -----------------------------------------------------------------------------
// A staged step declares the whole scene: which stars, where, at what size,
// and with which of them the model owns. What has to be true of that, and is
// checked here:
//
//   - it is deterministic, because a lesson that says "the third from the
//     left" has to be right on every machine and every reload;
//   - the stars are the model's, not estimates, and a hypothetical point still
//     brings no mass and no age with it;
//   - the two scales are what they claim - one proportional, one compressed -
//     and neither is quietly the other;
//   - a population on the canvas is a stated subsample of a stated total, and
//     a threshold changes both the canvas and the count together.
//
// The layout arithmetic is checked without an engine at all; the staging is
// checked against the real body classes and the real stellar model.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  DISPLAY_EXPONENT,
  SCALE,
  UNIT_RADIUS,
  atVisibilityFloor,
  displayRadius,
  fitCamera,
  rowLayout,
} from '../js/lesson/stage.js';
import {
  applyStage,
  becomeRemnant,
  clearStage,
  pinSnapshot,
  pinnedSnapshots,
  remnantKindOf,
  populationSample,
  resetStageForTests,
  stageScale,
  restageStar,
  restageStarPair,
  stageIntact,
  stagePresence,
  stagedBarycenter,
  stagedStars,
  setStageScale,
} from '../js/lessonStage.js';
import {
  resetLessonSceneForTests,
  roleBody,
  selectBody,
  setSelector,
} from '../js/lessonScene.js';
import {
  BlackHole,
  SOLAR_MASS_UNIT,
  accretion_disk_particles,
  asteroids,
  bh_list,
  comets,
  gas_giants,
  getWorldGeneration,
  neutron_stars,
  planets,
  stars,
  updatePhysics,
  white_dwarfs,
} from '../js/physics.js';
import { endpointFor } from '../js/stellar/endpoints.js';
import { schwarzschildRadiusM, SOLAR_MASS_KG } from '../js/blackHolePhysics.js';
import { state } from '../js/appState.js';

beforeEach(() => {
  resetStageForTests();
  resetLessonSceneForTests();
  clearStage();
  // Every collection, not just `stars`. Clearing one left planets, asteroids
  // and remnants from the previous test in the world, so a test that staged a
  // system and read `planets[0]` could be reading somebody else's planet - and
  // the failure showed up as a physics discrepancy rather than as a dirty
  // fixture, which is a bad hour.
  for (const list of [
    stars,
    planets,
    gas_giants,
    asteroids,
    comets,
    bh_list,
    neutron_stars,
    white_dwarfs,
  ]) {
    list.length = 0;
  }
  // Effect buffers too: a disk particle outliving its hole across tests makes
  // the next test's cleanup assertion about somebody else's leftovers.
  accretion_disk_particles.length = 0;
});

describe('where the stars go', () => {
  test('a row is centered on the origin and evenly spaced', () => {
    expect(rowLayout(3, { spacing: 100 })).toEqual([
      { x: -100, y: 0 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
  });

  test('an even count straddles the origin rather than sitting on it', () => {
    expect(rowLayout(2, { spacing: 50 }).map(p => p.x)).toEqual([-25, 25]);
  });

  test('a grid wraps and stays centered in both directions', () => {
    const grid = rowLayout(4, { spacing: 10, perRow: 2 });
    expect(grid).toEqual([
      { x: -5, y: -5 },
      { x: 5, y: -5 },
      { x: -5, y: 5 },
      { x: 5, y: 5 },
    ]);
  });

  test('nothing is asked for, nothing comes back', () => {
    expect(rowLayout(0)).toEqual([]);
  });

  test('the same request gives the same answer, every time', () => {
    expect(rowLayout(8, { spacing: 78 })).toEqual(
      rowLayout(8, { spacing: 78 })
    );
  });
});

describe('the two scales are different claims', () => {
  test('true scale is proportional to the physical radius', () => {
    const a = displayRadius(1, SCALE.TRUE);
    const b = displayRadius(10, SCALE.TRUE);
    expect(b / a).toBeCloseTo(10, 9);
    expect(a).toBeCloseTo(UNIT_RADIUS, 9);
  });

  test('compressed scale keeps the order and loses the ratio', () => {
    const small = displayRadius(0.2, SCALE.DISPLAY);
    const large = displayRadius(200, SCALE.DISPLAY);
    expect(large).toBeGreaterThan(small);
    // A thousandfold difference in radius comes out as about six on screen.
    expect(large / small).toBeCloseTo(1000 ** DISPLAY_EXPONENT, 6);
    expect(large / small).toBeLessThan(10);
  });

  test('the visibility floor is a marker, not a size', () => {
    // Two stars a factor of four apart, both drawn below the floor: the
    // picture cannot tell them apart, and the readout has to say so.
    expect(atVisibilityFloor(0.4, 1, 3)).toBe(true);
    expect(atVisibilityFloor(0.1, 1, 3)).toBe(true);
    expect(atVisibilityFloor(9, 1, 3)).toBe(false);
    // Zooming in lifts a star off the floor without changing its size.
    expect(atVisibilityFloor(0.4, 20, 3)).toBe(false);
  });
});

describe('framing the stage', () => {
  const placed = [
    { x: -100, y: 0, radius: 10 },
    { x: 100, y: 0, radius: 10 },
  ];

  test('the whole stage fits, with room round it', () => {
    // Wide enough that the zoom cap does not bind: 1020 world units across,
    // into 78% of 1000 pixels.
    const wide = [
      { x: -500, y: 0, radius: 10 },
      { x: 500, y: 0, radius: 10 },
    ];
    const cam = fitCamera(wide, { width: 1000, height: 600 });
    expect(cam.zoom).toBeCloseTo(780 / 1020, 6);
    expect(cam.pan.x).toBeCloseTo(0, 6);
  });

  test('and a stage small enough to fill the screen is capped instead', () => {
    // 220 units across would want a zoom of 3.5; the cap holds it at 3, so a
    // two-star comparison does not arrive filling the window.
    const cam = fitCamera(placed, { width: 1000, height: 600 });
    expect(cam.zoom).toBe(3);
  });

  test('a panel over the canvas moves the stage out from under it', () => {
    // This is the whole reason the inset exists: fitting to the window put the
    // stage behind the lesson panel and the instrument, where a reader could
    // not see the thing the step was about.
    const plain = fitCamera(placed, { width: 1000, height: 600 });
    const inset = fitCamera(
      placed,
      { width: 1000, height: 600 },
      {
        inset: { left: 500 },
      }
    );
    expect(inset.pan.x).toBeGreaterThan(plain.pan.x);
    // Centered in the clear half: 250 pixels right of the window's middle.
    expect(inset.pan.x).toBeCloseTo(250, 6);
  });

  test('one small star does not fill the screen with itself', () => {
    const cam = fitCamera([{ x: 0, y: 0, radius: 1 }], {
      width: 1000,
      height: 600,
    });
    expect(cam.zoom).toBeLessThanOrEqual(3);
  });

  test('nothing to frame is not a camera', () => {
    expect(fitCamera([], { width: 100, height: 100 })).toBe(null);
    expect(fitCamera(null, { width: 100, height: 100 })).toBe(null);
  });
});

describe('standing modeled stars on the canvas', () => {
  const THREE = {
    spacing: 100,
    stars: [
      { role: 'one', name: 'Star 1', track: 'm020' },
      { role: 'two', name: 'Star 2', track: 'm500' },
      { role: 'three', name: 'Star 3', track: 'm100', ageYr: 1.129e10 },
    ],
  };

  test('every star is built, bound, and owned by the model', () => {
    const out = applyStage(THREE);
    expect(out.built).toBe(true);
    expect(out.problems).toEqual({});
    expect(stars).toHaveLength(3);
    expect(stars.every(s => s.model_owned)).toBe(true);
    expect(roleBody('two')).toBe(stars[1]);
  });

  test('their properties come from the tracks, not from an estimate', () => {
    applyStage(THREE);
    const [dwarf, heavy, giant] = stars;
    expect(dwarf.temperature).toBeGreaterThan(2500);
    expect(dwarf.temperature).toBeLessThan(4000);
    expect(heavy.temperature).toBeGreaterThan(12000);
    // The old solar-mass star is the biggest of the three, which is the point
    // of the opening screen: size does not follow mass.
    expect(giant.radiusInSuns).toBeGreaterThan(heavy.radiusInSuns);
    expect(giant.massInSuns).toBeLessThan(heavy.massInSuns);
  });

  test('the same declaration gives the same scene twice over', () => {
    applyStage(THREE);
    const first = stars.map(s => ({
      x: s.pos.x,
      teff: s.temperature,
      r: s.radius,
    }));
    resetStageForTests();
    stars.length = 0;
    applyStage(THREE);
    expect(
      stars.map(s => ({ x: s.pos.x, teff: s.temperature, r: s.radius }))
    ).toEqual(first);
  });

  test('re-entering the same stage does not rebuild it', () => {
    applyStage(THREE);
    const ids = stars.map(s => s.id);
    const again = applyStage(THREE);
    expect(again.built).toBe(false);
    expect(stars.map(s => s.id)).toEqual(ids);
  });

  test('switching scale resizes the picture and moves nothing', () => {
    applyStage(THREE);
    const before = stars.map(s => ({
      x: s.pos.x,
      y: s.pos.y,
      r: s.radius,
      drawn: s.stageRadius,
    }));
    setStageScale(SCALE.TRUE);
    expect(stageScale()).toBe(SCALE.TRUE);
    expect(stars.map(s => ({ x: s.pos.x, y: s.pos.y }))).toEqual(
      before.map(b => ({ x: b.x, y: b.y }))
    );
    // The giant grows relative to the dwarf: that is what true scale means.
    const ratioBefore = before[2].drawn / before[0].drawn;
    const ratioAfter = stars[2].stageRadius / stars[0].stageRadius;
    expect(ratioAfter).toBeGreaterThan(ratioBefore * 5);
  });

  test('switching scale changes nothing the engine reads', () => {
    // The repair this asserts: `radius` is a collision radius, a tidal
    // radius and a hit target, and a scale switch is a statement about the
    // picture. While the two were one field, flicking between compressed and
    // true scale silently changed what the bodies would do to each other.
    applyStage(THREE);
    const physics = stars.map(s => ({
      radius: s.radius,
      mass: s.mass,
      x: s.pos.x,
      y: s.pos.y,
      vx: s.vel.x,
      vy: s.vel.y,
    }));
    setStageScale(SCALE.TRUE);
    setStageScale(SCALE.DISPLAY);
    setStageScale(SCALE.TRUE);
    expect(
      stars.map(s => ({
        radius: s.radius,
        mass: s.mass,
        x: s.pos.x,
        y: s.pos.y,
        vx: s.vel.x,
        vy: s.vel.y,
      }))
    ).toEqual(physics);
  });

  test('a hypothetical point brings no mass and no age with it', () => {
    applyStage({
      stars: [{ role: 'cursor', name: 'Your star', teffK: 9000, lumSun: 40 }],
    });
    const star = stars[0];
    expect(star.temperature).toBeCloseTo(9000, 6);
    expect(star.luminosityInSuns).toBeCloseTo(40, 6);
    // A temperature and a luminosity determine a radius, and nothing else.
    expect(star.radiusInSuns).toBeGreaterThan(0);
    expect(star.ageYr).toBe(null);
    expect(star.stellarPhase).toBe(null);
  });

  test('a matcher no model answers to is reported, not invented', () => {
    const out = applyStage({ stars: [{ role: 'x', track: 'not-a-track' }] });
    expect(out.problems.x).toMatch(/no model answers/);
    expect(stars).toHaveLength(0);
  });

  test('taking the stage down gives the bodies back', () => {
    applyStage(THREE);
    clearStage();
    expect(stars).toHaveLength(0);
    expect(stagedStars()).toHaveLength(0);
  });

  test('a stage replaces whatever was on the canvas', () => {
    applyStage(THREE);
    applyStage({ stars: [{ role: 'solo', track: 'm100' }] });
    expect(stars).toHaveLength(1);
  });
});

describe('a population on the canvas is a stated subsample', () => {
  const SPEC = { seed: 'stellar-population-1', count: 400, show: 40 };

  test('it says how many of how many', () => {
    const out = populationSample(SPEC);
    expect(out.shown).toHaveLength(40);
    expect(out.total).toBeGreaterThan(40);
    expect(out.visible).toBe(out.total);
    // The survey drew four hundred and could model fewer; the difference is
    // reported rather than folded into the total.
    expect(out.requested).toBe(400);
    expect(out.total).toBeLessThanOrEqual(out.requested);
  });

  test('the subsample is the same one every time', () => {
    const a = populationSample(SPEC).shown.map(s => s.index);
    const b = populationSample(SPEC).shown.map(s => s.index);
    expect(b).toEqual(a);
  });

  test('it is a stride through the list, not the first forty', () => {
    const picked = populationSample(SPEC).shown.map(s => s.index);
    expect(picked).toHaveLength(new Set(picked).size);
    expect(Math.max(...picked)).toBeGreaterThan(200);
  });

  test('a threshold changes what is shown and what is counted, together', () => {
    // The cut is a flux cut at a stated distance - the panel's own definition,
    // shared - rather than the intrinsic luminosity cut this used to be. The
    // two agreed at the values the lesson shipped with and nowhere else.
    const all = populationSample(SPEC);
    const bright = populationSample({ ...SPEC, thresholdFlux: 1e-4 });
    expect(bright.visible).toBeLessThan(all.visible);
    expect(bright.shown.length).toBeLessThanOrEqual(bright.visible);
    expect(bright.shown.every(s => s.luminositySun / 100 ** 2 >= 1e-4)).toBe(
      true
    );
    // The total does not move: the survey drew the same stars either way, and
    // the threshold is about which of them a telescope would have seen.
    expect(bright.total).toBe(all.total);
    // Nor does the shelf the cut acts on.
    expect(bright.subsample).toBe(all.subsample);
  });

  test('staging one puts a bounded number of bodies on the canvas', () => {
    const out = applyStage({ population: { ...SPEC, show: 25, perRow: 5 } });
    expect(out.built).toBe(true);
    expect(stars).toHaveLength(25);
    expect(stars.every(s => s.model_owned)).toBe(true);
    // Population stars carry the survey's own mass and age, so the inspector
    // is not left estimating them from a radius.
    expect(stars.every(s => Number.isFinite(s.massInSuns))).toBe(true);
    expect(stars.every(s => Number.isFinite(s.ageYr))).toBe(true);
  });

  test('and the threshold takes bodies off it', () => {
    applyStage({ population: { ...SPEC, show: 60 } });
    const before = stars.map(s => s.name);
    applyStage({ population: { ...SPEC, show: 60, thresholdFlux: 1e-4 } });
    const during = stars.map(s => s.name);
    expect(during.length).toBeLessThan(before.length);
    expect(during.length).toBeGreaterThan(0);
    // Taken off, not replaced: every star still standing was standing before.
    for (const name of during) expect(before).toContain(name);

    // And putting the cut back where it was puts back exactly those stars,
    // in that order - which is what makes "the population underneath never
    // changes" a true sentence rather than a hopeful one.
    applyStage({ population: { ...SPEC, show: 60 } });
    expect(stars.map(s => s.name)).toEqual(before);
  });
});

describe('what a hypothetical star may and may not claim', () => {
  const HYPOTHETICAL = {
    stars: [
      { role: 'sun', name: 'The Sun', track: 'm100', at: 'ms' },
      { role: 'wd', name: 'Hot and faint', teffK: 25000, lumSun: 0.01 },
    ],
  };

  test('it weighs something for the engine and reports nothing to the reader', () => {
    applyStage(HYPOTHETICAL, { force: true });
    const [sun, wd] = stars;
    // The modeled one carries the track's answers.
    expect(sun.massInSuns).toBeCloseTo(1, 2);
    expect(Number.isFinite(sun.ageYr)).toBe(true);

    // The hypothetical one carries none of them - not a zero, not a guess,
    // and not the solar mass the body was built with so that gravity would
    // have a number to work on. That fallback used to be written straight
    // into the reported mass, so a point somebody chose on the diagram had a
    // mass of exactly one solar mass in its card.
    expect(wd.massInSuns).toBeNull();
    expect(wd.ageYr).toBeNull();
    expect(wd.initialMassInSuns).toBeNull();
    expect(wd.modelSource).toBe('free');
    // But it does weigh something, or the integrator has nothing to do.
    expect(wd.mass).toBeGreaterThan(0);
    // And the two numbers it can honestly claim are the two it was given.
    expect(wd.temperature).toBeCloseTo(25000, 6);
    expect(wd.luminosityInSuns).toBeCloseTo(0.01, 9);
  });

  test('a lifetime is withheld too', () => {
    applyStage(HYPOTHETICAL, { force: true });
    const wd = stars[1];
    expect(wd.mainSequenceYr ?? null).toBeNull();
    expect(wd.stellarPhase ?? null).toBeNull();
  });
});

describe('a star that becomes what its prescription says', () => {
  const ONE = { stars: [{ role: 'star', name: 'The star', track: 'm100' }] };

  beforeEach(() => {
    white_dwarfs.length = 0;
    neutron_stars.length = 0;
    bh_list.length = 0;
    state.selectedObject = null;
    setSelector((object, type) => {
      state.selectedObject = { object, type };
    });
  });

  test('a solar-mass track leaves a white dwarf, and the role follows it', () => {
    applyStage(ONE);
    const before = roleBody('star');
    expect(becomeRemnant('star', endpointFor('m100'))).toBe('white-dwarf');
    expect(stars).not.toContain(before);
    expect(white_dwarfs).toHaveLength(1);
    // The role is the lesson's handle on the object; it has to survive the
    // object changing class, or every step after this one is talking about
    // something that is not there.
    expect(roleBody('star')).toBe(white_dwarfs[0]);
    expect(remnantKindOf('star')).toBe('white-dwarf');
  });

  test('the reader keeps their selection across the change', () => {
    // A white dwarf is a different body class from a star, so the object the
    // inspector is open on stops existing. Without carrying the selection the
    // card closes on a reader mid-sentence.
    applyStage(ONE);
    selectBody(roleBody('star'));
    expect(state.selectedObject.object).toBe(stars[0]);
    becomeRemnant('star', endpointFor('m100'));
    expect(state.selectedObject.object).toBe(white_dwarfs[0]);
    expect(state.selectedObject.object.name).toBe('The star');
  });

  test('a model that stopped first leaves the star alone', () => {
    // 'unfinished' means the track ran out before the star did. Inventing a
    // remnant here is the one thing js/stellar/endpoints.js refuses to do, and
    // the scene must refuse it too.
    const unfinished = { ...endpointFor('m100'), kind: 'unfinished' };
    applyStage(ONE);
    const star = roleBody('star');
    expect(becomeRemnant('star', unfinished)).toBe('unfinished');
    expect(roleBody('star')).toBe(star);
    expect(white_dwarfs).toHaveLength(0);
    expect(bh_list).toHaveLength(0);
  });

  test('it happens once, however many frames ask for it', () => {
    applyStage(ONE);
    becomeRemnant('star', endpointFor('m100'));
    becomeRemnant('star', endpointFor('m100'));
    becomeRemnant('star', endpointFor('m100'));
    expect(white_dwarfs).toHaveLength(1);
  });

  test('the remnant is model-owned, so nothing starts moving it', () => {
    applyStage(ONE);
    becomeRemnant('star', endpointFor('m100'));
    expect(white_dwarfs[0].model_owned).toBe(true);
  });
});

describe('then and now, as two objects', () => {
  const ONE = { stars: [{ role: 'star', name: 'The star', track: 'm100' }] };

  test('a snapshot is a separate body carrying the state it was taken at', () => {
    applyStage(ONE);
    const star = roleBody('star');
    star.temperature = 5772;
    star.radiusInSuns = 1;
    const pin = pinSnapshot('star', 'The Sun today');
    expect(pin.name).toBe('The Sun today');
    expect(pin.temperature).toBe(5772);
    expect(stars).toHaveLength(2);
    // And it does not follow the protagonist onwards, which is the whole
    // point of pinning one.
    star.temperature = 4000;
    star.radiusInSuns = 40;
    expect(pin.temperature).toBe(5772);
    expect(pin.radiusInSuns).toBe(1);
  });

  test('snapshots are selectable, named, and listed in order', () => {
    applyStage(ONE);
    pinSnapshot('star', 'Then');
    pinSnapshot('star', 'Now');
    expect(pinnedSnapshots().map(p => p.name)).toEqual(['Then', 'Now']);
    expect(pinnedSnapshots().every(p => p.star.model_owned)).toBe(true);
  });

  test('restaging the protagonist clears them, so nothing is left orphaned', () => {
    applyStage(ONE);
    pinSnapshot('star', 'Then');
    applyStage({ stars: [{ role: 'star', name: 'Other', track: 'm2000' }] });
    expect(pinnedSnapshots()).toEqual([]);
    expect(stars).toHaveLength(1);
  });
});

// -----------------------------------------------------------------------------
// A staged scene the engine is not allowed to take apart
// -----------------------------------------------------------------------------
// Both of these are regressions, and they cost the two gravitational-wave
// lessons their whole main scene: within about a second of opening either one,
// the two staged components had been merged by the collision system into one
// randomly named black hole, and the panel's restore then rebuilt the world on
// every 250 ms tick trying to put them back - so the reader watched a body the
// lesson knew nothing about regenerate under the step, and selecting from the
// object list selected nothing.
describe('a stage the engine may not evolve', () => {
  test('stageIntact looks in every list a stage can place into', () => {
    // The bug: it only looked in `stars`, so a binary - whose components live
    // in bh_list or neutron_stars - reported "gone" the instant it was built,
    // and the restore that answers that question fired forever.
    applyStage({ binary: { kinds: ['bh', 'bh'], m1: 36, m2: 29 } });
    expect(bh_list).toHaveLength(2);
    expect(stageIntact()).toBe(true);

    applyStage({ binary: { kinds: ['ns', 'ns'], m1: 1.4, m2: 1.4 } });
    expect(neutron_stars).toHaveLength(2);
    expect(stageIntact()).toBe(true);

    // And it still answers no when the scene really has been taken away.
    bh_list.length = 0;
    neutron_stars.length = 0;
    expect(stageIntact()).toBe(false);
  });

  test('two model-owned black holes inside each other are not merged', () => {
    applyStage({ binary: { kinds: ['bh', 'bh'], m1: 36, m2: 29 } });
    const [a, b] = bh_list;
    expect(a.model_owned).toBe(true);
    // Right on top of each other: far inside the sum of the drawn radii, which
    // is the condition the merge loop tests. A binary this close is not an
    // error - it is the end of the inspiral, which the lesson spends its last
    // screens on.
    a.pos = { x: 0, y: 0 };
    b.pos = { x: 1, y: 0 };
    for (let n = 0; n < 30; n++) updatePhysics(1 / 60);
    expect(bh_list).toHaveLength(2);
    expect(bh_list.map(o => o.name).sort()).toEqual([
      'Component 1',
      'Component 2',
    ]);
  });

  test('two model-owned neutron stars inside each other are not merged', () => {
    applyStage({ binary: { kinds: ['ns', 'ns'], m1: 1.4, m2: 1.4 } });
    const [a, b] = neutron_stars;
    a.pos = { x: 0, y: 0 };
    b.pos = { x: 1, y: 0 };
    for (let n = 0; n < 30; n++) updatePhysics(1 / 60);
    expect(neutron_stars).toHaveLength(2);
    expect(bh_list).toHaveLength(0);
  });

  test('bodies nobody owns still merge, so the guard is a guard', () => {
    applyStage({ binary: { kinds: ['bh', 'bh'], m1: 36, m2: 29 } });
    const [a, b] = bh_list;
    // Hand them back to the engine: the ordinary sandbox must be unchanged.
    a.model_owned = false;
    b.model_owned = false;
    a.pos = { x: 0, y: 0 };
    b.pos = { x: 1, y: 0 };
    for (let n = 0; n < 30; n++) updatePhysics(1 / 60);
    expect(bh_list.length).toBeLessThan(2);
  });
});

// -----------------------------------------------------------------------------
// A pair the engine really integrates
// -----------------------------------------------------------------------------
// The other kind of staged binary, and the distinction matters more than it
// looks. `binary` is owned by an inspiral model and the integrator must leave
// it alone; `starPair` is the thing "Weighing the Stars" measures, so the
// engine has to be the one moving it - a prescribed orbit would be the lesson
// quoting its own answer back to the student who is timing it.
describe('two stars the engine is meant to move', () => {
  test('a staged pair is ordinary: nothing owns it but the integrator', () => {
    applyStage({ starPair: { m1: 3, m2: 1, separation: 400 } });
    expect(stars).toHaveLength(2);
    for (const s of stars) expect(s.model_owned).toBe(false);
    expect(stars.map(s => s.name)).toEqual(['Star A', 'Star B']);
  });

  test('the heavier star sits nearer the balance point', () => {
    applyStage({ starPair: { m1: 3, m2: 1, separation: 400 } });
    const bary = stagedBarycenter();
    const a = bary.arms.find(x => x.role === 'a');
    const b = bary.arms.find(x => x.role === 'b');
    // Three times the mass, a third of the arm. This is the measurement the
    // lesson is built on, so it is asserted rather than assumed.
    expect(b.r / a.r).toBeCloseTo(3, 6);
    expect(a.r + b.r).toBeCloseTo(400, 6);
  });

  test('the balance point stays put while the pair goes round it', () => {
    applyStage({ starPair: { m1: 3, m2: 1, separation: 400 } });
    const before = stagedBarycenter();
    for (let n = 0; n < 400; n++) updatePhysics(1 / 60);
    const after = stagedBarycenter();
    // Zero net momentum by construction, so it must not have drifted. A pair
    // that slides off the view makes the whole overlay pointless.
    expect(after.x).toBeCloseTo(before.x, 3);
    expect(after.y).toBeCloseTo(before.y, 3);
    // And they are still two stars in orbit, not one merged one.
    expect(stars).toHaveLength(2);
  });

  test('the drawn size does not follow the mass', () => {
    // Deliberate: the lesson has students infer which star is heavier from the
    // arm lengths. Discs that grew with mass would give it away from the
    // picture and skip the reasoning the see-saw screens exist for.
    applyStage({ starPair: { m1: 4, m2: 1, separation: 400 } });
    expect(stars[0].radius).toBe(stars[1].radius);
  });

  test('changing the mass ratio restands the pair on a closed orbit', () => {
    applyStage({ starPair: { m1: 2, m2: 2, separation: 400 } });
    expect(stagedBarycenter().arms.map(a => a.r)).toEqual([200, 200]);
    expect(restageStarPair({ m1: 3, m2: 1 })).toBe(true);
    const arms = stagedBarycenter().arms;
    expect(arms[0].r).toBeCloseTo(100, 6);
    expect(arms[1].r).toBeCloseTo(300, 6);
    // Asking for what is already there is not a rebuild: a step that repaints
    // must not restart the orbit the student is timing.
    expect(restageStarPair({ m1: 3, m2: 1 })).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// A star with planets on real ellipses
// -----------------------------------------------------------------------------
// The habitable-zone scenarios are deliberately circular, which keeps their
// insolation measurement clean and leaves a lesson about a planet whose
// distance changes round its year with nothing live to point at. This is what
// it points at.
describe('a system with an eccentric planet', () => {
  test('a declared eccentricity produces a real ellipse', () => {
    applyStage({
      system: {
        starName: 'Sun',
        planets: [{ name: 'Wanderer', aAU: 1.2, ecc: 0.45 }],
      },
    });
    expect(stars).toHaveLength(1);
    expect(planets).toHaveLength(1);
    const [sun] = stars;
    const [world] = planets;
    // Starts at apoapsis: a(1+e) from the star, which for a = 1.2 AU and
    // e = 0.45 is 1.74 AU, or 174 world units.
    expect(
      Math.hypot(world.pos.x - sun.pos.x, world.pos.y - sun.pos.y)
    ).toBeCloseTo(174, 6);

    // Run a full year and watch the distance vary between the two turning
    // points the ellipse implies: 0.66 AU at periapsis, 1.74 at apoapsis.
    // One period here is 2*pi*sqrt(a^3/GM) with a = 120 and GM = 1000, which
    // is about 261 seconds of simulation time, so 300 is a whole orbit and a
    // little over.
    let min = Infinity;
    let max = -Infinity;
    for (let n = 0; n < 18000; n++) {
      updatePhysics(1 / 60);
      const r = Math.hypot(world.pos.x - sun.pos.x, world.pos.y - sun.pos.y);
      min = Math.min(min, r);
      max = Math.max(max, r);
    }
    expect(max).toBeCloseTo(174, 0);
    expect(min).toBeCloseTo(66, 0);
  });

  test('a circular request stays circular', () => {
    applyStage({
      system: { planets: [{ name: 'Steady', aAU: 1, ecc: 0 }] },
    });
    const [sun] = stars;
    const [world] = planets;
    const r0 = Math.hypot(world.pos.x - sun.pos.x, world.pos.y - sun.pos.y);
    for (let n = 0; n < 3000; n++) updatePhysics(1 / 60);
    const r1 = Math.hypot(world.pos.x - sun.pos.x, world.pos.y - sun.pos.y);
    expect(r1).toBeCloseTo(r0, 0);
  });

  test('nothing in it is model-owned: the integrator is meant to move it', () => {
    applyStage({
      system: { planets: [{ name: 'Wanderer', aAU: 1.2, ecc: 0.4 }] },
    });
    for (const b of [...stars, ...planets]) expect(b.model_owned).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// The repairs
// -----------------------------------------------------------------------------
// Five findings, each of which had the same root: a function that knew about
// `stars` and not about the seven other collections a stage puts bodies into.
// These assert the behavior rather than the inventory, because an inventory
// can be right and still be consulted by only one of the three callers.
describe('a stage is recognized whatever it put on the canvas', () => {
  // Every stage kind the module supports, with what it stands up. If a new
  // kind is added and not listed here, the count assertion below fails rather
  // than the new kind quietly going unchecked.
  const DECLARATIONS = [
    ['named stars', { stars: [{ role: 'a', track: 'm100', at: 0.4 }] }, 1],
    ['a star pair', { starPair: { m1: 3, m2: 1, separation: 400 } }, 2],
    [
      'a model-owned binary',
      { binary: { kinds: ['bh', 'bh'], m1: 36, m2: 29 } },
      2,
    ],
    ['a black hole with orbiters', { hole: { massSun: 10 } }, 5],
    ['an equal-mass comparison', { equalMass: { massSun: 8 } }, 4],
    [
      'a star with planets',
      { system: { planets: [{ name: 'W', aAU: 1.2, ecc: 0.4 }] } },
      2,
    ],
  ];

  test.each(DECLARATIONS)(
    '%s reports itself present the moment it is built',
    (_name, declaration, expected) => {
      applyStage(declaration);
      const presence = stagePresence();
      expect(presence.total).toBe(expected);
      expect(presence.present).toBe(expected);
      expect(presence.allGone).toBe(false);
      // The bug this replaces: stageIntact() looked in `stars` alone, so a
      // hole stage whose four orbiters are asteroids answered "gone" here and
      // the panel rebuilt the world four times a second for as long as the
      // lesson was open.
      expect(stageIntact()).toBe(true);
    }
  );

  test.each(DECLARATIONS)(
    '%s keeps the same objects across repeated probe ticks',
    (_name, declaration) => {
      applyStage(declaration);
      const ids = stagedStars().map(e => e.star.id);
      const generation = getWorldGeneration();
      // What renderProbe does, four times a second. Each tick asks whether the
      // stage is still there and rebuilds if it is not; a tick that rebuilds
      // gives every body a new id and resets every orbit to its start.
      for (let tick = 0; tick < 8; tick++) {
        expect(stagePresence().allGone).toBe(false);
        for (let frame = 0; frame < 15; frame++) updatePhysics(1 / 60);
      }
      expect(stagedStars().map(e => e.star.id)).toEqual(ids);
      expect(getWorldGeneration()).toBe(generation);
    }
  );

  test('an orbiting stage actually advances instead of restarting', () => {
    applyStage({ hole: { massSun: 10 } });
    const orbiter = asteroids[0];
    expect(orbiter).toBeTruthy();
    const start = { x: orbiter.pos.x, y: orbiter.pos.y };
    let traveled = 0;
    let previous = { ...start };
    for (let tick = 0; tick < 8; tick++) {
      expect(stagePresence().allGone).toBe(false);
      for (let frame = 0; frame < 15; frame++) updatePhysics(1 / 60);
      traveled += Math.hypot(
        orbiter.pos.x - previous.x,
        orbiter.pos.y - previous.y
      );
      previous = { x: orbiter.pos.x, y: orbiter.pos.y };
    }
    // A stage rebuilt on every tick puts its orbiters back where they started,
    // so the path length stays near zero and the body never gets anywhere.
    expect(traveled).toBeGreaterThan(20);
    expect(
      Math.hypot(orbiter.pos.x - start.x, orbiter.pos.y - start.y)
    ).toBeGreaterThan(1);
  });

  test('a reader removing one body is not a scene to rebuild', () => {
    // The distinction the panel needs. Deleting a body, or letting two merge,
    // is something the reader did on purpose; rebuilding under them would undo
    // it every quarter of a second.
    applyStage({ hole: { massSun: 10 } });
    expect(stagePresence().total).toBe(5);
    asteroids.splice(0, 1);
    const presence = stagePresence();
    expect(presence.present).toBe(4);
    expect(presence.allGone).toBe(false);
  });

  test('a world replaced wholesale is', () => {
    applyStage({ hole: { massSun: 10 } });
    // What a scenario load looks like from here: nothing of the stage left.
    bh_list.length = 0;
    asteroids.length = 0;
    const presence = stagePresence();
    expect(presence.present).toBe(0);
    expect(presence.allGone).toBe(true);
  });
});

describe('taking a stage down leaves nothing behind', () => {
  test.each([
    ['a star pair', { starPair: { m1: 3, m2: 1, separation: 400 } }],
    ['a black hole with orbiters', { hole: { massSun: 10 } }],
    ['an equal-mass comparison', { equalMass: { massSun: 8 } }],
    ['a star with planets', { system: { planets: [{ name: 'W', aAU: 1.2 }] } }],
    [
      'a model-owned binary',
      { binary: { kinds: ['ns', 'ns'], m1: 1.4, m2: 1.4 } },
    ],
  ])('%s is removed from every collection it used', (_name, declaration) => {
    applyStage(declaration);
    expect(stagedStars().length).toBeGreaterThan(0);
    clearStage();
    // clearStage() used to splice `stars` alone, so a hole's four orbiters, a
    // system's planets and every remnant stayed on the canvas and the reader
    // was handed a sandbox with somebody else's bodies in it.
    for (const list of [
      stars,
      planets,
      gas_giants,
      asteroids,
      comets,
      bh_list,
      neutron_stars,
      white_dwarfs,
    ]) {
      expect(list).toHaveLength(0);
    }
    expect(stagedStars()).toHaveLength(0);
    expect(pinnedSnapshots()).toHaveLength(0);
  });

  test('pinned comparison copies go too', () => {
    applyStage({
      stars: [{ role: 'a', track: 'm100', at: 0.3 }],
    });
    pinSnapshot('a', 'then');
    expect(pinnedSnapshots().length).toBe(1);
    const total = stars.length;
    expect(total).toBe(2);
    clearStage();
    // Snapshots were never in `staged`, so nothing removed them at all: a
    // lesson that pinned three comparisons left three stars behind.
    expect(stars).toHaveLength(0);
    expect(pinnedSnapshots()).toHaveLength(0);
  });

  test('nothing is left flagged as model-owned', () => {
    // A body still flagged when the integrator resumes is a body that never
    // moves again, which is how a restored sandbox comes back frozen.
    applyStage({ binary: { kinds: ['bh', 'bh'], m1: 36, m2: 29 } });
    // A binary stage's components are black holes, so they are in bh_list
    // rather than in stagedStars(), which reports the star shelf.
    const bodies = bh_list.slice();
    expect(bodies).toHaveLength(2);
    expect(bodies.every(b => b.model_owned)).toBe(true);
    clearStage();
    expect(bodies.every(b => b.model_owned === false)).toBe(true);
  });

  test('entering and leaving repeatedly does not accumulate anything', () => {
    for (let cycle = 0; cycle < 4; cycle++) {
      applyStage({ hole: { massSun: 10 } });
      expect(stagedStars()).toHaveLength(5);
      clearStage();
      expect(stagedStars()).toHaveLength(0);
    }
    for (const list of [stars, asteroids, bh_list, planets]) {
      expect(list).toHaveLength(0);
    }
  });
});

describe('a remnant replaces its star rather than joining it', () => {
  const TRACK = { stars: [{ role: 'sun', track: 'm100', at: 0.9 }] };
  const WD = { kind: 'white-dwarf', remnantMassSun: 0.6 };
  const NS = { kind: 'neutron-star', remnantMassSun: 1.4 };

  test('the old body leaves whatever collection held it', () => {
    applyStage(TRACK);
    expect(stars).toHaveLength(1);
    becomeRemnant('sun', WD);
    expect(stars).toHaveLength(0);
    expect(white_dwarfs).toHaveLength(1);
    expect(stagedStars()).toHaveLength(1);
  });

  test('a second transition does not leave the first behind', () => {
    // becomeRemnant() spliced `stars`, so a body that was already a white
    // dwarf could not be found there and stayed on the canvas as a duplicate.
    applyStage(TRACK);
    becomeRemnant('sun', WD);
    becomeRemnant('sun', NS);
    expect(white_dwarfs).toHaveLength(0);
    expect(neutron_stars).toHaveLength(1);
    expect(stars).toHaveLength(0);
    expect(stagedStars()).toHaveLength(1);
  });

  test('asking for the same remnant twice changes nothing', () => {
    applyStage(TRACK);
    becomeRemnant('sun', WD);
    const body = stagedStars()[0].star;
    const generation = getWorldGeneration();
    expect(becomeRemnant('sun', WD)).toBe('white-dwarf');
    expect(stagedStars()[0].star).toBe(body);
    expect(white_dwarfs).toHaveLength(1);
    expect(getWorldGeneration()).toBe(generation);
  });

  test('rewinding puts a star back, not a white dwarf wearing a star label', () => {
    applyStage(TRACK);
    becomeRemnant('sun', WD);
    expect(white_dwarfs).toHaveLength(1);
    expect(remnantKindOf('sun')).toBe('white-dwarf');

    // Rewinding is a restage: the step hands back a point on the track.
    restageStar('sun', {
      source: 'model',
      teffK: 5772,
      luminositySun: 1,
      radiusSun: 1,
      massSun: 1,
    });
    expect(white_dwarfs).toHaveLength(0);
    expect(stars).toHaveLength(1);
    expect(stars[0].constructor.name).toBe('StarObject');
    expect(remnantKindOf('sun')).toBeNull();
    expect(stagedStars()[0].star).toBe(stars[0]);
  });

  test('going forward, back and forward again ends where it started', () => {
    applyStage(TRACK);
    const name = stagedStars()[0].star.name;
    becomeRemnant('sun', WD);
    restageStar('sun', {
      source: 'model',
      teffK: 5772,
      luminositySun: 1,
      radiusSun: 1,
      massSun: 1,
    });
    becomeRemnant('sun', WD);
    expect(white_dwarfs).toHaveLength(1);
    expect(stars).toHaveLength(0);
    expect(stagedStars()).toHaveLength(1);
    // The role and the name survive the round trip, because from the reader's
    // side this is one object being wound back and forth.
    expect(stagedStars()[0].star.name).toBe(name);
    expect(remnantKindOf('sun')).toBe('white-dwarf');
  });
});

describe('visual scale is not physics', () => {
  test('a stage with no modeled radius is not resized at all', () => {
    // The Goldilocks case: setStageScale() wrote a stellar display radius onto
    // a planet that has no physicalRadiusSun, taking it from 4.8 to 9 - and
    // 9 is a collision radius.
    applyStage({
      system: { planets: [{ name: 'W', aAU: 1.2, ecc: 0.4, radius: 4.8 }] },
    });
    const planet = planets[0];
    expect(planet.radius).toBeCloseTo(4.8, 9);
    setStageScale(SCALE.TRUE);
    expect(planet.radius).toBeCloseTo(4.8, 9);
    setStageScale(SCALE.DISPLAY);
    expect(planet.radius).toBeCloseTo(4.8, 9);
    expect(planet.stageRadius).toBeUndefined();
  });

  test('a hole’s orbiters keep their own size through a scale switch', () => {
    applyStage({ hole: { massSun: 10 } });
    const sizes = asteroids.map(a => a.radius);
    setStageScale(SCALE.TRUE);
    expect(asteroids.map(a => a.radius)).toEqual(sizes);
  });

  test('the same orbit is measured whichever scale is showing', () => {
    applyStage(
      { system: { planets: [{ name: 'W', aAU: 1.2, ecc: 0.4 }] } },
      { force: true }
    );
    // Looked up inside the run, not captured outside it: a rebuild replaces
    // both bodies, and a closure over the old ones measures two objects the
    // integrator is no longer moving.
    const run = () => {
      const sun = stars[0];
      const planet = planets[0];
      const seen = [];
      for (let n = 0; n < 600; n++) {
        updatePhysics(1 / 60);
        if (n % 100 === 0) {
          seen.push(
            Math.hypot(planet.pos.x - sun.pos.x, planet.pos.y - sun.pos.y)
          );
        }
      }
      return seen;
    };
    const compressed = run();
    // Rebuilt the same way for both runs, so the only difference between them
    // is the scale switch.
    applyStage(
      { system: { planets: [{ name: 'W', aAU: 1.2, ecc: 0.4 }] } },
      { force: true }
    );
    setStageScale(SCALE.TRUE);
    const trueScale = run();
    // Same trajectory to the last digit: the scale switch touched nothing the
    // integrator reads.
    trueScale.forEach((r, i) => expect(r).toBeCloseTo(compressed[i], 9));
  });
});

// -----------------------------------------------------------------------------
// The two scenes the findings named
// -----------------------------------------------------------------------------
// The declarations above are the module's own vocabulary. These are the exact
// objects the two lessons ship, imported from the lesson files, so that a
// change to either declaration is caught here rather than in a browser.
describe('the scenes the repair was reported against', () => {
  const REAL = [
    ['black-holes, every step', 'black-holes'],
    ['goldilocks, crossing-the-edges', 'goldilocks-question'],
  ];

  test.each(REAL)('%s survives repeated probe ticks', async (_name, id) => {
    const { INVESTIGATIONS } = await import('../js/data/investigations.js');
    const inv = INVESTIGATIONS.find(i => i.id === id);
    const declarations = inv.steps.map(s => s.stage).filter(Boolean);
    expect(declarations.length).toBeGreaterThan(0);

    for (const declaration of declarations) {
      applyStage(declaration, { force: true });
      const ids = stagedStars().map(e => e.star.id);
      const generation = getWorldGeneration();
      expect(ids.length).toBeGreaterThan(0);
      // Eight ticks of what renderProbe does. Before the repair every one of
      // these rebuilt: the black-hole stage puts its orbiters in `asteroids`
      // and the Goldilocks ellipse puts its world in `planets`, and
      // stageIntact() looked in neither.
      for (let tick = 0; tick < 8; tick++) {
        expect(stagePresence().allGone).toBe(false);
        for (let frame = 0; frame < 10; frame++) updatePhysics(1 / 60);
      }
      expect(stagedStars().map(e => e.star.id)).toEqual(ids);
      expect(getWorldGeneration()).toBe(generation);
      clearStage();
    }
  });
});

describe('switching a star between tracks', () => {
  const shelf = { stars: [{ role: 'sun', track: 'm100', at: 0.3 }] };

  test('no duplicate is left behind and the mass follows the model', async () => {
    const { stateAtSample } = await import('../js/stellar/tracks.js');
    applyStage(shelf);
    const before = stars[0];
    const heavy = stateAtSample('m500', 0.3);
    expect(heavy).toBeTruthy();

    restageStar('sun', heavy);
    // One star, the same object: a track switch is the same star being
    // described differently, not a second one appearing.
    expect(stars).toHaveLength(1);
    expect(stars[0]).toBe(before);
    expect(stagedStars()).toHaveLength(1);
    // And the mass came with it. It used to keep the first track's mass while
    // showing the second track's temperature - a star no model describes.
    expect(stars[0].massInSuns).toBeCloseTo(heavy.currentMassSun, 6);
    expect(stars[0].mass / SOLAR_MASS_UNIT).toBeCloseTo(
      heavy.currentMassSun,
      6
    );
    expect(stars[0].initialMassInSuns).toBeCloseTo(heavy.initialMassSun, 6);
    expect(stars[0].modelSource).toBe('model');
  });

  test('a free point after a track takes the mass back', async () => {
    const { stateAtSample } = await import('../js/stellar/tracks.js');
    applyStage(shelf);
    restageStar('sun', stateAtSample('m500', 0.3));
    expect(stars[0].massInSuns).toBeGreaterThan(1);
    restageStar('sun', {
      source: 'free',
      teffK: 9000,
      luminositySun: 40,
      radiusSun: 2.6,
    });
    expect(stars[0].massInSuns).toBeNull();
    expect(stars[0].ageYr).toBeNull();
    expect(stars[0].modelSource).toBe('free');
    // The engine mass is left where it was rather than being invented: the
    // body still has to weigh something, and it is no longer a claim.
    expect(Number.isFinite(stars[0].mass)).toBe(true);
  });
});

describe('a stage takes its effects with it', () => {
  test('an accreting hole leaves no disk behind', () => {
    applyStage({ hole: { massSun: 10 } });
    const hole = bh_list[0];
    // Whatever the disk system produced for it, plus one planted entry so the
    // assertion is about the removal rather than about whether this scenario
    // happens to accrete during a short test.
    hole.disk_particles = hole.disk_particles || [];
    hole.disk_particles.push({ alive: true });
    accretion_disk_particles.push({ alive: true, parentBlackHole: hole });
    const mine = accretion_disk_particles.length;
    // Something else's disk, which is not the lesson's to remove.
    const theirs = new BlackHole({ x: 900, y: 0 }, 1000, { x: 0, y: 0 }, false);
    theirs.name = 'Reader hole';
    bh_list.push(theirs);
    const other = { alive: true, parentBlackHole: theirs };
    accretion_disk_particles.push(other);

    clearStage();
    expect(hole.disk_particles).toHaveLength(0);
    expect(accretion_disk_particles).toHaveLength(1);
    expect(accretion_disk_particles[0]).toBe(other);
    expect(bh_list).toContain(theirs);
    expect(mine).toBeGreaterThan(0);
    accretion_disk_particles.length = 0;
  });
});

// =============================================================================
// The hole stage places orbits by the drawing, and says so
// -----------------------------------------------------------------------------
// applyHoleStage used to be documented as placing its orbiters "in Schwarzschild
// radii of the hole's own mass", with the innermost bound described as the
// innermost stable circular orbit. Both were false: the radii are multiples of
// the hole's drawn radius, and the bound is a bound on the picture. The two
// claims together were the exact misconception the lesson that calls this
// spends a screen dismantling - it tells a reader that the dark disc "is drawn
// at whatever size lets four orbits fit in a window, which is a choice about
// the picture and carries no information".
//
// The behavior was right and only the description was wrong, so this pins the
// behavior: an orbiter's distance is a multiple of the drawn radius, and it
// is not a multiple of the Schwarzschild radius, which for these masses is
// smaller by many orders of magnitude.
describe('a black hole stage measures its orbits in drawn radii', () => {
  /** The orbiters' distances from the hole, and the hole's drawn radius. */
  function stageHole(massSun, orbits) {
    clearStage();
    applyStage({ hole: { massSun, orbits, fit: false } });
    const hole = bh_list[0];
    return {
      hole,
      drawn: hole.radius,
      distances: asteroids.map(a => Math.hypot(a.pos.x, a.pos.y)),
    };
  }

  test('each orbiter sits at its requested multiple of the drawn radius', () => {
    const orbits = [4.2, 6.4, 9.2, 12.6];
    const { drawn, distances } = stageHole(10, orbits);
    expect(distances).toHaveLength(orbits.length);
    distances.forEach((r, i) => {
      expect(r / drawn).toBeCloseTo(orbits[i], 6);
    });
  });

  test('the innermost bound is three drawn radii, and it is a drawing bound', () => {
    // Asked for something closer than the floor allows.
    const { drawn, distances } = stageHole(10, [0.5, 1, 2]);
    for (const r of distances) {
      expect(r / drawn).toBeCloseTo(3, 6);
    }
  });

  // The claim that used to be in the docstring, checked and found false. A
  // Schwarzschild radius for a ten-solar-mass hole is about thirty kilometers;
  // the drawn radius is a canvas length chosen to make four orbits fit, and
  // the two are not in any fixed ratio - changing the mass changes one of them
  // on a completely different curve from the other.
  test('the orbit radii are not multiples of the Schwarzschild radius', () => {
    const light = stageHole(10, [4.2]);
    const heavy = stageHole(1000, [4.2]);
    const rsLight = schwarzschildRadiusM(10 * SOLAR_MASS_KG);
    const rsHeavy = schwarzschildRadiusM(1000 * SOLAR_MASS_KG);
    // In Schwarzschild radii the "same" orbit is a hundredfold different
    // number, which is what makes the old docstring's units wrong.
    const inRsLight = light.distances[0] / rsLight;
    const inRsHeavy = heavy.distances[0] / rsHeavy;
    expect(inRsLight / inRsHeavy).not.toBeCloseTo(1, 1);
    // While in drawn radii it is 4.2 both times, which is the actual contract.
    expect(light.distances[0] / light.drawn).toBeCloseTo(4.2, 6);
    expect(heavy.distances[0] / heavy.drawn).toBeCloseTo(4.2, 6);
  });

  test('the orbiters are the engine, not a model', () => {
    const { hole } = stageHole(10, [4.2, 6.4]);
    expect(hole.model_owned).toBe(false);
    for (const a of asteroids) expect(a.model_owned).not.toBe(true);
  });
});
