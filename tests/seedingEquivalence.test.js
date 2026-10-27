// =============================================================================
// One seeding API keeps every old sequence (Prompt 149)
// -----------------------------------------------------------------------------
// js/random/streams.js names the streams (engine, effects, forward, noise,
// experiments, injection) and the call sites that moved onto it must draw
// exactly what they drew before. The proofs, in this file:
//
//   1. tools/seeding-probes.mjs calls every moved site through its public
//      function with thirteen kinds of seed, once through v3's own copy of the
//      ten modules (tests/fixtures/seedingLegacy/, as they were at 9847b6e5) and
//      once through the current ones, in this process, and compares every
//      number with Object.is. No digest of anything that passes through
//      Math.log, cos, exp or pow is stored: those differ in the last bit between
//      Node 20 (CI) and Node 24, so a hash recorded on one would fail on the
//      other with nothing changed.
//   2. What is stored is only raw draws (tests/fixtures/seedingRawGolden.json):
//      mulberry32 is Math.imul, integer arithmetic and a division by 2^32, exact
//      on every Node, so a SHA-256 of the uniforms of a seed means the same
//      thing everywhere.
//   3. A reference written here from the algorithm alone (FNV-1a over the seed's
//      text, mulberry32) agrees with the API bit for bit.
//   4. The engine's stream is js/rng.js's own withSeed (object identity), its
//      draws are the stream's, and tests/effectsRealm.test.js steps three seeded
//      worlds through tools/seeded-step.mjs, which now runs on `engine`.
//   5. A Worker draws the same numbers as the page, a job's draws come from its
//      own fork whatever order jobs run in, and a fork is a sibling.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';

import { compareSites } from '../tools/seeding-probes.mjs';
import { mulberry32, normalizeSeed, withSeed } from '../js/rng.js';
import {
  ALGORITHM,
  STREAMS,
  VERSION,
  engine,
  gaussian,
  state,
  stream,
} from '../js/random/streams.js';

const fixture = name =>
  JSON.parse(
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
  );
const draws = (next, n = 64) => Array.from({ length: n }, () => next());
const same = (a, b) => expect(a.map(String)).toEqual(b.map(String));

// The algorithm, from its definition: not imported from js/rng.js.
function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
// js/rng.js's rule for a seed, from its documentation: a finite number is its
// absolute value truncated, an empty text is 0, digits are themselves, anything
// else is hashed.
function seedOf(value) {
  if (typeof value === 'number' && Number.isFinite(value))
    return Math.abs(Math.trunc(value)) >>> 0;
  const text = String(value ?? '').trim();
  if (text === '') return 0;
  if (/^\d+$/.test(text) && Number.isSafeInteger(Number(text)))
    return Number(text) >>> 0;
  return fnv1a(text);
}
function reference(seed32) {
  let a = seed32 >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('every moved call site draws what it drew before', () => {
  test('145 cases, each number Object.is-equal to v3 run in this process', async () => {
    const cases = await compareSites();
    expect(cases).toHaveLength(145);
    expect(cases.filter(c => c.mismatch)).toEqual([]);
    // every case returned numbers, so equal does not mean both were empty
    expect(Math.min(...cases.map(c => c.n))).toBeGreaterThanOrEqual(12);
  }, 120000);

  test('raw uniforms of a seed, a fork and a state match what js/rng.js gave on v3', () => {
    const golden = fixture('seedingRawGolden.json');
    const sha = next =>
      createHash('sha256')
        .update(draws(next).map(String).join('\n'))
        .digest('hex');
    const seeds = [
      'a',
      'kepler-3',
      'été',
      '',
      '7',
      7,
      2024,
      1.5,
      -3,
      0,
      NaN,
      null,
      undefined,
      2 ** 40,
    ];
    for (const s of seeds)
      expect(sha(stream('noise', s))).toBe(
        golden['raw:' + (typeof s === 'string' ? JSON.stringify(s) : String(s))]
      );
    for (const l of [
      ['run-4', 'epoch', 3],
      [17, 'z'],
      ['k', 'nights'],
      [undefined, 'x'],
      [null, 'x'],
      ['s', 'a', 'b', 'c'],
    ])
      expect(sha(stream('forward', ...l))).toBe(
        golden['fork:' + l.map(String).join(':')]
      );
    for (const s of [0, 1, 2202, 0x5c4e21d3, 4294967295])
      expect(sha(state('forward', s))).toBe(golden['state:' + s]);
    expect(Object.keys(golden)).toHaveLength(25);
  });
});

describe('the API against an independent reference', () => {
  const seeds = ['a', 'kepler-3', 'été', '', '7', 7, 2024, 1.5, -3, 0];

  test('a seed as given follows the rule of js/rng.js for its type', () => {
    for (const s of [...seeds, NaN, null, undefined, 2 ** 40, 2 ** 53])
      same(draws(stream('noise', s)), draws(reference(seedOf(s))));
  });

  test('labels fork the seed as "seed:label:label", the way every site always keyed', () => {
    const a = stream('forward', 'run-4', 'epoch', 3);
    same(draws(a), draws(reference(seedOf('run-4:epoch:3'))));
    const b = stream('injection', 17, 'z');
    same(draws(b), draws(reference(seedOf('17:z'))));
    // undefined and null are written as the templates always wrote them
    same(
      draws(stream('noise', undefined, 'x')),
      draws(reference(seedOf('undefined:x')))
    );
    same(draws(stream('noise', null, 'x')), draws(reference(seedOf('null:x'))));
  });

  test('a stream from a state is mulberry32 on that state', () => {
    for (const s of [0, 1, 2202, 0x5c4e21d3, 4294967295, 0x1234567890]) {
      same(draws(state('forward', s)), draws(reference(s)));
      same(draws(state('forward', s)), draws(mulberry32(s)));
    }
  });

  test('gaussian is Box-Muller with the spare kept, one rejection at 1e-12', () => {
    const u = reference(fnv1a('g'));
    const g = [];
    for (let i = 0; i < 40; i++) {
      let a;
      do a = u();
      while (a <= 1e-12);
      const b = u();
      const r = Math.sqrt(-2 * Math.log(a));
      g.push(r * Math.cos(2 * Math.PI * b), r * Math.sin(2 * Math.PI * b));
    }
    // the generator returns the cosine first, then the kept spare
    same(draws(gaussian(stream('noise', 'g')), 80), g);
  });

  test('a rejected uniform is redrawn, so a stream that returns 0 first still answers', () => {
    const queue = [0, 5e-13, 0.25, 0.5];
    const g = gaussian(() => queue.shift());
    expect(g()).toBe(Math.sqrt(-2 * Math.log(0.25)) * Math.cos(Math.PI));
    expect(queue).toEqual([]);
  });
});

describe('stream identities, versions and forks', () => {
  test('the identities are the six the contract names, at one algorithm and version', () => {
    expect(STREAMS).toEqual([
      'engine',
      'effects',
      'forward',
      'noise',
      'experiments',
      'injection',
    ]);
    expect(ALGORITHM).toBe('mulberry32');
    expect(VERSION).toBe(1);
  });

  test('a stream says what it is, for a record that names its streams', () => {
    const s = stream('forward', 'run-4', 'epoch', 3);
    expect(s.stream).toEqual({
      id: 'forward',
      algorithm: 'mulberry32',
      version: 1,
      key: 'run-4:epoch:3',
    });
    expect(stream('noise', 9).stream.key).toBe(9);
    expect(state('noise', 5).stream.key).toBe(5);
  });

  test('an unknown identity is refused, not drawn from', () => {
    expect(() => stream('dice', 'x')).toThrow(/unknown random stream: dice/);
    expect(() => state('dice', 1)).toThrow(/unknown random stream/);
  });

  test('a fork is a sibling stream of its own and equals the labelled stream', () => {
    const parent = stream('experiments', 'sweep');
    const a = parent.fork('trial', 1);
    const b = parent.fork('trial', 2);
    same(draws(a), draws(stream('experiments', 'sweep', 'trial', 1)));
    same(draws(b), draws(stream('experiments', 'sweep', 'trial', 2)));
    expect(a.stream.key).toBe('sweep:trial:1');
    // forking again keeps going down the labels
    same(
      draws(parent.fork('trial').fork(1)),
      draws(stream('experiments', 'sweep', 'trial', 1))
    );
    // and the parent's own draws are not touched by its children
    const alone = draws(stream('experiments', 'sweep'));
    const p = stream('experiments', 'sweep');
    draws(p.fork('x'), 10);
    same(draws(p), alone);
  });

  test('a job draws the same whatever order the jobs run in', () => {
    const run = i => stream('experiments', 'run', 'job', i);
    const sequential = [0, 1, 2, 3].map(i => draws(run(i), 16));
    const jobs = [0, 1, 2, 3].map(run);
    const interleaved = jobs.map(() => []);
    for (let k = 0; k < 16; k++)
      for (const i of [3, 1, 0, 2]) interleaved[i].push(jobs[i]());
    sequential.forEach((d, i) => same(interleaved[i], d));
  });
});

describe('the engine adapter is js/rng.js withSeed', () => {
  test('the adapter is the function itself, and Math.random is restored', () => {
    expect(engine).toBe(withSeed);
    const real = Math.random;
    const seen = engine(1234, () => draws(Math.random, 32));
    expect(Math.random).toBe(real);
    same(seen, draws(reference(1234), 32));
    expect(() =>
      engine(1, () => {
        throw new Error('stop');
      })
    ).toThrow('stop');
    expect(Math.random).toBe(real);
  });

  test('the engine stream for a typed seed is the one normalizeSeed gives', () => {
    const seen = engine(normalizeSeed('kepler-3'), () =>
      draws(Math.random, 16)
    );
    same(seen, draws(reference(fnv1a('kepler-3')), 16));
  });
});

describe('a Worker and the page draw the same numbers', () => {
  test('jobs, noise, a state stream and the engine stream agree across threads', async () => {
    const data = { jobs: [0, 1, 2, 3], seed: 'kepler-3', state: 99 };
    const fromWorker = await new Promise((resolve, reject) => {
      const w = new Worker(
        new URL('./fixtures/seedingWorker.mjs', import.meta.url),
        { workerData: data }
      );
      w.once('message', resolve);
      w.once('error', reject);
    });
    for (const [i, got] of fromWorker.jobs)
      same(got, draws(stream('experiments', 'run', 'job', i), 16));
    same(fromWorker.noise, draws(gaussian(stream('noise', 'kepler-3')), 16));
    same(fromWorker.state, draws(state('forward', 99), 16));
    same(fromWorker.engine, draws(reference(99), 16));
  });
});

describe('Math.random is forbidden outside js/random/ by a lint rule with a short list of exceptions', () => {
  const root = new URL('..', import.meta.url).pathname;
  const eslint = new URL(
    '../node_modules/eslint/bin/eslint.js',
    import.meta.url
  ).pathname;
  // ESLint cannot run inside Jest's sandbox (it wants structuredClone), so it
  // is run as the command npm run lint runs, on a snippet from stdin.
  const lint = (code, filePath) =>
    new Promise(resolve => {
      const child = execFile(
        process.execPath,
        [eslint, '--stdin', '--stdin-filename', filePath, '--format', 'json'],
        { cwd: root, encoding: 'utf8' },
        (_error, stdout) => resolve(JSON.parse(stdout)[0].messages)
      );
      child.stdin.end(code);
    });
  const config = readFileSync(
    new URL('../eslint.config.js', import.meta.url),
    'utf8'
  );
  const start = config.indexOf('const MATH_RANDOM_ALLOWED');
  const allowed = [
    ...config
      .slice(start, config.indexOf('];', start))
      .matchAll(/'(js\/[^']+)'/g),
  ].map(m => m[1]);
  const code = 'export const x = () => Math.random();\n';
  const rule = ms => ms.filter(m => m.ruleId === 'no-restricted-properties');

  test('a module that draws from Math.random is refused', async () => {
    const found = rule(await lint(code, 'js/someModule.js'));
    expect(found).toHaveLength(1);
    expect(found[0].message).toMatch(/named stream in js\/random\/streams.js/);
  }, 60000);

  test('js/random/ and each listed exception may call it', async () => {
    expect(rule(await lint(code, 'js/random/someModule.js'))).toEqual([]);
    for (const f of allowed) expect(rule(await lint(code, f))).toEqual([]);
  }, 120000);

  test('every exception still calls Math.random (a stale entry is a wait that ended)', () => {
    for (const f of allowed) {
      const source = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
        .split('\n')
        .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
        .join('\n');
      expect({ f, calls: /Math\.random/.test(source) }).toEqual({
        f,
        calls: true,
      });
    }
    expect(allowed).toHaveLength(16);
  });
});
