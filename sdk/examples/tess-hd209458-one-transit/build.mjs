#!/usr/bin/env node
// =============================================================================
// One transit of HD 209458, cut from the TESS pack Gravitas ships
// -----------------------------------------------------------------------------
//   node sdk/examples/tess-hd209458-one-transit/build.mjs
//
// The example data-pack extension's transformation script: it writes
// series.json and pack.json beside itself. Its source is an installed pack,
// read through the SDK's public API (installedDataPack), and pinned by that
// pack's own derived checksum - so the chain back to the TESS file MAST
// served is unbroken: MAST -> tess-hd209458-s56-lc -> this.
//
// What it does: folds the sector on the published period to find the phase
// of mid-transit, takes the first transit whose window of +/-0.2 d has every
// bin, and keeps those bins exactly as the source encoded them - the same t0,
// bin width, integers and error steps, sliced, not re-quantised. Code, so it
// belongs to the pull request and is never part of the declarative archive.
// =============================================================================

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { installedDataPack } from '../../lib/api.mjs';

export const VERSION = '1.0.0';
const SOURCE = 'tess-hd209458-s56-lc';
const PERIOD_D = 3.52474859; // Knutson et al. 2007, as the source's check
const HALF_WINDOW_D = 0.2;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha256 = b => createHash('sha256').update(b).digest('hex');

/** Build the two files, and return them without writing. */
export async function build() {
  const { record, module, observation: o } = await installedDataPack(SOURCE);
  const S = module.SERIES;
  // Bin index of every point, from the encoding itself.
  const index = [];
  for (const [start, count] of S.runs)
    for (let k = start; k < start + count; k++) index.push(k);

  // Mid-transit phase: the deepest of 200 phase slots, at its centre.
  const slots = 200;
  const sum = new Float64Array(slots);
  const n = new Uint32Array(slots);
  o.x.values.forEach((t, i) => {
    const s = Math.floor(
      ((((t % PERIOD_D) + PERIOD_D) % PERIOD_D) / PERIOD_D) * slots
    );
    sum[s] += o.y.values[i];
    n[s]++;
  });
  let deepest = 0;
  for (let s = 1; s < slots; s++)
    if (n[s] && sum[s] / n[s] < sum[deepest] / n[deepest]) deepest = s;
  const midPhase = (deepest + 0.5) / slots;

  // The first mid-transit whose whole window is present.
  const have = new Set(index);
  let window = null;
  for (
    let e = Math.floor(o.x.values[0] / PERIOD_D);
    e * PERIOD_D < o.x.values.at(-1);
    e++
  ) {
    const mid = (e + midPhase) * PERIOD_D;
    const first = Math.ceil((mid - HALF_WINDOW_D - S.t0) / S.binDays - 0.5);
    const last = Math.floor((mid + HALF_WINDOW_D - S.t0) / S.binDays - 0.5);
    let complete = first >= 0;
    for (let k = first; complete && k <= last; k++) complete = have.has(k);
    if (complete) {
      window = { mid, first, last };
      break;
    }
  }
  if (!window)
    throw new Error('no transit in the source has a complete window');

  const at = index.indexOf(window.first);
  const count = window.last - window.first + 1;
  const flux = Buffer.from(S.flux, 'base64').subarray(2 * at, 2 * (at + count));
  const err = Buffer.from(S.err, 'base64').subarray(at, at + count);
  const SERIES = {
    encoding: S.encoding,
    t0: S.t0,
    binDays: S.binDays,
    n: count,
    runs: [[window.first, count]],
    flux: flux.toString('base64'),
    errStepPpm: S.errStepPpm,
    err: err.toString('base64'),
  };

  const meta = {
    id: 'tess-hd209458-one-transit',
    version: VERSION,
    title: 'HD 209458: one TESS transit (sector 56)',
    object: record.object,
    facility: record.facility,
    dataType: 'light-curve',
    origin: 'observed',
    credit: record.credit,
    license: record.license,
    retrieved: record.retrieved,
    time: record.time,
    columns: record.columns,
    masks: [
      ...record.masks,
      {
        column: 'bin',
        rule: `outside ${HALF_WINDOW_D} d of the chosen mid-transit`,
        dropped: o.x.values.length - count,
      },
    ],
  };
  const series = `${JSON.stringify({ PACK: meta, SERIES }, null, 2)}\n`;
  const pack = {
    format: 'gravitas.observation-data-pack',
    formatVersion: 1,
    ...meta,
    source: record.source,
    raw: [
      {
        file: record.derived.file,
        url: `https://github.com/gravitas-sim/gravitas-sim.github.io/blob/v2/${record.derived.file}`,
        bytes: record.derived.bytes,
        sha256: record.derived.sha256,
      },
    ],
    derived: {
      file: 'series.json',
      bytes: Buffer.byteLength(series),
      sha256: sha256(series),
    },
    transformation: {
      script: 'build.mjs',
      version: VERSION,
      steps: [
        `Read the installed pack ${SOURCE} through the SDK's installedDataPack(), pinned by its derived checksum.`,
        `Fold on ${PERIOD_D} d and take the deepest of ${slots} phase slots as mid-transit.`,
        `Keep the bins within ${HALF_WINDOW_D} d of the first mid-transit whose window has every bin: bins ${window.first} to ${window.last}.`,
        'Copy those bins exactly as encoded - the same t0, bin width, int16 ppm flux and error steps.',
      ],
    },
    assumptions: record.assumptions,
    reductions: [
      ...record.reductions,
      'One transit of the seven in the sector.',
    ],
    validation: {
      check:
        'folding on the published period finds a transit of the published depth, within 0.003',
      against: record.validation.against,
      rule: {
        kind: 'folded-depth',
        periodDays: PERIOD_D,
        expected: 0.0146,
        tolerance: 0.003,
      },
    },
    compatible: { widgets: [], investigations: [] },
    offline: 'optional',
  };
  return {
    'series.json': series,
    'pack.json': `${JSON.stringify(pack, null, 2)}\n`,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [name, text] of Object.entries(await build()))
    writeFileSync(path.join(HERE, name), text);
  console.log('wrote series.json and pack.json');
}
