'use strict';
/* global process, Buffer, __filename */
// =============================================================================
// What a test suite reads while Jest loads it
// -----------------------------------------------------------------------------
// tools/jest-count-cache.mjs counts the tests in each suite without running
// their bodies, and keeps each suite's count for as long as nothing the suite
// looked at has changed. "Nothing it looked at" has to be observed rather than
// guessed: a suite's count can depend on a file it never imports (it.each over
// a directory listing, a table read from a fixture), and a list of imports
// would serve a stale count the day someone adds a row to that fixture.
//
// So this file is preloaded into the Jest worker processes
// (NODE_OPTIONS=--require, with GRAVITAS_COUNT_TRACK=1) and wraps the node:fs
// and node:child_process entry points, and the two test environments, so that
// it knows when each suite starts loading and when it has finished. While a
// suite is loading, every path under the repository that it opens, stats, lists
// or checks is written down.
//
// What cannot be seen makes the suite uncacheable rather than guessed at:
// a child process that is not node (git, a shell, npx), a child started
// asynchronously, fs.glob, a path argument of a kind this does not recognise,
// a worker thread. A child that is node, run with execFileSync or spawnSync
// (how the suites run tools/validate-physics.mjs and the other validators as
// they load), is followed: see "Node children" below.
//
// The recorded state of a path is:
//   absent          nothing there
//   dir             a directory (a stat, an existence check, a realpath)
//   list:<hash>     a directory somebody listed, by the hash of its entries
//   file:<hash>     a file, by the hash of its content
//
// node_modules and .git are left out: the lock file, the Node version and the
// tool's own source are in the key every entry is stored under instead.
//
// Required without GRAVITAS_COUNT_TRACK set, this file only exports `stateOf`
// and wraps nothing, which is how the cache checks an entry against the tree.
// =============================================================================

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');

// The unwrapped functions, kept before any wrapping so that hashing a file
// does not record itself.
const real = {
  readFileSync: fs.readFileSync,
  readdirSync: fs.readdirSync,
  statSync: fs.statSync,
  writeFileSync: fs.writeFileSync,
};

const hashOf = buf => crypto.createHash('sha256').update(buf).digest('hex');

/**
 * The state of one path, in the vocabulary above.
 *
 * @param {string} abs - Absolute path
 * @param {boolean} listed - Whether somebody listed it (then a directory is
 *   described by its entries rather than just as a directory)
 * @param {Map<string, string>} [memo] - Optional memo, valid for one pass
 * @returns {string} The state
 */
function stateOf(abs, listed, memo) {
  const key = (listed ? 'L:' : 'S:') + abs;
  if (memo && memo.has(key)) return memo.get(key);
  let out;
  try {
    const st = real.statSync(abs);
    if (st.isDirectory()) {
      out = listed
        ? 'list:' + hashOf(real.readdirSync(abs).sort().join('\n'))
        : 'dir';
    } else {
      out = 'file:' + hashOf(real.readFileSync(abs));
    }
  } catch {
    out = 'absent';
  }
  if (memo) memo.set(key, out);
  return out;
}

if (process.env.GRAVITAS_COUNT_TRACK === '1') {
  const repo = path.resolve(process.env.GRAVITAS_COUNT_REPO || process.cwd());
  let realRepo = repo;
  try {
    realRepo = fs.realpathSync(repo);
  } catch {
    // keep the given spelling
  }
  const roots = [...new Set([repo, realRepo])];

  // One record at a time: a worker runs its suites one after another.
  const tracker = {
    current: null,
    begin() {
      this.current = { paths: new Map(), uncacheable: null };
    },
    end() {
      const rec = this.current;
      this.current = null;
      return rec;
    },
  };

  /**
   * Reduce a path argument to an absolute path.
   *
   * A suite's URL and Buffer are the environment's own, not this realm's, so
   * they are recognised by shape rather than with instanceof. Anything that is
   * not a path and not a file descriptor returns null, which the caller treats
   * as something it cannot see.
   */
  const toPath = arg => {
    if (typeof arg === 'string') return path.resolve(arg);
    if (typeof arg === 'number') return undefined; // a descriptor from open()
    if (arg && typeof arg === 'object') {
      if (typeof arg.href === 'string' && typeof arg.protocol === 'string') {
        return arg.protocol === 'file:'
          ? path.resolve(require('node:url').fileURLToPath(arg.href))
          : undefined;
      }
      if (ArrayBuffer.isView(arg)) {
        return path.resolve(
          Buffer.from(arg.buffer, arg.byteOffset, arg.byteLength).toString()
        );
      }
    }
    return null;
  };

  const note = (arg, listed) => {
    const rec = tracker.current;
    if (!rec) return;
    const abs = toPath(arg);
    if (abs === undefined) return;
    if (abs === null) {
      if (!rec.uncacheable) rec.uncacheable = 'unrecognised path argument';
      return;
    }
    const root = roots.find(r => abs === r || abs.startsWith(r + path.sep));
    if (!root) return;
    const rel = path.relative(root, abs).split(path.sep).join('/');
    if (rel === 'node_modules' || rel.startsWith('node_modules/')) return;
    if (rel === '.git' || rel.startsWith('.git/')) return;
    // A listing is the stronger observation and must not be downgraded by a
    // later stat of the same directory.
    const had = rec.paths.get(rel);
    rec.paths.set(rel, listed || had === 'listed' ? 'listed' : 'seen');
  };

  const flag = what => () => {
    if (tracker.current && !tracker.current.uncacheable) {
      tracker.current.uncacheable = what;
    }
  };

  const wrap = (obj, name, before) => {
    const orig = obj[name];
    if (typeof orig !== 'function') return;
    const wrapped = function (...args) {
      try {
        before(args);
      } catch {
        // tracking must never change what the code under test sees
      }
      return orig.apply(this, args);
    };
    // Keep what callers rely on (util.promisify.custom, .native, ...).
    for (const k of Reflect.ownKeys(orig)) {
      if (k === 'length' || k === 'name' || k === 'prototype') continue;
      try {
        wrapped[k] = orig[k];
      } catch {
        // read-only property
      }
    }
    obj[name] = wrapped;
  };

  const seen = args => note(args[0], false);
  const listed = args => note(args[0], true);
  // cp and copyFile take a source and a destination; both are touched.
  const both = args => {
    note(args[0], false);
    note(args[1], false);
  };
  // A glob's roots are not knowable from here: do not guess.
  const globbed = flag('fs.glob');

  const sets = [
    [
      fs,
      {
        readFileSync: seen,
        readFile: seen,
        openSync: seen,
        open: seen,
        createReadStream: seen,
        statSync: seen,
        stat: seen,
        lstatSync: seen,
        lstat: seen,
        existsSync: seen,
        accessSync: seen,
        access: seen,
        readlinkSync: seen,
        readlink: seen,
        realpathSync: seen,
        realpath: seen,
        copyFileSync: both,
        copyFile: both,
        cpSync: both,
        cp: both,
        readdirSync: listed,
        readdir: listed,
        opendirSync: listed,
        opendir: listed,
        globSync: globbed,
        glob: globbed,
      },
    ],
    [
      fs.promises,
      {
        readFile: seen,
        open: seen,
        stat: seen,
        lstat: seen,
        access: seen,
        readlink: seen,
        realpath: seen,
        copyFile: both,
        cp: both,
        readdir: listed,
        opendir: listed,
        glob: globbed,
      },
    ],
    [
      childProcess,
      Object.fromEntries(
        ['spawn', 'exec', 'execSync', 'execFile', 'fork'].map(n => [
          n,
          flag('child_process.' + n),
        ])
      ),
    ],
  ];
  for (const [obj, table] of sets) {
    for (const [name, before] of Object.entries(table)) wrap(obj, name, before);
  }
  // ---------------------------------------------------------------------------
  // Node children, run synchronously
  // ---------------------------------------------------------------------------
  // Several suites run a validator as they load and read its JSON
  // (tools/validate-physics.mjs, tools/detection-validate.mjs, ...). Those are
  // the expensive ones, and what the child reads decides the suite's count, so
  // a child that is node itself, run with execFileSync or spawnSync, is
  // followed: it gets this file preloaded, starts a record of its own, and
  // writes it where the parent says when it exits; the parent folds it in. A
  // child that is anything else (git, npx, a shell), that is started
  // asynchronously, or that leaves no record, makes the suite uncacheable.
  const own = fs.realpathSync(__filename);
  const childDir = process.env.GRAVITAS_COUNT_CHILD_OUT
    ? path.dirname(process.env.GRAVITAS_COUNT_CHILD_OUT)
    : process.env.GRAVITAS_COUNT_OUT &&
      path.join(process.env.GRAVITAS_COUNT_OUT, 'children');
  let childSeq = 0;

  const merge = (rec, from) => {
    if (from.uncacheable && !rec.uncacheable)
      rec.uncacheable = from.uncacheable;
    for (const [rel, how] of from.paths) {
      const had = rec.paths.get(rel);
      rec.paths.set(
        rel,
        how === 'listed' || had === 'listed' ? 'listed' : 'seen'
      );
    }
  };

  const followedChild = name => {
    const orig = childProcess[name];
    childProcess[name] = function (file, ...rest) {
      const rec = tracker.current;
      const optionsAt = Array.isArray(rest[0]) ? 1 : 0;
      const options = rest[optionsAt];
      const isNode = file === process.execPath;
      if (!rec || !isNode || !childDir || (options && options.shell)) {
        if (rec && !rec.uncacheable) {
          rec.uncacheable = `child_process.${name}: ${typeof file === 'string' ? path.basename(file) : 'unknown'}`;
        }
        return orig.call(this, file, ...rest);
      }
      fs.mkdirSync(childDir, { recursive: true });
      const report = path.join(
        childDir,
        `child-${process.pid}-${childSeq++}.json`
      );
      const env = { ...((options && options.env) || process.env) };
      const preload = `--require ${own.includes(' ') ? `"${own}"` : own}`;
      if (!(env.NODE_OPTIONS || '').includes(own)) {
        env.NODE_OPTIONS = [env.NODE_OPTIONS, preload]
          .filter(Boolean)
          .join(' ');
      }
      env.GRAVITAS_COUNT_TRACK = '1';
      env.GRAVITAS_COUNT_REPO = process.env.GRAVITAS_COUNT_REPO;
      env.GRAVITAS_COUNT_CHILD_OUT = report;
      const next = { ...(options || {}), env };
      const args = [...rest];
      args[optionsAt] = next;
      try {
        return orig.call(this, file, ...args);
      } finally {
        let from = null;
        try {
          from = JSON.parse(real.readFileSync(report, 'utf8'));
        } catch {
          // no record: the child was killed or never started
        }
        if (from) merge(rec, from);
        else if (!rec.uncacheable) rec.uncacheable = 'child left no record';
      }
    };
  };
  followedChild('execFileSync');
  followedChild('spawnSync');

  // The child's side: record from the first line, write at exit, and see the
  // modules node's own loader reads, which do not pass through the fs wrappers.
  if (process.env.GRAVITAS_COUNT_CHILD_OUT) {
    tracker.begin();
    const Module = require('node:module');
    if (typeof Module.registerHooks === 'function') {
      Module.registerHooks({
        load(url, context, nextLoad) {
          if (url.startsWith('file:')) {
            note(require('node:url').fileURLToPath(url), false);
          }
          return nextLoad(url, context);
        },
      });
    } else if (tracker.current) {
      // Without module hooks the child's ES module imports cannot be seen.
      tracker.current.uncacheable = 'node has no module.registerHooks';
    }
    process.on('exit', () => {
      const rec = tracker.end();
      if (!rec) return;
      real.writeFileSync(
        process.env.GRAVITAS_COUNT_CHILD_OUT,
        JSON.stringify({ uncacheable: rec.uncacheable, paths: [...rec.paths] })
      );
    });
  }

  // fs.realpathSync has a .native variant that bypasses the wrapper above.
  if (fs.realpathSync.native) {
    wrap(fs.realpathSync, 'native', seen);
  }
  try {
    const wt = require('node:worker_threads');
    const Orig = wt.Worker;
    wt.Worker = class extends Orig {
      constructor(...args) {
        flag('worker_threads')();
        super(...args);
      }
    };
  } catch {
    // no worker threads in this build
  }
  // ---------------------------------------------------------------------------
  // Where a suite starts and ends
  // ---------------------------------------------------------------------------
  // A suite is loaded between its test environment's setup() and teardown(),
  // and a suite may choose its own environment (`@jest-environment node`), so
  // the one place that sees them all is the environment class itself. Jest
  // loads that class with require(), which this wraps: whichever of the two
  // environments the project uses is replaced by a subclass that begins a
  // record in setup() and writes it out in teardown().
  const out = process.env.GRAVITAS_COUNT_OUT;
  const instrument = Base =>
    class CountingEnvironment extends Base {
      constructor(config, context) {
        super(config, context);
        this.gravitasTestPath = context.testPath;
      }

      async setup() {
        await super.setup();
        tracker.begin();
      }

      async teardown() {
        const rec = tracker.end();
        await super.teardown();
        if (!rec || !out) return;
        const name = crypto
          .createHash('sha1')
          .update(this.gravitasTestPath)
          .digest('hex');
        fs.writeFileSync(
          path.join(out, `${name}.json`),
          JSON.stringify({
            testPath: this.gravitasTestPath,
            uncacheable: rec.uncacheable,
            paths: [...rec.paths],
          })
        );
      }
    };

  const Module = require('node:module');
  const load = Module._load;
  const wrapped = new WeakMap();
  Module._load = function (request, ...rest) {
    const exported = load.call(this, request, ...rest);
    if (
      typeof request !== 'string' ||
      !/jest-environment-(jsdom|node)\b/.test(request)
    ) {
      return exported;
    }
    const Base = exported && (exported.default || exported.TestEnvironment);
    if (typeof Base !== 'function') return exported;
    if (!wrapped.has(Base)) wrapped.set(Base, instrument(Base));
    const Counting = wrapped.get(Base);
    return {
      ...exported,
      __esModule: true,
      default: Counting,
      TestEnvironment: Counting,
    };
  };
}

module.exports = { stateOf, hashOf };
