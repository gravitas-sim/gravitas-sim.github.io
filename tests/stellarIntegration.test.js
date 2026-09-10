// =============================================================================
// The shared stellar model, as the rest of the application meets it
// -----------------------------------------------------------------------------
// The model's own arithmetic is checked in tests/stellarModel.test.js. This is
// the integration: that a star's temperature reaches the colour it is drawn in,
// that a colour a scenario chose survives, that the three panels which used to
// disagree about how big a star is now agree, and that none of it moved
// anything the physics depends on.
//
// The three defects this file exists to keep fixed, all found by audit:
//
//   The constructor filled in baseColor from the mass, so a star that carried
//   a measured temperature was drawn as though it did not - and there was no
//   way to tell an authored colour from a generated one.
//
//   The colour memo was keyed on mass and colour, so changing a temperature at
//   fixed mass changed nothing on screen.
//
//   Three modules each had their own mass-radius or mass-temperature relation,
//   and TRAPPIST-1 was drawn with a habitable zone from its measured 2566 K
//   beside an inspector card claiming 3350 K.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  StarObject,
  stars,
  setStateReference,
  SOLAR_MASS_UNIT,
} from '../js/physics.js';
import { clearVisualCaches, starColor } from '../js/bodyVisuals.js';
import { stellarPropertiesFor } from '../js/habitability.js';
import { stellarStateFor } from '../js/stellar/state.js';
import { radiusFromLuminosityAndTemperature } from '../js/stellar/geometry.js';
import { packBody } from '../js/shareState.js';

/** A 2D context that records what it was asked to paint. */
function recorder() {
  const calls = [];
  const log = (name, args) => calls.push({ name, args });
  const gradient = { addColorStop: () => {} };
  const handler = {
    get(target, prop) {
      if (prop === 'calls') return calls;
      if (prop in target) return target[prop];
      if (typeof prop !== 'string') return undefined;
      if (/^create(Linear|Radial|Conic)Gradient$/.test(prop))
        return () => gradient;
      if (prop === 'measureText') return () => ({ width: 10 });
      return (...args) => log(prop, args);
    },
    set(target, prop, value) {
      target[prop] = value;
      log(`set:${prop}`, [value]);
      return true;
    },
  };
  return new Proxy({ globalAlpha: 1, lineWidth: 1 }, handler);
}

/** Every fill colour a draw asked for, in order. */
const fills = ctx =>
  ctx.calls.filter(c => c.name === 'set:fillStyle').map(c => c.args[0]);

const view = { paused: true, zoom: 1, pan: { x: 0, y: 0 }, frame_count: 0 };

beforeEach(() => {
  setStateReference(view);
  view.zoom = 1;
  stars.length = 0;
  clearVisualCaches();
});

/** A star at the origin, with whatever modelling the test wants. */
function star(massInSuns, extra = {}) {
  const s = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, massInSuns);
  Object.assign(s, extra);
  s._visual = null;
  return s;
}

describe('a generated star has no colour of its own', () => {
  test('the constructor leaves baseColor null', () => {
    expect(star(1).baseColor).toBe(null);
  });

  test('so an authored colour is distinguishable from a generated one', () => {
    const plain = star(1);
    const authored = star(1, { baseColor: '#ff00ff' });
    expect(plain.baseColor).toBe(null);
    expect(authored.baseColor).toBe('#ff00ff');
  });

  test('and the modelled fields start empty rather than guessed', () => {
    const s = star(1);
    for (const key of [
      'temperature',
      'luminosityInSuns',
      'radiusInSuns',
      'spectralType',
      'stellarPhase',
      'ageYr',
    ]) {
      expect(s[key]).toBe(null);
    }
    expect(s.initialMassInSuns).toBe(1);
  });
});

describe('temperature reaches the screen', () => {
  test('a star with no authored colour is drawn in its temperature colour', () => {
    const s = star(1);
    s.draw(recorder());
    expect(s._visual.rgb).toEqual(
      starColor(stellarPropertiesFor(s, SOLAR_MASS_UNIT).teffK)
    );
  });

  test('and that colour is what reaches the canvas at point size', () => {
    // Zoomed out far enough to be a dot, where the colour is a fillStyle rather
    // than a cached sprite - so this checks the path to the pixels and the one
    // above checks the decision.
    view.zoom = 0.05;
    const s = star(1);
    const ctx = recorder();
    s.draw(ctx);
    const { r, g, b } = starColor(
      stellarPropertiesFor(s, SOLAR_MASS_UNIT).teffK
    );
    expect(fills(ctx)).toContain(`rgb(${r},${g},${b})`);
    view.zoom = 1;
  });

  test('changing the temperature changes the colour, with the mass untouched', () => {
    // The defect this replaces: the memo was keyed on mass and colour, so a
    // star whose temperature changed and whose mass did not kept the colour it
    // was first drawn with - which is every star on an evolutionary track.
    const s = star(1);
    s.draw(recorder());
    const before = s._visual.rgb;
    const massBefore = s.mass;

    s.temperature = 3200;
    s.draw(recorder());
    const after = s._visual.rgb;

    expect(s.mass).toBe(massBefore);
    expect(after).not.toEqual(before);
    expect(after).toEqual(starColor(3200));
    // Cooler, so redder: not just different, different in the right direction.
    expect(after.b).toBeLessThan(before.b);
  });

  test('a hotter star is drawn bluer than a cooler one at the same mass', () => {
    const cool = star(1, { temperature: 3000 });
    const hot = star(1, { temperature: 20000 });
    cool.draw(recorder());
    hot.draw(recorder());
    expect(hot._visual.rgb.b / hot._visual.rgb.r).toBeGreaterThan(
      cool._visual.rgb.b / cool._visual.rgb.r
    );
  });

  test('an authored colour wins over the temperature', () => {
    const s = star(1, { baseColor: '#ff00ff', temperature: 20000 });
    s.draw(recorder());
    expect(s._visual.rgb).toEqual({ r: 255, g: 0, b: 255 });
  });

  test('a declared luminosity also invalidates the memo', () => {
    const s = star(1);
    s.draw(recorder());
    const before = s._visual.rgb;
    s.luminosityInSuns = 2400;
    s.temperature = 3070;
    s.draw(recorder());
    expect(s._visual.rgb).not.toEqual(before);
  });
});

describe('the panels agree about the same star', () => {
  const trappist = () =>
    star(0.0898, {
      temperature: 2566,
      luminosityInSuns: 0.000553,
      radiusInSuns: 0.1192,
    });

  test('the habitability adapter and the shared state report one temperature', () => {
    const s = trappist();
    expect(stellarPropertiesFor(s, SOLAR_MASS_UNIT).teffK).toBe(2566);
    expect(stellarStateFor(s, SOLAR_MASS_UNIT).teffK).toBe(2566);
  });

  test('the adapter reports the radius too, and it is the declared one', () => {
    const s = trappist();
    expect(stellarPropertiesFor(s, SOLAR_MASS_UNIT).radiusSolar).toBe(0.1192);
  });

  test('a star with no declared radius gets the derived one everywhere', () => {
    const s = star(2);
    const state = stellarStateFor(s, SOLAR_MASS_UNIT);
    expect(state.radiusSun).toBeCloseTo(
      radiusFromLuminosityAndTemperature(state.luminositySun, state.teffK),
      12
    );
    expect(stellarPropertiesFor(s, SOLAR_MASS_UNIT).radiusSolar).toBeCloseTo(
      state.radiusSun,
      12
    );
  });

  test('a measured star is not marked as estimated, and a generated one is', () => {
    expect(stellarStateFor(trappist(), SOLAR_MASS_UNIT).estimated).toBe(false);
    expect(stellarStateFor(star(1), SOLAR_MASS_UNIT).estimated).toBe(true);
  });
});

describe('nothing about the physics moved', () => {
  test('the simulation radius is still the mass power law it always was', () => {
    // The photospheric radius is a different number in different units, and
    // adding it must not have touched the one collisions use.
    for (const m of [0.5, 1, 5]) {
      expect(star(m).radius).toBeCloseTo(10 * m ** 0.85, 9);
    }
  });

  test('the simulation mass is the solar mass times the unit', () => {
    expect(star(3).mass).toBeCloseTo(3 * SOLAR_MASS_UNIT, 9);
  });

  test('declaring a temperature changes neither mass nor simulation radius', () => {
    const before = star(1);
    const after = star(1, { temperature: 3000, luminosityInSuns: 2400 });
    expect(after.mass).toBe(before.mass);
    expect(after.radius).toBe(before.radius);
  });

  test('the photospheric radius and the simulation radius are unrelated numbers', () => {
    const s = star(1, { temperature: 3070, luminosityInSuns: 2386 });
    const state = stellarStateFor(s, SOLAR_MASS_UNIT);
    expect(state.radiusSun).toBeGreaterThan(100);
    expect(s.radius).toBeLessThan(20);
  });
});

describe('saving and restoring a star', () => {
  test('the modelled fields survive a state round trip', () => {
    const s = star(1, {
      temperature: 3070,
      luminosityInSuns: 2386,
      radiusInSuns: 173,
      spectralType: 'M',
      stellarPhase: 'red-giant-branch',
      ageYr: 1.13e10,
    });
    const restored = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    restored.set_state(s.get_state());
    expect(restored.temperature).toBe(3070);
    expect(restored.luminosityInSuns).toBe(2386);
    expect(restored.radiusInSuns).toBe(173);
    expect(restored.stellarPhase).toBe('red-giant-branch');
    expect(restored.ageYr).toBe(1.13e10);
    expect(stellarStateFor(restored, SOLAR_MASS_UNIT).estimated).toBe(false);
  });

  test('a generated colour does not come back as an authored one', () => {
    const s = star(1);
    const restored = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    restored.set_state(s.get_state());
    expect(restored.baseColor).toBe(null);
  });

  test('an authored colour does come back', () => {
    const s = star(1, { baseColor: '#123456' });
    const restored = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    restored.set_state(s.get_state());
    expect(restored.baseColor).toBe('#123456');
  });

  test('a state written before these fields existed restores with nulls', () => {
    const old = {
      type: 'StarObject',
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      mass: SOLAR_MASS_UNIT,
      radius: 10,
      massInSuns: 1,
      baseColor: '#ffff00',
    };
    const restored = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    restored.set_state(old);
    expect(restored.temperature).toBe(null);
    expect(restored.luminosityInSuns).toBe(null);
    expect(restored.stellarPhase).toBe(null);
    expect(restored.baseColor).toBe('#ffff00');
    expect(restored.initialMassInSuns).toBe(1);
    // ...and it still describes: everything is estimated, and it says so.
    expect(stellarStateFor(restored, SOLAR_MASS_UNIT).estimated).toBe(true);
  });

  test('a share link carries the modelled fields and drops the empty ones', () => {
    const measured = packBody(
      star(1, { temperature: 3070, luminosityInSuns: 2386 }).get_state()
    );
    expect(measured.temperature).toBe(3070);
    expect(measured.luminosityInSuns).toBe(2386);
    expect('radiusInSuns' in measured).toBe(false);

    const plain = packBody(star(1).get_state());
    for (const key of [
      'temperature',
      'luminosityInSuns',
      'radiusInSuns',
      'spectralType',
      'stellarPhase',
      'ageYr',
      'baseColor',
    ]) {
      expect(key in plain).toBe(false);
    }
  });
});
