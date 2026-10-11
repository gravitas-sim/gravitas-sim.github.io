/* global btoa, CompressionStream */
// =============================================================================
// A scenario pack's 3-D system (Roadmap II Prompt 105, js/scenarioPack3d.js)
// -----------------------------------------------------------------------------
// A pack may carry a `system3d`: the 3-D lab's own file, beside the world the
// pack makes in the Sandbox. The claims, each held against the artifact it is
// about and not against this module's own arithmetic:
//
//   - the block is validated with the pack: its shape always, the lab's own
//     checks when they are supplied, and the SDK supplies them;
//   - a pack made from a 3-D file, or from a 2-D Orbital System Builder file
//     (which migrates as LAB3D.md specifies), survives a save and a read;
//   - the link that opens it carries the system's numbers exactly, in both
//     encodings, and the pack's identity as the system's provenance;
//   - a link cannot be a bomb, a longer-than-a-link system is refused in a
//     word, and a damaged link is said to be damaged.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { valid } from './jsonSchemaSubset.js';
import { checkPack } from '../sdk/lib/scenario.mjs';
import { validateScenarioPack } from '../js/platform/scenario.js';
import { scenarioApi } from '../js/scenarioPack.js';
import {
  checkSystem3d,
  labLink,
  packFromSystem3d,
} from '../js/scenarioPack3d.js';
import {
  isSystemFragment,
  readSystemFragment,
  systemFragment,
  MAX_LINK_CHARS,
} from '../js/lab3d/link.js';
import { REFERENCES } from '../js/lab3d/references.js';
import { migrateSystem, validateSystem } from '../js/lab3d/state.js';
import { systemDigest } from '../js/lab3d/evidence.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(
  readFileSync(path.join(REPO, 'sdk/schemas/scenario-pack-1.schema.json'))
);
const reference = id => REFERENCES.find(r => r.id === id).make().system;
const clone = o => JSON.parse(JSON.stringify(o));

const builderFile = {
  format: 'gravitas.orbital-system',
  version: 1,
  bodies: [{ name: 'Sun' }, { name: 'Earth' }],
  initial: {
    G: 2,
    bodies: [
      { x: 0, y: 0, vx: 0, vy: 0, mass: 1000 },
      { x: 100, y: 0, vx: 0, vy: 4.47, mass: 1 },
    ],
  },
};

/** A pack that needs only its words to be valid. */
const named = pack => ({
  ...pack,
  title: { en: 'A star and two planets', es: 'Una estrella y dos planetas' },
  summary: {
    en: 'The three-body problem, in three dimensions.',
    es: 'El problema de tres cuerpos, en tres dimensiones.',
  },
});

describe('the block is validated with the pack', () => {
  const made = () => named(packFromSystem3d(reference('R3')).pack);

  test('a pack with a good 3-D system is valid, by the shape and by the lab', () => {
    const pack = made();
    expect(validateScenarioPack(pack, scenarioApi())).toEqual([]);
    expect(checkPack(pack)).toEqual([]);
    expect(checkSystem3d(pack)).toEqual([]);
    expect(valid(schema, pack)).toBe(true);
  });

  test.each([
    ['not an object', p => (p.system3d = 'a system'), 'system3d', 'notSystem'],
    [
      'another format',
      p => (p.system3d.format = 'gravitas.x'),
      'system3d.format',
      'format',
    ],
    ['units', p => (p.system3d.units = 'furlongs'), 'system3d.units', 'units'],
    ['one body', p => p.system3d.bodies.splice(1), 'system3d.bodies', 'bodies'],
    [
      'a vector of two',
      p => (p.system3d.bodies[1].x = [1, 2]),
      'system3d.bodies[1].x',
      'vector',
    ],
    [
      'a negative mass',
      p => (p.system3d.bodies[1].m = -1),
      'system3d.bodies[1].m',
      'mass',
    ],
  ])('%s is refused on its own field', (_n, mutate, at, why) => {
    const pack = made();
    mutate(pack);
    const errors = validateScenarioPack(pack, scenarioApi());
    expect(errors.map(e => [e.path, e.vars.why])).toEqual([[at, why]]);
    expect(valid(schema, pack)).toBe(false);
  });

  test('the SDK also applies the lab’s own checks: two bodies in one place', () => {
    const pack = made();
    pack.system3d.bodies[1].x = [...pack.system3d.bodies[0].x];
    // The shape alone cannot know; the lab can.
    expect(validateScenarioPack(pack, scenarioApi())).toEqual([]);
    expect(checkPack(pack).map(e => e.vars.why)).toContain('coincident');
    expect(checkSystem3d(pack).map(e => e.code)).toContain('coincident');
  });

  test('a pack without the block is exactly what it was', () => {
    const pack = made();
    delete pack.system3d;
    expect(checkPack(pack)).toEqual([]);
  });
});

describe('a pack from a file', () => {
  test('a 3-D system file becomes a pack carrying it, unchanged', () => {
    const system = reference('R1');
    const r = packFromSystem3d(system);
    expect(r.ok).toBe(true);
    expect(r.migrated).toBe(false);
    expect(r.pack.system3d).toEqual(system);
    // The same numbers make the same pack.
    expect(packFromSystem3d(clone(system)).pack.seed).toBe(r.pack.seed);
    expect(packFromSystem3d(reference('R3')).pack.seed).not.toBe(r.pack.seed);
  });

  test('a 2-D Orbital System Builder file migrates as LAB3D.md specifies', () => {
    const r = packFromSystem3d(builderFile);
    expect(r.ok).toBe(true);
    expect(r.migrated).toBe(true);
    // Its recorded numbers, in the plane z = 0, with the file's G folded into
    // the masses: the same system the lab opens the file as.
    expect(r.pack.system3d).toEqual(migrateSystem(builderFile).system);
    expect(r.pack.system3d.bodies[1]).toMatchObject({
      m: 2,
      x: [100, 0, 0],
      v: [0, 4.47, 0],
    });
    expect(r.pack.system3d.provenance.from).toBe('gravitas.orbital-system/1');
    expect(checkPack(named(r.pack))).toEqual([]);
  });

  test('a file the lab refuses is refused in the lab’s own word', () => {
    expect(packFromSystem3d({ format: 'nothing' })).toEqual({
      ok: false,
      code: 'notSystem',
    });
    expect(packFromSystem3d({ ...builderFile, version: 3 }).code).toBe('newer');
    const bad = reference('R1');
    bad.bodies[1].m = -1;
    expect(packFromSystem3d(bad)).toMatchObject({ ok: false, code: 'mass' });
  });

  test('a pack survives a save and a read, as JSON', () => {
    const pack = named(packFromSystem3d(reference('R6')).pack);
    const back = JSON.parse(JSON.stringify(pack));
    expect(back).toEqual(pack);
    expect(checkPack(back)).toEqual([]);
    expect(systemDigest(back.system3d)).toBe(systemDigest(reference('R6')));
  });
});

describe('the link that opens it', () => {
  test.each(['R1', 'R3', 'R5', 'R8'])(
    '%s comes back from its link exactly, whichever encoding',
    async id => {
      const system = reference(id);
      const made = await systemFragment(system);
      expect(made.ok).toBe(true);
      expect(made.fragment).toMatch(/^sys1[zr][A-Za-z0-9_-]+$/);
      expect(isSystemFragment(made.fragment)).toBe(true);
      const back = await readSystemFragment(`#${made.fragment}`);
      expect(back.ok).toBe(true);
      expect(back.system).toEqual(system);
      expect(validateSystem(back.system)).toEqual([]);
    }
  );

  test('the uncompressed form reads too, where deflate is missing', async () => {
    const system = reference('R1');
    const raw = btoa(JSON.stringify(system))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const back = await readSystemFragment(`sys1r${raw}`);
    expect(back.system).toEqual(system);
  });

  test('a pack’s link names the pack in the system’s provenance, and opens in the embed', async () => {
    const pack = named(packFromSystem3d(reference('R3')).pack);
    const plain = await labLink(pack, { origin: 'https://example.test' });
    expect(plain.ok).toBe(true);
    expect(plain.href.startsWith('https://example.test/3d/#sys1')).toBe(true);
    const system = (await readSystemFragment(plain.href.split('#')[1])).system;
    expect(system.provenance.from).toBe(
      `scenario-pack ${pack.id} ${pack.version}`
    );
    // The numbers are the pack's, and the digest, which ignores provenance,
    // says so.
    expect(systemDigest(system)).toBe(systemDigest(pack.system3d));
    const embed = await labLink(pack, { embed: true });
    expect(embed.href.startsWith('/3d/?embed=1&ev=1#sys1')).toBe(true);
    expect(await labLink({ ...pack, system3d: undefined })).toEqual({
      ok: false,
      code: 'noSystem3d',
    });
  });

  test('a system too long for a link is refused, and can be handed over as a file', async () => {
    const system = reference('R1');
    // Incompressible text: a link has a length, and this is more than it.
    let seed = 7;
    const noise = Array.from({ length: 12000 }, () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return String.fromCharCode(33 + (seed % 90));
    }).join('');
    system.bodies[0].name = noise;
    const made = await systemFragment(system);
    expect(made).toEqual({ ok: false, code: 'tooLong' });
    expect(MAX_LINK_CHARS).toBe(8000);
  });

  test('a link cannot be a bomb, and a damaged one is said to be damaged', async () => {
    // A megabyte of zeros deflates to about a kilobyte.
    const zeros = new Uint8Array(1024 * 1024);
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(zeros);
    writer.close();
    const parts = [];
    const reader = cs.readable.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(...value);
    }
    const deflated = Uint8Array.from(parts);
    const b64 = btoa(String.fromCharCode(...deflated))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(b64.length).toBeLessThan(MAX_LINK_CHARS);
    expect(await readSystemFragment(`sys1z${b64}`)).toEqual({
      ok: false,
      code: 'tooLong',
    });
    expect((await readSystemFragment('sys1zAAAA')).code).toBe('unreadable');
    expect((await readSystemFragment('#3zabcdef')).code).toBe('notLink');
    expect((await readSystemFragment('sys2zabcdef')).code).toBe('notLink');
    expect((await readSystemFragment(undefined)).code).toBe('notLink');
  });
});
