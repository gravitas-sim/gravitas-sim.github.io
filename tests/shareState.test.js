import { describe, test, expect } from '@jest/globals';
import {
  buildPayload,
  encodePayload,
  decodePayload,
  payloadSeed,
  settingsDelta,
  pristineSettingsFor,
  diffSettings,
  packBody,
  chooseKind,
  shareUrl,
  COMFORTABLE_URL_LENGTH,
} from '../js/shareState.js';

// A stand-in for DEFAULT_SETTINGS: only the keys these tests touch, so the
// suite does not have to track every setting the simulation grows.
const DEFAULTS = {
  preset_scenario: 'Binary BH',
  gravitational_constant: 2.0,
  num_planets: 15,
  sim_speed: 1.0,
  show_trails: true,
  bh_masses: [],
  planet_base_color: '#6495ed',
};

describe('settings deltas', () => {
  test('a scenario at its own defaults produces no delta', () => {
    const pristine = pristineSettingsFor('Binary BH', DEFAULTS);
    expect(settingsDelta(pristine, DEFAULTS, 'Binary BH')).toEqual({});
  });

  test('records only what the author actually changed', () => {
    const settings = pristineSettingsFor('Binary BH', DEFAULTS);
    settings.gravitational_constant = 9.5;
    const delta = settingsDelta(settings, DEFAULTS, 'Binary BH');
    expect(delta).toEqual({ gravitational_constant: 9.5 });
  });

  test('never carries the scenario name, which travels separately', () => {
    const settings = pristineSettingsFor('Star Cluster', DEFAULTS);
    settings.sim_speed = 3;
    expect(
      settingsDelta(settings, DEFAULTS, 'Star Cluster')
    ).not.toHaveProperty('preset_scenario');
  });

  test('compares arrays by value, not identity', () => {
    const settings = pristineSettingsFor('Binary BH', DEFAULTS);
    // A fresh array with identical contents is not a change.
    settings.bh_masses = [...settings.bh_masses];
    expect(settingsDelta(settings, DEFAULTS, 'Binary BH')).toEqual({});
  });

  test('an unknown scenario degrades to the defaults rather than throwing', () => {
    expect(() =>
      pristineSettingsFor('No Such Scenario', DEFAULTS)
    ).not.toThrow();
  });
});

describe('encode and decode', () => {
  const basePayload = () =>
    buildPayload({
      scenario: 'Binary BH',
      seed: 12345,
      settings: pristineSettingsFor('Binary BH', DEFAULTS),
      DEFAULT_SETTINGS: DEFAULTS,
      camera: { zoom: 1.5, pan: { x: -20, y: 40 } },
    });

  test('round-trips a seeded payload', async () => {
    const payload = basePayload();
    const decoded = await decodePayload(await encodePayload(payload));
    expect(decoded.s).toBe('Binary BH');
    expect(payloadSeed(decoded)).toBe(12345);
    expect(decoded.c).toEqual([1.5, -20, 40]);
    expect(decoded.b).toBeUndefined();
  });

  test('round-trips settings changes', async () => {
    const settings = pristineSettingsFor('Binary BH', DEFAULTS);
    settings.gravitational_constant = 4.25;
    settings.show_trails = false;
    const payload = buildPayload({
      scenario: 'Binary BH',
      seed: 1,
      settings,
      DEFAULT_SETTINGS: DEFAULTS,
    });
    const decoded = await decodePayload(await encodePayload(payload));
    expect(decoded.d.gravitational_constant).toBe(4.25);
    expect(decoded.d.show_trails).toBe(false);
  });

  test('round-trips bodies', async () => {
    const bodies = [
      packBody({
        type: 'Planet',
        pos: { x: 100.5, y: -3.25 },
        vel: { x: 0, y: 12 },
        mass: 5,
        radius: 7,
      }),
      packBody({
        type: 'BlackHole',
        pos: { x: 0, y: 0 },
        vel: { x: 0, y: 0 },
        mass: 500,
      }),
    ];
    const payload = buildPayload({
      scenario: 'Binary BH',
      seed: 3,
      settings: pristineSettingsFor('Binary BH', DEFAULTS),
      DEFAULT_SETTINGS: DEFAULTS,
      bodies,
    });
    const decoded = await decodePayload(await encodePayload(payload));
    expect(decoded.b).toHaveLength(2);
    expect(decoded.b[0].pos).toEqual({ x: 100.5, y: -3.25 });
    expect(decoded.b[1].type).toBe('BlackHole');
  });

  test('a seeded link stays short enough to paste anywhere', async () => {
    const fragment = await encodePayload(basePayload());
    // The whole premise of the seeded kind: it fits in a message.
    expect(fragment.length).toBeLessThan(400);
  });

  test('omits the camera when it was not asked for', async () => {
    const payload = buildPayload({
      scenario: 'Binary BH',
      seed: 1,
      settings: pristineSettingsFor('Binary BH', DEFAULTS),
      DEFAULT_SETTINGS: DEFAULTS,
      camera: null,
    });
    const decoded = await decodePayload(await encodePayload(payload));
    expect(decoded.c).toBeUndefined();
  });

  test('carries the paused flag only when paused', async () => {
    const settings = pristineSettingsFor('Binary BH', DEFAULTS);
    const running = await decodePayload(
      await encodePayload(
        buildPayload({
          scenario: 'Binary BH',
          seed: 1,
          settings,
          DEFAULT_SETTINGS: DEFAULTS,
          paused: false,
        })
      )
    );
    const paused = await decodePayload(
      await encodePayload(
        buildPayload({
          scenario: 'Binary BH',
          seed: 1,
          settings,
          DEFAULT_SETTINGS: DEFAULTS,
          paused: true,
        })
      )
    );
    expect(running.p).toBeUndefined();
    expect(paused.p).toBe(1);
  });

  test('a seed survives as text, including the extremes', async () => {
    for (const seed of [0, 1, 0xffffffff]) {
      const payload = buildPayload({
        scenario: 'Binary BH',
        seed,
        settings: pristineSettingsFor('Binary BH', DEFAULTS),
        DEFAULT_SETTINGS: DEFAULTS,
      });
      const decoded = await decodePayload(await encodePayload(payload));
      expect(payloadSeed(decoded)).toBe(seed >>> 0);
    }
  });

  test('the fragment is URL-safe', async () => {
    const bodies = Array.from({ length: 200 }, (_, i) =>
      packBody({
        type: 'Planet',
        pos: { x: i * 1.7, y: -i * 0.3 },
        vel: { x: i, y: -i },
        mass: i + 1,
      })
    );
    const fragment = await encodePayload(
      buildPayload({
        scenario: 'Star Cluster',
        seed: 9,
        settings: pristineSettingsFor('Star Cluster', DEFAULTS),
        DEFAULT_SETTINGS: DEFAULTS,
        bodies,
      })
    );
    // '+', '/' and '=' would be re-encoded or truncated by chat clients and
    // LMS text fields, which is exactly how a shared link goes silently wrong.
    expect(fragment).toMatch(/^[0-9A-Za-z\-_]+$/);
  });
});

describe('malformed input', () => {
  test('rejects text that is not a Gravitas link', async () => {
    await expect(decodePayload('hello')).rejects.toThrow(
      /does not look like a Gravitas link/
    );
  });

  test('rejects an empty fragment', async () => {
    await expect(decodePayload('')).rejects.toThrow();
  });

  test('a truncated compressed payload gets a readable message', async () => {
    // The stream surfaces this as an opaque 'Failed to fetch'; a shared link
    // cut in half by a mail client is the likeliest real failure and has to
    // say so.
    const bodies = Array.from({ length: 300 }, (_, i) =>
      packBody({
        type: 'Planet',
        pos: { x: i, y: i },
        vel: { x: 1, y: 1 },
        mass: 1,
      })
    );
    const long = await encodePayload(
      buildPayload({
        scenario: 'Star Cluster',
        seed: 1,
        settings: pristineSettingsFor('Star Cluster', DEFAULTS),
        DEFAULT_SETTINGS: DEFAULTS,
        bodies,
      })
    );
    expect(long.startsWith('1z')).toBe(true); // actually compressed
    await expect(
      decodePayload(long.slice(0, long.length - 40))
    ).rejects.toThrow(/incomplete or was cut short/);
  });

  test('rejects a truncated payload', async () => {
    const fragment = await encodePayload(
      buildPayload({
        scenario: 'Binary BH',
        seed: 1,
        settings: pristineSettingsFor('Binary BH', DEFAULTS),
        DEFAULT_SETTINGS: DEFAULTS,
      })
    );
    // Mail clients wrapping a long URL is the likeliest real-world corruption.
    await expect(decodePayload(fragment.slice(0, 20))).rejects.toThrow();
  });

  test('rejects a payload from a newer version', async () => {
    await expect(decodePayload('99rZm9v')).rejects.toThrow(/newer version/);
  });

  test('tolerates a leading hash', async () => {
    const fragment = await encodePayload(
      buildPayload({
        scenario: 'Binary BH',
        seed: 1,
        settings: pristineSettingsFor('Binary BH', DEFAULTS),
        DEFAULT_SETTINGS: DEFAULTS,
      })
    );
    const decoded = await decodePayload(`#${fragment}`);
    expect(decoded.s).toBe('Binary BH');
  });
});

describe('packBody', () => {
  test('keeps the physics and drops per-frame noise', () => {
    const packed = packBody({
      type: 'BlackHole',
      pos: { x: 1, y: 2 },
      vel: { x: 3, y: 4 },
      mass: 500,
      alive: true,
      accretion_intensity: 0.731,
      time_since_last_accretion: 12.5,
    });
    expect(packed.type).toBe('BlackHole');
    expect(packed.mass).toBe(500);
    expect(packed).not.toHaveProperty('accretion_intensity');
    expect(packed).not.toHaveProperty('time_since_last_accretion');
  });

  test('trims float noise without moving anything visible', () => {
    const packed = packBody({
      type: 'Planet',
      pos: { x: 123.40000000000001, y: 0.1 + 0.2 },
      vel: { x: 1, y: 1 },
      mass: 1,
    });
    expect(packed.pos.x).toBe(123.4);
    expect(packed.pos.y).toBe(0.3);
  });

  test('replaces non-finite values rather than emitting invalid JSON', () => {
    const packed = packBody({
      type: 'Planet',
      pos: { x: NaN, y: Infinity },
      vel: { x: 0, y: 0 },
      mass: 1,
    });
    expect(packed.pos.x).toBe(0);
    expect(packed.pos.y).toBe(0);
  });
});

describe('generation-time versus later settings', () => {
  // Regression: some scenarios read settings while generating (Kepler's 2nd
  // Law derives launch velocities from the gravitational constant) and those
  // same settings can also be changed afterwards, applying live. Collapsing
  // both into one set rebuilt a different experiment from the one shared.
  const atBuild = () => {
    const s = pristineSettingsFor("Kepler's 2nd Law", DEFAULTS);
    s.gravitational_constant = 1;
    return s;
  };

  test('a setting changed after the build travels separately', () => {
    const built = atBuild();
    const now = { ...built, gravitational_constant: 8 };
    const payload = buildPayload({
      scenario: "Kepler's 2nd Law",
      seed: 1,
      settings: now,
      generationSettings: built,
      DEFAULT_SETTINGS: DEFAULTS,
    });
    expect(payload.a).toEqual({ gravitational_constant: 8 });
    expect(payload.d?.gravitational_constant).not.toBe(8);
  });

  test('no after-delta when nothing changed since the build', () => {
    const built = atBuild();
    const payload = buildPayload({
      scenario: "Kepler's 2nd Law",
      seed: 1,
      settings: built,
      generationSettings: built,
      DEFAULT_SETTINGS: DEFAULTS,
    });
    expect(payload.a).toBeUndefined();
  });

  test('falls back to the live settings when no build snapshot exists', () => {
    const now = atBuild();
    now.sim_speed = 2.5;
    const payload = buildPayload({
      scenario: "Kepler's 2nd Law",
      seed: 1,
      settings: now,
      DEFAULT_SETTINGS: DEFAULTS,
    });
    expect(payload.a).toBeUndefined();
    expect(payload.d.sim_speed).toBe(2.5);
  });

  test('the split survives a round trip', async () => {
    const built = atBuild();
    const now = { ...built, gravitational_constant: 8, sim_speed: 0.5 };
    const decoded = await decodePayload(
      await encodePayload(
        buildPayload({
          scenario: "Kepler's 2nd Law",
          seed: 1,
          settings: now,
          generationSettings: built,
          DEFAULT_SETTINGS: DEFAULTS,
        })
      )
    );
    expect(decoded.a).toEqual({ gravitational_constant: 8, sim_speed: 0.5 });
  });
});

describe('diffSettings', () => {
  test('reports only what moved', () => {
    expect(diffSettings({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual({ b: 3 });
  });

  test('is empty for identical objects', () => {
    expect(diffSettings({ a: 1 }, { a: 1 })).toEqual({});
  });

  test('never reports the scenario name', () => {
    expect(
      diffSettings({ preset_scenario: 'A' }, { preset_scenario: 'B' })
    ).toEqual({});
  });

  test('tolerates a missing snapshot', () => {
    expect(diffSettings(null, { a: 1 })).toEqual({});
  });
});

describe('chooseKind', () => {
  test('a generated world defaults to the short seeded link', () => {
    expect(chooseKind({ touched: false })).toBe('seeded');
  });

  test('a hand-edited world has to carry its bodies', () => {
    // Nothing a seed produces resembles a world someone has built by hand.
    expect(chooseKind({ touched: true })).toBe('full');
  });

  test('running the simulation does not force the long link', () => {
    // The starting setup is still perfectly shareable while a scenario runs,
    // and that is the case an instructor hits most often.
    expect(chooseKind({ touched: false, elapsed: 300 })).toBe('seeded');
  });
});

describe('shareUrl', () => {
  test('joins a base and a fragment', () => {
    expect(shareUrl('1rABC', 'https://example.org/')).toBe(
      'https://example.org/#1rABC'
    );
  });

  test('exposes a sane length threshold', () => {
    expect(COMFORTABLE_URL_LENGTH).toBeGreaterThan(2000);
  });
});
