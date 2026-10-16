// =============================================================================
// Scenario identity: ids, the keys they replaced, and what carries them
// -----------------------------------------------------------------------------
// Roadmap II Prompt 63. Every built-in scenario has one lower-case hyphenated
// id; its English name, which was its key until then, is read through a rule
// rather than a table, and these tests hold that rule to every name a link,
// lesson, pack or experiment made before ids can carry (./scenarioLegacyKeys.js).
// =============================================================================

import { describe, test, expect, jest } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LEGACY_SCENARIO_KEYS } from './scenarioLegacyKeys.js';
import {
  SCENARIO_IDS,
  applyPreset,
  resetPresetMemory,
  scenarioId as engineId,
} from '../js/scenarios.js';
import { SCENARIO_INFO, scenarioId } from '../js/data/scenarioInfo.js';
import { EN } from '../js/i18n/en.js';
import { ES } from '../js/i18n/es.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import {
  LINK_PRECISION,
  LINK_VERSION,
  buildPayload,
  decodePayload,
  encodeTagged,
  linkNumber,
  packBody,
} from '../js/shareState.js';
import {
  blankPack,
  checkPack,
  compileScenarioPack,
  packBodies,
} from '../js/scenarioPack.js';
import { readExtras, withExtras } from '../js/experiments/canonicalState.js';
import { SWEEPABLE, parameterFor, sweepLab } from '../js/experiments/sweep.js';
import { validateExperiment } from '../js/experiments/experimentManifest.js';
import { packApi } from '../js/composer/api.js';
import { validateInvestigationPack } from '../js/platform/investigation.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';
import { courseApi } from '../js/course/api.js';
import { validateCoursePack } from '../js/course/pack.js';
import { INTRO_ASTRONOMY } from '../js/data/courses/intro-astronomy.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clone = v => JSON.parse(JSON.stringify(v));
const PUBLIC_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('one id per built-in scenario', () => {
  test('the preset table and the catalog name the same scenarios', () => {
    expect([...SCENARIO_IDS].sort()).toEqual(Object.keys(SCENARIO_INFO).sort());
    expect(SCENARIO_IDS).toHaveLength(LEGACY_SCENARIO_KEYS.length);
  });

  test('each id is lower-case and hyphenated, and its capture is on disk', () => {
    for (const id of SCENARIO_IDS) {
      expect({ id, ok: PUBLIC_ID.test(id) }).toEqual({ id, ok: true });
      expect(SCENARIO_INFO[id].thumbnail).toBe(`images/scenarios/${id}.webp`);
      expect(existsSync(path.join(REPO, SCENARIO_INFO[id].thumbnail))).toBe(
        true
      );
    }
  });

  test('a title is a translation of the id, in both languages', () => {
    for (const id of SCENARIO_IDS) {
      for (const catalog of [EN, ES]) {
        expect(typeof catalog[`scenario.${id}.title`]).toBe('string');
        expect(typeof catalog[`scenario.${id}.summary`]).toBe('string');
      }
    }
    // And no catalog keys a scenario by its old name.
    for (const [name] of LEGACY_SCENARIO_KEYS) {
      if (PUBLIC_ID.test(name)) continue;
      expect(`scenario.${name}.title` in EN).toBe(false);
      expect(`scenario.${name}.title` in ES).toBe(false);
    }
  });
});

describe('the schema says the same', () => {
  test('sdk/schemas/scenario-id-1 lists every id, then every old name', () => {
    const schema = JSON.parse(
      readFileSync(
        path.join(REPO, 'sdk/schemas/scenario-id-1.schema.json'),
        'utf8'
      )
    );
    const [byId, byName] = schema.anyOf;
    expect(byId.enum).toEqual(Object.keys(SCENARIO_INFO));
    expect(byName.enum).toEqual(LEGACY_SCENARIO_KEYS.map(([name]) => name));
  });
});

describe('the keys they replaced', () => {
  test.each(LEGACY_SCENARIO_KEYS)('%s reads as %s, both ways', (name, id) => {
    expect(engineId(name)).toBe(id);
    expect(scenarioId(name)).toBe(id);
    expect(engineId(id)).toBe(id);
    expect(scenarioId(id)).toBe(id);
  });

  test('nothing else names a scenario', () => {
    for (const key of [
      'None',
      'none',
      '',
      'nope',
      'Solar Systems',
      'constructor',
      'toString',
      '__proto__',
      null,
      undefined,
      42,
    ]) {
      expect({ key, engine: engineId(key), info: scenarioId(key) }).toEqual({
        key,
        engine: null,
        info: null,
      });
    }
  });

  test('a preset stamps the same settings by its name as by its id', () => {
    for (const [name, id] of LEGACY_SCENARIO_KEYS) {
      const stamp = key => {
        resetPresetMemory();
        const s = clone(DEFAULT_SETTINGS);
        s.preset_scenario = key;
        applyPreset(s, DEFAULT_SETTINGS, { zoom: 1, pan: { x: 0, y: 0 } });
        return JSON.stringify(s);
      };
      expect({ name, same: stamp(name) === stamp(id) }).toEqual({
        name,
        same: true,
      });
    }
  });

  test('a key that names nothing builds the defaults, and says so', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      resetPresetMemory();
      const s = clone(DEFAULT_SETTINGS);
      s.preset_scenario = 'Solar Systems';
      applyPreset(s, DEFAULT_SETTINGS, { zoom: 1, pan: { x: 0, y: 0 } });
      expect(warn).toHaveBeenCalledWith('Unknown scenario: Solar Systems');
      expect({ ...s, preset_scenario: 'x' }).toEqual({
        ...DEFAULT_SETTINGS,
        preset_scenario: 'x',
      });
    } finally {
      warn.mockRestore();
    }
  });

  test('a laboratory variable carries across a rebuild by name or by id', () => {
    resetPresetMemory();
    const s = clone(DEFAULT_SETTINGS);
    s.preset_scenario = 'Binary Planet Lab';
    applyPreset(s, DEFAULT_SETTINGS, {});
    s.binary_lab_planet_a = 0.3;
    s.preset_scenario = 'binary-planet-lab';
    applyPreset(s, DEFAULT_SETTINGS, {});
    expect(s.binary_lab_planet_a).toBe(0.3);
  });
});

describe('share links', () => {
  const v1 = s =>
    encodeTagged('', 1, { v: 1, s, seed: '9ix', d: { sim_speed: 2 } });

  test.each(LEGACY_SCENARIO_KEYS)(
    'a version-1 link naming %s opens %s',
    async (name, id) => {
      const payload = await decodePayload(await v1(name));
      expect(payload.s).toBe(id);
      expect(payload.d).toEqual({ sim_speed: 2 });
    }
  );

  test('a link is written at version 2, naming the scenario by id', () => {
    expect(LINK_VERSION).toBe(2);
    for (const scenario of ['Solar System', 'solar-system']) {
      const p = buildPayload({
        scenario,
        seed: 7,
        settings: clone(DEFAULT_SETTINGS),
        DEFAULT_SETTINGS,
      });
      expect(p).toMatchObject({ v: 2, s: 'solar-system' });
    }
  });

  test('a hand-built world is still None', async () => {
    const payload = await decodePayload(await v1('None'));
    expect(payload.s).toBe('None');
  });

  test('a scenario this build does not have is refused, in words', async () => {
    await expect(decodePayload(await v1('Solar Systems'))).rejects.toThrow(
      /names a scenario this version of Gravitas does not have/
    );
  });
});

describe('one precision for the numbers a world is written down in', () => {
  test('twelve significant figures, in the share trimmer and the pack compiler', () => {
    expect(LINK_PRECISION).toBe(12);
    const x = 1 / 3;
    expect(linkNumber(x)).toBe(0.333333333333);
    const shared = packBody({
      type: 'Planet',
      pos: { x, y: 2 / 3 },
      vel: { x: 1 / 7, y: 0 },
      mass: Math.PI,
    });
    expect(shared.pos.x).toBe(linkNumber(x));
    expect(shared.mass).toBe(linkNumber(Math.PI));

    const pack = blankPack(1);
    pack.bodies = [{ type: 'Planet', mass: 1, x, y: 0, vx: 0, vy: 1 / 7 }];
    const [body] = packBodies(pack).bodies;
    expect(body.pos.x).toBe(shared.pos.x);
    expect(body.vel.y).toBe(shared.vel.x);
  });

  test('a pack world shared again carries the numbers the pack does', () => {
    const pack = blankPack(1);
    pack.bodies = [
      { type: 'Star', mass: 1, x: 0, y: 0, vx: 0, vy: 0 },
      { type: 'Planet', mass: 1, x: 100 / 3, y: 0, vx: 0, vy: 0.2449489742783 },
    ];
    for (const b of packBodies(pack).bodies) {
      const again = packBody(b);
      expect(again.pos).toEqual(b.pos);
      expect(again.vel).toEqual(b.vel);
      expect(again.mass).toBe(b.mass);
    }
  });
});

describe('a pack carries its identity, and may name a built-in', () => {
  const good = () => {
    const p = blankPack(42);
    p.id = 'three-planets';
    p.title = { en: 'Three planets', es: 'Tres planetas' };
    p.summary = { en: 'On circular orbits.', es: 'En órbitas circulares.' };
    p.settings = { num_planets: 3, placement: 'Circular' };
    return p;
  };

  test('its link says which pack, and the extras read it back', () => {
    const payload = compileScenarioPack(good());
    expect(payload.x.pack).toEqual({ id: 'three-planets', version: '1.0.0' });
    expect(readExtras(payload).pack).toEqual({
      id: 'three-planets',
      version: '1.0.0',
    });
    // A world no pack built has none, which is every link before this.
    expect(readExtras({ v: 1, s: 'solar-system' }).pack).toBeNull();
    // And a link made of the world again carries it on.
    const x = withExtras({}, { pack: readExtras(payload).pack }).x;
    expect(x.pack).toEqual({ id: 'three-planets', version: '1.0.0' });
    expect(withExtras({}, { pack: { id: 3 } }).x.pack).toBeUndefined();
  });

  test('a built-in to start from is named by its id, and builds that world', () => {
    const p = good();
    p.scenario = 'binary-pair';
    expect(checkPack(p)).toEqual([]);
    expect(compileScenarioPack(p).s).toBe('binary-pair');
    // Its old name is not an id, and a pack is new enough to use one.
    p.scenario = 'Binary Pair';
    expect(checkPack(p).map(e => `${e.path}:${e.code}`)).toEqual([
      'scenario:scenario',
    ]);
    // A built-in's bodies are its own, so a pack that names one brings none.
    p.scenario = 'binary-pair';
    p.settings = { num_planets: 0, num_stars: 0, num_black_holes: 0 };
    p.bodies = [{ type: 'Star', mass: 1, x: 0, y: 0, vx: 0, vy: 0 }];
    expect(checkPack(p).map(e => `${e.path}:${e.code}`)).toContain(
      'scenario:scenario'
    );
  });
});

describe('files made before ids still read', () => {
  test('an investigation pack naming a scenario in English', () => {
    const pack = clone(EXAMPLE_INVESTIGATION);
    pack.thumbnail = 'Solar System';
    for (const step of pack.steps) {
      if (step.setup) step.setup.scenario = 'Solar System';
    }
    const scenarioErrors = validateInvestigationPack(pack, packApi()).filter(
      e => e.code === 'scenario'
    );
    expect(scenarioErrors).toEqual([]);
    pack.thumbnail = 'Solar Systems';
    expect(
      validateInvestigationPack(pack, packApi()).map(e => e.path)
    ).toContain('thumbnail');
  });

  test('a course pack naming a scenario in English', () => {
    const pack = clone(INTRO_ASTRONOMY);
    const items = JSON.stringify(pack).includes('"kind":"scenario"');
    expect(items).toBe(true);
    const rename = v => {
      if (Array.isArray(v)) v.forEach(rename);
      else if (v && typeof v === 'object') {
        if (v.kind === 'scenario') v.scenario = 'Solar System';
        Object.values(v).forEach(rename);
      }
    };
    rename(pack);
    const problems = validateCoursePack(pack, courseApi()).filter(
      e => e.code === 'scenario'
    );
    expect(problems).toEqual([]);
  });

  test('a sweep or an experiment naming its laboratory in English', () => {
    for (const id of Object.keys(SWEEPABLE)) {
      const [name] = LEGACY_SCENARIO_KEYS.find(([, i]) => i === id);
      expect(sweepLab(name)).toBe(SWEEPABLE[id]);
      expect(parameterFor(name, SWEEPABLE[id].parameters[0].key)).toBe(
        SWEEPABLE[id].parameters[0]
      );
    }
    expect(sweepLab('Solar System')).toBeNull();
    expect(sweepLab('constructor')).toBeNull();
    const manifest = {
      format: 'gravitas.experiment',
      formatVersion: 1,
      title: 'Before ids',
      model: { scenario: 'Binary Planet Lab' },
    };
    const paths = validateExperiment(manifest).map(p => p.path);
    expect(paths).not.toContain('model.scenario');
  });
});
