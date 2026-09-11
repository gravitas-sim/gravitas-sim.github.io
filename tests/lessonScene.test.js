// =============================================================================
// One object, several surfaces, and one author for each number
// -----------------------------------------------------------------------------
// The rules are tested next door in tests/lessonBinding.test.js without any
// engine at all. What is tested here is the part that touches the real one:
// that a role resolves to a real body in a real world, that a rebuild is
// noticed rather than papered over, and - the claim with the most riding on it
// - that a body a prescribed model owns is genuinely not moved by the
// integrator, which is checked by running the integrator.
//
// The stellar half is the small complete connection this pass exists to
// demonstrate: a star in the scene and a point on an H-R diagram that are the
// same object, with the model as the single author of its temperature.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  BINDING,
  bindRoles,
  boundRoles,
  enterLessonScope,
  evidenceSnapshot,
  hasModelOwnedBodies,
  leaveLessonScope,
  modeDescription,
  prescribedRoles,
  releaseModelOwnership,
  resetLessonSceneForTests,
  resolveRole,
  roleBody,
  roleOf,
  roleProblem,
  rolesNeedingRebind,
  selectableBodies,
  selectBody,
  selectRole,
  setSelector,
} from '../js/lessonScene.js';
import {
  Planet,
  StarObject,
  bh_list,
  bumpWorldGeneration,
  check_stellar_collapse,
  getWorldGeneration,
  planets,
  resetPhysicsObjectCounter,
  stars,
} from '../js/physics.js';
import {
  MODELLED_FIELDS,
  applySelection,
  fieldsFromSelection,
  nearestTrackByMass,
  pointForStar,
  readStarState,
  writeStarState,
} from '../js/lesson/starState.js';

/**
 * An empty world with the bodies a test asks for, and a fresh generation.
 *
 * The id counter is reset the way js/ui.js clearWorld resets it, because that
 * reset is the reason a binding has to carry a world generation at all: it is
 * what makes the star in the second world share an id with the star in the
 * first.
 */
function world({ starNames = [], planetNames = [] } = {}) {
  stars.length = 0;
  planets.length = 0;
  resetPhysicsObjectCounter();
  for (const name of starNames) {
    const s = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1000);
    s.name = name;
    stars.push(s);
  }
  for (const [i, name] of planetNames.entries()) {
    const p = new Planet({ x: 100 + i * 10, y: 0 }, { x: 0, y: 5 }, 1);
    p.name = name;
    planets.push(p);
  }
  bumpWorldGeneration();
}

beforeEach(() => {
  resetLessonSceneForTests();
  world();
});

describe('a role resolves to one body in one world', () => {
  test('an exact name finds it, and roleOf finds the way back', () => {
    world({ starNames: ['Sun'], planetNames: ['Mars'] });
    const { bound, problems } = bindRoles({
      sun: { kind: 'Star', name: 'Sun' },
    });
    expect(bound).toEqual(['sun']);
    expect(problems).toEqual({});
    expect(roleBody('sun')).toBe(stars[0]);
    expect(roleOf(stars[0])).toBe('sun');
    expect(roleOf(planets[0])).toBe(null);
  });

  test('two bodies with the name bind nothing and say why', () => {
    world({ planetNames: ['Mars', 'Mars'] });
    const { bound, problems } = bindRoles({ red: { name: 'Mars' } });
    expect(bound).toEqual([]);
    expect(problems.red).toMatch(/2 bodies match/);
    expect(roleBody('red')).toBe(null);
    expect(roleProblem('red')).toMatch(/2 bodies match/);
  });

  test('one bad matcher does not stop the good ones', () => {
    world({ starNames: ['Sun'], planetNames: ['Mars'] });
    const { bound, problems } = bindRoles({
      sun: { kind: 'Star', name: 'Sun' },
      moon: { name: 'Luna' },
    });
    expect(bound).toEqual(['sun']);
    expect(Object.keys(problems)).toEqual(['moon']);
  });

  test('a rebuild is stale, not silently re-bound to the new body', () => {
    // The failure this exists to prevent: ids restart at zero on a rebuild,
    // and a scenario names its stars from the same pool, so the obvious
    // fallbacks - the id, the name - both find a plausible wrong answer.
    world({ starNames: ['Sun'] });
    bindRoles({ sun: { kind: 'Star', name: 'Sun' } });
    expect(resolveRole('sun').status).toBe(BINDING.BOUND);

    world({ starNames: ['Sun'] });
    expect(resolveRole('sun').status).toBe(BINDING.STALE);
    expect(roleBody('sun')).toBe(null);
    expect(rolesNeedingRebind()).toEqual(['sun']);
  });

  test('a body that has gone in this world reads as gone, not stale', () => {
    world({ starNames: ['Sun'] });
    bindRoles({ sun: { kind: 'Star', name: 'Sun' } });
    stars.length = 0;
    expect(resolveRole('sun').status).toBe(BINDING.GONE);
  });

  test('binding again replaces the roster rather than adding to it', () => {
    world({ starNames: ['Sun'], planetNames: ['Mars'] });
    bindRoles({ sun: { kind: 'Star', name: 'Sun' } });
    bindRoles({ red: { name: 'Mars' } });
    expect(boundRoles()).toEqual(['red']);
  });
});

describe('a body a model owns is not moved by the integrator', () => {
  test('it stays exactly where it was put, while its neighbour does not', () => {
    world({ starNames: ['Sun'], planetNames: ['Mars', 'Venus'] });
    bindRoles(
      { red: { name: 'Mars' }, hot: { name: 'Venus' } },
      { modelOwned: ['red'] }
    );
    const [mars, venus] = planets;
    const held = { ...mars.pos };
    const other = { ...venus.pos };
    for (let i = 0; i < 40; i++) {
      mars.update_physics(0.01, [stars[0]]);
      venus.update_physics(0.01, [stars[0]]);
    }
    expect(mars.pos.x).toBeCloseTo(held.x, 12);
    expect(mars.pos.y).toBeCloseTo(held.y, 12);
    // Its neighbour, under the same call, does move - so the guard is what
    // held it and not a still world.
    expect(
      Math.hypot(venus.pos.x - other.x, venus.pos.y - other.y)
    ).toBeGreaterThan(0);
  });

  test('and it moves again the moment it is released', () => {
    world({ starNames: ['Sun'], planetNames: ['Mars'] });
    bindRoles({ red: { name: 'Mars' } }, { modelOwned: ['red'] });
    const mars = planets[0];
    releaseModelOwnership();
    const held = { ...mars.pos };
    for (let i = 0; i < 40; i++) mars.update_physics(0.01, [stars[0]]);
    expect(
      Math.hypot(mars.pos.x - held.x, mars.pos.y - held.y)
    ).toBeGreaterThan(0);
  });

  test('leaving the lesson releases it, so nothing is frozen for ever', () => {
    world({ planetNames: ['Mars'] });
    bindRoles({ red: { name: 'Mars' } }, { modelOwned: ['red'] });
    expect(hasModelOwnedBodies()).toBe(true);
    expect(planets[0].model_owned).toBe(true);
    leaveLessonScope();
    expect(hasModelOwnedBodies()).toBe(false);
    expect(planets[0].model_owned).toBe(false);
  });

  test('a rebuild between claiming and releasing does not throw', () => {
    // The body from the previous world is not in the lists any more, so there
    // is nothing to clear - and nothing to get wrong.
    world({ planetNames: ['Mars'] });
    bindRoles({ red: { name: 'Mars' } }, { modelOwned: ['red'] });
    world({ planetNames: ['Mars'] });
    expect(() => leaveLessonScope()).not.toThrow();
    expect(planets[0].model_owned).toBe(false);
  });

  test('the mode says who is computing what', () => {
    world({ starNames: ['Sun'], planetNames: ['Mars'] });
    expect(modeDescription().mode).toBe('nbody');
    bindRoles(
      { sun: { kind: 'Star', name: 'Sun' }, red: { name: 'Mars' } },
      { modelOwned: ['sun'] }
    );
    expect(modeDescription('MIST tracks')).toEqual({
      mode: 'mixed',
      model: 'MIST tracks',
      roles: ['sun'],
    });
    bindRoles({ sun: { kind: 'Star', name: 'Sun' } }, { modelOwned: ['sun'] });
    expect(modeDescription('MIST tracks').mode).toBe('model');
    expect(prescribedRoles()).toEqual(['sun']);
  });
});

describe('selection is one act, whoever performs it', () => {
  test('selecting a role goes through the installed selector', () => {
    world({ starNames: ['Sun'] });
    bindRoles({ sun: { kind: 'Star', name: 'Sun' } });
    const seen = [];
    setSelector((body, type) => seen.push([body.name, type]));
    expect(selectRole('sun')).toBe(true);
    expect(seen).toEqual([['Sun', 'Star']]);
  });

  test('selecting a role nobody bound does nothing, quietly', () => {
    setSelector(() => {
      throw new Error('should not be called');
    });
    expect(selectRole('nobody')).toBe(false);
    expect(selectBody(null)).toBe(false);
  });

  test('the object list names the same bodies, with the lesson words', () => {
    world({ starNames: ['Sun'], planetNames: ['Mars', 'Venus'] });
    bindRoles({ sun: { kind: 'Star', name: 'Sun' }, red: { name: 'Mars' } });
    const list = selectableBodies();
    expect(list).toHaveLength(3);
    expect(list.map(e => e.role)).toEqual(['sun', 'red', null]);
    expect(list.map(e => e.kind)).toEqual(['Star', 'Planet', 'Planet']);
  });
});

describe('evidence', () => {
  test('a snapshot carries the world it was taken in, and is frozen', () => {
    world({ starNames: ['Sun'] });
    bindRoles({ sun: { kind: 'Star', name: 'Sun' } }, { modelOwned: ['sun'] });
    const snap = evidenceSnapshot({
      role: 'sun',
      body: stars[0],
      model: 'MIST v1.2',
      parameters: { trackId: '1', ageFraction: 0.5 },
      measurement: { radiusSun: 1 },
      scaleMode: 'fixed',
    });
    expect(snap.object).toEqual({ id: stars[0].id, name: 'Sun', kind: 'Star' });
    expect(snap.worldGeneration).toBe(getWorldGeneration());
    expect(snap.owner).toBe('model');
    expect(snap.model).toBe('MIST v1.2');
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.parameters)).toBe(true);
    expect(() => {
      snap.measurement.radiusSun = 99;
    }).toThrow();
  });

  test('two readings of the same star in two worlds are distinguishable', () => {
    world({ starNames: ['Sun'] });
    bindRoles({ sun: { kind: 'Star', name: 'Sun' } });
    const first = evidenceSnapshot({ role: 'sun', body: stars[0] });
    world({ starNames: ['Sun'] });
    bindRoles({ sun: { kind: 'Star', name: 'Sun' } });
    const second = evidenceSnapshot({ role: 'sun', body: stars[0] });
    expect(second.object.id).toBe(first.object.id);
    expect(second.worldGeneration).not.toBe(first.worldGeneration);
  });
});

describe('the scope a lesson borrows', () => {
  test('the first entry is what comes back, not the last', () => {
    expect(enterLessonScope({ paused: false })).toBe(true);
    expect(enterLessonScope({ paused: true })).toBe(false);
    expect(leaveLessonScope()).toEqual([['paused', false]]);
  });
});

describe('a stellar model writing onto a star', () => {
  const modelled = {
    source: 'model',
    teffK: 5772,
    luminositySun: 1,
    radiusSun: 1,
    ageYr: 4.6e9,
    phase: 'main-sequence',
  };
  const free = {
    source: 'free',
    teffK: 10000,
    luminositySun: 1,
    radiusSun: 0.33,
  };

  test('a modelled point supplies an age and a phase', () => {
    expect(fieldsFromSelection(modelled)).toEqual({
      temperature: 5772,
      luminosityInSuns: 1,
      radiusInSuns: 1,
      ageYr: 4.6e9,
      stellarPhase: 'main-sequence',
    });
  });

  test('a free cursor supplies a radius and nothing else it cannot know', () => {
    // The rule: a temperature and a luminosity determine a radius. They do not
    // determine a mass, an age or a remaining lifetime, and several quite
    // different stars sit at any one point.
    const fields = fieldsFromSelection(free);
    expect(fields).toEqual({
      temperature: 10000,
      luminosityInSuns: 1,
      radiusInSuns: 0.33,
    });
    expect('ageYr' in fields).toBe(false);
    expect('stellarPhase' in fields).toBe(false);
  });

  test('moving from a modelled point to a free one takes the age back', () => {
    const star = {};
    applySelection(star, modelled);
    expect(star.ageYr).toBe(4.6e9);
    applySelection(star, free);
    expect(star.ageYr).toBe(null);
    expect(star.stellarPhase).toBe(null);
    expect(star.temperature).toBe(10000);
  });

  test('writing the same selection twice changes nothing the second time', () => {
    const star = {};
    expect(applySelection(star, modelled)).toBe(true);
    expect(applySelection(star, modelled)).toBe(false);
  });

  test('a star can be read and put back exactly', () => {
    const star = { temperature: 5772, luminosityInSuns: 1, radiusInSuns: 1 };
    const saved = readStarState(star);
    applySelection(star, free);
    expect(star.temperature).toBe(10000);
    writeStarState(star, saved);
    expect(star.temperature).toBe(5772);
    expect(MODELLED_FIELDS.every(k => k in star)).toBe(true);
  });

  test('where a star already is, when it says', () => {
    expect(pointForStar({ temperature: 5772, luminosityInSuns: 1 })).toEqual({
      teffK: 5772,
      luminositySun: 1,
      ageYr: null,
      initialMassSun: null,
    });
    expect(pointForStar({ temperature: null, luminosityInSuns: 1 })).toBe(null);
    expect(pointForStar(null)).toBe(null);
  });

  test('the nearest track is nearest in log mass, not in mass', () => {
    const tracks = [0.2, 0.5, 1, 2, 5, 10, 20, 40].map(m => ({
      id: String(m),
      initialMassSun: m,
    }));
    // 3 solar masses is 0.48 of the way from 2 to 5 linearly, and 0.16 of the
    // way in log, which is the spacing the catalogue actually has.
    expect(nearestTrackByMass(3, tracks)).toBe('2');
    expect(nearestTrackByMass(1.05, tracks)).toBe('1');
    expect(nearestTrackByMass(38, tracks)).toBe('40');
    expect(nearestTrackByMass(NaN, tracks)).toBe(null);
    expect(nearestTrackByMass(1, [])).toBe(null);
  });

  test('a star driven by the model still pulls on everything else', () => {
    // "The model owns this" means the integrator does not push it back. It
    // does not mean the body stops existing: its gravity is unchanged, which
    // is what keeps the rest of the scene honest.
    world({ starNames: ['Sun'], planetNames: ['Mars'] });
    bindRoles(
      { sun: { kind: 'Star', name: 'Sun' }, red: { name: 'Mars' } },
      { modelOwned: ['sun'] }
    );
    const mars = planets[0];
    const before = { ...mars.vel };
    for (let i = 0; i < 20; i++) mars.update_physics(0.01, [stars[0]]);
    expect(mars.vel.x).not.toBeCloseTo(before.x, 9);
  });
});

describe('the sandbox does not evolve a star the model owns', () => {
  test('a heavy staged star does not collapse into a black hole', () => {
    // The engine turns any star past its maximum mass into a black hole. That
    // rule is about stars the sandbox is simulating; a forty-solar-mass track
    // standing on a lesson's shelf is a drawing of a published model, and
    // collapsing it is the sandbox making a claim about a body it was only
    // asked to display. It cost a lesson its heaviest example.
    world();
    const heavy = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 40);
    heavy.name = 'Heavy';
    stars.push(heavy);
    bumpWorldGeneration();
    bindRoles({ heavy: { name: 'Heavy' } }, { modelOwned: ['heavy'] });
    check_stellar_collapse();
    expect(stars).toContain(heavy);
    expect(bh_list).toHaveLength(0);
  });

  test('and an ordinary one still does', () => {
    world();
    const heavy = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 40);
    heavy.name = 'Heavy';
    stars.push(heavy);
    bumpWorldGeneration();
    check_stellar_collapse();
    expect(stars).not.toContain(heavy);
    expect(bh_list.length).toBeGreaterThan(0);
    bh_list.length = 0;
  });
});
