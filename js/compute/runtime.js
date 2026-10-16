// =============================================================================
// The pinned Python runtime, and what downloading it costs
// -----------------------------------------------------------------------------
// Pyodide 314.0.7 from its versioned path on the jsDelivr CDN, with the SHA-256
// of the release's lock file. The lock file names every wheel's SHA-256, and
// the Worker has Pyodide check each wheel against it as it loads
// (loadPackage checkIntegrity). The runtime core (the WebAssembly module and
// the standard library) is pinned by the versioned URL alone: nothing in a
// Worker can check a script it imports (COMPUTE.md, "What is and is not
// pinned"). NOTEBOOK_BRIDGE_GATE.md measured the sizes below.
//
// The frame's build (tools/build-compute-frame.mjs) copies this into the frame,
// and tests/computeRuntime.test.js refuses a release that changed without its
// hash and sizes being re-measured. Pure data, no DOM.
// =============================================================================

export const RUNTIME = Object.freeze({
  name: 'pyodide',
  version: '314.0.7',
  python: '3.14.2',
  base: 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/',
  lockSha256:
    '5dc2fc119108bc148c7457dc86e7675b5c87e1cafd420b9c34c1eaef7b36c010',
  /**
   * What the lock pins for each package a notebook may ask for, with each
   * one's wheels (itself and what it needs), as served: bytes, compressed.
   * numpy is one wheel; matplotlib's eleven wheels and numpy are the plot;
   * scipy is one wheel over numpy; astropy brings pyerfa, pyyaml, packaging
   * and the IERS tables (astropy-iers-data), five wheels over numpy.
   */
  packages: Object.freeze({
    numpy: Object.freeze({ version: '2.4.6' }),
    matplotlib: Object.freeze({ version: '3.10.8' }),
    scipy: Object.freeze({ version: '1.18.0' }),
    astropy: Object.freeze({ version: '7.2.0' }),
  }),
  /** Download sizes as served (compressed), measured by the gate, rounded up. */
  bytes: Object.freeze({
    core: 5_980_000,
    numpy: 2_930_000,
    matplotlib: 9_940_000,
    scipy: 13_830_000,
    astropy: 8_230_000,
  }),
});

/** The packages a notebook may name: the ones the lock was checked for. */
export const ALLOWED_PACKAGES = Object.freeze(Object.keys(RUNTIME.packages));

/**
 * The cold download for the runtime and these packages, in bytes, as served.
 * @param {string[]} packages - Names from ALLOWED_PACKAGES
 * @returns {number}
 */
export function downloadBytes(packages) {
  let n = RUNTIME.bytes.core;
  const all = new Set(packages);
  // matplotlib's, scipy's and astropy's wheels need numpy's (the lock's
  // dependency closure); numpy is counted once.
  for (const p of ['matplotlib', 'scipy', 'astropy'])
    if (all.has(p)) all.add('numpy');
  for (const p of all) n += RUNTIME.bytes[p] ?? 0;
  return n;
}
