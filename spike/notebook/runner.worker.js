// The notebook runner's Worker (spike): Pyodide lives here, so a notebook
// that never returns blocks this Worker and not the page. A classic Worker,
// since an opaque-origin frame may not start a module one in Chromium.
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
let py = null;
self.onmessage = async ({ data: m }) => {
  try {
    const marks = { start: performance.now() };
    if (!py) {
      importScripts(`${PYODIDE}pyodide.js`);
      py = await self.loadPyodide({ indexURL: PYODIDE });
      marks.runtime = performance.now();
    }
    await py.loadPackage(m.packages, { checkIntegrity: true });
    marks.packages = performance.now();
    const stdout = [];
    py.setStdout({ batched: s => stdout.length < 200 && stdout.push(s) });
    py.setStderr({ batched: s => stdout.length < 200 && stdout.push(s) });
    py.globals.set('gravitas_input', m.input);
    for (const cell of m.cells) await py.runPythonAsync(cell);
    marks.cells = performance.now();
    const output = py.runPython('import json as _j; _j.dumps(gravitas_output, allow_nan=False)');
    const versions = {};
    for (const k of Object.keys(py.loadedPackages))
      versions[k] = py.runPython(
        ['import importlib.metadata as _m', 'try:', `  _v = _m.version(${JSON.stringify(k)})`, 'except Exception:', '  _v = None', '_v'].join('\n')
      );
    self.postMessage({
      ok: true,
      output,
      stdout: stdout.join('\n').slice(0, 64000),
      heapBytes: py._module.HEAP8.length,
      marks,
      runtime: { name: 'pyodide', version: py.version, python: py.runPython('import sys; sys.version.split()[0]'), packages: versions, lock: `${PYODIDE}pyodide-lock.json` },
    });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err?.message || err).slice(0, 2000) });
  }
};
