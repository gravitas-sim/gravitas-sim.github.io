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
  restageStarPair,
  stageIntact,
  stagedBarycentre,
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
  bh_list,
  neutron_stars,
  planets,
  stars,
  updatePhysics,
  white_dwarfs,
} from '../js/physics.js';
import { endpointFor } from '../js/stellar/endpoints.js';
import { state } from '../js/appState.js';

beforeEach(() => {
  resetStageForTests();
  resetLessonSceneForTests();
  clearStage();
  stars.length = 0;
});

describe('where the stars go', () => {
  test('a row is centred on the origin and evenly spaced', () => {
    expect(rowLayout(3, { spacing: 100 })).toEqual([
      { x: -100, y: 0 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
  });

  test('an even count straddles the origin rather than sitting on it', () => {
    expect(rowLayout(2, { spacing: 50 }).map(p => p.x)).toEqual([-25, 25]);
  });

  test('a grid wraps and stays centred in both directions', () => {
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
    // Centred in the clear half: 250 pixels right of the window's middle.
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

describe('standing modelled stars on the canvas', () => {
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

  test('switching scale resizes and moves nothing', () => {
    applyStage(THREE);
    const before = stars.map(s => ({ x: s.pos.x, y: s.pos.y, r: s.radius }));
    setStageScale(SCALE.TRUE);
    expect(stageScale()).toBe(SCALE.TRUE);
    expect(stars.map(s => ({ x: s.pos.x, y: s.pos.y }))).toEqual(
      before.map(b => ({ x: b.x, y: b.y }))
    );
    // The giant grows relative to the dwarf: that is what true scale means.
    const ratioBefore = before[2].r / before[0].r;
    const ratioAfter = stars[2].radius / stars[0].radius;
    expect(ratioAfter).toBeGreaterThan(ratioBefore * 5);
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
    const all = populationSample(SPEC);
    const bright = populationSample({ ...SPEC, threshold: 1 });
    expect(bright.visible).toBeLessThan(all.visible);
    expect(bright.shown.length).toBeLessThanOrEqual(bright.visible);
    expect(bright.shown.every(s => s.luminositySun >= 1)).toBe(true);
    // The total does not move: the survey drew the same stars either way, and
    // the threshold is about which of them a telescope would have seen.
    expect(bright.total).toBe(all.total);
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
    const before = stars.length;
    applyStage({ population: { ...SPEC, show: 60, threshold: 1 } });
    expect(stars.length).toBeLessThan(before);
    expect(stars.length).toBeGreaterThan(0);
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
    const bary = stagedBarycentre();
    const a = bary.arms.find(x => x.role === 'a');
    const b = bary.arms.find(x => x.role === 'b');
    // Three times the mass, a third of the arm. This is the measurement the
    // lesson is built on, so it is asserted rather than assumed.
    expect(b.r / a.r).toBeCloseTo(3, 6);
    expect(a.r + b.r).toBeCloseTo(400, 6);
  });

  test('the balance point stays put while the pair goes round it', () => {
    applyStage({ starPair: { m1: 3, m2: 1, separation: 400 } });
    const before = stagedBarycentre();
    for (let n = 0; n < 400; n++) updatePhysics(1 / 60);
    const after = stagedBarycentre();
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
    expect(stagedBarycentre().arms.map(a => a.r)).toEqual([200, 200]);
    expect(restageStarPair({ m1: 3, m2: 1 })).toBe(true);
    const arms = stagedBarycentre().arms;
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
