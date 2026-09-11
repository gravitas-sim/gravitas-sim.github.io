// =============================================================================
// A lesson has to be able to say which object it means
// -----------------------------------------------------------------------------
// The rules under test are the ones that decide whether two references to a
// body are the same body. They matter because the mechanism they replace does
// not decide: `ctx.find('Eccentric')` is a case-insensitive substring search
// that returns whichever body comes first and never says that two matched.
//
// Every test here is about a case where the honest answer is "no" or "I do not
// know". Getting the right body when there is exactly one is easy; refusing
// when there are two, and refusing when the world has been rebuilt underneath,
// is the whole value.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  BINDING,
  OWNER,
  bindRole,
  bindingAge,
  bindingFor,
  bindingMatches,
  candidatesFor,
  clearRoster,
  createRoster,
  createScope,
  enterScope,
  kindOf,
  leaveScope,
  makeBinding,
  modelOwnedRoles,
  noteProblem,
  resolveMatcher,
  roleOfBody,
  savedValue,
  staleRoles,
} from '../js/lesson/binding.js';

/** A body, as far as these rules are concerned. */
const body = (id, name, obj_type = 'Planet', extra = {}) => ({
  id,
  name,
  obj_type,
  alive: true,
  ...extra,
});

const WORLD = [
  body(0, 'Sun', 'StarObject'),
  body(1, 'Circular Orbiter'),
  body(2, 'Eccentric Orbiter'),
  body(3, 'Eccentric Comet', 'Comet'),
  body(4, 'Mars'),
];

describe('naming one body, exactly', () => {
  test('an exact name finds it', () => {
    expect(resolveMatcher(WORLD, { name: 'Mars' }).body?.id).toBe(4);
  });

  test('case and surrounding space do not matter', () => {
    expect(resolveMatcher(WORLD, { name: '  mars ' }).body?.id).toBe(4);
  });

  test('a substring finds nothing, which is the point', () => {
    // ctx.find('Eccentric') returns the Eccentric Orbiter today. Here it is
    // not a name any body has, so the answer is no body and a reason.
    const out = resolveMatcher(WORLD, { name: 'Eccentric' });
    expect(out.body).toBe(null);
    expect(out.found).toBe(0);
    expect(out.reason).toMatch(/nothing in this world matches/);
  });

  test('two bodies matching is a refusal, not a choice', () => {
    const twins = [...WORLD, body(5, 'Mars')];
    const out = resolveMatcher(twins, { name: 'Mars' });
    expect(out.body).toBe(null);
    expect(out.found).toBe(2);
    expect(out.reason).toMatch(/2 bodies match/);
    expect(out.reason).toMatch(/exactly one/);
  });

  test('and the refusal names what it found, so an author can fix it', () => {
    const twins = [...WORLD, body(5, 'Mars')];
    const { reason } = resolveMatcher(twins, { name: 'Mars' });
    expect(reason).toMatch(/Planet "Mars" #4/);
    expect(reason).toMatch(/Planet "Mars" #5/);
  });

  test('a kind narrows it without any name at all', () => {
    expect(resolveMatcher(WORLD, { kind: 'Comet' }).body?.id).toBe(3);
  });

  test('a kind is exact: Star does not match NeutronStar', () => {
    const world = [body(0, 'A', 'Star'), body(1, 'B', 'NeutronStar')];
    expect(resolveMatcher(world, { kind: 'Star' }).body?.id).toBe(0);
    expect(resolveMatcher(world, { kind: 'NeutronStar' }).body?.id).toBe(1);
  });

  test('an index picks from what is left, in list order', () => {
    expect(resolveMatcher(WORLD, { kind: 'Planet', index: 0 }).body?.id).toBe(
      1
    );
    expect(resolveMatcher(WORLD, { kind: 'Planet', index: 2 }).body?.id).toBe(
      4
    );
    expect(resolveMatcher(WORLD, { kind: 'Planet', index: 9 }).body).toBe(null);
  });

  test('a dead body is not a candidate', () => {
    const world = [body(0, 'Mars', 'Planet', { alive: false })];
    expect(resolveMatcher(world, { name: 'Mars' }).body).toBe(null);
  });

  test('candidatesFor returns all of them, so a caller can count', () => {
    const twins = [...WORLD, body(5, 'Mars')];
    expect(candidatesFor(twins, { name: 'Mars' })).toHaveLength(2);
  });
});

describe('the two vocabularies for a kind', () => {
  test('a star answers to Star, which is what the interface calls it', () => {
    // js/physics.js sets obj_type 'StarObject' on the star class and reports
    // `type: 'Star'` from findObjectAtPosition. An author writes 'Star'.
    expect(kindOf(body(0, 'Sun', 'StarObject'))).toBe('Star');
    expect(resolveMatcher(WORLD, { kind: 'Star' }).body?.id).toBe(0);
  });

  test('everything else is already in one vocabulary', () => {
    expect(kindOf(body(1, 'x', 'Planet'))).toBe('Planet');
    expect(kindOf(body(2, 'x', 'GasGiant'))).toBe('GasGiant');
    expect(kindOf(body(3, 'x', 'Comet'))).toBe('Comet');
  });

  test('a constructor name is the fallback, and null is null', () => {
    class Asteroid {}
    const rock = new Asteroid();
    rock.id = 7;
    expect(kindOf(rock)).toBe('Asteroid');
    expect(kindOf(null)).toBe(null);
  });
});

describe('a binding is only good in the world it was made in', () => {
  const star = WORLD[0];

  test('same world, same id, same kind: bound', () => {
    const b = makeBinding({ role: 'sun', id: 0, generation: 4, kind: 'Star' });
    expect(bindingAge(b, 4)).toBe(BINDING.BOUND);
    expect(bindingMatches(b, star, 4)).toBe(true);
  });

  test('a rebuild makes it stale, however well the id matches', () => {
    // This is the case the whole design turns on. js/physics.js resets the id
    // counter to zero on every rebuild, so id 0 in world 5 is a different
    // object from id 0 in world 4 - and it will very often have the same name.
    const b = makeBinding({ role: 'sun', id: 0, generation: 4, kind: 'Star' });
    expect(bindingAge(b, 5)).toBe(BINDING.STALE);
    expect(bindingMatches(b, star, 5)).toBe(false);
  });

  test('the same id with a different kind does not match', () => {
    const b = makeBinding({ role: 'sun', id: 0, generation: 4, kind: 'Star' });
    expect(bindingMatches(b, body(0, 'Sun', 'Planet'), 4)).toBe(false);
  });

  test('a body that has died does not match', () => {
    const b = makeBinding({ role: 'sun', id: 0, generation: 4, kind: 'Star' });
    const gone = { ...star, alive: false };
    expect(bindingMatches(b, gone, 4)).toBe(false);
  });

  test('nothing bound is its own answer, not a stale one', () => {
    expect(bindingAge(null, 4)).toBe(BINDING.UNBOUND);
  });
});

describe('the roster', () => {
  test('a role resolves to its body and back again', () => {
    const roster = createRoster();
    bindRole(roster, 'sun', WORLD[0], 3);
    expect(bindingFor(roster, 'sun').id).toBe(0);
    expect(roleOfBody(roster, WORLD[0], 3)).toBe('sun');
    expect(roleOfBody(roster, WORLD[4], 3)).toBe(null);
  });

  test('a role in an older world is reported, not silently re-used', () => {
    const roster = createRoster();
    bindRole(roster, 'sun', WORLD[0], 3);
    expect(staleRoles(roster, 3)).toEqual([]);
    expect(staleRoles(roster, 4)).toEqual(['sun']);
    expect(roleOfBody(roster, WORLD[0], 4)).toBe(null);
  });

  test('a problem replaces a binding rather than sitting beside one', () => {
    const roster = createRoster();
    bindRole(roster, 'sun', WORLD[0], 3);
    noteProblem(roster, 'sun', 'two of them');
    expect(bindingFor(roster, 'sun')).toBe(null);
    expect(roster.problems.get('sun')).toBe('two of them');
  });

  test('ownership is recorded per role', () => {
    const roster = createRoster();
    bindRole(roster, 'sun', WORLD[0], 3, OWNER.MODEL);
    bindRole(roster, 'mars', WORLD[4], 3);
    expect(modelOwnedRoles(roster)).toEqual(['sun']);
  });

  test('clearing leaves nothing behind', () => {
    const roster = createRoster();
    bindRole(roster, 'sun', WORLD[0], 3);
    noteProblem(roster, 'mars', 'nope');
    clearRoster(roster);
    expect(bindingFor(roster, 'sun')).toBe(null);
    expect(roster.problems.size).toBe(0);
  });
});

describe('a scope gives back what was there before it', () => {
  test('what goes in comes out', () => {
    const scope = createScope('lesson');
    expect(enterScope(scope, { paused: false, zoom: 1.5 })).toBe(true);
    expect(leaveScope(scope)).toEqual([
      ['paused', false],
      ['zoom', 1.5],
    ]);
  });

  test('entering twice keeps the first answer, not the second', () => {
    // The reason this matters: a lesson enters on its first step and on every
    // step after it. If the second entry won, closing the lesson would restore
    // whatever the lesson itself had set two steps ago.
    const scope = createScope('lesson');
    enterScope(scope, { paused: false });
    expect(enterScope(scope, { paused: true })).toBe(false);
    expect(savedValue(scope, 'paused')).toBe(false);
    expect(leaveScope(scope)).toEqual([['paused', false]]);
  });

  test('a later entry may add a key the first one did not have', () => {
    const scope = createScope('lesson');
    enterScope(scope, { paused: false });
    enterScope(scope, { paused: true, overlay: 'off' });
    expect(Object.fromEntries(leaveScope(scope))).toEqual({
      paused: false,
      overlay: 'off',
    });
  });

  test('leaving twice returns nothing the second time', () => {
    const scope = createScope('lesson');
    enterScope(scope, { paused: false });
    expect(leaveScope(scope)).toHaveLength(1);
    expect(leaveScope(scope)).toEqual([]);
  });

  test('a scope nobody entered has nothing to give back', () => {
    expect(leaveScope(createScope('lesson'))).toEqual([]);
  });
});
