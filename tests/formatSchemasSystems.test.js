// =============================================================================
// The embed messages and the orbital system, each held to its JSON Schema
// -----------------------------------------------------------------------------
// sdk/schemas has a schema for each of these (Roadmap II Prompt 61), held as
// tests/formatSchemas.test.js holds the six before them:
//
//   - documents the code itself produced fit: every message the embed
//     bridge sends and is sent, and each system the Orbital System Builder
//     saves;
//   - documents the reader refuses, the schema refuses too. Where the reader
//     refuses for a reason no schema can state - a rule across fields, a step
//     named somewhere else in the file - the case is listed as the
//     validator's alone, and tested there; where the reader accepts what the
//     schema, which states the format as written, refuses - a number typed as
//     text, a field it never looks at - the case is listed too, so each
//     difference is one somebody chose (./schemaCorpus.js holds());
//   - every table in a schema is the code's own, and each schema's title,
//     $id and version are its row in FORMATS.md (tools/formats.mjs).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { valid } from './jsonSchemaSubset.js';
import { as, holds, isItsRow } from './schemaCorpus.js';
import * as EM from '../js/embedMessages.js';
import { startEmbedBridge } from '../js/embedBridge.js';
import { EMBED_DEFAULTS } from '../js/embedOptions.js';
import { encodePayload } from '../js/shareState.js';
import * as SY from '../js/systemSpec.js';
import { migrateSystem } from '../js/lab3d/state.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(REPO, file), 'utf8');
const schema = name => JSON.parse(read(`sdk/schemas/${name}.schema.json`));
const clone = v => JSON.parse(JSON.stringify(v));
const literals = (text, re) => [...text.matchAll(re)].map(m => m[1]);

describe('each schema', () => {
  test.each([
    ['embed-messages-1', 'gravitas-embed messages', EM.PROTOCOL_VERSION],
    ['orbital-system-1', 'gravitas.orbital-system', SY.SYSTEM_VERSION],
  ])('%s is its row in FORMATS.md, at the version the code writes', isItsRow);

  test('no route reads a schema: they are the SDK’s', () => {
    // Nothing a page loads names one, so a schema costs no route a byte.
    let found = '';
    try {
      found = execFileSync('git', ['grep', '-l', 'sdk/schemas', '--', 'js'], {
        cwd: REPO,
        encoding: 'utf8',
      });
    } catch (e) {
      // git grep exits 1 when nothing matches.
      expect(e.status).toBe(1);
    }
    // js/platform/artifact.js names its schema in a comment, for readers.
    const named = found.split('\n').filter(Boolean);
    for (const file of named)
      expect({
        file,
        imports: /(?:import|from|fetch)\s*\(?\s*['"`][^'"`]*sdk\/schemas/.test(
          read(file)
        ),
      }).toEqual({ file, imports: false });
  });
});

// --- gravitas-embed messages/1 -----------------------------------------------

describe('the embed message schema', () => {
  const s = schema('embed-messages-1');
  const figure = { $ref: '#/$defs/figure', $defs: s.$defs };
  const base = { protocol: EM.PROTOCOL, version: EM.PROTOCOL_VERSION };
  const reads = d => EM.readMessage(d).ok;

  test('every request a page may send fits it, and readMessage reads it', async () => {
    const state = await encodePayload({ v: 1, s: 'Binary Pair', seed: 'abc' });
    const requests = [
      ...EM.REQUESTS.filter(t => t !== 'load').flatMap(type => [
        { ...base, type },
        { ...base, type, id: 'r-1.a:b_c' },
      ]),
      { ...base, type: 'load', state },
      { ...base, type: 'load', id: 'l1', state: `#${state}` },
      // EMBEDDING.md's own example.
      { protocol: 'gravitas-embed', version: 1, type: 'pause', id: 'pause-1' },
    ];
    expect(read('EMBEDDING.md')).toContain(
      "{ protocol: 'gravitas-embed', version: 1, type: 'pause', id: 'pause-1' }"
    );
    for (const m of requests)
      expect({ m, reads: reads(m), fits: valid(s, m) }).toEqual({
        m,
        reads: true,
        fits: true,
      });
  });

  test('and refuses what readMessage refuses', () => {
    const cases = [
      ['both', 'a string', () => as('play')],
      ['both', 'null', () => as(null)],
      ['both', 'an array', d => as([d])],
      ['both', 'another protocol', d => ((d.protocol = 'other'), d)],
      ['both', 'version 2', d => ((d.version = 2), d)],
      ['both', 'version as text', d => ((d.version = '1'), d)],
      ['both', 'no version', d => (delete d.version, d)],
      ['both', 'an unknown type', d => ((d.type = 'navigate'), d)],
      ['both', 'a reply type', d => ((d.type = 'ack'), d)],
      ['both', 'another key', d => ((d.extra = 1), d)],
      ['both', 'state on a play', d => ((d.state = '1zAbc'), d)],
      ['both', 'a long id', d => ((d.id = 'x'.repeat(65)), d)],
      ['both', 'an id with markup', d => ((d.id = '<b>'), d)],
      ['both', 'an empty id', d => ((d.id = ''), d)],
      ['both', 'a null id', d => ((d.id = null), d)],
      ['both', 'a load without state', d => ((d.type = 'load'), d)],
      [
        'both',
        'a load of a URL',
        d => as({ ...d, type: 'load', state: 'https://evil.example/#1z' }),
      ],
      [
        'both',
        'a state too long',
        d => as({ ...d, type: 'load', state: `1z${'a'.repeat(8000)}` }),
      ],
      [
        'both',
        'more than 16 KiB',
        d => ((d.pad = 'x'.repeat(EM.MAX_MESSAGE_CHARS)), d),
      ],
    ];
    holds(s, { ...base, type: 'play', id: 'p1' }, reads, cases);
  });

  test('what the bridge sends fits its $defs, and no request does', async () => {
    const listeners = new Set();
    const sent = [];
    const parent = { postMessage: data => sent.push(data) };
    const win = {
      parent,
      addEventListener: (type, fn) => type === 'message' && listeners.add(fn),
      removeEventListener: (type, fn) => listeners.delete(fn),
      setInterval: () => 0,
      clearInterval: () => {},
    };
    let paused = false;
    const services = {
      setPlaying: p => (paused = !p),
      applySharePayload: () => {},
      loadScenarioByKey: () => {},
      isPaused: () => paused,
      scenario: () => 'Solar System',
    };
    const PARENT = 'https://course.example.edu';
    // A figure opened with no parent says it is ready and obeys nothing.
    startEmbedBridge({
      options: { ...EMBED_DEFAULTS },
      authored: null,
      services,
      win,
    });
    startEmbedBridge({
      options: { ...EMBED_DEFAULTS, parent: PARENT },
      authored: null,
      services,
      win,
    });
    const deliver = data =>
      listeners.forEach(fn => fn({ data, origin: PARENT, source: parent }));
    const state = await encodePayload({ v: 1, s: 'Binary Pair', seed: 'x' });
    deliver({ ...base, type: 'pause', id: 'p1' });
    deliver({ ...base, type: 'ping' });
    deliver({ ...base, type: 'play', extra: 1, id: 'x1' });
    deliver({ ...base, type: 'load', id: 'l1', state: '1zNotAPayload' });
    deliver({ ...base, type: 'load', id: 'l2', state });
    for (let i = 0; i < 400 && !sent.some(m => m.id === 'l2'); i++)
      await sleep(5);
    const types = new Set(sent.map(m => m.type));
    expect([...types].sort()).toEqual(['ack', 'error', 'ready', 'status']);
    for (const m of sent)
      expect({ m, fits: valid(figure, m, s), asks: valid(s, m) }).toEqual({
        m,
        fits: true,
        asks: false,
      });
  });

  test('its tables are the code’s', () => {
    const [plain, load] = s.anyOf;
    expect(s.$defs.protocol.const).toBe(EM.PROTOCOL);
    expect(s.$defs.version.const).toBe(EM.PROTOCOL_VERSION);
    expect([...plain.properties.type.enum, load.properties.type.const]).toEqual(
      [...EM.REQUESTS]
    );
    expect(load.properties.state.maxLength).toBe(EM.MAX_STATE_CHARS);
    const [ready, , , error] = s.$defs.figure.anyOf;
    expect(ready.properties.requests.items.enum).toEqual([...EM.REQUESTS]);
    // The codes readMessage refuses with, and the bridge's one of its own.
    const codes = [
      ...literals(read('js/embedMessages.js'), /code: '([a-z-]+)'/g),
      ...literals(read('js/embedBridge.js'), /'([a-z-]+)'\s*:\s*'failed'/g),
      'failed',
    ];
    expect([...new Set(error.properties.code.enum)].sort()).toEqual(
      [...new Set(codes)].sort()
    );
  });
});

// --- gravitas.orbital-system/1 -----------------------------------------------

describe('the orbital system schema', () => {
  const s = schema('orbital-system-1');
  const opens = d => {
    const r = SY.systemFromFile(d);
    return r.ok && SY.validateSystem(r.system).ok;
  };
  const G = 2;
  const saved = bodies => {
    const v = SY.validateSystem({ bodies });
    expect(v.errors).toEqual([]);
    return clone(SY.systemToFile(v.bodies, SY.buildSystem(v.bodies, { G })));
  };
  const SUN = { name: 'Sun', type: 'Star', mass: 1 };
  const solar = () =>
    saved([
      SUN,
      {
        name: 'Earth',
        type: 'Planet',
        mass: 1,
        primary: 0,
        a: 1,
        e: 0.0167,
        omega: 102.9,
        phase: 40,
      },
      {
        name: 'Moon',
        type: 'Planet',
        mass: 0.0123,
        primary: 1,
        a: 0.00257,
        radius: 0.5,
        retrograde: true,
      },
      { name: 'Jupiter', type: 'GasGiant', mass: 1, primary: 0, a: 5.2 },
    ]);

  test('every file the builder saves fits it, and opens again', () => {
    const files = [
      solar(),
      saved([
        { name: 'A', type: 'Star', mass: 1.2 },
        { name: 'B', type: 'WhiteDwarf', mass: 0.6, primary: 0, a: 1.2 },
        { name: 'C', type: 'NeutronStar', mass: 1.4, primary: 0, a: 40 },
      ]),
      saved([
        { name: 'One', type: 'BlackHole', mass: 30 },
        { name: 'Two', type: 'BlackHole', mass: 10, primary: 0, a: 0.1 },
      ]),
      // The scenario-pack tests' system, as the builder would save it.
      saved([
        SUN,
        { name: 'Jupiter', type: 'GasGiant', mass: 1, primary: 0, a: 5.2 },
        { name: 'Saturn', type: 'GasGiant', mass: 0.3, primary: 0, a: 9.5 },
      ]),
    ];
    for (const f of files) {
      expect(f.initial.bodies).toHaveLength(f.bodies.length);
      expect({ opens: opens(f), fits: valid(s, f) }).toEqual({
        opens: true,
        fits: true,
      });
    }
  });

  test('and refuses what the builder refuses', () => {
    const companion = d => d.bodies[1];
    const cases = [
      ['both', 'another format', d => (d.format = 'gravitas.system3d')],
      ['both', 'a newer version', d => (d.version = 2)],
      ['both', 'version 0', d => (d.version = 0)],
      ['both', 'no bodies', d => delete d.bodies],
      ['both', 'one body', d => (d.bodies = d.bodies.slice(0, 1))],
      [
        'both',
        'thirteen bodies',
        d =>
          (d.bodies = [
            d.bodies[0],
            ...Array.from({ length: 12 }, () => clone(d.bodies[3])),
          ]),
      ],
      ['both', 'a comet', d => (companion(d).type = 'Comet')],
      ['both', 'no type', d => delete companion(d).type],
      ['both', 'no mass', d => delete companion(d).mass],
      ['both', 'a star too heavy', d => (d.bodies[0].mass = 30)],
      ['both', 'a planet too light', d => (companion(d).mass = 1e-4)],
      ['both', 'a radius of 0', d => (companion(d).radius = 0)],
      ['both', 'a radius too big', d => (companion(d).radius = 2e4)],
      ['both', 'a mass that is not a number', d => (companion(d).mass = 'x')],
      ['both', 'a root with a primary', d => (d.bodies[0].primary = 0)],
      ['both', 'no primary', d => delete companion(d).primary],
      ['both', 'a negative primary', d => (companion(d).primary = -1)],
      ['both', 'a fractional primary', d => (companion(d).primary = 0.5)],
      ['both', 'no semi-major axis', d => delete companion(d).a],
      ['both', 'a = 0', d => (companion(d).a = 0)],
      ['both', 'a past 10^4 AU', d => (companion(d).a = 2e4)],
      ['both', 'an unbound orbit', d => (companion(d).e = 1)],
      ['both', 'e = 0.995', d => (companion(d).e = 0.995)],
      ['both', 'a negative e', d => (companion(d).e = -0.1)],
      ['both', 'an angle that is not one', d => (companion(d).omega = 'x')],
      [
        'both',
        'a black hole among stars',
        d => (d.bodies[3] = { ...d.bodies[3], type: 'BlackHole', mass: 10 }),
      ],
      [
        'both',
        'a black hole with a radius',
        d =>
          (d.bodies = [
            { type: 'BlackHole', mass: 30 },
            { type: 'BlackHole', mass: 10, primary: 0, a: 0.1, radius: 1 },
          ]),
      ],
      // Its primary must come before it: the list is a tree.
      ['validator', 'its own primary', d => (companion(d).primary = 1)],
      ['validator', 'a later primary', d => (d.bodies[2].primary = 3)],
      // Shared with the form, the builder reads text as a number.
      ['lenient', 'a version as text', d => (d.version = '1')],
      ['lenient', 'a mass as text', d => (companion(d).mass = '1')],
      [
        'lenient',
        'a direction as a word',
        d => (companion(d).retrograde = 'retrograde'),
      ],
      ['lenient', 'a name that is a number', d => (companion(d).name = 7)],
    ];
    holds(s, solar(), opens, cases);
  });

  test('the 3-D lab opens a file this schema refuses: it reads only `initial`', () => {
    // tests/lab3d.test.js and e2e/lab3d.spec.js hand the lab a file whose
    // bodies are names alone. The builder, whose reader this schema is,
    // refuses it; FORMATS.md says the lab "reads orbital-system/1".
    const file = {
      format: SY.SYSTEM_FORMAT,
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
    expect(read('tests/lab3d.test.js')).toContain(
      "bodies: [{ name: 'Sun' }, { name: 'Earth' }]"
    );
    expect(migrateSystem(file).ok).toBe(true);
    expect(opens(file)).toBe(false);
    expect(valid(s, file)).toBe(false);
    // And a builder file without its initial state opens in the builder,
    // not in the lab.
    const bare = solar();
    delete bare.initial;
    expect([opens(bare), valid(s, bare), migrateSystem(bare).ok]).toEqual([
      true,
      true,
      false,
    ]);
  });

  test('its tables are the code’s', () => {
    expect(s.properties.format.const).toBe(SY.SYSTEM_FORMAT);
    expect(s.properties.version.const).toBe(SY.SYSTEM_VERSION);
    expect(s.properties.bodies.maxItems).toBe(SY.MAX_BODIES);
    expect(s.$defs.type.enum).toEqual([...SY.SYSTEM_TYPES]);
    expect(
      Object.fromEntries(
        s.$defs.mass.anyOf.map(b => [
          b.properties.type.const,
          [b.properties.mass.minimum, b.properties.mass.maximum],
        ])
      )
    ).toEqual(
      Object.fromEntries(
        Object.entries(SY.BUILDER_TYPES).map(([k, v]) => [k, [v.min, v.max]])
      )
    );
    const c = s.$defs.companion.properties;
    expect(c.primary.maximum).toBe(SY.MAX_BODIES - 2);
    expect(c.a.maximum).toBe(SY.ELEMENT_LIMITS.aMaxAu);
    expect(c.e.maximum).toBe(SY.ELEMENT_LIMITS.eMax);
    expect(s.$defs.radius.anyOf[0].maximum).toBe(SY.ELEMENT_LIMITS.radiusMax);
  });
});
