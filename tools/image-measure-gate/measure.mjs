/* global console, process */
// =============================================================================
// npm run image-gate:measure: run every measurement and write the record
// -----------------------------------------------------------------------------
// Runs the gate's measurements in the order that keeps the timing runs quiet
// (the heavy builds and the probe first, the throttled timings last, after the
// one-minute load average is at or below 6), judges the evidence with
// judge.mjs, and writes tools/image-measure-gate.json. It measures what the
// prototype (tools/image-measure-gate/) does; it is never run by CI.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

import { RESULTS_FILE, decide } from '../image-measure-gate.mjs';
import { runCore } from './core.mjs';
import { measureBytes } from './bytes.mjs';
import { measureRoute } from './route.mjs';
import { runBrowser } from './browser.mjs';
import { judge } from './judge.mjs';
import { prototypeDigest } from './digest.mjs';
import { REPO } from './server.mjs';

/** What the first run of the throttled profile said, before the table rows were kept between renders. */
export const FIRST_RUN = {
  what: 'the first run of T6 on the prototype as first written: every change rebuilt all 50 table rows',
  place: { handlerP95Ms: 29.7, budgetMs: 28, paintP95Ms: 249.4 },
  delete: { handlerP95Ms: 15.1, paintP95Ms: 113.9 },
  undo: { handlerP95Ms: 18.6, paintP95Ms: 108.6 },
  frameChange: { handlerP95Ms: 184.9, paintP95Ms: 215.6 },
  load: '4.7 to 5.3',
  change:
    'renderTable keeps a row for each mark that did not change (a Map keyed by id, the immutable mark object as the test), so a placement adds one row and a deletion removes one; the table is fixed-layout. No threshold moved; the instrument was made to meet the committed budget and was measured again.',
};

async function quiet(limit = 6, waitMs = 10 * 60 * 1000) {
  const end = Date.now() + waitMs;
  while (loadavg()[0] > limit && Date.now() < end) await sleep(5000);
  return loadavg()[0];
}

export async function measure({ scratch }) {
  const started = new Date().toISOString();
  const evidence = {};
  console.log('core checks (plain Node)');
  evidence.core = await runCore();
  console.log('bytes');
  evidence.bytes = await measureBytes();
  console.log('route (scratch trees)');
  evidence.route = await measureRoute(scratch);
  delete evidence.route.changedOrNewBuildFiles;
  console.log('the decoded-memory probe (unchanged tool, not written)');
  evidence.probe = JSON.parse(
    execFileSync(process.execPath, ['tools/decoded-memory-probe.mjs'], {
      cwd: REPO,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
  );
  console.log('browser: walks and precision');
  const functional = await runBrowser({
    only: ['keyboard', 'pointer', 'sequence', 'precision'],
  });
  console.log('waiting for a quiet machine');
  const load = await quiet();
  console.log(`one-minute load ${load}; the throttled timings`);
  const timing = await runBrowser({ only: ['interaction', 'large'] });
  evidence.browser = { ...functional, ...timing };
  const checks = judge(evidence);
  const { verdict, failing } = decide(checks);
  const out = {
    prompt: 178,
    thresholdsCommit: 'ede242a22328cb2d9f4b4aa4519042d5b3862563',
    prototypeDigest: prototypeDigest(),
    measuredAt: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: REPO,
      encoding: 'utf8',
    }).trim(),
    started,
    finished: new Date().toISOString(),
    environment: {
      node: process.version,
      chromium: evidence.browser.chromium,
      platform: `${process.platform} ${process.arch}`,
      load1AtTimings: Number(load.toFixed(2)),
    },
    verdict,
    notPassing: failing,
    checks,
    authentic: {
      lunar: {
        status: 'not-measured',
        reason:
          'no public-domain lunar frame is in the repository and nothing is downloaded without Carl; not read by the verdict function',
      },
    },
    firstRun: FIRST_RUN,
    evidence,
  };
  writeFileSync(RESULTS_FILE, `${JSON.stringify(out, null, 2)}\n`);
  execFileSync('npx', ['prettier', '--write', RESULTS_FILE], {
    cwd: REPO,
    stdio: 'ignore',
  });
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scratch = process.argv[2];
  if (!scratch)
    throw new Error(
      'usage: measure.mjs <scratch directory for the two scratch trees>'
    );
  const r = await measure({ scratch });
  console.log(
    `verdict ${r.verdict}; not passing: ${r.notPassing.join(', ') || 'none'}`
  );
}
