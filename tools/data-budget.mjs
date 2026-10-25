// =============================================================================
// The data plane's budget: what Gravitas stores and keeps, not just what it ships
// -----------------------------------------------------------------------------
//   node tools/data-budget.mjs            measure and print against tools/data-budget.json
//   node tools/data-budget.mjs --check    the same, failing when a ceiling is over
//   node tools/data-budget.mjs --propose  print the values a +10% allowance would give
//
// The route and bundle budgets count JavaScript a visitor downloads. They say
// nothing about the bytes of the observation packs, what the service worker
// precaches on a first visit and what it fetches when idle, how much decoded
// image memory a page holds, how many Workers run at once, or what the
// application keeps in IndexedDB and the cache. This is where those get a
// ceiling (Prompt 133; Prompts 153 and 157 read the values).
//
// Some of these can be measured from the tree, and are: pack bytes by kind
// and the two precache tiers, raw and gzipped. Others need a browser: decoded
// image memory per page and aggregate worker memory are probes on the throttled
// profile (Prompts 153 and 157), and the IndexedDB and cache footprint is read
// from a real profile. Prompt 153's probe (tools/worker-probe.mjs) records the
// storage a first visit leaves, and that is the one browser figure measured
// here; decoded image memory still waits for 157. A ceiling with `measured:
// null` is reported as "not measured", never as zero and never as a pass, and
// --check does not fail on it.
//
// The mode in tools/budget-policy.json decides whether any of this can fail a
// build. While the mode is "exact" the check reports and exits 0.
// =============================================================================

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { PROFILES } from '../js/experiments/experimentManifest.js';
import { precacheInventory } from './precache-inventory.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_BUDGET_FILE = path.join(ROOT, 'tools', 'data-budget.json');

/** Raw and gzip-6 bytes of every file in `dir` matching `pattern`. */
function directoryBytes(dir, pattern) {
  let files = 0;
  let bytes = 0;
  let gzip = 0;
  for (const name of readdirSync(dir)) {
    if (!pattern.test(name)) continue;
    const file = path.join(dir, name);
    if (!statSync(file).isFile()) continue;
    const buf = readFileSync(file);
    files++;
    bytes += buf.length;
    gzip += gzipSync(buf, { level: 6 }).length;
  }
  return { files, bytes, gzip };
}

/**
 * What can be measured from the tree.
 * @param {string} [root]
 * @returns {Record<string, number>} Measurements by the keys of data-budget.json
 */
export function measure(root = ROOT) {
  const packs = directoryBytes(path.join(root, 'data-packs'), /\.json$/);
  const inv = precacheInventory(root);
  const tier = names => {
    let bytes = 0;
    let gzip = 0;
    for (const rel of names) {
      const buf = readFileSync(path.join(root, rel));
      bytes += buf.length;
      gzip += gzipSync(buf, { level: 6 }).length;
    }
    return { bytes, gzip };
  };
  const manifest = readFileSync(path.join(root, 'sw-manifest.js'), 'utf8');
  const listed = name => {
    const m = new RegExp(
      `self\\.__GRAVITAS_PRECACHE_${name} = \\[([\\s\\S]*?)\\];`
    ).exec(manifest);
    return m ? [...m[1].matchAll(/'\.\/([^']+)'/g)].map(x => x[1]) : [];
  };
  // First visit is what the install fetches (core and optional); the idle tier
  // is what the page asks for afterwards (Prompt 147).
  const core = tier([...listed('CORE'), ...listed('OPTIONAL')]);
  const idle = tier(listed('IDLE'));
  return {
    packFiles: packs.files,
    packBytes: packs.bytes,
    packGzipBytes: packs.gzip,
    precacheFirstVisitFiles: inv.core + inv.optional,
    precacheFirstVisitGzipBytes: core.gzip,
    precacheIdleFiles: inv.idle,
    precacheIdleGzipBytes: idle.gzip,
    // The pool's own caps, which are what the realms are held to.
    workerConcurrencyLowEnd: PROFILES['low-end'].maxConcurrency,
    workerMemoryBytesLowEnd: PROFILES['low-end'].maxMemoryBytes,
    // What a first visit leaves in Cache Storage and IndexedDB: a browser
    // probe's figure (tools/worker-probe.mjs, Prompt 153), recorded in
    // tools/worker-probe-results.json with the commit and the date it was
    // taken. Absent until a probe has been recorded, and then "not measured".
    ...recordedProbe(root),
  };
}

/**
 * The browser probe's recorded measurements, by the keys of data-budget.json.
 * @param {string} [root]
 * @returns {Record<string, number>}
 */
export function recordedProbe(root = ROOT) {
  const out = {};
  const file = path.join(root, 'tools', 'worker-probe-results.json');
  if (existsSync(file)) {
    const r = JSON.parse(readFileSync(file, 'utf8'));
    if (Number.isFinite(r.storage?.usageBytes))
      out.indexedDbAndCacheBytes = r.storage.usageBytes;
  }
  // The decoded-memory probe (Prompt 157, tools/decoded-memory-results.json) is
  // deliberately not read: its resident figure is the 64 MiB bound read back,
  // equal to the ceiling by construction, and its real measurements are a
  // Worker's peaks. `decodedImageBytesPerPage` stays "not measured" until a
  // shipped route decodes images in a real page.
  return out;
}

export function readDataBudget(file = DATA_BUDGET_FILE) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * Judge measurements against ceilings. A ceiling with no measurement (null) is
 * "not measured", which is neither a pass nor a failure.
 * @param {{ceilings: Array<{key: string, ceiling: number, unit: string, measuredBy: string}>}} budget
 * @param {Record<string, number|null>} measured
 * @returns {Array<{key: string, ceiling: number, measured: number|null, status: 'ok'|'over'|'not measured'}>}
 */
export function judgeData(budget, measured) {
  return budget.ceilings.map(c => {
    const value = measured[c.key] ?? null;
    return {
      key: c.key,
      unit: c.unit,
      ceiling: c.ceiling,
      measured: value,
      status:
        value === null ? 'not measured' : value > c.ceiling ? 'over' : 'ok',
    };
  });
}

/** The ceilings a +`pct`% allowance over the measurement would give, rounded up to 1 KiB. */
export function propose(measured, pct = 10) {
  const up = n => Math.ceil((n * (1 + pct / 100)) / 1024) * 1024;
  return {
    packGzipBytes: up(measured.packGzipBytes),
    precacheFirstVisitGzipBytes: up(measured.precacheFirstVisitGzipBytes),
    precacheIdleGzipBytes: up(measured.precacheIdleGzipBytes),
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const measured = measure();
  if (process.argv.includes('--propose')) {
    console.log(
      JSON.stringify({ measured, proposed: propose(measured) }, null, 2)
    );
  } else {
    const rows = judgeData(readDataBudget(), measured);
    for (const r of rows)
      console.log(
        `${r.status.padEnd(12)} ${r.key.padEnd(32)} ${String(r.measured ?? '-').padStart(10)} of ${r.ceiling} ${r.unit}`
      );
    const over = rows.filter(r => r.status === 'over');
    if (process.argv.includes('--check') && over.length) {
      const { mode } = JSON.parse(
        readFileSync(path.join(ROOT, 'tools', 'budget-policy.json'), 'utf8')
      );
      if (mode === 'declared') process.exit(1);
      console.log(
        `\nOver in ${over.length} place(s); the policy mode is "${mode}", so this reports and does not fail.`
      );
    }
  }
}
