// =============================================================================
// The compute frame's Worker: Pyodide lives here
// -----------------------------------------------------------------------------
// A classic Worker (an opaque-origin frame may not start a module Worker from a
// blob in Chromium), so Pyodide is loaded with importScripts. It does what the
// frame's script sends it and nothing else:
//
//   load  fetch the release's lock file, check its SHA-256 against the pin,
//         load Pyodide and the packages, each wheel checked against the lock
//   run   run the notebook's cells in a fresh namespace, then return the
//         notebook's `gravitas_output` as one text of texts
//
// What is pinned: the release by its versioned URL; the lock file by its
// SHA-256 here; every wheel by the lock, which Pyodide checks as it loads
// (checkIntegrity). What is not: the runtime core (the WebAssembly module and
// the standard library) is trusted by URL alone, since a Worker cannot check a
// script it imports. COMPUTE.md says so.
// =============================================================================

/* global __PIN__, importScripts, loadPyodide, self */
const PIN = __PIN__;
let py = null;
let lockSha256 = null;
const t0 = () => performance.now();

class Coded extends Error {
  constructor(code, text) {
    super(text);
    this.code = code;
  }
}

const post = (type, fields) =>
  self.postMessage({
    protocol: 'gravitas-compute',
    version: 1,
    type,
    ...fields,
  });

const hex = buf =>
  Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join(
    ''
  );

/** Why a thrown value is one of the frame's error codes. */
function classify(err) {
  if (err instanceof Coded) return { code: err.code, text: err.message };
  const text = String(err?.message ?? err);
  if (
    err?.name === 'RangeError' ||
    /MemoryError|out of memory|could not allocate/i.test(text)
  )
    return { code: 'memory', text: 'the runtime ran out of memory' };
  if (err?.name === 'PythonError' || /Traceback/.test(text))
    return {
      code: 'notebook-error',
      text: text.split('\n').filter(Boolean).slice(-4).join('\n'),
    };
  if (err instanceof TypeError || /fetch|network|load|import/i.test(text))
    return { code: 'runtime-download', text };
  return { code: 'notebook-error', text };
}

async function ensureRuntime(id, marks) {
  if (py) return;
  post('progress', { id, phase: 'runtime' });
  let lock;
  try {
    const r = await fetch(`${PIN.base}pyodide-lock.json`, {
      cache: 'no-store',
    });
    if (!r.ok)
      throw new Coded('runtime-download', `the lock file answered ${r.status}`);
    lock = await r.text();
  } catch (e) {
    if (e instanceof Coded) throw e;
    throw new Coded('runtime-download', 'the runtime could not be downloaded');
  }
  const digest = hex(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(lock))
  );
  if (digest !== PIN.lockSha256)
    throw new Coded(
      'runtime-version',
      'the runtime release is not the one Gravitas pins (its lock file differs)'
    );
  lockSha256 = digest;
  try {
    importScripts(`${PIN.base}pyodide.js`);
    py = await loadPyodide({ indexURL: PIN.base, lockFileContents: lock });
  } catch {
    throw new Coded('runtime-download', 'the runtime could not be downloaded');
  }
  if (py.version !== PIN.version)
    throw new Coded(
      'runtime-version',
      `the runtime is ${py.version}, not ${PIN.version}`
    );
  marks.runtime = t0();
}

async function ensurePackages(id, packages, marks) {
  post('progress', { id, phase: 'packages' });
  try {
    await py.loadPackage(packages, { checkIntegrity: true });
  } catch {
    throw new Coded(
      'runtime-download',
      'a package could not be downloaded or did not match its hash'
    );
  }
  marks.packages = t0();
}

function runtimeRecord(packages) {
  const versions = {};
  for (const k of packages)
    versions[k] =
      py.runPython(
        [
          'import importlib.metadata as _m',
          `_m.version(${JSON.stringify(k)})`,
        ].join('\n')
      ) ?? null;
  return {
    name: 'pyodide',
    version: py.version,
    python: py.runPython('import sys; sys.version.split()[0]'),
    lockSha256,
    packages: versions,
  };
}

const heap = () => {
  try {
    return py._module.HEAP8.length;
  } catch {
    return 0;
  }
};

/** Rounded milliseconds since the request began, for each mark reached. */
const elapsed = (start, marks) =>
  Object.fromEntries(
    Object.entries(marks).map(([k, v]) => [
      k,
      Math.round(Math.max(0, v - start)),
    ])
  );

self.onmessage = async ({ data: m }) => {
  const start = t0();
  const marks = {};
  try {
    await ensureRuntime(m.id, marks);
    await ensurePackages(m.id, m.packages, marks);
    if (m.op === 'load') {
      post('loaded', {
        id: m.id,
        runtime: runtimeRecord(m.packages),
        marks: elapsed(start, marks),
        heapBytes: heap(),
      });
      return;
    }
    post('progress', { id: m.id, phase: 'cells' });
    const stdout = [];
    py.setStdout({ batched: s => stdout.length < 200 && stdout.push(s) });
    py.setStderr({ batched: s => stdout.length < 200 && stdout.push(s) });
    // A namespace of its own for each run, so nothing survives from the last.
    const ns = py.runPython('dict()');
    let output;
    try {
      ns.set('gravitas_input', m.input);
      ns.set('gravitas_params', m.params);
      for (const cell of m.cells)
        await py.runPythonAsync(cell, { globals: ns });
      marks.cells = t0();
      py.globals.set('_gravitas_ns', ns);
      output = py.runPython(
        [
          'import json as _j',
          '_o = _gravitas_ns["gravitas_output"]',
          '_j.dumps({k: _j.dumps(_o[k], sort_keys=True, separators=(",", ":"), allow_nan=False) for k in _o}, allow_nan=False)',
        ].join('\n')
      );
    } finally {
      py.globals.delete('_gravitas_ns');
      ns.destroy();
    }
    if (output.length > 4_000_000)
      throw new Coded(
        'output-too-large',
        'the answer is larger than an answer may be'
      );
    post('result', {
      id: m.id,
      output,
      stdout: stdout.join('\n').slice(0, 64000),
      heapBytes: heap(),
      marks: elapsed(start, marks),
      runtime: runtimeRecord(m.packages),
    });
  } catch (err) {
    const { code, text } = classify(err);
    post('error', { id: m.id, code, message: text.slice(0, 2000) });
  }
};
