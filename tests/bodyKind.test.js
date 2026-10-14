// What a body's kind is, and what the readers say about an object that is not
// a body (Prompt 107, step 2b, review follow-ups on slice 1).
//
// The readers used to ask `constructor.name`, which is 'Object' for a literal.
// They now ask `kind`, which only the body classes carry, so a stand-in literal
// (a test double, a lesson's matcher input, a saved record) must still get an
// answer that is defined: 'Object' unless it states a string kind or an
// obj_type, never undefined, a function or a thrown error.

import { describe, test, expect } from '@jest/globals';
import {
  Planet,
  GasGiant,
  Asteroid,
  Comet,
  Debris,
  StarObject,
  NeutronStar,
  WhiteDwarf,
  Galaxy,
  BlackHole,
  AccretionDiskParticle,
  className,
} from '../js/physics.js';
import { kindOf } from '../js/lesson/binding.js';

const at = { x: 0, y: 0 };

describe('className and kindOf on plain objects', () => {
  test('a literal with nothing is an Object, as its constructor name said', () => {
    expect(className({})).toBe('Object');
    expect(kindOf({})).toBe('Object');
  });

  test('null and undefined are defined too', () => {
    expect(className(null)).toBe('');
    expect(className(undefined)).toBe('');
    expect(kindOf(null)).toBeNull();
    expect(kindOf(undefined)).toBeNull();
  });

  test('a literal that states a string kind is believed; anything else is not', () => {
    expect(className({ kind: 'Planet' })).toBe('Planet');
    expect(kindOf({ kind: 'Planet' })).toBe('Planet');
    for (const bad of [5, true, {}, () => 'Planet', '', null]) {
      expect(className({ kind: bad })).toBe('Object');
      expect(kindOf({ kind: bad })).toBe('Object');
    }
  });

  test('obj_type still wins in kindOf, and the star keeps its short name', () => {
    expect(kindOf({ obj_type: 'GasGiant', kind: 'Planet' })).toBe('GasGiant');
    expect(kindOf({ obj_type: 'StarObject' })).toBe('Star');
    expect(kindOf({ kind: 'StarObject' })).toBe('Star');
  });

  test('every body class answers with its own name', () => {
    const bodies = {
      Planet: new Planet(at, at),
      GasGiant: new GasGiant(at, at),
      Asteroid: new Asteroid(at, at),
      Comet: new Comet(at, at),
      Debris: new Debris(at, at),
      StarObject: new StarObject(at, at),
      NeutronStar: new NeutronStar(at, at),
      WhiteDwarf: new WhiteDwarf(at, at),
      Galaxy: new Galaxy(at, at),
      BlackHole: new BlackHole(at, 10),
    };
    for (const [name, body] of Object.entries(bodies)) {
      expect(body.kind).toBe(name);
      expect(className(body)).toBe(name);
    }
    expect(AccretionDiskParticle.kind).toBe('AccretionDiskParticle');
  });
});

describe('the kind setter', () => {
  test('drops the write: a saved kind cannot change what a body is', () => {
    const p = new Planet(at, at);
    p.kind = 'BlackHole';
    expect(p.kind).toBe('Planet');
    p.set_state({ kind: 'Comet', mass: p.mass });
    expect(p.kind).toBe('Planet');
    const bh = new BlackHole(at, 10);
    bh.kind = 'Planet';
    expect(bh.kind).toBe('BlackHole');
  });

  test('is not state: not an own property, not in get_state', () => {
    const p = new Planet(at, at);
    p.kind = 'Comet';
    expect(Object.keys(p)).not.toContain('kind');
    expect(Object.keys(p.get_state())).not.toContain('kind');
  });
});
