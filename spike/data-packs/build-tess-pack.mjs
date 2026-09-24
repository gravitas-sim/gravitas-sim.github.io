// Spike: a developer tool that turns one TESS light curve into a pinned,
// compact derivative and its gravitas.observation-data-pack/1 manifest.
//
//   node spike/data-packs/build-tess-pack.mjs --cache <dir> [--fetch]
//
// Raw products are fetched only here, never by the lesson: --fetch downloads
// the SPOC light curve from MAST into the cache; without it the cached file is
// read, and its SHA-256 must match the pinned one or the tool stops.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { readFits } from './fits.mjs';

const RAW = {
  file: 'tess2022244194134-s0056-0000000420814525-0243-s_lc.fits',
  url: 'https://mast.stsci.edu/api/v0.1/Download/file?uri=mast:TESS/product/tess2022244194134-s0056-0000000420814525-0243-s_lc.fits',
  bytes: 2039040,
  sha256: '1b76b4a4b73e24954fa6e29a7e28a174685113ecdbad1bf10ef0e7b766ce99e9',
};
const MIN_PER_BIN = 3;
// HD 209458 b, for the sanity check only (not written into the derivative).
const PERIOD_D = 3.52474859; // Knutson et al. 2007 / widely adopted
const EXPECTED_DEPTH = 0.0146; // (Rp/Rs)^2, Torres et al. 2008: Rp/Rs = 0.12086

const args = process.argv.slice(2);
// 10 minutes is the pinned choice; --bin-minutes exists to measure the others.
const BIN_MINUTES = args.includes('--bin-minutes') ? Number(args[args.indexOf('--bin-minutes') + 1]) : 10;
const cacheDir = args[args.indexOf('--cache') + 1];
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'spike/data-packs/out';
const sha = b => createHash('sha256').update(b).digest('hex');

async function raw() {
  const at = path.join(cacheDir, RAW.file);
  if (args.includes('--fetch') && !existsSync(at)) {
    const res = await fetch(RAW.url);
    if (!res.ok) throw new Error(`MAST answered ${res.status}`);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(at, Buffer.from(await res.arrayBuffer()));
  }
  const bytes = readFileSync(at);
  if (bytes.length !== RAW.bytes || sha(bytes) !== RAW.sha256) {
    throw new Error(`${RAW.file} is not the pinned file (${bytes.length} bytes, ${sha(bytes)})`);
  }
  return new Uint8Array(bytes);
}

const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const bytes = await raw();
const [primary, lc] = readFits(bytes);
const P = primary.cards;
const H = lc.cards;
const { TIME, PDCSAP_FLUX, PDCSAP_FLUX_ERR, QUALITY } = lc.columns;
const good = [];
for (let i = 0; i < TIME.values.length; i++) {
  const t = TIME.values[i], f = PDCSAP_FLUX.values[i], e = PDCSAP_FLUX_ERR.values[i];
  if (QUALITY.values[i] === 0 && Number.isFinite(t) && Number.isFinite(f) && Number.isFinite(e)) good.push([t, f, e]);
}
const norm = median(good.map(g => g[1]));
const binDays = BIN_MINUTES / 1440;
const t0 = Math.floor(good[0][0] / binDays) * binDays;
const bins = new Map();
for (const [t, f, e] of good) {
  const k = Math.floor((t - t0) / binDays);
  const b = bins.get(k) || { n: 0, f: 0, e2: 0 };
  b.n++; b.f += f / norm; b.e2 += (e / norm) ** 2;
  bins.set(k, b);
}
const rows = [...bins.entries()]
  .filter(([, b]) => b.n >= MIN_PER_BIN)
  .sort((a, b) => a[0] - b[0])
  .map(([k, b]) => ({ k, flux: b.f / b.n, err: Math.sqrt(b.e2) / b.n }));

// Flux as int16 parts per million about 1; the bins as runs of consecutive
// indices (a sector has a handful of gaps, not thousands); the uncertainty as
// one byte in steps of ERR_STEP ppm, which it never needs more than.
const ERR_STEP = 5;
const ppm = x => Math.max(-32768, Math.min(32767, Math.round((x - 1) * 1e6)));
const b64 = typed => Buffer.from(typed.buffer).toString('base64');
const int16le = xs => {
  const b = Buffer.alloc(2 * xs.length);
  xs.forEach((x, i) => b.writeInt16LE(x, 2 * i));
  return b.toString('base64');
};
const runs = [];
for (const r of rows) {
  const last = runs.at(-1);
  if (last && last[0] + last[1] === r.k) last[1]++;
  else runs.push([r.k, 1]);
}
const derivative = {
  pack: 'tess-hd209458-s56-lc',
  version: '0.1.0',
  t0,
  binDays,
  runs,
  flux: int16le(rows.map(r => ppm(r.flux))), // little-endian
  errStepPpm: ERR_STEP,
  err: b64(Uint8Array.from(rows.map(r => Math.min(255, Math.max(1, Math.round((r.err * 1e6) / ERR_STEP)))))),
  n: rows.length,
};
const derivedText = `${JSON.stringify(derivative)}\n`;

// Scientific sanity check: fold on the known period and find the transit.
const phase = rows.map(r => {
  const t = t0 + (r.k + 0.5) * binDays;
  return { p: ((t % PERIOD_D) + PERIOD_D) % PERIOD_D, f: r.flux };
});
const slots = Array.from({ length: 200 }, () => ({ n: 0, f: 0 }));
for (const { p, f } of phase) { const s = slots[Math.floor((p / PERIOD_D) * 200)]; s.n++; s.f += f; }
const folded = slots.filter(s => s.n).map(s => s.f / s.n);
const depth = 1 - Math.min(...folded);

const manifest = {
  format: 'gravitas.observation-data-pack',
  formatVersion: 1,
  id: derivative.pack,
  version: derivative.version,
  title: `HD 209458: TESS sector ${P.SECTOR} light curve`,
  object: { name: 'HD 209458', tic: P.TICID, ra: P.RA_OBJ, dec: P.DEC_OBJ, frame: 'ICRS', tessmag: P.TESSMAG },
  facility: { observatory: 'TESS', instrument: `camera ${P.CAMERA}, CCD ${P.CCD}`, pipeline: `SPOC ${P.PROCVER || ''}`.trim() },
  dataType: 'light-curve',
  origin: 'observed',
  source: {
    urls: [RAW.url],
    archive: 'MAST (Mikulski Archive for Space Telescopes)',
    citations: [
      { text: 'Ricker et al. 2015, JATIS 1, 014003 (TESS)', doi: '10.1117/1.JATIS.1.1.014003' },
      { text: 'Jenkins et al. 2016, Proc. SPIE 9913, 99133E (SPOC)', doi: '10.1117/12.2233418' },
    ],
    retrieved: '2026-09-24',
  },
  license: {
    status: 'public-domain',
    statement:
      'NASA mission data, released by MAST without restriction on reuse; MAST asks that publications acknowledge the mission and the archive.',
  },
  raw: [{ file: RAW.file, bytes: RAW.bytes, sha256: RAW.sha256, pinned: true }],
  derived: { file: 'spike/data-packs/out/tess-hd209458-s56.json', bytes: Buffer.byteLength(derivedText), sha256: sha(derivedText) },
  transformation: {
    script: 'spike/data-packs/build-tess-pack.mjs',
    version: '0.1.0',
    steps: [
      'Read the LIGHTCURVE binary table: TIME, PDCSAP_FLUX, PDCSAP_FLUX_ERR, QUALITY.',
      'Keep cadences with QUALITY 0 and finite time, flux and error.',
      'Divide flux and error by the median flux.',
      `Average into ${BIN_MINUTES}-minute bins from t0, keeping bins with at least ${MIN_PER_BIN} cadences; the error is the quadrature mean.`,
      'Store the bins as runs of consecutive indices, flux as int16 ppm about 1, error as uint8 in 5 ppm steps.',
    ],
  },
  time: { scale: H.TIMESYS, reference: `BJD ${H.BJDREFI + H.BJDREFF} (BTJD)`, unit: 'd' },
  columns: [
    { name: 't', unit: 'd', description: 'bin centre, t0 + (index + 0.5) * binDays, in BTJD' },
    { name: 'flux', unit: '', description: 'PDCSAP flux over its median' },
    { name: 'err', unit: '', uncertaintyOf: 'flux', description: 'propagated PDCSAP error over the median, per bin' },
  ],
  masks: [{ column: 'QUALITY', rule: 'nonzero dropped', dropped: TIME.values.length - good.length }],
  assumptions: [
    'PDCSAP has had systematics and crowding removed by SPOC; that correction is trusted as published.',
    'Times are barycentric (TDB) for the target, as SPOC corrects them.',
  ],
  reductions: [
    `${BIN_MINUTES}-minute bins: the 2-minute cadences are averaged, which rounds ingress and egress by up to ${BIN_MINUTES} minutes.`,
    'Flux is quantised to 1 ppm, errors to 5 ppm.',
  ],
  validation: {
    check: 'folding on the published period finds a transit of the published depth within 0.003',
    against: [
      { quantity: 'period', value: PERIOD_D, unit: 'd', ref: 'Knutson et al. 2007' },
      { quantity: 'depth', value: EXPECTED_DEPTH, unit: '', ref: 'Torres et al. 2008, (Rp/Rs)^2' },
    ],
  },
  compatible: { widgets: ['transit-noise (a measured-series mode; not built)'], investigations: ['detect-this-planet'] },
  offline: 'optional',
};

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'tess-hd209458-s56.json'), derivedText);
const report = {
  object: P.OBJECT, sector: P.SECTOR, tessmag: P.TESSMAG, ra: P.RA_OBJ, dec: P.DEC_OBJ,
  timeRef: `${H.TIMESYS} BJD - ${H.BJDREFI + H.BJDREFF}`, fluxUnit: PDCSAP_FLUX.unit,
  cadences: TIME.values.length, good: good.length, bins: rows.length,
  derivedBytes: Buffer.byteLength(derivedText), derivedSha256: sha(derivedText),
  foldedDepth: Number(depth.toFixed(5)), expectedDepth: EXPECTED_DEPTH,
  medianBinErrPpm: median(rows.map(r => r.err)) * 1e6,
};
manifest.validation.result = { depth: report.foldedDepth };
writeFileSync(path.join(outDir, `${derivative.pack}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(report, null, 1));
if (Math.abs(depth - EXPECTED_DEPTH) > 0.003) {
  console.error('The folded transit is not the published depth; the transformation is wrong.');
  process.exit(1);
}
